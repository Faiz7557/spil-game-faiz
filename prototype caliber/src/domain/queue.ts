import type { Equipment, Incident, Rca, RcaAction } from "./types";

/** Queue categories, design §7.1. Order is the category rank. */
export const CATEGORIES = [
  { id: "operational", label: "Operational attention", hint: "Latest verified condition needs operations/HSE attention (site procedure decides urgency)." },
  { id: "investigation", label: "Investigation required", hint: "Abnormality without an approved investigation decision." },
  { id: "followup", label: "Follow-up review", hint: "Action not confirmed complete and its plan date has passed." },
  { id: "pending", label: "Pending verification", hint: "Execution reported; evidence or effectiveness review incomplete." },
  { id: "planned", label: "Planned", hint: "Actions not yet due, or waiting on a recorded dependency." },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];

const CRIT_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

export type ActionDue = "closed" | "plan_passed" | "not_due" | "no_status_plan_passed" | "no_status_not_due";

/** Source-action due state relative to the review date. "Unknown" never becomes Closed. */
export function actionDue(a: RcaAction, reviewDate: string): ActionDue {
  if (a.status === "Closed") return "closed";
  const passed = a.plan_date < reviewDate;
  if (a.status === null) return passed ? "no_status_plan_passed" : "no_status_not_due";
  return passed ? "plan_passed" : "not_due";
}

export interface QueueItem {
  tag: string; incident: Incident; equipment: Equipment; rca: Rca; category: CategoryId;
  reasons: string[]; earliestPassed: string | null; passedCount: number; noStatusCount: number;
  lastReading: string; daysSinceReading: number; criticality: string;
}

const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export function buildQueue(
  equipment: Equipment[], rcas: Rca[], incidents: Incident[], reviewDate: string,
  pendingVerificationTags: Set<string>, conflictsByTag: Record<string, number>,
): QueueItem[] {
  const items: QueueItem[] = [];
  for (const eq of equipment) {
    const rca = rcas.find((r) => r.tag === eq.tag);
    const inc = incidents.find((i) => i.id === eq.linked_incident);
    if (!rca || !inc) continue;
    const all = [...rca.actions, ...rca.preventive];
    const passed = all.filter((a) => actionDue(a, reviewDate) === "plan_passed");
    const noStatus = all.filter((a) => actionDue(a, reviewDate) === "no_status_plan_passed");
    const last = eq.history[eq.history.length - 1];
    let category: CategoryId = "planned";
    if (pendingVerificationTags.has(eq.tag)) category = "pending";
    else if (passed.length || noStatus.length) category = "followup";
    const earliest = [...passed, ...noStatus].map((a) => a.plan_date).sort()[0] ?? null;
    const reasons = [
      `Class ${inc.eq_class} · criticality ${eq.criticality ?? "unknown"}`,
      `Recorded impact: ${inc.impact}, ${inc.downtime_h} h downtime`,
    ];
    if (passed.length) reasons.push(`${passed.length} source action${passed.length > 1 ? "s" : ""} past plan date and not recorded Closed`);
    if (noStatus.length) reasons.push(`${noStatus.length} preventive action${noStatus.length > 1 ? "s" : ""} with no recorded status, plan date passed`);
    if (conflictsByTag[eq.tag]) reasons.push(`${conflictsByTag[eq.tag]} unresolved source conflicts`);
    if (category === "pending") reasons.unshift("Simulated action awaiting reviewer verification");
    items.push({
      tag: eq.tag, incident: inc, equipment: eq, rca, category, reasons, earliestPassed: earliest,
      passedCount: passed.length, noStatusCount: noStatus.length, lastReading: last.date,
      daysSinceReading: days(last.date, reviewDate), criticality: eq.criticality,
    });
  }
  const catRank = (c: CategoryId) => CATEGORIES.findIndex((x) => x.id === c);
  // Default order §7.1: category, criticality, earliest due date, then incident ID as a stable tie-break.
  return items.sort((a, b) =>
    catRank(a.category) - catRank(b.category) ||
    (CRIT_RANK[a.criticality] ?? 9) - (CRIT_RANK[b.criticality] ?? 9) ||
    (a.earliestPassed ?? "9999").localeCompare(b.earliestPassed ?? "9999") ||
    a.incident.serial - b.incident.serial);
}
