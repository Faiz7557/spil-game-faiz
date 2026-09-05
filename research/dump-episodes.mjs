/**
 * V2 fixture generator.
 *
 * Runs a fixed set of episodes in the JS harness and writes the parity-relevant
 * fields to JSON. `research/pyharness/verify_parity.py` then replays the SAME
 * cases in the Python port and asserts equality, field by field.
 *
 * The case list is written into the output rather than duplicated on the Python
 * side, so the two halves cannot drift apart: Python replays what this file
 * recorded, including the exact float value of every scenario knob.
 *
 * Timing fields are deliberately excluded - `decisionMs` measures the machine,
 * not the algorithm, and will never match across two runtimes. See
 * research/docs/ASUMSI.md, assumption A-13.
 *
 *   node research/dump-episodes.mjs
 *   node research/dump-episodes.mjs --seeds 10 --scenarios 3 --iterations 200
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { runEpisode, NOMINAL_SCENARIO } from './src/circuit.mjs';
import { AGENTS, DEFAULT_LINEUP, makeAnnealing, isStochastic } from './src/agents.mjs';
import { scenarioFor } from './src/strata.mjs';

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] !== undefined ? Number(process.argv[i + 1]) : fallback;
};
const argStr = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
};

const seedCount = arg('--seeds', 3);
const scenarioCount = arg('--scenarios', 2);
const a4Iterations = arg('--iterations', 800);
const outPath = argStr('--out', 'research/results/parity_js.json');

/** Scalar fields both implementations must agree on, exactly. */
const COMPARED_FIELDS = [
  'revenue', 'cash',
  'revenueLoad', 'revenueDischarge', 'revenueDrain',
  'restowContainers', 'restowPenalty', 'restowPenaltyDrain',
  'rolled', 'rollingPenalty',
  'offered', 'accepted', 'loaded',
  'reeferOffered', 'reeferRolled', 'committedOffered',
  'aboardAtHorizon', 'valueAboardAtHorizon',
  'physicsViolations', 'meanUtilisation'
];

/**
 * Scenarios, in order. The nominal cell is DEFAULT_SCENARIO (intensity exactly
 * 1.0); the strata cells carry an intensity that is NOT a round number, which
 * is what exercises the Math.round-vs-banker's-rounding hazard in the port.
 */
const SCENARIOS = [
  { id: 'nominal', scenario: NOMINAL_SCENARIO },
  { id: 'r0.60_s0.45_k0.25', scenario: scenarioFor({ rho: 0.60, sigma: 0.45, kappa: 0.25 }) },
  { id: 'r1.05_s0.30_k0.55', scenario: scenarioFor({ rho: 1.05, sigma: 0.30, kappa: 0.55 }) }
].slice(0, scenarioCount);

// TEST split. Any range works for a parity check - the point is that both sides
// see the same seed - but using TEST keeps the fixture in the range the final
// comparison actually reports on.
const SEEDS = Array.from({ length: seedCount }, (_, i) => 300_000 + i);

const agentFor = (name) =>
  name === 'annealing' ? makeAnnealing({ iterations: a4Iterations }) : AGENTS[name];

const cases = [];
for (const name of DEFAULT_LINEUP) {
  for (const { scenario } of SCENARIOS) {
    for (const seed of SEEDS) {
      cases.push({ agent: name, seed, replicate: 0, scenario });
      // A second replicate only means something for an agent with its own
      // random stream; for a deterministic one it would just repeat the run.
      if (isStochastic(name)) cases.push({ agent: name, seed, replicate: 1, scenario });
    }
  }
}

const results = cases.map(({ agent, seed, replicate, scenario }) => {
  const r = runEpisode(agentFor(agent), seed, { scenario, replicate });
  const record = { utilisation: r.utilisation };
  for (const f of COMPARED_FIELDS) record[f] = r[f];
  return record;
});

const payload = {
  generatedBy: 'research/dump-episodes.mjs',
  a4Iterations,
  comparedFields: COMPARED_FIELDS,
  cases,
  results
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2));

console.log(`wrote ${cases.length} episodes to ${outPath}`);
console.log(`  agents    ${DEFAULT_LINEUP.join(', ')}`);
console.log(`  seeds     ${SEEDS[0]}..${SEEDS[SEEDS.length - 1]}`);
console.log(`  scenarios ${SCENARIOS.map(s => s.id).join(', ')}`);
console.log(`  A4 budget ${a4Iterations} iterations`);
