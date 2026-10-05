// The machine checkup: a short list of yes/no checks a reviewer can read in one pass. Every check is a recorded
// fact (a reading against its own limit, an action's status against its plan date, a reviewer's sign-off), so the
// headline is a count of checks passed, never a score or a probability.
import type { Equipment, Rca, RcaAction } from "./types";
import { actionDue } from "./queue";

export type CheckState = "pass" | "warn" | "fail" | "pending";
export interface Check {
  id: string;
  group: "condition" | "follow-through" | "closure";
  label: string;
  /** Short reading or status shown at the right of the row. */
  detail: string;
  state: CheckState;
  /** For condition checks: the parameter's index, so the row can highlight its sensor on the model. */
  param?: number;
}

const zoneOf = (v: number, alarm: number, trip: number, dir: "high" | "low") =>
  dir === "high" ? (v >= trip ? "trip" : v >= alarm ? "alarm" : "ok") : (v <= trip ? "trip" : v <= alarm ? "alarm" : "ok");

const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, ""));

function actionCheck(a: RcaAction, i: number, reviewDate: string): Check {
  const due = actionDue(a, reviewDate);
  const state: CheckState = due === "closed" ? "pass" : due === "plan_passed" || due === "no_status_plan_passed" ? "fail" : "pending";
  const detail = due === "closed" ? "Closed" : due === "no_status_plan_passed" ? "No status · plan passed" : due === "plan_passed" ? `${a.status} · plan passed` : a.status ?? "Not due";
  return { id: `act-${i}`, group: "follow-through", label: a.text, detail, state };
}

export function buildCheckup(eq: Equipment, rca: Rca | undefined, week: number, reviewDate: string, verified: boolean): Check[] {
  const row = eq.history[week];
  const condition: Check[] = eq.params.map((p, i) => {
    const z = zoneOf(row.values[i], p.alarm, p.trip, p.direction === "low" ? "low" : "high");
    return { id: `p-${i}`, group: "condition", label: p.name, detail: `${fmt(row.values[i])} ${p.unit}`, state: z === "ok" ? "pass" : z === "alarm" ? "warn" : "fail", param: i };
  });
  const actions = rca ? [...rca.actions, ...rca.preventive].map((a, i) => actionCheck(a, i, reviewDate)) : [];
  const closure: Check = { id: "verified", group: "closure", label: "Effectiveness verified by a reviewer", detail: verified ? "Verified" : "Not yet", state: verified ? "pass" : "pending" };
  return [...condition, ...actions, closure];
}

export function summarise(checks: Check[]) {
  const by = (s: CheckState) => checks.filter((c) => c.state === s).length;
  return { total: checks.length, pass: by("pass"), warn: by("warn"), fail: by("fail"), pending: by("pending") };
}
