import { describe, expect, it } from "vitest";
import { dueNotices, reminderPlan } from "./notify";

describe("dueNotices", () => {
  const today = "2026-10-14";
  it("due within 3 days, overdue, and awaiting review", () => {
    const n = dueNotices([
      { id: "a", state: "assigned", due: "2026-10-16" },
      { id: "b", state: "in_progress", due: "2026-10-10" },
      { id: "c", state: "ready_for_verification", due: "2026-11-01" },
      { id: "d", state: "verified", due: "2026-10-01" },
      { id: "e", state: "assigned", due: "2026-10-30" },
    ], today);
    expect(n).toEqual([{ id: "a", kind: "due_soon" }, { id: "b", kind: "overdue" }, { id: "c", kind: "awaiting_review" }]);
  });
});

describe("reminderPlan", () => {
  it("escalates by days overdue", () => {
    const r = reminderPlan([
      { id: "a", title: "Install sensor", state: "in_progress", due: "2026-06-30", owner: "REL-05" },
      { id: "b", title: "Retube", state: "draft", due: "2026-10-04", owner: "STA-02" },
      { id: "c", title: "Check", state: "ready_for_verification", due: null, owner: "REL-02" },
    ], "2026-10-02");
    expect(r.map((x) => [x.id, x.kind, x.to])).toEqual([
      ["a", "overdue", ["owner", "reviewer", "manager"]], ["b", "due_soon", ["owner"]], ["c", "awaiting_review", ["reviewer"]],
    ]);
    expect(r[0].daysOverdue).toBe(94);
  });
});
