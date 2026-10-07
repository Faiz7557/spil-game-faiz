import { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const StickyNav = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
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
    { label: 'Fitur', id: 'features' }
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-[52px] transition-[border-color] duration-300 border-b ${
        isScrolled || isMobileMenuOpen ? 'border-[var(--lp-hair)]' : 'border-transparent'
      }`}
      style={{
        backgroundColor: 'var(--lp-nav)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        backdropFilter: 'saturate(180%) blur(20px)'
      }}
    >
      <div className="max-w-[1024px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        <button
          type="button"
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => handleScrollTo('hero')}
          aria-label="SPIL Game, kembali ke atas"
        >
          <svg viewBox="0 0 100 65" className="w-7 h-7 select-none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M 10 5 Q 30 15, 50 5 T 90 5 L 85 45 Q 65 45, 45 55 T 5 45 Z" fill="#D21E20" stroke="#B5181A" strokeWidth="1.5" />
            <rect x="3" y="2" width="4" height="60" fill="#94a3b8" rx="1" />
            <circle cx="5" cy="2" r="3" fill="#64748b" />
          </svg>
          <span className="text-[15px] font-semibold tracking-[-0.01em] lp-ink">SPIL Game</span>
        </button>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => handleScrollTo(link.id)}
              className="px-3 py-1.5 lp-small lp-ink2 hover:text-[var(--lp-ink)] transition-colors cursor-pointer"
            >
              {link.label}
            </button>
          ))}

          <button
            type="button"
            onClick={toggleTheme}
            className="ml-1 w-8 h-8 rounded-full flex items-center justify-center lp-ink2 hover:bg-[var(--lp-paddle)] transition-colors cursor-pointer"
            title={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
            aria-label={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => handleScrollTo('cta')}
            className="lp-btn lp-btn-primary lp-btn-sm ml-2"
          >
            Mulai
          </button>
        </div>

        {/* Mobile Nav Toggle */}
        <div className="md:hidden flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full flex items-center justify-center lp-ink2"
            aria-label={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-9 h-9 rounded-full flex items-center justify-center lp-ink"
            aria-label={isMobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden absolute top-[52px] left-0 right-0 border-b border-[var(--lp-hair)]"
          style={{ backgroundColor: 'var(--lp-page)' }}
        >
          <div className="flex flex-col px-4 py-3">
            {[...navLinks, { label: 'Mulai', id: 'cta' }].map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => handleScrollTo(link.id)}
                className="text-left px-2 py-3 text-[21px] font-semibold tracking-[-0.006em] lp-ink border-b border-[var(--lp-hair)] last:border-b-0"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default StickyNav;
