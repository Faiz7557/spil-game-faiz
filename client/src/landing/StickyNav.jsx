import { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const StickyNav = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
      
      setScrollProgress(progress);
      setIsScrolled(scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollTo = (id) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navLinks = [
    { label: 'Overview', id: 'hero' },
    { label: 'Alur', id: 'workflow' },
    { label: 'Tutorial', id: 'tutorial' },
    { label: 'Fitur', id: 'features' },
    { label: 'Mulai', id: 'cta' }
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-16 ${
        isScrolled 
          ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/10 shadow-xs' 
          : 'bg-white/40 dark:bg-slate-950/40 backdrop-blur-xs border-b border-black/[0.03] dark:border-white/5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleScrollTo('hero')}>
          <svg viewBox="0 0 100 65" className="w-8 h-8 drop-shadow-sm select-none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 10 5 Q 30 15, 50 5 T 90 5 L 85 45 Q 65 45, 45 55 T 5 45 Z" fill="#D21E20" stroke="#B5181A" strokeWidth="1.5" />
            <rect x="3" y="2" width="4" height="60" fill="#94a3b8" rx="1" />
            <circle cx="5" cy="2" r="3" fill="#64748b" />
          </svg>
          <span className="font-black tracking-widest text-lg text-slate-900 dark:text-white transition-colors">
            SPIL GAME
          </span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleScrollTo(link.id)}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-colors text-slate-700 dark:text-slate-200 hover:text-spil-green dark:hover:text-emerald-400 hover:bg-black/[0.04] dark:hover:bg-white/10"
            >
              {link.label}
            </button>
          ))}

          {/* Theme Toggle Pill Button */}
          <button
            onClick={toggleTheme}
            className="ml-3 px-3 py-1.5 rounded-full border border-slate-200/90 dark:border-white/15 bg-white dark:bg-slate-800 text-slate-700 dark:text-amber-400 hover:scale-105 active:scale-95 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            title={isDark ? "Beralih ke Mode Terang (Light Mode)" : "Beralih ke Mode Gelap (Dark Mode)"}
            aria-label="Toggle light or dark theme"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">Dark</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Light</span>
              </>
            )}
          </button>
        </div>

        {/* Mobile Nav Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-800 text-slate-700 dark:text-amber-400"
            title={isDark ? "Mode Terang" : "Mode Gelap"}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md text-slate-800 dark:text-white"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-lg border-b border-black/[0.06] dark:border-white/10">
          <div className="flex flex-col px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleScrollTo(link.id)}
                className="text-left px-4 py-3 text-slate-700 dark:text-slate-200 font-semibold hover:bg-black/[0.04] dark:hover:bg-white/10 hover:text-spil-green dark:hover:text-emerald-400 rounded-lg"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div 
        className="absolute bottom-0 left-0 h-[2px] bg-spil-green dark:bg-emerald-400 transition-all duration-150" 
        style={{ width: `${scrollProgress}%` }} 
      />
    </nav>
  );
};

export default StickyNav;
