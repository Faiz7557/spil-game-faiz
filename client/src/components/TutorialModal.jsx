import { useState } from 'react';
import { 
  X, ChevronRight, ChevronLeft, Award, Compass, ShieldAlert, 
  Package, ArrowRight, Anchor, CheckCircle2 
} from 'lucide-react';
import Sheet from './ui/Sheet';

const TUTORIAL_STEPS = [
  {
    step: 1,
    title: 'Sirkuit rotasi 4 pelabuhan utama',
    subtitle: 'Rute pelayaran kapal peti kemas PT SPIL',
    icon: Compass,
    content: (
      <div className="space-y-3 text-callout text-g-ink2 leading-relaxed">
        <p>
          Anda adalah <strong>Chief Stowage Planner</strong> kapal armada SPIL. Kapal Anda berlayar secara siklis tanpa henti melalui 4 pelabuhan:
        </p>
        <div className="flex items-center justify-between p-3 bg-g-inset border border-g-hair rounded-2xl font-medium text-g-ink text-center">
          <div className="flex-1">
            <span className="block font-plex font-medium text-callout" style={{ color: 'var(--p-sby-ink)' }}>SBY</span>
            <span className="text-caption text-g-muted">Surabaya</span>
          </div>
          <ArrowRight className="w-4 h-4 text-g-muted" />
          <div className="flex-1">
            <span className="block font-plex font-medium text-callout" style={{ color: 'var(--p-mks-ink)' }}>MKS</span>
            <span className="text-caption text-g-muted">Makassar</span>
          </div>
          <ArrowRight className="w-4 h-4 text-g-muted" />
          <div className="flex-1">
            <span className="block font-plex font-medium text-callout" style={{ color: 'var(--p-jyp-ink)' }}>JYP</span>
            <span className="text-caption text-g-muted">Jayapura</span>
          </div>
          <ArrowRight className="w-4 h-4 text-g-muted" />
          <div className="flex-1">
            <span className="block font-plex font-medium text-callout" style={{ color: 'var(--p-mdn-ink)' }}>MDN</span>
            <span className="text-caption text-g-muted">Medan</span>
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
    title: 'Penerimaan order & klasifikasi customer',
    subtitle: 'Kunci memilih kargo yang menguntungkan',
    icon: Package,
    content: (
      <div className="space-y-3 text-callout text-g-ink2 leading-relaxed">
        <p>
          Tidak semua pesanan harus diterima! Perhatikan klasifikasi pelanggan:
        </p>
        <div className="space-y-2">
          <div className="p-3 bg-g-danger-bg border border-g-danger-line rounded-xl">
            <span className="font-semibold text-g-danger-ink block text-caption">Committed customer (prioritas tinggi)</span>
            <span className="text-g-ink2">Pelanggan terikat kontrak. <strong>Wajib diambil dan dimuat</strong>. Jika ditolak atau gagal muat, Anda langsung dikenakan denda penalti penuh (DRY Rp 16 Jt / REEFER Rp 24 Jt per kontainer).</span>
          </div>
          <div className="p-3 bg-g-inset border border-g-hair rounded-xl">
            <span className="font-semibold text-g-ink block text-caption">Non-committed customer (bebas ditolak)</span>
            <span className="text-g-ink2">Pelanggan reguler. <strong>Boleh ditolak tanpa denda</strong> jika kapal Anda sudah penuh. Namun jika sudah terlanjur diklaim tetapi gagal dimuat, tetap kena denda rolling!</span>
          </div>
        </div>
      </div>
    )
  },
  {
    step: 3,
    title: 'Aturan fisika stacking & palka kapal',
    subtitle: 'Patuhi batasan fisika ruang kapal',
    icon: Anchor,
    content: (
      <div className="space-y-3 text-callout text-g-ink2 leading-relaxed">
        <p>
          Penataan kontainer di atas kapal mengikuti 3 aturan fisika penting:
        </p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 p-2.5 bg-g-inset border border-g-hair rounded-xl text-g-ink">
            <CheckCircle2 className="w-4 h-4 text-g-green-ink shrink-0 mt-0.5" />
            <span><strong>Plug Recharging REEFER:</strong> Kontainer REEFER hanya boleh diletakkan di Bay 10 atau Bay 14 yang memiliki colokan listrik pendingin.</span>
          </li>
          <li className="flex items-start gap-2 p-2.5 bg-g-inset border border-g-hair rounded-xl text-g-ink">
            <CheckCircle2 className="w-4 h-4 text-g-green-ink shrink-0 mt-0.5" />
            <span><strong>Anti Melayang (Gravity):</strong> Kontainer di Tier 84 (dek atas) wajib memiliki kontainer di Tier 82 di bawahnya sebagai penopang.</span>
          </li>
          <li className="flex items-start gap-2 p-2.5 bg-g-inset border border-g-hair rounded-xl text-g-ink">
            <CheckCircle2 className="w-4 h-4 text-g-green-ink shrink-0 mt-0.5" />
            <span><strong>Tutup Palka (Hatch Cover):</strong> Slot Tier 02 (dalam palka) akan terkunci dan tidak bisa diisi apabila Tier 82 atau 84 di atasnya sudah terisi.</span>
          </li>
        </ul>
      </div>
    )
  },
  {
    step: 4,
    title: 'Mencegah denda restow (shifting)',
    subtitle: 'Strategi penempatan next port vs later port',
    icon: ShieldAlert,
    content: (
      <div className="space-y-3 text-callout text-g-ink2 leading-relaxed">
        <div className="p-3 bg-g-warn-bg border border-g-warn-line rounded-2xl text-g-warn-ink">
          <span className="font-semibold block mb-1">Mengapa restow sangat mahal?</span>
          <span>
            Bila kontainer tujuan nanti (Later Port) ditaruh di <strong>atas</strong> kontainer tujuan berikutnya (Next Port), crane pelabuhan harus menurunkan kontainer di atasnya lalu menaikkannya kembali. Denda: <strong>Rp 6.000.000 per kontainer blocker</strong>!
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-caption">
          <div className="p-3 bg-g-inset border border-g-hair rounded-xl text-g-ink">
            <span className="font-semibold text-g-ink block">Kargo next port</span>
            <span>Simpan di Dek Atas (Tier 82/84) agar langsung dibongkar di pelabuhan berikut.</span>
          </div>
          <div className="p-3 bg-g-inset border border-g-hair rounded-xl text-g-ink">
            <span className="font-semibold text-g-ink block">Kargo later port</span>
            <span>Simpan di Palka Bawah (Tier 02) agar tidak menghalangi pelabuhan perantara.</span>
          </div>
        </div>
      </div>
    )
  },
  {
    step: 5,
    title: 'Fase pelayaran akhir & evaluasi kinerja',
    subtitle: 'Maksimalkan keuntungan bersih (cash)',
    icon: Award,
    content: (
      <div className="space-y-3 text-callout text-g-ink2 leading-relaxed">
        <p>
          Permainan berlangsung selama <strong>8 minggu pengambilan kargo</strong> + <strong>3 minggu fase pengosongan (Drain Phase)</strong> untuk membongkar seluruh muatan yang tersisa di atas kapal.
        </p>
        <div className="p-3 bg-g-green-bg border border-g-green-line rounded-xl text-g-green-ink">
          <span className="font-semibold block mb-1">Tips menang melawan bot AI</span>
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
    <Sheet onClose={onClose} labelledBy="tutorial-title">
      <div className="g-glass-modal max-w-lg w-full overflow-hidden flex flex-col transition-colors text-g-ink">
        {/* Header */}
        <div className="p-6 border-b border-g-hair flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-g-inset border border-g-hair text-g-ink2">
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-caption font-semibold text-g-muted">
                Langkah {currentStep.step} dari {TUTORIAL_STEPS.length}
              </span>
              <h3 id="tutorial-title" className="text-headline font-semibold text-g-ink">
                {currentStep.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="g-pill w-8 h-8 flex items-center justify-center text-g-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-g-inset h-1 flex">
          <div
            className="h-full bg-g-green transition-all duration-300"
            style={{ width: `${((currentStepIdx + 1) / TUTORIAL_STEPS.length) * 100}%` }}
          ></div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-2">
          <h4 className="text-caption font-semibold text-g-muted">
            {currentStep.subtitle}
          </h4>
          {currentStep.content}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 bg-g-inset border-t border-g-hair flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-callout text-g-muted hover:text-g-ink transition-colors px-2 py-1"
          >
            Lewati tutorial
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="g-pill flex items-center gap-1 px-4 py-2 text-callout font-semibold"
              >
                <ChevronLeft className="w-4 h-4" /> Kembali
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-g-green hover:bg-g-green-hover text-white font-semibold text-callout transition-colors"
            >
              {isLast ? 'Mulai bermain' : 'Lanjut'}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
