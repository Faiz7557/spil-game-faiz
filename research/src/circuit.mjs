/**
 * Circuit environment — the MDP used by the thesis experiments.
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
 * Everything here is pure: same (agent, seed) always yields the same episode.
 * Keep it that way — the Python port is verified against this file.
 */
import {
  createEmptyGrid, generateOrders, rngForPortCall, getBayConfig,
  calculateRestows, processSailingTransition, validateGridPhysics
} from '../../server/utils/gameEngine.js';

export const CONFIG = {
  ports: ['SBY', 'MKS', 'JYP', 'MDN'],
  bays: ['10', '06', '02'],        // 36 slots: 12 REEFER (bay 10) + 24 DRY
  horizonWeeks: 8,
  startCash: 150_000_000,
  restowCostPerMove: 3_000_000,

  /**
   * When is freight revenue recognised?
   *   'load'      — credited when the container is stowed at its origin port.
   *   'discharge' — credited when the container is discharged at its destination.
   *
   * DECIDED: 'discharge'. The shipped game used to disagree between paths
   * (multiplayer credited on load via calculateGrossRevenue, offline credited
   * on discharge) - both now credit on discharge (calculateDischargeRevenue in
   * server/utils/gameEngine.js). State this in Bab 3 as an assumption and make
   * the Python port match; a container still aboard at week 8 earns nothing.
   */
  revenueRecognition: 'discharge'
};

export const CAPACITY = CONFIG.bays.reduce((n, bay) => {
  const cfg = getBayConfig(bay);
  return n + cfg.rows.length * cfg.tiers.length;
}, 0);

/** Rolling penalty per container, from the SPIL penalty table. */
export const rollPenalty = (isCommitted, containerType) =>
  isCommitted
    ? (containerType === 'DRY' ? 16_000_000 : 24_000_000)
    : (containerType === 'DRY' ? 8_000_000 : 16_000_000);

/** Expands an order into individual containers. */
export const unpack = (order) =>
  Array.from({ length: order.quantity }, (_, q) => ({
    id: `${order.id}_c${q}`,
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
 * validateGridPhysics does not — and must not — check it.
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

/**
 * Runs one full episode.
 *
 * @param {object} agent   { name, select(orders, ctx), stow(containers, grid, ctx) }
 * @param {number} seed    scenario seed; identical seeds give identical demand
 * @param {object} [demand] optional accumulator for V3 demand characterisation
 */
export const runEpisode = (agent, seed, demand = null) => {
  const { ports, bays, horizonWeeks, startCash, restowCostPerMove } = CONFIG;
  let grid = createEmptyGrid(bays);

  const m = {
    revenueLoad: 0, revenueDischarge: 0,
    restowContainers: 0, restowPenalty: 0,
    rolled: 0, rollingPenalty: 0,
    offered: 0, accepted: 0, loaded: 0,
    reeferOffered: 0, reeferRolled: 0, committedOffered: 0,
    physicsViolations: 0, utilisation: [], weekly: []
  };

  for (let week = 1; week <= horizonWeeks; week++) {
    const port = ports[(week - 1) % ports.length];
    const nextPort = ports[week % ports.length];

    // Demand is a property of the scenario, never of the agent: every agent
    // facing seed S sees byte-identical orders. This is what makes the blocked
    // design valid.
    const orders = generateOrders(port, week, ports, rngForPortCall(seed, week, port));

    // Agent randomness is seeded separately so one agent's draws cannot shift
    // another agent's stream.
    const ctx = {
      port, nextPort, week, ports,
      rng: rngForPortCall(seed, week, `${agent.name}@${port}`)
    };

    if (demand) {
      demand.portCalls++;
      demand.ordersPerCall.push(orders.length);
      for (const o of orders) {
        demand.orders++;
        demand.containers += o.quantity;
        if (o.containerType === 'REEFER') demand.reefer += o.quantity;
        if (o.customerType === 'Committed') demand.committed += o.quantity;
        const hops = (ports.indexOf(o.destination) - ports.indexOf(port) + ports.length) % ports.length;
        for (let q = 0; q < o.quantity; q++) demand.dwell.push(hops);
        demand.tariffs.push(o.tariff);
      }
    }

    for (const o of orders) {
      m.offered += o.quantity;
      if (o.containerType === 'REEFER') m.reeferOffered += o.quantity;
      if (o.customerType === 'Committed') m.committedOffered += o.quantity;
    }

    // --- decision 1: acceptance -------------------------------------------
    const accepted = agent.select(orders, ctx);
    const acceptedIds = new Set(accepted.map(o => o.id));
    const declined = orders.filter(o => !acceptedIds.has(o.id));

    // --- decision 2: stowage ----------------------------------------------
    const containers = accepted.flatMap(unpack);
    m.accepted += containers.length;
    const leftover = agent.stow(containers, grid, ctx);
    const leftoverIds = new Set(leftover.map(c => c.id));

    let weekRevenue = 0;
    for (const c of containers) {
      if (!leftoverIds.has(c.id)) { weekRevenue += c.tariff; m.loaded++; }
    }
    m.revenueLoad += weekRevenue;

    // --- rolled containers -------------------------------------------------
    // Two ways to be penalised: accept an order then fail to load it, or ignore
    // a Committed order entirely. Declining a Non-Committed order is free.
    let weekRolling = 0;
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

    // --- restow -------------------------------------------------------------
    if (!validateGridPhysics(grid).valid) m.physicsViolations++;
    m.utilisation.push(occupied(grid) / CAPACITY);

    const restow = calculateRestows(grid, port, ports);
    const weekRestow = restow.restowMovementsCount * restowCostPerMove;
    m.restowContainers += restow.restowContainersCount;
    m.restowPenalty += weekRestow;

    // --- sail ---------------------------------------------------------------
    m.revenueDischarge += valueBoundFor(grid, nextPort);
    m.weekly.push({
      week, port,
      revenue: weekRevenue,
      restowPenalty: weekRestow,
      rollingPenalty: weekRolling,
      utilisation: occupied(grid) / CAPACITY
    });

    grid = processSailingTransition(grid, nextPort);
  }

  const revenue = CONFIG.revenueRecognition === 'discharge'
    ? m.revenueDischarge
    : m.revenueLoad;

  return {
    agent: agent.name,
    seed,
    revenue,
    cash: startCash + revenue - m.restowPenalty - m.rollingPenalty,
    meanUtilisation: m.utilisation.reduce((a, b) => a + b, 0) / m.utilisation.length,
    ...m
  };
};
