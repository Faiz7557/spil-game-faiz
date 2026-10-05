import { AlertTriangle, Clock, MapPin } from 'lucide-react';
import { useScrollProgress } from '../hooks/useScrollProgress';

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
    <section 
      id="context"
      ref={ref}
      className="relative bg-white/60 dark:bg-slate-900/80 backdrop-blur-md rounded-t-[3rem] py-24 px-6 border-t border-slate-200/70 dark:border-white/10 shadow-xl z-20 mt-[-2rem] transition-colors"
    >
      <div className="max-w-5xl mx-auto flex flex-col items-center">
        <div className="text-xs font-black text-spil-green dark:text-emerald-400 uppercase tracking-widest mb-4">
          MENGAPA GAME INI?
        </div>
        
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-6 text-center transition-colors" style={{ fontFamily: "'Archivo', 'Outfit', sans-serif" }}>
          Industri Pelayaran Butuh Planner yang Terlatih
        </h2>
        
        <p className="text-slate-600 dark:text-slate-300 text-lg max-w-2xl mx-auto text-center leading-relaxed transition-colors">
          Kesalahan stowage kontainer menyebabkan kerugian jutaan rupiah per pelayaran. 
          Overstowage, rolled cargo, dan kesalahan berat adalah tantangan nyata di lapangan.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full">
          {/* Card 1 */}
          <article 
            className="relative flex min-h-[260px] flex-col items-center justify-center p-8 text-center overflow-hidden rounded-[20px] border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-800/90 shadow-[0_1px_3px_rgba(16,24,40,0.04),0_10px_24px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] border-t-4 border-t-spil-red dark:border-t-rose-500 hover:shadow-md transition-all duration-300"
            style={getCardStyle(0)}
          >
            <AlertTriangle className="text-spil-red dark:text-rose-400 mb-4" size={32} />
            <div className="text-4xl font-black text-spil-red dark:text-rose-400 mb-2">Rp 6 Juta</div>
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Biaya Per Restow Blocker</div>
          </article>

          {/* Card 2 */}
          <article 
            className="relative flex min-h-[260px] flex-col items-center justify-center p-8 text-center overflow-hidden rounded-[20px] border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-800/90 shadow-[0_1px_3px_rgba(16,24,40,0.04),0_10px_24px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] border-t-4 border-t-spil-red dark:border-t-rose-500 hover:shadow-md transition-all duration-300"
            style={getCardStyle(0.08)}
          >
            <Clock className="text-spil-red dark:text-rose-400 mb-4" size={32} />
            <div className="text-4xl font-black text-spil-red dark:text-rose-400 mb-2">26 Minggu</div>
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Durasi Satu Siklus Voyage</div>
          </article>

          {/* Card 3 */}
          <article 
            className="relative flex min-h-[260px] flex-col items-center justify-center p-8 text-center overflow-hidden rounded-[20px] border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-800/90 shadow-[0_1px_3px_rgba(16,24,40,0.04),0_10px_24px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] border-t-4 border-t-spil-red dark:border-t-rose-500 hover:shadow-md transition-all duration-300"
            style={getCardStyle(0.16)}
          >
            <MapPin className="text-spil-red dark:text-rose-400 mb-4" size={32} />
            <div className="text-4xl font-black text-spil-red dark:text-rose-400 mb-2">4 Rute</div>
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Sirkuit Pelabuhan Domestik</div>
          </article>
        </div>

        <p className="italic text-slate-500 dark:text-slate-400 text-center mt-12 max-w-xl transition-colors">
          Game ini melatih Anda menghadapi tantangan tersebut — mulai dari merencanakan stowage hingga mengelola pelayaran.
        </p>
      </div>
    </section>
  );
};

export default ContextSection;
