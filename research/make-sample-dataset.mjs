/**
 * Builds the SAMPLE SCENARIO DATASET shipped with the thesis.
 *
 *   node research/make-sample-dataset.mjs
 *   -> research/data/sample_scenario_dataset.csv
 *
 * WHAT THIS FILE IS. Bab 3 distinguishes four data objects. This is the second
 * one - the scenario dataset: the sales-call demand every agent faces. It is the
 * object the validation protocol actually validates (V1 content, V3
 * distributional, V4 discriminative, V5 sensitivity). It contains NO agent
 * output; results are a separate, derived object written by run-pilot.mjs.
 *
 * Keeping the two apart matters. Demand is a property of the SCENARIO, never of
 * the agent - that is precisely what makes the randomized complete block design
 * valid, and a file that mixed them would quietly undermine the claim.
 *
 * WHY A SCRIPT AND NOT A HAND-MADE FILE. A dataset nobody can regenerate is not
 * reproducible, whatever it says in the method chapter. Every row here is a pure
 * function of (seed, week, port, scenario parameters); delete the CSV and this
 * script rebuilds it byte for byte. The FNV-1a digest printed at the end pins
 * that claim down.
 *
 * Digest of the current file: 0xea8c6d35 over 6149 order rows. Regenerating with
 * unchanged parameters must reproduce it; if it moves, either the generator or a
 * scenario parameter changed, and every seed recorded earlier is void.
 *
 * The sample covers both experiments:
 *   - "utama"        the main experiment's operating point, TEST split, 30 seeds
 *   - "sensitivitas" all 24 factorial strata, SENS split, 3 seeds each
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateOrders, rngForPortCall } from '../server/utils/gameEngine.js';
import {
  CONFIG, NOMINAL_SCENARIO, hopsBetween, rollPenalty, rhoFor
} from './src/circuit.mjs';
import { allStrata } from './src/strata.mjs';

const TEST_BASE = 300_000;
const SENS_BASE = 310_000;
const MAIN_SEEDS = 30;
const STRATUM_SEEDS = 3;

const here = dirname(fileURLToPath(import.meta.url));
const { ports, horizonWeeks } = CONFIG;

const COLUMNS = [
  // --- experimental design -------------------------------------------------
  'experiment', 'stratum', 'split', 'rho', 'sigma', 'kappa', 'intensity',
  'seed', 'week', 'port',
  // --- the order as the agent sees it --------------------------------------
  'order_id', 'order_index', 'customer_name', 'customer_type',
  'container_type', 'destination', 'quantity', 'tariff_idr',
  // --- derived, deterministic functions of the columns above ---------------
  'hops', 'revenue_if_carried_idr', 'penalty_if_rolled_idr',
  'penalty_if_declined_idr', 'tariff_per_port_call_idr'
];

/** CSV-escapes a value: customer names contain no commas today, but may. */
const cell = (v) => {
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

const rows = [COLUMNS.join(',')];
let orderCount = 0;
const portCalls = new Set();

/** Emits every order of one (seed, scenario) episode's decision horizon. */
const emitEpisode = ({ experiment, stratum, split, rho, sigma, kappa, scenario, seed }) => {
  for (let week = 1; week <= horizonWeeks; week++) {
    const port = ports[(week - 1) % ports.length];
    portCalls.add(experiment + '|' + stratum + '|' + seed + '|' + week);

    // Exactly the call the harness makes. Same seed, same orders - the sample
    // is not a re-simulation, it IS the demand the agents were scored against.
    const orders = generateOrders(
      port, week, ports, rngForPortCall(seed, week, port), scenario);

    orders.forEach((o, i) => {
      const committed = o.customerType === 'Committed';
      const hops = hopsBetween(ports, port, o.destination);
      const perUnit = rollPenalty(committed, o.containerType);
      orderCount++;
      rows.push([
        experiment, stratum, split,
        rho.toFixed(4), sigma.toFixed(2), kappa.toFixed(2),
        scenario.intensity.toFixed(4),
        seed, week, port,
        o.id, i, o.customerName, o.customerType,
        o.containerType, o.destination, o.quantity, o.tariff,
        hops,
        o.tariff * o.quantity,
        perUnit * o.quantity,
        committed ? perUnit * o.quantity : 0,
        Math.round(o.tariff / hops)
      ].map(cell).join(','));
    });
  }
};

// --- part A: the main experiment's operating point ---------------------------
// This is the shipped game's own setting (intensity 1.0), which puts rho at
// 0.8889 rather than at the 0.90 level used by the factorial. The two are close
// but NOT identical, and the file reports each one's true rho rather than
// rounding them together.
for (let i = 0; i < MAIN_SEEDS; i++) {
  emitEpisode({
    experiment: 'utama',
    stratum: 'nominal_game',
    split: 'TEST',
    rho: rhoFor(NOMINAL_SCENARIO),
    sigma: NOMINAL_SCENARIO.reeferShare,
    kappa: NOMINAL_SCENARIO.committedShare,
    scenario: NOMINAL_SCENARIO,
    seed: TEST_BASE + i
  });
}

// --- part B: the full factorial ---------------------------------------------
for (const st of allStrata()) {
  for (let i = 0; i < STRATUM_SEEDS; i++) {
    emitEpisode({
      experiment: 'sensitivitas',
      stratum: st.id,
      split: 'SENS',
      rho: st.rho,
      sigma: st.sigma,
      kappa: st.kappa,
      scenario: st.scenario,
      seed: SENS_BASE + i
    });
  }
}

const body = rows.join('\n');
const outDir = join(here, 'data');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'sample_scenario_dataset.csv');
writeFileSync(outFile, body);

// FNV-1a over the whole file: regenerating must reproduce this exactly.
let h = 0x811c9dc5;
for (let i = 0; i < body.length; i++) {
  h ^= body.charCodeAt(i);
  h = Math.imul(h, 0x01000193);
}

const containers = rows.slice(1)
  .reduce((n, r) => n + Number(r.split(',')[16]), 0);

console.log('SAMPLE SCENARIO DATASET');
console.log('-'.repeat(64));
console.log('rows (orders)      ' + orderCount);
console.log('port-calls         ' + portCalls.size);
console.log('containers offered ' + containers);
console.log('episodes           ' + (MAIN_SEEDS + allStrata().length * STRATUM_SEEDS));
console.log('  utama            ' + MAIN_SEEDS + ' seeds x 1 stratum');
console.log('  sensitivitas     ' + STRATUM_SEEDS + ' seeds x ' + allStrata().length + ' strata');
console.log('columns            ' + COLUMNS.length);
console.log('FNV-1a digest      0x' + (h >>> 0).toString(16).padStart(8, '0'));
console.log('\nwrote research/data/sample_scenario_dataset.csv');
