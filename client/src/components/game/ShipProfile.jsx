import { portVars } from './gameUi';

const VESSEL_NAMES = { 3: 'Small Vessel', 5: 'Medium Vessel', 7: 'Large Vessel' };

// Side silhouette of the whole ship. Each bay is a selectable mini stack so
// the player sees the full load at a glance and jumps to any bay.
export default function ShipProfile({ bays, grid, getConfig, displayRows, selectedBay, onSelectBay, isBlocker, totalSlots }) {
  const miniBase = 'block h-[13px] rounded-sm';

  const miniCells = (bay, tier, rows) =>
    rows.map((row) => {
      const c = grid?.[bay]?.[row]?.[tier];
      if (!c) {
        return <span key={row} className={`${miniBase} border border-dashed`} style={{ borderColor: tier === '02' ? 'rgba(255,255,255,.3)' : 'var(--g-structure)' }} />;
      }
      const pv = portVars(c.destination);
      const blocked = isBlocker(bay, row, tier, c);
      return (
        <span
          key={row}
          className={miniBase}
          style={{ background: pv.c, border: `1px solid ${pv.c}`, boxShadow: blocked ? '0 0 0 1.5px var(--g-danger)' : 'none' }}
        />
      );
    });

  return (
    <section className="bg-g-surface border border-g-line rounded-xl px-[18px] pt-3.5 pb-4 flex flex-col gap-2.5 min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-2">
        <span className="font-medium text-sm whitespace-nowrap">
          KM SPIL {VESSEL_NAMES[bays.length] || 'Vessel'}
          <span className="font-plex font-normal text-xs text-g-muted ml-2 whitespace-nowrap">
            {bays.length} bay · {totalSlots} slot
          </span>
        </span>
        <span className="ml-auto text-[11.5px] text-g-muted whitespace-nowrap">Klik bay untuk membuka penampang</span>
      </div>

      <div className="flex items-end gap-2.5">
        <span className="[writing-mode:vertical-rl] rotate-180 text-[10.5px] font-semibold tracking-[.12em] text-g-muted self-center">
          HALUAN
        </span>

        <div className="relative flex-1 min-w-0 rounded-[10px] overflow-hidden h-[clamp(180px,19vw,230px)]" style={{ background: 'var(--g-sky)' }}>
          {/* sea */}
          <div className="absolute inset-x-0 bottom-0 h-10" style={{ background: 'var(--g-sea)' }} />
          <span className="absolute left-[6%] right-[30%] bottom-4 h-px block" style={{ background: 'var(--g-wave-a)' }} />
          <span className="absolute left-[24%] right-[8%] bottom-2 h-px block" style={{ background: 'var(--g-wave-b)' }} />

          {/* bow mast */}
          <span className="absolute left-[3%] bottom-[94px] w-0.5 h-[46px] bg-g-faint block" />
          <span className="absolute left-[calc(3%-4px)] bottom-[136px] w-2.5 h-0.5 bg-g-faint block" />

          {/* stern superstructure */}
          <div className="absolute right-[5%] bottom-[90px] w-[92px] flex flex-col items-center">
            <span className="self-end mr-2.5 w-5 h-[34px] bg-g-surface border border-b-0 border-g-structure rounded-t-[3px] flex flex-col overflow-hidden">
              <i className="h-[5px] bg-g-ink block" />
              <i className="h-2 bg-g-red block" />
            </span>
            <span className="w-[92px] h-[13px] bg-g-surface border border-g-structure rounded-t-[3px] grid grid-cols-7 gap-[3px] px-[5px] py-[3px]">
              {Array.from({ length: 7 }).map((_, i) => <i key={i} className="block rounded-[1px]" style={{ background: '#2D4756' }} />)}
            </span>
            <span className="w-[70px] bg-g-surface border border-t-0 border-g-structure px-1.5 py-[5px] grid grid-cols-4 gap-x-[3px] gap-y-1">
              {Array.from({ length: 12 }).map((_, i) => <i key={i} className="h-1 bg-g-faint rounded-[1px] block" />)}
            </span>
          </div>

          {/* hull */}
          <div
            className="absolute left-[1.5%] right-[1.5%] bottom-6 h-[66px]"
            style={{
              background: 'var(--g-hull)',
              boxShadow: 'inset 0 3px 0 var(--g-sunk)',
              clipPath: 'polygon(0 0,100% 0,98.5% 55%,95% 100%,8% 100%,2.5% 45%)'
            }}
          >
            <span className="absolute left-[5%] top-3.5 font-plex text-[15px] font-semibold tracking-[.14em] text-white">SPIL</span>
            <span className="absolute right-[4%] top-4 font-plex text-[10px] tracking-[.1em] text-[#B4C0C6]">KM SPIL CITRA</span>
            <div className="absolute inset-x-0 bottom-0 h-[18px] bg-g-red flex items-center px-[10%]">
              <span className="font-plex text-[10px] tracking-[.08em] text-white whitespace-nowrap">SARAT 6,2 M</span>
            </div>
          </div>

          {/* bays */}
          <div className="absolute left-[14%] right-[27%] bottom-[46px] top-3.5 flex gap-3">
            {bays.map((bay) => {
              const cfg = getConfig(bay);
              const rows = displayRows(cfg.rows);
              const on = bay === selectedBay;
              let used = 0;
              let blockers = 0;
              cfg.rows.forEach((row) => cfg.tiers.forEach((tier) => {
                const c = grid?.[bay]?.[row]?.[tier];
                if (c) { used++; if (isBlocker(bay, row, tier, c)) blockers++; }
              }));
              const slots = cfg.rows.length * cfg.tiers.length;
              const tierRows = cfg.tiers.map((tier) => ({ tier, cells: miniCells(bay, tier, rows) }));
              return (
                <span key={bay} className="flex-1 min-w-0 relative flex flex-col justify-end">
                  {on && (
                    <>
                      <span className="absolute -left-1.5 -right-1.5 top-0 h-[30px] flex flex-col items-center pointer-events-none">
                        <span className="w-full h-1 bg-g-muted rounded-sm block" />
                        <span className="w-px h-3.5 bg-g-muted block" />
                        <span className="w-[46%] h-1.5 rounded-sm block" style={{ background: 'var(--p-mks)' }} />
                      </span>
                      <span className="absolute -left-1.5 top-0 bottom-11 w-[3px] bg-g-faint rounded-[1px] block pointer-events-none" />
                      <span className="absolute -right-1.5 top-0 bottom-11 w-[3px] bg-g-faint rounded-[1px] block pointer-events-none" />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectBay(bay)}
                    title={`Bay ${bay} · ${used}/${slots} terisi${blockers ? ` · ${blockers} penghalang` : ''}`}
                    aria-pressed={on}
                    className="relative flex flex-col justify-end gap-[3px] px-1.5 pt-[5px] pb-[3px] rounded-[7px] text-white"
                    style={{
                      border: on ? '2px solid var(--g-green)' : '1px solid transparent',
                      background: on ? 'rgba(46,125,78,.22)' : 'transparent',
                      boxShadow: on ? '0 0 0 3px rgba(46,125,78,.15)' : 'none'
                    }}
                  >
                    {tierRows.map(({ tier, cells }, i) => (
                      <span key={tier} className="contents">
                        {tier === '02' && <span className="h-1 rounded-[1px] block mt-0.5 mb-[3px]" style={{ background: 'var(--g-sunk)' }} />}
                        <span className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${rows.length},1fr)` }} data-tier-row={i}>
                          {cells}
                        </span>
                      </span>
                    ))}
                    <span className="flex items-center justify-center gap-[5px] font-plex text-xs font-medium mt-[3px] text-white">
                      {bay}
                      {blockers > 0 && (
                        <b className="bg-[#F04438] text-white text-[10.5px] font-semibold min-w-4 h-4 px-1 rounded inline-flex items-center justify-center">
                          {blockers}
                        </b>
                      )}
                    </span>
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        <span className="[writing-mode:vertical-rl] text-[10.5px] font-semibold tracking-[.12em] text-g-muted self-center">
          BURITAN
        </span>
      </div>
    </section>
  );
}
