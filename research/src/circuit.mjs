/**
 * Circuit environment - the MDP used by the thesis experiments.
 *
 * One carrier operates the vessel across the whole port circuit for the full
 * horizon. At every port-call the agent makes two decisions in sequence:
 *   1. accept or decline each sales-call order
 *   2. choose a slot for each container it accepted
 *
 * This is deliberately NOT the 4-player pass-and-play flow in server.js, where
 * a player only acts when the vessel is berthed at its own branch and therefore
 * gets 2 decision epochs per game. Here the agent gets all 8, which is what
 * makes the problem a usable sequential decision process.
 *
 * The economics (tariffs, penalties, restow cost, bay physics) come from the
 * shipped game engine, so this harness and the game cannot silently disagree.
 *
 * Everything here is pure apart from the wall-clock reading used to time the
 * agent: same (agent, seed, scenario) always yields the same episode.
 */
import {
  createEmptyGrid, generateOrders, rngForPortCall, getBayConfig,
  calculateRestows, processSailingTransition, validateGridPhysics,
  DEFAULT_SCENARIO
} from '../../server/utils/gameEngine.js';

export const CONFIG = {
  ports: ['SBY', 'MKS', 'JYP', 'MDN'],
  bays: ['10', '06', '02'],        // 36 slots: 12 REEFER (bay 10) + 24 DRY
  horizonWeeks: 8,

  /**
   * Drain (cool-down) weeks appended after the decision horizon.
   *
   * WHY THIS EXISTS. Revenue is recognised on discharge, so under a hard stop
   * at week 8 any cargo still aboard earns nothing. The optimal week-8 policy
   * is therefore to decline every non-committed order whose destination is not
   * the immediate next port - free money for an agent that can learn the edge
   * (A5) and invisible to every hand-written heuristic. That artefact would
   * contaminate exactly the comparison this thesis is about.
   *
   * The fix is standard finite-horizon simulation practice: keep sailing for
   * `drainWeeks` more port-calls with NO new cargo accepted, so every container
   * loaded during the decision horizon reaches its destination and is credited.
   * Restow penalties still accrue during the drain, which is correct - badly
   * stowed late cargo should still cost money.
   *
   * 3 = max dwell on a 4-port circuit, so the drain is exactly long enough.
   * Set to 0 to reproduce the old truncated-horizon behaviour and measure how
   * large the distortion actually was.
   */
  drainWeeks: 3,

  startCash: 150_000_000,
  restowCostPerMove: 3_000_000,

  /**
   * When is freight revenue recognised?
   *   'load'      - credited when the container is stowed at its origin port.
   *   'discharge' - credited when the container is discharged at its destination.
   *
   * DECIDED: 'discharge'. Note that with drainWeeks >= max dwell the two
   * conventions agree on the episode total; they differ only in WHEN revenue
   * lands, and in how a truncated horizon treats cargo still at sea. Keeping
   * 'discharge' means cargo that never completes its voyage earns nothing,
   * which is the economically meaningful rule.
   */
  revenueRecognition: 'discharge'
};

export const CAPACITY = CONFIG.bays.reduce((n, bay) => {
  const cfg = getBayConfig(bay);
  return n + cfg.rows.length * cfg.tiers.length;
}, 0);

export const REEFER_CAPACITY = CONFIG.bays.reduce((n, bay) => {
  const cfg = getBayConfig(bay);
  return n + (cfg.containerType === 'REEFER' ? cfg.rows.length * cfg.tiers.length : 0);
}, 0);

export const DRY_CAPACITY = CAPACITY - REEFER_CAPACITY;

// --- analytical demand model ------------------------------------------------
// Used to translate a target offered load rho into a generator `intensity`, so
// the sensitivity strata can be specified in the units the thesis reports.

/** Mean orders per port-call at intensity 1.0 (uniform 6..10). */
export const MEAN_ORDERS = 8;
/** Mean containers per order (uniform 1..3). */
export const MEAN_QUANTITY = 2;
/** Mean dwell in hops; destinations are uniform over the other P-1 ports. */
export const MEAN_DWELL = CONFIG.ports.length / 2;

/** lambda - containers offered per port-call. */
export const lambdaFor = (scenario = DEFAULT_SCENARIO) =>
  MEAN_ORDERS * (scenario.intensity ?? 1) * MEAN_QUANTITY;

/** Little's law offered load: rho = lambda * W / capacity. */
export const rhoFor = (scenario = DEFAULT_SCENARIO) =>
  lambdaFor(scenario) * MEAN_DWELL / CAPACITY;

export const rhoReeferFor = (scenario = DEFAULT_SCENARIO) =>
  lambdaFor(scenario) * (scenario.reeferShare ?? DEFAULT_SCENARIO.reeferShare)
  * MEAN_DWELL / REEFER_CAPACITY;

/** Inverse of rhoFor - the intensity that produces a target rho. */
export const intensityForRho = (rho) =>
  rho * CAPACITY / (MEAN_ORDERS * MEAN_QUANTITY * MEAN_DWELL);

export const NOMINAL_SCENARIO = Object.freeze({ ...DEFAULT_SCENARIO });

/** Rolling penalty per container, from the SPIL penalty table. */
export const rollPenalty = (isCommitted, containerType) =>
  isCommitted
    ? (containerType === 'DRY' ? 16_000_000 : 24_000_000)
    : (containerType === 'DRY' ? 8_000_000 : 16_000_000);

/** Expands an order into individual containers. */
export const unpack = (order) =>
  Array.from({ length: order.quantity }, (_, q) => ({
    id: order.id + '_c' + q,
    orderId: order.id,
    containerType: order.containerType,
    origin: order.origin,
    destination: order.destination,
    tariff: order.tariff,
    customerType: order.customerType,
    customerName: order.customerName
  }));

export const occupied = (grid) =>
  Object.keys(grid).reduce((n, bay) => {
    const cfg = getBayConfig(bay);
    return n + cfg.rows.reduce(
      (m, row) => m + cfg.tiers.filter(t => grid[bay][row][t]).length, 0);
  }, 0);

/** Hops from `from` to `to` along the circuit. */
export const hopsBetween = (ports, from, to) =>
  (ports.indexOf(to) - ports.indexOf(from) + ports.length) % ports.length;

/**
 * Every slot this container may legally occupy right now.
 *
 * Three constraints, all from the game's bay plan:
 *   - slot type must match the container type (REEFER plugs only in bay 10/14)
 *   - tier 84 needs tier 82 filled, otherwise the container floats
 *   - tier 02 is under the hatch cover, so it is unreachable once 82 or 84 is filled
 *
 * That last one is an ORDER-OF-LOADING constraint, not a state invariant: a
 * fully-loaded 02+82+84 stack is legal when loaded bottom-up. This is why
 * validateGridPhysics does not - and must not - check it.
 *
 * Doubles as the action mask for the RL agent.
 */
export const validSlots = (grid, container) => {
  const out = [];
  for (const bay of Object.keys(grid)) {
    const cfg = getBayConfig(bay);
    if (cfg.containerType !== container.containerType) continue;
    for (const row of cfg.rows) {
      const stack = grid[bay][row];
      for (const tier of cfg.tiers) {
        if (stack[tier] !== null) continue;
        if (tier === '84' && stack['82'] === null) continue;
        if (tier === '02' && (stack['82'] !== null || stack['84'] !== null)) continue;
        out.push({ bay, row, tier });
      }
    }
  }
  return out;
};

/** Free legal slots for a container type, ignoring which specific slot. */
export const freeSlotCount = (grid, containerType) =>
  validSlots(grid, { containerType }).length;

/** Tariff value of everything aboard bound for `port`. */
const valueBoundFor = (grid, port) => {
  let sum = 0;
  for (const bay of Object.keys(grid)) {
    const cfg = getBayConfig(bay);
    for (const row of cfg.rows) {
      for (const tier of cfg.tiers) {
        const c = grid[bay][row][tier];
        if (c && c.destination === port) sum += c.tariff;
      }
    }
  }
  return sum;
};

const now = () => Number(process.hrtime.bigint()) / 1e6;

/**
 * Runs one full episode.
 *
 * @param {object} agent   { name, select(orders, ctx), stow(containers, grid, ctx) }
 * @param {number} seed    scenario seed; identical seeds give identical demand
 * @param {object} [opts]  { demand, scenario, replicate }
 *   demand    optional accumulator for V3 demand characterisation
 *   scenario  { intensity, reeferShare, committedShare } - defaults to nominal
 *   replicate index of an independent repetition for a STOCHASTIC agent. It
 *             changes only the agent's own random stream, never the scenario,
 *             so all replicates of all agents still face byte-identical demand.
 *             replicate 0 uses the original key, so previously recorded runs
 *             stay reproducible.
 */
export const runEpisode = (agent, seed, opts = {}) => {
  const { demand = null, scenario = NOMINAL_SCENARIO, replicate = 0 } = opts;
  const { ports, bays, horizonWeeks, drainWeeks, startCash, restowCostPerMove } = CONFIG;
  let grid = createEmptyGrid(bays);

  const m = {
    revenueLoad: 0, revenueDischarge: 0, revenueDrain: 0,
    restowContainers: 0, restowPenalty: 0, restowPenaltyDrain: 0,
    rolled: 0, rollingPenalty: 0,
    offered: 0, accepted: 0, loaded: 0,
    reeferOffered: 0, reeferRolled: 0, committedOffered: 0,
    aboardAtHorizon: 0, valueAboardAtHorizon: 0,
    physicsViolations: 0, utilisation: [], weekly: [],
    decisionMs: 0, decisionMsMax: 0, decisionCalls: 0
  };

  const totalWeeks = horizonWeeks + drainWeeks;

  for (let week = 1; week <= totalWeeks; week++) {
    const port = ports[(week - 1) % ports.length];
    const nextPort = ports[week % ports.length];
    const isDecisionWeek = week <= horizonWeeks;

    let weekRevenue = 0;
    let weekRolling = 0;

    if (isDecisionWeek) {
      // Demand is a property of the scenario, never of the agent: every agent
      // facing seed S sees byte-identical orders. This is what makes the
      // blocked design valid.
      const orders = generateOrders(
        port, week, ports, rngForPortCall(seed, week, port), scenario);

      // Agent randomness is seeded separately so one agent's draws cannot shift
      // another agent's stream.
      // `grid` is exposed to select() as READ-ONLY. Capacity-aware acceptance
      // (A3) and the joint accept+stow optimiser (A4) both need to see how full
      // the vessel already is; only stow() may write to it.
      const ctx = {
        port, nextPort, week, ports, grid,
        weeksLeft: horizonWeeks - week,
        rng: rngForPortCall(seed, week, replicate
          ? agent.name + '#' + replicate + '@' + port
          : agent.name + '@' + port)
      };

      if (demand) {
        demand.portCalls++;
        demand.ordersPerCall.push(orders.length);
        for (const o of orders) {
          demand.orders++;
          demand.containers += o.quantity;
          if (o.containerType === 'REEFER') demand.reefer += o.quantity;
          if (o.customerType === 'Committed') demand.committed += o.quantity;
          const hops = hopsBetween(ports, port, o.destination);
          for (let q = 0; q < o.quantity; q++) demand.dwell.push(hops);
          demand.tariffs.push(o.tariff);
        }
      }

      for (const o of orders) {
        m.offered += o.quantity;
        if (o.containerType === 'REEFER') m.reeferOffered += o.quantity;
        if (o.customerType === 'Committed') m.committedOffered += o.quantity;
      }

      // --- the two decisions, timed --------------------------------------
      // Only the agent's own work is inside the clock: order generation,
      // bookkeeping and the engine's restow accounting are excluded.
      const t0 = now();
      const accepted = agent.select(orders, ctx);
      const containers = accepted.flatMap(unpack);
      const leftover = agent.stow(containers, grid, ctx);
      const elapsed = now() - t0;

      m.decisionMs += elapsed;
      m.decisionCalls++;
      if (elapsed > m.decisionMsMax) m.decisionMsMax = elapsed;

      const acceptedIds = new Set(accepted.map(o => o.id));
      const declined = orders.filter(o => !acceptedIds.has(o.id));
      const leftoverIds = new Set(leftover.map(c => c.id));

      m.accepted += containers.length;
      for (const c of containers) {
        if (!leftoverIds.has(c.id)) { weekRevenue += c.tariff; m.loaded++; }
      }
      m.revenueLoad += weekRevenue;

      // --- rolled containers ----------------------------------------------
      // Two ways to be penalised: accept an order then fail to load it, or
      // ignore a Committed order entirely. Declining a Non-Committed order is
      // free.
      for (const c of leftover) {
        m.rolled++;
        if (c.containerType === 'REEFER') m.reeferRolled++;
        weekRolling += rollPenalty(c.customerType === 'Committed', c.containerType);
      }
      for (const o of declined) {
        if (o.customerType !== 'Committed') continue;
        m.rolled += o.quantity;
        if (o.containerType === 'REEFER') m.reeferRolled += o.quantity;
        weekRolling += o.quantity * rollPenalty(true, o.containerType);
      }
      m.rollingPenalty += weekRolling;
    }

    // --- restow --------------------------------------------------------------
    // Charged at EVERY port-call, decision or drain: a container that blocks
    // discharge has to be shifted again each time the vessel berths. See
    // research/docs/ASUMSI.md, assumption A-4.
    if (!validateGridPhysics(grid).valid) m.physicsViolations++;
    if (isDecisionWeek) m.utilisation.push(occupied(grid) / CAPACITY);

    const restow = calculateRestows(grid, port, ports);
    const weekRestow = restow.restowMovementsCount * restowCostPerMove;
    m.restowContainers += restow.restowContainersCount;
    m.restowPenalty += weekRestow;
    if (!isDecisionWeek) m.restowPenaltyDrain += weekRestow;

    // --- sail ----------------------------------------------------------------
    const discharged = valueBoundFor(grid, nextPort);
    m.revenueDischarge += discharged;
    if (!isDecisionWeek) m.revenueDrain += discharged;

    m.weekly.push({
      week, port, phase: isDecisionWeek ? 'decision' : 'drain',
      revenue: weekRevenue,
      dischargeRevenue: discharged,
      restowPenalty: weekRestow,
      rollingPenalty: weekRolling,
      utilisation: occupied(grid) / CAPACITY
    });

    if (week === horizonWeeks) {
      m.aboardAtHorizon = occupied(grid);
      m.valueAboardAtHorizon = ports.reduce((s, p) => s + valueBoundFor(grid, p), 0);
    }

    grid = processSailingTransition(grid, nextPort);
  }

  const revenue = CONFIG.revenueRecognition === 'discharge'
    ? m.revenueDischarge
    : m.revenueLoad;

  return {
    agent: agent.name,
    seed,
    replicate,
    scenario,
    revenue,
    cash: startCash + revenue - m.restowPenalty - m.rollingPenalty,
    meanUtilisation: m.utilisation.reduce((a, b) => a + b, 0) / m.utilisation.length,
    meanDecisionMs: m.decisionMs / Math.max(1, m.decisionCalls),
    ...m
  };
};
