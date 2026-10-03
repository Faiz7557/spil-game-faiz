import { describe, it, expect } from 'vitest';
import {
  executeBotCargoSelection,
  executeBotStowagePlacement,
  DEFAULT_BOT_PROFILES
} from '../utils/botEngine.js';
import { createEmptyGrid, PORTS } from '../utils/gameEngine.js';

describe('Bot Engine Tests', () => {
  it('GREEDY bot accepts all regular orders', () => {
    const greedyBot = { id: 2, personality: 'GREEDY', cargoPool: [
      { id: 'o1', customerType: 'Non-Committed', quantity: 1, tariff: 5000000 },
      { id: 'o2', customerType: 'Committed', quantity: 1, tariff: 1000000 }
    ], pendingContainers: [] };
    
    executeBotCargoSelection(greedyBot, 'SBY', PORTS, Math.random);
    
    expect(greedyBot.pendingContainers.length).toBe(2);
    expect(greedyBot.cargoPool.length).toBe(0);
  });

  it('SMART bot filters by tariff >= 11,000,000', () => {
    const smartBot = { id: 1, personality: 'SMART', cargoPool: [
      { id: 'o1', customerType: 'Non-Committed', quantity: 1, tariff: 10000000 }, // Rejected
      { id: 'o2', customerType: 'Non-Committed', quantity: 1, tariff: 11000000 }, // Accepted
      { id: 'o3', customerType: 'Committed', quantity: 1, tariff: 5000000 } // Accepted (Committed)
    ], pendingContainers: [] };
    
    executeBotCargoSelection(smartBot, 'SBY', PORTS, Math.random);
    
    expect(smartBot.pendingContainers.length).toBe(2);
    expect(smartBot.pendingContainers.map(c => c.orderId)).toContain('o2');
    expect(smartBot.pendingContainers.map(c => c.orderId)).toContain('o3');
    expect(smartBot.cargoPool.length).toBe(1);
    expect(smartBot.cargoPool[0].id).toBe('o1');
  });

  it('BALANCED bot uses stochastic acceptance', () => {
    const balancedBot = { id: 3, personality: 'BALANCED', cargoPool: [
      { id: 'o1', customerType: 'Non-Committed', quantity: 1, tariff: 10000000 }
    ], pendingContainers: [] };
    
    // Stub RNG to return 0.5 (accepted < 0.6)
    const rngAccept = () => 0.5;
    executeBotCargoSelection(balancedBot, 'SBY', PORTS, rngAccept);
    expect(balancedBot.pendingContainers.length).toBe(1);
    expect(balancedBot.cargoPool.length).toBe(0);

    // Reset and test rejection
    balancedBot.cargoPool = [{ id: 'o2', customerType: 'Non-Committed', quantity: 1, tariff: 10000000 }];
    balancedBot.pendingContainers = [];
    const rngReject = () => 0.7; // rejected >= 0.6
    executeBotCargoSelection(balancedBot, 'SBY', PORTS, rngReject);
    expect(balancedBot.pendingContainers.length).toBe(0);
    expect(balancedBot.cargoPool.length).toBe(1);
  });

  it('SMART bot sorts later-port containers first for stowage', () => {
    // Current port SBY. Next port MKS. Later port JYP.
    const smartBot = { id: 1, personality: 'SMART', pendingContainers: [
      { id: 'c1', containerType: 'DRY', destination: 'MKS' }, // Next Port
      { id: 'c2', containerType: 'DRY', destination: 'JYP' }  // Later Port
    ] };
    
    const grid = createEmptyGrid(); // empty grid
    delete grid['18']; // Remove Bay 18 because it has no tier 02
    executeBotStowagePlacement(smartBot, grid, 'SBY', PORTS);
    
    // JYP should be underdeck (02), MKS should be on-deck (82) since they go in the same slot if possible.
    // Let's find where they are.
    let mksContainer, jypContainer;
    
    // Find c1 and c2 in the grid
    Object.keys(grid).forEach(bay => {
      Object.keys(grid[bay]).forEach(row => {
        Object.keys(grid[bay][row]).forEach(tier => {
          if (grid[bay][row][tier]?.id === 'c1') mksContainer = {bay, row, tier};
          if (grid[bay][row][tier]?.id === 'c2') jypContainer = {bay, row, tier};
        });
      });
    });
    
    expect(mksContainer).toBeDefined();
    expect(jypContainer).toBeDefined();
    
    // MKS is next port, should be on tier 82 (if placed after 02) or 84.
    // JYP is later port, should be placed first so it goes to 02.
    // In executeBotStowagePlacement: JYP is placed first (tierOrder: 02, 82, 84).
    // So JYP goes to 02. MKS goes to 82.
    expect(jypContainer.tier).toBe('02');
    expect(mksContainer.tier).toBe('82');
    // They should be in the same row/bay if there's space.
    expect(jypContainer.bay).toBe(mksContainer.bay);
    expect(jypContainer.row).toBe(mksContainer.row);
  });

  it('Bot placement respects physics constraints', () => {
    const greedyBot = { id: 2, personality: 'GREEDY', pendingContainers: [
      { id: 'c1', containerType: 'DRY', destination: 'MKS' },
      { id: 'c2', containerType: 'DRY', destination: 'MKS' },
      { id: 'c3', containerType: 'DRY', destination: 'MKS' },
      { id: 'c4', containerType: 'DRY', destination: 'MKS' }
    ] };
    
    // Fill the underdeck of Bay 02 Row 01
    let grid = createEmptyGrid();
    
    executeBotStowagePlacement(greedyBot, grid, 'SBY', PORTS);
    
    // Check that there are no floating containers in the result.
    // For every 84, there must be an 82.
    let noFloating = true;
    Object.keys(grid).forEach(bay => {
      Object.keys(grid[bay]).forEach(row => {
        if (grid[bay][row]['84'] !== null && grid[bay][row]['82'] === null) {
          noFloating = false;
        }
      });
    });
    expect(noFloating).toBe(true);
  });
});
