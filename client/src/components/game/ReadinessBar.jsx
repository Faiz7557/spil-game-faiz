import CapacityMeter from '../CapacityMeter';
import { rpJt } from './gameUi';

function Check({ num, label, short, value, bad, tone, detail }) {
  const numColor = num > 0 ? (tone === 'warn' ? 'var(--g-warn)' : 'var(--g-danger)') : 'var(--g-green-ink)';
  return (
    <div className="flex-[1_1_140px] min-w-[130px] flex flex-col gap-px" title={detail}>
      <span className="font-plex text-[26px] font-medium leading-[1.1]" style={{ color: numColor }}>{num}</span>
      <span className="text-[13px]">{label}</span>
      <span className="font-plex text-[11.5px] text-g-muted overflow-hidden text-ellipsis whitespace-nowrap">{short}</span>
      <span className={`font-plex text-[13px] whitespace-nowrap ${bad ? 'text-g-danger' : 'text-g-green-ink'}`}>{value}</span>
    </div>
  );
}

// What will happen if the ship sails now: unmet contracts, unloaded boxes and
// restow blockers, with the estimated fines, next to the sail button.
export default function ReadinessBar({ grid, pendingContainers, waitingRevenue, checks, totalPenalty, depart }) {
  const { label, sub, onClick, disabled, variant } = depart;
  const btn = {
    primary: 'border-g-green bg-g-green text-white hover:bg-g-green-hover',
    ready: 'border-g-green bg-g-green-bg text-g-green-ink',
    disabled: 'border-g-hair bg-g-inset text-g-faint cursor-not-allowed'
  }[disabled ? 'disabled' : variant];

  return (
    <section className="g-glass px-[18px] py-3.5 flex flex-wrap gap-x-[22px] gap-y-4 items-stretch">
      <div className="flex-[0_1_230px] min-w-[200px]">
        <CapacityMeter grid={grid} pendingContainers={pendingContainers} waitingRevenue={waitingRevenue} />
      </div>

      <div className="flex-[1_1_380px] min-w-0 flex flex-wrap content-center gap-x-[22px] gap-y-3.5 pl-5 border-l border-g-hair max-md:pl-0 max-md:border-l-0">
        {checks.map(({ key, ...c }) => <Check key={key} {...c} />)}
        <span className="basis-full text-xs text-g-muted">
          Estimasi denda bila berangkat sekarang:{' '}
          <b className={`font-plex font-medium ${totalPenalty ? 'text-g-danger' : 'text-g-green-ink'}`}>
            {totalPenalty ? `−${rpJt(totalPenalty)}` : 'Rp 0'}
          </b>
        </span>
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`min-w-[210px] flex-[1_1_220px] rounded-2xl border px-[22px] py-3.5 flex flex-col justify-center items-start gap-0.5 text-left transition-colors ${btn}`}
      >
        <span className="text-base font-semibold tracking-[-.015em] whitespace-nowrap">{label}</span>
        <span className="text-xs opacity-90">{sub}</span>
      </button>
    </section>
  );
}
