import { z } from "zod";
import { checkClaim, type Finding } from "../../../src/domain/claimCheck.js";
import { requireUser } from "../../../server/auth.js";
import { db, publishedSnapshotId } from "../../../server/db.js";
import { HttpError, json, route } from "../../../server/http.js";
import { extractRcaClaims } from "../../../server/ai/rcaClaims.js";
import { assertBudget, logAiRun } from "../../../server/ai/runLog.js";

const Tag = z.string().regex(/^[A-Z]{2}-\d{4}[A-Z]?$/);

/** Latest stored audit for a tag, so the page can show results without paying for a new run. */
export const GET = route(async (req) => {
  const user = await requireUser(req, "read");
  const tag = Tag.parse(new URL(req.url).searchParams.get("tag"));
  const sid = await publishedSnapshotId();
  // A guest sees their own latest run if there is one, else the team run; team members never see guest runs.
  let q = db().from("rca_audits").select("id, findings, claims, created_at").eq("snapshot_id", sid).eq("tag", tag);
  q = user.isDemo ? q.or(`is_demo.eq.false,created_by.eq.${user.id}`).order("is_demo", { ascending: false }) : q.eq("is_demo", false);
  const { data } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  return json(data ? { auditId: data.id, findings: data.findings, createdAt: data.created_at, dropped: [] } : null);
});

export const POST = route(async (req) => {
  const user = await requireUser(req, "ai.run");
  const { tag } = z.object({ tag: Tag }).parse(await req.json());
  const reservation = await assertBudget(user, "rca_auditor", tag);
  const sid = await publishedSnapshotId();
  const [{ data: rca }, { data: eqRow }] = await Promise.all([
    db().from("rca_documents").select("doc").eq("snapshot_id", sid).eq("tag", tag).maybeSingle(),
    db().from("equipment").select("doc").eq("snapshot_id", sid).eq("tag", tag).maybeSingle(),
  ]);
  if (!rca || !eqRow) throw new HttpError(404, `No RCA deck and condition record for ${tag}.`);
  const eq = eqRow.doc;
  const started = Date.now();
  const out = await extractRcaClaims({ tag, incidentDate: eq.trip_date, slides: rca.doc.slides });
  // The model only extracts; deterministic code decides every verdict.
  const findings: Finding[] = out.claims.map((c) => checkClaim(c, eq));
  const conflicts = findings.filter((f) => f.verdict === "conflict");
  const runId = await logAiRun({ reservation, feature: "rca_auditor", ref: tag, userId: user.id, usage: out.usage, startedAt: started,
    stopReason: out.stopReason, validation: { claims: out.claims.length, dropped: out.dropped.length, conflicts: conflicts.length } });
  const { data: audit, error } = await db().from("rca_audits").insert({ snapshot_id: sid, tag, claims: out.claims, findings, ai_run_id: runId, is_demo: user.isDemo, created_by: user.id }).select("id").single();
  if (error) throw error;
  if (!user.isDemo) {
    // Replace the previous auditor run's open conflicts; anything an owner already decided stays.
    await db().from("conflicts").delete().eq("snapshot_id", sid).eq("case_tag", tag).eq("origin", "rca_auditor").eq("state", "unresolved");
    if (conflicts.length) await db().from("conflicts").upsert(conflicts.map((f, i) => ({
      snapshot_id: sid, case_tag: tag, code: `AUD-${String(i + 1).padStart(2, "0")}`, topic: f.claim.parameter,
      severity: "decision", origin: "rca_auditor", owner_role: "Reliability engineer",
      a: { evidence: `${rca.doc.source}:slide${f.claim.slide}`, says: f.claim.quote },
      b: { evidence: f.refs[0], says: f.note }, note: f.note,
    })), { onConflict: "snapshot_id,case_tag,code", ignoreDuplicates: true });
  }
  return json({ auditId: audit.id, findings, dropped: out.dropped.map((d) => ({ reason: d.reason, quote: d.claim.quote })), createdAt: new Date().toISOString() });
});
