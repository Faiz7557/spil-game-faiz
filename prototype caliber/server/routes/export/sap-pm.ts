import { requireUser } from "../../../server/auth.js";
import { db, publishedSnapshotId } from "../../../server/db.js";
import { route } from "../../../server/http.js";
import { toSapCsv } from "../../../server/integrations/sapPm.js";
import { appendEvent } from "../../../server/repo/actions.js";

/** A file for a human to import into SAP PM. PlantPulse never posts to SAP itself. */
export const GET = route(async (req) => {
  const user = await requireUser(req, "action.write");
  const sid = await publishedSnapshotId();
  let q = db().from("actions").select("id, case_tag, title, due, owner_label, source_refs, incident_id, state").in("state", ["assigned", "in_progress"]);
  q = user.isDemo ? q.eq("created_by", user.id) : q.eq("is_demo", false);
  const { data: acts, error } = await q;
  if (error) throw error;
  const { data: inc } = await db().from("incidents").select("id, plant, tag, eq_class").eq("snapshot_id", sid);
  const csv = toSapCsv((acts ?? []).map((a) => {
    const i = inc?.find((x) => x.id === a.incident_id) ?? inc?.find((x) => x.tag === a.case_tag);
    const cls = ["A", "B", "C"].includes(i?.eq_class) ? (i!.eq_class as "A" | "B" | "C") : "C";
    return { id: a.id, caseTag: a.case_tag, plant: i?.plant ?? "", title: a.title, due: a.due ?? "", owner: a.owner_label, priorityClass: cls, sourceRefs: a.source_refs ?? [] };
  }));
  await appendEvent({ actor: user.id, type: "export", subject: "sap-pm", decision: `Exported ${acts?.length ?? 0} actions`, reason: "SAP PM notification CSV" });
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="plantpulse-sap-pm-${new Date().toISOString().slice(0, 10)}.csv"` } });
});
