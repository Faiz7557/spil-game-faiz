import { previewPlacementOverstow } from '../../utils/gameHelpers';
import { formatJt, portVars, REEFER_BG, RESTOW_PENALTY } from './gameUi';
import { TypeChip } from './Chips';

const MONO = 'font-plex';

// A cross-section of one bay seen from astern: port rows on the left,
// starboard on the right, deck tiers above the hatch cover, hold below.
export default function BayCrossSection({
  bay,
  bayIndex,
  bayCount,
  config,
  displayRows,
  grid,
  currentPort,
  nextPort,
  activePorts,
  selected,
  readOnly,
  width,
  isBlocker,
  validCount,
  onPrev,
  onNext,
  onCellClick,
  onDropOnCell
}) {
  const isReeferBay = config.containerType === 'REEFER';
  const cols = displayRows.length;
  // width is the whole <main>; subtract page gutters (44) and card padding (36).
  const areaW = Math.max(0, (width || 960) - 80);
  const tierW = areaW < 520 ? 46 : 78;
  const cellW = (areaW - tierW - 26 - 24) / cols;
  const narrow = cellW < 100;
  const tiny = cellW < 66;
  const cellH = areaW < 520 ? 68 : 88;
  const gap = tiny ? 5 : 8;
  const gridCols = { gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, gap };
  const portsInLegend = (activePorts && activePorts.length > 0) ? activePorts : ['SBY', 'MKS', 'JYP', 'MDN'];

  const sideLabel = (row) => (row === '00' ? 'Center' : parseInt(row, 10) % 2 === 1 ? 'Starboard' : 'Port');

  const renderCell = (row, tier) => {
    const container = grid?.[bay]?.[row]?.[tier];
    const coord = `${bay}-${row}-${tier}`;
    const base = 'relative h-full rounded-[10px] flex flex-col items-center justify-center gap-[3px] overflow-hidden min-w-0 transition-colors';

    // 1. Occupied slot
    if (container) {
      const pv = portVars(container.destination);
      const own = container.origin === currentPort;
      const blocker = isBlocker(bay, row, tier, container);
      const clickable = own && !readOnly;
      return (
        <button
          key={row}
          type="button"
          disabled={!clickable}
          onClick={() => onCellClick(bay, row, tier)}
          title={`${coord} · ${own ? `dimuat di ${currentPort} · klik untuk kembalikan ke buffer` : `transit dari ${container.origin}, terkunci`}${blocker ? ` · menutupi kargo ${nextPort}` : ''} · ${container.id}`}
          aria-label={`Slot ${coord}, ${container.containerType} tujuan ${container.destination}${blocker ? ', penghalang restow' : ''}`}
          className={`${base} ${clickable ? 'cursor-pointer hover:brightness-95' : 'cursor-default'}`}
          style={{
            background: pv.bg,
            border: blocker ? '1px solid var(--g-danger)' : own ? `2px solid ${pv.c}` : `1px solid ${pv.c}`,
            boxShadow: blocker ? 'inset 0 0 0 1px var(--g-danger)' : 'none',
            paddingBottom: blocker ? 20 : 0
          }}
        >
          <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: pv.c }} />
          <span
            className={`absolute font-plex font-semibold tracking-[.08em] ${own ? 'text-g-green-ink' : 'text-g-muted'}`}
            style={{ top: tiny ? 3 : 6, right: tiny ? 4 : 8, fontSize: tiny ? 8.5 : 10 }}
          >
            {own ? 'BARU' : 'TR'}
          </span>
          <span
            className={`${MONO} font-medium tracking-[.05em] leading-[1.1] text-[clamp(16px,1.7vw,22px)]`}
            style={{ color: pv.ink }}
          >
            {container.destination}
          </span>
          {!tiny && <span className={`${MONO} text-[10.5px] text-g-muted whitespace-nowrap`}>{coord}</span>}
          {!narrow && (
            <span
              className={`absolute left-2.5 right-1.5 ${MONO} text-[9px] text-g-faint whitespace-nowrap overflow-hidden text-left`}
              style={{ bottom: blocker ? 25 : 6 }}
            >
              {container.containerType === 'REEFER' ? 'RF' : 'DRY'} · {formatJt(container.tariff)} jt
            </span>
          )}
          {blocker && (
            <span className="absolute left-0 right-0 bottom-0 bg-g-danger text-[10px] font-semibold tracking-[.1em] text-center py-[3px]" style={{ color: 'var(--g-surface)' }}>
              {tiny ? '!' : 'PENGHALANG'}
            </span>
          )}
        </button>
      );
    }

    // 2. Empty slot, nothing selected: plain
    const idle = {
      background: isReeferBay ? REEFER_BG : 'var(--g-tint)',
      border: '1px solid var(--g-sunk)'
    };
    if (!selected) {
      return (
        <div key={row} title={`${coord} · kosong`} className={`${base} cursor-default`} style={idle}>
          {!tiny && <span className={`${MONO} text-[10.5px] text-g-faint`}>{coord}</span>}
        </div>
      );
    }

    // 3. Empty slot with a box selected: show whether it is a legal target
    const typeOk = config.containerType === selected.containerType;
    const floating = tier === '84' && !grid?.[bay]?.[row]?.['82'];
    if (!typeOk || floating) {
      const why = !typeOk ? `Khusus ${config.containerType}` : 'Butuh tier 82';
      return (
        <div
          key={row}
          title={`${coord} · ${!typeOk ? `slot khusus ${config.containerType}` : 'muat tier 82 di row ini dulu'}`}
          className={`${base} cursor-not-allowed opacity-60`}
          style={idle}
        >
          <span className="text-[12px] text-g-faint whitespace-nowrap">{tiny ? '—' : why}</span>
        </div>
      );
    }

    const preview = previewPlacementOverstow(grid, bay, row, tier, selected, currentPort, activePorts);
    const risky = preview.causesRestow;
    return (
      <button
        key={row}
        type="button"
        onClick={() => onCellClick(bay, row, tier)}
        title={`${coord} · muat ${selected.destination} di sini${risky ? ` · ${preview.explanation}` : ''}`}
        aria-label={`Muat di slot ${coord}${risky ? `, menimbulkan ${preview.restowCount} restow` : ''}`}
        className={`${base} cursor-pointer border border-dashed ${
          risky ? 'bg-g-warn-bg border-g-warn' : 'bg-g-green-bg border-g-green'
        }`}
      >
        <span className={`${MONO} font-medium whitespace-nowrap ${tiny ? 'text-[13px]' : 'text-[13px]'} ${risky ? 'text-g-warn-ink' : 'text-g-green-ink'}`}>
          {risky ? (tiny ? '+ !' : '+ Restow!') : (tiny ? '+' : '+ Muat di sini')}
        </span>
        {!tiny && (
          <span className={`${MONO} text-[10.5px] opacity-80 ${risky ? 'text-g-warn-ink' : 'text-g-green-ink'}`}>
            {risky ? `−${formatJt(preview.restowCount * RESTOW_PENALTY)} jt` : coord}
          </span>
        )}
      </button>
    );
  };

  // Every empty cell is a drop target; the parent re-validates the dragged
  // box (type, tier 82 support) so a drop follows the same rules as a click.
  const dropProps = (row, tier) => ({
    onDragOver: (e) => e.preventDefault(),
    onDrop: (e) => onDropOnCell(e, bay, row, tier)
  });

  return (
    <section className="g-glass px-[18px] pt-4 pb-3.5 flex flex-col gap-2.5 min-w-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <button
          type="button"
          onClick={onPrev}
          title="Bay ke arah haluan"
          className="w-[34px] h-[34px] g-pill text-[17px] leading-none"
        >
          ‹
        </button>
        <h2 className="m-0 text-[28px] font-semibold tracking-[-.025em] leading-none">Bay {bay}</h2>
        <button
          type="button"
          onClick={onNext}
          title="Bay ke arah buritan"
          className="w-[34px] h-[34px] g-pill text-[17px] leading-none"
        >
          ›
        </button>
        <span className="font-plex text-[12.5px] text-g-muted">{bayIndex + 1} / {bayCount}</span>
        <TypeChip type={config.containerType} />
        {bayIndex === 0 && <span className="text-[11px] text-g-muted border border-g-hair rounded-[5px] px-1.5">Haluan</span>}
        {bayIndex === bayCount - 1 && <span className="text-[11px] text-g-muted border border-g-hair rounded-[5px] px-1.5">Buritan</span>}
        <span className="ml-auto text-[12.5px] text-g-muted whitespace-nowrap">
          Tampak dari buritan · kiri = port · {selected ? `${validCount} slot valid` : 'pilih box di buffer'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-g-muted pb-2.5 border-b border-g-hair whitespace-nowrap">
        {portsInLegend.map((port) => (
          <span key={port} className="flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-[3px] inline-block" style={{ background: portVars(port).c }} />
            {port}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <i className="w-2.5 h-2.5 rounded-[3px] inline-block border border-g-faint" style={{ background: REEFER_BG }} />
          Reefer
        </span>
        <span>TR = transit, terkunci</span>
        <span>BARU = dimuat di {currentPort}</span>
        <span className="flex items-center gap-1.5">
          <i className="w-2.5 h-2.5 rounded-[3px] inline-block border-[1.5px] border-g-danger" />
          Penghalang restow
        </span>
        <span className="flex items-center gap-1.5">
          <i className="w-2.5 h-2.5 rounded-[3px] inline-block border border-dashed border-g-warn bg-g-warn-bg" />
          Akan menutupi {nextPort}
        </span>
      </div>

      <div
        className="flex justify-between gap-2 px-[13px] text-[11px] font-semibold tracking-[.1em] uppercase text-g-muted"
        style={{ marginLeft: tierW, fontSize: tiny ? 9.5 : 11 }}
      >
        <span className="whitespace-nowrap">Port · kiri</span>
        <span className="whitespace-nowrap">Starboard · kanan</span>
      </div>
      <div
        className={`grid px-[13px] ${MONO} text-[13px] text-g-muted text-center`}
        style={{ ...gridCols, marginLeft: tierW }}
        title={displayRows.map((r) => `${r} ${sideLabel(r)}`).join(' · ')}
      >
        {displayRows.map((r) => <span key={r}>{r}</span>)}
      </div>

      <div className="flex min-w-0">
        <div className="flex flex-col shrink-0 pt-2.5" style={{ width: tierW, gap }}>
          {config.tiers.map((tier) => {
            const underdeck = tier === '02';
            return (
              <div key={tier} className="contents">
                {underdeck && (
                  <div className="h-[22px] flex items-center text-[11px] text-g-muted whitespace-nowrap">
                    {tierW < 60 ? '' : 'Tutup palka'}
                  </div>
                )}
                <div className="flex flex-col justify-center gap-px" style={{ height: cellH }}>
                  <span className={`${MONO} text-base font-medium text-g-ink2`}>{tier}</span>
                  <span className="text-[11.5px] text-g-muted">{underdeck ? 'Palka' : 'Dek'}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="flex-1 min-w-0 flex flex-col p-2.5 border-x-[3px] border-b-[7px] border-g-structure rounded-b-xl"
          style={{ gap }}
        >
          {config.tiers.map((tier) => {
            const underdeck = tier === '02';
            return (
              <div key={tier} className="contents">
                {underdeck && (
                  <div className="h-[22px] flex items-center gap-2.5 text-[11px] font-semibold tracking-[.1em] uppercase text-g-muted">
                    <i className="flex-1 h-[3px] rounded-sm bg-g-faint block" />
                    <span>Palka</span>
                  </div>
                )}
                <div className="grid" style={{ ...gridCols, height: cellH }}>
                  {displayRows.map((row) => {
                    const occupied = grid?.[bay]?.[row]?.[tier];
                    return occupied ? renderCell(row, tier) : (
                      <div key={row} {...dropProps(row, tier)} className="contents">{renderCell(row, tier)}</div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="flex flex-wrap justify-between gap-2.5 text-[11px] tracking-[.09em] uppercase text-g-muted"
        style={{ marginLeft: tierW }}
      >
        <span className="whitespace-nowrap">Lambung port</span>
        <span className="whitespace-nowrap">Dasar ganda</span>
        <span className="whitespace-nowrap">Lambung starboard</span>
      </div>
    </section>
  );
}
