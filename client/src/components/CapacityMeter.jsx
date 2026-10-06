import { calculateCapacityMetrics } from '../utils/gameHelpers';
import { rpJt } from './game/gameUi';

const PIPS_MAX = 30;

function Pips({ label, used, total, color, overbooked }) {
  // Large vessels have more slots than pips fit; scale the pip row down.
  const count = Math.min(total, PIPS_MAX);
  const filled = total > 0 ? Math.round((used / total) * count) : 0;
  return (
    <div className="flex flex-col gap-[5px]">
      <span className="flex justify-between items-baseline text-[11.5px] tracking-[.06em] uppercase text-g-muted">
        {label}
        <b className={`font-plex text-sm font-medium tracking-normal ${overbooked ? 'text-g-danger' : 'text-g-ink'}`}>
          {used} / {total}
        </b>
      </span>
      <span className="flex gap-0.5" role="img" aria-label={`${label}: ${used} dari ${total} slot terisi`}>
        {Array.from({ length: count }).map((_, i) => (
          <span
            key={i}
            className="flex-1 min-w-[3px] h-[5px] rounded-sm block"
            style={{ background: i < filled ? color : 'var(--g-sunk)' }}
          />
        ))}
      </span>
    </div>
  );
}

// Slot budget of the ship plus the revenue still waiting to be recognised.
export default function CapacityMeter({ grid, pendingContainers = [], waitingRevenue = 0 }) {
  const m = calculateCapacityMetrics(grid, pendingContainers);
  return (
    <div className="flex flex-col justify-center gap-2.5">
      <Pips label="Slot DRY" used={m.dry.occupied} total={m.dry.total} color="var(--g-green)" overbooked={m.dry.isOverbooked} />
      {m.reefer.total > 0 && (
        <Pips label="Slot REEFER" used={m.reefer.occupied} total={m.reefer.total} color="var(--g-info)" overbooked={m.reefer.isOverbooked} />
      )}
      <span className="flex justify-between gap-2 text-xs">
        <span className="text-g-muted">Pendapatan menunggu</span>
        <span className="font-plex text-g-green-ink">{rpJt(waitingRevenue)}</span>
      </span>
    </div>
  );
}
