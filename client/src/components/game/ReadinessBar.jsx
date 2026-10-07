import { ArrowRight, Check as CheckIcon, ClipboardList, Layers, Loader2, PackageX, Ship } from 'lucide-react';
import CapacityMeter from '../CapacityMeter';
import { PortChip } from './Chips';
import { rpJt } from './gameUi';

const ICONS = { committed: ClipboardList, rolled: PackageX, restow: Layers };

function Check({ id, num, label, short, value, bad, tone, detail }) {
  const Icon = ICONS[id] || ClipboardList;
  const warn = tone === 'warn';
  const skin = !bad
    ? { box: 'border-g-hair bg-g-inset', ink: 'text-g-green-ink', icon: 'text-g-green-ink' }
    : warn
      ? { box: 'border-g-warn-line bg-g-warn-bg', ink: 'text-g-warn-ink', icon: 'text-g-warn' }
      : { box: 'border-g-danger-line bg-g-danger-bg', ink: 'text-g-danger-ink', icon: 'text-g-danger' };
  return (
    <div className={`rounded-xl border px-3 py-2.5 flex flex-col gap-1.5 min-w-0 transition-colors ${skin.box}`} title={detail}>
      <span className="flex items-start gap-1.5 text-caption leading-tight text-g-ink2">
        <Icon className={`w-3.5 h-3.5 mt-px shrink-0 ${skin.icon}`} aria-hidden="true" />
        {label}
      </span>
      <span className="flex items-baseline gap-2">
        <span className={`font-plex text-title-2 font-medium leading-none ${bad ? skin.ink : 'text-g-ink'}`}>{num}</span>
        <span className={`ml-auto font-plex text-caption whitespace-nowrap ${skin.ink}`}>{bad ? value : 'aman'}</span>
      </span>
      <span className="text-caption leading-tight text-g-muted">{short}</span>
    </div>
  );
}

// What will happen if the ship sails now: slot budget on the left, the three
// things that cost money in the middle, and the total fine with the sail
// button on the right.
export default function ReadinessBar({ grid, pendingContainers, waitingRevenue, checks, totalPenalty, depart, currentPort, nextPort }) {
  const { label, sub, onClick, disabled, variant, busy } = depart;
  const state = busy ? 'busy' : disabled ? 'disabled' : variant;
  const btn = {
    primary: 'g-btn-green',
    busy: 'g-btn-green cursor-wait',
    ready: 'bg-g-green-bg text-g-green-ink border-g-green-line hover:bg-g-green-nav active:scale-[.98]',
    disabled: 'bg-g-inset text-g-faint border-g-hair cursor-not-allowed'
  }[state];
  const solid = state === 'primary' || state === 'busy';

  return (
    <section className="g-glass p-3.5 flex flex-wrap gap-3.5 items-stretch">
      <div className="flex-[1_1_200px] max-w-full rounded-xl border border-g-hair bg-g-inset px-3 py-2.5 flex flex-col justify-center">
        <CapacityMeter grid={grid} pendingContainers={pendingContainers} waitingRevenue={waitingRevenue} />
      </div>

      <div className="flex-[3_1_440px] grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5 min-w-0">
        {checks.map(({ key, ...c }) => <Check key={key} id={key} {...c} />)}
      </div>

      <div className="group/depart flex-[1_1_240px] rounded-xl border border-g-hair bg-g-inset px-3 py-2.5 flex flex-col gap-2.5 min-w-0">
        {/* route: the little ship leans toward the next port while the button is hovered */}
        <div className="flex items-center gap-2" aria-label={`Rute ${currentPort} ke ${nextPort}`}>
          <PortChip port={currentPort} />
          <span className="relative flex-1 h-4 flex items-center" aria-hidden="true">
            <span className="w-full border-t border-dashed border-g-structure" />
            <Ship
              className={`absolute left-[calc(50%-8px)] w-4 h-4 transition-transform duration-500 ease-[cubic-bezier(.34,1.3,.64,1)] ${
                state === 'primary' ? 'text-g-green-ink group-hover/depart:translate-x-6' : 'text-g-faint'
              } ${busy ? 'animate-pulse' : ''}`}
            />
          </span>
          <PortChip port={nextPort} />
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <span className="text-caption text-g-muted">Estimasi denda</span>
          {totalPenalty ? (
            <span className="font-plex text-headline font-medium text-g-danger whitespace-nowrap">−{rpJt(totalPenalty)}</span>
          ) : (
            <span className="flex items-center gap-1 font-plex text-callout text-g-green-ink whitespace-nowrap">
              <CheckIcon className="w-3.5 h-3.5" aria-hidden="true" /> Tanpa denda
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-busy={busy || undefined}
          className={`mt-auto w-full rounded-full border pl-1.5 pr-1.5 py-1.5 flex items-center gap-2.5 text-left ${btn}`}
        >
          <span
            className={`w-8 h-8 rounded-full grid place-items-center shrink-0 ${solid ? 'bg-g-green-bg border border-g-green-line' : 'bg-g-inset'}`}
            aria-hidden="true"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ship className="w-4 h-4" />}
          </span>
          <span className="flex flex-col min-w-0 flex-1 leading-tight">
            <span className="text-callout font-semibold truncate">{label}</span>
            {sub && <span className="text-caption opacity-85 truncate">{sub}</span>}
          </span>
          {state === 'primary' && (
            <span className="w-8 h-8 rounded-full grid place-items-center shrink-0 bg-g-green-bg border border-g-green-line" aria-hidden="true">
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/depart:translate-x-0.5" />
            </span>
          )}
        </button>
      </div>
    </section>
  );
}
