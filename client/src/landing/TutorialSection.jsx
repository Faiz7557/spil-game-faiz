import { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  RotateCcw, 
  Sparkles, 
  Zap, 
  Snowflake, 
  ShieldAlert, 
  Scale, 
  Anchor, 
  Layers,
  Compass,
  Ship,
  Info,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { playContainerThud, playErrorBuzzer, playCashCoin } from '../utils/audioEffects';

// Sample containers for interactive sandbox & animated walkthrough
const SAMPLE_CARGOS = [
  {
    id: 'c1',
    dest: 'MKS',
    portName: 'Makassar',
    type: 'DRY',
    weight: 20,
    color: '#E69F00', // Okabe-Ito Amber
    routeOrder: 2,
    description: 'Kargo Berat (Tujuan transit pertama)'
  },
  {
    id: 'c2',
    dest: 'JYP',
    portName: 'Jayapura',
    type: 'DRY',
    weight: 16,
    color: '#009E73', // Okabe-Ito Green
    routeOrder: 3,
    description: 'Kargo Sedang (Tujuan transit kedua)'
  },
  {
    id: 'c3',
    dest: 'MDN',
    portName: 'Medan',
    type: 'REEFER',
    weight: 12,
    color: '#CC79A7', // Okabe-Ito Purple/Pink
    routeOrder: 4,
    description: 'Kargo Ringan & Berpendingin (Butuh colokan listrik)'
  }
];

export default function TutorialSection() {
  // --- ANIMATED WALKTHROUGH STATE (HERO OF THE SECTION) ---
  const [animPhase, setAnimPhase] = useState(1); // 1 to 5
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasCompletedInitialPlay, setHasCompletedInitialPlay] = useState(false);
  const hasTriggeredInitialPlayRef = useRef(false);
  const sectionContainerRef = useRef(null);
  const autoPlayTimerRef = useRef(null);

  // --- SECONDARY DEEP DIVE TABS ---
  const [activeTab, setActiveTab] = useState('lessons'); // 'lessons' | 'sandbox'
  const [currentLesson, setCurrentLesson] = useState(0);

  // --- SANDBOX STATE ---
  const [gridState, setGridState] = useState({
    '02-01': null,
    '82-01': null,
    '84-01': null,
    '02-02': null,
    '82-02': null,
    '84-02': null,
    '02-03': null,
    '82-03': null,
    '84-03': null,
  });
  const [selectedCargoId, setSelectedCargoId] = useState('c1');
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Trigger autoplay automatically as soon as the tutorial section enters view
  useEffect(() => {
    const el = sectionContainerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !hasTriggeredInitialPlayRef.current) {
          hasTriggeredInitialPlayRef.current = true;
          setIsPlaying(true);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Auto-play timer for animated walkthrough
  useEffect(() => {
    if (isPlaying) {
      autoPlayTimerRef.current = setInterval(() => {
        setAnimPhase(prev => {
          if (prev >= 5) {
            setIsPlaying(false);
            setHasCompletedInitialPlay(true);
            playCashCoin();
            return 5;
          }
          playContainerThud();
          return prev + 1;
        });
      }, 2400);
    } else {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    }

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isPlaying]);

  const handleStepSelect = (phase) => {
    setIsPlaying(false);
    setHasCompletedInitialPlay(true);
    setAnimPhase(phase);
    if (phase === 5) {
      playCashCoin();
    } else {
      playContainerThud();
    }
  };

  const handleNextStep = () => {
    setIsPlaying(false);
    setHasCompletedInitialPlay(true);
    setAnimPhase(prev => {
      const next = Math.min(5, prev + 1);
      if (next === 5) playCashCoin(); else playContainerThud();
      return next;
    });
  };

  const handlePrevStep = () => {
    setIsPlaying(false);
    setHasCompletedInitialPlay(true);
    setAnimPhase(prev => {
      const next = Math.max(1, prev - 1);
      playContainerThud();
      return next;
    });
  };

  const togglePlay = () => {
    if (!isPlaying && animPhase >= 5) {
      setAnimPhase(1);
      setHasCompletedInitialPlay(false);
    }
    setIsPlaying(!isPlaying);
  };

  // Phase metadata for the interactive animated showcase
  const PHASES_INFO = [
    {
      step: 1,
      badge: 'TAHAP 1 / 5',
      title: 'Struktur Penampang Kapal (Bay 14)',
      rule: 'Palka Bersih & Siap Muat',
      desc: 'Kapal bersandar di Pelabuhan Tanjung Perak (Surabaya). Palka bawah (Tier 02) dan dek atas (Tier 82 & 84) masih kosong. Garis tengah dilengkapi palka (Hatch Cover Line).'
    },
    {
      step: 2,
      badge: 'TAHAP 2 / 5',
      title: 'Memuat Kargo Bawah Palka (Tier 02)',
      rule: 'Hukum Gravitasi: Beban Berat di Dasar',
      desc: 'Crane menurunkan kontainer terberat (Makassar 20t) ke dasar palka (Tier 02). Meletakkan kargo berat di bawah memastikan titik berat kapal rendah (Center of Gravity stabil).'
    },
    {
      step: 3,
      badge: 'TAHAP 3 / 5',
      title: 'Segel Palka & Muat Dek Bawah (Tier 82)',
      rule: 'Landasan Kokoh (Anti-Melayang)',
      desc: 'Palka ditutup. Crane menurunkan kontainer kedua (Jayapura 16t) di atas dek (Tier 82). Tier 82 kini menjadi landasan kokoh bagi tumpukan di atasnya.'
    },
    {
      step: 4,
      badge: 'TAHAP 4 / 5',
      title: 'Memuat Dek Teratas (Tier 84)',
      rule: 'Distribusi Beban Piramida & Colokan Reefer',
      desc: 'Kontainer berpendingin (Medan 12t) diletakkan di Tier 84 bercolokan listrik. Beban tersusun menurun: 20t di dasar, 16t di tengah, 12t di puncak. Kapal dijamin tidak oleng!'
    },
    {
      step: 5,
      badge: 'TAHAP 5 / 5',
      title: 'Validasi Akhir: Bebas Denda Restow!',
      rule: 'Urutan Rute Sempurna (Rp 0 Denda)',
      desc: 'Sirkuit pelayaran: Surabaya -> Makassar -> Jayapura -> Medan. Kontainer Makassar di palka dibongkar pertama, Jayapura kedua, Medan terakhir. Tidak ada kontainer yang saling menghalangi!'
    }
  ];

  // Lessons data for Deep-Dive Tab
  const LESSONS = [
    {
      id: 'iso',
      title: 'Koordinat Standar ISO 9711',
      subtitle: 'Sistem 6-Digit: Bay - Row - Tier',
      icon: Compass,
      tag: 'DASAR NOMENKLATUR',
      tagColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
      content: (
        <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm">
          <p>
            Dalam armada kapal peti kemas modern PT SPIL, setiap kontainer ditempatkan menggunakan koordinat standar internasional <strong>Bay-Row-Tier</strong>:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-white/10">
              <span className="text-xs font-black text-spil-green dark:text-emerald-400 uppercase tracking-wider block mb-1">1. BAY (Posisi Memanjang)</span>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Nomor ganjil (01, 03, ...) untuk kontainer 20ft; nomor genap (02, 04, ...) untuk kontainer 40ft.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-white/10">
              <span className="text-xs font-black text-spil-green dark:text-emerald-400 uppercase tracking-wider block mb-1">2. ROW (Posisi Melintang)</span>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Nomor genap (02, 04) di lambung kiri (Port); nomor ganjil (01, 03) di lambung kanan (Starboard).
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-white/10">
              <span className="text-xs font-black text-spil-green dark:text-emerald-400 uppercase tracking-wider block mb-1">3. TIER (Ketinggian Vertikal)</span>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Tier 02 di bawah palka (Hold); Tier 82 & 84 di atas dek kapal (On-Deck).
              </p>
            </div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-spil-green p-3 rounded-r-xl text-xs text-emerald-900 dark:text-emerald-200">
            💡 <strong>Contoh Nyata:</strong> Slot <code className="bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded text-emerald-950 dark:text-emerald-200">14-01-82</code> berarti Bay 14, Baris Tengah (Row 01), Tingkat Dek Bawah (Tier 82).
          </div>
        </div>
      )
    },
    {
      id: 'physics',
      title: 'Hukum Gravitasi & Distribusi Berat',
      subtitle: 'Mencegah Kapal Oleng dan Kontainer Melayang',
      icon: Scale,
      tag: 'FISIKA & KESELAMATAN',
      tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
      content: (
        <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm">
          <p>
            Stowage yang aman menuntut stabilitas titik berat kapal (Center of Gravity) yang optimal:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 shadow-sm flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-spil-red dark:text-rose-400 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-1">Anti-Melayang (Anti-Floating)</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kontainer di <strong>Tier 84</strong> tidak dapat diletakkan jika <strong>Tier 82</strong> di bawahnya masih kosong. Kontainer membutuhkan landasan fisik di bawahnya!
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 shadow-sm flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Scale size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-1">Beban Berat Wajib di Bawah</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kontainer lebih berat (misal 20 Ton) harus selalu ditaruh lebih rendah dibanding kontainer ringan (12 Ton) agar tumpukan tidak amblas dan kapal tidak oleng saat dihempas ombak laut.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'hatch-reefer',
      title: 'Anatomi Palka & Colokan Reefer',
      subtitle: 'Pemisahan Underdeck serta Persyaratan Kelistrikan',
      icon: Zap,
      tag: 'FASILITAS KAPAL',
      tagColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
      content: (
        <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm">
          <p>
            Memuat kontainer di palka dan dek memiliki batasan struktural dan elektrikal yang ketat:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white text-sm mb-2">
                <Layers size={18} className="text-slate-600 dark:text-slate-400" />
                Penyekat Palka (Hatch Cover)
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Palka memisahkan <strong>Tier 02 (Bawah Dek)</strong> dari Tier Dek. Selama kontainer di Tier 82/84 terpasang di atasnya, palka tersegel dan Tier 02 tidak dapat dibongkar!
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-sky-700 dark:text-sky-300 text-sm mb-2">
                <Snowflake size={18} className="text-sky-500 dark:text-sky-400" />
                Kebutuhan Receptacle (Plug Reefer)
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Peti kemas pendingin (<strong>REEFER</strong>) membawa kargo rentan suhu seperti daging atau obat-obatan. Hanya boleh dimuat di slot yang dilengkapi colokan listrik aktif (Reefer Receptacle).
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'restow',
      title: 'Perangkap Denda Restow Blocker',
      subtitle: 'Mengapa Kesalahan Urutan Bongkar Berbiaya Rp 6.000.000?',
      icon: ShieldAlert,
      tag: 'EFISIENSI BIAYA',
      tagColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
      content: (
        <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm">
          <p>
            Rute tetap kapal SPIL: <strong>01 Surabaya (SBY) &rarr; 02 Makassar (MKS) &rarr; 03 Jayapura (JYP) &rarr; 04 Medan (MDN)</strong>.
          </p>
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold mb-2">
              <AlertTriangle size={18} />
              Skenario Terjadinya Overstowage / Restow:
            </div>
            <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
              Jika Anda meletakkan kontainer tujuan <strong>Medan (Port #4)</strong> tepat di ATAS kontainer tujuan <strong>Makassar (Port #2)</strong>, maka saat kapal bersandar di Makassar, crane pelabuhan <em>harus mengangkat kontainer Medan terlebih dahulu ke dermaga</em> demi mengambil kontainer Makassar di bawahnya, lalu mengembalikannya lagi ke kapal.
            </p>
          </div>
          <div className="flex items-center justify-between bg-slate-900 dark:bg-slate-950 border border-slate-800 dark:border-white/10 text-white p-4 rounded-xl">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-widest block">Biaya Shifting Crane Per Blocker</span>
              <span className="text-xl font-black text-rose-400">Rp 6.000.000 / gerakan ekstra</span>
            </div>
            <div className="text-right text-xs text-slate-300">
              Kaidah Emas: <strong>Tujuan Jauh di Bawah, Tujuan Dekat di Atas!</strong>
            </div>
          </div>
        </div>
      )
    }
  ];

  // --- SANDBOX LOGIC ---
  const handleSlotClick = (slotKey) => {
    const currentOccupant = gridState[slotKey];
    if (currentOccupant) {
      setGridState(prev => ({ ...prev, [slotKey]: null }));
      playContainerThud();
      setFeedbackMessage({ type: 'info', text: `Kontainer dilepas dari slot ${slotKey}.` });
      return;
    }
    if (!selectedCargoId) {
      setFeedbackMessage({ type: 'warning', text: 'Pilih kontainer di staging yard terlebih dahulu!' });
      playErrorBuzzer();
      return;
    }
    const alreadyPlaced = Object.values(gridState).includes(selectedCargoId);
    if (alreadyPlaced) {
      setFeedbackMessage({ type: 'warning', text: 'Kontainer ini sudah terpasang di slot lain! Lepas terlebih dahulu.' });
      playErrorBuzzer();
      return;
    }
    setGridState(prev => ({ ...prev, [slotKey]: selectedCargoId }));
    playContainerThud();
    setFeedbackMessage(null);
  };

  const applyWrongScenario = () => {
    setGridState({
      '02-01': 'c1',
      '82-01': 'c3',
      '84-01': null,
      '02-02': null,
      '82-02': null,
      '84-02': 'c2',
      '02-03': null,
      '82-03': null,
      '84-03': null,
    });
    playErrorBuzzer();
    setFeedbackMessage({
      type: 'error',
      text: '⚠️ Terdeteksi Pelanggaran: Kontainer melayang di Row 02 & Restow Blocker di Row 01!'
    });
  };

  const applyOptimalScenario = () => {
    setGridState({
      '02-01': 'c1',
      '82-01': 'c2',
      '84-01': 'c3',
      '02-02': null,
      '82-02': null,
      '84-02': null,
      '02-03': null,
      '82-03': null,
      '84-03': null,
    });
    playCashCoin();
    setFeedbackMessage({
      type: 'success',
      text: '🎉 Susunan Sempurna: Gravitasi terpenuhi, beban berat di bawah, dan bebas denda restow!'
    });
  };

  const resetGrid = () => {
    setGridState({
      '02-01': null,
      '82-01': null,
      '84-01': null,
      '02-02': null,
      '82-02': null,
      '84-02': null,
      '02-03': null,
      '82-03': null,
      '84-03': null,
    });
    playContainerThud();
    setFeedbackMessage(null);
  };

  const evaluateSandbox = () => {
    const issues = [];
    let restowPenalty = 0;
    let placedCount = 0;

    ['01', '02', '03'].forEach(row => {
      const t02 = gridState[`02-${row}`] ? SAMPLE_CARGOS.find(c => c.id === gridState[`02-${row}`]) : null;
      const t82 = gridState[`82-${row}`] ? SAMPLE_CARGOS.find(c => c.id === gridState[`82-${row}`]) : null;
      const t84 = gridState[`84-${row}`] ? SAMPLE_CARGOS.find(c => c.id === gridState[`84-${row}`]) : null;

      if (t02) placedCount++;
      if (t82) placedCount++;
      if (t84) placedCount++;

      if (t84 && !t82) {
        issues.push({ severity: 'error', title: `Row ${row}: Kontainer Melayang`, desc: 'Tier 84 terpasang tanpa landasan Tier 82.' });
      }
      if (t84 && t82 && t84.weight > t82.weight) {
        issues.push({ severity: 'warning', title: `Row ${row}: Beban Berat di Atas`, desc: `${t84.weight}t di Tier 84 lebih berat dari ${t82.weight}t di Tier 82.` });
      }
      if (t82 && t02 && t02.routeOrder < t82.routeOrder) {
        restowPenalty += 6000000;
        issues.push({ severity: 'danger', title: `Row ${row}: Restow Blocker (-Rp 6 Jt)`, desc: `Kargo ${t82.dest} menghalangi kargo ${t02.dest} di bawahnya.` });
      }
      if (t84 && t82 && t82.routeOrder < t84.routeOrder) {
        restowPenalty += 6000000;
        issues.push({ severity: 'danger', title: `Row ${row}: Restow Blocker (-Rp 6 Jt)`, desc: `Kargo ${t84.dest} menghalangi kargo ${t82.dest} di bawahnya.` });
      }
    });

    const isAllPlaced = placedCount === SAMPLE_CARGOS.length;
    const hasErrors = issues.some(i => i.severity === 'error' || i.severity === 'danger');

    return {
      issues,
      restowPenalty,
      placedCount,
      isAllPlaced,
      isOptimal: isAllPlaced && !hasErrors && restowPenalty === 0
    };
  };

  const sandboxEvaluation = evaluateSandbox();
  const currentPhaseInfo = PHASES_INFO[animPhase - 1];

  return (
    <section 
      id="tutorial" 
      ref={sectionContainerRef}
      className="bg-white/75 dark:bg-slate-900/80 backdrop-blur-md rounded-t-[3rem] py-24 px-4 sm:px-6 md:px-8 relative z-10 shadow-2xl border-t border-black/[0.04] dark:border-white/10 transition-colors"
    >
      <div className="max-w-6xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-spil-green-light dark:bg-emerald-950/60 text-spil-green dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-black uppercase tracking-widest mb-3">
            <Anchor size={14} /> Mini Tutorial Interaktif
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-800 dark:text-white mb-4 font-display transition-colors">
            Simulasi Penataan Bayplan
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base leading-relaxed transition-colors">
            Saksikan proses crane memuat kargo langkah demi langkah secara otomatis, atau kendalikan sendiri setiap tahapan susunan kontainer.
          </p>
        </div>

        {/* ============================================================== */}
        {/* UTAMA: ANIMASI INTERAKTIF LANGKAH BERTAHAP (CRANE & VESSEL)      */}
        {/* ============================================================== */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-10 shadow-2xl border border-slate-800 mb-16 relative overflow-hidden">
          
          {/* Subtle background grid pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#2E7D4E_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Top Bar: Playback Controls & Scrubber */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-slate-800 relative z-10">
            
            {/* Play/Pause & Step Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={togglePlay}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md ${
                  isPlaying 
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' 
                    : hasCompletedInitialPlay
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'bg-spil-green text-white hover:bg-spil-green-hover'
                }`}
              >
                {isPlaying ? (
                  <><Pause size={14} /> Jeda</>
                ) : hasCompletedInitialPlay ? (
                  <><RotateCcw size={14} /> Putar Ulang</>
                ) : (
                  <><Play size={14} /> Putar Otomatis</>
                )}
              </button>

              <button
                onClick={handlePrevStep}
                disabled={animPhase === 1}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Langkah Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNextStep}
                disabled={animPhase === 5}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Langkah Berikutnya"
              >
                <ChevronRight size={16} />
              </button>

              {/* Status Hint */}
              <div className="text-[11px] font-bold">
                {isPlaying && (
                  <span className="text-amber-400 flex items-center gap-1.5 animate-pulse">
                    <Sparkles size={12} /> Memutar otomatis... (Klik untuk kendali manual)
                  </span>
                )}
                {!isPlaying && hasCompletedInitialPlay && (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle size={12} /> Selesai! Mode kendali bebas aktif
                  </span>
                )}
              </div>
            </div>

            {/* Scrubber Phase Pills */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5].map((stepNum) => {
                const isActive = animPhase === stepNum;
                const isPassed = animPhase > stepNum;
                return (
                  <button
                    key={stepNum}
                    onClick={() => handleStepSelect(stepNum)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-spil-green text-white ring-2 ring-emerald-400 shadow-md scale-105'
                        : isPassed
                        ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
                        : 'bg-slate-800/60 text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px]">
                      {stepNum}
                    </span>
                    <span className="hidden sm:inline">
                      {stepNum === 1 ? 'Struktur' : stepNum === 2 ? 'Tier 02' : stepNum === 3 ? 'Tier 82' : stepNum === 4 ? 'Tier 84' : 'Optimal'}
                    </span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Main Visual Arena: Crane & Cross-Section Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            
            {/* Visual Ship Cross Section with Hoist Cable */}
            <div className="lg:col-span-7 flex flex-col items-center">
              
              {/* Crane Gantry & Spreader Top Graphic */}
              <div className="w-full max-w-md flex flex-col items-center mb-3">
                <div className="w-full h-3 bg-slate-700 rounded-t border-b border-amber-500/50 flex items-center justify-center relative">
                  <span className="text-[8px] font-black uppercase tracking-widest text-amber-400">
                    Gantry Crane &bull; Spreader Hoist System
                  </span>
                </div>
                
                {/* Spreader Cable extending down to active placement */}
                <div className="flex items-center gap-6 h-6 text-slate-500">
                  <div className="w-0.5 h-full bg-slate-600 dashed" />
                  <div className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[9px] text-amber-300 font-bold flex items-center gap-1 shadow">
                    <Ship size={10} /> Crane Aktif: Memuat Row 01
                  </div>
                  <div className="w-0.5 h-full bg-slate-600 dashed" />
                </div>
              </div>

              {/* Vessel Cross Section Bay 14 */}
              <div className="w-full max-w-md bg-slate-950/80 p-5 rounded-2xl border border-slate-800 shadow-inner relative">
                
                <div className="flex">
                  {/* Tier Labels (Left) */}
                  <div className="flex flex-col justify-between pr-3 text-[10px] font-mono text-slate-500 py-2 shrink-0">
                    <div className="h-14 flex items-center">Tier 84</div>
                    <div className="h-14 flex items-center">Tier 82</div>
                    <div className="h-3 flex items-center text-[9px] text-slate-600 font-bold">Hatch</div>
                    <div className="h-14 flex items-center">Tier 02</div>
                  </div>

                  {/* Grid Rows */}
                  <div className="flex-1 flex flex-col gap-2">
                    
                    {/* TIER 84 (Top Deck) */}
                    <div className="grid grid-cols-3 gap-2">
                      {['02', '01', '03'].map(row => {
                        const isCenter = row === '01';
                        const isFilled = isCenter && animPhase >= 4;
                        return (
                          <div
                            key={`anim-84-${row}`}
                            className={`h-14 rounded-xl border flex flex-col items-center justify-center p-1 text-center transition-all duration-500 ${
                              isFilled
                                ? 'bg-[#CC79A7] text-white border-white/20 shadow-lg scale-100 ring-2 ring-emerald-400'
                                : 'border-dashed border-slate-800 bg-slate-900/40 text-slate-700'
                            }`}
                          >
                            {isFilled ? (
                              <div className="animate-slide-up">
                                <span className="text-xs font-black block">MDN &bull; 12t</span>
                                <span className="text-[9px] text-white/80 block">REEFER ❄️</span>
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-600">{row === '01' ? 'Slot 84' : ''}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* TIER 82 (Lower Deck) */}
                    <div className="grid grid-cols-3 gap-2">
                      {['02', '01', '03'].map(row => {
                        const isCenter = row === '01';
                        const isFilled = isCenter && animPhase >= 3;
                        return (
                          <div
                            key={`anim-82-${row}`}
                            className={`h-14 rounded-xl border flex flex-col items-center justify-center p-1 text-center transition-all duration-500 ${
                              isFilled
                                ? 'bg-[#009E73] text-white border-white/20 shadow-lg scale-100'
                                : 'border-dashed border-slate-800 bg-slate-900/40 text-slate-700'
                            }`}
                          >
                            {isFilled ? (
                              <div className="animate-slide-up">
                                <span className="text-xs font-black block">JYP &bull; 16t</span>
                                <span className="text-[9px] text-white/80 block">DRY</span>
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-600">{row === '01' ? 'Slot 82' : ''}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* HATCH COVER LINE */}
                    <div className="w-full h-3 bg-slate-800 rounded-full flex items-center justify-center relative border border-slate-700">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-2 bg-slate-900 rounded">
                        Hatch Cover Line {animPhase >= 3 ? '(Tertutup)' : '(Terbuka)'}
                      </span>
                    </div>

                    {/* TIER 02 (Underdeck Hold) */}
                    <div className="grid grid-cols-3 gap-2">
                      {['02', '01', '03'].map(row => {
                        const isCenter = row === '01';
                        const isFilled = isCenter && animPhase >= 2;
                        return (
                          <div
                            key={`anim-02-${row}`}
                            className={`h-14 rounded-xl border flex flex-col items-center justify-center p-1 text-center transition-all duration-500 ${
                              isFilled
                                ? 'bg-[#E69F00] text-white border-white/20 shadow-lg scale-100'
                                : 'border-dashed border-slate-800 bg-slate-900/40 text-slate-700'
                            }`}
                          >
                            {isFilled ? (
                              <div className="animate-slide-up">
                                <span className="text-xs font-black block">MKS &bull; 20t</span>
                                <span className="text-[9px] text-white/80 block">DRY (Dasar)</span>
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-600">{row === '01' ? 'Slot 02' : ''}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                  </div>
                </div>

                {/* Column Row Labels */}
                <div className="grid grid-cols-3 gap-2 pl-12 mt-3 text-center text-[10px] font-bold text-slate-500">
                  <div>Row 02 <span className="block text-[8px] text-slate-600">(Port/Kiri)</span></div>
                  <div>Row 01 <span className="block text-[8px] text-emerald-400 font-bold">(Tengah)</span></div>
                  <div>Row 03 <span className="block text-[8px] text-slate-600">(Stbd/Kanan)</span></div>
                </div>

              </div>
            </div>

            {/* Explanation & Live Rules Callout Card */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              
              {/* Active Step Header Badge */}
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black tracking-wider uppercase border border-emerald-500/30">
                  {currentPhaseInfo.badge}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Langkah {animPhase} dari 5
                </span>
              </div>

              {/* Title & Rule */}
              <div>
                <h3 className="text-2xl font-black text-white mb-1 font-display">
                  {currentPhaseInfo.title}
                </h3>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20 mt-1">
                  <Sparkles size={12} /> {currentPhaseInfo.rule}
                </div>
              </div>

              {/* Detailed Description */}
              <p className="text-slate-300 text-sm leading-relaxed bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                {currentPhaseInfo.desc}
              </p>

              {/* Live Rule Indicators */}
              <div className="space-y-2 pt-2">
                <div className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                  animPhase >= 2 ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-slate-800/30 border-slate-800 text-slate-500'
                }`}>
                  <span className="flex items-center gap-2">
                    <Scale size={14} className={animPhase >= 2 ? 'text-emerald-400' : 'text-slate-600'} />
                    Stabilitas Titik Berat (Center of Gravity)
                  </span>
                  <span className="font-bold">{animPhase >= 2 ? '✅ Stabil' : 'Menunggu'}</span>
                </div>

                <div className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                  animPhase >= 3 ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-slate-800/30 border-slate-800 text-slate-500'
                }`}>
                  <span className="flex items-center gap-2">
                    <Layers size={14} className={animPhase >= 3 ? 'text-emerald-400' : 'text-slate-600'} />
                    Dukungan Fisika (Anti-Melayang)
                  </span>
                  <span className="font-bold">{animPhase >= 3 ? '✅ Terpenuhi' : 'Menunggu'}</span>
                </div>

                <div className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                  animPhase >= 5 ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-slate-800/30 border-slate-800 text-slate-500'
                }`}>
                  <span className="flex items-center gap-2">
                    <ShieldAlert size={14} className={animPhase >= 5 ? 'text-emerald-400' : 'text-slate-600'} />
                    Bebas Restow Blocker (Denda Rp 0)
                  </span>
                  <span className="font-bold">{animPhase >= 5 ? '✅ Diverifikasi' : 'Tahap Akhir'}</span>
                </div>
              </div>

              {/* Final Success Callout (Phase 5) */}
              {animPhase === 5 && (
                <div className="bg-gradient-to-r from-spil-green/30 via-emerald-600/20 to-spil-green/30 border border-emerald-500/50 p-4 rounded-xl text-center animate-slide-up">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-300 block mb-1">
                    🎉 CLEARANCE APPROVED
                  </span>
                  <p className="text-xs text-white/90">
                    Susunan Bay 14 memenuhi standar operasional PT SPIL. Siap berlayar dengan margin keuntungan penuh!
                  </p>
                </div>
              )}

            </div>

          </div>

        </div>

        {/* ============================================================== */}
        {/* PENDALAMAN: TABS TEORI LENGKAP & ARENA LATIHAN MANDIRI           */}
        {/* ============================================================== */}
        <div className="border-t border-slate-200 dark:border-white/10 pt-16 transition-colors">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-2 font-display transition-colors">
              Ingin Mendalami Lebih Jauh?
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">
              Pelajari detail aturan maritim atau uji coba menyusun kontainer sendiri di arena simulasi.
            </p>

            {/* Mode Switcher Tabs */}
            <div className="inline-flex p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mt-6 border border-slate-200 dark:border-white/10">
              <button
                onClick={() => setActiveTab('lessons')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  activeTab === 'lessons'
                    ? 'bg-white dark:bg-slate-700 text-spil-green dark:text-emerald-400 shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Compass size={16} /> Modul Konsep (Teori)
              </button>
              <button
                onClick={() => setActiveTab('sandbox')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  activeTab === 'sandbox'
                    ? 'bg-spil-green text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Ship size={16} /> Arena Latihan (Coba Sendiri)
              </button>
            </div>
          </div>

          {/* TAB 1: MODUL KONSEP LENGKAP */}
          {activeTab === 'lessons' && (
            <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-10 shadow-xl transition-all">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
                {LESSONS.map((lesson, idx) => {
                  const IconComponent = lesson.icon;
                  const isActive = currentLesson === idx;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setCurrentLesson(idx)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl text-left border transition-all ${
                        isActive
                          ? 'bg-white dark:bg-slate-800 border-spil-green dark:border-emerald-500 shadow-md text-spil-green dark:text-emerald-400 ring-1 ring-spil-green dark:ring-emerald-500'
                          : 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-spil-green text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}>
                        <IconComponent size={16} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 block">Modul 0{idx + 1}</span>
                        <span className="text-xs font-bold truncate block text-slate-800 dark:text-white">{lesson.title.split(' ')[0]} {lesson.title.split(' ')[1]}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="bg-white dark:bg-slate-850 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 md:p-8 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-white/10">
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full mb-2 inline-block ${LESSONS[currentLesson].tagColor}`}>
                      {LESSONS[currentLesson].tag}
                    </span>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                      {LESSONS[currentLesson].title}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                      {LESSONS[currentLesson].subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentLesson(prev => Math.max(0, prev - 1))}
                      disabled={currentLesson === 0}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      &larr; Sebelumnya
                    </button>
                    <button
                      onClick={() => setCurrentLesson(prev => Math.min(LESSONS.length - 1, prev + 1))}
                      disabled={currentLesson === LESSONS.length - 1}
                      className="px-3 py-1.5 rounded-lg bg-spil-green text-white text-xs font-bold hover:bg-spil-green-hover disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
                    >
                      Selanjutnya &rarr;
                    </button>
                  </div>
                </div>

                <div className="min-h-[200px]">
                  {LESSONS[currentLesson].content}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ARENA LATIHAN MANDIRI (SANDBOX) */}
          {/* TAB 2: ARENA LATIHAN MANDIRI (SANDBOX) */}
          {activeTab === 'sandbox' && (
            <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-xl transition-all">
              
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs">
                <div className="flex items-center gap-2">
                  <Info size={18} className="text-spil-green dark:text-emerald-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Klik kontainer di staging, lalu klik slot tujuan di kapal.
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={applyWrongScenario}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-spil-red dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <AlertTriangle size={14} /> Contoh Salah
                  </button>
                  <button
                    onClick={applyOptimalScenario}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-spil-green dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={14} /> Contoh Optimal
                  </button>
                  <button
                    onClick={resetGrid}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Staging Yard */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col gap-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-1">
                      Staging Yard (Dermaga)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Pilih kontainer untuk dimuat ke atas kapal:
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {SAMPLE_CARGOS.map(cargo => {
                      const isSelected = selectedCargoId === cargo.id;
                      const isPlaced = Object.values(gridState).includes(cargo.id);
                      return (
                        <button
                          key={cargo.id}
                          onClick={() => setSelectedCargoId(cargo.id)}
                          className={`p-3.5 rounded-xl border text-left transition-all relative ${
                            isSelected
                              ? 'border-spil-green bg-emerald-50/40 dark:bg-emerald-950/40 ring-2 ring-spil-green/30 shadow-md'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60'
                          } ${isPlaced ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span 
                              className="px-2 py-0.5 rounded text-[11px] font-black text-white"
                              style={{ backgroundColor: cargo.color }}
                            >
                              {cargo.dest} &bull; {cargo.type}
                            </span>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                              {cargo.weight} Ton
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 dark:text-white">
                            Pelabuhan {cargo.portName}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-400 mt-1">
                            {cargo.description}
                          </div>

                          {isPlaced && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                              <CheckCircle size={10} /> Termuat
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Vessel Matrix */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col items-center">
                  <div className="w-full text-center mb-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-0.5">
                      Bay 14 &bull; Cross-Section View
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Klik slot untuk memuat atau mengeluarkan kontainer
                    </span>
                  </div>

                  <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-white/10 relative">
                    <div className="flex">
                      <div className="flex flex-col justify-between pr-3 text-[10px] font-bold text-slate-400 dark:text-slate-400 py-2 shrink-0">
                        <div className="h-14 flex items-center">Tier 84</div>
                        <div className="h-14 flex items-center">Tier 82</div>
                        <div className="h-3 flex items-center text-[9px] text-slate-400 dark:text-slate-400 font-bold">Hatch</div>
                        <div className="h-14 flex items-center">Tier 02</div>
                      </div>

                      <div className="flex-1 flex flex-col gap-2">
                        {/* TIER 84 */}
                        <div className="grid grid-cols-3 gap-2">
                          {['02', '01', '03'].map(row => {
                            const slotKey = `84-${row}`;
                            const cargoId = gridState[slotKey];
                            const cargo = cargoId ? SAMPLE_CARGOS.find(c => c.id === cargoId) : null;
                            return (
                              <button
                                key={slotKey}
                                onClick={() => handleSlotClick(slotKey)}
                                className={`h-14 rounded-xl border flex flex-col items-center justify-center p-1 text-center transition-all ${
                                  cargo ? 'text-white shadow-md' : 'border-dashed border-slate-300 dark:border-slate-700 hover:border-spil-green dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30'
                                }`}
                                style={{ backgroundColor: cargo ? cargo.color : 'transparent' }}
                              >
                                {cargo ? (
                                  <>
                                    <span className="text-[11px] font-black">{cargo.dest}</span>
                                    <span className="text-[9px] opacity-90">{cargo.weight}t</span>
                                  </>
                                ) : (
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500">+ Isi</span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* TIER 82 */}
                        <div className="grid grid-cols-3 gap-2">
                          {['02', '01', '03'].map(row => {
                            const slotKey = `82-${row}`;
                            const cargoId = gridState[slotKey];
                            const cargo = cargoId ? SAMPLE_CARGOS.find(c => c.id === cargoId) : null;
                            return (
                              <button
                                key={slotKey}
                                onClick={() => handleSlotClick(slotKey)}
                                className={`h-14 rounded-xl border flex flex-col items-center justify-center p-1 text-center transition-all ${
                                  cargo ? 'text-white shadow-md' : 'border-dashed border-slate-300 dark:border-slate-700 hover:border-spil-green dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30'
                                }`}
                                style={{ backgroundColor: cargo ? cargo.color : 'transparent' }}
                              >
                                {cargo ? (
                                  <>
                                    <span className="text-[11px] font-black">{cargo.dest}</span>
                                    <span className="text-[9px] opacity-90">{cargo.weight}t</span>
                                  </>
                                ) : (
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500">+ Isi</span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* HATCH LINE */}
                        <div className="w-full h-2.5 bg-slate-300 dark:bg-slate-700 rounded-full flex items-center justify-center relative shadow-inner">
                          <span className="text-[8px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest px-2 bg-slate-200 dark:bg-slate-800 rounded">
                            Hatch Cover Line
                          </span>
                        </div>

                        {/* TIER 02 */}
                        <div className="grid grid-cols-3 gap-2">
                          {['02', '01', '03'].map(row => {
                            const slotKey = `02-${row}`;
                            const cargoId = gridState[slotKey];
                            const cargo = cargoId ? SAMPLE_CARGOS.find(c => c.id === cargoId) : null;
                            const hasReeferPlug = row === '01';
                            return (
                              <button
                                key={slotKey}
                                onClick={() => handleSlotClick(slotKey)}
                                className={`h-14 rounded-xl border flex flex-col items-center justify-center p-1 text-center transition-all relative ${
                                  cargo ? 'text-white shadow-md' : 'border-dashed border-slate-300 dark:border-slate-700 hover:border-spil-green dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 bg-slate-100/50 dark:bg-slate-800/50'
                                }`}
                                style={{ backgroundColor: cargo ? cargo.color : undefined }}
                              >
                                {hasReeferPlug && !cargo && (
                                  <Zap size={10} className="absolute top-1 right-1 text-sky-500" title="Colokan Listrik Reefer" />
                                )}
                                {cargo ? (
                                  <>
                                    <span className="text-[11px] font-black">{cargo.dest}</span>
                                    <span className="text-[9px] opacity-90">{cargo.weight}t {cargo.type === 'REEFER' ? '❄️' : ''}</span>
                                  </>
                                ) : (
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500">+ Isi</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pl-12 mt-3 text-center text-[10px] font-bold text-slate-400 dark:text-slate-400">
                      <div>Row 02 <span className="block text-[8px] text-slate-400 dark:text-slate-500">(Port/Kiri)</span></div>
                      <div>Row 01 <span className="block text-[8px] text-sky-600 dark:text-sky-400 font-bold">(Plug ⚡)</span></div>
                      <div>Row 03 <span className="block text-[8px] text-slate-400 dark:text-slate-500">(Stbd/Kanan)</span></div>
                    </div>
                  </div>

                  {feedbackMessage && (
                    <div className={`mt-4 text-xs font-bold px-3 py-2 rounded-xl text-center w-full ${
                      feedbackMessage.type === 'error'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        : feedbackMessage.type === 'warning'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        : feedbackMessage.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {feedbackMessage.text}
                    </div>
                  )}
                </div>

                {/* Audit Diagnostics */}
                <div className="lg:col-span-3 bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col gap-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-1">
                      Audit Status Pelayaran
                    </h4>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Muatan Termuat:</span>
                      <span className="text-spil-green dark:text-emerald-400">{sandboxEvaluation.placedCount} / {SAMPLE_CARGOS.length}</span>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border ${
                    sandboxEvaluation.restowPenalty > 0 
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800' 
                      : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
                  }`}>
                    <span className="text-[10px] font-black uppercase tracking-wider block text-slate-500 dark:text-slate-400 mb-1">
                      Estimasi Denda Restow
                    </span>
                    <div className={`text-xl font-black ${
                      sandboxEvaluation.restowPenalty > 0 ? 'text-spil-red dark:text-rose-400' : 'text-spil-green dark:text-emerald-400'
                    }`}>
                      Rp {sandboxEvaluation.restowPenalty.toLocaleString('id-ID')}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                      {sandboxEvaluation.restowPenalty > 0 ? '⚠️ Dikenakan biaya crane ekstra!' : '✅ Bebas biaya shifting!'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 block">
                      Pemeriksaan Aturan:
                    </span>
                    {sandboxEvaluation.issues.length === 0 ? (
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                        Tidak ada pelanggaran terdeteksi.
                      </div>
                    ) : (
                      sandboxEvaluation.issues.map((issue, idx) => (
                        <div 
                          key={idx}
                          className={`p-2.5 rounded-xl border text-xs ${
                            issue.severity === 'error' || issue.severity === 'danger'
                              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                              : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          <div className="font-bold flex items-center gap-1.5 mb-0.5">
                            <AlertTriangle size={12} className="shrink-0" />
                            {issue.title}
                          </div>
                          <p className="text-[11px] leading-tight opacity-90">{issue.desc}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-auto pt-3 border-t border-slate-100 dark:border-white/10">
                    {sandboxEvaluation.isOptimal ? (
                      <div className="bg-spil-green text-white p-3 rounded-xl text-center shadow-md">
                        <span className="text-xs font-black uppercase tracking-widest block mb-0.5">
                          STATUS: LAYAK BERLAYAR
                        </span>
                        <span className="text-[10px] text-white/80">
                          Siap mencetak laba maksimal!
                        </span>
                      </div>
                    ) : (
                      <div className="bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-300 p-3 rounded-xl text-center">
                        <span className="text-xs font-bold block mb-0.5">
                          {sandboxEvaluation.placedCount < SAMPLE_CARGOS.length ? 'Lengkapi Semua Kontainer' : 'Tinjau Ulang Susunan'}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-400">
                          {sandboxEvaluation.placedCount < SAMPLE_CARGOS.length ? 'Muat 3 kontainer di staging ke kapal' : 'Selesaikan kendala di atas'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
}
