import type { ActionState, EvidenceItem, ReviewEvent, SimAction } from "../../src/domain/actionTransitions.js";
import { db } from "../db.js";
import { HttpError } from "../http.js";
import type { AppUser } from "../auth.js";

export function fromRow(r: any, evidence: any[], log: any[]): SimAction {
  return {
    id: r.id, caseTag: r.case_tag, title: r.title, sourceActionRef: r.source_action_ref, sourceRefs: r.source_refs ?? [],
    rationale: r.rationale, owner: r.owner_label, ownerRole: "", due: r.due ?? "", scope: r.scope, dependency: r.dependency,
    state: r.state as ActionState, rule: r.rule, reviewer: r.reviewer_label, effectivenessResult: r.effectiveness_result,
    executionNote: r.execution_note, createdAt: r.created_at,
    evidence: evidence.map((e): EvidenceItem => ({
      id: e.id, kind: e.kind, label: e.label, dated: e.dated ?? "", ref: e.storage_path ?? "", simulated: false, addedAt: e.added_at,
      file: e.storage_path ?? null,
      aiCheck: e.ai_check ? { document_type: e.ai_check.document_type, summary: e.ai_check.summary, warnings: e.ai_check.warnings ?? [],
        document_date: e.ai_check.document_date ?? null, asset_tags: e.ai_check.asset_tags ?? [] } : null,
    })),
    log: log.map((l): ReviewEvent => ({ at: l.at, actor: l.actor_name ?? l.actor_id ?? "", from: l.from_state, to: l.to_state, decision: l.decision, reason: l.reason, evidenceRefs: l.evidence_refs })),
  };
}

export function toRow(a: SimAction) {
  return {
    title: a.title, source_action_ref: a.sourceActionRef, source_refs: a.sourceRefs, rationale: a.rationale,
    owner_label: a.owner, due: a.due || null, scope: a.scope, dependency: a.dependency, state: a.state, rule: a.rule,
    reviewer_label: a.reviewer, effectiveness_result: a.effectivenessResult, execution_note: a.executionNote,
    updated_at: new Date().toISOString(),
  };
}

export type PatchField = "owner" | "due" | "scope" | "dependency" | "rationale" | "executionNote" | "reviewer" | "effectivenessResult";

/** Which fields the client may change in each state. Mirrors what the action tag lets you edit, so a
 *  crafted request cannot, say, swap the owner while the action waits for verification. */
export const EDITABLE: Partial<Record<ActionState, PatchField[]>> = {
  draft: ["owner", "due", "scope", "dependency", "rationale"],
  reviewed: ["owner", "due", "scope", "dependency", "rationale"],
  rework: ["owner", "due", "scope", "dependency", "rationale", "executionNote"],
  in_progress: ["executionNote"],
  ready_for_verification: ["reviewer", "effectivenessResult"],
};

export function allowedPatch(state: ActionState, patch: Partial<Record<PatchField, string>>) {
  const ok = EDITABLE[state] ?? [];
  return Object.fromEntries(Object.entries(patch).filter(([k]) => ok.includes(k as PatchField))) as Partial<Record<PatchField, string>>;
}

export async function loadAction(id: string, user: AppUser): Promise<{ action: SimAction; isDemo: boolean; createdBy: string }> {
  const { data: r } = await db().from("actions").select("*").eq("id", id).maybeSingle();
  if (!r) throw new HttpError(404, "Action not found.");
  if (r.is_demo && r.created_by !== user.id) throw new HttpError(404, "Action not found.");
  if (!r.is_demo && user.isDemo) throw new HttpError(403, "Guests can only change their own sandbox actions.");
  const [{ data: ev }, { data: log }] = await Promise.all([
    db().from("action_evidence").select("*").eq("action_id", id).order("added_at"),
    db().from("review_events").select("*").eq("subject_type", "action").eq("subject_id", id).order("id"),
  ]);
  return { action: fromRow(r, ev ?? [], await withActorNames(log ?? [])), isDemo: r.is_demo, createdBy: r.created_by };
}

/** Review events store actor IDs; the UI shows display names. */
export async function withActorNames(log: any[]) {
  const ids = [...new Set(log.map((l) => l.actor_id).filter(Boolean))];
  if (!ids.length) return log;
  const { data } = await db().from("profiles").select("id, display_name").in("id", ids);
  const names = new Map((data ?? []).map((p) => [p.id, p.display_name]));
  return log.map((l) => ({ ...l, actor_name: names.get(l.actor_id) ?? l.actor_id }));
}

export async function appendEvent(e: { actor: string; type: string; subject: string; from?: string | null; to?: string | null; decision: string; reason?: string; refs?: string[] }) {
  const { error } = await db().from("review_events").insert({
    actor_id: e.actor, subject_type: e.type, subject_id: e.subject, from_state: e.from ?? null, to_state: e.to ?? null,
    decision: e.decision, reason: e.reason ?? "", evidence_refs: e.refs ?? [],
  });
  if (error) throw error;
}
