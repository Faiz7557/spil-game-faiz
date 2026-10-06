import { Sun, Moon, Menu } from 'lucide-react';
import { getNextPort, TOTAL_GAME_WEEKS, HORIZON_WEEKS, PORTS } from '../utils/gameHelpers';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useTheme } from '../hooks/useTheme';
import { formatJt, portVars } from './game/gameUi';

// Sticky top bar of the game workspace: where we are in the voyage (week,
// route), the captain's cash and fines, the turn timer and quick references.
export default function Dashboard({
  week,
  currentPort,
  cash,
  accumulatedPenalties,
  roomCode,
  activePorts,
  turnTimer,
  onOpenTariff,
  onOpenNav,
  showMenuButton,
  headerRef,
  theme: propTheme,
  toggleTheme: propToggle
}) {
  const hookTheme = useTheme();
  const theme = propTheme || hookTheme.theme;
  const toggleTheme = propToggle || hookTheme.toggleTheme;
  const isDark = theme === 'dark';

  const showRoute = useMediaQuery('(min-width: 900px)');
  const showDenda = useMediaQuery('(min-width: 720px)');

  const route = activePorts && activePorts.length > 0 ? activePorts : PORTS;
  const nextPort = getNextPort(currentPort, activePorts);
  const currentIdx = route.indexOf(currentPort);
  const isOnlineRoom = roomCode && !roomCode.includes('LOCAL');
  const inDrain = week > HORIZON_WEEKS;

  const timerLow = turnTimer && turnTimer.remainingSeconds <= 10;
  const timerText = turnTimer
    ? `${Math.floor(turnTimer.remainingSeconds / 60)}:${String(turnTimer.remainingSeconds % 60).padStart(2, '0')}`
    : '';

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-10 g-glass-rail border-b border-g-edge px-[clamp(12px,2vw,22px)] py-2.5 flex flex-wrap items-center gap-x-[22px] gap-y-3"
    >
      {showMenuButton && (
        <button
          type="button"
          onClick={onOpenNav}
          className="g-pill px-3 py-1.5 text-[13px] flex items-center gap-1.5"
        >
          <Menu className="w-3.5 h-3.5" /> Menu
        </button>
      )}

      <div className="min-w-0">
        <div className="font-plex text-[11px] tracking-[.1em] uppercase text-g-muted whitespace-nowrap">
          Minggu {week} / {TOTAL_GAME_WEEKS} · {currentPort} → {nextPort}{inDrain ? ' · masa pengosongan' : ''}
        </div>
        <h1 className="m-0 mt-px text-[19px] font-medium tracking-[-.015em]">Workspace bayplan</h1>
      </div>

      {showRoute && (
        <div className="flex items-center gap-[5px] flex-wrap" aria-label="Rute pelayaran">
          {route.map((port, i) => {
            const isCurrent = port === currentPort;
            const isNext = port === nextPort;
            const done = currentIdx > -1 && i < currentIdx;
            const p = portVars(port);
            let style = { border: '1px solid var(--g-hair)', color: 'var(--g-faint)' };
            let suffix = done ? ' ✓' : '';
            if (isCurrent) {
              style = { border: `1px solid ${p.c}`, background: p.c, color: '#FFFFFF' };
              suffix = ' · sandar';
            } else if (isNext) {
              style = { border: `1px solid ${p.c}`, background: p.bg, color: p.ink };
              suffix = ' · berikutnya';
            }
            return (
              <span key={port} className="contents">
                {i > 0 && <span className="text-g-structure">›</span>}
                <span className="font-plex text-[11.5px] font-semibold whitespace-nowrap px-[7px] py-0.5 rounded-[5px]" style={style}>
                  {port}{suffix}
                </span>
              </span>
            );
          })}
        </div>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-x-[clamp(10px,1.6vw,20px)] gap-y-2.5">
        {isOnlineRoom && (
          <span className="flex items-center gap-2">
            <span className="font-plex text-xs text-g-muted">Room {roomCode}</span>
            {turnTimer && (
              <span
                className={`font-plex text-[13px] font-medium px-[9px] py-0.5 rounded-md border ${
                  timerLow ? 'border-g-danger bg-g-danger-bg text-g-danger' : 'border-g-hair bg-g-inset text-g-ink'
                }`}
                title="Batas waktu giliran"
              >
                {timerText}
              </span>
            )}
          </span>
        )}

        <span className="flex flex-col">
          <span className="text-[11.5px] text-g-muted">Kas</span>
          <span className={`font-plex text-[19px] font-medium tracking-[-.01em] whitespace-nowrap ${cash >= 0 ? 'text-g-green-ink' : 'text-g-danger'}`}>
            Rp {formatJt(cash)} jt
          </span>
        </span>

        {showDenda && (
          <span className="flex flex-col">
            <span className="text-[11.5px] text-g-muted whitespace-nowrap">Denda terkumpul</span>
            <span className={`font-plex text-[15px] font-medium whitespace-nowrap ${accumulatedPenalties > 0 ? 'text-g-danger' : 'text-g-faint'}`}>
              Rp {formatJt(accumulatedPenalties)} jt
            </span>
          </span>
        )}

        <button
          type="button"
          onClick={onOpenTariff}
          title="Buka tarif muatan [T]"
          className="g-pill px-3.5 py-[7px] text-[13px]"
        >
          Referensi
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Beralih ke tema terang' : 'Beralih ke tema gelap'}
          title={isDark ? 'Tema terang' : 'Tema gelap'}
          className="g-pill px-3.5 py-[7px] text-[13px] flex items-center gap-1.5 whitespace-nowrap"
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          {isDark ? 'Tema terang' : 'Tema gelap'}
        </button>
      </div>
    </header>
  );
}
