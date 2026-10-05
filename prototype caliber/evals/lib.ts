import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Snapshot } from "../src/domain/types.js";

/** Evals run on the bundled, validated snapshot, so results do not depend on what is in the database. */
export const snap = JSON.parse(readFileSync("src/data/case2.json", "utf8")) as Snapshot;

export function saveRun(name: string, payload: unknown) {
  const dir = `../evaluation/runs/${new Date().toISOString().slice(0, 10)}_${name}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/result.json`, JSON.stringify(payload, null, 2));
  return dir;
}

export function requireKey() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set. Put it in prototype/.env and run with --env-file=.env.");
    process.exit(1);
  }
}
