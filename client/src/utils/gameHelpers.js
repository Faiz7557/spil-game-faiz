export const PORTS = ['SBY', 'MKS', 'JYP', 'MDN'];
export const BAYS = ['18', '14', '10', '06', '02'];

export const getBayConfig = (bay) => {
  const isBay18 = bay === '18';
  return {
    rows: isBay18 ? ['01', '00', '02'] : ['03', '01', '02', '04'],
    tiers: isBay18 ? ['84', '82'] : ['84', '82', '02'],
    containerType: (bay === '14' || bay === '10' || bay === '22') ? 'REEFER' : 'DRY'
  };
};

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
  return ports[(idx + 1) % ports.length];
};

export const getLaterPorts = (port, activePorts) => {
  const ports = (activePorts && activePorts.length > 0) ? activePorts : PORTS;
  const idx = ports.indexOf(port);
  const later = [];
  for (let i = 2; i < ports.length; i++) {
    later.push(ports[(idx + i) % ports.length]);
  }
  return later;
};

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
