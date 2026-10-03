import { describe, it, expect } from 'vitest';
import {
  BOT_OMEGA_PROFILE,
  executeBotCargoSelection,
  executeBotStowagePlacement,
  queryDrlService
} from '../utils/botEngine.js';
import { createEmptyGrid, PORTS } from '../utils/gameEngine.js';

describe('Bot Omega (DRL) Engine Tests', () => {
  it('exposes valid BOT_OMEGA_PROFILE', () => {
    expect(BOT_OMEGA_PROFILE.personality).toBe('DRL');
    expect(BOT_OMEGA_PROFILE.isBot).toBe(true);
    expect(BOT_OMEGA_PROFILE.name).toContain('Bot Omega');
  });

  it('Bot Omega accepts high yield and committed cargo in heuristic fallback', () => {
    const omegaBot = {
      ...BOT_OMEGA_PROFILE,
      cargoPool: [
        { id: 'o1', customerType: 'Non-Committed', quantity: 1, tariff: 8000000 },  // Lower than 10M -> declined
        { id: 'o2', customerType: 'Non-Committed', quantity: 1, tariff: 12000000 }, // >= 10M -> accepted
        { id: 'o3', customerType: 'Committed', quantity: 1, tariff: 4000000 }       // Committed -> accepted
      ],
      pendingContainers: []
    };

    executeBotCargoSelection(omegaBot, 'SBY', PORTS);

    expect(omegaBot.pendingContainers.length).toBe(2);
    expect(omegaBot.pendingContainers.map(c => c.orderId)).toContain('o2');
    expect(omegaBot.pendingContainers.map(c => c.orderId)).toContain('o3');
    expect(omegaBot.cargoPool.length).toBe(1);
    expect(omegaBot.cargoPool[0].id).toBe('o1');
  });

  it('Bot Omega stows downstream containers underdeck and immediate containers on deck', () => {
    // Current port SBY. Next port MKS. Later port JYP.
    const omegaBot = {
      ...BOT_OMEGA_PROFILE,
      pendingContainers: [
        { id: 'c_next', containerType: 'DRY', destination: 'MKS' },
        { id: 'c_later', containerType: 'DRY', destination: 'JYP' }
      ]
    };

    const grid = createEmptyGrid();
    delete grid['18']; // Bay 18 has no underdeck
    executeBotStowagePlacement(omegaBot, grid, 'SBY', PORTS);

    let nextSlot, laterSlot;
    Object.keys(grid).forEach(bay => {
      Object.keys(grid[bay]).forEach(row => {
        Object.keys(grid[bay][row]).forEach(tier => {
          if (grid[bay][row][tier]?.id === 'c_next') nextSlot = { bay, row, tier };
          if (grid[bay][row][tier]?.id === 'c_later') laterSlot = { bay, row, tier };
        });
      });
    });

    expect(laterSlot.tier).toBe('02');
    expect(nextSlot.tier).toBe('82');
  });

  it('queryDrlService gracefully returns null when AI service is offline', async () => {
    const result = await queryDrlService({
      currentPort: 'SBY',
      activePorts: PORTS,
      cargoPool: []
    });
    // Since ai-service is not running during unit tests, it safely catches and returns null
    expect(result).toBeNull();
  });
});
