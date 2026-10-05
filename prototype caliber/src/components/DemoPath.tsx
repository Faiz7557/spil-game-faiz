// "Start here": the first thing a new visitor from the plant sees on the overview. One entry per role, then
// the three-minute KO-3201 walkthrough for judges and first-time users.
import { ArrowRight, ClipboardCheck, Compass, Database, LayoutDashboard, Tags } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const ROLES = [
  { id: "manager", href: "#/overview/KO-3201", icon: LayoutDashboard, role: "Plant manager", task: "Recorded loss and what is still open" },
  { id: "engineer", href: "#/queue/KO-3201", icon: Tags, role: "Reliability engineer", task: "Pick the case to review first, read its sources" },
  { id: "planner", href: "#/actions/KO-3201", icon: ClipboardCheck, role: "Maintenance planner", task: "Owners, due dates, reminders, closure evidence" },
  { id: "data", href: "#/foundation/KO-3201", icon: Database, role: "Data owner", task: "Sources, quality checks, publishing a snapshot" },
] as const;
export type RoleId = (typeof ROLES)[number]["id"];

const STEPS: [string, string, string][] = [
  ["queue/KO-3201", "Problem Tank", "Why KO-3201 is reviewed first"],
  ["investigation/KO-3201", "Window to act", "Symptoms, ranked causes, cheapest check"],
  ["actions/KO-3201", "Actions", "Closure blocked without the right evidence"],
  ["actions/KO-3201", "Follow-through", "Did the fix work? Sister assets KO-3202/3203"],
  ["business/KO-3201", "Business case", "Break-even under stated assumptions"],
];

export default function DemoPath({ role }: { role?: RoleId }) {
  return (
    <Card className="h-full overflow-hidden" aria-labelledby="start-h">
      <CardHeader action={<p className="text-[12.5px] text-ink-3">Or press <kbd className="rounded-[5px] border border-line bg-fg/[0.04] px-1.5 py-0.5 font-mono text-[10.5px] text-ink-2">Ctrl K</kbd> to search any record</p>}>
        <CardTitle id="start-h" icon={Compass}>Start here</CardTitle>
        <CardDescription>A three-minute walkthrough of one real case.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {ROLES.map((r) => {
            const on = r.id === role;
            return (
              <li key={r.role}>
                <a href={r.href}
                  className={cn("group flex h-full items-start gap-3 rounded-xl border p-3.5 transition-[border-color,background-color,transform] duration-200 ease-out-soft hover:-translate-y-0.5",
                    on ? "border-line-hot bg-accent-soft" : "border-line bg-fg/[0.02] hover:border-line-strong hover:bg-fg/[0.04]")}>
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg border transition-colors",
                    on ? "border-line-hot bg-accent/20 text-accent-ink" : "border-line bg-fg/[0.04] text-ink-2 group-hover:text-ink-hi")}>
                    <r.icon className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[14px] font-medium text-ink-hi">{r.role}{on && <span className="rounded-full bg-accent/25 px-1.5 py-px text-[10.5px] font-medium text-accent-ink">your view</span>}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-3">{r.task}</span>
                  </span>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-ink-4 transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-ink-hi" aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-line pt-4">
          <span className="mr-1 text-[12px] font-medium text-ink-3">Three-minute walkthrough · <span className="font-mono text-ink-2">KO-3201</span></span>
          <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
            {STEPS.map(([href, title, sub], i) => (
              <li key={title} className="flex items-center gap-1">
                {i > 0 && <span className="h-px w-3 bg-line-strong" aria-hidden="true" />}
                <a href={`#/${href}`} title={sub} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-fg/[0.02] pl-1 pr-2.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-line-hot hover:bg-accent-soft hover:text-ink-hi">
                  <span className="grid size-5 place-items-center rounded-full bg-fg/[0.08] text-[10.5px] font-semibold tabular-nums text-ink-hi">{i + 1}</span>{title}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
