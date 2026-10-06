import { useState } from 'react';
import { 
  X, ChevronRight, ChevronLeft, Award, Compass, ShieldAlert, 
  Package, ArrowRight, Anchor, CheckCircle2 
} from 'lucide-react';

const TUTORIAL_STEPS = [
  {
    step: 1,
    title: 'Sirkuit Rotasi 4 Pelabuhan Utama',
    subtitle: 'Rute Pelayaran Kapal Petikemas PT. SPIL',
    icon: Compass,
    iconColor: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
    content: (
      <div className="space-y-3 text-[13px] text-g-ink2 leading-relaxed">
        <p>
          Anda adalah <strong>Chief Stowage Planner</strong> kapal armada SPIL. Kapal Anda berlayar secara siklis tanpa henti melalui 4 pelabuhan:
        </p>
        <div className="flex items-center justify-between p-3 bg-g-inset border border-g-hair rounded-2xl font-medium text-g-ink text-center">
          <div className="flex-1">
            <span className="block text-emerald-600 dark:text-emerald-400 font-semibold text-sm">SBY</span>
            <span className="text-[11px] text-g-muted">Surabaya</span>
          </div>
          <ArrowRight className="w-4 h-4 text-g-muted" />
          <div className="flex-1">
            <span className="block text-blue-600 dark:text-blue-400 font-semibold text-sm">MKS</span>
            <span className="text-[11px] text-g-muted">Makassar</span>
          </div>
          <ArrowRight className="w-4 h-4 text-g-muted" />
          <div className="flex-1">
            <span className="block text-purple-600 dark:text-purple-400 font-semibold text-sm">JYP</span>
            <span className="text-[11px] text-g-muted">Jayapura</span>
          </div>
          <ArrowRight className="w-4 h-4 text-g-muted" />
          <div className="flex-1">
            <span className="block text-amber-600 dark:text-amber-400 font-semibold text-sm">MDN</span>
            <span className="text-[11px] text-g-muted">Medan</span>
          </div>
        </div>
        <p>
          Setiap singgah di pelabuhan, kargo yang bertujuan ke pelabuhan tersebut akan dibongkar (menghasilkan pendapatan), dan order sales call baru akan ditawarkan.
        </p>
      </div>
    )
  },
  {
    step: 2,
    title: 'Penerimaan Order & Klasifikasi Customer',
    subtitle: 'Kunci Memilih Kargo yang Menguntungkan',
    icon: Package,
    iconColor: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400',
    content: (
      <div className="space-y-3 text-[13px] text-g-ink2 leading-relaxed">
        <p>
          Tidak semua pesanan harus diterima! Perhatikan klasifikasi pelanggan:
        </p>
        <div className="space-y-2">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl">
            <span className="font-semibold text-rose-800 dark:text-rose-400 block text-xs">⭐ Committed Customer (Prioritas Tinggi)</span>
            <span className="text-g-ink2">Pelanggan terikat kontrak. <strong>Wajib diambil dan dimuat</strong>. Jika ditolak atau gagal muat, Anda langsung dikenakan denda penalti penuh (DRY Rp 16 Jt / REEFER Rp 24 Jt per kontainer).</span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl">
            <span className="font-semibold text-emerald-800 dark:text-emerald-400 block text-xs">📦 Non-Committed Customer (Bebas Ditolak)</span>
            <span className="text-g-ink2">Pelanggan reguler. <strong>Boleh ditolak tanpa denda</strong> jika kapal Anda sudah penuh. Namun jika sudah terlanjur diklaim tetapi gagal dimuat, tetap kena denda rolling!</span>
          </div>
        </div>
      </div>
    )
  },
  {
    step: 3,
    title: 'Aturan Fisika Stacking & Palka Kapal',
    subtitle: 'Patuhi Batasan Fisika Ruang Kapal',
    icon: Anchor,
    iconColor: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/50 dark:text-cyan-400',
    content: (
      <div className="space-y-3 text-[13px] text-g-ink2 leading-relaxed">
        <p>
          Penataan kontainer di atas kapal mengikuti 3 aturan fisika penting:
        </p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 p-2.5 bg-g-inset border border-g-hair rounded-xl text-g-ink">
            <CheckCircle2 className="w-4 h-4 text-spil-green shrink-0 mt-0.5" />
            <span><strong>Plug Recharging REEFER:</strong> Kontainer REEFER hanya boleh diletakkan di Bay 10 atau Bay 14 yang memiliki colokan listrik pendingin.</span>
          </li>
          <li className="flex items-start gap-2 p-2.5 bg-g-inset border border-g-hair rounded-xl text-g-ink">
            <CheckCircle2 className="w-4 h-4 text-spil-green shrink-0 mt-0.5" />
            <span><strong>Anti Melayang (Gravity):</strong> Kontainer di Tier 84 (dek atas) wajib memiliki kontainer di Tier 82 di bawahnya sebagai penopang.</span>
          </li>
          <li className="flex items-start gap-2 p-2.5 bg-g-inset border border-g-hair rounded-xl text-g-ink">
            <CheckCircle2 className="w-4 h-4 text-spil-green shrink-0 mt-0.5" />
            <span><strong>Tutup Palka (Hatch Cover):</strong> Slot Tier 02 (dalam palka) akan terkunci dan tidak bisa diisi apabila Tier 82 atau 84 di atasnya sudah terisi.</span>
          </li>
        </ul>
      </div>
    )
  },
  {
    step: 4,
    title: 'Mencegah Denda Restow (Shifting)',
    subtitle: 'Strategi Penempatan Next Port vs Later Port',
    icon: ShieldAlert,
    iconColor: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400',
    content: (
      <div className="space-y-3 text-[13px] text-g-ink2 leading-relaxed">
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-amber-900 dark:text-amber-300">
          <span className="font-semibold block mb-1">⚠️ Mengapa Restow Sangat Mahal?</span>
          <span>
            Bila kontainer tujuan nanti (Later Port) ditaruh di <strong>atas</strong> kontainer tujuan berikutnya (Next Port), crane pelabuhan harus menurunkan kontainer di atasnya lalu menaikkannya kembali. Denda: <strong>Rp 6.000.000 per kontainer blocker</strong>!
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 bg-g-inset border border-g-hair rounded-xl text-g-ink">
            <span className="font-semibold text-blue-600 dark:text-blue-400 block">🔼 Next Port Kargo</span>
            <span>Simpan di Dek Atas (Tier 82/84) agar langsung dibongkar di pelabuhan berikut.</span>
          </div>
          <div className="p-3 bg-g-inset border border-g-hair rounded-xl text-g-ink">
            <span className="font-semibold text-purple-600 dark:text-purple-400 block">🔽 Later Port Kargo</span>
            <span>Simpan di Palka Bawah (Tier 02) agar tidak menghalangi pelabuhan perantara.</span>
          </div>
        </div>
      </div>
    )
  },
  {
    step: 5,
    title: 'Fase Pelayaran Akhir & Evaluasi Kinerja',
    subtitle: 'Maksimalkan Keuntungan Bersih (Cash)',
    icon: Award,
    iconColor: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-400',
    content: (
      <div className="space-y-3 text-[13px] text-g-ink2 leading-relaxed">
        <p>
          Permainan berlangsung selama <strong>8 minggu pengambilan kargo</strong> + <strong>3 minggu fase pengosongan (Drain Phase)</strong> untuk membongkar seluruh muatan yang tersisa di atas kapal.
        </p>
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-emerald-900 dark:text-emerald-300">
          <span className="font-semibold block mb-1">🏆 Tips Menang Melawan AI Benchmark:</span>
          <ul className="list-disc list-inside space-y-1 text-g-ink">
            <li>Klaim seluruh Committed order terlebih dahulu.</li>
            <li>Ambil order bernilai tinggi (tarif besar per jarak tempuh).</li>
            <li>Gunakan widget <strong>Budget & Kapasitas</strong> agar tidak overbooking.</li>
            <li>Periksa indikator <strong>Departure Clearance</strong> sebelum berlayar!</li>
          </ul>
        </div>
      </div>
    )
  }
];

export default function TutorialModal({ isOpen, onClose }) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  if (!isOpen) return null;

  const currentStep = TUTORIAL_STEPS[currentStepIdx];
  const StepIcon = currentStep.icon;
  const isFirst = currentStepIdx === 0;
  const isLast = currentStepIdx === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentStepIdx(currentStepIdx + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 g-overlay animate-fade-in">
      <div className="g-glass-modal max-w-lg w-full overflow-hidden animate-scale-up flex flex-col transition-colors">
        {/* Header */}
        <div className="p-6 border-b border-g-hair flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${currentStep.iconColor}`}>
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-spil-red bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-400 px-2 py-0.5 rounded-md border border-rose-100">
                  Langkah {currentStep.step} dari {TUTORIAL_STEPS.length}
                </span>
              </div>
              <h3 className="text-base font-semibold text-g-ink tracking-tight mt-0.5">
                {currentStep.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-g-muted hover:text-g-ink hover:bg-g-inset-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-g-inset h-1 flex">
          <div
            className="h-full bg-spil-green transition-all duration-300"
            style={{ width: `${((currentStepIdx + 1) / TUTORIAL_STEPS.length) * 100}%` }}
          ></div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-2">
          <h4 className="text-xs font-semibold text-g-muted uppercase tracking-wider">
            {currentStep.subtitle}
          </h4>
          {currentStep.content}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 bg-g-inset border-t border-g-hair flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs font-medium text-g-muted hover:text-g-ink transition-colors px-2 py-1"
          >
            Lewati Tutorial
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-g-ink2 hover:bg-g-inset-hover transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Kembali
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-spil-green hover:bg-emerald-700 text-white font-semibold text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] transition-all"
            >
              {isLast ? 'Mulai Bermain!' : 'Lanjut'}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
