import { lazy, Suspense } from 'react';
import { ArrowLeft, MousePointer2, Monitor, Network } from 'lucide-react';
import { PortChip } from '../game/Chips';

// three.js only loads once a lobby opens; the landing page and the game never pay for it.
const ShipScene = lazy(() => import('./ShipScene'));

const ROUTE = ['SBY', 'MKS', 'JYP', 'MDN'];
const MODES = [
  { id: 'OFFLINE', label: 'Lawan bot', Icon: Monitor },
  { id: 'ONLINE', label: 'Mabar online', Icon: Network }
];
const enter = (delay) => ({ animation: `g-sheet-in .6s cubic-bezier(.32,.72,0,1) ${delay}s both` });

// Full-screen pre-game lobby: the ship is the backdrop, the form floats on
// the left (on top of it on phones). The bot and online lobbies both render
// it, so switching mode swaps only the form and the ship keeps sailing.
export default function GameLobby({ icon: Icon, mode, onSwitchMode, title, subtitle, onBack, busy = false, children }) {
  return (
    <div className="relative min-h-screen overflow-hidden text-g-ink" style={{ background: 'var(--g-sky)' }}>
      <Suspense fallback={null}>
        <ShipScene busy={busy} className="absolute inset-0" />
      </Suspense>

      {/* Veils keep the panel legible over the scene. */}
      <div
        className="pointer-events-none absolute inset-0 hidden lg:block"
        style={{ background: 'linear-gradient(90deg, var(--g-sky) 0%, color-mix(in srgb, var(--g-sky) 72%, transparent) 30%, transparent 58%)' }}
      />
      <div
        className="pointer-events-none absolute inset-0 lg:hidden"
        style={{ background: 'linear-gradient(180deg, transparent 18%, color-mix(in srgb, var(--g-sky) 80%, transparent) 42%, var(--g-sky) 58%)' }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28"
        style={{ background: 'linear-gradient(180deg, var(--g-sky), transparent)' }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] hidden lg:block"
        style={{ background: 'linear-gradient(0deg, var(--g-sky) 12%, transparent)' }}
      />

      <header className="relative z-10 flex items-center gap-3 px-5 sm:px-8 lg:px-14 pt-5" style={enter(0)}>
        <button type="button" onClick={onBack} className="g-pill px-3.5 py-2 text-callout flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Beranda
        </button>
        <span className="flex items-center gap-2 ml-1">
          <span className="bg-g-red text-white font-plex text-caption font-semibold px-[7px] py-[5px] rounded-md">SPIL</span>
          <span className="text-callout font-semibold hidden sm:inline">SPIL Game</span>
        </span>
        <span className="ml-auto text-caption text-g-muted hidden sm:flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-g-green animate-pulse" aria-hidden="true" />
          Lobby pelayaran
        </span>
      </header>

      {/* The layout layer lets pointer events fall through to the ship; only the panel takes them. */}
      <main className="pointer-events-none relative z-10 min-h-[calc(100vh-64px)] grid lg:grid-cols-[minmax(360px,460px)_1fr] items-center gap-8 px-5 sm:px-8 lg:px-14 pb-8">
        <div className="pt-[34vh] lg:pt-0">
          <section className="pointer-events-auto g-glass-modal w-full p-6 sm:p-8 flex flex-col gap-5" style={enter(0.08)}>
            <div className="grid grid-cols-2 p-1 rounded-full border border-g-hair bg-g-inset" role="tablist" aria-label="Mode permainan">
              {MODES.map(({ id, label, Icon: ModeIcon }) => {
                const on = mode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => !on && onSwitchMode(id)}
                    className={`flex items-center justify-center gap-1.5 rounded-full border py-2 text-callout font-medium transition-colors ${
                      on ? 'border-g-green-line bg-g-green-nav text-g-ink' : 'border-transparent text-g-muted hover:text-g-ink'
                    }`}
                  >
                    <ModeIcon className={`w-4 h-4 ${on ? 'text-g-green-ink' : ''}`} /> {label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-start gap-3.5">
              <span className="w-11 h-11 rounded-2xl border border-g-green-line bg-g-green-nav grid place-items-center shrink-0">
                <Icon className="w-5 h-5 text-g-green-ink" />
              </span>
              <div className="min-w-0">
                <h1 className="text-title-2 font-semibold leading-tight">{title}</h1>
                <p className="text-callout text-g-muted mt-1">{subtitle}</p>
              </div>
            </div>
            <div className="border-t border-g-hair" />
            {children}
          </section>
        </div>

        {/* Ship nameplate, bottom right under the model. */}
        <aside className="hidden lg:flex self-end justify-end pb-2" style={enter(0.2)}>
          <div className="flex flex-col items-end gap-2 text-right">
            <span className="text-caption text-g-muted flex items-center gap-1.5">
              <MousePointer2 className="w-3.5 h-3.5" /> Seret untuk memutar · gulir untuk zoom · klik dua kali untuk reset
            </span>
            <span className="font-plex text-title-2 font-medium tracking-[.06em]">KM SPIL CITRA</span>
            <span className="text-callout text-g-muted">Kapal kontainer · sirkuit empat pelabuhan</span>
            <span className="flex items-center gap-1.5">
              {ROUTE.map((p, i) => (
                <span key={p} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-g-faint" aria-hidden="true">→</span>}
                  <PortChip port={p} />
                </span>
              ))}
            </span>
          </div>
        </aside>
      </main>
    </div>
  );
}
