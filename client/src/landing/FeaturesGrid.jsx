import { useScrollProgress } from '../hooks/useScrollProgress';
import { 
  Sparkle, 
  Award, 
  Trophy, 
  Volume2, 
  Anchor
} from 'lucide-react';

// ------------------------------ | PRIMITIVES | ------------------------------ //

function Card({ children, className = '', style }) {
  return (
    <article
      style={style}
      className={`lp-tile relative flex min-h-[320px] flex-col lp-ink ${className}`}
    >
      {children}
    </article>
  );
}

function Title({ children, className = '' }) {
  return (
    <h3 className={`px-7 text-center lp-title lp-ink ${className}`}>
      {children}
    </h3>
  );
}

// ------------------------------ | CARD 1 — BASE UI / BAYPLAN GRID | ------------------------------ //

function BayplanGrid() {
  const cols = 5;
  const rows = 3;
  const highlight = 1 * cols + 2; // centre cell

  return (
    <div className="relative flex-1">
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div
          className="grid [mask-image:radial-gradient(ellipse_75%_75%_at_50%_50%,#000_35%,transparent_88%)]"
          style={{
            gridTemplateColumns: `repeat(${cols}, 68px)`,
            gridTemplateRows: `repeat(${rows}, 68px)`,
          }}
        >
          {Array.from({ length: cols * rows }).map((_, i) => (
            <div
              key={i}
              className={`flex size-[68px] items-center justify-center border border-black/[0.06] dark:border-white/[0.08] transition-colors ${
                i === highlight 
                  ? 'bg-emerald-500/20 border-emerald-500/50' 
                  : 'bg-slate-50 dark:bg-slate-950/40'
              }`}
            >
              {i === highlight ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-9 h-6 rounded bg-[#2E7D4E] flex items-center justify-center text-[9px] font-black text-white shadow-lg">
                    BAY 14
                  </div>
                  <span className="text-[8px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">14-01-82</span>
                </div>
              ) : i % 2 === 0 ? (
                <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-white/10" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------ | CARD 2 — MARITIME ROUTE BELT | ------------------------------ //

const ROUTE_BELT_PATH = "M-40 172C20 172 55 112 185.5 112C316 112 351 172 411 172";
const ROUTE_BELT_DURATION = 18;
const ROUTE_BELT_RIDERS = 5;

const routeStops = [
  { name: 'SBY', label: 'Surabaya', bg: 'bg-[#0072B2]' },
  { name: 'MKS', label: 'Makassar', bg: 'bg-[#E69F00]' },
  { name: 'JYP', label: 'Jayapura', bg: 'bg-[#009E73]' },
  { name: 'MDN', label: 'Medan', bg: 'bg-[#CC79A7]' },
  { name: 'SPIL', label: 'KM SPIL', bg: 'bg-[#D21E20]' },
];

function RouteBelt() {
  const step = ROUTE_BELT_DURATION / ROUTE_BELT_RIDERS;

  return (
    <div className="relative flex-1">
      {/* Dynamic Animated Motion Path */}
      <svg
        viewBox="0 0 371 258"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full motion-reduce:hidden"
      >
        <path
          d={ROUTE_BELT_PATH}
          stroke="currentColor"
          className="text-slate-200 dark:text-white/10"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        {Array.from({ length: ROUTE_BELT_RIDERS }).map((_, i) => {
          const item = routeStops[i % routeStops.length];
          return (
            <g key={`${item.name}-${i}`}>
              <animateMotion
                dur={`${ROUTE_BELT_DURATION}s`}
                begin={`${-i * step}s`}
                repeatCount="indefinite"
                calcMode="linear"
                rotate="auto"
                path={ROUTE_BELT_PATH}
              />
              <foreignObject
                x="-28"
                y="-28"
                width="56"
                height="56"
                className="overflow-visible"
              >
                <div
                  className={`flex size-[56px] flex-col items-center justify-center rounded-[18px] text-white shadow-[0_16px_32px_rgba(0,0,0,0.3)] border border-white/20 ${item.bg}`}
                >
                  <span className="text-xs font-black tracking-wider">{item.name}</span>
                  <span className="text-[7px] opacity-80 uppercase">{item.label}</span>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>

      {/* Static Fallback for Reduced Motion */}
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden items-center justify-center gap-2 motion-reduce:flex"
      >
        {routeStops.map((item) => (
          <div
            key={item.name}
            className={`flex size-[48px] flex-col items-center justify-center rounded-[14px] text-white ${item.bg}`}
          >
            <span className="text-[11px] font-black">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------ | CARD 3 — BOT AI ORBIT | ------------------------------ //

function BotOrbit() {
  return (
    <div className="relative flex-1">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-[130px] w-[240px] shrink-0">
          
          {/* Orbit Ellipse Ring */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 240 130">
            <ellipse 
              cx="120" 
              cy="65" 
              rx="100" 
              ry="45" 
              fill="none" 
              stroke="rgba(46, 125, 78, 0.25)" 
              strokeWidth="1.5" 
              strokeDasharray="6 4"
            />
          </svg>

          {/* Central AI Brain Node */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-spil-green flex items-center justify-center text-white shadow-xl shadow-emerald-900/30 border border-white/20">
            <span className="text-2xl font-black">AI</span>
          </div>

          {/* Orbiting Bot Agents */}
          {/* Bot Alpha (Smart) */}
          <div 
            className="absolute top-[20px] left-[26px] size-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-lg border border-white/20"
            title="Bot Alpha (Cerdas)"
          >
            &alpha;
          </div>

          {/* Bot Beta (Greedy) */}
          <div 
            className="absolute bottom-[16px] right-[32px] size-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-lg border border-white/20"
            title="Bot Beta (Rakus)"
          >
            &beta;
          </div>

          {/* Bot Gamma (Balanced) */}
          <div 
            className="absolute top-[28px] right-[40px] size-9 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold text-xs shadow-lg border border-white/20"
            title="Bot Gamma (Seimbang)"
          >
            &gamma;
          </div>

          {/* Decorative Sparkles */}
          <Sparkle className="absolute top-[15px] left-[170px] size-3 fill-emerald-500 text-emerald-500 dark:fill-emerald-400 dark:text-emerald-400" />
          <Sparkle className="absolute bottom-[24px] left-[45px] size-2.5 fill-rose-500 text-rose-500 dark:fill-rose-400 dark:text-rose-400" />
        </div>
      </div>
    </div>
  );
}

// ------------------------------ | CARD 4 — CODE / LOGISTICS RULE ENGINE | ------------------------------ //

function RuleCodeEditor() {
  const lines = [
    { prefix: 'rule', code: 'validatePhysics(bay14, tier84);', color: 'text-emerald-400' },
    { prefix: 'check', code: 'antiFloating: tier82.isOccupied,', color: 'text-sky-400' },
    { prefix: 'weight', code: 'stability: tier84.kg <= tier82.kg,', color: 'text-amber-400' },
    { prefix: 'restow', code: 'penalty: calculateBlocker(SBY) === 0;', color: 'text-rose-400' },
  ];

  return (
    <div className="relative flex-1">
      {/* Ambient Radial Backdrop Glow */}
      <div
        aria-hidden="true"
        className="absolute right-6 bottom-2 left-6 h-36 rounded-3xl bg-emerald-500/10 blur-2xl"
      />

      {/* Terminal Window Box */}
      <div className="absolute right-4 -bottom-6 left-[-10px] overflow-hidden rounded-2xl border border-b-0 border-black/[0.08] dark:border-white/10 bg-slate-950 shadow-[0_-8px_30px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between px-4 py-2.5 pl-5 bg-slate-900/60 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-rose-500" />
              <span className="size-2.5 rounded-full bg-amber-500" />
              <span className="size-2.5 rounded-full bg-emerald-500" />
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              stowagePhysicsEngine.ts
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
            ISO 9711
          </span>
        </div>
        <pre className="overflow-hidden px-5 py-3 font-mono text-[12px] leading-5 text-slate-300">
          {lines.map((line, i) => (
            <div key={i} className="whitespace-pre">
              <span className="text-slate-500">// [{line.prefix}] </span>
              <span className={line.color}>{line.code}</span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

// ------------------------------ | CARD 5 — TROPHY / BADGE SYSTEM | ------------------------------ //

function BadgeShowcase() {
  return (
    <div className="relative flex-1 flex items-center justify-center">
      <div className="relative flex items-center justify-center">
        {/* Glow */}
        <div className="absolute size-32 rounded-full bg-amber-500/15 blur-xl" />
        
        {/* Central Trophy Medallion */}
        <div className="relative z-10 size-20 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 p-0.5 shadow-xl shadow-yellow-500/20">
          <div className="size-full rounded-2xl bg-slate-900 dark:bg-slate-950 flex flex-col items-center justify-center text-amber-300">
            <Trophy size={32} />
            <span className="text-[9px] font-black tracking-widest mt-1 text-amber-200">MASTER</span>
          </div>
        </div>

        {/* Satellite Badges */}
        <div className="absolute -left-12 size-10 rounded-xl bg-white dark:bg-slate-950 border border-amber-500/40 flex items-center justify-center text-amber-500 dark:text-amber-400 text-xs font-bold shadow-md">
          <Award size={18} />
        </div>
        <div className="absolute -right-12 size-10 rounded-xl bg-white dark:bg-slate-950 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-md">
          <Anchor size={18} />
        </div>
      </div>
    </div>
  );
}

// ------------------------------ | CARD 6 — MULTIPLAYER & AUDIO | ------------------------------ //

function MultiplayerAudioShowcase() {
  return (
    <div className="relative flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 w-full max-w-[220px]">
        
        {/* Live Multiplayer Turn Box */}
        <div className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200/90 dark:border-white/10 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-slate-800 dark:text-white">Turn: 60s Timer</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
            ROOM #42
          </span>
        </div>

        {/* Audio Synthesizer Waveform */}
        <div className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200/90 dark:border-white/10 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 font-bold">
            <Volume2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>Web Audio SFX</span>
          </div>
          <div className="flex items-end gap-1 h-4">
            <span className="w-1 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-pulse" />
            <span className="w-1 h-4 bg-emerald-500 dark:bg-emerald-400 rounded-full" />
            <span className="w-1 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-pulse" />
            <span className="w-1 h-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full" />
          </div>
        </div>

      </div>
    </div>
  );
}

// ------------------------------ | MAIN COMPONENT | ------------------------------ //

export default function FeaturesGrid() {
  const { ref, progress } = useScrollProgress({ clamp: true });

  const getCardStyle = (index) => {
    const val = (progress - 0.2 - index * 0.04) * 5;
    const opacity = Math.min(1, Math.max(0, val));
    const translateY = Math.max(0, (1 - val) * 20);
    return {
      opacity,
      transform: `translateY(${translateY}px)`
    };
  };

  return (
    <section 
      id="features" 
      ref={ref} 
      className="lp-page lp-section px-4 sm:px-6 relative"
    >
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 md:gap-5">
        
        {/* Header */}
        <div className="text-center max-w-[760px] mx-auto mb-8 md:mb-12">
          <p className="lp-eyebrow mb-3">Fitur unggulan</p>
          <h2 className="lp-h2 lp-ink">
            Ekosistem simulator lengkap.
          </h2>
          <p className="lp-lead lp-muted mt-5">
            Dirancang mengikuti standar industri pelayaran peti kemas PT SPIL, untuk pembelajaran yang mendalam dan kompetitif.
          </p>
        </div>

        {/* TOP ROW: 3 CARDS (Grid, Route Belt, Bot Orbit) */}
        <div className="grid gap-4 md:gap-5 lg:grid-cols-[1fr_1.25fr_1fr]">
          
          {/* Card 1: Bayplan ISO 9711 Grid */}
          <Card style={getCardStyle(0)} className="pt-8">
            <Title>Matriks Bayplan ISO 9711 Interaktif</Title>
            <BayplanGrid />
          </Card>

          {/* Card 2: Route Conveyor Belt */}
          <Card style={getCardStyle(1)} className="pt-8">
            <Title>Sirkuit Pelayaran 4 Pelabuhan Utama</Title>
            <RouteBelt />
          </Card>

          {/* Card 3: Bot AI Orbit */}
          <Card style={getCardStyle(2)} className="pb-8">
            <BotOrbit />
            <Title>3 Lawan Bot AI dengan Strategi Unik</Title>
          </Card>

        </div>

        {/* BOTTOM ROW: 3 CARDS (Code Rule, Achievements, Multiplayer) */}
        <div className="grid gap-4 md:gap-5 lg:grid-cols-3">
          
          {/* Card 4: Terminal Physics Rule Engine */}
          <Card style={getCardStyle(3)} className="min-h-[300px] pt-8">
            <Title>Validasi Fisika &amp; Audit Denda Real-Time</Title>
            <RuleCodeEditor />
          </Card>

          {/* Card 5: Badge Achievement System */}
          <Card style={getCardStyle(4)} className="min-h-[300px] pt-8">
            <Title>7 Lencana Penghargaan Master Planner</Title>
            <BadgeShowcase />
          </Card>

          {/* Card 6: Multiplayer Online & Audio Engine */}
          <Card style={getCardStyle(5)} className="min-h-[300px] pt-8">
            <Title>Multiplayer Real-Time &amp; Audio Prosedural</Title>
            <MultiplayerAudioShowcase />
          </Card>

        </div>

      </div>
    </section>
  );
}
