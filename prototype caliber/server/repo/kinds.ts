import type { EvidenceKind } from "../../src/domain/actionTransitions.js";

/** Evidence kinds as a runtime tuple, for Zod enums. Kept in step with EVIDENCE_KIND_LABEL. */
export const EVIDENCE_KINDS = [
  "installation_record", "signal_validation", "alarm_config", "repair_record",
  "condition_normal", "lab_report", "work_order", "other",
] as const satisfies readonly EvidenceKind[];
