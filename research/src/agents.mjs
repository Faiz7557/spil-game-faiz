/**
 * Agent registry.
 *
 * Every agent exposes the same two-method interface so the harness never needs
 * to know which class of algorithm it is driving:
 *
 *   select(orders, ctx) -> orders to accept
 *   stow(containers, grid, ctx) -> containers it could NOT place (mutates grid)
 *
 * ctx = { port, nextPort, week, ports, rng }. Draw all randomness from ctx.rng,
 * never Math.random, or the episode stops being reproducible.
 *
 * Current status against the thesis plan (A1..A5):
 *   A1 Random          -> `random`            done
 *   A2 Rule-based      -> `ruleSmart`         shipped bot, reused as-is
 *   A3 Greedy          -> TODO                multi-criteria slot scoring
 *   A4 Metaheuristic   -> TODO                simulated annealing over the bay plan
 *   A5 Deep RL         -> TODO                MaskablePPO, trained in Python
 *
 * `committedOnly`, `greedyAcceptAll` and `balanced` are not part of A1..A5. They
 * are diagnostic references: committedOnly is the conservative floor, and the
 * other two are the shipped bots kept for comparison against the game as built.
 */
import { validSlots } from './circuit.mjs';
import { executeBotStowagePlacement } from '../../server/utils/botEngine.js';

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
 * Delegates to the game's own placement code, so the shipped bots are measured
 * as they actually behave rather than as a reimplementation of them.
 *
 * Note: GREEDY and BALANCED share one code path in botEngine — verified
 * identical on 200/200 grids given identical cargo. Only SMART differs.
 */
export const stowViaGameBot = (containers, grid, port, ports, personality) => {
  const bot = { isBot: true, personality, pendingContainers: containers, cargoPool: [] };
  executeBotStowagePlacement(bot, grid, port, ports);
  return bot.pendingContainers;
};

export const AGENTS = {
  /** A1 — lower bound. Coin-flip acceptance, random legal slot. */
  random: {
    name: 'random',
    label: 'A1 Random',
    select: (orders, ctx) => orders.filter(() => ctx.rng() < 0.5),
    stow: (cs, grid, ctx) => stowRandom(cs, grid, ctx.rng)
  },

  /** Conservative reference: carry only what is contractually mandatory. */
  committedOnly: {
    name: 'committedOnly',
    label: 'Reference: committed only',
    select: (orders) => orders.filter(o => o.customerType === 'Committed'),
    stow: (cs, grid) => stowFirstFit(cs, grid)
  },

  /** A2 — the shipped SMART bot: tariff floor + destination-aware tier order. */
  ruleSmart: {
    name: 'ruleSmart',
    label: 'A2 Rule-based (SMART)',
    select: (orders) => orders.filter(
      o => o.customerType === 'Committed' || o.tariff >= 11_000_000),
    stow: (cs, grid, ctx) => stowViaGameBot(cs, grid, ctx.port, ctx.ports, 'SMART')
  },

  /** Shipped GREEDY bot: accept everything, first-fit. */
  greedyAcceptAll: {
    name: 'greedyAcceptAll',
    label: 'Shipped bot: GREEDY',
    select: (orders) => orders,
    stow: (cs, grid, ctx) => stowViaGameBot(cs, grid, ctx.port, ctx.ports, 'GREEDY')
  },

  /** Shipped BALANCED bot: accept ~60% of non-committed, first-fit. */
  balanced: {
    name: 'balanced',
    label: 'Shipped bot: BALANCED',
    select: (orders, ctx) => orders.filter(
      o => o.customerType === 'Committed' || ctx.rng() < 0.6),
    stow: (cs, grid, ctx) => stowViaGameBot(cs, grid, ctx.port, ctx.ports, 'BALANCED')
  }
};

export const DEFAULT_LINEUP = [
  'random', 'committedOnly', 'ruleSmart', 'greedyAcceptAll', 'balanced'
];
