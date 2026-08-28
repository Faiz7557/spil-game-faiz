/**
 * Agent registry.
 *
 * Every agent exposes the same two-method interface so the harness never needs
 * to know which class of algorithm it is driving:
 *
 *   select(orders, ctx) -> orders to accept
 *   stow(containers, grid, ctx) -> containers it could NOT place (mutates grid)
 *
 * ctx = { port, nextPort, week, ports, grid, weeksLeft, rng }. `ctx.grid` is
 * read-only inside select(). Draw all randomness from ctx.rng, never
 * Math.random, or the episode stops being reproducible.
 *
 * THE THESIS LINE-UP (see PLAN_LINEUP at the bottom):
 *   A1 Random         `random`      coin-flip acceptance, random legal slot
 *   A2 Rule-based     `ruleSmart`   the shipped SMART bot, selection AND stowage
 *   A3 Greedy         `greedy`      value-density acceptance + overstow-delta stowage
 *   A4 Metaheuristic  `annealing`   simulated annealing over (accept-set, bay plan)
 *   A5 Deep RL        TODO          MaskablePPO, trained in Python
 *
 * A3 and A4 deliberately optimise THE SAME objective (see `stackOverstow`), so
 * any difference between them is attributable to optimisation power - one
 * constructive pass versus a search - and not to one of them being handed a
 * better cost function. A2 keeps the game's own objective because A2 *is* the
 * game's own bot; that difference is the point of including it.
 *
 * DIAGNOSTIC REFERENCES (reported, never part of the A1..A5 ranking):
 *   `committedOnly`     the conservative floor - carry only what is mandatory
 *   `greedyAcceptAll`   the shipped GREEDY bot, as built
 *   `balanced`          the shipped BALANCED bot, as built
 */
import { validSlots, unpack, hopsBetween, freeSlotCount } from './circuit.mjs';
import { getBayConfig } from '../../server/utils/gameEngine.js';
import {
  executeBotStowagePlacement, executeBotCargoSelection
} from '../../server/utils/botEngine.js';

// ---------------------------------------------------------------------------
// shared geometry and objective helpers
// ---------------------------------------------------------------------------

/** getBayConfig lists tiers top-down ('84','82','02'); stowage logic needs bottom-up. */
const BOTTOM_UP = ['02', '82', '84'];
const tiersBottomUp = (cfg) => BOTTOM_UP.filter(t => cfg.tiers.includes(t));

/**
 * THE STOWAGE OBJECTIVE.
 *
 * `cells` is one stack, bottom to top, holding each container's remaining hops
 * to its discharge port (null = empty). A shift is forced whenever a container
 * that leaves LATER sits above one that leaves EARLIER, so the number of future
 * shifts the stack has already committed to is the number of such pairs.
 *
 * The game engine's calculateRestows only looks one port ahead - it counts
 * boxes above next-port cargo. That is the right thing for BILLING (you are
 * only charged for shifts you actually perform at this berth) but the wrong
 * thing to PLAN against, because it is blind to a bay plan that is fine this
 * week and disastrous next week. Counting pairs over the whole rotation is the
 * standard overstow criterion in the stowage literature, and it is what A3 and
 * A4 minimise. Billing stays with the engine; only planning uses this.
 */
export const stackOverstow = (cells) => {
  let n = 0;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === null) continue;
    for (let j = i + 1; j < cells.length; j++) {
      if (cells[j] === null) continue;
      if (cells[i] < cells[j]) n++;   // lower box leaves first -> upper must move
    }
  }
  return n;
};

/** Remaining hops of every container in one grid stack, bottom-up. */
const hopsCells = (grid, bay, row, tiers, ports, port) =>
  tiers.map((t) => {
    const c = grid[bay][row][t];
    return c ? hopsBetween(ports, port, c.destination) : null;
  });

/** Extra overstow pairs created by putting `hops` at tier index `idx`. */
const overstowDelta = (cells, idx, hops) => {
  const before = stackOverstow(cells);
  const after = cells.slice();
  after[idx] = hops;
  return stackOverstow(after) - before;
};

/**
 * Is tier index `i` legal for a new container right now?
 *
 * This MIRRORS validSlots() on the lightweight stack representation. The two
 * must never disagree: if they do, A4 plans placements the grid will refuse and
 * silently falls back, so its measured behaviour stops being the behaviour the
 * search paid for. `verifyHarness.mjs` asserts the equivalence on random grids -
 * exported for that reason.
 */
export const legalAt = (cells, tiers, i) => {
  if (i < 0 || i >= tiers.length || cells[i] !== null) return false;
  const tier = tiers[i];
  if (tier === '84') {
    const i82 = tiers.indexOf('82');
    if (i82 < 0 || cells[i82] === null) return false;
  }
  if (tier === '02') {
    const i82 = tiers.indexOf('82'), i84 = tiers.indexOf('84');
    if ((i82 >= 0 && cells[i82] !== null) || (i84 >= 0 && cells[i84] !== null)) return false;
  }
  return true;
};

/** Lowest legal tier index in a stack, or -1. */
const lowestLegalIdx = (cells, tiers) => {
  for (let i = 0; i < tiers.length; i++) if (legalAt(cells, tiers, i)) return i;
  return -1;
};

/**
 * Lightweight mirror of the grid: a stack is just an array of remaining hops.
 *
 * The real grid stores whole container objects and is cloned with JSON, which
 * is far too slow to evaluate thousands of candidate plans inside A4.
 */
const snapshotStacks = (grid, ports, port) => {
  const stacks = [];
  for (const bay of Object.keys(grid)) {
    const cfg = getBayConfig(bay);
    const tiers = tiersBottomUp(cfg);
    for (const row of cfg.rows) {
      stacks.push({
        bay, row, tiers,
        type: cfg.containerType,
        base: hopsCells(grid, bay, row, tiers, ports, port)
      });
    }
  }
  return stacks;
};

/** Rolling penalty, mirroring the SPIL penalty table used by the harness. */
const rollCost = (committed, type) => committed
  ? (type === 'DRY' ? 16_000_000 : 24_000_000)
  : (type === 'DRY' ? 8_000_000 : 16_000_000);

// ---------------------------------------------------------------------------
// generic stowage strategies
// ---------------------------------------------------------------------------

/** Places into the first legal slot found. The plain baseline. */
export const stowFirstFit = (containers, grid) => {
  const leftover = [];
  for (const c of containers) {
    const slots = validSlots(grid, c);
    if (slots.length === 0) { leftover.push(c); continue; }
    const { bay, row, tier } = slots[0];
    grid[bay][row][tier] = c;
  }
  return leftover;
};

/** Places into a uniformly random legal slot. */
export const stowRandom = (containers, grid, rng) => {
  const leftover = [];
  for (const c of containers) {
    const slots = validSlots(grid, c);
    if (slots.length === 0) { leftover.push(c); continue; }
    const { bay, row, tier } = slots[Math.floor(rng() * slots.length)];
    grid[bay][row][tier] = c;
  }
  return leftover;
};

/**
 * Delegates STOWAGE to the game's own code, so the shipped bots are measured as
 * they actually behave rather than as a reimplementation of them.
 *
 * Note: GREEDY and BALANCED share one stowage code path in botEngine - verified
 * identical on 200/200 grids given identical cargo. Only SMART differs.
 */
export const stowViaGameBot = (containers, grid, port, ports, personality) => {
  const bot = { isBot: true, personality, pendingContainers: containers, cargoPool: [] };
  executeBotStowagePlacement(bot, grid, port, ports);
  return bot.pendingContainers;
};

/**
 * Delegates ACCEPTANCE to the game's own code too.
 *
 * The previous version of this file re-implemented the SMART threshold inline
 * (`tariff >= 11_000_000`), which meant a change in botEngine.js would silently
 * invalidate the claim that A2 is "the shipped bot". It no longer can: the
 * accept-set is now whatever executeBotCargoSelection leaves out of cargoPool.
 */
export const selectViaGameBot = (orders, ctx, personality) => {
  const bot = {
    id: 0, isBot: true, personality,
    cargoPool: orders.slice(), pendingContainers: []
  };
  executeBotCargoSelection(bot, ctx.port, ctx.ports, ctx.rng);
  const declined = new Set(bot.cargoPool.map(o => o.id));
  return orders.filter(o => !declined.has(o.id));
};

// ---------------------------------------------------------------------------
// A3 - greedy, multi-criteria
// ---------------------------------------------------------------------------

/**
 * Acceptance by value density under a capacity budget.
 *
 * Three criteria, in order:
 *   1. Committed orders are taken unconditionally - declining one costs the
 *      full rolling penalty, so refusing is never cheaper than trying.
 *   2. Remaining orders are ranked by tariff per slot-week, i.e. tariff / hops.
 *      A container to a far port earns once but blocks a slot for up to three
 *      port-calls; ranking on raw tariff (what A2 does) ignores that entirely.
 *   3. The accept-set is truncated at the free-slot budget FOR ITS OWN TYPE,
 *      because REEFER and DRY slots are not interchangeable. This is what stops
 *      A3 from repeating the shipped GREEDY bot's mistake of accepting cargo it
 *      demonstrably cannot load.
 */
export const greedySelect = (orders, ctx) => {
  const budget = {
    DRY: freeSlotCount(ctx.grid, 'DRY'),
    REEFER: freeSlotCount(ctx.grid, 'REEFER')
  };

  const accepted = [];
  const optional = [];

  for (const o of orders) {
    if (o.customerType === 'Committed') {
      accepted.push(o);
      budget[o.containerType] -= o.quantity;
    } else {
      optional.push(o);
    }
  }

  optional.sort((a, b) => {
    const da = a.tariff / hopsBetween(ctx.ports, ctx.port, a.destination);
    const db = b.tariff / hopsBetween(ctx.ports, ctx.port, b.destination);
    return db - da;
  });

  for (const o of optional) {
    if (budget[o.containerType] >= o.quantity) {
      accepted.push(o);
      budget[o.containerType] -= o.quantity;
    }
  }
  return accepted;
};

/**
 * One constructive pass: load far cargo first and place each container in the
 * slot that adds the fewest overstow pairs, breaking ties towards the tier its
 * dwell suggests (far = deep, near = on top).
 *
 * This is the exact opposite of the shipped SMART bot, which stows next-port
 * cargo FIRST onto the top tiers - and thereby seals tier 02 under the hatch
 * cover, forcing every later-port container that follows onto tier 84 directly
 * above cargo that has to come off next. That ordering is the mechanism behind
 * SMART's poor restow ranking.
 */
export const greedyStow = (containers, grid, ctx) => {
  const maxHops = ctx.ports.length - 1;
  const hopsOf = (c) => hopsBetween(ctx.ports, ctx.port, c.destination);

  const ordered = containers.slice().sort((a, b) => {
    const d = hopsOf(b) - hopsOf(a);          // farthest destination first
    return d !== 0 ? d : b.tariff - a.tariff; // then most valuable first
  });

  const leftover = [];
  for (const c of ordered) {
    const slots = validSlots(grid, c);
    if (slots.length === 0) { leftover.push(c); continue; }

    const hops = hopsOf(c);
    // nearness 0 = farthest destination (wants the bottom), 1 = next port
    // (wants the top). desiredIdx maps that onto the tier ladder.
    const nearness = maxHops > 1 ? (maxHops - hops) / (maxHops - 1) : 1;

    let best = null, bestScore = Infinity;
    for (const s of slots) {
      const tiers = tiersBottomUp(getBayConfig(s.bay));
      const cells = hopsCells(grid, s.bay, s.row, tiers, ctx.ports, ctx.port);
      const idx = tiers.indexOf(s.tier);
      const delta = overstowDelta(cells, idx, hops);
      const mismatch = Math.abs(idx - nearness * (tiers.length - 1));
      const score = delta * 100 + mismatch;
      if (score < bestScore) { bestScore = score; best = s; }
    }
    grid[best.bay][best.row][best.tier] = c;
  }
  return leftover;
};

// ---------------------------------------------------------------------------
// A4 - simulated annealing over the joint (accept-set, bay plan)
// ---------------------------------------------------------------------------

/**
 * Decodes a solution into a placement and scores it.
 *
 * Objective = the port-call's contribution to cash, with the stowage term
 * measured as overstow pairs over the whole rotation rather than only the
 * shifts due at this berth:
 *
 *   cost = -(freight loaded)
 *        + (rolling penalty of everything accepted-but-unplaced and of every
 *           declined Committed container)
 *        + 2 * restowCostPerMove * overstow pairs in the resulting bay plan
 *
 * This is still ONE port-call of lookahead on the demand side - A4 optimises
 * the bay plan it can see, it does not reason about cargo that has not been
 * offered yet. State that as a limitation; whether it is enough is one of the
 * questions the comparison answers.
 */
const decode = (sol, containers, stacks, econ) => {
  const cells = stacks.map(s => s.base.slice());
  const placement = new Array(containers.length).fill(null);
  let value = 0, penalty = 0;

  for (const i of sol.sequence) {
    if (!sol.accept[i]) continue;
    const c = containers[i];

    let target = -1, idx = -1;
    const preferred = sol.stackChoice[i];
    if (stacks[preferred].type === c.containerType) {
      const tiers = stacks[preferred].tiers;
      // The solution names a tier, not just a stack. Without this the decoder
      // would always bury cargo at the lowest legal tier and the search could
      // not express "keep this next-port box on top" - the single decision that
      // drives the shifting bill.
      const wanted = sol.tierPref[i];
      idx = legalAt(cells[preferred], tiers, wanted)
        ? wanted
        : lowestLegalIdx(cells[preferred], tiers);
      if (idx >= 0) target = preferred;
    }
    if (target < 0) {
      for (let s = 0; s < stacks.length; s++) {
        if (stacks[s].type !== c.containerType) continue;
        const j = lowestLegalIdx(cells[s], stacks[s].tiers);
        if (j >= 0) { target = s; idx = j; break; }
      }
    }

    if (target < 0) {
      penalty += econ.roll(c.customerType === 'Committed', c.containerType);
      continue;
    }
    cells[target][idx] = c.hops;
    placement[i] = { stack: target, idx };
    value += c.tariff;
  }

  // Declined Committed cargo is charged too: refusing it is not free.
  for (let i = 0; i < containers.length; i++) {
    if (sol.accept[i]) continue;
    if (containers[i].customerType === 'Committed') {
      penalty += econ.roll(true, containers[i].containerType);
    }
  }

  let overstow = 0;
  for (let s = 0; s < stacks.length; s++) overstow += stackOverstow(cells[s]);

  return { cost: -value + penalty + overstow * 2 * econ.restowCostPerMove, placement };
};

const cloneSol = (s) => ({
  accept: s.accept.slice(),
  sequence: s.sequence.slice(),
  stackChoice: s.stackChoice.slice(),
  tierPref: s.tierPref.slice()
});

/**
 * Builds A4's starting solution by running A3's constructive rule on the
 * snapshot. Seeding a metaheuristic with a constructive heuristic is standard
 * practice, and it makes the experiment cleanly interpretable: A4 starts from
 * A3's plan, so whatever it gains is attributable to the search alone.
 */
const constructiveStart = (containers, stacks, maxHops) => {
  const cells = stacks.map(s => s.base.slice());
  const sol = {
    accept: containers.map(() => true),
    sequence: containers.map((_, i) => i),
    stackChoice: containers.map(() => 0),
    tierPref: containers.map(() => 0)
  };

  sol.sequence.sort((a, b) => {
    const d = containers[b].hops - containers[a].hops;
    return d !== 0 ? d : containers[b].tariff - containers[a].tariff;
  });

  for (const i of sol.sequence) {
    const c = containers[i];
    const nearness = maxHops > 1 ? (maxHops - c.hops) / (maxHops - 1) : 1;
    let bestS = -1, bestIdx = -1, bestScore = Infinity;

    for (let s = 0; s < stacks.length; s++) {
      if (stacks[s].type !== c.containerType) continue;
      const tiers = stacks[s].tiers;
      for (let t = 0; t < tiers.length; t++) {
        if (!legalAt(cells[s], tiers, t)) continue;
        const score = overstowDelta(cells[s], t, c.hops) * 100
          + Math.abs(t - nearness * (tiers.length - 1));
        if (score < bestScore) { bestScore = score; bestS = s; bestIdx = t; }
      }
    }
    if (bestS < 0) continue;                 // no room; decode will price it
    cells[bestS][bestIdx] = c.hops;
    sol.stackChoice[i] = bestS;
    sol.tierPref[i] = bestIdx;
  }
  return sol;
};

/**
 * Simulated annealing over four move types:
 *   - flip the accept bit of one non-committed container
 *   - move one container to a different tier of its stack
 *   - swap two positions in the loading sequence (who gets the deep slots)
 *   - reassign one container to a different stack
 *
 * Geometric cooling. The iteration budget is a REPORTED hyperparameter, not a
 * hidden constant: A4's role in the comparison is the accuracy/compute
 * trade-off, so the budget belongs in the results table next to its wall-clock
 * time.
 */
const anneal = (containers, ctx, econ, params) => {
  const stacks = snapshotStacks(ctx.grid, ctx.ports, ctx.port);
  const n = containers.length;
  const maxHops = ctx.ports.length - 1;

  const sol = constructiveStart(containers, stacks, maxHops);
  let cur = decode(sol, containers, stacks, econ);
  let best = { cost: cur.cost, placement: cur.placement };
  if (n === 0) return { stacks, best, iterations: 0 };

  let T = params.T0;
  for (let it = 0; it < params.iterations; it++) {
    const move = ctx.rng();
    let undo = null;

    if (move < 0.20) {
      const i = Math.floor(ctx.rng() * n);
      if (containers[i].customerType !== 'Committed') {
        sol.accept[i] = !sol.accept[i];
        undo = () => { sol.accept[i] = !sol.accept[i]; };
      }
    } else if (move < 0.50) {
      const i = Math.floor(ctx.rng() * n);
      const prev = sol.tierPref[i];
      sol.tierPref[i] = Math.floor(ctx.rng() * 3);
      undo = () => { sol.tierPref[i] = prev; };
    } else if (move < 0.75) {
      const a = Math.floor(ctx.rng() * n);
      const b = Math.floor(ctx.rng() * n);
      const t = sol.sequence[a]; sol.sequence[a] = sol.sequence[b]; sol.sequence[b] = t;
      undo = () => {
        const u = sol.sequence[a]; sol.sequence[a] = sol.sequence[b]; sol.sequence[b] = u;
      };
    } else {
      const i = Math.floor(ctx.rng() * n);
      const prev = sol.stackChoice[i];
      sol.stackChoice[i] = Math.floor(ctx.rng() * stacks.length);
      undo = () => { sol.stackChoice[i] = prev; };
    }

    const cand = decode(sol, containers, stacks, econ);
    const delta = cand.cost - cur.cost;
    if (delta <= 0 || ctx.rng() < Math.exp(-delta / Math.max(T, 1))) {
      cur = cand;
      if (cand.cost < best.cost) best = { cost: cand.cost, placement: cand.placement };
    } else if (undo) {
      undo();
    }
    T *= params.alpha;
  }
  return { stacks, best, iterations: params.iterations };
};

/**
 * Builds the A4 agent.
 *
 * Acceptance and stowage are one decision here, so the search runs inside
 * select() and stow() just applies the plan it produced. Both calls happen back
 * to back inside the same timed block in circuit.mjs, so the reported decision
 * time is the true cost of the metaheuristic.
 */
export const makeAnnealing = ({
  iterations = 800, T0 = 20_000_000, alpha = 0.995,
  restowCostPerMove = 3_000_000, name = 'annealing'
} = {}) => {
  const econ = { restowCostPerMove, roll: rollCost };
  let plan = null; // handed from select() to stow() within one port-call

  return {
    name,
    plan: 'A4',
    stochastic: true,
    label: 'A4 Metaheuristic (Simulated Annealing, ' + iterations + ' iter)',
    hyperparameters: { iterations, T0, alpha },

    select(orders, ctx) {
      const containers = orders.flatMap(unpack).map(c => ({
        ...c, hops: hopsBetween(ctx.ports, ctx.port, c.destination)
      }));
      const result = anneal(containers, ctx, econ, { iterations, T0, alpha });

      const slotFor = new Map();
      for (let i = 0; i < containers.length; i++) {
        const p = result.best.placement[i];
        if (!p) continue;
        const st = result.stacks[p.stack];
        slotFor.set(containers[i].id, { bay: st.bay, row: st.row, tier: st.tiers[p.idx] });
      }
      plan = slotFor;

      // An order is accepted only if ALL of its containers found a slot: taking
      // an order and then rolling part of it is strictly worse than declining
      // it outright, for non-committed cargo.
      return orders.filter((o) => {
        for (let q = 0; q < o.quantity; q++) {
          if (!slotFor.has(o.id + '_c' + q)) return false;
        }
        return true;
      });
    },

    stow(containers, grid, ctx) {
      // Replay in planned loading order: tier 02 is only reachable while the
      // stack above it is still empty, so applying the plan out of order would
      // silently invalidate the deep placements the search paid for.
      const ordered = containers.slice().sort((a, b) => {
        const ta = plan && plan.get(a.id), tb = plan && plan.get(b.id);
        const ra = ta ? BOTTOM_UP.indexOf(ta.tier) : 99;
        const rb = tb ? BOTTOM_UP.indexOf(tb.tier) : 99;
        return ra - rb;
      });

      const leftover = [];
      for (const c of ordered) {
        const s = plan && plan.get(c.id);
        if (s && validSlots(grid, c)
          .some(v => v.bay === s.bay && v.row === s.row && v.tier === s.tier)) {
          grid[s.bay][s.row][s.tier] = c;
          continue;
        }
        const fallback = validSlots(grid, c);
        if (fallback.length === 0) { leftover.push(c); continue; }
        const f = fallback[0];
        grid[f.bay][f.row][f.tier] = c;
      }
      plan = null;
      return leftover;
    }
  };
};

// ---------------------------------------------------------------------------
// registry
// ---------------------------------------------------------------------------

export const AGENTS = {
  /** A1 - lower bound. Coin-flip acceptance, random legal slot. */
  random: {
    name: 'random',
    plan: 'A1',
    stochastic: true,
    label: 'A1 Random',
    select: (orders, ctx) => orders.filter(() => ctx.rng() < 0.5),
    stow: (cs, grid, ctx) => stowRandom(cs, grid, ctx.rng)
  },

  /** A2 - the shipped SMART bot, both decisions taken from botEngine.js. */
  ruleSmart: {
    name: 'ruleSmart',
    plan: 'A2',
    label: 'A2 Rule-based (SMART)',
    select: (orders, ctx) => selectViaGameBot(orders, ctx, 'SMART'),
    stow: (cs, grid, ctx) => stowViaGameBot(cs, grid, ctx.port, ctx.ports, 'SMART')
  },

  /** A3 - greedy: value density under a capacity budget, overstow-aware stowage. */
  greedy: {
    name: 'greedy',
    plan: 'A3',
    label: 'A3 Greedy (multi-criteria)',
    select: greedySelect,
    stow: greedyStow
  },

  /** A4 - simulated annealing over the joint accept/stow decision. */
  annealing: makeAnnealing(),

  // --- diagnostic references, not part of the A1..A5 ranking ---------------

  /** Conservative floor: carry only what is contractually mandatory. */
  committedOnly: {
    name: 'committedOnly',
    plan: 'REF',
    label: 'Ref: committed only',
    select: (orders) => orders.filter(o => o.customerType === 'Committed'),
    stow: (cs, grid) => stowFirstFit(cs, grid)
  },

  /** Shipped GREEDY bot, exactly as built. */
  greedyAcceptAll: {
    name: 'greedyAcceptAll',
    plan: 'REF',
    label: 'Ref: shipped GREEDY bot',
    select: (orders, ctx) => selectViaGameBot(orders, ctx, 'GREEDY'),
    stow: (cs, grid, ctx) => stowViaGameBot(cs, grid, ctx.port, ctx.ports, 'GREEDY')
  },

  /** Shipped BALANCED bot, exactly as built. */
  balanced: {
    name: 'balanced',
    plan: 'REF',
    stochastic: true,
    label: 'Ref: shipped BALANCED bot',
    select: (orders, ctx) => selectViaGameBot(orders, ctx, 'BALANCED'),
    stow: (cs, grid, ctx) => stowViaGameBot(cs, grid, ctx.port, ctx.ports, 'BALANCED')
  }
};

/** The agents that are actually compared and ranked in the thesis. */
export const PLAN_LINEUP = ['random', 'ruleSmart', 'greedy', 'annealing'];

/** Reported alongside, but excluded from the A1..A5 ranking. */
export const REFERENCE_LINEUP = ['committedOnly', 'greedyAcceptAll', 'balanced'];

export const DEFAULT_LINEUP = [...PLAN_LINEUP, ...REFERENCE_LINEUP];

/**
 * Agents whose output depends on their own random stream, and which therefore
 * need independent repetitions per seed before their result means anything.
 * A deterministic agent gives the same answer every time, so replicating it
 * only burns CPU.
 */
export const isStochastic = (key) => Boolean(AGENTS[key] && AGENTS[key].stochastic);
