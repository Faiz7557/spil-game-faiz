import {
  createEmptyGrid,
  validateGridPhysics,
  calculateRestows,
  processSailingTransition,
  getBayConfig,
  PORTS
} from './utils/gameEngine.js';

console.log('====================================================');
console.log('   RUNNING AUTOMATED SPIL GAME PHYSICS ENGINE TESTS  ');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

const assert = (condition, message) => {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
};

// Test 1: Grid Initialization
const testGridInitialization = () => {
  console.log('--- Test 1: Grid Initialization ---');
  
  // Default (5 bays)
  let grid = createEmptyGrid();
  assert(grid !== null, 'Grid should not be null');
  assert(Object.keys(grid).length === 5, 'Grid should have exactly 5 bays by default');
  
  // Small Vessel (3 bays)
  grid = createEmptyGrid(['10', '06', '02']);
  assert(Object.keys(grid).length === 3, 'Grid should have exactly 3 bays for Small Vessel');
  
  // Large Vessel (7 bays)
  grid = createEmptyGrid(['26', '22', '18', '14', '10', '06', '02']);
  assert(Object.keys(grid).length === 7, 'Grid should have exactly 7 bays for Large Vessel');

  // Check Bay 26 layout (DRY, 4 rows, 3 tiers)
  const config26 = getBayConfig('26');
  assert(config26.containerType === 'DRY', 'Bay 26 should be DRY');
  assert(config26.rows.length === 4, 'Bay 26 should have 4 rows');
  assert(config26.tiers.length === 3, 'Bay 26 should have 3 tiers (4x3)');
  
  // Check Bay 18 size
  const grid5 = createEmptyGrid();
  const bay18Rows = Object.keys(grid5['18']);
  assert(bay18Rows.length === 3, 'Bay 18 should have 3 rows');
  assert(Object.keys(grid5['18']['01']).length === 2, 'Bay 18 rows should only have 2 tiers (84, 82)');
  assert(grid5['18']['01']['02'] === undefined, 'Bay 18 should not have underdeck Tier 02');

  // Check Bay 14 size
  const bay14Rows = Object.keys(grid5['14']);
  assert(bay14Rows.length === 4, 'Bay 14 should have 4 rows');
  assert(Object.keys(grid5['14']['01']).length === 3, 'Bay 14 rows should have 3 tiers (84, 82, 02)');
  
  console.log('Test 1 Passed successfully!\n');
};

// Test 2: Grid Type and Physics Validation
const testPhysicsValidation = () => {
  console.log('--- Test 2: Grid Physics & Type Validation ---');
  const grid = createEmptyGrid();
  
  // Put a DRY container in REEFER slot (Bay 14 is Reefer)
  grid['14']['01']['02'] = {
    id: 'c1',
    containerType: 'DRY',
    origin: 'SBY',
    destination: 'MKS'
  };
  
  let check = validateGridPhysics(grid);
  assert(!check.valid, 'Grid should be invalid when DRY container is in REEFER slot');
  assert(check.errors.some(e => e.includes('hanya menerima kontainer REEFER')), 'Should report REEFER slot restriction');
  
  // Correct the container to REEFER
  grid['14']['01']['02'].containerType = 'REEFER';
  check = validateGridPhysics(grid);
  assert(check.valid, 'Grid should be valid after correcting container type');
  
  // Make a container floating: Put container in Tier 84 with Tier 82 empty
  grid['06']['01']['84'] = {
    id: 'c2',
    containerType: 'DRY',
    origin: 'SBY',
    destination: 'JYP'
  };
  
  check = validateGridPhysics(grid);
  assert(!check.valid, 'Grid should be invalid when container at Tier 84 is floating');
  assert(check.errors.some(e => e.includes('melayang')), 'Should report floating container violation');
  
  // Add support container in Tier 82
  grid['06']['01']['82'] = {
    id: 'c3',
    containerType: 'DRY',
    origin: 'SBY',
    destination: 'MKS'
  };
  
  check = validateGridPhysics(grid);
  assert(check.valid, 'Grid should be valid after adding support container in Tier 82');
  
  console.log('Test 2 Passed successfully!\n');
};

// Test 3: Restow Calculation
const testRestowCalculation = () => {
  console.log('--- Test 3: Restow (Shifting) Calculation ---');
  const grid = createEmptyGrid();
  
  // We depart SBY. Next Port is MKS. Later Port is JYP.
  // Stack:
  // Tier 02 (underdeck): Destined for MKS (Next Port)
  // Tier 82 (on-deck lower): Destined for JYP (Later Port)
  // Tier 84 (on-deck upper): Destined for JYP (Later Port)
  
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
  assert(check.valid, 'Stack should be physically valid');
  
  const restowStats = calculateRestows(grid, 'SBY');
  
  // In this stack, c1 is at the bottom (destined for Next Port: MKS)
  // c2 and c3 are above it, destined for JYP (Later Port).
  // Therefore, both c2 and c3 block c1!
  assert(restowStats.restowContainersCount === 2, 'Should find exactly 2 restow containers');
  assert(restowStats.restowMovementsCount === 4, 'Should equal 4 restow movements (2 per container)');
  
  console.log('Test 3 Passed successfully!\n');
};

// Test 4: Voyage transition and slide-downs
const testVoyageTransition = () => {
  console.log('--- Test 4: Voyage Transition & Slide-Downs ---');
  let grid = createEmptyGrid();
  
  // At SBY, sailing to MKS.
  // Stack:
  // Tier 02: Empty
  // Tier 82: Destined for MKS (Next Port)
  // Tier 84: Destined for JYP (Later Port)
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
  
  // Sail to MKS
  const nextGrid = processSailingTransition(grid, 'MKS');
  
  // Container at Tier 82 (c1 destined for MKS) should be unloaded (null)
  assert(nextGrid['06']['01']['82'] !== null, 'Tier 82 should hold the slid-down container c2');
  assert(nextGrid['06']['01']['82'].id === 'c2', 'Container c2 should have slid down from Tier 84 to Tier 82');
  assert(nextGrid['06']['01']['84'] === null, 'Tier 84 should now be empty (null)');
  
  console.log('Test 4 Passed successfully!\n');
};

try {
  testGridInitialization();
  testPhysicsValidation();
  testRestowCalculation();
  testVoyageTransition();
  
  console.log('====================================================');
  console.log(`   ALL TESTS PASSED SUCCESSFULLY! (${passedTests}/${totalTests})`);
  console.log('====================================================');
} catch (e) {
  console.error('Error during testing:', e);
  process.exit(1);
}
