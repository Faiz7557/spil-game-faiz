// Shared presentation helpers for the game workspace. Port colours come from
// CSS variables (index.css) so they flip with the light/dark theme; only the
// four circuit ports have a colour, anything else falls back to neutral.

const KNOWN_PORTS = ['SBY', 'MKS', 'JYP', 'MDN'];

export const portVars = (port) => {
  const key = String(port || '').toLowerCase();
  if (!KNOWN_PORTS.includes(String(port))) {
    return { c: 'var(--g-faint)', bg: 'var(--g-tint)', ink: 'var(--g-ink2)' };
  }
  return { c: `var(--p-${key})`, bg: `var(--p-${key}-bg)`, ink: `var(--p-${key}-ink)` };
};

export const PORT_LONG_NAMES = {
  SBY: 'Surabaya',
  MKS: 'Makassar',
  JYP: 'Jayapura',
  MDN: 'Medan'
};

// "Rp jt" formatting used across the workspace: 16200000 -> "16,2".
export const formatJt = (value) => {
  const v = Number(value) || 0;
  const neg = v < 0;
  const [int, dec] = (Math.abs(v) / 1e6).toFixed(1).split('.');
  return `${neg ? '−' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
};

export const rpJt = (value) => `Rp ${formatJt(value)} jt`;

// Rolling penalty per unit (matches server/utils/gameEngine.js).
export const rollingPenalty = (customerType, containerType) => {
  const committed = customerType === 'Committed';
  if (committed) return containerType === 'DRY' ? 16000000 : 24000000;
  return containerType === 'DRY' ? 8000000 : 16000000;
};

export const RESTOW_PENALTY = 6000000;

export const portChipStyle = (port) => {
  const p = portVars(port);
  return { background: p.bg, border: `1px solid ${p.c}`, color: p.ink };
};

export const REEFER_BG = 'repeating-linear-gradient(135deg, var(--g-surface) 0 3px, var(--g-sunk) 3px 6px)';
