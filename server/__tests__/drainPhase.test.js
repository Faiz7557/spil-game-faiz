import { describe, it, expect } from 'vitest';
import {
  HORIZON_WEEKS,
  DRAIN_WEEKS,
  TOTAL_GAME_WEEKS
} from '../../shared/gameConstants.js';
import {
  createEmptyGrid,
  PORTS,
  calculateDischargeRevenue,
  calculateDischargeCount,
  calculateRestows
} from '../utils/gameEngine.js';

describe('Drain Phase & Horizon Constants Tests', () => {
  it('correctly configures Horizon (8), Drain (3), and Total (11) weeks', () => {
    expect(HORIZON_WEEKS).toBe(8);
    expect(DRAIN_WEEKS).toBe(3);
    expect(TOTAL_GAME_WEEKS).toBe(11);
    expect(HORIZON_WEEKS + DRAIN_WEEKS).toBe(TOTAL_GAME_WEEKS);
  });

  it('discharges cargo and calculates revenue only for containers matching arrival port', () => {
    const grid = createEmptyGrid();
    // Place a container with destination 'MKS' in Bay 02, Row 01, Tier 02
    grid['02']['01']['02'] = {
      id: 'c1',
      destination: 'MKS',
      tariff: 8500000,
      containerType: 'DRY'
    };
    // Place a container with destination 'JYP' in Bay 02, Row 02, Tier 02
    grid['02']['02']['02'] = {
      id: 'c2',
      destination: 'JYP',
      tariff: 12000000,
      containerType: 'DRY'
    };

    // Arrive at MKS
    const dischargedRevenue = calculateDischargeRevenue(grid, 'MKS');
    const dischargeCount = calculateDischargeCount(grid, 'MKS');

    expect(dischargedRevenue).toBe(8500000);
    expect(dischargeCount).toBe(1);
  });

  it('calculates restows accurately when blocked underdeck container is unloaded', () => {
    const grid = createEmptyGrid();
    // Current port SBY -> next port is MKS.
    // Stack at Bay 02 Row 01:
    // Tier 02 (Underdeck): Destined for MKS (Next Port, unloads at MKS)
    // Tier 82 (Deck): Destined for JYP (Later Port, stays onboard and blocks Tier 02)
    grid['02']['01']['02'] = { id: 'c_under', destination: 'MKS' };
    grid['02']['01']['82'] = { id: 'c_deck', destination: 'JYP' };

    const restowResult = calculateRestows(grid, 'SBY', PORTS);
    expect(restowResult.restowContainersCount).toBe(1);
    expect(restowResult.restowMovementsCount).toBe(2);
    expect(restowResult.restowedList.length).toBe(1);
    expect(restowResult.restowedList[0]).toEqual({ bay: '02', row: '01', tier: '82' });
  });
});
