// Formulas from docs/rancangan_solusi_plantpulse.md §11.2. Every input is company-provided or measured;
// the calculator never fills a value on its own.
export interface CaseInputs {
  rcaPerYear: number; hoursPerRcaBaseline: number; hoursPerRcaWithTool: number; loadedCostPerHour: number; adoption: number;
  avoidedRecurrences: number; avgRecordedLossPerRecurrence: number; avoidableShare: number;
  platformCostPerYear: number; aiCostPerTask: number; aiTasksPerYear: number; integrationOneOff: number;
}

export const CASE_KEYS: (keyof CaseInputs)[] = [
  "rcaPerYear", "hoursPerRcaBaseline", "hoursPerRcaWithTool", "loadedCostPerHour", "adoption",
  "avoidedRecurrences", "avgRecordedLossPerRecurrence", "avoidableShare",
  "platformCostPerYear", "aiCostPerTask", "aiTasksPerYear", "integrationOneOff",
];

const ok = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function computeCase(i: CaseInputs) {
  // Checked against the full key list: an input that was never typed is missing, not absent.
  const missing = CASE_KEYS.filter((k) => !ok(i[k]));
  const need = (...ks: (keyof CaseInputs)[]) => ks.every((k) => ok(i[k]));
  const labourBenefit = need("rcaPerYear", "hoursPerRcaBaseline", "hoursPerRcaWithTool", "loadedCostPerHour", "adoption")
    ? i.rcaPerYear * (i.hoursPerRcaBaseline - i.hoursPerRcaWithTool) * i.loadedCostPerHour * i.adoption : null;
  const reliabilityBenefit = need("avoidedRecurrences", "avgRecordedLossPerRecurrence", "avoidableShare")
    ? i.avoidedRecurrences * i.avgRecordedLossPerRecurrence * i.avoidableShare : null;
  const runningCost = need("platformCostPerYear", "aiCostPerTask", "aiTasksPerYear") ? i.platformCostPerYear + i.aiCostPerTask * i.aiTasksPerYear : null;
  const annual = labourBenefit !== null && reliabilityBenefit !== null && runningCost !== null ? labourBenefit + reliabilityBenefit - runningCost : null;
  const netYear1 = annual !== null && ok(i.integrationOneOff) ? annual - i.integrationOneOff : null;
  const paybackMonths = annual !== null && annual > 0 && ok(i.integrationOneOff) ? i.integrationOneOff / (annual / 12) : null;
  return { labourBenefit, reliabilityBenefit, runningCost, annualNet: annual, netYear1, paybackMonths, missing };
}

/** Illustrative scenario for judges and the pitch. Each value says where it comes from; "assumption" values are not measured. */
export const EXAMPLE_SCENARIO: Record<keyof CaseInputs, { value: number; source: string }> = {
  rcaPerYear: { value: 148, source: "Dataset: 380 register records over ~2.56 years" },
  hoursPerRcaBaseline: { value: 16, source: "Assumption: engineer hours to assemble a decision package today" },
  hoursPerRcaWithTool: { value: 11, source: "Assumption: to be measured in the pilot task study" },
  loadedCostPerHour: { value: 25, source: "Assumption: loaded engineer cost in Indonesia, US$/h" },
  adoption: { value: 0.6, source: "Assumption: share of RCAs done in PlantPulse in year 1" },
  avoidedRecurrences: { value: 1, source: "Assumption: one repeat failure avoided per year" },
  avgRecordedLossPerRecurrence: { value: 162860, source: "Dataset: average recorded actual loss per register record (US$61.89M / 380)" },
  avoidableShare: { value: 0.5, source: "Assumption: half of the avoided loss credited to PlantPulse" },
  platformCostPerYear: { value: 100000, source: "Assumption: hosting, support and a part-time owner, US$/yr" },
  aiCostPerTask: { value: 0.005, source: "Measured: average AI cost per task over 20 internal runs" },
  aiTasksPerYear: { value: 5000, source: "Assumption" },
  integrationOneOff: { value: 150000, source: "Assumption: read-only connectors to historian and CMMS" },
};

/** Recurrences per year at which reliability benefit plus labour benefit pays the running cost. */
export function breakEvenRecurrences(i: CaseInputs): number | null {
  const r = computeCase(i);
  const perRecurrence = ok(i.avgRecordedLossPerRecurrence) && ok(i.avoidableShare) ? i.avgRecordedLossPerRecurrence * i.avoidableShare : null;
  if (r.runningCost === null || r.labourBenefit === null || !perRecurrence) return null;
  return Math.max(0, r.runningCost - r.labourBenefit) / perRecurrence;
}
