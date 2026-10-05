import { ALL, applyFilter, kpis } from "../../src/domain/kpis.js";
import { actionDue } from "../../src/domain/queue.js";
import { buildTank } from "../../src/domain/tank.js";
import type { Ledger } from "../../src/domain/refs.js";
import type { Snapshot } from "../../src/domain/types.js";

export interface ToolCtx { snap: Snapshot; ledger: Ledger; auditFindings?: Record<string, unknown[]> }

const obj = (properties: Record<string, unknown>, required: string[] = []) =>
  ({ type: "object" as const, properties, required, additionalProperties: false });

/** Provider-neutral tool definition; copilot.ts maps it to the API format. */
export interface ToolDef { name: string; description: string; input_schema: Record<string, unknown>; strict?: boolean }

export const TOOLS: ToolDef[] = [
  { name: "get_kpis", description: "Recorded loss, downtime and open-status counts for a filter. Numbers are computed by code; quote them, never recompute.",
    input_schema: obj({ plant: { type: "string" }, year: { type: "string", pattern: "^20\\d\\d$" } }) },
  { name: "search_register", description: "Search the 380-row incident register by text, plant or status. Returns at most 15 rows with their citation ref.",
    input_schema: obj({ query: { type: "string" }, plant: { type: "string" }, open_only: { type: "boolean" } }) },
  { name: "get_case", description: "Full case for one of the five assets with condition data: register entry, RCA root cause, source actions with due state on the review date, curated conflicts.",
    input_schema: obj({ tag: { type: "string" } }, ["tag"]) },
  { name: "get_condition", description: "Weekly condition readings for an asset, optionally limited to a date range.",
    input_schema: obj({ tag: { type: "string" }, from: { type: "string" }, to: { type: "string" } }, ["tag"]) },
  { name: "get_hourly", description: "Hourly PI data for an asset: each tag with its PI unit, period, and min/mean/max over running hours, plus the OFF hours. Use it for any question about hourly data, units, or comparing hourly with weekly readings.",
    input_schema: obj({ tag: { type: "string" } }, ["tag"]) },
  { name: "get_rca_slides", description: "Raw text of RCA deck slides for an asset.",
    input_schema: obj({ tag: { type: "string" }, slides: { type: "array", items: { type: "integer" } } }, ["tag"]) },
  { name: "get_priorities", description: "Top open register records from the Problem Tank prioritisation, with the reasons for each rank.",
    input_schema: obj({ limit: { type: "integer", minimum: 1, maximum: 20 } }) },
  { name: "submit_answer", description: "Submit the final answer. Every factual sentence must list the refs (from tool results) that support it. Put things the data cannot answer in abstentions.",
    strict: true,
    input_schema: obj({
      sentences: { type: "array", items: obj({ text: { type: "string" }, refs: { type: "array", items: { type: "string" } }, kind: { type: "string", enum: ["fact", "documented_finding", "hypothesis", "recommendation"] } }, ["text", "refs", "kind"]) },
      abstentions: { type: "array", items: { type: "string" } },
      follow_ups: { type: "array", items: { type: "string" } },
    }, ["sentences", "abstentions", "follow_ups"]) },
];

const rowRef = (row: number) => `L3:row${row}`;
const DUE_TEXT: Record<string, string> = {
  closed: "recorded Closed", plan_passed: "plan date passed and not recorded Closed", not_due: "not yet due",
  no_status_plan_passed: "no status recorded and plan date passed", no_status_not_due: "no status recorded, not yet due",
};

export async function runTool(name: string, input: any, ctx: ToolCtx): Promise<unknown> {
  const { snap, ledger } = ctx;
  const review = snap.meta.review_date;
  switch (name) {
    case "get_kpis": {
      const rows = applyFilter(snap.incidents, { plant: input.plant ?? ALL, year: input.year ?? ALL });
      const k = kpis(rows, snap.meta.open_statuses, review);
      const ref = `L3:kpi:${input.plant ?? "all"}:${input.year ?? "all"}`;
      ledger.add(ref, `Computed by code over Incident Database rows 4–383 with plant=${input.plant ?? "all"}, year=${input.year ?? "all"}: ${JSON.stringify(k)}`);
      return { ...k, ref, note: "Recorded values from the register; actual and potential loss are separate." };
    }
    case "search_register": {
      const q = String(input.query ?? "").toLowerCase();
      const rows = snap.incidents.filter((r) =>
        (!input.plant || r.plant === input.plant) && (!input.open_only || snap.meta.open_statuses.includes(r.status)) &&
        (!q || [r.tag, r.title, r.component, r.mechanism, r.eq_type].some((v) => String(v).toLowerCase().includes(q)))).slice(0, 15);
      return rows.map((r) => {
        const ref = rowRef(r.src.row);
        const excerpt = `${r.tag} · ${r.plant} · ${r.occurred} · ${r.title} · ${r.status} · Pre-Risk ${r.pre_risk} · actual ${r.actual_usd} USD · RCA due ${r.rca_due}`;
        ledger.add(ref, excerpt);
        return { ref, excerpt };
      });
    }
    case "get_case": {
      const eq = snap.equipment.find((e) => e.tag === input.tag);
      const rca = snap.rca.find((r) => r.tag === input.tag);
      if (!eq || !rca) return { error: `No detailed case for ${input.tag}. Only ${snap.equipment.map((e) => e.tag).join(", ")} have one.` };
      const inc = snap.incidents.find((i) => i.id === eq.linked_incident)!;
      ledger.add(rowRef(inc.src.row), `${inc.tag} ${inc.title} · register status ${inc.status} on the review date ${review} · downtime ${inc.downtime_h} h · actual ${inc.actual_usd} USD · potential ${inc.potential_usd} USD`);
      ledger.add(`${rca.source}:slide7`, rca.slides[6].join("\n"));
      // Slide text plus the due state PlantPulse computed for each action on the review date (code, not the model).
      const dueLines = (kind: "action" | "preventive") => [...rca.actions, ...rca.preventive]
        .filter((a) => (a.kind === "preventive") === (kind === "preventive"))
        .map((a) => `- ${a.text}: plan date ${a.plan_date}, recorded status ${a.status ?? "none"}, due state on ${review}: ${DUE_TEXT[actionDue(a, review)]}`).join("\n");
      ledger.add(`${rca.source}:slide9`, `${rca.slides[8].join("\n")}\n\nComputed by PlantPulse for the review date ${review}:\n${dueLines("action")}`);
      ledger.add(`${rca.source}:slide10`, `${rca.slides[9].join("\n")}\n\nComputed by PlantPulse for the review date ${review}:\n${dueLines("preventive")}`);
      return {
        incident: { ref: rowRef(inc.src.row), occurred: inc.occurred, status: inc.status, downtime_h: inc.downtime_h, actual_usd: inc.actual_usd, potential_usd: inc.potential_usd },
        root_cause: { ref: `${rca.source}:slide7`, text: rca.root_cause },
        actions: [...rca.actions, ...rca.preventive].map((a) => ({ text: a.text, kind: a.kind, plan_date: a.plan_date, pic: a.pic, status: a.status, due_state: actionDue(a, review), ref: `${rca.source}:${a.kind === "preventive" ? "slide10" : "slide9"}` })),
        review_date: review,
        last_condition_reading: eq.history[eq.history.length - 1].date,
      };
    }
    case "get_condition": {
      const eq = snap.equipment.find((e) => e.tag === input.tag);
      if (!eq) return { error: `No condition record for ${input.tag}.` };
      const rows = eq.history.filter((h) => (!input.from || h.date >= input.from) && (!input.to || h.date <= input.to));
      return { params: eq.params, rows: rows.map((h) => {
        const ref = `${eq.source}:hist:${h.date}`;
        const excerpt = eq.params.map((p, j) => `${p.name} ${h.values[j]} ${p.unit}`).join(" · ") + ` · ${h.status}`;
        ledger.add(ref, `${h.date}: ${excerpt}`);
        return { ref, date: h.date, values: Object.fromEntries(eq.params.map((p, j) => [`${p.name} (${p.unit})`, h.values[j]])), label: h.status };
      }) };
    }
    case "get_hourly": {
      const h = snap.hourly.find((x) => x.tag_prefix === String(input.tag ?? "").replace("-", ""));
      const eq = snap.equipment.find((e) => e.tag === input.tag);
      if (!h) return { error: `No hourly PI data for ${input.tag}.` };
      const on = h.run.map((r) => r === "ON");
      const first = h.t[0].slice(0, 10), last = h.t[h.t.length - 1].slice(0, 10);
      const round = (v: number) => Math.round(v * 1000) / 1000;
      const tags = h.pi_tags.filter((t) => h.series[t.name]).map((t) => {
        const vals = h.series[t.name].filter((_, i) => on[i]);
        const ref = `${h.source}:${t.name}:${first}`;
        const stats = { min: round(Math.min(...vals)), mean: round(vals.reduce((s, v) => s + v, 0) / vals.length), max: round(Math.max(...vals)) };
        ledger.add(ref, `Hourly PI tag ${t.name} (${t.description}), PI unit ${t.unit}, ${first} to ${last}, ${h.t.length} hourly rows; over running hours min ${stats.min}, mean ${stats.mean}, max ${stats.max} ${t.unit}.`);
        return { ref, name: t.name, description: t.description, unit: t.unit, ...stats };
      });
      const weeklyUnits = eq ? eq.params.map((p) => `${p.name} in ${p.unit}`) : [];
      return {
        period: { from: first, to: last, rows: h.t.length, off_hours: h.off_rows }, tags,
        weekly_condition_units: weeklyUnits,
        note: "Hourly PI and weekly condition readings come from different instruments and units; PlantPulse keeps them on separate axes and never overlays them.",
      };
    }
    case "get_rca_slides": {
      const rca = snap.rca.find((r) => r.tag === input.tag);
      if (!rca) return { error: `No RCA deck for ${input.tag}.` };
      const nums: number[] = input.slides?.length ? input.slides : rca.slides.map((_, i) => i + 1);
      return nums.filter((n) => rca.slides[n - 1]).map((n) => {
        const ref = `${rca.source}:slide${n}`; const text = rca.slides[n - 1].join("\n");
        ledger.add(ref, text); return { ref, text };
      });
    }
    case "get_priorities": {
      const detailed = new Set(snap.equipment.map((e) => e.linked_incident!));
      return buildTank(snap.incidents, snap.meta.open_statuses, review, detailed).slice(0, input.limit ?? 10).map((t) => {
        const ref = rowRef(t.incident.src.row);
        ledger.add(ref, `${t.incident.tag} · ${t.incident.title} · ${t.reasons.join(" · ")}`);
        return { ref, tag: t.incident.tag, plant: t.incident.plant, category: t.category, reasons: t.reasons, guidance: t.guidance };
      });
    }
    default:
      return { error: `Unknown tool ${name}.` };
  }
}
