// Shapes of the JSON produced by pipeline/extract_case2.py and pipeline/generate_briefs.py.

export interface SourceRef { source: string; sheet: string; row: number }

export interface Source {
  id: string; kind: string; relative_path: string; file_name: string; sha256: string;
  source_updated_at: string | null; ingested_at: string;
}

export interface Incident {
  id: string; serial: number; mto: string; ar_raw: string; ar: string | null;
  plant: string; tag: string; eq_class: string; occurred: string; title: string;
  impact: string; pre_risk: string; risk_score: number; pic_rca: string; status: string;
  discipline: string; eq_type: string; component: string; mechanism: string;
  downtime_h: number; actual_usd: number; potential_usd: number; total_usd: number;
  rca_due: string | null; src: SourceRef;
}

export interface Param { name: string; unit: string; alarm: number; trip: number; direction: "high" | "low" }
export interface WeeklyRow { week: number; date: string; values: number[]; status: string; remark: string | null; row: number }

export interface Equipment {
  tag: string; source: string; name: string; type: string; eq_class: string; plant_unit: string;
  discipline: string; criticality: string; design_life: string; monitoring: string; linked_ar: string;
  target_fields: { failure_date: string; dominant_failure_mode: string };
  params: Param[]; history: WeeklyRow[];
  summary: { kpi: string; value: number | string; basis: string | number; row: number }[];
  linked_incident: string | null; join_count: number; first_alarm: string; trip_date: string;
  linear_flag: { date: string; week: number; horizon_weeks: number; parameter: string } | null;
}

export interface Hourly {
  source: string; tag_prefix: string;
  pi_tags: { name: string; description: string; unit: string; instrument: string }[];
  columns: string[]; t: string[]; series: Record<string, number[]>; run: string[];
  off_rows: number; off_with_nonzero_amp: number;
  forecast: {
    target: string; train_hours: number; test_hours: number; cutoff: string; test_start: string;
    test_off_hours: number; train_median_A: number;
    predictions: Record<string, number[]>; wape_pct: Record<string, number>; mae_A: Record<string, number>;
  };
}

export interface RcaAction {
  kind: "corrective" | "proactive" | "preventive"; rc: string; text: string;
  plan_date: string; pic: string; status: string | null; cause?: string;
}

export interface Rca {
  source: string; tag: string; title: string; ar: string; problem_statement: string;
  chronology: { when: string; event: string }[]; past_performance: string[];
  four_p: { id: string; item: string; result: string; finding: string }[];
  four_m: { id: string; item: string; result: string; finding: string }[];
  root_cause: string; actions: RcaAction[]; preventive: RcaAction[]; slides: string[][];
}

export interface Snapshot {
  meta: { snapshot: string; review_date: string; open_statuses: string[]; currency: string;
    ar_placeholder_count: number; duplicate_ar: Record<string, number> };
  sources: Record<string, Source>;
  incidents: Incident[]; equipment: Equipment[]; hourly: Hourly[]; rca: Rca[];
}

export type AssertionType = "observed" | "documented_finding" | "proposed" | "simulated";

export interface Evidence {
  id: string; type: AssertionType; source: string; loc: string; title: string; excerpt: string; timestamp: string | null;
}

export interface Conflict {
  id: string; topic: string; severity: "decision" | "info" | "rule";
  a: { evidence: string; says: string }; b: { evidence: string; says: string };
  note: string; state: "unresolved" | "rule_applied" | "resolved"; owner_role: string;
}

export interface EvidenceMap { case: string; incident_id: string; evidence: Evidence[]; conflicts: Conflict[] }

export interface BriefItem { text: string; refs: string[]; why?: string; support?: string[]; against?: string[]; missing?: string[]; level?: string }

export interface Brief {
  run_id: string; mode: "snapshot_review" | "masked_diagnostic"; cutoff: string | null; task: string;
  model: string; generated_at: string; channel: string; provenance_note: string;
  manifest: { allowed_evidence: string[]; excluded_inputs: string[]; source_hashes: Record<string, string> };
  evidence: { id: string; source: string; loc: string; excerpt: string }[];
  brief: {
    shows: BriefItem[]; documented_findings: BriefItem[]; hypotheses: BriefItem[];
    conflicts_missing: BriefItem[]; verify_next: BriefItem[]; abstentions: BriefItem[];
    draft_action: { title: string; owner_role: string; required_evidence: string[]; not_sufficient: string[]; refs: string[] };
  };
  validation: { structural_pass: boolean; issues: string[]; citations_checked: number; allowlist_size: number };
  review: { reviewer: string; decision: string; validity?: string; validity_reason?: string; unsupported_assertions: number; factual_statements_checked: number; supported_by_cited_evidence: number } | null;
}

export interface ValidationReport {
  review_date: string; passed: number; total: number;
  checks: { id: string; gate: string; description: string; expected: unknown; actual: unknown; pass: boolean }[];
}
