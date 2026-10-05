// prototype/server/ai/diagnosisContext.test.ts
import { describe, expect, it } from "vitest";
import type { Snapshot } from "../../src/domain/types.js";
import { firstDiagnosableWeek } from "../../src/domain/diagnosis.js";
import { buildDiagnosisContext } from "./diagnosisContext.js";
import snapJson from "../../src/data/case2.json";

const snap = snapJson as unknown as Snapshot;

describe("buildDiagnosisContext", () => {
  for (const eq of snap.equipment) {
    it(`${eq.tag}: hides the answer and everything after the review week`, () => {
      const week = firstDiagnosableWeek(eq)!;
      const ctx = buildDiagnosisContext(snap, eq.tag, week);
      for (const s of ctx.hidden) expect(ctx.prompt.includes(s), `leaks: ${s.slice(0, 40)}`).toBe(false);
      const refs = ctx.ledger.entries().map(([r]) => r);
      expect(refs.some((r) => /^R\d:/.test(r))).toBe(false); // no RCA slides
      const cutoff = eq.history[week].date;
      for (const r of refs.filter((x) => x.includes(":hist:"))) expect(r.split(":hist:")[1] <= cutoff).toBe(true);
      expect(refs).toContain(`PP:diag:${eq.tag}:w${week + 1}`);
      expect(refs.filter((r) => r.startsWith("FM:")).length).toBeGreaterThanOrEqual(3);
      expect(ctx.prompt).not.toMatch(/TRIP/);
    });
  }
});
