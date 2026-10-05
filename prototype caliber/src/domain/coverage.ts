import type { Incident, Snapshot } from "./types";
import { REGISTER_FAMILY, modesFor, type Family } from "./failureModes.js";

/** Components that do not belong to a family (register entries to confirm, not to "fix" silently). */
const ATYPICAL: Partial<Record<Family, string[]>> = { PU: ["tube bundle"], BL: ["tube bundle"], EM: ["tube bundle"], CO: ["tube bundle"], HX: ["impeller"] };

export interface Coverage {
  incidentId: string; have: { condition: boolean; rca: boolean; owner: boolean; dueDate: boolean };
  score: number; family: Family | null; candidates: string[]; dqFlag: string | null; nextRequest: string;
}

export function coverageFor(i: Incident, snap: Snapshot): Coverage {
  const condition = snap.equipment.some((e) => e.linked_incident === i.id);
  const rca = condition && snap.rca.some((r) => r.tag === i.tag);
  const have = { condition, rca, owner: !!i.pic_rca, dueDate: !!i.rca_due };
  const family = REGISTER_FAMILY[i.eq_type] ?? null;
  const comp = i.component.toLowerCase();
  const candidates = family ? modesFor(family).filter((m) => m.components.some((c) => comp === c || comp.includes(c))).map((m) => m.id) : [];
  const dqFlag = family && ATYPICAL[family]?.some((c) => comp.includes(c))
    ? `Component "${i.component}" is not part of a ${i.eq_type} (${family}); confirm the equipment type or component in the register.` : null;
  const nextRequest = !condition ? "Attach condition readings (weekly route or PI tags) for this asset."
    : !rca ? "Attach the RCA package (4P, 4M+1E, actions with PIC and plan date)."
    : !have.owner ? "Name the RCA owner." : !have.dueDate ? "Set the RCA due date." : "Evidence complete for review.";
  const score = [have.condition, have.rca, have.owner, have.dueDate].filter(Boolean).length / 4;
  return { incidentId: i.id, have, score, family, candidates, dqFlag, nextRequest };
}
