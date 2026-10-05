import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import snapJson from "../../src/data/case2.json";
import type { Snapshot } from "../../src/domain/types";
import { extractRca } from "./pptx.js";

const snap = snapJson as unknown as Snapshot;
const DIR = "../Supporting Data/Case 2_ Intelligence Manufacturing/RCA - Downtime Data";
const decks = readdirSync(DIR).filter((f) => f.endsWith(".pptx")).sort();

describe("RCA deck extraction matches the Python output", () => {
  it.each(decks.map((f, i) => [f, i]))("%s", async (file, i) => {
    const ref = snap.rca[Number(i)];
    const r = await extractRca(readFileSync(`${DIR}/${file}`), `R${Number(i) + 1}`, ref.tag);
    expect(r.slides).toHaveLength(11);
    expect(r.slides).toEqual(ref.slides);
    expect(r.actions).toEqual(ref.actions);
    expect(r.preventive).toEqual(ref.preventive);
    expect(r.four_p).toEqual(ref.four_p);
    expect(r.chronology).toEqual(ref.chronology);
    expect(r.root_cause).toBe(ref.root_cause);
    expect(r).toEqual(ref);
  }, 60_000);
});
