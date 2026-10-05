import { Package, LayoutGrid, Ship, Trophy } from 'lucide-react';
import { useScrollProgress } from '../hooks/useScrollProgress';

export default function WorkflowSection() {
  const { ref, progress } = useScrollProgress({ mode: 'default' });

  // Calculate active dot (0 to 3)
  const activeDot = Math.min(
    3,
    Math.max(0, Math.floor(progress * 4))
  );

  return (
    <section 
      id="workflow" 
      ref={ref} 
      className="h-[300vh] bg-slate-100/70 dark:bg-[#06180E] border-y border-slate-200/80 dark:border-white/10 relative transition-colors"
    >
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center">
        
        {/* Header */}
        <div className="pt-20 px-8 md:px-16 lg:px-24 w-full flex-shrink-0 z-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-spil-green dark:text-emerald-400 mb-2">
            ALUR PERMAINAN
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white font-display transition-colors">
            4 Langkah Menguasai Logistik
          </h2>
        </div>

        {/* Horizontal Rail Container */}
        <div className="flex-grow flex items-center relative z-0 mt-8">
          <div 
            className="flex flex-row gap-8 px-8 md:px-16 lg:px-24"
            style={{
              transform: `translateX(calc(-${progress * 75}%))`,
              transition: 'transform 0.1s ease-out'
            }}
          >
            {/* Step 1 */}
            <div className="w-[80vw] md:w-[50vw] flex-shrink-0 rounded-[20px] bg-white dark:bg-slate-900/95 border border-slate-200/90 dark:border-white/10 shadow-[0_4px_24px_rgba(16,24,40,0.05)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.4)] p-8 md:p-12 flex flex-col gap-6 transition-colors">
              <div className="w-12 h-12 rounded-full bg-spil-green text-white font-black text-lg flex items-center justify-center shadow-md">
                1
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <Package className="w-6 h-6 text-spil-green dark:text-emerald-400" />
                  Terima Cargo
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-sm mt-3">
                  Setiap minggu, pesanan kargo baru masuk dari berbagai rute pelabuhan. Pilih mana yang menguntungkan — tolak yang berisiko.
                </p>
              </div>
              <div className="mt-auto h-32 flex items-end relative">
                {/* Visual: 3 small colored cards stacked/fanned */}
                <div className="absolute left-4 bottom-4 w-32 h-20 rounded-xl bg-[#0072B2] text-white flex items-center justify-center font-bold shadow-lg border border-white/20" style={{ transform: 'rotate(-5deg) translateY(10px) translateX(-10px)', zIndex: 1 }}>SBY</div>
                <div className="absolute left-10 bottom-4 w-32 h-20 rounded-xl bg-[#E69F00] text-white flex items-center justify-center font-bold shadow-lg border border-white/20" style={{ transform: 'rotate(0deg)', zIndex: 2 }}>MKS</div>
                <div className="absolute left-16 bottom-4 w-32 h-20 rounded-xl bg-[#009E73] text-white flex items-center justify-center font-bold shadow-lg border border-white/20" style={{ transform: 'rotate(5deg) translateY(-5px) translateX(10px)', zIndex: 3 }}>JYP</div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="w-[80vw] md:w-[50vw] flex-shrink-0 rounded-[20px] bg-white dark:bg-slate-900/95 border border-slate-200/90 dark:border-white/10 shadow-[0_4px_24px_rgba(16,24,40,0.05)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.4)] p-8 md:p-12 flex flex-col gap-6 transition-colors">
              <div className="w-12 h-12 rounded-full bg-spil-green text-white font-black text-lg flex items-center justify-center shadow-md">
                2
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <LayoutGrid className="w-6 h-6 text-spil-green dark:text-emerald-400" />
                  Susun di Bayplan
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-sm mt-3">
                  Letakkan kontainer ke dalam grid Bay-Row-Tier sesuai standar ISO 9711. Perhatikan aturan berat dan tipe kontainer.
                </p>
              </div>
              <div className="mt-auto flex justify-center">
                {/* Visual: 3x3 mini grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="w-10 h-10 border border-dashed border-slate-300 dark:border-white/30 rounded bg-slate-50/50 dark:bg-slate-950/40"></div>
                  <div className="w-10 h-10 border border-dashed border-slate-300 dark:border-white/30 rounded bg-slate-50/50 dark:bg-slate-950/40"></div>
                  <div className="w-10 h-10 bg-sky-500 rounded border border-white/20 shadow-xs"></div>
                  
                  <div className="w-10 h-10 bg-amber-500 rounded border border-white/20 shadow-xs"></div>
                  <div className="w-10 h-10 border border-dashed border-slate-300 dark:border-white/30 rounded bg-slate-50/50 dark:bg-slate-950/40"></div>
                  <div className="w-10 h-10 bg-sky-600 rounded border border-white/20 shadow-xs"></div>
                  
                  <div className="w-10 h-10 bg-emerald-500 rounded border border-white/20 shadow-xs"></div>
                  <div className="w-10 h-10 bg-amber-600 rounded border border-white/20 shadow-xs"></div>
                  <div className="w-10 h-10 bg-sky-700 rounded border border-white/20 shadow-xs"></div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="w-[80vw] md:w-[50vw] flex-shrink-0 rounded-[20px] bg-white dark:bg-slate-900/95 border border-slate-200/90 dark:border-white/10 shadow-[0_4px_24px_rgba(16,24,40,0.05)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.4)] p-8 md:p-12 flex flex-col gap-6 transition-colors">
              <div className="w-12 h-12 rounded-full bg-spil-green text-white font-black text-lg flex items-center justify-center shadow-md">
                3
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <Ship className="w-6 h-6 text-spil-green dark:text-emerald-400" />
                  Berlayar
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-sm mt-3">
                  Kirim kapal berlayar ke pelabuhan berikutnya. Kargo diturunkan, biaya restow dihitung, dan pendapatan freight masuk.
                </p>
              </div>
              <div className="mt-auto">
                {/* Visual: Ship Silhouette */}
                <svg viewBox="0 0 200 60" className="w-full h-16 text-slate-300 dark:text-white/30">
                  <line x1="10" y1="35" x2="190" y2="35" stroke="currentColor" strokeDasharray="6 4" strokeWidth="2" />
                  <polygon points="150,20 190,35 150,50 120,50 100,40 100,30 120,20" fill="#2E7D4E" stroke="white" strokeWidth="1" opacity="0.9" />
                </svg>
              </div>
            </div>

            {/* Step 4 */}
            <div className="w-[80vw] md:w-[50vw] flex-shrink-0 rounded-[20px] bg-white dark:bg-slate-900/95 border border-slate-200/90 dark:border-white/10 shadow-[0_4px_24px_rgba(16,24,40,0.05)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.4)] p-8 md:p-12 flex flex-col gap-6 transition-colors">
              <div className="w-12 h-12 rounded-full bg-spil-green text-white font-black text-lg flex items-center justify-center shadow-md">
                4
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-spil-green dark:text-emerald-400" />
                  Tiba & Nilai
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-sm mt-3">
                  Di akhir 11 minggu pelayaran, lihat performa Anda: saldo akhir, efisiensi stowage, dan peringkat kapten.
                </p>
              </div>
              <div className="mt-auto flex justify-center">
                {/* Visual: Score Card Mockup */}
                <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/15 rounded-xl p-4 min-w-[200px] text-center shadow-xs">
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Peringkat Kapten</p>
                  <p className="text-2xl mb-2">⭐⭐⭐⭐</p>
                  <p className="text-slate-900 dark:text-white font-black text-lg">VP Logistics</p>
                  <p className="text-spil-green dark:text-emerald-400 font-bold">Rp 847.000.000</p>
                </div>
              </div>
            </div>

            {/* Empty space to ensure the last card can scroll into full view */}
            <div className="w-[10vw] flex-shrink-0" />
          </div>
        </div>

        {/* Step Indicator Dots */}
        <div className="pb-12 pt-8 flex justify-center items-center gap-3 w-full z-10">
          {[0, 1, 2, 3].map((index) => (
            <div 
              key={index}
              className={`rounded-full transition-all duration-300 ${
                activeDot === index 
                  ? 'w-3 h-3 bg-spil-green dark:bg-white scale-125' 
                  : 'w-2 h-2 bg-slate-300 dark:bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
