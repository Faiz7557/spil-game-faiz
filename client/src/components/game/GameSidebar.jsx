import { LogOut } from 'lucide-react';

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';

function NavButton({ item, mode, onDone }) {
  const compact = mode === 'compact';
  const on = !!item.active;
  return (
    <button
      type="button"
      title={item.label}
      onClick={() => { item.onClick?.(); onDone?.(); }}
      className={`flex items-center gap-1.5 rounded-xl border text-left whitespace-nowrap transition-colors ${
        compact ? 'justify-center py-[5px] text-xs font-plex' : 'justify-start px-2 py-[7px] text-[13.5px]'
      } ${
        on
          ? 'border-g-green-line bg-g-green-nav text-g-ink font-medium'
          : 'border-transparent hover:bg-g-inset-hover text-g-ink2'
      }`}
    >
      {compact ? item.abbr : item.label}
      {!compact && item.hint && (
        <span className="ml-auto font-plex text-[11px] text-g-muted">{item.hint}</span>
      )}
    </button>
  );
}

function Section({ label, mode }) {
  if (mode === 'compact') return <span className="block h-px bg-g-hair my-2 mx-1.5" aria-hidden="true" />;
  return (
    <span className="font-plex text-[11px] tracking-[.1em] uppercase text-g-muted px-2 pt-3 pb-1 whitespace-nowrap">
      {label}
    </span>
  );
}

// mode: 'full' | 'compact' | 'drawer'
export default function GameSidebar({ mode, open, onClose, modeLabel, playerName, groups, onLeave }) {
  const compact = mode === 'compact';
  const drawer = mode === 'drawer';

  const base = 'flex flex-col gap-0.5 g-glass-rail border-r border-g-edge overflow-y-auto overflow-x-hidden';
  const placement = drawer
    ? `fixed top-0 left-0 h-screen w-[248px] px-2.5 py-3.5 z-[46] shadow-[12px_0_32px_var(--g-shadow)] ${open ? 'visible' : 'invisible pointer-events-none'}`
    : `sticky top-0 h-screen self-start z-[12] transition-[width] duration-200 ${compact ? 'w-16 px-1.5 py-3' : 'w-[214px] px-2.5 py-3.5'}`;

  return (
    <aside className={`${base} ${placement}`} aria-label="Navigasi">
      <div className={`flex items-center gap-[9px] ${compact ? 'justify-center pt-0.5 pb-2.5' : 'px-1.5 pt-0.5 pb-3.5'}`}>
        <span className="bg-g-red text-white font-plex text-[11px] font-semibold tracking-[.05em] px-[7px] py-[5px] rounded-md shrink-0">
          SPIL
        </span>
        {!compact && (
          <span className="text-sm font-medium leading-tight whitespace-nowrap">
            Game 4 Jalur
            <span className="block text-[11.5px] font-normal text-g-muted">{modeLabel}</span>
          </span>
        )}
      </div>

      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <Section label={group.label} mode={mode} />
          {group.items.map((item) => (
            <NavButton key={item.label} item={item} mode={mode} onDone={drawer ? onClose : undefined} />
          ))}
        </div>
      ))}

      <div className={`mt-auto border-t border-g-hair pt-3 flex flex-col gap-2 ${compact ? 'items-center' : ''}`}>
        <div className={`flex items-center gap-[9px] ${compact ? 'justify-center' : 'pl-1.5'}`}>
          <span
            className="w-7 h-7 rounded-full bg-g-inset-hover grid place-items-center text-[11.5px] font-medium text-g-ink2 shrink-0"
            title={playerName}
          >
            {initials(playerName)}
          </span>
          {!compact && (
            <span className="text-[13px] leading-tight whitespace-nowrap truncate max-w-[130px]" title={playerName}>
              {playerName}
              <span className="block text-[11.5px] text-g-muted">Kapten aktif</span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onLeave}
          title="Keluar dari permainan"
          className={`flex items-center gap-1.5 g-pill text-g-ink2 ${
            compact ? 'justify-center py-1.5' : 'px-3 py-[7px] text-[13px]'
          }`}
        >
          <LogOut className="w-3.5 h-3.5" />
          {!compact && 'Keluar'}
        </button>
      </div>
    </aside>
  );
}
