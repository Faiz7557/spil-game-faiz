import { useState } from 'react';
import { 
  Monitor, 
  Network, 
  Award, 
  LogIn, 
  X, 
  Ship, 
  Layers, 
  Anchor, 
  Zap, 
  Trophy, 
  Bot, 
  Navigation
} from 'lucide-react';

// Showcase cards for the infinite horizontal marquee (Alternatif A: Stylized Game Showcase)
const SHOWCASE_CARDS = [
  {
    title: 'Bayplan ISO 9711',
    subtitle: 'Stowage Matrix Realistis',
    badge: 'FITUR UTAMA',
    badgeColor: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    icon: Layers,
    renderVisual: () => (
      <div className="w-full h-28 bg-slate-100 dark:bg-slate-950/80 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
        <span className="text-[9px] font-mono text-slate-500">BAY 14 &bull; TIER 84 / 82 / 02</span>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-6 rounded bg-[#0072B2] text-white text-[9px] font-bold flex items-center justify-center">SBY</div>
          <div className="h-6 rounded bg-[#E69F00] text-white text-[9px] font-bold flex items-center justify-center">MKS</div>
          <div className="h-6 rounded bg-[#009E73] text-white text-[9px] font-bold flex items-center justify-center">JYP</div>
        </div>
        <div className="w-full h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-6 rounded bg-[#CC79A7] text-white text-[9px] font-bold flex items-center justify-center">MDN</div>
          <div className="h-6 rounded border border-dashed border-slate-300 dark:border-slate-700" />
          <div className="h-6 rounded bg-[#0072B2] text-white text-[9px] font-bold flex items-center justify-center">SBY</div>
        </div>
      </div>
    )
  },
  {
    title: 'Armada Kapal SPIL',
    subtitle: 'Kapal Peti Kemas Nusantara',
    badge: 'KAPAL RESMI',
    badgeColor: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30',
    icon: Ship,
    renderVisual: () => (
      <div className="w-full h-28 bg-slate-100 dark:bg-slate-950/80 rounded-xl p-3 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-sky-500/10 dark:from-sky-950/40 to-transparent" />
        <svg viewBox="0 0 100 50" className="w-24 h-14 text-white drop-shadow-md">
          <polygon points="10,35 90,35 75,45 15,45" fill="#D21E20" />
          <rect x="25" y="20" width="35" height="15" fill="#2E7D4E" rx="1" />
          <rect x="65" y="15" width="12" height="20" fill="#f8fafc" rx="1" />
          <rect x="70" y="8" width="4" height="7" fill="#D21E20" />
          <line x1="12" y1="36" x2="88" y2="36" stroke="#f8fafc" strokeWidth="1" />
        </svg>
        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 mt-1">KM. SPIL CITRA</span>
      </div>
    )
  },
  {
    title: '3 Bot AI Rival',
    subtitle: 'Tantangan Strategi Berbeda',
    badge: 'AI ENGINE',
    badgeColor: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    icon: Bot,
    renderVisual: () => (
      <div className="w-full h-28 bg-slate-100 dark:bg-slate-950/80 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800 flex items-center justify-around">
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow">&alpha;</div>
          <span className="text-[8px] font-bold text-slate-700 dark:text-slate-300">Alpha</span>
          <span className="text-[7px] text-slate-500">Cerdas</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow">&beta;</div>
          <span className="text-[8px] font-bold text-slate-700 dark:text-slate-300">Beta</span>
          <span className="text-[7px] text-slate-500">Rakus</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-sky-500 text-white font-bold text-xs flex items-center justify-center shadow">&gamma;</div>
          <span className="text-[8px] font-bold text-slate-700 dark:text-slate-300">Gamma</span>
          <span className="text-[7px] text-slate-500">Seimbang</span>
        </div>
      </div>
    )
  },
  {
    title: '7 Lencana Prestasi',
    subtitle: 'Pencapaian Kapten Terbaik',
    badge: 'ACHIEVEMENT',
    badgeColor: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
    icon: Trophy,
    renderVisual: () => (
      <div className="w-full h-28 bg-slate-100 dark:bg-slate-950/80 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400 flex flex-col items-center justify-center shadow-inner">
          <Trophy size={18} />
          <span className="text-[7px] font-black mt-0.5">MASTER</span>
        </div>
        <div className="flex flex-col gap-1 text-left">
          <span className="text-[10px] font-bold text-slate-800 dark:text-white">&bull; Zero Shifting</span>
          <span className="text-[10px] font-bold text-slate-800 dark:text-white">&bull; Profit Titan</span>
          <span className="text-[10px] font-bold text-slate-800 dark:text-white">&bull; Bot Beater</span>
        </div>
      </div>
    )
  },
  {
    title: 'Multiplayer Real-Time',
    subtitle: 'Ruang Tanding Kompetitif',
    badge: 'KOMPETISI',
    badgeColor: 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30',
    icon: Zap,
    renderVisual: () => (
      <div className="w-full h-28 bg-slate-100 dark:bg-slate-950/80 rounded-xl p-3 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE ONLINE
          </span>
          <span className="text-[8px] font-mono text-slate-500">ROOM #8821</span>
        </div>
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <span>Kapten A (Anda)</span>
          <span className="text-amber-500">VS</span>
          <span>Kapten B</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div className="bg-spil-green h-full rounded-full w-3/4" />
        </div>
      </div>
    )
  },
  {
    title: 'Siklus 4 Rute Laut',
    subtitle: 'Surabaya - Makassar - Jayapura - Medan',
    badge: 'PELABUHAN',
    badgeColor: 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30',
    icon: Navigation,
    renderVisual: () => (
      <div className="w-full h-28 bg-slate-100 dark:bg-slate-950/80 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-around pt-2">
          <span className="px-2 py-1 bg-[#0072B2] text-white rounded text-[9px] font-black">SBY</span>
          <span className="text-slate-400 text-xs">&rarr;</span>
          <span className="px-2 py-1 bg-[#E69F00] text-white rounded text-[9px] font-black">MKS</span>
          <span className="text-slate-400 text-xs">&rarr;</span>
          <span className="px-2 py-1 bg-[#009E73] text-white rounded text-[9px] font-black">JYP</span>
        </div>
        <div className="flex items-center justify-between px-2 text-[8px] text-slate-500">
          <span>Surabaya</span>
          <span>&bull;&bull;&bull;</span>
          <span>Makassar</span>
          <span>&bull;&bull;&bull;</span>
          <span>Jayapura</span>
          <span>&bull;&bull;&bull;</span>
          <span>Medan</span>
        </div>
        <span className="text-[8px] text-slate-500 text-center">11 Minggu Simulasi Penuh</span>
      </div>
    )
  }
];

export default function CTASection({
  onSelectOffline,
  onSelectOnline,
  onOpenLeaderboard,
  onOpenAuth,
  onOpenTariff,
  onOpenGlossary,
  authUser,
  onLogout
}) {
  // Opsi 2: State for Mode Selection Modal
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);

  // Duplicate cards for seamless infinite horizontal marquee
  const duplicatedCards = [...SHOWCASE_CARDS, ...SHOWCASE_CARDS];

  return (
    <section 
      id="cta" 
      className="relative w-full min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-between text-center px-4 pt-20 pb-8 transition-colors"
    >
      {/* Background Ambience Radial Glows */}
      <div className="absolute top-0 inset-x-0 h-96 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-spil-green/10 dark:from-spil-green/30 via-slate-50/50 dark:via-slate-950/70 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-spil-red/10 rounded-full blur-3xl pointer-events-none" />

      {/* Account Status Badge (Top Right) */}
      <div className="absolute top-8 right-6 z-20">
        {authUser ? (
          <div className="flex items-center gap-3 bg-white/80 dark:bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-black/[0.08] dark:border-white/15 shadow-md">
            <span className="text-xs font-bold text-slate-800 dark:text-white">👤 {authUser.username}</span>
            <button 
              onClick={onLogout} 
              className="text-[10px] bg-rose-500/20 hover:bg-rose-500 text-rose-700 dark:text-rose-300 hover:text-white py-1 px-2.5 rounded-full font-black uppercase transition-colors"
            >
              Keluar
            </button>
          </div>
        ) : (
          <button 
            onClick={onOpenAuth} 
            className="flex items-center gap-2 text-xs bg-emerald-500/15 dark:bg-emerald-500/20 hover:bg-emerald-600 text-emerald-800 dark:text-emerald-300 hover:text-white py-2 px-4 rounded-full font-extrabold uppercase tracking-wider border border-emerald-500/30 transition-all shadow-md"
          >
            <LogIn size={14} /> Masuk / Daftar
          </button>
        )}
      </div>

      {/* MAIN HERO CONTENT */}
      <div className="z-10 flex flex-col items-center max-w-4xl mx-auto my-auto pt-6">
        
        {/* SPIL Corporate Waving Red Flag SVG */}
        <div className="w-20 h-14 mb-6 flex justify-center transform hover:scale-110 transition-transform duration-300">
          <svg viewBox="0 0 100 65" className="w-full h-full drop-shadow-xl select-none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 10 5 Q 30 15, 50 5 T 90 5 L 85 45 Q 65 45, 45 55 T 5 45 Z" fill="#D21E20" stroke="#B5181A" strokeWidth="1.5" />
            <rect x="3" y="2" width="4" height="60" fill="#94a3b8" rx="1" />
            <circle cx="5" cy="2" r="3" fill="#64748b" />
            <text x="45" y="30" fill="#FFFFFF" fontSize="18" fontWeight="900" fontFamily="'Outfit', 'Inter', sans-serif" textAnchor="middle" transform="rotate(6, 45, 30)" letterSpacing="1">SPIL</text>
          </svg>
        </div>

        {/* Tagline Pill Badge */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-xs md:text-sm font-bold text-emerald-800 dark:text-emerald-400 backdrop-blur-md shadow-xs">
          <Anchor size={14} /> SIMULATOR STOWAGE & PELAYARAN RESMI PT SPIL
        </div>

        {/* Main Display Headline */}
        <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white mb-6 font-display leading-[1.1] transition-colors">
          Siap Menjadi Chief Officer <br />
          <span className="bg-gradient-to-r from-emerald-600 dark:from-emerald-400 via-slate-800 dark:via-white to-spil-red dark:to-rose-400 bg-clip-text text-transparent">
            Terbaik Nusantara?
          </span>
        </h2>

        {/* Description Subtext */}
        <p className="max-w-xl text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed mb-8 transition-colors">
          Uji insting perencanaan kargo, taklukkan 4 pelabuhan domestik, dan buktikan efisiensi armada Anda tanpa terkena denda restow.
        </p>

        {/* Opsi 2: Single Primary Action Button */}
        <button
          onClick={() => setIsModeModalOpen(true)}
          className="px-10 py-4 rounded-full bg-gradient-to-r from-spil-red to-[#e02424] hover:from-[#b5181a] hover:to-spil-red text-white font-extrabold text-base md:text-lg shadow-2xl shadow-red-900/40 hover:scale-105 active:scale-95 transition-all duration-300 ring-2 ring-red-400/40 flex items-center gap-3 cursor-pointer"
        >
          <Ship size={20} /> Mulai Berlayar Sekarang
        </button>

        {/* Secondary Utility Links */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
          <button 
            onClick={onOpenLeaderboard} 
            className="flex items-center gap-2 hover:text-amber-500 transition-colors py-1"
          >
            <Award size={14} className="text-amber-500" /> Papan Peringkat
          </button>
          <button 
            onClick={onOpenTariff} 
            className="flex items-center gap-2 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-1"
          >
            <span>📋</span> Lembar Tarif SPIL
          </button>
          <button 
            onClick={onOpenGlossary} 
            className="flex items-center gap-2 hover:text-sky-600 dark:hover:text-sky-400 transition-colors py-1"
          >
            <span>📖</span> Glosarium & Panduan
          </button>
        </div>

      </div>

      {/* ============================================================== */}
      {/* ANIMATED MARQUEE (PURE CSS GPU-ACCELERATED ALA CALIBER)         */}
      {/* ============================================================== */}
      <div className="w-full relative overflow-hidden mt-12 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]">
        <div className="animate-marquee flex gap-5 py-4">
          {duplicatedCards.map((card, index) => {
            const Icon = card.icon;
            const rotation = index % 2 === 0 ? -2 : 5;
            return (
              <div
                key={`marquee-${index}`}
                className="w-56 md:w-64 flex-shrink-0 rounded-[20px] p-4 bg-white dark:bg-slate-900 border border-black/[0.06] dark:border-white/10 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_24px_rgba(0,0,0,0.04)] dark:shadow-xl flex flex-col justify-between transition-transform duration-300 hover:scale-105 hover:z-20 cursor-default"
                style={{
                  transform: `rotate(${rotation}deg)`,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[8px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full border ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                  <Icon size={14} className="text-slate-400" />
                </div>

                {/* Render Rich Visual Widget */}
                <div className="my-2">
                  {card.renderVisual()}
                </div>

                <div className="text-left mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{card.title}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{card.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Copyright */}
      <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-6 z-10">
        &copy; Prototipe PT Salam Pacific Indonesia Lines (SPIL) &bull; Hak Cipta Dilindungi
      </p>

      {/* ============================================================== */}
      {/* MODAL PEMILIHAN MODE GAMEPLAY (OPSI 2)                         */}
      {/* ============================================================== */}
      {isModeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-black/[0.08] dark:border-white/10 rounded-[20px] max-w-lg w-full p-8 relative shadow-[0_1px_2px_rgba(16,24,40,0.04),0_16px_48px_rgba(0,0,0,0.2)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.5)] animate-slide-up text-left">
            
            {/* Close Button */}
            <button
              onClick={() => setIsModeModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-8">
                <svg viewBox="0 0 100 65" className="w-full h-full drop-shadow" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 10 5 Q 30 15, 50 5 T 90 5 L 85 45 Q 65 45, 45 55 T 5 45 Z" fill="#D21E20" stroke="#B5181A" strokeWidth="1.5" />
                  <rect x="3" y="2" width="4" height="60" fill="#94a3b8" rx="1" />
                  <circle cx="5" cy="2" r="3" fill="#64748b" />
                  <text x="45" y="30" fill="#FFFFFF" fontSize="18" fontWeight="900" fontFamily="'Outfit', sans-serif" textAnchor="middle" transform="rotate(6, 45, 30)">SPIL</text>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white font-display">Pilih Mode Permainan</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tentukan format simulasi stowage Anda</p>
              </div>
            </div>

            {/* Mode Cards Grid */}
            <div className="grid grid-cols-1 gap-4">
              
              {/* Opsi 1: Mabar Offline (Lokal) */}
              <button
                onClick={() => {
                  setIsModeModalOpen(false);
                  onSelectOffline();
                }}
                className="p-5 rounded-[20px] bg-slate-50 hover:bg-emerald-50/50 dark:bg-slate-950/60 dark:hover:bg-slate-800/80 border border-black/[0.06] hover:border-emerald-500/40 dark:border-white/10 dark:hover:border-emerald-500/50 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all text-left flex items-start gap-4 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Monitor size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Mabar Offline (Lokal)
                    </h4>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      Pass &amp; Play
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Bermain bergantian bersama hingga 4 kapten (atau lawan Bot AI) di satu layar tanpa perlu koneksi internet.
                  </p>
                </div>
              </button>

              {/* Opsi 2: Mabar Online (Room) */}
              <button
                onClick={() => {
                  setIsModeModalOpen(false);
                  onSelectOnline();
                }}
                className="p-5 rounded-[20px] bg-slate-50 hover:bg-rose-50/50 dark:bg-slate-950/60 dark:hover:bg-slate-800/80 border border-black/[0.06] hover:border-rose-500/40 dark:border-white/10 dark:hover:border-rose-500/50 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all text-left flex items-start gap-4 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Network size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      Mabar Online (Kamar)
                    </h4>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300">
                      Real-Time Room
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Buat atau gabung kamar online kompetitif bersama teman dari perangkat masing-masing dengan sistem giliran 60 detik.
                  </p>
                </div>
              </button>

            </div>

          </div>
        </div>
      )}

    </section>
  );
}
