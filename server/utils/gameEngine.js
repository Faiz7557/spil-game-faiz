// Ports circuit definition
export const PORTS = ['SBY', 'MKS', 'JYP', 'MDN'];

// Vessel Bayplan specifications
// Bay 18: DRY only, 3 rows, 2 tiers (84, 82 - on-deck only)
// Bay 14 & 10: REEFER only, 4 rows, 3 tiers (84, 82, 02)
// Bay 06 & 02: DRY only, 4 rows, 3 tiers (84, 82, 02)
export const BAYS = ['18', '14', '10', '06', '02'];

export const getBayConfig = (bay) => {
  const isBay18 = bay === '18';
  return {
    rows: isBay18 ? ['01', '00', '02'] : ['03', '01', '02', '04'],
    tiers: isBay18 ? ['84', '82'] : ['84', '82', '02'],
    containerType: (bay === '14' || bay === '10' || bay === '22') ? 'REEFER' : 'DRY'
  };
};

/**
 * Creates a clean, empty vessel grid
 */
export const createEmptyGrid = (bays = BAYS) => {
  const grid = {};
  bays.forEach(bay => {
    grid[bay] = {};
    const config = getBayConfig(bay);
    config.rows.forEach(row => {
      grid[bay][row] = {};
      config.tiers.forEach(tier => {
        grid[bay][row][tier] = null;
      });
    });
  });
  return grid;
};

// Official Tariff Table (Informasi Tarif Muatan PT. SPIL)
const TARIFF_TABLE = {
  SBY: {
    MKS: { DRY: 18000000, REEFER: 30000000 },
    MDN: { DRY: 6000000, REEFER: 11000000 },
    JYP: { DRY: 16200000, REEFER: 24000000 }
  },
  MKS: {
    SBY: { DRY: 10000000, REEFER: 18000000 },
    MDN: { DRY: 12000000, REEFER: 20000000 },
    JYP: { DRY: 16000000, REEFER: 24000000 }
  },
  JYP: {
    SBY: { DRY: 13000000, REEFER: 19000000 },
    MKS: { DRY: 13000000, REEFER: 23000000 },
    MDN: { DRY: 11000000, REEFER: 17000000 }
  },
  MDN: {
    SBY: { DRY: 13000000, REEFER: 22000000 },
    MKS: { DRY: 14000000, REEFER: 24000000 },
    JYP: { DRY: 14000000, REEFER: 22000000 }
  }
};

/**
 * Generates random sales call orders at a given port
 */
export const generateOrders = (port, week, activePorts = PORTS) => {
  const nextPortIndex = (activePorts.indexOf(port) + 1) % activePorts.length;
  const destinations = activePorts.filter(p => p !== port);
  
  const customerNames = [
    'PT Pelayaran Harapan', 'CV Sinar Abadi', 'PT Borneo Logistics',
    'PT Papua Trans', 'PT Samudra Jaya', 'CV Maju Bersama',
    'PT Indo Cargo', 'PT Sumatra Express', 'CV Nusantara Carrier',
    'PT Khatulistiwa Ship'
  ];
  
  // Generate 6 to 10 orders
  const numOrders = Math.floor(Math.random() * 5) + 6; // 6 to 10
  const orders = [];
  
  for (let i = 0; i < numOrders; i++) {
    const customerName = customerNames[Math.floor(Math.random() * customerNames.length)];
    const customerType = Math.random() < 0.4 ? 'Committed' : 'Non-Committed';
    const containerType = Math.random() < 0.5 ? 'DRY' : 'REEFER';
    const destination = destinations[Math.floor(Math.random() * destinations.length)];
    
    // Quantity: 1 to 3 containers
    const quantity = Math.floor(Math.random() * 3) + 1;
    
    // Calculate tariff using official sheet, fall back to randomized logic for new unlocked ports
    let tariff = 0;
    if (TARIFF_TABLE[port] && TARIFF_TABLE[port][destination] && TARIFF_TABLE[port][destination][containerType]) {
      tariff = TARIFF_TABLE[port][destination][containerType];
    } else {
      if (containerType === 'DRY') {
        tariff = 10000000 + Math.floor(Math.random() * 5) * 1000000;
      } else {
        tariff = 16000000 + Math.floor(Math.random() * 7) * 1000000;
      }
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
 * Validates slot type restrictions and support structures.
 * Underdeck (02) is supported by tanktop.
 * On-deck (82) sits on hatch cover, supported without 02.
 * On-deck upper (84) requires on-deck lower (82).
 */
export const validateGridPhysics = (grid) => {
  const errors = [];
  const bays = Object.keys(grid);
  
  bays.forEach(bay => {
    const config = getBayConfig(bay);
    config.rows.forEach(row => {
      const stack = grid[bay][row];
      
      // 1. Container Type matching Bay slot type
      config.tiers.forEach(tier => {
        const container = stack[tier];
        if (container) {
          if (config.containerType === 'REEFER' && container.containerType !== 'REEFER') {
            errors.push(`Slot Bay ${bay}, Row ${row}, Tier ${tier} hanya menerima kontainer REEFER, tetapi berisi DRY.`);
          }
          if (config.containerType === 'DRY' && container.containerType !== 'DRY') {
            errors.push(`Slot Bay ${bay}, Row ${row}, Tier ${tier} hanya menerima kontainer DRY, tetapi berisi REEFER.`);
          }
        }
      });
      
      // 2. Stacking rule: Tier 84 requires Tier 82 in the same row
      if (stack['84'] && !stack['82']) {
        errors.push(`Kesalahan Fisika Kapal: Kontainer di Bay ${bay}, Row ${row}, Tier 84 melayang. Dibutuhkan Tier 82.`);
      }
    });
  });
  
  return {
    valid: errors.length === 0,
    errors
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
