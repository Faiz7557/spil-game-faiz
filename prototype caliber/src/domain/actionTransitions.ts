// Action lifecycle and closure guards, design §7.4. Pure functions so the rules are testable.

export const STATES = [
  "draft", "reviewed", "assigned", "in_progress", "execution_reported",
  "evidence_submitted", "ready_for_verification", "verified", "rework",
] as const;
export type ActionState = (typeof STATES)[number];

export const STATE_LABEL: Record<ActionState, string> = {
  draft: "Draft", reviewed: "Reviewed", assigned: "Assigned", in_progress: "In progress",
  execution_reported: "Execution reported", evidence_submitted: "Evidence submitted",
  ready_for_verification: "Ready for verification", verified: "Verified", rework: "Rework",
};

export type EvidenceKind =
  | "installation_record" | "signal_validation" | "alarm_config"
  | "repair_record" | "condition_normal" | "lab_report" | "work_order" | "other";

export const EVIDENCE_KIND_LABEL: Record<EvidenceKind, string> = {
  installation_record: "Installation / commissioning record",
  signal_validation: "Signal validation vs lab sample",
  alarm_config: "DCS alarm configuration record",
  repair_record: "Repair record (cooler tube plug + re-test)",
  condition_normal: "NORMAL condition readings after repair",
  lab_report: "Lab oil analysis report",
  work_order: "Work order reference",
  other: "Other document",
};

/** What the closure evidence reader saw in an uploaded file. Advisory: the rule and the reviewer decide. */
export interface EvidenceAiCheck { document_type: EvidenceKind; summary: string; warnings: string[]; document_date: string | null; asset_tags: string[] }

export interface EvidenceItem {
  id: string; kind: EvidenceKind; label: string; dated: string; ref: string;
  /** true = browser-only demo record; false = stored server-side (live mode). */
  simulated: boolean; addedAt: string;
  /** Storage path of the uploaded file, when there is one. */
  file?: string | null;
  aiCheck?: EvidenceAiCheck | null;
}

export interface VerificationRule {
  required: EvidenceKind[];
  /** Evidence that looks related but does not satisfy this rule, with the reason. */
  notSufficient: Partial<Record<EvidenceKind, string>>;
  effectivenessRequired: boolean;
  effectivenessCriteria: string;
}

export interface ReviewEvent {
  at: string; actor: string; from: ActionState | null; to: ActionState | null;
  decision: string; reason: string; evidenceRefs: string[];
}

export interface SimAction {
  id: string; caseTag: string; title: string; sourceActionRef: string | null; sourceRefs: string[];
  rationale: string; owner: string; ownerRole: string; due: string; scope: string; dependency: string;
  state: ActionState; evidence: EvidenceItem[]; rule: VerificationRule;
  reviewer: string; effectivenessResult: string; executionNote: string;
  log: ReviewEvent[]; createdAt: string;
}

export const SENSOR_RULE: VerificationRule = {
  required: ["installation_record", "signal_validation", "alarm_config"],
  notSufficient: {
    repair_record: "Proves the cooler tube was repaired — a different action. It does not show a sensor exists.",
    condition_normal: "Shows the machine recovered. Recovery is not evidence that monitoring was installed.",
  },
  effectivenessRequired: true,
  effectivenessCriteria: "Engineer-defined observation period with the sensor online and alarm tested; five NORMAL weeks alone are not sufficient.",
};

export interface Guard { ok: boolean; unmet: string[] }

const filled = (s: string | undefined | null) => !!s && s.trim().length > 0;

/** Which required evidence kinds are still missing, and which attached items do not count. */
export function ruleCheck(a: SimAction) {
  const have = new Set(a.evidence.map((e) => e.kind));
  const missing = a.rule.required.filter((k) => !have.has(k));
  const irrelevant = a.evidence
    .filter((e) => a.rule.notSufficient[e.kind])
    .map((e) => ({ item: e, reason: a.rule.notSufficient[e.kind]! }));
  const undated = a.evidence.filter((e) => !filled(e.dated));
  return { missing, irrelevant, undated, satisfied: missing.length === 0 && undated.length === 0 };
}

export function guard(a: SimAction, to: ActionState): Guard {
  const u: string[] = [];
  const from = a.state;
  const allowed: Partial<Record<ActionState, ActionState[]>> = {
    draft: ["reviewed"],
    reviewed: ["assigned"],
    assigned: ["in_progress"],
    in_progress: ["execution_reported"],
    execution_reported: ["evidence_submitted"],
    evidence_submitted: ["ready_for_verification", "rework"],
    ready_for_verification: ["verified", "rework"],
    rework: ["in_progress"],
  };
  if (!(allowed[from] ?? []).includes(to)) u.push(`“${STATE_LABEL[from]}” cannot move directly to “${STATE_LABEL[to]}”.`);
  if (to === "reviewed") {
    if (!filled(a.rationale)) u.push("Write the rationale the action is based on.");
    if (!a.sourceRefs.length) u.push("Link at least one source evidence ID.");
  }
  if (to === "assigned") {
    if (!filled(a.owner)) u.push("Name an owner.");
    if (!filled(a.due)) u.push("Set a due date.");
    else if (a.due < a.createdAt.slice(0, 10)) u.push("The due date is before the action was created.");
    if (!filled(a.scope)) u.push("Describe the scope.");
    if (!filled(a.dependency)) u.push("Record dependencies (write “none” if there are none).");
    if (!a.rule.required.length) u.push("Define the completion criteria (required evidence).");
  }
  if (to === "execution_reported" && !filled(a.executionNote)) u.push("Add an execution note (what was done, when).");
  if (to === "evidence_submitted") {
    if (!a.evidence.length) u.push("Attach implementation evidence.");
    const { undated } = ruleCheck(a);
    if (undated.length) u.push("Every evidence item needs a date.");
  }
  if (to === "ready_for_verification") {
    const { missing, irrelevant } = ruleCheck(a);
    for (const k of missing) u.push(`Missing required evidence: ${EVIDENCE_KIND_LABEL[k]}.`);
    for (const r of irrelevant) u.push(`“${r.item.label}” does not count: ${r.reason}`);
  }
  if (to === "verified") {
    if (!filled(a.reviewer)) u.push("A reviewer must be named.");
    if (filled(a.reviewer) && a.reviewer.trim().toLowerCase() === a.owner.trim().toLowerCase())
      u.push("The reviewer cannot be the action owner.");
    if (!ruleCheck(a).satisfied) u.push("Evidence does not satisfy the verification rule.");
    if (a.rule.effectivenessRequired && !filled(a.effectivenessResult))
      u.push(`Record the effectiveness observation: ${a.rule.effectivenessCriteria}`);
  }
  // A missing evidence list is the problem to fix, so list it even when the path is also wrong.
  return { ok: u.length === 0, unmet: u };
}

/** "Mark complete" from any state: explains everything still standing between the action and Verified. */
export function closureCheck(a: SimAction): Guard {
  if (a.state === "verified") return { ok: true, unmet: [] };
  const u: string[] = [];
  const { missing, irrelevant, undated } = ruleCheck(a);
  if (!a.evidence.length) u.push("No implementation evidence is attached.");
  for (const k of missing) u.push(`Missing required evidence: ${EVIDENCE_KIND_LABEL[k]}.`);
  for (const r of irrelevant) u.push(`“${r.item.label}” does not count: ${r.reason}`);
  if (undated.length) u.push("Some evidence is undated.");
  if (!filled(a.reviewer)) u.push("No reviewer has approved the evidence.");
  if (a.rule.effectivenessRequired && !filled(a.effectivenessResult)) u.push("Effectiveness observation not recorded.");
  u.push(`Current state is “${STATE_LABEL[a.state]}”; closure only happens through reviewer verification.`);
  return { ok: false, unmet: u };
}

export function transition(a: SimAction, to: ActionState, actor: string, reason: string, at: string): SimAction {
  const g = guard(a, to);
  if (!g.ok) throw new Error(g.unmet.join(" "));
  if (to === "rework" && !filled(reason)) throw new Error("Rework needs a reason.");
  return {
    ...a, state: to,
    log: [...a.log, { at, actor, from: a.state, to, decision: STATE_LABEL[to], reason, evidenceRefs: a.evidence.map((e) => e.id) }],
  };
}
