import { Anchor, CalendarDays, Package, ChevronDown } from 'lucide-react';
import { useScrollProgress, usePointerReactive } from '../hooks/useScrollProgress';

const HeroSection = () => {
  const { ref: scrollRef } = useScrollProgress({ mode: 'top' });
  const pointerRef = usePointerReactive();

  return (
    <section 
      id="hero" 
      ref={scrollRef}
      className="min-h-screen relative flex items-center justify-center overflow-hidden bg-transparent pt-12"
    >
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col items-center text-center mt-8" ref={pointerRef}>
        
        {/* Pointer Reactive Container */}
        <div 
          className="relative flex flex-col items-center w-full"
          style={{ transform: `perspective(1000px) rotateY(calc(var(--mx, 0) * 3deg)) rotateX(calc(var(--my, 0) * -3deg))` }}
        >
          {/* Flag SVG */}
          <div className="w-32 h-20 mb-8 transform hover:scale-105 transition-transform duration-500">
            <svg viewBox="0 0 100 65" className="w-full h-full drop-shadow-xl select-none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 10 5 Q 30 15, 50 5 T 90 5 L 85 45 Q 65 45, 45 55 T 5 45 Z" fill="#D21E20" stroke="#B5181A" strokeWidth="1.5" />
              <rect x="3" y="2" width="4" height="60" fill="#94a3b8" rx="1" />
              <circle cx="5" cy="2" r="3" fill="#64748b" />
              <text x="45" y="30" fill="#FFFFFF" fontSize="18" fontWeight="900" fontFamily="'Outfit', 'Inter', sans-serif" textAnchor="middle" transform="rotate(6, 45, 30)" letterSpacing="1">SPIL</text>
            </svg>
          </div>

          {/* Main Headline — High contrast slate-900 in light, white in dark */}
          <h1 
            className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight mb-6 transition-colors" 
            style={{ fontFamily: "'Archivo', 'Outfit', sans-serif" }}
          >
            Kuasai Logistik Laut
          </h1>
          
          {/* Subtitle — Legible slate-600 in light, slate-300 in dark */}
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-medium mb-14 transition-colors">
            Simulator stowage & pelayaran kontainer skala industri
          </p>

          {/* Floating Mockup Card — Pure white card in light mode, dark card in dark mode */}
          <div 
            className="relative w-full max-w-lg aspect-video rounded-[20px] bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-white/15 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col transition-colors"
            style={{ 
              transform: `translate3d(0, calc(var(--p, 0) * -40px), 0) rotateX(calc(var(--p, 0) * -5deg))`,
            }}
          >
            <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500/15 via-spil-red/10 to-emerald-500/15 dark:from-emerald-500/25 dark:via-spil-red/20 dark:to-emerald-500/25 rounded-[20px] blur-xs -z-10" />
            
            <div className="text-slate-800 dark:text-white text-sm font-bold uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-white/10 pb-2 text-left flex justify-between items-center">
              <span>Bay 14 — Tampak Melintang</span>
              <span className="text-[10px] font-black text-spil-green dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">ISO 9711</span>
            </div>
            
            <div className="flex-1 grid grid-cols-4 grid-rows-3 gap-2">
              {[
                { bg: '#0072B2' }, { bg: 'transparent', dashed: true }, { bg: '#E69F00' }, { bg: '#009E73' },
                { bg: '#0072B2' }, { bg: '#E69F00' }, { bg: 'transparent', dashed: true }, { bg: '#CC79A7' },
                { bg: '#009E73' }, { bg: '#CC79A7' }, { bg: '#0072B2' }, { bg: '#009E73' },
              ].map((cell, i) => (
                <div 
                  key={i}
                  className={`rounded-md transition-all duration-300 ${cell.dashed ? 'border-2 border-dashed border-slate-200 dark:border-white/15 bg-slate-50/50 dark:bg-slate-950/40' : 'shadow-xs'}`}
                  style={{ backgroundColor: cell.bg }}
                />
              ))}
            </div>
            
            {/* Stat Badges — Clean white pills with soft shadow in light, dark glass in dark */}
            <div 
              className="absolute -left-10 -top-8 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/90 dark:border-white/15 rounded-full px-4 py-2 text-sm font-bold flex items-center gap-2 shadow-[0_4px_16px_rgba(16,24,40,0.08)] dark:shadow-lg transition-colors"
              style={{ transform: `translateY(calc(var(--p, 0) * -20px))` }}
            >
              <Anchor size={16} className="text-spil-green dark:text-emerald-400" />
              4 Pelabuhan
            </div>

            <div 
              className="absolute -right-8 top-1/2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/90 dark:border-white/15 rounded-full px-4 py-2 text-sm font-bold flex items-center gap-2 shadow-[0_4px_16px_rgba(16,24,40,0.08)] dark:shadow-lg transition-colors"
              style={{ transform: `translateY(calc(var(--p, 0) * -30px))` }}
            >
              <CalendarDays size={16} className="text-spil-green dark:text-emerald-400" />
              11 Minggu Pelayaran
            </div>

            <div 
              className="absolute -left-6 -bottom-6 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/90 dark:border-white/15 rounded-full px-4 py-2 text-sm font-bold flex items-center gap-2 shadow-[0_4px_16px_rgba(16,24,40,0.08)] dark:shadow-lg transition-colors"
              style={{ transform: `translateY(calc(var(--p, 0) * -10px))` }}
            >
              <Package size={16} className="text-spil-green dark:text-emerald-400" />
              Ratusan Kontainer
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
        <ChevronDown size={24} className="animate-bounce" />
        <span className="text-sm font-medium tracking-wide">Scroll untuk menjelajahi</span>
      </div>
    </section>
  );
};

export default HeroSection;
