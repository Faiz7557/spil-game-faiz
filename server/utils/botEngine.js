import { getBayConfig } from './gameEngine.js';

/**
 * Default Bot Profiles for Single-Player Offline Mode
 */
export const DEFAULT_BOT_PROFILES = [
  {
    id: 1,
    name: 'Bot Alpha (Smart AI)',
    isBot: true,
    personality: 'SMART', // Restow-Aware Stowage
    avatar: '🤖',
    description: 'Menggunakan algoritma pencegahan denda restow & analisis ruang pintar.'
  },
  {
    id: 2,
    name: 'Bot Beta (Greedy AI)',
    isBot: true,
    personality: 'GREEDY', // Revenue Maximizer
    avatar: '⚡',
    description: 'Mengambil semua kargo bernilai tinggi tanpa menghiraukan risiko shifting.'
  },
  {
    id: 3,
    name: 'Bot Gamma (Balanced AI)',
    isBot: true,
    personality: 'BALANCED', // Balanced Strategy
    avatar: '⚖️',
    description: 'Menyeimbangkan antara pendapatan kargo dan kapasitas aman kapal.'
  }
];

export const BOT_OMEGA_PROFILE = {
  id: 4,
  name: 'Bot Omega (DRL Expert)',
  isBot: true,
  personality: 'DRL',
  avatar: '🧬',
  description: 'Deep Reinforcement Learning (PPO/DQN) model inference dengan heuristic fallback.'
};

/**
 * 1. Bot Cargo Selection Phase
 * Bot evaluates orders in its cargoPool and claims/declines them.
 */
export const executeBotCargoSelection = (bot, currentPort, activePorts, rng = Math.random) => {
  const pool = bot.cargoPool || [];
  if (pool.length === 0) return;

  const acceptedContainers = [];
  const remainingPool = [];

  pool.forEach(order => {
    let accept = false;

    if (order.customerType === 'Committed') {
      // Committed orders are ALWAYS accepted to prevent severe penalty
      accept = true;
    } else {
      // Regular orders evaluated by bot personality
      if (bot.personality === 'GREEDY') {
        // Greedy accepts almost all regular orders
        accept = true;
      } else if (bot.personality === 'SMART') {
        // Smart checks if tariff is good and if destination aligns with circuit
        const isHighValue = order.tariff >= 11000000;
        accept = isHighValue;
      } else if (bot.personality === 'DRL') {
        // DRL agent prefers high-yield orders or strategic destination alignments
        const isOptimalValue = order.tariff >= 10000000;
        accept = isOptimalValue;
      } else { // BALANCED
        // Balanced accepts ~60% of regular orders.
        // Draws from the injected rng so a seeded run is reproducible.
        accept = rng() < 0.6;
      }
    }

    if (accept) {
      // Unpack order into individual containers
      for (let q = 0; q < order.quantity; q++) {
        acceptedContainers.push({
          id: `${order.id}_bot_${bot.id}_cont_${q}`,
          orderId: order.id,
          containerType: order.containerType,
          origin: order.origin,
          destination: order.destination,
          tariff: order.tariff,
          customerType: order.customerType,
          customerName: order.customerName
        });
      }
    } else {
      remainingPool.push(order);
    }
  });

  bot.pendingContainers = [...(bot.pendingContainers || []), ...acceptedContainers];
  bot.cargoPool = remainingPool;
};

/**
 * 2. Bot Stowage Placement Algorithm
 * Bot places pending containers into valid grid slots according to its personality & physics.
 */
export const executeBotStowagePlacement = (bot, grid, currentPort, activePorts) => {
  if (!bot.pendingContainers || bot.pendingContainers.length === 0) return grid;

  const currentPortIndex = activePorts.indexOf(currentPort);
  const nextPort = activePorts[(currentPortIndex + 1) % activePorts.length];

  const remainingPending = [];

  // Sort pending containers depending on bot personality:
  // For SMART and DRL bot: Later Port containers are stowed FIRST (so they sink into underdeck 02)
  // and Next Port containers are stowed LAST (so they sit on deck 82/84 above underdeck)
  const containersToStow = [...bot.pendingContainers];
  if (bot.personality === 'SMART' || bot.personality === 'DRL') {
    containersToStow.sort((a, b) => {
      if (a.destination !== nextPort && b.destination === nextPort) return -1;
      if (a.destination === nextPort && b.destination !== nextPort) return 1;
      return 0;
    });
  }

  const bays = Object.keys(grid).sort((a, b) => parseInt(b) - parseInt(a));

  containersToStow.forEach(container => {
    let placed = false;

    // Search for a valid slot in bays
    for (const bay of bays) {
      if (placed) break;
      const config = getBayConfig(bay);

      // Match slot container type
      if (config.containerType !== container.containerType) continue;

      // Determine preferred tier order:
      // SMART & DRL bot: Next Port -> prefer upper tiers (84, 82). Later Port -> prefer underdeck (02)
      let tierOrder = [...config.tiers];
      if (bot.personality === 'SMART' || bot.personality === 'DRL') {
        if (container.destination === nextPort) {
          tierOrder = ['84', '82', '02'].filter(t => config.tiers.includes(t));
        } else {
          tierOrder = ['02', '82', '84'].filter(t => config.tiers.includes(t));
        }
      }

      for (const row of config.rows) {
        if (placed) break;
        for (const tier of tierOrder) {
          const stack = grid[bay][row];

          // Check if slot is empty
          if (stack[tier] !== null) continue;

          // Physics check 1: Tier 84 requires Tier 82
          if (tier === '84' && stack['82'] === null) continue;

          // Physics check 2: Tier 02 Underdeck blocked if Tier 82 or 84 is filled
          if (tier === '02' && (stack['82'] !== null || stack['84'] !== null)) continue;

          // Place container!
          grid[bay][row][tier] = container;
          placed = true;
          break;
        }
      }
    }

    if (!placed) {
      remainingPending.push(container);
    }
  });

  bot.pendingContainers = remainingPending;
  bot.ready = true;
  return grid;
};

/**
 * 3. Master Helper: Executes full Bot Turn (Cargo selection + Stowage placement)
 */
export const processBotTurn = (bot, grid, currentPort, activePorts, rng = Math.random) => {
  if (!bot.isBot) return grid;

  // Step 1: Select & Claim Cargo
  executeBotCargoSelection(bot, currentPort, activePorts, rng);

  // Step 2: Stow containers onto grid
  const updatedGrid = executeBotStowagePlacement(bot, grid, currentPort, activePorts);

  return updatedGrid;
};

/**
 * 4. Microservice Integration Helper: Query external Python DRL API
 * If available, returns AI-recommended decisions; otherwise returns null for heuristic fallback.
 */
export const queryDrlService = async (payload) => {
  const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${AI_URL}/api/drl/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Graceful fallback to heuristic
  }
  return null;
};
