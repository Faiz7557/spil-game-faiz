// Port of the RCA-deck extraction in pipeline/extract_case2.py (python-pptx). Parity: pptx.test.ts.
import JSZip from "jszip";
import type { Rca, RcaAction } from "../../src/domain/types.js";
import { iso } from "./xlsx.js";

const decode = (s: string) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

/** Top-level children of <p:spTree>, in document order, as raw XML. */
function topLevelShapes(xml: string): string[] {
  const start = xml.indexOf("<p:spTree");
  if (start < 0) return [];
  const tag = /<(\/?)([\w:.-]+)\b[^>]*?(\/?)>/g;
  tag.lastIndex = start;
  const out: string[] = [];
  let depth = 0, childStart = -1;
  for (let m; (m = tag.exec(xml)); ) {
    const [whole, close, , selfClose] = m;
    if (close) {
      depth--;
      if (depth === 1 && childStart >= 0) { out.push(xml.slice(childStart, m.index + whole.length)); childStart = -1; }
      if (depth === 0) break;
    } else {
      if (depth === 1) childStart = m.index;
      if (selfClose) { if (depth === 1) { out.push(whole); childStart = -1; } } else depth++;
    }
  }
  return out;
}

/** python-pptx `text_frame.text`: paragraphs joined by "\n", line breaks as "\v". */
function frameText(txBody: string): string {
  const paras = txBody.match(/<a:p>[\s\S]*?<\/a:p>|<a:p\/>/g) ?? [];
  return paras.map((p) => [...p.matchAll(/<a:t>([\s\S]*?)<\/a:t>|<a:br\b[^>]*\/>/g)].map((m) => (m[0].startsWith("<a:br") ? "\v" : decode(m[1]))).join("")).join("\n");
}

/** Port of slide_texts(): one entry per top-level shape that has a text frame with non-blank text. Tables and groups are skipped, as in python-pptx. */
export function slideTexts(xml: string): string[] {
  const out: string[] = [];
  for (const sh of topLevelShapes(xml)) {
    if (!sh.startsWith("<p:sp")  || sh.startsWith("<p:spPr")) continue;
    const body = /<p:txBody>[\s\S]*<\/p:txBody>/.exec(sh)?.[0];
    if (!body) continue;
    const text = frameText(body).trim();
    if (text) out.push(text);
  }
  return out;
}

const RC = /^[PX]\d$/;

export function parseActions(t: string[]): RcaAction[] {
  const out: RcaAction[] = []; let kind: "corrective" | "proactive" | null = null;
  for (let i = 0; i < t.length; ) {
    if (t[i] === "Corrective Action") { kind = "corrective"; i += 4; continue; }
    if (t[i] === "Pro-Active Action") { kind = "proactive"; i += 4; continue; }
    if (kind && RC.test(t[i]) && i + 4 < t.length) {
      out.push({ kind, rc: t[i], text: t[i + 1], plan_date: iso(t[i + 2])!, pic: t[i + 3], status: t[i + 4] }); i += 5; continue;
    }
    i++;
  }
  return out;
}

export function parsePreventive(t: string[]): RcaAction[] {
  const start = t.indexOf("Preventive Action"); if (start < 0) return [];
  const out: RcaAction[] = [];
  for (let i = start + 3; i + 4 < t.length && RC.test(t[i]); i += 5)
    out.push({ kind: "preventive", rc: t[i], cause: t[i + 1], text: t[i + 2], plan_date: iso(t[i + 3])!, pic: t[i + 4], status: null });
  return out;
}

function parseTable(t: string[]) {
  const out: { id: string; item: string; result: string; finding: string }[] = [];
  let i = t.includes("Evidence / Finding") ? t.indexOf("Evidence / Finding") + 1 : 0;
  while (i + 3 < t.length) {
    if (RC.test(t[i])) { out.push({ id: t[i], item: t[i + 1], result: t[i + 2], finding: t[i + 3] }); i += 4; } else i++;
  }
  return out;
}

/** `tagHint` is the equipment tag when the caller knows it (e.g. from the file name). */
export async function extractRca(buf: Buffer, sourceId: string, tagHint?: string): Promise<Rca> {
  const zip = await JSZip.loadAsync(buf);
  // Slide order comes from the presentation's slide list, which is what python-pptx iterates.
  const pres = await zip.file("ppt/presentation.xml")?.async("string") ?? "";
  const rels = await zip.file("ppt/_rels/presentation.xml.rels")?.async("string") ?? "";
  const target = new Map([...rels.matchAll(/<Relationship\b[^>]*?Id="([^"]+)"[^>]*?Target="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  const ordered = [...pres.matchAll(/<p:sldId\b[^>]*?r:id="([^"]+)"/g)].map((m) => target.get(m[1])).filter(Boolean)
    .map((t) => `ppt/${t!.replace(/^\/?ppt\//, "").replace(/^\.\.\//, "")}`);
  const names = ordered.length ? ordered : Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(/(\d+)\.xml$/.exec(a)![1]) - Number(/(\d+)\.xml$/.exec(b)![1]));
  const slides = await Promise.all(names.map(async (n) => slideTexts(await zip.file(n)!.async("string"))));
  const s1 = slides[0] ?? [], s2 = slides[1] ?? [], s3 = slides[2] ?? [];
  const tag = tagHint ?? (s1.length > 4 ? s1[4].split("|")[0].trim() : "");
  const chronology = s3.flatMap((t, k) => (/^\d{2}-[A-Za-z]{3}-\d{4}/.test(t) && k + 1 < s3.length ? [{ when: t, event: s3[k + 1] }] : []));
  const root = (slides[6] ?? []).find((t) => t.startsWith("ROOT CAUSE:"));
  return {
    source: sourceId, tag,
    title: s1.length > 3 ? s1[3] : "",
    ar: s1.find((t) => t.startsWith("AR-")) ?? "",
    problem_statement: s2.includes("PROBLEM STATEMENT") ? s2[s2.indexOf("PROBLEM STATEMENT") + 1] : "",
    chronology, past_performance: slides[3] ?? [],
    four_p: parseTable(slides[5] ?? []), four_m: parseTable(slides[6] ?? []),
    root_cause: root ? root.split(":").slice(1).join(":").trim() : "",
    actions: parseActions(slides[8] ?? []), preventive: parsePreventive(slides[9] ?? []), slides,
  };
}
