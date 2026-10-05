import { describe, expect, it } from "vitest";
import { verifyQuotes } from "./rcaClaims.js";

const slides = [["ROOT CAUSE ANALYSIS"], ["P3", "Lube-oil supply pressure low", "G", "Header pressure 1.8 barg — within normal band."]];
describe("verifyQuotes", () => {
  it("keeps claims whose quote appears on the cited slide and drops the rest", () => {
    const { kept, dropped } = verifyQuotes([
      { slide: 2, quote: "Header pressure 1.8 barg" },
      { slide: 2, quote: "Header pressure 2.4 barg" },
      { slide: 9, quote: "anything" },
    ], slides);
    expect(kept).toHaveLength(1);
    expect(dropped.map((d) => d.reason)).toEqual(["quote not found on slide 2", "slide 9 does not exist"]);
  });
});
