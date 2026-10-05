/** RCA starter drafted for a register record that has no RCA package. Every checklist row stays "Not assessed". */
export interface RcaDraft {
  problem_statement: string;
  checklist: { id: string; category: "4P" | "4M+1E"; item: string; status: string; data_needed: string }[];
  similar: { ref: string; why: string }[];
  data_requests: { to_role: string; request: string }[];
  first_checks: string[];
}
