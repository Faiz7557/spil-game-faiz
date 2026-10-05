// Wire types of the copilot stream (api/copilot.ts). Kept in the browser tree so pages never import server code.
export type GuardStatus = "supported" | "partial" | "unsupported" | "pending" | "not_required";
export interface GuardResult { index: number; status: GuardStatus; reason: string }
export interface AnswerSentence { text: string; refs: string[]; kind: "fact" | "documented_finding" | "hypothesis" | "recommendation" }
export interface CopilotAnswer { sentences: AnswerSentence[]; abstentions: string[]; follow_ups: string[] }
