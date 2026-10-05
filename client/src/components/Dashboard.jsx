import { formatRupiah, PORT_NAMES, getNextPort, PORT_CODES_INFO, TOTAL_GAME_WEEKS, HORIZON_WEEKS } from '../utils/gameHelpers';
import { Calendar, Wallet, AlertTriangle, ArrowRight, Anchor, CheckCircle2, Trophy, FileText, BookOpen, Clock, Compass, Ship, BarChart3, Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function Dashboard({ 
  week, 
  currentPort, 
  cash, 
  accumulatedPenalties, 
  roomCode, 
  players, 
  socketId, 
  activePorts,
  turnTimer,
  onOpenTariff,
  onOpenGlossary,
  onOpenTutorial,
  onOpenISO,
  onOpenAnalytics,
  onOpenBadges,
  theme: propTheme,
  toggleTheme: propToggle
}) {
  const nextPort = getNextPort(currentPort, activePorts);
  const playersList = players ? Object.values(players).sort((a, b) => b.cash - a.cash) : [];
  
  const hookTheme = useTheme();
  const theme = propTheme || hookTheme.theme;
  const toggleTheme = propToggle || hookTheme.toggleTheme;
  const isDark = theme === 'dark';
  
  return (
    <header className="w-full flex flex-col gap-5 mb-6 animate-slide-up">
      {/* Top Banner: Corporate Header */}
      <div className="w-full bg-white dark:bg-slate-900 border border-black/[0.06] dark:border-white/10 rounded-[20px] p-5 flex flex-col lg:flex-row justify-between items-center gap-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-xl relative overflow-hidden transition-colors">
        {/* Subtle Background Pattern */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        {/* Logo & Game Info */}
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="w-16 h-12 flex items-center justify-center shrink-0">
            <svg 
              viewBox="0 0 100 65" 
              className="w-full h-full drop-shadow-sm select-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M 10 5 Q 30 15, 50 5 T 90 5 L 85 45 Q 65 45, 45 55 T 5 45 Z" 
                fill="#D21E20" 
                stroke="#B5181A" 
                strokeWidth="1.5"
              />
              <rect x="3" y="2" width="4" height="60" fill="#94a3b8" rx="1" />
              <circle cx="5" cy="2" r="3" fill="#64748b" />
              <text 
                x="45" 
                y="30" 
                fill="#FFFFFF" 
                fontSize="18" 
                fontWeight="900" 
                fontFamily="'Outfit', 'Inter', sans-serif"
                textAnchor="middle" 
                transform="rotate(6, 45, 30)"
                letterSpacing="1"
              >
                SPIL
              </text>
            </svg>
          </div>
          
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-2 font-display transition-colors">
              SPIL Game: 4 Jalur 
              <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-full uppercase tracking-wider">
                Active Session
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-400 font-extrabold tracking-wider uppercase mt-0.5">
              Portal Perencanaan Stowage & Manajemen Pelayaran
            </p>
          </div>
        </div>

        {/* Room / Mode Indicator */}
        {roomCode && (
          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/80 border border-black/[0.06] dark:border-white/10 px-4 py-2.5 rounded-xl self-start lg:self-auto shrink-0 shadow-xs">
            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider">KODE ROOM:</span>
            <span className={`text-sm font-black uppercase tracking-widest ${roomCode.includes('LOCAL') ? 'text-emerald-700 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
              {roomCode}
            </span>
          </div>
        )}

        {/* Turn Countdown Timer */}
        {turnTimer && (
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border shadow-xs transition-all duration-300 self-start lg:self-auto shrink-0 ${
            turnTimer.remainingSeconds <= 10 
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 animate-pulse' 
              : turnTimer.remainingSeconds <= 20
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-400'
              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400'
          }`}>
            <Clock className="w-4 h-4 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-wider">Batas Waktu:</span>
              <span className="text-sm font-black font-mono leading-none">
                {String(Math.floor(turnTimer.remainingSeconds / 60)).padStart(2, '0')}:{String(turnTimer.remainingSeconds % 60).padStart(2, '0')}
              </span>
            </div>
          </div>
        )}

        {/* Quick Action Buttons & Theme Toggle */}
        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          {onOpenTariff && (
            <button
              type="button"
              onClick={onOpenTariff}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-black/[0.06] dark:border-white/10 hover:border-emerald-300 dark:hover:border-emerald-700 text-slate-700 dark:text-slate-200 hover:text-emerald-800 dark:hover:text-emerald-300 text-xs font-black uppercase tracking-wider transition-all shadow-xs hover:scale-[1.02] active:scale-95"
              title="Buka Lembar Informasi Tarif Muatan PT. SPIL [T]"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Info Tarif</span>
            </button>
          )}

          {onOpenGlossary && (
            <button
              type="button"
              onClick={onOpenGlossary}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-black/[0.06] dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-700 dark:text-slate-200 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs font-black uppercase tracking-wider transition-all shadow-xs hover:scale-[1.02] active:scale-95"
              title="Buka Glosarium & Standar Operasional SPIL Game [G]"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Glosarium</span>
            </button>
          )}

          {onOpenISO && (
            <button
              type="button"
              onClick={onOpenISO}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 border border-black/[0.06] dark:border-white/10 hover:border-cyan-300 dark:hover:border-cyan-700 text-slate-700 dark:text-slate-200 hover:text-cyan-800 dark:hover:text-cyan-300 text-xs font-black uppercase tracking-wider transition-all shadow-xs hover:scale-[1.02] active:scale-95"
              title="Buka Visualisator Standar ISO 9711 (Bay-Row-Tier) [I]"
            >
              <Ship className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>ISO 9711</span>
            </button>
          )}

          {onOpenTutorial && (
            <button
              type="button"
              onClick={onOpenTutorial}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-black uppercase tracking-wider transition-all shadow-xs hover:scale-[1.02] active:scale-95"
              title="Buka Panduan & Tutorial Interaktif"
            >
              <Compass className="w-3.5 h-3.5 text-spil-green dark:text-emerald-400" />
              <span>Tutorial</span>
            </button>
          )}

          {onOpenAnalytics && (
            <button
              type="button"
              onClick={onOpenAnalytics}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-black/[0.06] dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider transition-all shadow-xs hover:scale-[1.02] active:scale-95"
              title="Buka Laporan Audit Pembelajaran"
            >
              <BarChart3 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>Laporan</span>
            </button>
          )}

          {onOpenBadges && (
            <button
              type="button"
              onClick={onOpenBadges}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-black uppercase tracking-wider transition-all shadow-xs hover:scale-[1.02] active:scale-95"
              title="Buka Galeri Lencana & Pencapaian"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Lencana</span>
            </button>
          )}

          {/* Theme Toggle Button in Header */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/15 bg-white dark:bg-slate-800/90 text-slate-700 dark:text-amber-400 hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer"
            title={isDark ? "Beralih ke Mode Terang (Light Mode)" : "Beralih ke Mode Gelap (Dark Mode)"}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">
              {isDark ? "Terang" : "Gelap"}
            </span>
          </button>
        </div>

        {/* Port Sailing Voyage Timeline */}
        <div className="flex items-center gap-3 bg-slate-50/70 dark:bg-slate-800/60 p-2.5 rounded-xl border border-black/[0.06] dark:border-white/10 w-full lg:w-auto shadow-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-wider pl-1">
            <Anchor className="w-3.5 h-3.5 text-spil-green dark:text-emerald-400" /> Port
          </div>
          <span className="px-3 py-1.5 rounded-lg text-xs font-black uppercase bg-spil-green text-white shadow-xs flex items-center gap-1 select-none">
            {PORT_CODES_INFO[currentPort]?.fullLabel || currentPort}
            <span className="text-[9px] font-medium text-emerald-100">({PORT_NAMES[currentPort]})</span>
          </span>
          
          <div className="flex flex-col items-center shrink-0">
            <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">Sailing</span>
            <ArrowRight className="w-4 h-4 text-slate-400 animate-bounce-horizontal" />
          </div>
          
          <span className="px-3 py-1.5 rounded-lg text-xs font-black uppercase bg-indigo-600 text-white shadow-xs flex items-center gap-1 select-none">
            {PORT_CODES_INFO[nextPort]?.fullLabel || nextPort}
            <span className="text-[9px] font-medium text-indigo-200">({PORT_NAMES[nextPort]})</span>
          </span>
        </div>
      </div>

      {/* Stats Cards & Leaderboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left Side: Stats cards */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Week Tracker Card */}
          <div className="glass-panel p-5 flex items-center justify-between border-l-4 border-l-indigo-600 hover:shadow-md transition-all duration-300">
            <div>
              <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase block mb-1">
                SIKLUS WAKTU
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-slate-800 dark:text-white">
                  Minggu {week} <span className="text-slate-400 text-xs font-bold uppercase">/ {TOTAL_GAME_WEEKS}</span>
                </span>
                {week > HORIZON_WEEKS && (
                  <span className="text-[9px] font-black bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    Drain Phase
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (week / TOTAL_GAME_WEEKS) * 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          {/* Cash Balance Card */}
          <div className="glass-panel p-5 flex items-center justify-between border-l-4 border-l-spil-green hover:shadow-md transition-all duration-300">
            <div>
              <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase block mb-1">
                SALDO KAPTEN
              </span>
              <span className={`text-xl font-black tracking-tight ${cash >= 0 ? 'text-spil-green dark:text-emerald-400' : 'text-spil-red dark:text-red-400'}`}>
                {formatRupiah(cash)}
              </span>
              <span className="text-[8px] text-slate-400 font-bold block mt-2 uppercase">Target: Rp 300.000.000+</span>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-xs ${
              cash >= 0 
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-spil-green dark:text-emerald-400' 
                : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-spil-red dark:text-red-400 animate-pulse'
            }`}>
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          {/* Accumulated Penalties Card */}
          <div className="glass-panel p-5 flex items-center justify-between border-l-4 border-l-spil-red hover:shadow-md transition-all duration-300">
            <div>
              <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase block mb-1">
                AKUMULASI DENDA
              </span>
              <span className={`text-xl font-black tracking-tight ${accumulatedPenalties > 0 ? 'text-spil-red dark:text-red-400' : 'text-slate-400'}`}>
                {formatRupiah(accumulatedPenalties)}
              </span>
              <span className="text-[8px] text-slate-400 font-bold block mt-2 uppercase">Denda Shifting & Rolling</span>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-xs ${
              accumulatedPenalties > 0 
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-spil-red dark:text-red-400 animate-shake' 
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Right Side: Shared Papan Peringkat (Leaderboard) */}
        <div className="lg:col-span-1 glass-panel p-4 flex flex-col justify-between border-l-4 border-l-indigo-600 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50/20 dark:bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase block mb-3 flex items-center gap-1.5 border-b border-black/[0.06] dark:border-white/10 pb-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" /> Papan Peringkat
            </span>
            
            <div className="space-y-2 max-h-[110px] overflow-y-auto pr-1 scrollbar-thin">
              {playersList.map((p, idx) => {
                const isMe = p.id === socketId;
                
                // Rank badges
                let rankBadge = (
                  <span className="font-extrabold text-[9px] text-slate-400 w-4 text-center">#{idx + 1}</span>
                );
                if (idx === 0) rankBadge = <span className="w-4 flex justify-center text-amber-500 font-bold" title="Juara 1">🥇</span>;
                if (idx === 1) rankBadge = <span className="w-4 flex justify-center text-slate-400 font-bold" title="Juara 2">🥈</span>;
                if (idx === 2) rankBadge = <span className="w-4 flex justify-center text-amber-700 font-bold" title="Juara 3">🥉</span>;

                return (
                  <div 
                    key={p.id} 
                    className={`flex items-center justify-between text-xs p-2 rounded-xl border transition-all duration-200 ${
                      isMe 
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 font-black text-indigo-900 dark:text-indigo-200 shadow-xs scale-[0.99]' 
                        : 'bg-slate-50/50 dark:bg-slate-800/50 border-black/[0.06] dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {rankBadge}
                      <span className="truncate max-w-[75px] font-bold" title={p.name}>{p.name}</span>
                      {p.ready && (
                        <span className="flex items-center text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-full p-0.5" title="Siap Berlayar">
                          <CheckCircle2 className="w-3 h-3 fill-emerald-600 text-white" />
                        </span>
                      )}
                    </div>
                    <span className={`font-extrabold shrink-0 text-[11px] ${p.cash >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-spil-red dark:text-red-400'}`}>
                      {Math.abs(p.cash) >= 1000000000 
                        ? `${(p.cash / 1000000000).toFixed(1)}M` 
                        : `${(p.cash / 1000000).toFixed(0)}Jt`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
