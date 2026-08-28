/**
 * Automated checks for the research harness.
 *
 *   node research/verifyHarness.mjs
 *
 * `server/verifyEngine.js` tests the GAME's physics. This file tests the parts
 * the thesis adds on top: the action mask, the stowage objective, the demand
 * model, the blocked-design guarantees, and the accounting identities.
 *
 * Several of these are the "uji invarian" promised under V2 in the method
 * chapter, so they must stay green before the Python port is written - a port
 * verified against an unverified reference proves nothing.
 */
import {
  CONFIG, CAPACITY, REEFER_CAPACITY, DRY_CAPACITY, runEpisode, validSlots,
  rhoFor, rhoReeferFor, intensityForRho, NOMINAL_SCENARIO, hopsBetween,
  MEAN_ORDERS, MEAN_QUANTITY, MEAN_DWELL
} from './src/circuit.mjs';
import {
  AGENTS, DEFAULT_LINEUP, PLAN_LINEUP, legalAt, stackOverstow, stowViaGameBot,
  isStochastic
} from './src/agents.mjs';
import {
  createEmptyGrid, getBayConfig, generateOrders, rngForPortCall, createRng,
  DEFAULT_SCENARIO
} from '../server/utils/gameEngine.js';

console.log('====================================================');
console.log('   RESEARCH HARNESS CHECKS                          ');
console.log('====================================================\n');

let total = 0, passed = 0;
const failures = [];
const assert = (cond, msg) => {
  total++;
  if (cond) { passed++; console.log('[PASS] ' + msg); }
  else { failures.push(msg); console.error('[FAIL] ' + msg); }
};
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const clone = (g) => JSON.parse(JSON.stringify(g));
const BOTTOM_UP = ['02', '82', '84'];

/** A random but always LEGAL grid state, built by repeated legal placements. */
const randomGrid = (rng, fill) => {
  const grid = createEmptyGrid(CONFIG.bays);
  for (let i = 0; i < fill; i++) {
    const type = rng() < 0.5 ? 'DRY' : 'REEFER';
    const slots = validSlots(grid, { containerType: type });
    if (slots.length === 0) continue;
    const s = slots[Math.floor(rng() * slots.length)];
    grid[s.bay][s.row][s.tier] = {
      id: 'x' + i,
      containerType: type,
      destination: CONFIG.ports[1 + Math.floor(rng() * 3)],
      tariff: 10_000_000,
      customerType: 'Non-Committed'
    };
  }
  return grid;
};

// --- 1. action mask -------------------------------------------------------
// legalAt() is A4's private mirror of validSlots(). If they ever disagree, A4
// plans placements the grid refuses and silently falls back to first-fit, so
// its reported behaviour stops being the behaviour the search paid for.
console.log('--- 1: action mask, legalAt() vs validSlots() ---');
{
  const rng = createRng(20260828);
  let compared = 0, mismatches = 0;
  for (let trial = 0; trial < 400; trial++) {
    const grid = randomGrid(rng, Math.floor(rng() * 30));
    for (const bay of Object.keys(grid)) {
      const cfg = getBayConfig(bay);
      const tiers = BOTTOM_UP.filter(t => cfg.tiers.includes(t));
      const legalSet = new Set(
        validSlots(grid, { containerType: cfg.containerType })
          .filter(s => s.bay === bay)
          .map(s => s.row + '|' + s.tier));
      for (const row of cfg.rows) {
        const cells = tiers.map(t => (grid[bay][row][t] ? 1 : null));
        for (let i = 0; i < tiers.length; i++) {
          compared++;
          const mine = legalAt(cells, tiers, i);
          const theirs = legalSet.has(row + '|' + tiers[i]);
          if (mine !== theirs) mismatches++;
        }
      }
    }
  }
  assert(mismatches === 0,
    'legalAt agrees with validSlots on ' + compared + ' slot decisions');
}

// --- 2. shipped bots ------------------------------------------------------
// The README claims GREEDY and BALANCED share one stowage code path. That claim
// is load-bearing: it is why only one of them is reported as a distinct
// stowage strategy. Prove it instead of asserting it.
console.log('\n--- 2: shipped bot stowage paths ---');
{
  const rng = createRng(7);
  let identical = 0;
  const trials = 200;
  for (let t = 0; t < trials; t++) {
    const base = randomGrid(rng, Math.floor(rng() * 20));
    const cargo = [];
    for (let i = 0; i < 6 + Math.floor(rng() * 8); i++) {
      cargo.push({
        id: 'c' + i,
        containerType: rng() < 0.7 ? 'DRY' : 'REEFER',
        destination: CONFIG.ports[1 + Math.floor(rng() * 3)],
        tariff: 12_000_000,
        customerType: 'Non-Committed'
      });
    }
    const gA = clone(base), gB = clone(base);
    const leftA = stowViaGameBot(cargo.map(c => ({ ...c })), gA, 'SBY', CONFIG.ports, 'GREEDY');
    const leftB = stowViaGameBot(cargo.map(c => ({ ...c })), gB, 'SBY', CONFIG.ports, 'BALANCED');
    if (JSON.stringify(gA) === JSON.stringify(gB) && leftA.length === leftB.length) identical++;
  }
  assert(identical === trials,
    'GREEDY and BALANCED stow identically on ' + identical + '/' + trials + ' grids');

  const rng2 = createRng(11);
  let differs = 0;
  for (let t = 0; t < 200; t++) {
    const base = randomGrid(rng2, Math.floor(rng2() * 20));
    const cargo = [];
    for (let i = 0; i < 8; i++) {
      cargo.push({
        id: 'c' + i, containerType: 'DRY',
        destination: CONFIG.ports[1 + Math.floor(rng2() * 3)],
        tariff: 12_000_000, customerType: 'Non-Committed'
      });
    }
    const gA = clone(base), gB = clone(base);
    stowViaGameBot(cargo.map(c => ({ ...c })), gA, 'SBY', CONFIG.ports, 'GREEDY');
    stowViaGameBot(cargo.map(c => ({ ...c })), gB, 'SBY', CONFIG.ports, 'SMART');
    if (JSON.stringify(gA) !== JSON.stringify(gB)) differs++;
  }
  assert(differs > 0, 'SMART is a genuinely different stowage path (' + differs + '/200 grids differ)');
}

// --- 3. stowage objective -------------------------------------------------
console.log('\n--- 3: stackOverstow reference cases ---');
{
  assert(stackOverstow([null, null, null]) === 0, 'empty stack has no overstow');
  assert(stackOverstow([3, 2, 1]) === 0, 'far at the bottom, near on top: 0 pairs');
  assert(stackOverstow([1, 2, 3]) === 3, 'near at the bottom, far on top: 3 pairs');
  assert(stackOverstow([1, 3, 2]) === 2, 'one early box under two later boxes: 2 pairs');
  assert(stackOverstow([2, 2, 2]) === 0, 'equal discharge order never blocks');
  assert(stackOverstow([2, null, 1]) === 0, 'gap ignored, later box below earlier box: 0');
  assert(stackOverstow([1, null, 2]) === 1, 'gap ignored, earlier box below later box: 1');
}

// --- 4. demand model ------------------------------------------------------
console.log('\n--- 4: analytical demand model ---');
{
  assert(CAPACITY === 36, 'capacity is 36 slots');
  assert(REEFER_CAPACITY === 12 && DRY_CAPACITY === 24, 'split is 12 REEFER / 24 DRY');
  assert(near(MEAN_ORDERS * MEAN_QUANTITY * MEAN_DWELL / CAPACITY, rhoFor(NOMINAL_SCENARIO)),
    'rhoFor matches lambda*W/N by construction');
  assert(near(rhoReeferFor(NOMINAL_SCENARIO), 0.8),
    'nominal rho_REEFER = 0.800 (feasible, and the binding resource)');
  for (const rho of [0.6, 0.7, 0.9, 1.1, 1.3]) {
    assert(near(rhoFor({ ...NOMINAL_SCENARIO, intensity: intensityForRho(rho) }), rho),
      'intensityForRho(' + rho + ') round-trips through rhoFor');
  }
}

// --- 5. generator regression ----------------------------------------------
// The default scenario must keep reproducing the shipped game byte for byte,
// otherwise every seed recorded before the parameterisation becomes garbage.
console.log('\n--- 5: generator regression ---');
{
  let h = 0x811c9dc5;
  const feed = (str) => {
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  };
  for (let seed = 0; seed < 200; seed++) {
    for (let w = 1; w <= CONFIG.horizonWeeks; w++) {
      const port = CONFIG.ports[(w - 1) % CONFIG.ports.length];
      feed(JSON.stringify(generateOrders(port, w, CONFIG.ports, rngForPortCall(seed, w, port))));
    }
  }
  // Frozen 2026-08-28 from the pre-parameterisation engine at git HEAD, then
  // re-verified: 16,000 port-calls, 0 differences. If this hash moves, the
  // default scenario has stopped reproducing the shipped game and every seed
  // recorded before the change is void.
  const GOLDEN = 0x8390cd22;
  const got = h >>> 0;
  assert(got === GOLDEN,
    'default generator hash unchanged (0x' + got.toString(16).padStart(8, '0') + ')');

  const a = JSON.stringify(generateOrders('SBY', 1, CONFIG.ports, rngForPortCall(42, 1, 'SBY')));
  const b = JSON.stringify(generateOrders('SBY', 1, CONFIG.ports, rngForPortCall(42, 1, 'SBY'),
    DEFAULT_SCENARIO));
  assert(a === b, 'omitting the scenario equals passing DEFAULT_SCENARIO');

  const dense = generateOrders('SBY', 1, CONFIG.ports, rngForPortCall(42, 1, 'SBY'),
    { ...DEFAULT_SCENARIO, intensity: 2 });
  const plain = generateOrders('SBY', 1, CONFIG.ports, rngForPortCall(42, 1, 'SBY'));
  assert(dense.length > plain.length, 'intensity scales the number of orders offered');
}

// --- 6. accounting identities per episode ---------------------------------
console.log('\n--- 6: episode accounting ---');
{
  let cashOk = 0, convOk = 0, drainOk = 0, physOk = 0;
  const n = 40;
  for (let i = 0; i < n; i++) {
    for (const key of DEFAULT_LINEUP) {
      const r = runEpisode(AGENTS[key], 300_000 + i);
      const cash = CONFIG.startCash + r.revenue - r.restowPenalty - r.rollingPenalty;
      if (cash === r.cash) cashOk++;
      if (r.loaded <= r.accepted && r.accepted <= r.offered) convOk++;
      // With a drain at least as long as the maximum dwell, every loaded box is
      // discharged inside the episode, so the two revenue conventions coincide.
      if (r.revenueLoad === r.revenueDischarge) drainOk++;
      if (r.physicsViolations === 0) physOk++;
    }
  }
  const cells = n * DEFAULT_LINEUP.length;
  assert(cashOk === cells, 'cash = start + revenue - restow - rolling on all ' + cells + ' episodes');
  assert(convOk === cells, 'loaded <= accepted <= offered on all episodes');
  assert(drainOk === cells,
    'drain makes load- and discharge-recognition identical on all episodes');
  assert(physOk === cells, 'no physics violation in any episode');
}

// --- 7. blocked design ----------------------------------------------------
console.log('\n--- 7: blocked design guarantees ---');
{
  let sameDemand = 0;
  for (let i = 0; i < 30; i++) {
    const offered = DEFAULT_LINEUP.map(k => runEpisode(AGENTS[k], 300_000 + i).offered);
    if (new Set(offered).size === 1) sameDemand++;
  }
  assert(sameDemand === 30, 'every agent faces identical demand within a block (30 blocks)');

  const a = runEpisode(AGENTS.annealing, 300_005);
  const b = runEpisode(AGENTS.annealing, 300_005);
  assert(a.cash === b.cash && a.restowContainers === b.restowContainers,
    'a stochastic agent is still deterministic given (seed, replicate)');

  const r0 = runEpisode(AGENTS.annealing, 300_005, { replicate: 0 });
  const r1 = runEpisode(AGENTS.annealing, 300_005, { replicate: 1 });
  assert(r0.offered === r1.offered, 'replicate does not disturb the scenario');
  assert(r0.cash !== r1.cash, 'replicate does disturb a stochastic agent');
  assert(runEpisode(AGENTS.greedy, 300_005, { replicate: 3 }).cash
    === runEpisode(AGENTS.greedy, 300_005).cash,
    'replicate leaves a deterministic agent untouched');
  assert(PLAN_LINEUP.filter(isStochastic).join() === 'random,annealing',
    'stochastic flags match the agents that actually draw randomness');
}

// --- 8. scenario knobs move what they claim to ----------------------------
console.log('\n--- 8: scenario knobs ---');
{
  const measure = (scenario) => {
    let containers = 0, reefer = 0, committed = 0, calls = 0;
    for (let seed = 400_000; seed < 400_120; seed++) {
      for (let w = 1; w <= CONFIG.horizonWeeks; w++) {
        const port = CONFIG.ports[(w - 1) % CONFIG.ports.length];
        calls++;
        for (const o of generateOrders(port, w, CONFIG.ports,
          rngForPortCall(seed, w, port), scenario)) {
          containers += o.quantity;
          if (o.containerType === 'REEFER') reefer += o.quantity;
          if (o.customerType === 'Committed') committed += o.quantity;
        }
      }
    }
    return { lambda: containers / calls, sigma: reefer / containers, kappa: committed / containers };
  };

  const nom = measure(NOMINAL_SCENARIO);
  assert(Math.abs(nom.sigma - 0.30) < 0.02, 'measured sigma tracks reeferShare at nominal');
  assert(Math.abs(nom.kappa - 0.40) < 0.02, 'measured kappa tracks committedShare at nominal');
  assert(Math.abs(nom.lambda / (MEAN_ORDERS * MEAN_QUANTITY) - 1) < 0.03,
    'measured lambda tracks the analytical value at nominal');

  const hot = measure({ intensity: intensityForRho(1.3), reeferShare: 0.45, committedShare: 0.2 });
  assert(Math.abs(hot.sigma - 0.45) < 0.02, 'reeferShare moves sigma and nothing else');
  assert(Math.abs(hot.kappa - 0.20) < 0.02, 'committedShare moves kappa and nothing else');
  assert(hot.lambda > nom.lambda * 1.3, 'intensity raises lambda');
}

// --- 9. dwell bound justifies the drain length ----------------------------
console.log('\n--- 9: drain length ---');
{
  let maxHops = 0;
  for (const from of CONFIG.ports) {
    for (const to of CONFIG.ports) {
      if (from === to) continue;
      maxHops = Math.max(maxHops, hopsBetween(CONFIG.ports, from, to));
    }
  }
  assert(maxHops === CONFIG.ports.length - 1, 'maximum dwell is P-1 hops');
  assert(CONFIG.drainWeeks >= maxHops,
    'drainWeeks (' + CONFIG.drainWeeks + ') >= maximum dwell (' + maxHops + ')');
}

console.log('\n====================================================');
if (failures.length) {
  console.error('   FAILED: ' + failures.length + ' of ' + total);
  for (const f of failures) console.error('   - ' + f);
  console.log('====================================================');
  process.exit(1);
}
console.log('   ALL HARNESS CHECKS PASSED (' + passed + '/' + total + ')');
console.log('====================================================');
