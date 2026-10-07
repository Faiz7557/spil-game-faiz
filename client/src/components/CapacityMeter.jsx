import { calculateCapacityMetrics } from '../utils/gameHelpers';
import { rpJt } from './game/gameUi';

function Meter({ label, used, total, color, overbooked }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex justify-between items-baseline text-caption text-g-muted">
        {label}
        <span className="font-plex text-callout">
          <b className={`font-medium ${overbooked ? 'text-g-danger' : 'text-g-ink'}`}>{used}</b>
          <span className="text-g-faint"> / {total}</span>
        </span>
      </span>
      <span
        className="relative h-1.5 rounded-full overflow-hidden block"
        style={{ background: 'var(--g-inset-hover)' }}
        role="img"
        aria-label={`${label}: ${used} dari ${total} slot terisi`}
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full block transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, background: overbooked ? 'var(--g-danger)' : color }}
        />
      </span>
    </div>
  );
}

// Slot budget of the ship plus the revenue still waiting to be recognised.
export default function CapacityMeter({ grid, pendingContainers = [], waitingRevenue = 0 }) {
  const m = calculateCapacityMetrics(grid, pendingContainers);
  return (
    <div className="flex flex-col justify-center gap-2.5">
      <Meter label="Slot DRY" used={m.dry.occupied} total={m.dry.total} color="var(--g-green)" overbooked={m.dry.isOverbooked} />
      {m.reefer.total > 0 && (
        <Meter label="Slot REEFER" used={m.reefer.occupied} total={m.reefer.total} color="var(--g-info)" overbooked={m.reefer.isOverbooked} />
      )}
      <span className="flex justify-between items-baseline gap-2 text-caption pt-2 border-t border-g-hair">
        <span className="text-g-muted whitespace-nowrap">Pendapatan menunggu</span>
        <span className="font-plex text-callout text-g-green-ink whitespace-nowrap">{rpJt(waitingRevenue)}</span>
      </span>
    </div>
  );
}
