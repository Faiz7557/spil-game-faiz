import { describe, expect, it } from "vitest";
import { addUsage, estimateCostUsd, ZERO } from "./runLog.js";

describe("estimateCostUsd (gpt-6.1-sol: $2 in, $0.10 cached, $10 out per MTok)", () => {
  it("prices uncached input, output and cache reads separately", () => {
    expect(estimateCostUsd({ input_tokens: 1_000_000, output_tokens: 0, cache_read_input_tokens: 0 }, "gpt-6.1-sol")).toBeCloseTo(2);
    expect(estimateCostUsd({ input_tokens: 0, output_tokens: 1_000_000, cache_read_input_tokens: 0 }, "gpt-6.1-sol")).toBeCloseTo(10);
    expect(estimateCostUsd({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1_000_000 }, "gpt-6.1-sol")).toBeCloseTo(0.1);
  });
  it("prices the light model and never logs an unknown model as free", () => {
    expect(estimateCostUsd({ input_tokens: 1_000_000, output_tokens: 1_000_000 }, "gpt-6-luna")).toBeCloseTo(0.6);
    expect(estimateCostUsd({ input_tokens: 1_000_000, output_tokens: 0 }, "some-future-model")).toBeGreaterThan(0);
  });
  it("sums usage across agent turns", () => {
    const u = addUsage(addUsage(ZERO, { input_tokens: 10, output_tokens: 5 }), { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 7 });
    expect(u).toEqual({ input_tokens: 11, output_tokens: 6, cache_read_input_tokens: 7, cache_creation_input_tokens: 0 });
  });
});
