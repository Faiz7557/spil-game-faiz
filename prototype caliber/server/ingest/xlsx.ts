// TypeScript port of the extractors in pipeline/extract_case2.py. The Python output (validated 23/23) is the
// reference: xlsx.test.ts asserts parity against src/data/case2.json, and any difference is fixed here.
import ExcelJS from "exceljs";
import type { Equipment, Hourly, Incident, Param, WeeklyRow } from "../../src/domain/types.js";
import { baselines, TRAIN_HOURS } from "../../src/domain/forecast.js";
import type { EquipmentPart } from "../repo/writeSnapshot.js";

type Cell = string | number | boolean | Date | null;

const cellVal = (v: ExcelJS.CellValue): Cell => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return cellVal((v as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
    if ("richText" in v) return (v as ExcelJS.CellRichTextValue).richText.map((t) => t.text).join("");
    if ("text" in v) return String((v as ExcelJS.CellHyperlinkValue).text);
    if ("error" in v) return null;
  }
  return v as Cell;
};

/** Same shape as openpyxl's `ws.values`: one array per row up to the last row, each as wide as the sheet. */
function rowsOf(ws: ExcelJS.Worksheet): Cell[][] {
  const width = ws.columnCount;
  const out: Cell[][] = [];
  for (let n = 1; n <= ws.rowCount; n++) {
    const row = ws.getRow(n);
    out.push(Array.from({ length: width }, (_, c) => cellVal(row.getCell(c + 1).value)));
  }
  return out;
}

const MONTHS: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };

/** Port of iso(): dates and the source's text formats become YYYY-MM-DD; anything else is returned unchanged. */
export function iso(v: Cell | undefined): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})( \d{2}:\d{2}:\d{2})?$/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(s);
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}`;
  return s;
}

const stamp = (v: Cell) => (v instanceof Date ? v.toISOString().replace("T", " ").slice(0, 19) : String(v));
/** k US$ → US$, rounded once like the Python Decimal conversion. */
const kUsd = (v: Cell) => (v === null || v === "" ? null : Math.round(Math.round(Number(v) * 1e6) / 1e3));
const str = (v: Cell) => (v === null ? null : v instanceof Date ? iso(v) : String(v));

async function load(buf: Buffer) { const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf as unknown as ArrayBuffer); return wb; }
function sheet(wb: ExcelJS.Workbook, name: string) {
  const ws = wb.getWorksheet(name);
  if (!ws) throw new Error(`Sheet '${name}' not found.`);
  return ws;
}

export async function extractIncidents(buf: Buffer, sourceId: string): Promise<Incident[]> {
  const rows = rowsOf(sheet(await load(buf), "Incident Database"));
  const header = rows[2].map((h) => (h === null ? "" : String(h)));
  const col = (name: string) => { const i = header.indexOf(name); if (i < 0) throw new Error(`Column '${name}' missing in Incident Database.`); return i; };
  const out: Incident[] = [];
  rows.slice(3).forEach((r, k) => {
    if (r[0] === null) return;
    const g = (n: string) => r[col(n)];
    const ar = g("AR No.");
    out.push({
      id: `${sourceId}-${g("Serial No")}`, serial: Number(g("Serial No")), mto: str(g("MTO No."))!, ar_raw: str(ar) ?? "",
      ar: ar === null || String(ar).trim().toLowerCase() === "n/a" ? null : String(ar),
      plant: str(g("Plant"))!, tag: str(g("Tag Number"))!, eq_class: str(g("Eq. Class"))!, occurred: iso(g("Date of Occur."))!,
      title: str(g("Risk Case Title"))!, impact: str(g("Highest Impact"))!, pre_risk: str(g("Pre-Risk"))!, risk_score: Number(g("Risk Score")),
      pic_rca: str(g("PIC (RCA)"))!, status: str(g("Overall Status"))!, discipline: str(g("Discipline"))!,
      eq_type: str(g("Eq. Type"))!, component: str(g("Component"))!, mechanism: str(g("F Mechanism"))!,
      downtime_h: Number(g("Downtime (hrs)")), actual_usd: kUsd(g("Act. Loss (k US$)"))!, potential_usd: kUsd(g("Pot. Loss (k US$)"))!,
      total_usd: kUsd(g("Total Loss (k US$)"))!, rca_due: iso(g("RCA Due Date")),
      src: { source: sourceId, sheet: "Incident Database", row: k + 4 },
    });
  });
  return out;
}

const PARAM_RE = /^(.*?)\s*\(([^)]*)\)\s*$/;
function parseParam(label: string, limits: string): Param {
  const m = PARAM_RE.exec(label.replace(/\n/g, " "));
  if (!m) throw new Error(`Cannot read parameter label '${label}'.`);
  const [alarm, trip] = limits.split("/").map((x) => Number(x.trim()));
  return { name: m[1].trim(), unit: m[2].trim(), alarm, trip, direction: trip > alarm ? "high" : "low" };
}

export async function extractEquipment(buf: Buffer, sourceId: string): Promise<EquipmentPart> {
  const wb = await load(buf);
  const info = rowsOf(sheet(wb, "Equipment Info"));
  const meta = Object.fromEntries(info.slice(3).filter((r) => r[0]).map((r) => [String(r[0]), r[1]])) as Record<string, Cell>;
  const params = [4, 5, 6, 7].map((j) => parseParam(String(info[j][2]), String(info[j][3])));
  const history: WeeklyRow[] = rowsOf(sheet(wb, "Condition History")).slice(1).map((r, k) => ({
    week: Number(r[0]), date: iso(r[1])!, values: [2, 3, 4, 5].map((j) => Number(r[j])),
    status: String(r[6]), remark: str(r[7]), row: k + 2,
  }));
  const summary = rowsOf(sheet(wb, "Performance Summary")).slice(3).map((r, k) => ({ r, row: k + 4 })).filter(({ r }) => r[0])
    .map(({ r, row }) => ({ kpi: String(r[0]), value: r[1] instanceof Date ? iso(r[1])! : (r[1] as number | string), basis: r[2] instanceof Date ? iso(r[2])! : (r[2] as string | number), row }));
  const first = history.find((h) => h.status === "ALARM");
  const trip = history.find((h) => h.status === "TRIP");
  if (!first || !trip) throw new Error("Condition History needs an ALARM and a TRIP row.");
  const m = (k: string) => str(meta[k]) ?? "";
  return {
    source: sourceId, tag: m("Equipment Tag"), name: m("Equipment Name"), type: m("Equipment Type"), eq_class: m("Equipment Class"),
    plant_unit: m("Plant / Unit"), discipline: m("Discipline"), criticality: m("Criticality"), design_life: m("Design Life"),
    monitoring: m("Monitoring Method"), linked_ar: m("Linked RCA / AR No."),
    target_fields: { failure_date: iso(meta["Failure Date"])!, dominant_failure_mode: m("Dominant Failure Mode") },
    params, history, summary, first_alarm: first.date, trip_date: trip.date,
  } satisfies Omit<Equipment, "linked_incident" | "join_count" | "linear_flag">;
}

export async function extractHourly(buf: Buffer, sourceId: string): Promise<Hourly> {
  const wb = await load(buf);
  const tagRows = rowsOf(sheet(wb, "PI Tag"));
  const tagHeader = tagRows[0].map((h) => String(h));
  const pi_tags = tagRows.slice(1).filter((r) => r[0]).map((r) => {
    const g = (n: string) => str(r[tagHeader.indexOf(n)]) ?? "";
    return { name: g("Name"), description: g("Description"), unit: g("engunits"), instrument: g("instrumenttag") };
  });
  const data = rowsOf(sheet(wb, "Sheet2"));
  const columns = data[0].filter((c) => c !== null).map(String);
  const rows = data.slice(1).filter((r) => r[0] !== null);
  const ampCol = columns.find((c) => c.endsWith("_AMP"));
  if (!ampCol) throw new Error("No *_AMP column in Production Data.");
  const runIdx = columns.indexOf("RUN_STATUS");
  const series = Object.fromEntries(columns.map((c, k) => [c, k] as const)
    .filter(([c]) => c !== "Timestamp" && c !== "RUN_STATUS").map(([c, k]) => [c, rows.map((r) => Number(r[k]))]));
  const run = rows.map((r) => String(r[runIdx]));
  const amp = series[ampCol];
  const off = run.map((r) => r !== "ON");
  return {
    source: sourceId, tag_prefix: ampCol.split("_")[0], pi_tags, columns, series, run,
    t: rows.map((r) => stamp(r[0])),
    off_rows: off.filter(Boolean).length,
    off_with_nonzero_amp: off.filter((o, i) => o && amp[i] !== 0).length,
    forecast: {
      target: ampCol, train_hours: TRAIN_HOURS, test_hours: amp.length - TRAIN_HOURS,
      cutoff: stamp(rows[TRAIN_HOURS - 1][0]), test_start: stamp(rows[TRAIN_HOURS][0]),
      test_off_hours: off.slice(TRAIN_HOURS).filter(Boolean).length, ...baselines(amp),
    },
  };
}
