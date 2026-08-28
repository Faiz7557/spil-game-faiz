/**
 * V5 - sensitivity experiment over the full factorial design.
 *
 *   node research/run-sensitivity.mjs [seedsPerCell] [--all]
 *
 * 24 strata (rho x sigma x kappa, see src/strata.mjs) x seedsPerCell blocks.
 * Within a cell the design is still a randomized complete block: every agent
 * sees byte-identical demand for a given (stratum, seed).
 *
 * The question V5 answers is NOT "who wins" - the main experiment answers that.
 * It is "does the ranking hold up when the operating regime moves?". An agent
 * that is first at rho = 0.9 and fourth at rho = 1.05 has not been shown to be
 * better; it has been shown to be better AT ONE OPERATING POINT, which is a far
 * weaker claim and must be reported as such.
 *
 * Seeds start at SENS_BASE, disjoint from the main experiment's 300_000.. range
 * so the two experiments never share a scenario.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runEpisode } from './src/circuit.mjs';
import { AGENTS, PLAN_LINEUP, DEFAULT_LINEUP, isStochastic } from './src/agents.mjs';
import { allStrata } from './src/strata.mjs';

const SENS_BASE = 310_000;
// 100, not 50. The a priori rule in Bab 3 is "Nemenyi CD < 0.5 rank units";
// for k = 4 that needs n >= 88 per cell (CD = 2.569*sqrt(20/(6n))). Running V5
// at 50 seeds would give CD = 0.663 and quietly break the sample-size rule the
// main experiment is justified by.
const SEEDS = Number(process.argv[2] || 100);
const lineup = process.argv.includes('--all') ? DEFAULT_LINEUP : PLAN_LINEUP;
const repArg = process.argv.indexOf('--repeats');
// Same repetition policy as the main experiment (ASUMSI.md A-15): a stochastic
// agent's cell value is the mean over R independent runs on identical demand.
const REPEATS = repArg > 0 ? Number(process.argv[repArg + 1]) : 5;
const here = dirname(fileURLToPath(import.meta.url));

const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const median = a => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const jt = v => (v / 1e6).toFixed(0);

const strata = allStrata();
console.log('V5  SENSITIVITY - ' + strata.length + ' strata x ' + SEEDS +
            ' seeds x ' + lineup.length + ' agents, R = ' + REPEATS +
            ' for stochastic agents');
console.log('-'.repeat(112));
console.log('stratum                rho  rhoREEF  ' +
            lineup.map(k => k.slice(0, 9).padStart(10)).join('') + '   winner');

const rows = ['stratum,rho,sigma,kappa,rho_reefer,seed,agent,plan,cash,revenue,restow,rolled,' +
              'utilisation,accepted,loaded,offered,mean_decision_ms'];

const t0 = Date.now();
const rankTally = {};
for (const key of lineup) rankTally[key] = [];

for (const st of strata) {
  const cellResults = {};
  for (const key of lineup) cellResults[key] = [];

  for (let i = 0; i < SEEDS; i++) {
    const seed = SENS_BASE + i;
    for (const key of lineup) {
      const reps = isStochastic(key) ? REPEATS : 1;
      const runs = [];
      for (let rep = 0; rep < reps; rep++) {
        runs.push(runEpisode(AGENTS[key], seed, { scenario: st.scenario, replicate: rep }));
      }
      const r = {
        cash: mean(runs.map(x => x.cash)),
        revenue: mean(runs.map(x => x.revenue)),
        restowContainers: mean(runs.map(x => x.restowContainers)),
        rolled: mean(runs.map(x => x.rolled)),
        meanUtilisation: mean(runs.map(x => x.meanUtilisation)),
        accepted: mean(runs.map(x => x.accepted)),
        loaded: mean(runs.map(x => x.loaded)),
        offered: runs[0].offered,
        meanDecisionMs: mean(runs.map(x => x.meanDecisionMs))
      };
      cellResults[key].push(r);
      rows.push([
        st.id, st.rho, st.sigma, st.kappa, st.rhoReefer.toFixed(4),
        seed, key, AGENTS[key].plan || '-',
        r.cash.toFixed(0), r.revenue.toFixed(0),
        r.restowContainers.toFixed(3), r.rolled.toFixed(3),
        r.meanUtilisation.toFixed(6), r.accepted.toFixed(3), r.loaded.toFixed(3), r.offered,
        r.meanDecisionMs.toFixed(4)
      ].join(','));
    }
  }

  const medians = lineup.map(k => ({ k, v: median(cellResults[k].map(r => r.cash)) }));
  const winner = medians.reduce((a, b) => (b.v > a.v ? b : a));
  const orderDesc = [...medians].sort((a, b) => b.v - a.v);
  orderDesc.forEach((m, idx) => rankTally[m.k].push(idx + 1));

  console.log(
    st.id.padEnd(20) + (st.isNominal ? '*' : ' ') +
    st.rho.toFixed(2).padStart(6) + st.rhoReefer.toFixed(2).padStart(9) + '  ' +
    medians.map(m => jt(m.v).padStart(10)).join('') +
    '   ' + winner.k);
}

console.log('\nrank across the ' + strata.length + ' strata (1 = best median cash)');
console.log('-'.repeat(72));
console.log('agent                 mean rank   best   worst   times 1st');
for (const key of lineup) {
  const rs = rankTally[key];
  console.log(
    key.padEnd(20) + mean(rs).toFixed(2).padStart(11) +
    Math.min(...rs).toString().padStart(7) +
    Math.max(...rs).toString().padStart(8) +
    rs.filter(r => r === 1).length.toString().padStart(12));
}
console.log('\n* = nominal cell, identical settings to the main experiment.');
console.log('An agent whose best and worst stratum-rank differ is regime-dependent;');
console.log('say so in Bab 4 rather than reporting the nominal cell alone.');

const outDir = join(here, 'results');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'sensitivity_results.csv');
writeFileSync(outFile, rows.join('\n'));
console.log('\nwrote ' + (rows.length - 1) + ' rows -> research/results/sensitivity_results.csv' +
            '   (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
