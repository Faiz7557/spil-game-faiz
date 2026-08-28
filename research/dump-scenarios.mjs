/**
 * Dumps the raw demand of a seed range to CSV, so the upper-bound solver in
 * analysis/upper_bound.py can work on exactly the same scenarios the agents
 * faced. No agent is involved here - this is a property of the scenario only.
 *
 *   node research/dump-scenarios.mjs [nSeeds] [--split test|val|train]
 *
 * One row per ORDER (not per container). `hops` is the number of port-calls the
 * cargo occupies a slot for, which is what the capacity constraint needs.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateOrders, rngForPortCall } from '../server/utils/gameEngine.js';
import { CONFIG, NOMINAL_SCENARIO, hopsBetween } from './src/circuit.mjs';

const SPLITS = { train: 0, val: 200_000, test: 300_000 };
const N = Number(process.argv[2] || 300);
const splitArg = process.argv.indexOf('--split');
const split = splitArg > 0 ? process.argv[splitArg + 1] : 'test';
const base = SPLITS[split];
if (base === undefined) throw new Error('unknown split: ' + split);

const here = dirname(fileURLToPath(import.meta.url));
const { ports, horizonWeeks } = CONFIG;

const rows = ['seed,week,port,order_id,customer_type,container_type,destination,quantity,tariff,hops'];

for (let i = 0; i < N; i++) {
  const seed = base + i;
  for (let week = 1; week <= horizonWeeks; week++) {
    const port = ports[(week - 1) % ports.length];
    const orders = generateOrders(
      port, week, ports, rngForPortCall(seed, week, port), NOMINAL_SCENARIO);
    for (const o of orders) {
      rows.push([
        seed, week, port, o.id, o.customerType, o.containerType,
        o.destination, o.quantity, o.tariff,
        hopsBetween(ports, port, o.destination)
      ].join(','));
    }
  }
}

const outDir = join(here, 'results');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'scenarios_' + split + '.csv');
writeFileSync(outFile, rows.join('\n'));
console.log('wrote ' + (rows.length - 1) + ' orders for ' + N + ' seeds (' + split +
            ' split) -> research/results/scenarios_' + split + '.csv');
console.log('next: cd research/analysis && python upper_bound.py');
