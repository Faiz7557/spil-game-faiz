import { createHash } from "node:crypto";
import { z } from "zod";
import { requireUser } from "../../../server/auth.js";
import { db } from "../../../server/db.js";
import { HttpError, json, route } from "../../../server/http.js";
import { extractEquipment, extractHourly, extractIncidents } from "../../../server/ingest/xlsx.js";
import { extractRca } from "../../../server/ingest/pptx.js";
import { runGates } from "../../../server/ingest/validate.js";
import { assembleFromParts, writeSnapshot, type SnapshotParts } from "../../../server/repo/writeSnapshot.js";

const Body = z.object({
  label: z.string().trim().min(3).max(120), reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  files: z.array(z.object({ path: z.string().max(400), kind: z.enum(["incident", "equipment", "production", "rca"]) })).min(1).max(60),
});

/** Extracts uploaded source files into a STAGING snapshot and runs the quality gates. Nothing is visible to users until publish. */
export const POST = route(async (req) => {
  const user = await requireUser(req, "ingest");
  const b = Body.parse(await req.json());
  if (b.files.filter((f) => f.kind === "incident").length !== 1) throw new HttpError(400, "Upload exactly one Incident Database workbook.");
  for (const f of b.files) if (!f.path.startsWith(`${user.id}/`) || f.path.includes("..")) throw new HttpError(400, "Files must be your own uploads.");
  const counters = { E: 0, P: 0, R: 0 };
  const parts: SnapshotParts = { sources: [], incidents: [], equipment: [], hourly: [], rca: [] };
  const decks: { buf: Buffer; id: string; name: string }[] = [];
  // Equipment first, so RCA decks can be matched to an asset tag through their file name (as the Python pipeline does).
  const order = { incident: 0, equipment: 1, production: 2, rca: 3 } as const;
  for (const f of [...b.files].sort((x, y) => order[x.kind] - order[y.kind])) {
    const { data, error } = await db().storage.from("sources").download(f.path);
    if (error || !data) throw new HttpError(404, `Upload not found: ${f.path.split("/").pop()}`);
    const buf = Buffer.from(await data.arrayBuffer());
    const id = f.kind === "incident" ? "L3" : f.kind === "equipment" ? `E${++counters.E}` : f.kind === "production" ? `P${++counters.P}` : `R${++counters.R}`;
    const name = f.path.split("/").pop()!.replace(/^\d+-/, "");
    parts.sources.push({ id, kind: f.kind, file_name: name, storage_path: f.path, sha256: createHash("sha256").update(buf).digest("hex") });
    try {
      if (f.kind === "incident") parts.incidents = await extractIncidents(buf, id);
      if (f.kind === "equipment") parts.equipment.push(await extractEquipment(buf, id));
      if (f.kind === "production") parts.hourly.push(await extractHourly(buf, id));
      if (f.kind === "rca") decks.push({ buf, id, name });
    } catch (e) {
      throw new HttpError(422, `${name}: ${e instanceof Error ? e.message : "could not be read"}`);
    }
  }
  for (const d of decks) {
    const hint = parts.equipment.find((e) => d.name.includes(e.tag))?.tag;
    try { parts.rca.push(await extractRca(d.buf, d.id, hint)); }
    catch (e) { throw new HttpError(422, `${d.name}: ${e instanceof Error ? e.message : "could not be read"}`); }
  }
  const snapshot = assembleFromParts(parts, b.reviewDate);
  const gates = runGates(snapshot);
  const snapshotId = await writeSnapshot(snapshot, { label: b.label, status: "staging", createdBy: user.id, validation: gates });
  return json({ snapshotId, ...gates, counts: { incidents: snapshot.incidents.length, equipment: snapshot.equipment.length, hourly: snapshot.hourly.length, rca: snapshot.rca.length } });
});
