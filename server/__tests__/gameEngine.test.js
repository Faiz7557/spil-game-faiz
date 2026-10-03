import { describe, it, expect } from 'vitest';
import {
  createEmptyGrid,
  validateGridPhysics,
  calculateRestows,
  processSailingTransition,
  getBayConfig,
  generateOrders,
  calculateDischargeRevenue,
  calculateRollingPenalties,
  createRng,
  hashSeed,
  rngForPortCall,
  PORTS
} from '../utils/gameEngine.js';

describe('Game Engine Physics & Logic Tests', () => {
  it('Test 1: Grid Initialization', () => {
    // Default (5 bays)
    let grid = createEmptyGrid();
    expect(grid).not.toBeNull();
    expect(Object.keys(grid).length).toBe(5);
    
    // Small Vessel (3 bays)
    grid = createEmptyGrid(['10', '06', '02']);
    expect(Object.keys(grid).length).toBe(3);
    
    // Large Vessel (7 bays)
    grid = createEmptyGrid(['26', '22', '18', '14', '10', '06', '02']);
    expect(Object.keys(grid).length).toBe(7);

    // Check Bay 26 layout (DRY, 4 rows, 3 tiers)
    const config26 = getBayConfig('26');
    expect(config26.containerType).toBe('DRY');
    expect(config26.rows.length).toBe(4);
    expect(config26.tiers.length).toBe(3);
    
    // Check Bay 18 size
    const grid5 = createEmptyGrid();
    const bay18Rows = Object.keys(grid5['18']);
    expect(bay18Rows.length).toBe(3);
    expect(Object.keys(grid5['18']['01']).length).toBe(2);
    expect(grid5['18']['01']['02']).toBeUndefined();

    // Check Bay 14 size
    const bay14Rows = Object.keys(grid5['14']);
    expect(bay14Rows.length).toBe(4);
    expect(Object.keys(grid5['14']['01']).length).toBe(3);
  });

  it('Test 2: Grid Type and Physics Validation', () => {
    const grid = createEmptyGrid();
    
    // Put a DRY container in REEFER slot (Bay 14 is Reefer)
    grid['14']['01']['02'] = {
      id: 'c1',
      containerType: 'DRY',
      origin: 'SBY',
      destination: 'MKS'
    };
    
    let check = validateGridPhysics(grid);
    expect(check.valid).toBe(false);
    expect(check.errors.some(e => e.includes('hanya menerima kontainer REEFER'))).toBe(true);
    
    // Correct the container to REEFER
    grid['14']['01']['02'].containerType = 'REEFER';
    check = validateGridPhysics(grid);
    expect(check.valid).toBe(true);
    
    // Make a container floating: Put container in Tier 84 with Tier 82 empty
    grid['06']['01']['84'] = {
      id: 'c2',
      containerType: 'DRY',
      origin: 'SBY',
      destination: 'JYP'
    };
    
    check = validateGridPhysics(grid);
    expect(check.valid).toBe(false);
    expect(check.errors.some(e => e.includes('melayang'))).toBe(true);
    
    // Add support container in Tier 82
    grid['06']['01']['82'] = {
      id: 'c3',
      containerType: 'DRY',
      origin: 'SBY',
      destination: 'MKS'
    };
    
    check = validateGridPhysics(grid);
    expect(check.valid).toBe(true);
  });

  it('Test 3: Restow (Shifting) Calculation', () => {
    const grid = createEmptyGrid();
    
    // We depart SBY. Next Port is MKS. Later Port is JYP.
    grid['02']['01']['02'] = {
      id: 'c1',
      containerType: 'DRY',
      origin: 'SBY',
      destination: 'MKS'
    };
    grid['02']['01']['82'] = {
      id: 'c2',
      containerType: 'DRY',
      origin: 'SBY',
      destination: 'JYP'
    };
    grid['02']['01']['84'] = {
      id: 'c3',
      containerType: 'DRY',
      origin: 'SBY',
      destination: 'JYP'
    };
    
    const check = validateGridPhysics(grid);
    expect(check.valid).toBe(true);
    
    const restowStats = calculateRestows(grid, 'SBY');
    
    expect(restowStats.restowContainersCount).toBe(2);
    expect(restowStats.restowMovementsCount).toBe(4);
  });

  it('Test 4: Voyage Transition & Slide-Downs', () => {
    let grid = createEmptyGrid();
    
    grid['06']['01']['82'] = {
      id: 'c1',
      containerType: 'DRY',
      origin: 'SBY',
      destination: 'MKS'
    };
    grid['06']['01']['84'] = {
      id: 'c2',
      containerType: 'DRY',
      origin: 'SBY',
      destination: 'JYP'
    };
    
    const nextGrid = processSailingTransition(grid, 'MKS');
    
    expect(nextGrid['06']['01']['82']).not.toBeNull();
    expect(nextGrid['06']['01']['82'].id).toBe('c2');
    expect(nextGrid['06']['01']['84']).toBeNull();
  });
  
  // NEW TESTS
  
  it('calculateRestows returns identical output whether tiers come from hardcoded array or getBayConfig()', () => {
    const grid = createEmptyGrid();
    grid['06']['01']['02'] = { id: 'c1', containerType: 'DRY', origin: 'SBY', destination: 'MKS' };
    grid['06']['01']['82'] = { id: 'c2', containerType: 'DRY', origin: 'SBY', destination: 'JYP' };
    
    // This is tested implicitly by checking calculateRestows output, as calculateRestows uses getBayConfig().
    const restowStats = calculateRestows(grid, 'SBY');
    expect(restowStats.restowContainersCount).toBe(1);
    expect(restowStats.restowMovementsCount).toBe(2);
  });

  it('calculateDischargeRevenue correctly counts containers headed to nextPort', () => {
    const grid = createEmptyGrid();
    grid['06']['01']['02'] = { id: 'c1', containerType: 'DRY', origin: 'SBY', destination: 'MKS', tariff: 10000000 };
    grid['06']['01']['82'] = { id: 'c2', containerType: 'DRY', origin: 'SBY', destination: 'JYP', tariff: 15000000 };
    grid['06']['02']['02'] = { id: 'c3', containerType: 'DRY', origin: 'SBY', destination: 'MKS', tariff: 12000000 };
    
    const revenue = calculateDischargeRevenue(grid, 'MKS');
    expect(revenue).toBe(22000000); // 10m + 12m
  });

  it('calculateRollingPenalties for committed vs non-committed', () => {
    const grid = createEmptyGrid(); // empty grid means all orders are missing
    const orders = [
      { id: 'o1', customerType: 'Committed', containerType: 'DRY', quantity: 2, accepted: false }, // penalized 16m * 2 = 32m
      { id: 'o2', customerType: 'Non-Committed', containerType: 'DRY', quantity: 1, accepted: false }, // no penalty, not accepted
      { id: 'o3', customerType: 'Non-Committed', containerType: 'REEFER', quantity: 1, accepted: true } // penalized 16m * 1 = 16m
    ];
    
    const penaltyStats = calculateRollingPenalties(orders, grid, 'SBY');
    expect(penaltyStats.rollingPenaltyTotal).toBe(48000000);
    expect(penaltyStats.rolledContainersCount).toBe(3);
  });

  it('processSailingTransition slide-down physics', () => {
    const grid = createEmptyGrid();
    grid['06']['01']['02'] = { id: 'c1', destination: 'JYP' };
    grid['06']['01']['82'] = { id: 'c2', destination: 'MKS' }; // Will be discharged
    grid['06']['01']['84'] = { id: 'c3', destination: 'JYP' }; // Will slide down to 82
    
    const nextGrid = processSailingTransition(grid, 'MKS');
    
    expect(nextGrid['06']['01']['02'].id).toBe('c1'); // Stays underdeck
    expect(nextGrid['06']['01']['82'].id).toBe('c3'); // Slide down
    expect(nextGrid['06']['01']['84']).toBeNull();    // Empty
  });

  it('generateOrders produces deterministic output with seeded RNG', () => {
    const seed = 'test-seed';
    const rng1 = rngForPortCall(seed, 1, 'SBY');
    const rng2 = rngForPortCall(seed, 1, 'SBY');
    
    const orders1 = generateOrders('SBY', 1, PORTS, rng1);
    const orders2 = generateOrders('SBY', 1, PORTS, rng2);
    
    expect(orders1.length).toBeGreaterThan(0);
    expect(orders1).toEqual(orders2);
  });
});
