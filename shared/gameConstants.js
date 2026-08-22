/**
 * Vessel bay-plan constants and pure geometry/physics helpers.
 *
 * This is the single source of truth for the ship layout, imported by both
 * the client (rendering the bayplan) and the server (validating and scoring
 * it). It used to be duplicated in client/src/utils/gameHelpers.js and
 * server/utils/gameEngine.js, and the copies had already drifted (bay 22
 * stopped being recognised as REEFER on one side but not the other). Edit
 * only this file for anything here - the two callers just re-export it.
 *
 * Kept dependency-free (no Node or DOM APIs) so it works unmodified in the
 * browser bundle, the Node server, and the research harness.
 */

// Ports circuit definition
export const PORTS = ['SBY', 'MKS', 'JYP', 'MDN'];

// Vessel Bayplan specifications
// Bay 18: DRY only, 3 rows, 2 tiers (84, 82 - on-deck only)
// Bay 14 & 10: REEFER only, 4 rows, 3 tiers (84, 82, 02)
// Bay 06 & 02: DRY only, 4 rows, 3 tiers (84, 82, 02)
export const BAYS = ['18', '14', '10', '06', '02'];

// Bays fitted with reefer plugs. Kept as an explicit list so adding a bay
// is a one-line change instead of an edit to a boolean expression.
export const REEFER_BAYS = ['14', '10'];

export const getBayConfig = (bay) => {
  const isBay18 = bay === '18';
  return {
    rows: isBay18 ? ['01', '00', '02'] : ['03', '01', '02', '04'],
    tiers: isBay18 ? ['84', '82'] : ['84', '82', '02'],
    containerType: REEFER_BAYS.includes(bay) ? 'REEFER' : 'DRY'
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
