import { z } from "zod";
import { SENSOR_RULE } from "../../../src/domain/actionTransitions.js";
import { requireUser } from "../../../server/auth.js";
import { db, publishedSnapshotId } from "../../../server/db.js";
import { json, route } from "../../../server/http.js";
import { appendEvent, fromRow, withActorNames } from "../../../server/repo/actions.js";
import { EVIDENCE_KINDS } from "../../../server/repo/kinds.js";

const Rule = z.object({
  required: z.array(z.enum(EVIDENCE_KINDS)).min(1), notSufficient: z.record(z.string(), z.string()),
  effectivenessRequired: z.boolean(), effectivenessCriteria: z.string().max(1000),
});
const Create = z.object({
  caseTag: z.string().regex(/^[A-Z]{2}-\d{4}[A-Z]?$/), incidentId: z.string().max(40).optional(), title: z.string().min(5).max(300),
  sourceActionRef: z.string().max(300).nullable().default(null), sourceRefs: z.array(z.string().max(80)).max(20).default([]),
  rationale: z.string().max(4000).default(""), scope: z.string().max(2000).default(""),
  rule: Rule.default(SENSOR_RULE as z.infer<typeof Rule>),
});
const NONE = "00000000-0000-0000-0000-000000000000";

export const GET = route(async (req) => {
  const user = await requireUser(req, "read");
  const tag = new URL(req.url).searchParams.get("case");
  let q = db().from("actions").select("*").order("created_at", { ascending: false });
  if (tag) q = q.eq("case_tag", tag);
  q = user.isDemo ? q.eq("created_by", user.id) : q.eq("is_demo", false);
  const { data, error } = await q;
  if (error) throw error;
  const ids = (data ?? []).map((r) => r.id as string);
  const [{ data: ev }, { data: log }] = await Promise.all([
    db().from("action_evidence").select("*").in("action_id", ids.length ? ids : [NONE]).order("added_at"),
    db().from("review_events").select("*").eq("subject_type", "action").in("subject_id", ids.length ? ids : ["-"]).order("id"),
  ]);
  const named = await withActorNames(log ?? []);
  return json((data ?? []).map((r) => fromRow(r, (ev ?? []).filter((e) => e.action_id === r.id), named.filter((l) => l.subject_id === r.id))));
});

export const POST = route(async (req) => {
  const user = await requireUser(req, "action.write");
  const b = Create.parse(await req.json());
  const { data, error } = await db().from("actions").insert({
    snapshot_id: await publishedSnapshotId(), case_tag: b.caseTag, incident_id: b.incidentId ?? null, title: b.title,
    source_action_ref: b.sourceActionRef, source_refs: b.sourceRefs, rationale: b.rationale, scope: b.scope,
    rule: b.rule, is_demo: user.isDemo, created_by: user.id,
  }).select("id").single();
  if (error) throw error;
  await appendEvent({ actor: user.id, type: "action", subject: data.id, to: "draft", decision: "Created", refs: b.sourceRefs });
  return json({ id: data.id }, 201);
});
