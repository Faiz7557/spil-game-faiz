// Vessel layout, bay config, empty-grid, and physics validation now live in
// shared/gameConstants.js (single source of truth for client + server +
// research). Re-exported here so every existing importer of gameEngine.js
// keeps working unchanged.
export {
  PORTS,
  PORT_CODES_INFO,
  TARIFF_TABLE,
  GLOSSARY_SECTIONS,
  BAYS,
  ALL_BAYS,
  OFFLINE_BAYS_BY_LEVEL,
  REEFER_BAYS,
  getBayConfig,
  createEmptyGrid,
  validateGridPhysics
} from '../../shared/gameConstants.js';
// `export ... from` re-exports but does not bind these locally, and several
// functions below (generateOrders, calculateRestows) use them as defaults.
import { PORTS, getBayConfig, TARIFF_TABLE } from '../../shared/gameConstants.js';

/**
 * Deterministic PRNG (mulberry32). Returns a function with the same contract
 * as Math.random, so any call site can accept either one.
 * Reproducible scenarios are a hard requirement for the offline experiments.
 */
export const createRng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * FNV-1a 32-bit hash over the joined parts. Used to derive a stable sub-seed
 * per (seed, week, port) so every port-call is reproducible on its own,
 * without the server having to carry generator state between requests.
 */
export const hashSeed = (...parts) => {
  const str = parts.join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/**
 * Resolves the RNG for one port-call. A null/undefined seed keeps the original
 * non-reproducible behaviour so normal gameplay is unchanged.
 */
export const rngForPortCall = (seed, week, port) => {
  if (seed === undefined || seed === null || seed === '') return Math.random;
  return createRng(hashSeed(seed, week, port));
};



/**
 * Scenario parameters for the demand generator.
 *
 * These are the three knobs the thesis sweeps in the sensitivity experiment.
 * The defaults reproduce the shipped game EXACTLY - same rng draw sequence,
 * same values - so passing nothing keeps client/server behaviour unchanged and
 * keeps every previously recorded seed reproducible.
 *
 *   intensity      scales the number of orders per port-call, hence lambda,
 *                  hence the offered load rho. 1.0 = 6..10 orders (mean 8).
 *   reeferShare    sigma - probability a container is REEFER.
 *   committedShare kappa - probability a customer is Committed.
 */
export const DEFAULT_SCENARIO = Object.freeze({
  intensity: 1.0,
  reeferShare: 0.30,
  committedShare: 0.40
});

export const generateOrders = (
  port, week, activePorts = PORTS, rng = Math.random, scenario = DEFAULT_SCENARIO
) => {
  const { intensity, reeferShare, committedShare } = { ...DEFAULT_SCENARIO, ...scenario };
  const destinations = activePorts.filter(p => p !== port);
  
  const customerNames = [
    'PT Pelayaran Harapan', 'CV Sinar Abadi', 'PT Borneo Logistics',
    'PT Papua Trans', 'PT Samudra Jaya', 'CV Maju Bersama',
    'PT Indo Cargo', 'PT Sumatra Express', 'CV Nusantara Carrier',
    'PT Khatulistiwa Ship'
  ];
  
  // Base draw is 6..10 orders (mean 8); `intensity` scales it. The base draw
  // happens unconditionally so the rng stream is identical at every intensity -
  // two strata that differ only in intensity still share the same underlying
  // scenario, which is what makes the factorial design a clean comparison.
  const baseOrders = Math.floor(rng() * 5) + 6;
  const numOrders = Math.max(1, Math.round(baseOrders * intensity));
  const orders = [];
  
  for (let i = 0; i < numOrders; i++) {
    const customerName = customerNames[Math.floor(rng() * customerNames.length)];
    const customerType = rng() < committedShare ? 'Committed' : 'Non-Committed';
    // Nominal REEFER share is 30% (DEFAULT_SCENARIO.reeferShare). At 50% - the
    // original value - measured demand exceeded REEFER capacity by 34%
    // (rho_REEFER = 1.34, infeasible). 30% brings rho_REEFER to ~0.80 while
    // leaving total demand and overall utilisation unchanged, since only the
    // DRY/REEFER split moves, not order count or quantity.
    const containerType = rng() < (1 - reeferShare) ? 'DRY' : 'REEFER';
    const destination = destinations[Math.floor(rng() * destinations.length)];
    
    // Quantity: 1 to 3 containers
    const quantity = Math.floor(rng() * 3) + 1;
    
    // Calculate tariff using official SPIL sheet (4 canonical ports)
    let tariff = 0;
    if (TARIFF_TABLE[port] && TARIFF_TABLE[port][destination] && TARIFF_TABLE[port][destination][containerType]) {
      tariff = TARIFF_TABLE[port][destination][containerType];
    } else {
      tariff = containerType === 'DRY' ? 10000000 : 18000000;
    }
    
    orders.push({
      id: `ord_${week}_${port}_${i}`,
      customerName,
      customerType,
      containerType,
      origin: port,
      destination,
      quantity,
      tariff,
      accepted: false
    });
  }
  
  return orders;
};

/**
 * Scans each vertical stack inside all bays to find Later Port containers blocking Next Port containers.
 * Next Port containers are destined for the port immediately following the current port.
 * Returns: { restowContainersCount, restowMovementsCount, restowedList }
 */
export const calculateRestows = (grid, currentPort, activePorts = PORTS) => {
  const currentPortIndex = activePorts.indexOf(currentPort);
  const nextPort = activePorts[(currentPortIndex + 1) % activePorts.length];
  
  let restowContainersCount = 0;
  const restowedList = []; // Array of { bay, row, tier } for frontend visualization
  const bays = Object.keys(grid);
  
  bays.forEach(bay => {
    const config = getBayConfig(bay);
    config.rows.forEach(row => {
      const stack = grid[bay][row];
      // Tiers ordered bottom to top: '02' (underdeck) -> '82' (on-deck lower) -> '84' (on-deck upper)
      // Check which tiers exist dynamically
      const activeTiers = config.tiers.includes('02') ? ['02', '82', '84'] : ['82', '84'];
      
      let nextPortFound = false;
      
      // Traverse from bottom to top
      for (const tier of activeTiers) {
        const container = stack[tier];
        if (!container) continue;
        
        // If container is destined for the Next Port, it will be unloaded here
        if (container.destination === nextPort) {
          nextPortFound = true;
        } else {
          // If container is destined for a Later Port, and we've already found a Next Port container
          // underneath it, this Later Port container blocks it!
          if (nextPortFound) {
            restowContainersCount++;
            restowedList.push({ bay, row, tier });
          }
        }
      }
    });
  });
  
  const restowMovementsCount = restowContainersCount * 2; // 1 container = 2 movements (un-stack and re-stack)
  return {
    restowContainersCount,
    restowMovementsCount,
    restowedList
  };
};

/**
 * Computes the Rolling Penalty (Gagal Muat) for accepted and committed orders
 */
export const calculateRollingPenalties = (orders, grid, currentPort) => {
  let rollingPenaltyTotal = 0;
  let rolledContainersCount = 0;
  const rolledList = []; // Detailed records
  
  // Count how many containers are loaded on the grid for each order
  const orderPlacementCounts = {};
  const bays = Object.keys(grid);
  
  bays.forEach(bay => {
    const config = getBayConfig(bay);
    config.rows.forEach(row => {
      config.tiers.forEach(tier => {
        const container = grid[bay][row][tier];
        if (container && container.origin === currentPort) {
          orderPlacementCounts[container.orderId] = (orderPlacementCounts[container.orderId] || 0) + 1;
        }
      });
    });
  });
  
  orders.forEach(order => {
    const placed = orderPlacementCounts[order.id] || 0;
    const missing = order.quantity - placed;
    
    if (missing > 0) {
      let penaltyPerUnit = 0;
      let shouldPenalize = false;
      
      if (order.customerType === 'Committed') {
        // Committed customer: penalty applies if ignored or failed to load
        shouldPenalize = true;
        penaltyPerUnit = order.containerType === 'DRY' ? 16000000 : 24000000;
      } else {
        // Non-Committed customer: penalty ONLY applies if the order was accepted but failed to load
        if (order.accepted) {
          shouldPenalize = true;
          penaltyPerUnit = order.containerType === 'DRY' ? 8000000 : 16000000;
        }
      }
      
      if (shouldPenalize) {
        const orderPenalty = missing * penaltyPerUnit;
        rollingPenaltyTotal += orderPenalty;
        rolledContainersCount += missing;
        
        rolledList.push({
          orderId: order.id,
          customerName: order.customerName,
          customerType: order.customerType,
          containerType: order.containerType,
          missingCount: missing,
          penaltyPerUnit,
          totalPenalty: orderPenalty
        });
      }
    }
  });
  
  return {
    rollingPenaltyTotal,
    rolledContainersCount,
    rolledList
  };
};

/**
 * Calculates gross revenue of all containers successfully loaded at this port
 * ('load' recognition - kept for reference/research use, not the shipped
 * convention; see calculateDischargeRevenue).
 */
export const calculateGrossRevenue = (grid, currentPort) => {
  let grossRevenue = 0;
  const bays = Object.keys(grid);
  bays.forEach(bay => {
    const config = getBayConfig(bay);
    config.rows.forEach(row => {
      config.tiers.forEach(tier => {
        const container = grid[bay][row][tier];
        if (container && container.origin === currentPort) {
          grossRevenue += container.tariff;
        }
      });
    });
  });
  return grossRevenue;
};

/**
 * Calculates revenue of all containers about to be discharged at nextPort
 * ('discharge' recognition - the shipped convention). A container loaded but
 * still aboard when the horizon ends (week 8) earns nothing under this rule;
 * that is a deliberate tradeoff for rewarding cargo that actually completes
 * its voyage, matched on both the multiplayer and offline paths.
 */
export const calculateDischargeRevenue = (grid, nextPort) => {
  let revenue = 0;
  const bays = Object.keys(grid);
  bays.forEach(bay => {
    const config = getBayConfig(bay);
    config.rows.forEach(row => {
      config.tiers.forEach(tier => {
        const container = grid[bay][row][tier];
        if (container && container.destination === nextPort) {
          revenue += container.tariff;
        }
      });
    });
  });
  return revenue;
};

/**
  * Counts all containers about to be discharged at nextPort (discharge move count).
  */
export const calculateDischargeCount = (grid, nextPort) => {
  let count = 0;
  const bays = Object.keys(grid);
  bays.forEach(bay => {
    const config = getBayConfig(bay);
    config.rows.forEach(row => {
      config.tiers.forEach(tier => {
        const container = grid[bay][row][tier];
        if (container && container.destination === nextPort) {
          count++;
        }
      });
    });
  });
  return count;
};

/**
 * Unloads Next Port containers and performs slide-down physics (Tier 84 to Tier 82)
 * Next Port is the destination port we are sailing to.
 */
export const processSailingTransition = (grid, nextPort) => {
  // Create a deep copy of the grid
  const newGrid = JSON.parse(JSON.stringify(grid));
  const bays = Object.keys(newGrid);
  
  bays.forEach(bay => {
    const config = getBayConfig(bay);
    config.rows.forEach(row => {
      const stack = newGrid[bay][row];
      
      // 1. Unload next port containers
      config.tiers.forEach(tier => {
        const container = stack[tier];
        if (container && container.destination === nextPort) {
          stack[tier] = null;
        }
      });
      
      // 2. Slide down physics: Tier 84 slides down to Tier 82 if 82 is empty
      // Underdeck (02) does not cause 82 to slide down because of hatch cover
      if (stack['84'] && !stack['82']) {
        stack['82'] = stack['84'];
        stack['84'] = null;
      }
    });
  });
  
  return newGrid;
};
