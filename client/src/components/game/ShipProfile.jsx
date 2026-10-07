import { useEffect, useId, useRef, useState } from 'react';
import { portVars, PORT_LONG_NAMES } from './gameUi';
import { useElementSize } from '../../hooks/useElementSize';

const VESSEL_NAMES = { 3: 'Small Vessel', 5: 'Medium Vessel', 7: 'Large Vessel' };

// Drawing units (the SVG viewBox), not pixels. The ship is laid out once in
// these units and scaled to the card; extra width becomes open sea.
const VB_H = 250;
const MAX_PX_H = 230;
const CELL_W = 25;
const CELL_H = 18;
const CELL_GAP = 3;
const BAY_GAP = 18;
const BOW_LEN = 92;
const STERN_LEN = 136;
const PAD = 14;
const DECK_Y = 150;
const KEEL_Y = 214;
const SEA_Y = 196;
const MAX_SINK = 10;
// Deck tiers ride above the hatch cover, tier 02 sits in the hold below it.
const TIER_Y = { 84: 108, 82: 128, '02': 155 };

const wavePath = (width, y, amp, closed) => {
  let d = `M-80,${y}`;
  for (let x = -80; x < width + 80; x += 40) d += ` q20,${-amp} 40,0`;
  return closed ? `${d} V${VB_H} H-80 Z` : d;
};

const hullPath = (x0, x1) =>
  `M${x0},134 Q${x0 + 44},147 ${x0 + BOW_LEN},${DECK_Y} L${x1},${DECK_Y} L${x1 - 9},194 L${x1 - 36},${KEEL_Y} ` +
  `L${x0 + 36},${KEEL_Y} C${x0 + 10},${KEEL_Y} ${x0 + 4},202 ${x0 + 18},196 C${x0 + 12},178 ${x0 + 6},158 ${x0},134 Z`;

// Side view of the whole ship. Purely a picture of the load: it reacts to
// what the player does in the bayplan (crane follows the open bay and dips
// when a box is placed, the hull settles deeper as cargo comes aboard), and
// clicking a bay opens it below.
export default function ShipProfile({ bays, grid, getConfig, displayRows, selectedBay, onSelectBay, isBlocker, totalSlots }) {
  const clipId = useId();
  const patternId = useId();
  const [frameRef, frame] = useElementSize();
  const [hoverBay, setHoverBay] = useState(null);
  const [dip, setDip] = useState(false);
  const [ready, setReady] = useState(false);

  // ---- layout ----------------------------------------------------------
  const layout = [];
  for (const bay of bays) {
    const cfg = getConfig(bay);
    const rows = displayRows(cfg.rows);
    const w = rows.length * (CELL_W + CELL_GAP) - CELL_GAP;
    const prev = layout[layout.length - 1];
    const x = prev ? prev.x + prev.w + BAY_GAP : PAD + BOW_LEN;
    layout.push({ bay, cfg, rows, x, w, cx: x + w / 2 });
  }
  const last = layout[layout.length - 1];
  const x0 = PAD;
  const x1 = (last ? last.x + last.w : PAD + BOW_LEN) + STERN_LEN;
  const shipW = x1 + PAD;
  const vbW = frame.width ? Math.max(shipW, (frame.width * VB_H) / MAX_PX_H) : shipW;
  const offsetX = (vbW - shipW) / 2;
  const pxH = frame.width ? (frame.width * VB_H) / vbW : 200;

  // ---- load ------------------------------------------------------------
  const stats = {};
  let used = 0;
  layout.forEach(({ bay, cfg }) => {
    const s = { used: 0, blockers: 0, slots: cfg.rows.length * cfg.tiers.length, ports: {} };
    cfg.rows.forEach((row) => cfg.tiers.forEach((tier) => {
      const c = grid?.[bay]?.[row]?.[tier];
      if (!c) return;
      s.used++;
      s.ports[c.destination] = (s.ports[c.destination] || 0) + 1;
      if (isBlocker(bay, row, tier, c)) s.blockers++;
    }));
    used += s.used;
    stats[bay] = s;
  });
  const frac = totalSlots ? used / totalSlots : 0;
  const draft = (5.4 + frac * 2.2).toFixed(1).replace('.', ',');

  // Boxes that were not aboard on the previous render drop in from the crane.
  const occupied = new Set();
  layout.forEach(({ bay, cfg }) => cfg.rows.forEach((row) => cfg.tiers.forEach((tier) => {
    if (grid?.[bay]?.[row]?.[tier]) occupied.add(`${bay}-${row}-${tier}`);
  })));
  const seen = useRef(null);
  const svgRef = useRef(null);
  const occupiedKey = [...occupied].join(',');

  useEffect(() => {
    const prev = seen.current;
    seen.current = new Set(occupiedKey ? occupiedKey.split(',') : []);
    if (!prev) return undefined;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      [...seen.current].filter((c) => !prev.has(c)).forEach((c) => {
        svgRef.current?.querySelector(`[data-ship-slot="${c}"]`)?.animate(
          [{ opacity: 0, transform: 'translateY(-24px)' }, { opacity: 1, transform: 'none' }],
          { duration: 380, easing: 'cubic-bezier(.2,.8,.3,1.15)' }
        );
      });
    }
    const changedHere = [...seen.current].some((c) => !prev.has(c) && c.startsWith(`${selectedBay}-`)) ||
      [...prev].some((c) => !seen.current.has(c) && c.startsWith(`${selectedBay}-`));
    if (!changedHere) return undefined;
    setDip(true);
    const t = setTimeout(() => setDip(false), 300);
    return () => clearTimeout(t);
  }, [occupiedKey, selectedBay]);

  // Let the crane appear in place on first paint, then glide from bay to bay.
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const selected = layout.find((b) => b.bay === selectedBay) || layout[0];
  const hovered = layout.find((b) => b.bay === hoverBay);
  const spring = 'cubic-bezier(.34,1.25,.64,1)';

  const renderBox = (bay, row, tier, x, y) => {
    const coord = `${bay}-${row}-${tier}`;
    const c = grid?.[bay]?.[row]?.[tier];
    if (!c) {
      return (
        <rect
          key={coord}
          x={x + 0.5}
          y={y + 0.5}
          width={CELL_W - 1}
          height={CELL_H - 1}
          rx={2}
          fill="none"
          stroke={tier === '02' ? 'rgba(255,255,255,.28)' : 'var(--g-structure)'}
          strokeDasharray="3 2"
        />
      );
    }
    const blocked = isBlocker(bay, row, tier, c);
    return (
      <g key={coord} data-ship-slot={coord}>
        <rect
          x={x}
          y={y}
          width={CELL_W}
          height={CELL_H}
          rx={2}
          fill={portVars(c.destination).c}
          stroke={blocked ? 'var(--g-danger)' : 'none'}
          strokeWidth={blocked ? 1.6 : 0}
        />
        <rect x={x + 2} y={y + 2} width={CELL_W - 4} height={CELL_H - 4} fill={`url(#${patternId})`} />
        {c.containerType === 'REEFER' && <rect x={x + CELL_W - 6} y={y + 3} width={3} height={3} rx={0.5} fill="#fff" />}
      </g>
    );
  };

  return (
    <section className="g-glass px-[18px] pt-3.5 pb-4 flex flex-col gap-2.5 min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-2">
        <span className="font-medium text-callout whitespace-nowrap">
          KM SPIL {VESSEL_NAMES[bays.length] || 'Vessel'}
          <span className="font-plex font-normal text-caption text-g-muted ml-2 whitespace-nowrap">
            {bays.length} bay · {used}/{totalSlots} slot · sarat {draft} m
          </span>
        </span>
        <span className="ml-auto text-caption text-g-muted whitespace-nowrap">Klik bay untuk membuka penampang</span>
      </div>

      <div ref={frameRef} className="relative rounded-2xl overflow-hidden" style={{ background: 'var(--g-sky)', height: pxH }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${vbW} ${VB_H}`}
          width="100%"
          height={pxH}
          className="block"
          role="img"
          aria-label={`Tampak samping kapal, ${used} dari ${totalSlots} slot terisi`}
        >
          <defs>
            <pattern id={patternId} width="3.5" height="10" patternUnits="userSpaceOnUse">
              <rect width="1" height="10" fill="rgba(0,0,0,.2)" />
            </pattern>
            <clipPath id={clipId}>
              <path d={hullPath(x0, x1)} />
            </clipPath>
          </defs>

          <g transform={`translate(${offsetX},0)`}>
            {/* the ship settles deeper as cargo comes aboard */}
            <g style={{ transform: `translateY(${(frac * MAX_SINK).toFixed(2)}px)`, transition: 'transform .9s cubic-bezier(.32,.72,0,1)' }}>
              <g style={{ animation: 'g-bob 4.5s ease-in-out infinite' }}>
                {/* bow mast */}
                <rect x={x0 + 22} y={98} width={2} height={40} fill="var(--g-faint)" />
                <rect x={x0 + 17} y={104} width={12} height={2} fill="var(--g-faint)" />

                {/* stern superstructure */}
                <g transform={`translate(${x1 - 118},0)`}>
                  <rect x={60} y={66} width={16} height={32} rx={2} fill="var(--g-surface)" stroke="var(--g-structure)" />
                  <rect x={60} y={72} width={16} height={7} fill="var(--g-red)" />
                  <rect x={60} y={66} width={16} height={4} fill="var(--g-ink)" />
                  <rect x={0} y={96} width={84} height={14} rx={2} fill="var(--g-surface)" stroke="var(--g-structure)" />
                  {Array.from({ length: 7 }).map((_, i) => (
                    <rect key={i} x={5 + i * 11} y={100} width={9} height={6} rx={1} fill="#2D4756" />
                  ))}
                  <rect x={8} y={110} width={70} height={40} fill="var(--g-surface)" stroke="var(--g-structure)" />
                  {Array.from({ length: 12 }).map((_, i) => (
                    <rect key={i} x={14 + (i % 4) * 16} y={116 + Math.floor(i / 4) * 9} width={12} height={3} rx={0.5} fill="var(--g-faint)" />
                  ))}
                </g>

                {/* hull with red boot-top below the waterline */}
                <path d={hullPath(x0, x1)} fill="var(--g-hull)" />
                <g clipPath={`url(#${clipId})`}>
                  <rect x={0} y={193} width={shipW} height={30} fill="var(--g-red)" />
                  <rect x={0} y={DECK_Y} width={shipW} height={3} fill="rgba(0,0,0,.18)" />
                </g>
                <text x={x0 + 30} y={176} fill="#fff" fontSize={15} fontWeight={600} className="font-plex">SPIL</text>
                <text x={x1 - 122} y={176} fill="#B4C0C6" fontSize={11} className="font-plex">KM SPIL CITRA</text>

                {/* holds, hatch covers, boxes */}
                {layout.map(({ bay, cfg, rows, x, w, cx }) => {
                  const s = stats[bay];
                  const lifted = hoverBay === bay;
                  return (
                    <g key={bay}>
                      {cfg.tiers.includes('02') && (
                        <rect x={x - 3} y={152} width={w + 6} height={24} rx={2} fill="rgba(0,0,0,.24)" />
                      )}
                      <rect x={x - 5} y={DECK_Y - 2} width={w + 10} height={4} rx={1} fill="var(--g-structure)" />
                      <g style={{ transform: lifted ? 'translateY(-2px)' : 'none', transition: `transform .25s ${spring}` }}>
                        {cfg.tiers.map((tier) => rows.map((row, i) => renderBox(bay, row, tier, x + i * (CELL_W + CELL_GAP), TIER_Y[tier])))}
                      </g>
                      <text x={cx} y={188} textAnchor="middle" fill="#fff" fontSize={11} className="font-plex">
                        {bay} · {s.used}/{s.slots}
                      </text>
                      <rect x={cx - 22} y={191} width={44} height={2} rx={1} fill="rgba(0,0,0,.25)" />
                      <rect
                        x={cx - 22}
                        y={191}
                        width={44 * (s.used / s.slots)}
                        height={2}
                        rx={1}
                        fill="var(--g-green-hover)"
                        style={{ transition: 'width .4s ease-out' }}
                      />
                      {s.blockers > 0 && (
                        <g>
                          <rect x={x + w - 14} y={95} width={16} height={14} rx={4} fill="#F04438" />
                          <text x={x + w - 6} y={105.5} textAnchor="middle" fill="#fff" fontSize={10} fontWeight={600} className="font-plex">{s.blockers}</text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* open bay */}
                <rect
                  x={-6}
                  y={102}
                  width={selected.w + 12}
                  height={96}
                  rx={7}
                  fill="rgba(46,125,78,.12)"
                  stroke="var(--g-green)"
                  strokeWidth={2}
                  style={{ transform: `translateX(${selected.x}px)`, transition: ready ? `transform .55s ${spring}` : 'none' }}
                />
              </g>
            </g>

            {/* gantry crane over the open bay; the spreader dips when a box goes in or out */}
            <g style={{ transform: `translateX(${selected.cx}px)`, transition: ready ? `transform .7s ${spring}` : 'none' }}>
              <rect x={-67} y={30} width={134} height={5} rx={2} fill="var(--g-muted)" />
              <rect x={-67} y={35} width={3} height={66} fill="var(--g-faint)" />
              <rect x={64} y={35} width={3} height={66} fill="var(--g-faint)" />
              <rect x={-10} y={34} width={21} height={6} rx={1} fill="var(--g-muted)" />
              <rect
                x={-0.5}
                y={40}
                width={1}
                height={42}
                fill="var(--g-muted)"
                style={{ transformBox: 'fill-box', transformOrigin: 'top', transform: dip ? 'scaleY(1.43)' : 'none', transition: 'transform .28s ease-in-out' }}
              />
              <rect
                x={-25}
                y={82}
                width={50}
                height={5}
                rx={1}
                fill="var(--p-mks)"
                style={{ transform: dip ? 'translateY(18px)' : 'none', transition: 'transform .28s ease-in-out' }}
              />
            </g>

            {/* bay hit areas */}
            {layout.map(({ bay, cfg, x, w }) => (
              <rect
                key={bay}
                x={x - 8}
                y={92}
                width={w + 16}
                height={108}
                fill="transparent"
                role="button"
                tabIndex={0}
                aria-pressed={bay === selected.bay}
                aria-label={`Bay ${bay}, ${cfg.containerType}, ${stats[bay].used} dari ${stats[bay].slots} terisi${stats[bay].blockers ? `, ${stats[bay].blockers} penghalang` : ''}`}
                className="cursor-pointer outline-none"
                onClick={() => onSelectBay(bay)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectBay(bay);
                  }
                }}
                onMouseEnter={() => setHoverBay(bay)}
                onMouseLeave={() => setHoverBay((h) => (h === bay ? null : h))}
                onFocus={() => setHoverBay(bay)}
                onBlur={() => setHoverBay((h) => (h === bay ? null : h))}
              />
            ))}
          </g>

          {/* sea in front of the hull */}
          <g style={{ animation: 'g-wave 7s linear infinite' }}>
            <path d={wavePath(vbW, SEA_Y, 3, true)} fill="var(--g-sea)" opacity={0.93} />
          </g>
          <g style={{ animation: 'g-wave 11s linear infinite reverse' }}>
            <path d={wavePath(vbW, SEA_Y + 10, 2, false)} fill="none" stroke="var(--g-wave-a)" />
          </g>
          <g style={{ animation: 'g-wave 15s linear infinite' }}>
            <path d={wavePath(vbW, SEA_Y + 20, 1.5, false)} fill="none" stroke="var(--g-wave-b)" />
          </g>

          <text x={8} y={VB_H - 8} fill="var(--g-muted)" fontSize={10} fontWeight={600}>Haluan</text>
          <text x={vbW - 8} y={VB_H - 8} textAnchor="end" fill="var(--g-muted)" fontSize={10} fontWeight={600}>Buritan</text>
        </svg>

        {hovered && (
          <div
            className="absolute top-2 pointer-events-none g-glass !rounded-xl px-2.5 py-2 flex flex-col gap-1 text-caption min-w-[150px]"
            style={{ left: `${((offsetX + hovered.cx) / vbW) * 100}%`, transform: 'translateX(-50%)' }}
          >
            <span className="flex items-center gap-2">
              <span className="font-plex font-medium text-g-ink">Bay {hovered.bay}</span>
              <span className="text-g-muted">{hovered.cfg.containerType}</span>
              <span className="ml-auto font-plex text-g-ink2">{stats[hovered.bay].used}/{stats[hovered.bay].slots}</span>
            </span>
            {Object.keys(stats[hovered.bay].ports).length > 0 ? (
              Object.entries(stats[hovered.bay].ports).map(([port, n]) => (
                <span key={port} className="flex items-center gap-1.5 text-g-ink2">
                  <i className="w-2 h-2 rounded-[2px] inline-block" style={{ background: portVars(port).c }} />
                  {PORT_LONG_NAMES[port] || port}
                  <span className="ml-auto font-plex">{n}</span>
                </span>
              ))
            ) : (
              <span className="text-g-muted">Masih kosong</span>
            )}
            {stats[hovered.bay].blockers > 0 && (
              <span className="text-g-danger">{stats[hovered.bay].blockers} penghalang restow</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
