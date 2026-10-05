import { useState } from "react";
import { LoaderCircle, Sparkles, TriangleAlert, Upload } from "lucide-react";
import { EVIDENCE_KIND_LABEL, type EvidenceKind, type SimAction } from "../domain/actionTransitions";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { errorText } from "../lib/live";
import { Note } from "./ui";
import { cn } from "@/lib/utils";

const TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
interface Reading { summary: string; suggestedKind: EvidenceKind; warnings: string[] }

/** Upload the real proof; the model reads it and pre-classifies it. Advisory only: the rule and the reviewer decide. */
export default function EvidenceUpload({ action, onDone }: { action: SimAction; onDone: () => void }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "reading" | "done" | "error">("idle");
  const [result, setResult] = useState<Reading | null>(null);
  const [error, setError] = useState("");
  const working = status === "uploading" || status === "reading";
  const onFile = async (f: File) => {
    setResult(null); setError("");
    if (!TYPES.includes(f.type)) { setError("Upload a PDF, PNG, JPEG or WebP file."); setStatus("error"); return; }
    if (f.size > 15 * 1024 * 1024) { setError("Files up to 15 MB."); setStatus("error"); return; }
    try {
      setStatus("uploading");
      const u = await api<{ path: string; token: string }>("/api/evidence/upload-url", { body: { actionId: action.id, fileName: f.name, contentType: f.type } });
      const { error: upErr } = await supabase!.storage.from("evidence").uploadToSignedUrl(u.path, u.token, f, { contentType: f.type });
      if (upErr) throw upErr;
      setStatus("reading");
      const r = await api<Reading>("/api/evidence/check", { body: { actionId: action.id, path: u.path, label: f.name } });
      setResult(r); setStatus("done"); onDone();
    } catch (e) { setError(errorText(e, "Upload failed.")); setStatus("error"); }
  };
  return (
    <div className="tw mt-2.5 flex flex-col gap-2.5">
      <label className={cn("btn sm upload-btn focus-within:ring-2 focus-within:ring-ring", working && "busy")} aria-disabled={working} aria-busy={working}>
        {working ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Upload aria-hidden="true" />}
        {status === "uploading" ? "Uploading…" : status === "reading" ? "Reading the document…" : "Upload evidence file (PDF or photo)"}
        <input type="file" className="sr-only" accept={TYPES.join(",")} disabled={working}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onFile(f); }} />
      </label>
      {status === "idle" && <span className="text-[12px] text-ink-3">PDF, PNG, JPEG or WebP, up to 15 MB. The model pre-classifies it; the reviewer decides.</span>}
      {status === "error" && <Note tone="danger">{error}</Note>}
      {result && (
        <div className="rounded-xl border border-[rgb(var(--ai-rgb)/0.32)] bg-ai-soft px-3.5 py-3 text-[13px] leading-relaxed text-ink-2" role="status">
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-ai" aria-hidden="true" />
            <div className="min-w-0">
              <b className="font-semibold text-ink">AI reading:</b> {result.summary} Classified as <b className="font-semibold text-ink">{EVIDENCE_KIND_LABEL[result.suggestedKind]}</b>.
              {result.warnings.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {result.warnings.map((w) => (
                    <li key={w} className="flex gap-1.5 text-caution-ink"><TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-caution" aria-hidden="true" />{w}</li>
                  ))}
                </ul>
              )}
              <div className="mt-1.5 text-[12px] text-ink-3">Advisory only. If the classification is wrong, remove the item and attach it with the manual selector; both steps stay in the review log.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
