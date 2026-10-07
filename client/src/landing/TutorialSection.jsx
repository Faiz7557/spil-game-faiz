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
  Layers,
  Compass,
  Ship,
  Info,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Lightbulb
} from 'lucide-react';
import { playContainerThud, playErrorBuzzer, playCashCoin } from '../utils/audioEffects';
import { portVars } from '../components/game/gameUi';
import { PortChip } from '../components/game/Chips';

// Sample containers for interactive sandbox & animated walkthrough
const SAMPLE_CARGOS = [
  {
    id: 'c1',
    dest: 'MKS',
    portName: 'Makassar',
    type: 'DRY',
    weight: 20,
    routeOrder: 2,
    description: 'Kargo berat (tujuan transit pertama)'
  },
  {
    id: 'c2',
    dest: 'JYP',
    portName: 'Jayapura',
    type: 'DRY',
    weight: 16,
    routeOrder: 3,
    description: 'Kargo sedang (tujuan transit kedua)'
  },
  {
    id: 'c3',
    dest: 'MDN',
    portName: 'Medan',
    type: 'REEFER',
    weight: 12,
    routeOrder: 4,
    description: 'Kargo ringan dan berpendingin (butuh colokan listrik)'
  }
];

// Same slot look as the game's bay cross-section (and the hero card).
const boxStyle = (dest) => {
  const pv = portVars(dest);
  return { background: pv.bg, border: `2px solid ${pv.c}`, color: pv.ink };
};
const IDLE_STYLE = { background: 'var(--g-tint)', border: '1px solid var(--g-sunk)' };

// Walkthrough: which box lands in row 01 of each tier, and from which step.
const ANIM_TIERS = [
  { tier: '84', from: 4, cargo: SAMPLE_CARGOS[2] },
  { tier: '82', from: 3, cargo: SAMPLE_CARGOS[1] },
  { tier: '02', from: 2, cargo: SAMPLE_CARGOS[0] }
];
const ROWS = ['02', '01', '03'];

const card = 'rounded-2xl border border-g-hair bg-g-inset';
const btn = 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none';
const btnNeutral = `${btn} border-g-hair bg-g-inset lp-ink2 hover:bg-g-inset-hover`;
const btnGreen = `${btn} border-g-green-line bg-g-green-nav lp-ink hover:border-g-green`;
const tone = {
  ok: 'bg-g-green-bg border-g-green-line text-g-green-ink',
  warn: 'bg-g-warn-bg border-g-warn-line text-g-warn-ink',
  bad: 'bg-g-danger-bg border-g-danger-line text-g-danger-ink',
  info: 'bg-g-info-bg border-g-info-line text-g-info-ink',
  idle: 'bg-g-inset border-g-hair lp-muted'
};

function HatchLine({ label = 'Palka' }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold text-g-muted">
      <i className="flex-1 h-[3px] rounded-sm bg-g-faint block" />
      <span>{label}</span>
    </div>
  );
}

function TierLabels() {
  return (
    <div className="flex flex-col justify-between pr-3 text-[11px] font-plex text-g-muted py-1 shrink-0">
      <div className="h-14 flex items-center">84</div>
      <div className="h-14 flex items-center">82</div>
      <div className="h-4" />
      <div className="h-14 flex items-center">02</div>
    </div>
  );
}

function RowLabels({ middle }) {
  return (
    <div className="grid grid-cols-3 gap-2 pl-8 mt-3 text-center text-[11px] font-plex text-g-muted">
      <div>02 <span className="block font-sans text-g-faint">Port</span></div>
      <div>01 <span className="block font-sans text-g-green-ink">{middle}</span></div>
      <div>03 <span className="block font-sans text-g-faint">Starboard</span></div>
    </div>
  );
}

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
      badge: 'Tahap 1 / 5',
      title: 'Struktur Penampang Kapal (Bay 14)',
      rule: 'Palka Bersih & Siap Muat',
      desc: 'Kapal bersandar di Pelabuhan Tanjung Perak (Surabaya). Palka bawah (Tier 02) dan dek atas (Tier 82 & 84) masih kosong. Garis tengah dilengkapi palka (Hatch Cover Line).'
    },
    {
      step: 2,
      badge: 'Tahap 2 / 5',
      title: 'Memuat Kargo Bawah Palka (Tier 02)',
      rule: 'Hukum Gravitasi: Beban Berat di Dasar',
      desc: 'Crane menurunkan kontainer terberat (Makassar 20t) ke dasar palka (Tier 02). Meletakkan kargo berat di bawah memastikan titik berat kapal rendah (Center of Gravity stabil).'
    },
    {
      step: 3,
      badge: 'Tahap 3 / 5',
      title: 'Segel Palka & Muat Dek Bawah (Tier 82)',
      rule: 'Landasan Kokoh (Anti-Melayang)',
      desc: 'Palka ditutup. Crane menurunkan kontainer kedua (Jayapura 16t) di atas dek (Tier 82). Tier 82 kini menjadi landasan kokoh bagi tumpukan di atasnya.'
    },
    {
      step: 4,
      badge: 'Tahap 4 / 5',
      title: 'Memuat Dek Teratas (Tier 84)',
      rule: 'Distribusi Beban Piramida & Colokan Reefer',
      desc: 'Kontainer berpendingin (Medan 12t) diletakkan di Tier 84 bercolokan listrik. Beban tersusun menurun: 20t di dasar, 16t di tengah, 12t di puncak. Kapal dijamin tidak oleng!'
    },
    {
      step: 5,
      badge: 'Tahap 5 / 5',
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
      tag: 'Dasar nomenklatur',
      tagTone: tone.info,
      content: (
        <div className="space-y-4 lp-ink2 text-sm">
          <p>
            Dalam armada kapal peti kemas modern PT SPIL, setiap kontainer ditempatkan menggunakan koordinat standar internasional <strong className="lp-ink">Bay-Row-Tier</strong>:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              ['1. Bay (posisi memanjang)', 'Nomor ganjil (01, 03, ...) untuk kontainer 20ft; nomor genap (02, 04, ...) untuk kontainer 40ft.'],
              ['2. Row (posisi melintang)', 'Nomor genap (02, 04) di lambung kiri (Port); nomor ganjil (01, 03) di lambung kanan (Starboard).'],
              ['3. Tier (ketinggian vertikal)', 'Tier 02 di bawah palka (Hold); Tier 82 & 84 di atas dek kapal (On-Deck).']
            ].map(([label, text]) => (
              <div key={label} className={`${card} p-4`}>
                <span className="text-xs font-semibold text-g-green-ink block mb-1">{label}</span>
                <p className="text-xs lp-muted">{text}</p>
              </div>
            ))}
          </div>
          <div className={`flex items-start gap-2 p-3 rounded-xl border text-xs ${tone.ok}`}>
            <Lightbulb size={14} className="shrink-0 mt-px" />
            <span>
              <strong>Contoh nyata:</strong> slot <code className="font-plex bg-g-inset px-1 py-0.5 rounded lp-ink">14-01-82</code> berarti Bay 14, Baris Tengah (Row 01), Tingkat Dek Bawah (Tier 82).
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'physics',
      title: 'Hukum Gravitasi & Distribusi Berat',
      subtitle: 'Mencegah Kapal Oleng dan Kontainer Melayang',
      icon: Scale,
      tag: 'Fisika dan keselamatan',
      tagTone: tone.warn,
      content: (
        <div className="space-y-4 lp-ink2 text-sm">
          <p>
            Stowage yang aman menuntut stabilitas titik berat kapal (Center of Gravity) yang optimal:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`${card} p-4 flex gap-3`}>
              <div className="w-10 h-10 rounded-lg bg-g-danger-bg flex items-center justify-center text-g-danger shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="font-semibold lp-ink text-sm mb-1">Anti-Melayang (Anti-Floating)</h4>
                <p className="text-xs lp-muted">
                  Kontainer di <strong>Tier 84</strong> tidak dapat diletakkan jika <strong>Tier 82</strong> di bawahnya masih kosong. Kontainer membutuhkan landasan fisik di bawahnya!
                </p>
              </div>
            </div>
            <div className={`${card} p-4 flex gap-3`}>
              <div className="w-10 h-10 rounded-lg bg-g-warn-bg flex items-center justify-center text-g-warn shrink-0">
                <Scale size={20} />
              </div>
              <div>
                <h4 className="font-semibold lp-ink text-sm mb-1">Beban Berat Wajib di Bawah</h4>
                <p className="text-xs lp-muted">
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
      tag: 'Fasilitas kapal',
      tagTone: tone.info,
      content: (
        <div className="space-y-4 lp-ink2 text-sm">
          <p>
            Memuat kontainer di palka dan dek memiliki batasan struktural dan elektrikal yang ketat:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`${card} p-4`}>
              <div className="flex items-center gap-2 font-semibold lp-ink text-sm mb-2">
                <Layers size={18} className="text-g-muted" />
                Penyekat Palka (Hatch Cover)
              </div>
              <p className="text-xs lp-muted leading-relaxed">
                Palka memisahkan <strong>Tier 02 (Bawah Dek)</strong> dari Tier Dek. Selama kontainer di Tier 82/84 terpasang di atasnya, palka tersegel dan Tier 02 tidak dapat dibongkar!
              </p>
            </div>
            <div className={`${card} p-4`}>
              <div className="flex items-center gap-2 font-semibold lp-ink text-sm mb-2">
                <Snowflake size={18} className="text-g-info" />
                Kebutuhan Receptacle (Plug Reefer)
              </div>
              <p className="text-xs lp-muted leading-relaxed">
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
      tag: 'Efisiensi biaya',
      tagTone: tone.bad,
      content: (
        <div className="space-y-4 lp-ink2 text-sm">
          <p>
            Rute tetap kapal SPIL: <strong className="lp-ink">01 Surabaya (SBY) &rarr; 02 Makassar (MKS) &rarr; 03 Jayapura (JYP) &rarr; 04 Medan (MDN)</strong>.
          </p>
          <div className={`rounded-xl border p-4 ${tone.bad}`}>
            <div className="flex items-center gap-2 font-semibold mb-2">
              <AlertTriangle size={18} />
              Skenario Terjadinya Overstowage / Restow:
            </div>
            <p className="text-xs leading-relaxed">
              Jika Anda meletakkan kontainer tujuan <strong>Medan (Port #4)</strong> tepat di ATAS kontainer tujuan <strong>Makassar (Port #2)</strong>, maka saat kapal bersandar di Makassar, crane pelabuhan <em>harus mengangkat kontainer Medan terlebih dahulu ke dermaga</em> demi mengambil kontainer Makassar di bawahnya, lalu mengembalikannya lagi ke kapal.
            </p>
          </div>
          <div className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}>
            <div>
              <span className="text-xs lp-muted block">Biaya shifting crane per blocker</span>
              <span className="text-xl font-semibold font-plex text-g-danger">Rp 6.000.000 / gerakan ekstra</span>
            </div>
            <div className="text-right text-xs lp-ink2">
              Kaidah emas: <strong className="lp-ink">tujuan jauh di bawah, tujuan dekat di atas!</strong>
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
      text: 'Terdeteksi pelanggaran: kontainer melayang di Row 02 dan restow blocker di Row 01!'
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
      text: 'Susunan sempurna: gravitasi terpenuhi, beban berat di bawah, dan bebas denda restow!'
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

  const ruleRow = (on, Icon, label, onText, offText) => (
    <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 transition-colors ${on ? tone.ok : tone.idle}`}>
      <span className="flex items-center gap-2">
        <Icon size={14} />
        {label}
      </span>
      <span className="flex items-center gap-1 font-semibold whitespace-nowrap">
        {on && <CheckCircle size={13} />}
        {on ? onText : offText}
      </span>
    </div>
  );

  const renderAnimTier = ({ tier, from, cargo }) => (
    <div key={tier} className="grid grid-cols-3 gap-2">
      {ROWS.map(row => {
        const filled = row === '01' && animPhase >= from;
        return (
          <div
            key={`anim-${tier}-${row}`}
            className="h-14 rounded-[10px] flex flex-col items-center justify-center p-1 text-center transition-all duration-500"
            style={filled ? boxStyle(cargo.dest) : IDLE_STYLE}
          >
            {filled ? (
              <div className="animate-slide-up">
                <span className="font-plex text-sm font-medium block">{cargo.dest} · {cargo.weight}t</span>
                <span className="text-[11px] text-g-muted flex items-center justify-center gap-1">
                  {cargo.type}{cargo.type === 'REEFER' && <Snowflake size={10} />}
                </span>
              </div>
            ) : (
              <span className="font-plex text-[11px] text-g-faint">{row === '01' ? `14-01-${tier}` : ''}</span>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderSandboxTier = (tier) => (
    <div key={tier} className="grid grid-cols-3 gap-2">
      {ROWS.map(row => {
        const slotKey = `${tier}-${row}`;
        const cargoId = gridState[slotKey];
        const cargo = cargoId ? SAMPLE_CARGOS.find(c => c.id === cargoId) : null;
        const hasReeferPlug = tier === '02' && row === '01';
        return (
          <button
            key={slotKey}
            onClick={() => handleSlotClick(slotKey)}
            className={`h-14 rounded-[10px] flex flex-col items-center justify-center p-1 text-center transition-colors relative ${
              cargo ? 'hover:brightness-95' : 'border-dashed hover:!border-g-green hover:!bg-g-green-bg'
            }`}
            style={cargo ? boxStyle(cargo.dest) : IDLE_STYLE}
          >
            {hasReeferPlug && !cargo && (
              <Zap size={10} className="absolute top-1 right-1 text-g-info" aria-label="Colokan listrik reefer" />
            )}
            {cargo ? (
              <>
                <span className="font-plex text-xs font-medium">{cargo.dest}</span>
                <span className="text-[11px] text-g-muted flex items-center gap-1">
                  {cargo.weight}t{cargo.type === 'REEFER' && <Snowflake size={10} />}
                </span>
              </>
            ) : (
              <span className="text-[11px] text-g-faint">+ Isi</span>
            )}
          </button>
        );
      })}
    </div>
  );

  const feedbackTone = {
    error: tone.bad,
    warning: tone.warn,
    success: tone.ok,
    info: tone.idle
  };

  return (
    <section
      id="tutorial"
      ref={sectionContainerRef}
      className="lp-alt lp-section px-4 sm:px-6 md:px-8 relative"
    >
      <div className="max-w-6xl mx-auto">

        {/* Section Header */}
        <div className="text-center max-w-[760px] mx-auto mb-12 md:mb-16">
          <p className="lp-eyebrow mb-3">Mini tutorial interaktif</p>
          <h2 className="lp-h2 lp-ink">
            Simulasi penataan bayplan.
          </h2>
          <p className="lp-lead lp-muted mt-5">
            Saksikan crane memuat kargo langkah demi langkah, atau kendalikan sendiri setiap tahap susunan kontainer.
          </p>
        </div>

        {/* ============================================================== */}
        {/* UTAMA: ANIMASI INTERAKTIF LANGKAH BERTAHAP (CRANE & VESSEL)      */}
        {/* ============================================================== */}
        <div className="lp-tile p-6 md:p-10 mb-16">

          {/* Top Bar: Playback Controls & Scrubber */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-g-hair">

            {/* Play/Pause & Step Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={togglePlay}
                className={`lp-btn lp-btn-sm ${isPlaying ? 'lp-btn-secondary' : 'lp-btn-primary'}`}
              >
                {isPlaying ? (
                  <><Pause size={14} /> Jeda</>
                ) : hasCompletedInitialPlay ? (
                  <><RotateCcw size={14} /> Putar ulang</>
                ) : (
                  <><Play size={14} /> Putar otomatis</>
                )}
              </button>

              <button
                onClick={handlePrevStep}
                disabled={animPhase === 1}
                className="lp-paddle !w-8 !h-8"
                title="Langkah sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNextStep}
                disabled={animPhase === 5}
                className="lp-paddle !w-8 !h-8"
                title="Langkah berikutnya"
              >
                <ChevronRight size={16} />
              </button>

              {/* Status Hint */}
              <div className="text-xs font-medium">
                {isPlaying && (
                  <span className="text-g-warn-ink flex items-center gap-1.5 animate-pulse">
                    <Sparkles size={12} /> Memutar otomatis... (klik untuk kendali manual)
                  </span>
                )}
                {!isPlaying && hasCompletedInitialPlay && (
                  <span className="text-g-green-ink flex items-center gap-1.5">
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
                    className={`${btn} ${
                      isActive
                        ? 'border-g-green-line bg-g-green-nav lp-ink'
                        : isPassed
                        ? 'border-g-hair bg-g-inset text-g-green-ink hover:bg-g-inset-hover'
                        : 'border-g-hair bg-g-inset lp-muted hover:bg-g-inset-hover'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-plex ${isActive ? 'bg-g-green-bg text-g-green-ink' : 'bg-g-inset'}`}>
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

            {/* Visual Ship Cross Section with Hoist Cable */}
            <div className="lg:col-span-7 flex flex-col items-center">

              {/* Crane Gantry & Spreader */}
              <div className="w-full max-w-md flex flex-col items-center mb-3">
                <div className="w-full h-1.5 rounded-sm bg-g-structure" />
                <div className="flex items-center gap-6 h-7">
                  <div className="w-px h-full bg-g-structure" />
                  <div className="px-2.5 py-0.5 rounded-full border border-g-hair bg-g-inset text-[11px] text-g-muted flex items-center gap-1.5">
                    <Ship size={11} /> Crane aktif: memuat row 01
                  </div>
                  <div className="w-px h-full bg-g-structure" />
                </div>
                <div className="w-16 h-1.5 rounded-sm" style={{ background: 'var(--p-mks)' }} />
              </div>

              {/* Vessel Cross Section Bay 14 */}
              <div className={`w-full max-w-md ${card} p-5`}>
                <div className="flex">
                  <TierLabels />
                  <div className="flex-1 flex flex-col gap-2 pb-2 border-x-[3px] border-b-[6px] border-g-structure rounded-b-xl px-2">
                    {renderAnimTier(ANIM_TIERS[0])}
                    {renderAnimTier(ANIM_TIERS[1])}
                    <HatchLine label={animPhase >= 3 ? 'Palka tertutup' : 'Palka terbuka'} />
                    {renderAnimTier(ANIM_TIERS[2])}
                  </div>
                </div>
                <RowLabels middle="Tengah" />
              </div>
            </div>

            {/* Explanation & Live Rules Callout Card */}
            <div className="lg:col-span-5 flex flex-col gap-4">

              {/* Active Step Header Badge */}
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${tone.ok}`}>
                  {currentPhaseInfo.badge}
                </span>
                <span className="text-xs font-plex lp-muted">
                  Langkah {animPhase} dari 5
                </span>
              </div>

              {/* Title & Rule */}
              <div>
                <h3 className="lp-title lp-ink mb-2">
                  {currentPhaseInfo.title}
                </h3>
                <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${tone.warn}`}>
                  <Sparkles size={12} /> {currentPhaseInfo.rule}
                </div>
              </div>

              {/* Detailed Description */}
              <p className={`lp-ink2 text-sm leading-relaxed p-4 ${card} !rounded-xl`}>
                {currentPhaseInfo.desc}
              </p>

              {/* Live Rule Indicators */}
              <div className="space-y-2 pt-2">
                {ruleRow(animPhase >= 2, Scale, 'Stabilitas Titik Berat (Center of Gravity)', 'Stabil', 'Menunggu')}
                {ruleRow(animPhase >= 3, Layers, 'Dukungan Fisika (Anti-Melayang)', 'Terpenuhi', 'Menunggu')}
                {ruleRow(animPhase >= 5, ShieldAlert, 'Bebas Restow Blocker (Denda Rp 0)', 'Diverifikasi', 'Tahap akhir')}
              </div>

              {/* Final Success Callout (Phase 5) */}
              {animPhase === 5 && (
                <div className={`border p-4 rounded-xl text-center animate-slide-up ${tone.ok}`}>
                  <span className="text-sm font-semibold flex items-center justify-center gap-1.5 mb-1">
                    <CheckCircle size={14} /> Clearance approved
                  </span>
                  <p className="text-xs lp-ink2">
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
        <div className="border-t border-g-hair pt-16">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h3 className="lp-h3 lp-ink mb-2">
              Ingin mendalami lebih jauh?
            </h3>
            <p className="lp-small lp-muted">
              Pelajari detail aturan maritim atau uji coba menyusun kontainer sendiri di arena simulasi.
            </p>

            {/* Mode Switcher Tabs */}
            <div className="inline-flex p-1 rounded-full mt-6 border border-g-hair bg-g-inset">
              {[
                { id: 'lessons', icon: Compass, label: 'Modul konsep (teori)' },
                { id: 'sandbox', icon: Ship, label: 'Arena latihan (coba sendiri)' }
              ].map(({ id, icon: TabIcon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full border text-sm font-medium transition-colors ${
                    activeTab === id
                      ? 'border-g-green-line bg-g-green-nav lp-ink'
                      : 'border-transparent lp-muted hover:text-[color:var(--lp-ink)]'
                  }`}
                >
                  <TabIcon size={16} className={activeTab === id ? 'text-g-green-ink' : ''} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: MODUL KONSEP LENGKAP */}
          {activeTab === 'lessons' && (
            <div className="lp-tile p-6 md:p-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
                {LESSONS.map((lesson, idx) => {
                  const IconComponent = lesson.icon;
                  const isActive = currentLesson === idx;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setCurrentLesson(idx)}
                      className={`flex items-center gap-3 p-3 rounded-2xl text-left border transition-colors ${
                        isActive
                          ? 'border-g-green-line bg-g-green-nav'
                          : 'border-g-hair bg-g-inset hover:bg-g-inset-hover'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                        isActive ? 'bg-g-green-bg border-g-green-line text-g-green-ink' : 'bg-g-inset border-g-hair text-g-muted'
                      }`}>
                        <IconComponent size={16} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-medium lp-muted block">Modul 0{idx + 1}</span>
                        <span className="text-xs font-semibold truncate block lp-ink">{lesson.title.split(' ')[0]} {lesson.title.split(' ')[1]}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-g-hair p-6 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-g-hair">
                  <div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border mb-2 inline-block ${LESSONS[currentLesson].tagTone}`}>
                      {LESSONS[currentLesson].tag}
                    </span>
                    <h3 className="lp-title lp-ink">
                      {LESSONS[currentLesson].title}
                    </h3>
                    <p className="lp-muted text-xs mt-1">
                      {LESSONS[currentLesson].subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentLesson(prev => Math.max(0, prev - 1))}
                      disabled={currentLesson === 0}
                      className={btnNeutral}
                    >
                      <ChevronLeft size={14} /> Sebelumnya
                    </button>
                    <button
                      onClick={() => setCurrentLesson(prev => Math.min(LESSONS.length - 1, prev + 1))}
                      disabled={currentLesson === LESSONS.length - 1}
                      className={btnGreen}
                    >
                      Selanjutnya <ChevronRight size={14} className="text-g-green-ink" />
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
          {activeTab === 'sandbox' && (
            <div className="lp-tile p-6 md:p-8">

              <div className={`flex flex-wrap items-center justify-between gap-4 mb-8 p-4 ${card}`}>
                <div className="flex items-center gap-2">
                  <Info size={18} className="text-g-green-ink" />
                  <span className="text-xs font-medium lp-ink2">
                    Klik kontainer di staging, lalu klik slot tujuan di kapal.
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={applyWrongScenario} className={`${btn} ${tone.bad}`}>
                    <AlertTriangle size={14} /> Contoh salah
                  </button>
                  <button onClick={applyOptimalScenario} className={btnGreen}>
                    <Sparkles size={14} className="text-g-green-ink" /> Contoh optimal
                  </button>
                  <button onClick={resetGrid} className={btnNeutral}>
                    <RotateCcw size={14} /> Reset
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Staging Yard */}
                <div className={`lg:col-span-4 p-5 flex flex-col gap-4 ${card}`}>
                  <div>
                    <h4 className="text-sm font-semibold lp-ink mb-1">
                      Staging yard (dermaga)
                    </h4>
                    <p className="text-xs lp-muted">
                      Pilih kontainer untuk dimuat ke atas kapal:
                    </p>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {SAMPLE_CARGOS.map(cargo => {
                      const isSelected = selectedCargoId === cargo.id;
                      const isPlaced = Object.values(gridState).includes(cargo.id);
                      return (
                        <button
                          key={cargo.id}
                          onClick={() => setSelectedCargoId(cargo.id)}
                          className={`p-3 rounded-xl border text-left transition-colors relative ${
                            isSelected
                              ? 'border-g-green bg-g-green-bg'
                              : 'border-g-hair hover:bg-g-inset-hover'
                          } ${isPlaced ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <PortChip port={cargo.dest} />
                            <span className="text-[11px] font-plex lp-muted">{cargo.type}</span>
                            <span className="ml-auto text-xs font-plex lp-ink">{cargo.weight} t</span>
                          </div>
                          <div className="text-xs font-semibold lp-ink">
                            Pelabuhan {cargo.portName}
                          </div>
                          <div className="text-[11px] lp-muted mt-1">
                            {cargo.description}
                          </div>

                          {isPlaced && (
                            <div className={`absolute top-2 right-12 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tone.ok}`}>
                              <CheckCircle size={10} /> Termuat
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Vessel Matrix */}
                <div className={`lg:col-span-5 p-5 flex flex-col items-center ${card}`}>
                  <div className="w-full text-center mb-4">
                    <h4 className="text-sm font-semibold lp-ink mb-0.5">
                      Bay 14 · penampang
                    </h4>
                    <span className="text-[11px] lp-muted">
                      Klik slot untuk memuat atau mengeluarkan kontainer
                    </span>
                  </div>

                  <div className="w-full max-w-sm">
                    <div className="flex">
                      <TierLabels />
                      <div className="flex-1 flex flex-col gap-2 pb-2 border-x-[3px] border-b-[6px] border-g-structure rounded-b-xl px-2">
                        {renderSandboxTier('84')}
                        {renderSandboxTier('82')}
                        <HatchLine />
                        {renderSandboxTier('02')}
                      </div>
                    </div>
                    <RowLabels middle="Plug reefer" />
                  </div>

                  {feedbackMessage && (
                    <div className={`mt-4 text-xs font-medium px-3 py-2 rounded-xl border text-center w-full ${feedbackTone[feedbackMessage.type]}`}>
                      {feedbackMessage.text}
                    </div>
                  )}
                </div>

                {/* Audit Diagnostics */}
                <div className={`lg:col-span-3 p-5 flex flex-col gap-4 ${card}`}>
                  <div>
                    <h4 className="text-sm font-semibold lp-ink mb-1">
                      Audit status pelayaran
                    </h4>
                    <div className="flex items-center justify-between text-xs lp-ink2">
                      <span>Muatan termuat</span>
                      <span className="font-plex text-g-green-ink">{sandboxEvaluation.placedCount} / {SAMPLE_CARGOS.length}</span>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border ${sandboxEvaluation.restowPenalty > 0 ? tone.bad : tone.ok}`}>
                    <span className="text-[11px] lp-muted block mb-1">
                      Estimasi denda restow
                    </span>
                    <div className="text-xl font-semibold font-plex">
                      Rp {sandboxEvaluation.restowPenalty.toLocaleString('id-ID')}
                    </div>
                    <span className="text-[11px] lp-ink2 block mt-1">
                      {sandboxEvaluation.restowPenalty > 0 ? 'Dikenakan biaya crane ekstra!' : 'Bebas biaya shifting!'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-medium lp-muted block">
                      Pemeriksaan aturan
                    </span>
                    {sandboxEvaluation.issues.length === 0 ? (
                      <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${tone.idle}`}>
                        <CheckCircle size={14} className="text-g-green-ink shrink-0" />
                        Tidak ada pelanggaran terdeteksi.
                      </div>
                    ) : (
                      sandboxEvaluation.issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl border text-xs ${
                            issue.severity === 'error' || issue.severity === 'danger' ? tone.bad : tone.warn
                          }`}
                        >
                          <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                            <AlertTriangle size={12} className="shrink-0" />
                            {issue.title}
                          </div>
                          <p className="text-[11px] leading-tight opacity-90">{issue.desc}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-auto pt-3 border-t border-g-hair">
                    {sandboxEvaluation.isOptimal ? (
                      <div className="p-3 rounded-xl border border-g-green-line bg-g-green-nav text-center">
                        <span className="text-xs font-semibold text-g-green-ink flex items-center justify-center gap-1.5 mb-0.5">
                          <CheckCircle size={12} /> Layak berlayar
                        </span>
                        <span className="text-[11px] lp-ink2">
                          Siap mencetak laba maksimal!
                        </span>
                      </div>
                    ) : (
                      <div className={`p-3 rounded-xl border text-center ${tone.idle}`}>
                        <span className="text-xs font-semibold lp-ink2 block mb-0.5">
                          {sandboxEvaluation.placedCount < SAMPLE_CARGOS.length ? 'Lengkapi semua kontainer' : 'Tinjau ulang susunan'}
                        </span>
                        <span className="text-[11px]">
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
