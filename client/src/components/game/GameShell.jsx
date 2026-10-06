import { useState } from 'react';
import GameSidebar from './GameSidebar';
import Dashboard from '../Dashboard';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useElementSize } from '../../hooks/useElementSize';

// Page frame of the game: navigation sidebar on the left, sticky header on top,
// the workspace below. Navigation collapses to icons on mid widths and to a
// drawer on phones, mirroring the design's three nav modes.
export default function GameShell({
  gameMode,
  roomCode,
  isSpectator,
  spectatorName,
  playerName,
  week,
  currentPort,
  cash,
  accumulatedPenalties,
  activePorts,
  turnTimer,
  theme,
  toggleTheme,
  badgeCount,
  onOpenTariff,
  onOpenGlossary,
  onOpenISO,
  onOpenTutorial,
  onOpenAnalytics,
  onOpenBadges,
  onLeave,
  children
}) {
  const [navOpen, setNavOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const isWide = useMediaQuery('(min-width: 1536px)');
  const [headerRef, headerSize] = useElementSize();

  const navMode = !isDesktop ? 'drawer' : isWide ? 'full' : 'compact';

  const modeLabel = isSpectator
    ? 'Penonton'
    : gameMode === 'ONLINE'
      ? `Online · ${roomCode}`
      : 'Lawan bot';

  const groups = [
    {
      label: 'Pelayaran',
      items: [{ label: 'Workspace', abbr: 'WS', active: true }]
    },
    {
      label: 'Referensi',
      items: [
        { label: 'Tarif muatan', abbr: 'TR', hint: 'T', onClick: onOpenTariff },
        { label: 'Glosarium', abbr: 'GL', hint: 'G', onClick: onOpenGlossary },
        { label: 'ISO 9711', abbr: 'IS', hint: 'I', onClick: onOpenISO },
        { label: 'Tutorial', abbr: 'TU', onClick: onOpenTutorial }
      ]
    },
    {
      label: 'Komunitas',
      items: [
        { label: 'Laporan', abbr: 'LP', onClick: onOpenAnalytics },
        { label: 'Lencana', abbr: 'LC', hint: badgeCount ? String(badgeCount) : '', onClick: onOpenBadges }
      ]
    }
  ];

  return (
    <div
      className="min-h-screen grid grid-cols-[auto_minmax(0,1fr)] g-stage text-g-ink font-sans text-sm"
      style={{ '--g-header-h': `${headerSize.height || 64}px` }}
    >
      <GameSidebar
        mode={navMode}
        open={navOpen}
        onClose={() => setNavOpen(false)}
        modeLabel={modeLabel}
        playerName={playerName}
        groups={groups}
        onLeave={onLeave}
      />

      {navMode === 'drawer' && navOpen && (
        <div className="fixed inset-0 z-[45] bg-[var(--g-scrim)]" onClick={() => setNavOpen(false)} aria-hidden="true" />
      )}

      <div className="min-w-0 flex flex-col">
        {isSpectator && (
          <div className="bg-g-inv text-g-inv-ink px-6 py-[7px] flex flex-wrap items-center gap-3 text-[13px]">
            <span className="font-plex text-[11px] tracking-[.08em] border border-g-structure rounded-[5px] px-1.5 py-px">
              PENONTON
            </span>
            <span>
              Mengamati {spectatorName || 'pemain'} di room{' '}
              <span className="font-plex">{roomCode}</span> · hanya baca, semua kontrol nonaktif
            </span>
            <button
              type="button"
              onClick={onLeave}
              className="ml-auto border border-g-structure rounded-md px-2.5 py-[3px] text-[12.5px]"
            >
              Berhenti menonton
            </button>
          </div>
        )}

        <Dashboard
          headerRef={headerRef}
          theme={theme}
          toggleTheme={toggleTheme}
          week={week}
          currentPort={currentPort}
          cash={cash}
          accumulatedPenalties={accumulatedPenalties}
          roomCode={gameMode === 'ONLINE' ? roomCode : 'LOCAL PLAY'}
          activePorts={activePorts}
          turnTimer={turnTimer}
          onOpenTariff={onOpenTariff}
          onOpenNav={() => setNavOpen(true)}
          showMenuButton={navMode === 'drawer'}
        />

        {children}
      </div>
    </div>
  );
}
