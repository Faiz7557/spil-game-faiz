export type NoticeKind = "due_soon" | "overdue" | "awaiting_review";
export function dueNotices(actions: { id: string; state: string; due: string | null }[], today: string) {
  const out: { id: string; kind: NoticeKind }[] = [];
  const days = (d: string) => Math.round((Date.parse(d) - Date.parse(today)) / 86400000);
  for (const a of actions) {
    if (a.state === "verified") continue;
    if (a.state === "ready_for_verification") { out.push({ id: a.id, kind: "awaiting_review" }); continue; }
    if (!a.due) continue;
    const d = days(a.due);
    if (d < 0) out.push({ id: a.id, kind: "overdue" });
    else if (d <= 3) out.push({ id: a.id, kind: "due_soon" });
  }
  return out;
}

export type Recipient = "owner" | "reviewer" | "manager";
export interface Reminder { id: string; title: string; owner: string; kind: NoticeKind; to: Recipient[]; daysOverdue: number }

/** Who should hear about each action today. Same triggers as dueNotices, plus an escalation ladder. */
export function reminderPlan(actions: { id: string; title: string; state: string; due: string | null; owner: string }[], today: string): Reminder[] {
  const byId = new Map(actions.map((a) => [a.id, a]));
  return dueNotices(actions, today).map((n) => {
    const a = byId.get(n.id)!;
    const daysOverdue = a.due ? Math.max(0, Math.round((Date.parse(today) - Date.parse(a.due)) / 86400000)) : 0;
    const to: Recipient[] = n.kind === "awaiting_review" ? ["reviewer"]
      : n.kind === "due_soon" || daysOverdue < 7 ? ["owner"] : daysOverdue < 14 ? ["owner", "reviewer"] : ["owner", "reviewer", "manager"];
    return { id: a.id, title: a.title, owner: a.owner, kind: n.kind, to, daysOverdue };
  });
}
