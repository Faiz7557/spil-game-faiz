/**
 * Pilot runner — executes the V3 and V4 checks from the thesis method chapter
 * and writes a long-format CSV for the statistical pipeline.
 *
 *   node research/run-pilot.mjs [nSeeds]
 *
 * V3 (distributional validity)  — characterises the generated demand and tests
 *     the Little's-law capacity estimate against measurement.
 * V4 (discriminative validity)  — shows the scenario set can actually separate
 *     agents. If it cannot, the dataset is useless no matter how good the agents.
 *
 * Seeds come from the TEST split (see README). Nothing here may ever be used to
 * train an agent.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CONFIG, CAPACITY, runEpisode } from './src/circuit.mjs';
import { AGENTS, DEFAULT_LINEUP } from './src/agents.mjs';

const SPLITS = { train: 0, val: 200_000, test: 300_000 };
const N = Number(process.argv[2] || 300);
const here = dirname(fileURLToPath(import.meta.url));

const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const median = a => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const jt = v => (v / 1e6).toFixed(1);

const demand = {
  portCalls: 0, orders: 0, containers: 0, reefer: 0, committed: 0,
  ordersPerCall: [], dwell: [], tariffs: []
};

const results = {};
for (const key of DEFAULT_LINEUP) results[key] = [];

for (let i = 0; i < N; i++) {
  const seed = SPLITS.test + i;
  for (const key of DEFAULT_LINEUP) {
    // Demand statistics are a property of the scenario, so collect them once.
    results[key].push(runEpisode(AGENTS[key], seed, key === DEFAULT_LINEUP[0] ? demand : null));
  }
}

// ---------------------------------------------------------------- V3 --------
const lambda = demand.containers / demand.portCalls;
const dwell = mean(demand.dwell);
const reeferShare = demand.reefer / demand.containers;
const committedShare = demand.committed / demand.containers;
const reeferSlots = CAPACITY - 24;

console.log(`\nV3  DEMAND CHARACTERISATION — ${N} seeds x ${CONFIG.horizonWeeks} weeks = ${demand.portCalls} port-calls`);
console.log('-'.repeat(78));
console.log(`orders per port-call      ${mean(demand.ordersPerCall).toFixed(2)}`);
console.log(`containers per port-call  ${lambda.toFixed(2)}   (lambda)`);
console.log(`mean dwell                ${dwell.toFixed(3)} hops   (W)`);
console.log(`REEFER share              ${(reeferShare * 100).toFixed(1)}%`);
console.log(`Committed share           ${(committedShare * 100).toFixed(1)}%`);
console.log(`mean tariff               Rp ${jt(mean(demand.tariffs))} jt`);
console.log(`\nLittle's law  N = lambda x W:`);
console.log(`  all cargo        ${(lambda * dwell).toFixed(2)} of ${CAPACITY} slots   rho       = ${(lambda * dwell / CAPACITY).toFixed(3)}`);
console.log(`  REEFER only      ${(lambda * reeferShare * dwell).toFixed(2)} of ${reeferSlots} slots   rho_reefer = ${(lambda * reeferShare * dwell / reeferSlots).toFixed(3)}`);
console.log(`  committed only   ${(lambda * committedShare * dwell).toFixed(2)} of ${CAPACITY} slots   rho_comm   = ${(lambda * committedShare * dwell / CAPACITY).toFixed(3)}`);

// ---------------------------------------------------------------- V4 --------
console.log(`\nV4  DISCRIMINATIVE VALIDITY — revenue recognised on ${CONFIG.revenueRecognition}`);
console.log('-'.repeat(103));
console.log('agent                med cash   mean cash        sd   restow  rolled  reefRoll%   util%  accept%');
const ranked = DEFAULT_LINEUP
  .map(k => ({ k, med: median(results[k].map(r => r.cash)) }))
  .sort((a, b) => b.med - a.med);

for (const { k } of ranked) {
  const rs = results[k];
  const cash = rs.map(r => r.cash);
  const mu = mean(cash);
  const sd = Math.sqrt(mean(cash.map(v => (v - mu) ** 2)));
  console.log(
    k.padEnd(20) +
    jt(median(cash)).padStart(9) + jt(mu).padStart(12) + jt(sd).padStart(10) +
    mean(rs.map(r => r.restowContainers)).toFixed(1).padStart(9) +
    mean(rs.map(r => r.rolled)).toFixed(1).padStart(8) +
    (mean(rs.map(r => r.reeferRolled)) / mean(rs.map(r => r.reeferOffered)) * 100).toFixed(1).padStart(11) +
    (mean(rs.map(r => r.meanUtilisation)) * 100).toFixed(1).padStart(8) +
    (mean(rs.map(r => r.accepted)) / mean(rs.map(r => r.offered)) * 100).toFixed(1).padStart(9)
  );
}

const violations = Object.values(results).flat().reduce((n, r) => n + r.physicsViolations, 0);
console.log(`\nphysics violations: ${violations}` + (violations ? '   <-- INVESTIGATE' : '   (engine sound)'));

// ---------------------------------------------------------------- CSV -------
const outDir = join(here, 'results');
mkdirSync(outDir, { recursive: true });
const header = 'seed,agent,cash,revenue,revenue_load,revenue_discharge,restow,rolled,' +
               'restow_penalty,rolling_penalty,utilisation,accepted,loaded,offered';
const rows = [header];
for (const key of DEFAULT_LINEUP) {
  for (const r of results[key]) {
    rows.push([
      r.seed, r.agent, r.cash, r.revenue, r.revenueLoad, r.revenueDischarge,
      r.restowContainers, r.rolled, r.restowPenalty, r.rollingPenalty,
      r.meanUtilisation.toFixed(6), r.accepted, r.loaded, r.offered
    ].join(','));
  }
}
const outFile = join(outDir, 'pilot_results.csv');
writeFileSync(outFile, rows.join('\n'));
console.log(`\nwrote ${rows.length - 1} rows -> research/results/pilot_results.csv`);
console.log('next: cd research/analysis && python stats.py\n');
