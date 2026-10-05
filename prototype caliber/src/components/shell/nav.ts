import type { ElementType } from "react";
import {
  Calculator, ClipboardCheck, Database, FileSearch, LayoutDashboard, Layers, ListTodo, Microscope, ShieldCheck, Tags, Upload,
} from "lucide-react";
import type { Page } from "../../App";

export interface PageMeta {
  page: Page;
  label: string;
  /** Plain-language purpose, written for plant staff rather than for the competition brief. */
  hint: string;
  group: "Workflow" | "Insight" | "Value & data" | "Admin";
  icon: ElementType;
  /** Uses the active case (equipment tag) from the URL. */
  perCase?: boolean;
  /** Needs the hosted build (model calls or the database). */
  live?: boolean;
  keywords?: string;
}

export const PAGES_META: PageMeta[] = [
  { page: "overview", label: "Overview", hint: "Recorded loss, open records and where to start", group: "Workflow", icon: LayoutDashboard, keywords: "executive home kpi loss dashboard" },
  { page: "queue", label: "Problem Tank", hint: "Which equipment to review first, and why", group: "Workflow", icon: Tags, perCase: true, keywords: "queue priority alerts evidence" },
  { page: "investigation", label: "Investigation", hint: "Window to act, ranked causes, cited AI brief", group: "Workflow", icon: Microscope, perCase: true, keywords: "root cause differential forecast diagnosis" },
  { page: "actions", label: "Actions & verification", hint: "Owners, due dates and the evidence needed to close", group: "Workflow", icon: ClipboardCheck, perCase: true, keywords: "follow-through reminders effectiveness sister assets close" },
  { page: "patterns", label: "Failure patterns", hint: "Recurring failure families across the 12 plants", group: "Insight", icon: Layers, keywords: "families recurring" },
  { page: "audit", label: "RCA auditor", hint: "Checks each RCA claim against the sensor record", group: "Insight", icon: FileSearch, perCase: true, live: true, keywords: "conflict claims deck" },
  { page: "backlog", label: "RCA backlog", hint: "Starters for open records past their RCA due date", group: "Insight", icon: ListTodo, live: true, keywords: "overdue 4p 4m" },
  { page: "business", label: "Business case", hint: "Break-even under inputs your company supplies", group: "Value & data", icon: Calculator, keywords: "value roi savings cost" },
  { page: "foundation", label: "Data foundation", hint: "Sources, quality checks and KPI definitions", group: "Value & data", icon: Database, keywords: "sources connectors validation" },
  { page: "aiquality", label: "AI quality", hint: "Cost, latency and evidence-guard verdicts", group: "Admin", icon: ShieldCheck, keywords: "evals guard cost" },
  { page: "ingest", label: "Ingest snapshot", hint: "Publish a new register (data owners)", group: "Admin", icon: Upload, live: true, keywords: "upload excel pptx publish" },
];

export const metaFor = (p: Page) => PAGES_META.find((m) => m.page === p)!;

/** The four-stop path a reliability engineer walks for one case. */
export const WORKFLOW: Page[] = ["overview", "queue", "investigation", "actions"];

