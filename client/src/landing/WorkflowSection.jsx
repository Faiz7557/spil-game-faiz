import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Ship, Star, X } from 'lucide-react';

// ------------------------------ | VISUALS | ------------------------------ //
// Small, decorative stand-ins for each step. Port colours come from the
// game's --p-* tokens so they match the bayplan in both themes.

const portStyle = (key) => ({
  background: `var(--p-${key}-bg)`,
  border: `1px solid var(--p-${key})`,
  color: `var(--p-${key}-ink)`
});

function OrdersVisual() {
  const orders = [
    { key: 'mks', code: 'MKS', type: 'Dry', rot: -6, x: -64, y: 10 },
    { key: 'jyp', code: 'JYP', type: 'Reefer', rot: 0, x: 0, y: 0 },
    { key: 'mdn', code: 'MDN', type: 'Dry', rot: 6, x: 64, y: 10 }
  ];
  return (
    <div className="relative h-full flex items-center justify-center">
      {orders.map((o) => (
        <div
          key={o.code}
          className="absolute w-32 h-24 rounded-2xl flex flex-col items-start justify-between p-3.5 overflow-hidden"
          style={{ ...portStyle(o.key), transform: `translate(${o.x}px, ${o.y}px) rotate(${o.rot}deg)` }}
        >
          <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: `var(--p-${o.key})` }} />
          <span className="font-plex text-[22px] font-medium tracking-[.05em] leading-none">{o.code}</span>
          <span className="text-[12px] font-semibold opacity-80">{o.type}</span>
        </div>
      ))}
    </div>
  );
}

function StowVisual() {
  // Top-down reading order: tier 84, 82, 02. Later ports sit lower.
  const cells = [
    null, 'mks', null,
    'mks', 'jyp', 'mks',
    'mdn', 'jyp', 'mdn'
  ];
  return (
    <div className="h-full flex items-center justify-center">
      <div className="grid grid-cols-3 gap-2 p-2.5 border-x-[3px] border-b-[6px] border-[var(--g-structure)] rounded-b-xl">
        {cells.map((key, i) => (
          <div
            key={i}
            className="w-14 h-12 rounded-lg flex items-center justify-center font-plex text-[12px] font-medium"
            style={key ? portStyle(key) : { background: 'var(--g-tint)', border: '1px dashed var(--g-line)' }}
          >
            {key ? key.toUpperCase() : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function VoyageVisual() {
  const stops = ['sby', 'mks', 'jyp', 'mdn'];
  return (
    <div className="h-full flex flex-col items-center justify-center gap-5 px-2">
      <Ship size={40} strokeWidth={1.5} className="lp-ink2" />
      <div className="relative w-full max-w-[280px] flex items-center justify-between">
        <span className="absolute left-3 right-3 top-1/2 border-t-2 border-dashed border-[var(--lp-hair)]" />
        {stops.map((key, i) => (
          <span
            key={key}
            className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center font-plex text-[12px] font-medium"
            style={i === 0 ? { background: `var(--p-${key})`, color: '#FFFFFF' } : portStyle(key)}
          >
            {key.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

function ScoreVisual() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="rounded-2xl px-6 py-5 min-w-[220px] text-center" style={{ background: 'var(--lp-page)' }}>
        <p className="lp-caption lp-muted">Peringkat kapten</p>
        <div className="flex justify-center gap-1 my-2 text-[#E69F00]">
          {[0, 1, 2, 3].map((i) => <Star key={i} size={18} fill="currentColor" strokeWidth={0} />)}
          <Star size={18} strokeWidth={1.5} className="opacity-40" />
        </div>
        <p className="lp-title lp-ink">VP Logistics</p>
        <p className="lp-small mt-1 font-plex" style={{ color: 'var(--lp-link)' }}>Rp 847.000.000</p>
      </div>
    </div>
  );
}

// ------------------------------ | CONTENT | ------------------------------ //

const STEPS = [
  {
    id: 'terima',
    eyebrow: 'Langkah 1',
    title: 'Terima kargo.',
    summary: 'Setiap minggu pesanan baru masuk. Ambil yang menguntungkan, tolak yang berisiko.',
    Visual: OrdersVisual,
    detail: [
      'Di setiap pelabuhan, daftar pesanan kargo muncul lengkap dengan tujuan, tipe kontainer (Dry atau Reefer), dan tarif freight.',
      'Pesanan yang sudah kamu terima wajib dimuat. Kalau sampai tidak terangkut, kamu kena denda rolling (gagal muat), dan dendanya lebih besar untuk pelanggan committed.',
      'Jadi pertimbangkan kapasitas kapal sebelum menerima: kargo bernilai tinggi tidak ada artinya kalau tidak muat.'
    ]
  },
  {
    id: 'susun',
    eyebrow: 'Langkah 2',
    title: 'Susun di bayplan.',
    summary: 'Tempatkan tiap kontainer di koordinat Bay-Row-Tier sesuai ISO 9711.',
    Visual: StowVisual,
    detail: [
      'Kapal dibagi menjadi bay, row, dan tier. Tier 82 dan 84 ada di dek, tier 02 di dalam palka. Bay reefer punya colokan listrik untuk kontainer berpendingin.',
      'Kontainer di tier 84 harus berdiri di atas tier 82, dan tipe kontainer harus cocok dengan bay-nya.',
      'Kuncinya urutan: kargo yang turun paling awal harus berada paling atas. Kalau tidak, kontainer di atasnya harus dibongkar dulu.'
    ]
  },
  {
    id: 'berlayar',
    eyebrow: 'Langkah 3',
    title: 'Berlayar.',
    summary: 'Kapal berangkat ke pelabuhan berikutnya. Kargo turun, biaya restow dihitung.',
    Visual: VoyageVisual,
    detail: [
      'Kapal menyusuri sirkuit Surabaya, Makassar, Jayapura, dan Medan. Di setiap pelabuhan, kargo dengan tujuan itu dibongkar dan pendapatan freight masuk.',
      'Setiap kontainer yang menghalangi kargo tujuan pelabuhan tersebut harus di-restow: dua kali gerakan crane (bongkar lalu muat ulang), dan setiap kontainer dikenai biaya.',
      'Lalu pesanan baru masuk, dan siklus dimulai lagi.'
    ]
  },
  {
    id: 'nilai',
    eyebrow: 'Langkah 4',
    title: 'Tiba dan dinilai.',
    summary: 'Setelah sebelas minggu, lihat saldo akhir, efisiensi stowage, dan peringkat kaptenmu.',
    Visual: ScoreVisual,
    detail: [
      'Di akhir pelayaran, performamu dirangkum: saldo akhir, jumlah restow dan rolling, serta seberapa efisien ruang kapal terpakai.',
      'Hasilnya menentukan peringkat kapten dan lencana yang kamu dapat. Bandingkan dengan bot AI atau pemain lain di papan peringkat.'
    ]
  }
];

// ------------------------------ | MAIN COMPONENT | ------------------------------ //

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function WorkflowSection() {
  const shelfRef = useRef(null);
  const dialogRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [openStep, setOpenStep] = useState(null);

  const updatePaddles = useCallback(() => {
    const el = shelfRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = shelfRef.current;
    if (!el) return;
    updatePaddles();
    el.addEventListener('scroll', updatePaddles, { passive: true });
    window.addEventListener('resize', updatePaddles);
    return () => {
      el.removeEventListener('scroll', updatePaddles);
      window.removeEventListener('resize', updatePaddles);
    };
  }, [updatePaddles]);

  const scrollByCard = (dir) => {
    const el = shelfRef.current;
    const card = el?.querySelector('[data-card]');
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openStep && !dialog.open) dialog.showModal();
    if (!openStep && dialog.open) dialog.close();
  }, [openStep]);

  const scrollToTutorial = () => {
    document.getElementById('tutorial')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Align the first card with the 1024px content column; later cards bleed
  // past the right edge to signal there is more to see.
  const gutter = 'max(16px, calc((100% - 1024px) / 2 + 24px))';

  return (
    <section id="workflow" className="lp-page lp-section">
      <div className="max-w-[1024px] mx-auto px-4 sm:px-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 mb-8 md:mb-10">
        <h2 className="lp-h2 lp-ink">Empat langkah.<br />Satu pelayaran.</h2>
        <button type="button" onClick={scrollToTutorial} className="lp-link lp-body">
          Coba tutorialnya <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div
        ref={shelfRef}
        className="lp-shelf gap-4 md:gap-5 pb-2"
        style={{ paddingLeft: gutter, scrollPaddingLeft: gutter }}
        role="region"
        aria-label="Alur permainan"
      >
        {STEPS.map((step) => {
          const Visual = step.Visual;
          return (
            <button
              key={step.id}
              type="button"
              data-card
              onClick={() => setOpenStep(step)}
              aria-haspopup="dialog"
              className="lp-tile lp-tile-hover relative shrink-0 w-[min(82vw,340px)] md:w-[380px] h-[500px] md:h-[540px] flex flex-col text-left p-7 md:p-8 cursor-pointer"
            >
              <p className="lp-caption lp-muted">{step.eyebrow}</p>
              <h3 className="lp-h3 lp-ink mt-2">{step.title}</h3>
              <p className="lp-body lp-ink2 mt-3">{step.summary}</p>
              <div className="flex-1 min-h-0 mt-4" aria-hidden="true">
                <Visual />
              </div>
              <span className="lp-paddle absolute right-5 bottom-5" aria-hidden="true">
                <Plus size={18} />
              </span>
              <span className="sr-only">Buka detail {step.title}</span>
            </button>
          );
        })}
        <div className="shrink-0" style={{ width: `calc(${gutter} - 16px)` }} aria-hidden="true" />
      </div>

      <div className="max-w-[1024px] mx-auto px-4 sm:px-6 mt-6 flex justify-end gap-3">
        <button type="button" className="lp-paddle" onClick={() => scrollByCard(-1)} disabled={!canPrev} aria-label="Langkah sebelumnya">
          <ChevronLeft size={20} />
        </button>
        <button type="button" className="lp-paddle" onClick={() => scrollByCard(1)} disabled={!canNext} aria-label="Langkah berikutnya">
          <ChevronRight size={20} />
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className="lp-dialog"
        aria-labelledby="workflow-dialog-title"
        onClose={() => setOpenStep(null)}
        onClick={(e) => { if (e.target === e.currentTarget) setOpenStep(null); }}
      >
        {openStep && (
          <div className="relative p-8 md:p-12">
            <button
              type="button"
              onClick={() => setOpenStep(null)}
              className="lp-paddle absolute right-5 top-5"
              aria-label="Tutup"
            >
              <X size={18} />
            </button>
            <p className="lp-eyebrow">{openStep.eyebrow}</p>
            <h3 id="workflow-dialog-title" className="lp-h2 lp-ink mt-1 pr-10">{openStep.title}</h3>
            <div className="lp-tile h-56 md:h-64 mt-8" aria-hidden="true">
              <openStep.Visual />
            </div>
            <div className="mt-8 space-y-4">
              {openStep.detail.map((para) => (
                <p key={para} className="lp-body lp-ink2">{para}</p>
              ))}
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
