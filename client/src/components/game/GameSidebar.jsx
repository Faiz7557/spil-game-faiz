import { LogOut } from 'lucide-react';

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';

function NavButton({ item, mode, onDone }) {
  const compact = mode === 'compact';
  const on = !!item.active;
  const Icon = item.icon;
  return (
    <button
      type="button"
      title={item.hint ? `${item.label} [${item.hint}]` : item.label}
      aria-label={compact ? item.label : undefined}
      aria-current={on ? 'page' : undefined}
      onClick={() => { item.onClick?.(); onDone?.(); }}
      className={`relative flex items-center gap-2 rounded-xl border text-left whitespace-nowrap transition-colors ${
        compact ? 'justify-center py-[7px]' : 'justify-start px-2 py-[7px] text-callout'
      } ${
        on
          ? 'border-g-green-line bg-g-green-nav text-g-ink font-medium'
          : 'border-transparent hover:bg-g-inset-hover text-g-ink2'
      }`}
    >
      {Icon && <Icon className={`w-4 h-4 shrink-0 ${on ? 'text-g-green-ink' : 'text-g-muted'}`} aria-hidden="true" />}
      {!compact && item.label}
      {!compact && (item.hint || item.badge) && (
        <span className="ml-auto font-plex text-caption text-g-muted">{item.hint || item.badge}</span>
      )}
      {compact && item.badge && (
        <span className="absolute top-0.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-g-inv text-g-inv-ink font-plex text-[10px] leading-4 text-center">
          {item.badge}
        </span>
      )}
    </button>
  );
}

function Section({ label, mode }) {
  if (mode === 'compact') return <span className="block h-px bg-g-hair my-2 mx-1.5" aria-hidden="true" />;
  return (
    <span className="text-caption font-semibold text-g-muted px-2 pt-3 pb-1 whitespace-nowrap">
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
        <span className="bg-g-red text-white font-plex text-caption font-semibold px-[7px] py-[5px] rounded-md shrink-0">
          SPIL
        </span>
        {!compact && (
          <span className="text-callout font-medium leading-tight whitespace-nowrap">
            Game 4 Jalur
            <span className="block text-caption font-normal text-g-muted">{modeLabel}</span>
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
            className="w-7 h-7 rounded-full bg-g-inset-hover grid place-items-center text-caption font-medium text-g-ink2 shrink-0"
            title={playerName}
          >
            {initials(playerName)}
          </span>
          {!compact && (
            <span className="text-callout leading-tight whitespace-nowrap truncate max-w-[130px]" title={playerName}>
              {playerName}
              <span className="block text-caption text-g-muted">Kapten aktif</span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onLeave}
          title="Keluar dari permainan"
          className={`flex items-center gap-1.5 g-pill text-g-ink2 ${
            compact ? 'justify-center py-1.5' : 'px-3 py-[7px] text-callout'
          }`}
        >
          <LogOut className="w-3.5 h-3.5" />
          {!compact && 'Keluar'}
        </button>
      </div>
    </aside>
  );
}
