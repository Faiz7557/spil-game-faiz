/**
 * Pilot runner - executes the environment checks from the thesis method chapter
 * and writes a long-format CSV for the statistical pipeline.
 *
 *   node research/run-pilot.mjs [nSeeds] [--repeats R]
 *
 * V3 (distributional validity) - characterises the generated demand and tests
 *     the Little's-law capacity estimate against measurement.
 * V4 (discriminative validity) - shows the scenario set can actually separate
 *     agents. If it cannot, the dataset is useless no matter how good the agents.
 * V6 (horizon-edge neutrality)  - measures how much of an agent's result came
 *     from gaming the end of the horizon, by re-running with the drain removed.
 *
 * REPETITIONS. A1, A4 and the BALANCED reference draw from their own random
 * stream, so a single run per seed confounds algorithm variance with scenario
 * variance. Each stochastic agent is therefore run R independent times per seed
 * - same demand, different agent stream - and the CELL VALUE entering the
 * blocked design is the mean over those R runs. The within-seed spread is
 * reported separately as `cash_sd_within`; that is the algorithm's own noise,
 * and it is a different quantity from the between-seed spread stats.py reports.
 * Deterministic agents are run once: replicating them only burns CPU.
 *
 * Seeds come from the TEST split (see README). Nothing here may ever be used to
 * train an agent.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  CONFIG, CAPACITY, REEFER_CAPACITY, runEpisode,
  NOMINAL_SCENARIO, rhoFor, rhoReeferFor
} from './src/circuit.mjs';
import { AGENTS, DEFAULT_LINEUP, PLAN_LINEUP, isStochastic } from './src/agents.mjs';

const SPLITS = { train: 0, val: 200_000, test: 300_000 };
const N = Number(process.argv[2] || 300);
const repArg = process.argv.indexOf('--repeats');
const REPEATS = repArg > 0 ? Number(process.argv[repArg + 1]) : 5;
const here = dirname(fileURLToPath(import.meta.url));

const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const median = a => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))); };
const jt = v => (v / 1e6).toFixed(1);

// Studentised range / sqrt(2) at alpha = 0.05, infinite df - same table as stats.py
const Q05 = { 2: 1.960, 3: 2.343, 4: 2.569, 5: 2.728, 6: 2.850, 7: 2.949, 8: 3.031 };
const nemenyiCD = (k, n) => Q05[k] * Math.sqrt(k * (k + 1) / (6 * n));

const AVERAGED = [
  'cash', 'revenue', 'revenueLoad', 'revenueDischarge', 'revenueDrain',
  'restowContainers', 'rolled', 'restowPenalty', 'restowPenaltyDrain',
  'rollingPenalty', 'meanUtilisation', 'accepted', 'loaded', 'offered',
  'reeferOffered', 'reeferRolled', 'aboardAtHorizon', 'valueAboardAtHorizon',
  'decisionMs', 'meanDecisionMs'
];

/** Runs one (agent, seed) cell and collapses its replicates into one record. */
const runCell = (key, seed, demand) => {
  const reps = isStochastic(key) ? REPEATS : 1;
  const runs = [];
  for (let r = 0; r < reps; r++) {
    runs.push(runEpisode(AGENTS[key], seed, {
      // Demand statistics are a property of the scenario, so collect them once.
      demand: (demand && r === 0) ? demand : null,
      scenario: NOMINAL_SCENARIO,
      replicate: r
    }));
  }
  const cell = { agent: key, seed, replicates: reps };
  for (const f of AVERAGED) cell[f] = mean(runs.map(x => x[f]));
  cell.decisionMsMax = Math.max(...runs.map(x => x.decisionMsMax));
  cell.physicsViolations = runs.reduce((n, x) => n + x.physicsViolations, 0);
  cell.cashSdWithin = reps > 1 ? sd(runs.map(x => x.cash)) : 0;
  return cell;
};

const demand = {
  portCalls: 0, orders: 0, containers: 0, reefer: 0, committed: 0,
  ordersPerCall: [], dwell: [], tariffs: []
};

const results = {};
for (const key of DEFAULT_LINEUP) results[key] = [];

const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const seed = SPLITS.test + i;
  for (const key of DEFAULT_LINEUP) {
    results[key].push(runCell(key, seed, key === DEFAULT_LINEUP[0] ? demand : null));
  }
}
const wallSeconds = (Date.now() - t0) / 1000;

// ---------------------------------------------------------------- V3 --------
const lambda = demand.containers / demand.portCalls;
const dwell = mean(demand.dwell);
const reeferShare = demand.reefer / demand.containers;
const committedShare = demand.committed / demand.containers;

console.log('\nV3  DEMAND CHARACTERISATION - ' + N + ' seeds x ' + CONFIG.horizonWeeks +
            ' decision weeks (+' + CONFIG.drainWeeks + ' drain) = ' + demand.portCalls + ' port-calls');
console.log('-'.repeat(78));
console.log('orders per port-call      ' + mean(demand.ordersPerCall).toFixed(2));
console.log('containers per port-call  ' + lambda.toFixed(2) + '   (lambda)');
console.log('mean dwell                ' + dwell.toFixed(3) + ' hops   (W)');
console.log('REEFER share              ' + (reeferShare * 100).toFixed(1) + '%');
console.log('Committed share           ' + (committedShare * 100).toFixed(1) + '%');
console.log('mean tariff               Rp ' + jt(mean(demand.tariffs)) + ' jt');
console.log('\nLittle\'s law  N = lambda x W        measured / analytic:');
console.log('  all cargo        ' + (lambda * dwell).toFixed(2) + ' of ' + CAPACITY +
            ' slots   rho        = ' + (lambda * dwell / CAPACITY).toFixed(3) +
            '   (analytic ' + rhoFor(NOMINAL_SCENARIO).toFixed(3) + ')');
console.log('  REEFER only      ' + (lambda * reeferShare * dwell).toFixed(2) + ' of ' + REEFER_CAPACITY +
            ' slots   rho_reefer = ' + (lambda * reeferShare * dwell / REEFER_CAPACITY).toFixed(3) +
            '   (analytic ' + rhoReeferFor(NOMINAL_SCENARIO).toFixed(3) + ')');
console.log('  committed only   ' + (lambda * committedShare * dwell).toFixed(2) + ' of ' + CAPACITY +
            ' slots   rho_comm   = ' + (lambda * committedShare * dwell / CAPACITY).toFixed(3));

// ---------------------------------------------------------------- V4 --------
console.log('\nV4  DISCRIMINATIVE VALIDITY - revenue on ' + CONFIG.revenueRecognition +
            ', drain = ' + CONFIG.drainWeeks + ' wk, R = ' + REPEATS + ' for stochastic agents');
console.log('-'.repeat(128));
console.log('agent                plan   med cash   mean cash    sd(seed)  sd(algo)   restow  rolled  reefRoll%   util%  accept%   ms/call');
const ranked = DEFAULT_LINEUP
  .map(k => ({ k, med: median(results[k].map(r => r.cash)) }))
  .sort((a, b) => b.med - a.med);

for (const { k } of ranked) {
  const rs = results[k];
  const cash = rs.map(r => r.cash);
  console.log(
    k.padEnd(20) +
    (AGENTS[k].plan || '-').padEnd(6) +
    jt(median(cash)).padStart(9) + jt(mean(cash)).padStart(12) +
    jt(sd(cash)).padStart(12) +
    jt(mean(rs.map(r => r.cashSdWithin))).padStart(10) +
    mean(rs.map(r => r.restowContainers)).toFixed(1).padStart(9) +
    mean(rs.map(r => r.rolled)).toFixed(1).padStart(8) +
    (mean(rs.map(r => r.reeferRolled)) / mean(rs.map(r => r.reeferOffered)) * 100).toFixed(1).padStart(11) +
    (mean(rs.map(r => r.meanUtilisation)) * 100).toFixed(1).padStart(8) +
    (mean(rs.map(r => r.accepted)) / mean(rs.map(r => r.offered)) * 100).toFixed(1).padStart(9) +
    mean(rs.map(r => r.meanDecisionMs)).toFixed(3).padStart(10)
  );
}
console.log('\nsd(seed) = spread across scenarios; sd(algo) = the agent\'s own noise on a');
console.log('fixed scenario, 0 for deterministic agents. They answer different questions.');

const violations = Object.values(results).flat().reduce((n, r) => n + r.physicsViolations, 0);
console.log('\nphysics violations: ' + violations + (violations ? '   <-- INVESTIGATE' : '   (engine sound)'));

// -------------------------------------------------- a priori resolution -----
// n is fixed BEFORE looking at the data, from the width of the Nemenyi critical
// difference. The rule adopted in Bab 3: CD must stay below 0.5 rank units, so
// that two agents separated by half a rank position are reliably distinguished.
console.log('\nA PRIORI SAMPLE SIZE - Nemenyi critical difference (alpha = 0.05)');
console.log('-'.repeat(78));
console.log('   n      k=4      k=5      k=7      (target: CD < 0.500 rank units)');
for (const n of [30, 50, 88, 100, 200, 300, 500]) {
  console.log('  ' + String(n).padStart(4) +
    nemenyiCD(4, n).toFixed(3).padStart(9) +
    nemenyiCD(5, n).toFixed(3).padStart(9) +
    nemenyiCD(7, n).toFixed(3).padStart(9));
}
console.log('  -> main experiment n = 300 (k = ' + DEFAULT_LINEUP.length + ' table).');
console.log('  -> V5 needs n >= 88 per cell for the k = 4 line, hence 100 seeds per stratum.');

// ---------------------------------------------------------------- V6 --------
// How much of each agent's cash depends on the horizon edge? Re-run with the
// drain removed; a large gap means the agent was being rewarded (or punished)
// by the truncation rather than by its decisions. Replicate 0 only - this is a
// contrast between two environments, not an estimate of algorithm noise.
if (CONFIG.drainWeeks > 0) {
  const keep = CONFIG.drainWeeks;
  const M = Math.min(N, 100);
  CONFIG.drainWeeks = 0;
  const truncated = {};
  for (const key of DEFAULT_LINEUP) {
    truncated[key] = [];
    for (let i = 0; i < M; i++) {
      truncated[key].push(runEpisode(AGENTS[key], SPLITS.test + i, { scenario: NOMINAL_SCENARIO }));
    }
  }
  CONFIG.drainWeeks = keep;

  console.log('\nV6  HORIZON-EDGE NEUTRALITY - median cash with drain vs truncated at week ' +
              CONFIG.horizonWeeks + ' (first ' + M + ' seeds)');
  console.log('-'.repeat(78));
  console.log('agent                 drained   truncated       lost   aboard@H');
  for (const key of DEFAULT_LINEUP) {
    const withDrain = median(results[key].slice(0, M).map(r => r.cash));
    const without = median(truncated[key].map(r => r.cash));
    console.log(
      key.padEnd(20) + jt(withDrain).padStart(10) + jt(without).padStart(12) +
      jt(withDrain - without).padStart(11) +
      mean(truncated[key].map(r => r.aboardAtHorizon)).toFixed(1).padStart(11));
  }
  console.log('"lost" is revenue that a week-8 cut-off would have destroyed - the size of');
  console.log('the end-game distortion the drain removes. It differs per agent, which is');
  console.log('exactly why it could not be left in.');
}

// ---------------------------------------------------------------- CSV -------
const outDir = join(here, 'results');
mkdirSync(outDir, { recursive: true });
const header = [
  'seed', 'agent', 'plan', 'replicates', 'rho', 'sigma', 'kappa',
  'cash', 'cash_sd_within', 'revenue', 'revenue_load', 'revenue_discharge', 'revenue_drain',
  'restow', 'rolled', 'restow_penalty', 'restow_penalty_drain', 'rolling_penalty',
  'utilisation', 'accepted', 'loaded', 'offered',
  'aboard_at_horizon', 'value_aboard_at_horizon',
  'decision_ms', 'decision_ms_max', 'mean_decision_ms'
].join(',');

const rho = rhoFor(NOMINAL_SCENARIO);
const rows = [header];
for (const key of DEFAULT_LINEUP) {
  for (const r of results[key]) {
    rows.push([
      r.seed, r.agent, AGENTS[key].plan || '-', r.replicates,
      rho.toFixed(4), NOMINAL_SCENARIO.reeferShare, NOMINAL_SCENARIO.committedShare,
      r.cash.toFixed(0), r.cashSdWithin.toFixed(0), r.revenue.toFixed(0),
      r.revenueLoad.toFixed(0), r.revenueDischarge.toFixed(0), r.revenueDrain.toFixed(0),
      r.restowContainers.toFixed(3), r.rolled.toFixed(3),
      r.restowPenalty.toFixed(0), r.restowPenaltyDrain.toFixed(0), r.rollingPenalty.toFixed(0),
      r.meanUtilisation.toFixed(6), r.accepted.toFixed(3), r.loaded.toFixed(3), r.offered.toFixed(0),
      r.aboardAtHorizon.toFixed(3), r.valueAboardAtHorizon.toFixed(0),
      r.decisionMs.toFixed(4), r.decisionMsMax.toFixed(4), r.meanDecisionMs.toFixed(4)
    ].join(','));
  }
}
const outFile = join(outDir, 'pilot_results.csv');
writeFileSync(outFile, rows.join('\n'));
console.log('\nwrote ' + (rows.length - 1) + ' cells -> research/results/pilot_results.csv' +
            '   (' + wallSeconds.toFixed(1) + ' s)');
console.log('ranked lineup: ' + PLAN_LINEUP.join(', ') + '   references: ' +
            DEFAULT_LINEUP.filter(k => !PLAN_LINEUP.includes(k)).join(', '));
console.log('next: cd research/analysis && python stats.py\n');
