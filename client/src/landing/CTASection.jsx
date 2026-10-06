import { useEffect, useRef } from 'react';
import {
  Monitor,
  Network,
  Award,
  LogIn,
  X,
  Ship,
  Layers,
  Zap,
  Trophy,
  Bot,
  Navigation,
  FileText,
  BookOpen
} from 'lucide-react';

// Showcase cards for the infinite horizontal marquee (Alternatif A: Stylized Game Showcase)
const SHOWCASE_CARDS = [
  {
    title: 'Bayplan ISO 9711',
    subtitle: 'Stowage Matrix Realistis',
    badge: 'FITUR UTAMA',
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

const MODES = [
  {
    id: 'offline',
    Icon: Monitor,
    title: 'Mabar offline (lokal)',
    tag: 'Pass & play',
    body: 'Bermain bergantian bersama hingga 4 kapten (atau lawan bot AI) di satu layar tanpa perlu koneksi internet.'
  },
  {
    id: 'online',
    Icon: Network,
    title: 'Mabar online (kamar)',
    tag: 'Real-time room',
    body: 'Buat atau gabung kamar online kompetitif bersama teman dari perangkat masing-masing dengan sistem giliran 60 detik.'
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
  onLogout,
  isModeModalOpen,
  onOpenModeModal,
  onCloseModeModal
}) {
  const dialogRef = useRef(null);

  // Native <dialog>: focus trap, Esc to close and inert background for free.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isModeModalOpen && !dialog.open) dialog.showModal();
    if (!isModeModalOpen && dialog.open) dialog.close();
  }, [isModeModalOpen]);

  const handleSelect = (id) => {
    onCloseModeModal();
    if (id === 'offline') onSelectOffline();
    else onSelectOnline();
  };

  // Duplicate cards for seamless infinite horizontal marquee
  const duplicatedCards = [...SHOWCASE_CARDS, ...SHOWCASE_CARDS];

  return (
    <section
      id="cta"
      className="lp-alt relative w-full min-h-screen overflow-hidden flex flex-col items-center justify-between text-center px-4 pt-24 pb-8"
    >
      {/* Account status (top right) */}
      <div className="absolute top-20 right-4 sm:right-6 z-20">
        {authUser ? (
          <div className="flex items-center gap-3 lp-small">
            <span className="lp-ink">{authUser.username}</span>
            <button type="button" onClick={onLogout} className="lp-link">
              Keluar
            </button>
          </div>
        ) : (
          <button type="button" onClick={onOpenAuth} className="lp-btn lp-btn-secondary lp-btn-sm">
            <LogIn size={14} aria-hidden="true" /> Masuk / daftar
          </button>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div className="z-10 flex flex-col items-center max-w-[880px] mx-auto my-auto pt-6">
        {/* SPIL flag */}
        <div className="w-16 h-11 mb-6">
          <svg viewBox="0 0 100 65" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M 10 5 Q 30 15, 50 5 T 90 5 L 85 45 Q 65 45, 45 55 T 5 45 Z" fill="#D21E20" stroke="#B5181A" strokeWidth="1.5" />
            <rect x="3" y="2" width="4" height="60" fill="#94a3b8" rx="1" />
            <circle cx="5" cy="2" r="3" fill="#64748b" />
            <text x="45" y="30" fill="#FFFFFF" fontSize="18" fontWeight="900" fontFamily="'Outfit', 'Inter', sans-serif" textAnchor="middle" transform="rotate(6, 45, 30)" letterSpacing="1">SPIL</text>
          </svg>
        </div>

        <p className="lp-eyebrow mb-3">Simulator stowage &amp; pelayaran resmi PT SPIL</p>

        <h2 className="lp-hero-title lp-ink">
          Siap menjadi Chief Officer terbaik Nusantara?
        </h2>

        <p className="lp-lead lp-muted max-w-[640px] mt-5">
          Uji insting perencanaan kargo, taklukkan empat pelabuhan domestik, dan buktikan efisiensi armadamu tanpa terkena denda restow.
        </p>

        <button type="button" onClick={onOpenModeModal} className="lp-btn lp-btn-primary mt-8">
          <Ship size={18} aria-hidden="true" /> Mulai berlayar sekarang
        </button>

        {/* Secondary links */}
        <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 lp-body">
          <button type="button" onClick={onOpenLeaderboard} className="lp-link gap-2">
            <Award size={17} aria-hidden="true" /> Papan peringkat
          </button>
          <button type="button" onClick={onOpenTariff} className="lp-link gap-2">
            <FileText size={17} aria-hidden="true" /> Lembar tarif SPIL
          </button>
          <button type="button" onClick={onOpenGlossary} className="lp-link gap-2">
            <BookOpen size={17} aria-hidden="true" /> Glosarium &amp; panduan
          </button>
        </div>
      </div>

      {/* ANIMATED MARQUEE */}
      <div className="w-full relative overflow-hidden mt-12 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]" aria-hidden="true">
        <div className="animate-marquee flex gap-5 py-4">
          {duplicatedCards.map((card, index) => {
            const Icon = card.icon;
            const rotation = index % 2 === 0 ? -2 : 5;
            return (
              <div
                key={`marquee-${index}`}
                className="lp-tile w-56 md:w-64 flex-shrink-0 !rounded-[22px] p-4 flex flex-col justify-between cursor-default"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="lp-caption lp-muted">{card.badge}</span>
                  <Icon size={14} className="lp-muted" />
                </div>

                <div className="my-2">
                  {card.renderVisual()}
                </div>

                <div className="text-left mt-3 pt-2 border-t border-[var(--lp-hair)]">
                  <h4 className="lp-small font-semibold lp-ink">{card.title}</h4>
                  <p className="text-[12px] leading-4 lp-muted">{card.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <p className="text-[12px] lp-muted mt-6 z-10">
        &copy; Prototipe PT Salam Pacific Indonesia Lines (SPIL) &bull; Hak Cipta Dilindungi
      </p>

      {/* MODE SELECTION DIALOG */}
      <dialog
        ref={dialogRef}
        className="lp-dialog text-left"
        aria-labelledby="mode-dialog-title"
        onClose={onCloseModeModal}
        onClick={(e) => { if (e.target === e.currentTarget) onCloseModeModal(); }}
      >
        <div className="relative p-8 md:p-10">
          <button type="button" onClick={onCloseModeModal} className="lp-paddle absolute top-5 right-5" aria-label="Tutup">
            <X size={18} />
          </button>

          <h3 id="mode-dialog-title" className="lp-h3 lp-ink pr-10">Pilih mode permainan.</h3>
          <p className="lp-body lp-muted mt-2">Tentukan format simulasi stowage-mu.</p>

          <div className="grid grid-cols-1 gap-3 mt-7">
            {MODES.map(({ id, Icon, title, tag, body }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleSelect(id)}
                className="lp-tile lp-tile-hover !rounded-[20px] p-5 text-left flex items-start gap-4 cursor-pointer"
              >
                <span
                  className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'var(--lp-page)', color: 'var(--lp-link)' }}
                  aria-hidden="true"
                >
                  <Icon size={20} />
                </span>
                <span className="flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="lp-title lp-ink">{title}</span>
                    <span className="lp-caption lp-muted">{tag}</span>
                  </span>
                  <span className="block lp-small lp-muted mt-1.5">{body}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </dialog>
    </section>
  );
}
