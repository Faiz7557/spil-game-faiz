import { Check, CircleDashed, Lightbulb, TriangleAlert, X } from "lucide-react";
import type { GuardStatus } from "../lib/copilotTypes";
import { Badge, type Tone } from "@/components/ui/badge";

// Evidence Guard verdict on one model-written sentence. Label text is matched by e2e ("Supported"): keep it.
const MAP: Record<GuardStatus, { label: string; tone: Tone; cls?: string; Icon: typeof Check }> = {
  supported: { label: "Supported", tone: "ok", Icon: Check },
  partial: { label: "Partly supported", tone: "warn", Icon: TriangleAlert },
  unsupported: { label: "Unsupported", tone: "danger", Icon: X },
  not_required: { label: "Recommendation", tone: "neutral", cls: "b-proposed", Icon: Lightbulb },
  pending: { label: "Checking…", tone: "info", Icon: CircleDashed },
};

export default function GuardBadge({ status, reason }: { status: GuardStatus; reason?: string }) {
  const { label, tone, cls, Icon } = MAP[status];
  return (
    <Badge tone={tone} className={`guard align-middle ${cls ?? ""}`} title={reason || undefined}>
      <Icon className={status === "pending" ? "animate-spin motion-reduce:animate-none" : undefined} aria-hidden="true" />
      {label}
    </Badge>
  );
}
