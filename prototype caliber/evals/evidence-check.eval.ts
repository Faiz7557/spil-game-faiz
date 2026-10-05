// Closure evidence reader on four synthetic documents (evals/fixtures, each stamped SYNTHETIC TEST DOCUMENT).
//   npm run eval:evidence      (regenerate fixtures with: python evals/fixtures/make_fixtures.py)
import { readFileSync } from "node:fs";
import { SENSOR_RULE } from "../src/domain/actionTransitions.js";
import { readEvidence, type EvidenceMime } from "../server/ai/evidenceCheck.js";
import { estimateCostUsd } from "../server/ai/runLog.js";
import { MODELS } from "../server/ai/client.js";
import { requireKey, saveRun } from "./lib.js";

const FIXTURES: { file: string; expect: string; mustWarn: boolean; why: string }[] = [
  { file: "cooler-repair-record.pdf", expect: "repair_record", mustWarn: true, why: "a different action" },
  { file: "sensor-commissioning-record.pdf", expect: "installation_record", mustWarn: false, why: "the right document" },
  { file: "signal-validation-ko3202.pdf", expect: "signal_validation", mustWarn: true, why: "wrong asset on purpose" },
  { file: "undated-alarm-config.png", expect: "alarm_config", mustWarn: true, why: "no date on purpose" },
];

async function main() {
  requireKey();
  const rows = [];
  for (const f of FIXTURES) {
    const contentType: EvidenceMime = f.file.endsWith(".pdf") ? "application/pdf" : "image/png";
    const out = await readEvidence({ bytes: readFileSync(`evals/fixtures/${f.file}`), contentType },
      { caseTag: "KO-3201", actionTitle: "Verify installation and signal validation of the KO-3201 online water-in-oil sensor", rule: SENSOR_RULE });
    const pass = out.check.document_type === f.expect && (out.interpreted.warnings.length > 0) === f.mustWarn;
    rows.push({ ...f, got: out.check.document_type, date: out.check.document_date, tags: out.check.asset_tags, warnings: out.interpreted.warnings, pass, cost_usd: estimateCostUsd(out.usage) });
    console.log(f.file, pass ? "PASS" : "FAIL", out.check.document_type, out.interpreted.warnings);
  }
  const passed = rows.filter((r) => r.pass).length;
  console.log(`${passed} of ${rows.length} passed`);
  console.log("saved to", saveRun("evidence_reader", { model: MODELS.main, label: "internal", passed, of: rows.length, rows }));
}
main().catch((e) => { console.error(e); process.exit(1); });
