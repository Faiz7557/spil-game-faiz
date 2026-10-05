// Field mapping draft for SAP PM notifications (IW21 / BAPI_ALM_NOTIF_CREATE). The company's SAP team confirms
// notification type, functional-location format and priority scheme during the pilot; nothing is posted automatically.
export interface ExportAction { id: string; caseTag: string; plant: string; title: string; due: string; owner: string; priorityClass: "A" | "B" | "C"; sourceRefs: string[] }

const PRIORITY: Record<ExportAction["priorityClass"], string> = { A: "1", B: "2", C: "3" };
// Spreadsheet apps execute cells starting with = + - @ (or tab/CR): prefix them so a title cannot become a formula.
const defuse = (s: string) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);
const esc = (raw: string) => { const s = defuse(raw); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export function toSapCsv(actions: ExportAction[]): string {
  const header = "NotificationType,FunctionalLocation,Equipment,ShortText,Priority,RequiredEnd,ResponsiblePerson,PlantPulseRef,EvidenceRefs";
  const rows = actions.map((a) => [
    "M2", a.plant, a.caseTag, a.title.slice(0, 40), PRIORITY[a.priorityClass], a.due.replace(/-/g, ""), a.owner, a.id, a.sourceRefs.join(" "),
  ].map(esc).join(","));
  return [header, ...rows].join("\n") + "\n";
}
