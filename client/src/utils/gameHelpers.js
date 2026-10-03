// Vessel layout, bay config, empty-grid, and physics validation now live in
// shared/gameConstants.js (single source of truth for client + server +
// research) - re-exported here so nothing importing from gameHelpers has to
// change. This is also what fixed the client/server REEFER_BAYS drift.
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
  validateGridPhysics,
  HORIZON_WEEKS,
  DRAIN_WEEKS,
  TOTAL_GAME_WEEKS
} from '../../../shared/gameConstants.js';
// `export ... from` re-exports but does not bind PORTS locally, and
// getNextPort/getLaterPorts below need the local binding.
import { PORTS, getBayConfig } from '../../../shared/gameConstants.js';

export const formatRupiah = (value) => {
  if (value === undefined || value === null) return 'Rp 0';
  const prefix = value < 0 ? '-Rp ' : 'Rp ';
  const absVal = Math.abs(value);
  return prefix + absVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const PORT_NAMES = {
  SBY: 'Surabaya',
  MKS: 'Makassar',
  JYP: 'Jayapura',
  MDN: 'Medan',
  BJM: 'Banjarmasin',
  JKT: 'Jakarta',
  BLI: 'Bali'
};

export const PORT_COLORS = {
  SBY: 'from-emerald-500 to-teal-600 border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
  MKS: 'from-blue-500 to-indigo-600 border-blue-500/50 bg-blue-500/10 text-blue-400',
  JYP: 'from-purple-500 to-fuchsia-600 border-purple-500/50 bg-purple-500/10 text-purple-400',
  MDN: 'from-orange-500 to-amber-600 border-orange-500/50 bg-orange-500/10 text-orange-400',
  BJM: 'from-cyan-500 to-blue-600 border-cyan-500/50 bg-cyan-500/10 text-cyan-400',
  JKT: 'from-rose-500 to-red-600 border-rose-500/50 bg-rose-500/10 text-rose-400',
  BLI: 'from-yellow-500 to-amber-600 border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
};

export const PORT_SOLID_BG = {
  SBY: 'bg-emerald-600 text-white border-emerald-500',
  MKS: 'bg-blue-600 text-white border-blue-500',
  JYP: 'bg-purple-600 text-white border-purple-500',
  MDN: 'bg-orange-600 text-white border-orange-500',
  BJM: 'bg-cyan-600 text-white border-cyan-500',
  JKT: 'bg-rose-600 text-white border-rose-500',
  BLI: 'bg-yellow-600 text-white border-yellow-500'
};

export const PORT_BORDER_HOVER = {
  SBY: 'hover:border-emerald-400/50 hover:bg-emerald-500/5',
  MKS: 'hover:border-blue-400/50 hover:bg-blue-500/5',
  JYP: 'hover:border-purple-400/50 hover:bg-purple-500/5',
  MDN: 'hover:border-orange-400/50 hover:bg-orange-500/5',
  BJM: 'hover:border-cyan-400/50 hover:bg-cyan-500/5',
  JKT: 'hover:border-rose-400/50 hover:bg-rose-500/5',
  BLI: 'hover:border-yellow-400/50 hover:bg-yellow-500/5'
};

export const getNextPort = (port, activePorts) => {
  const ports = (activePorts && activePorts.length > 0) ? activePorts : PORTS;
  const idx = ports.indexOf(port);
  if (idx === -1) return ports[0];
  return ports[(idx + 1) % ports.length];
};

export const getLaterPorts = (port, activePorts) => {
  const ports = (activePorts && activePorts.length > 0) ? activePorts : PORTS;
  const idx = ports.indexOf(port);
  if (idx === -1) return [];
  const later = [];
  for (let i = 2; i < ports.length; i++) {
    later.push(ports[(idx + i) % ports.length]);
  }
  return later;
};

/**
 * Previews whether placing a specific container at bay, row, tier introduces restow penalties.
 * Returns: { causesRestow: boolean, restowCount: number, penaltyCost: number, explanation: string }
 */
export const previewPlacementOverstow = (grid, bay, row, tier, container, currentPort, activePorts) => {
  if (!grid || !bay || !row || !tier || !container) {
    return { causesRestow: false, restowCount: 0, penaltyCost: 0, explanation: '' };
  }

  const nextPort = getNextPort(currentPort, activePorts);
  const cfg = getBayConfig(bay);
  const tiers = cfg.tiers; // e.g. ['84', '82', '02'] top to bottom
  const stack = grid[bay]?.[row] || {};
  const currentTierIdx = tiers.indexOf(tier);

  if (currentTierIdx === -1) {
    return { causesRestow: false, restowCount: 0, penaltyCost: 0, explanation: '' };
  }

  let restowCount = 0;
  let explanation = '';

  // Case 1: The container being placed is for a LATER PORT, and sits ABOVE a container for NEXT PORT
  if (container.destination !== nextPort) {
    for (let i = currentTierIdx + 1; i < tiers.length; i++) {
      const lower = stack[tiers[i]];
      if (lower && lower.destination === nextPort) {
        restowCount++;
      }
    }
    if (restowCount > 0) {
      explanation = `Kontainer tujuan ${container.destination} akan menutupi ${restowCount} kontainer tujuan ${nextPort} di bawahnya. Menimbulkan denda restow saat tiba di ${nextPort}.`;
    }
  }

  // Case 2: The container being placed is for NEXT PORT, and sits BELOW an already existing LATER PORT container
  if (container.destination === nextPort) {
    for (let i = 0; i < currentTierIdx; i++) {
      const higher = stack[tiers[i]];
      if (higher && higher.destination !== nextPort) {
        restowCount++;
      }
    }
    if (restowCount > 0) {
      explanation = `Kontainer tujuan ${nextPort} ditaruh di bawah kontainer tujuan ${stack[tiers[0]]?.destination || 'Later Port'}. Kontainer di atasnya harus dipindah (restow) di ${nextPort}.`;
    }
  }

  const penaltyCost = restowCount * 6000000; // 2 movements x Rp 3.000.000 = Rp 6.000.000 per blocker

  return {
    causesRestow: restowCount > 0,
    restowCount,
    penaltyCost,
    explanation
  };
};

/**
 * Calculates current vessel capacity, free slots, and pending demand by container type.
 */
export const calculateCapacityMetrics = (grid, pendingContainers = []) => {
  if (!grid) {
    return {
      dry: { total: 0, occupied: 0, free: 0, pending: 0, percent: 0 },
      reefer: { total: 0, occupied: 0, free: 0, pending: 0, percent: 0 },
      totalSlots: 0,
      totalOccupied: 0,
      totalFree: 0
    };
  }

  let dryTotal = 0;
  let dryOccupied = 0;
  let reeferTotal = 0;
  let reeferOccupied = 0;

  Object.keys(grid).forEach(bay => {
    const cfg = getBayConfig(bay);
    const isReefer = cfg.containerType === 'REEFER';
    const numSlots = cfg.rows.length * cfg.tiers.length;

    if (isReefer) {
      reeferTotal += numSlots;
    } else {
      dryTotal += numSlots;
    }

    cfg.rows.forEach(row => {
      cfg.tiers.forEach(tier => {
        if (grid[bay]?.[row]?.[tier]) {
          if (isReefer) {
            reeferOccupied++;
          } else {
            dryOccupied++;
          }
        }
      });
    });
  });

  const dryPending = pendingContainers.filter(c => c.containerType === 'DRY').length;
  const reeferPending = pendingContainers.filter(c => c.containerType === 'REEFER').length;

  const dryFree = Math.max(0, dryTotal - dryOccupied);
  const reeferFree = Math.max(0, reeferTotal - reeferOccupied);

  return {
    dry: {
      total: dryTotal,
      occupied: dryOccupied,
      free: dryFree,
      pending: dryPending,
      percent: dryTotal > 0 ? Math.round((dryOccupied / dryTotal) * 100) : 0,
      isOverbooked: dryPending > dryFree
    },
    reefer: {
      total: reeferTotal,
      occupied: reeferOccupied,
      free: reeferFree,
      pending: reeferPending,
      percent: reeferTotal > 0 ? Math.round((reeferOccupied / reeferTotal) * 100) : 0,
      isOverbooked: reeferPending > reeferFree
    },
    totalSlots: dryTotal + reeferTotal,
    totalOccupied: dryOccupied + reeferOccupied,
    totalFree: dryFree + reeferFree,
    overallPercent: (dryTotal + reeferTotal) > 0 
      ? Math.round(((dryOccupied + reeferOccupied) / (dryTotal + reeferTotal)) * 100) 
      : 0
  };
};


