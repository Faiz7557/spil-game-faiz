import { portChipStyle, REEFER_BG } from './gameUi';

export function PortChip({ port, suffix, className = '' }) {
  return (
    <span
      className={`font-plex text-caption font-semibold whitespace-nowrap px-[7px] py-px rounded-[5px] ${className}`}
      style={portChipStyle(port)}
    >
      {port}{suffix}
    </span>
  );
}

export function TypeChip({ type, className = '' }) {
  return (
    <span
      className={`font-plex text-caption whitespace-nowrap px-1.5 py-px rounded-[5px] border border-g-structure text-g-ink2 ${className}`}
      style={{ background: type === 'REEFER' ? REEFER_BG : 'var(--g-surface)' }}
    >
      {type}
    </span>
  );
}

export function ContractTag({ committed }) {
  return committed ? (
    <span className="text-caption font-medium px-1.5 py-px rounded-[5px] border bg-g-danger-bg border-g-danger-line text-g-danger-ink shrink-0">
      Committed
    </span>
  ) : (
    <span className="text-caption px-1.5 py-px rounded-[5px] border bg-g-inset border-g-hair text-g-muted shrink-0">
      Opsional
    </span>
  );
}
