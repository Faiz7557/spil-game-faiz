// Canonical evidence refs. Every AI output cites these, so a deterministic check can resolve each one:
// L3:row5 · L3:kpi:ZCU:all · E2:hist:2026-04-29 · E2:info:<param> · P2:KO3201_VIB:2026-04-27 · R2:slide7 · EV-11 · CF-04 · PP:diag:KO-3201:w9 · FM:CO-1

export interface Ref { source: string; kind: string; key: string }

const PATTERNS: [RegExp, (m: RegExpMatchArray) => Ref][] = [
  [/^(L\d):row(\d+)$/, (m) => ({ source: m[1], kind: "row", key: m[2] })],
  [/^(L\d):kpi:(.+)$/, (m) => ({ source: m[1], kind: "kpi", key: m[2] })],
  [/^(R\d):slide(\d+)$/, (m) => ({ source: m[1], kind: "slide", key: m[2] })],
  [/^(E\d):(hist|info|summary):(.+)$/, (m) => ({ source: m[1], kind: m[2], key: m[3] })],
  [/^(P\d):([A-Z0-9_]+):(\d{4}-\d{2}-\d{2})$/, (m) => ({ source: m[1], kind: m[2], key: m[3] })],
  [/^(EV-\d+|CF-\d+|AUD-\d+)$/, (m) => ({ source: "curated", kind: m[1].startsWith("CF") ? "conflict" : "evidence", key: m[1] })],
  [/^PP:(diag|fc):(.+)$/, (m) => ({ source: "computed", kind: m[1], key: m[2] })],
  [/^FM:([A-Z]{2}-\d+)$/, (m) => ({ source: "library", kind: "failure_mode", key: m[1] })],
];

export function parseRef(ref: string): Ref | null {
  for (const [re, f] of PATTERNS) { const m = ref.match(re); if (m) return f(m); }
  return null;
}

/** The exact excerpt each tool returned in the current run. A claim may only cite refs in the ledger. */
export class Ledger {
  private map = new Map<string, string>();
  add(ref: string, excerpt: string) { if (parseRef(ref)) this.map.set(ref, excerpt); }
  resolve(ref: string): string | null { return this.map.get(ref) ?? null; }
  unknown(refs: string[]): string[] { return refs.filter((r) => !this.map.has(r)); }
  entries() { return [...this.map.entries()]; }
}
