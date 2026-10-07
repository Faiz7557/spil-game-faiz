import { AlertTriangle, Clock, MapPin } from 'lucide-react';
import { useScrollProgress } from '../hooks/useScrollProgress';

const STATS = [
  { Icon: AlertTriangle, value: 'Rp 6 juta', label: 'Biaya per restow blocker', critical: true },
  { Icon: Clock, value: '26 minggu', label: 'Durasi satu siklus voyage' },
  { Icon: MapPin, value: '4 rute', label: 'Sirkuit pelabuhan domestik' }
];

const ContextSection = () => {
  const { ref, progress } = useScrollProgress();

  const getCardStyle = (offset = 0) => {
    const val = Math.max(0, Math.min(1, (progress - offset) * 3 - 0.2));
    return {
      opacity: val,
      transform: `translateY(${(1 - val) * 28}px)`,
      transition: 'opacity 0.15s ease-out, transform 0.15s ease-out'
    };
  };

  return (
    <section id="context" ref={ref} className="lp-alt lp-section px-4 sm:px-6">
      <div className="max-w-[1024px] mx-auto flex flex-col items-center text-center">
        <p className="lp-eyebrow mb-3">Mengapa game ini?</p>

        <h2 className="lp-h2 lp-ink max-w-[760px]">
          Industri pelayaran butuh planner yang terlatih.
        </h2>

        <p className="lp-lead lp-muted max-w-[680px] mt-5">
          Kesalahan stowage kontainer menyebabkan kerugian jutaan rupiah per pelayaran.
          Overstowage, rolled cargo, dan kesalahan berat adalah tantangan nyata di lapangan.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mt-12 md:mt-16 w-full">
          {STATS.map(({ Icon, value, label, critical }, i) => (
            <article
              key={label}
              className="lp-tile flex min-h-[240px] flex-col items-center justify-center p-8"
              style={getCardStyle(i * 0.08)}
            >
              <Icon
                size={28}
                strokeWidth={1.75}
                className="mb-5"
                style={{ color: critical ? '#D21E20' : 'var(--lp-muted)' }}
                aria-hidden="true"
              />
              <div className="text-[40px] leading-[1.1] font-semibold tracking-[-0.01em] lp-ink">{value}</div>
              <div className="lp-body lp-muted mt-2">{label}</div>
            </article>
          ))}
        </div>

        <p className="lp-body lp-muted mt-12 max-w-[600px]">
          Game ini melatih Anda menghadapi tantangan tersebut, mulai dari merencanakan stowage hingga mengelola pelayaran.
        </p>
      </div>
    </section>
  );
};

export default ContextSection;
