import type { Incident } from "./types";
import type { CategoryId } from "./queue";

// Problem Tank + Alert Prioritization Engine over every open-status register record.
// Uses only fields the source provides (status, Pre-Risk, risk score, class, RCA due date);
// no invented probability or dollar-risk score.

const PRE_RISK_RANK: Record<string, number> = { I: 0, II: 1, III: 2, IV: 3 };
const CLASS_RANK: Record<string, number> = { A: 0, B: 1, C: 2 };

export interface TankItem {
  incident: Incident; category: CategoryId; reasons: string[]; detailed: boolean;
  rcaDuePassed: boolean; daysPastDue: number | null; guidance: string[];
}

/** Lifecycle status → queue category (design §7.1). */
export function statusCategory(i: Incident, reviewDate: string): CategoryId {
  switch (i.status) {
    case "NEW REGISTERED":
    case "RCA PROCESS": return "investigation";
    case "CA/PA EXECUTION": return i.rca_due && i.rca_due < reviewDate ? "followup" : "planned";
    case "MONITORING RESULT": return "pending";
    default: return "planned";
  }
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export function buildTank(incidents: Incident[], openStatuses: string[], reviewDate: string, detailedIds: Set<string>): TankItem[] {
  const open = incidents.filter((i) => openStatuses.includes(i.status));
  const items = open.map((i): TankItem => {
    const passed = !!i.rca_due && i.rca_due < reviewDate;
    const detailed = detailedIds.has(i.id);
    const reasons = [
      `Pre-Risk ${i.pre_risk} · risk score ${i.risk_score} (source register)`,
      `Class ${i.eq_class} · ${i.impact}`,
    ];
    if (passed) reasons.push(`RCA due date passed ${daysBetween(i.rca_due!, reviewDate)} days ago — status confirmation required`);
    reasons.push(detailed ? "Full evidence package: condition, hourly PI and RCA" : "Detailed RCA unavailable — register metadata only");
    // Action guidance for the long tail: what is needed before anyone can decide.
    const guidance: string[] = [];
    if (i.status === "NEW REGISTERED") guidance.push(`Triage: confirm scope and assign an RCA lead (current PIC ${i.pic_rca})`);
    if (i.status === "RCA PROCESS") guidance.push(`Ask ${i.pic_rca} for the RCA status and expected completion`);
    if (i.status === "CA/PA EXECUTION") guidance.push(`Request the CAPA plan with owners and plan dates from ${i.pic_rca}`);
    if (i.status === "MONITORING RESULT") guidance.push("Define the effectiveness criterion and observation period before closing");
    if (!detailed) guidance.push(`Attach condition data for ${i.tag} (${i.component}) so the case can be investigated`);
    if (passed) guidance.push("Record the current status with a date; the snapshot has no change log");
    return { incident: i, category: statusCategory(i, reviewDate), reasons, detailed, rcaDuePassed: passed,
      daysPastDue: passed ? daysBetween(i.rca_due!, reviewDate) : null, guidance };
  });
  const cat: CategoryId[] = ["operational", "investigation", "followup", "pending", "planned"];
  return items.sort((a, b) =>
    cat.indexOf(a.category) - cat.indexOf(b.category) ||
    (PRE_RISK_RANK[a.incident.pre_risk] ?? 9) - (PRE_RISK_RANK[b.incident.pre_risk] ?? 9) ||
    b.incident.risk_score - a.incident.risk_score ||
    (CLASS_RANK[a.incident.eq_class] ?? 9) - (CLASS_RANK[b.incident.eq_class] ?? 9) ||
    (a.incident.rca_due ?? "9999").localeCompare(b.incident.rca_due ?? "9999") ||
    a.incident.serial - b.incident.serial);
}
