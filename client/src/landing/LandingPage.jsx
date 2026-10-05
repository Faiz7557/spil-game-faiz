import { useEffect } from 'react';
import StickyNav from './StickyNav';
import HeroSection from './HeroSection';
import ContextSection from './ContextSection';
import WorkflowSection from './WorkflowSection';
import TutorialSection from './TutorialSection';
import FeaturesGrid from './FeaturesGrid';
import CTASection from './CTASection';
import GridPulse from '../components/ui/GridPulse';

/**
 * LandingPage — Caliber-inspired scrollytelling landing experience.
 *
 * Replaces the old single-screen mode selector with a progressive
 * disclosure narrative: Overview → Context → Workflow → Tutorial →
 * Features → CTA. All scroll-driven animations use the --p CSS
 * custom property injected by useScrollProgress (no heavy libraries).
 *
 * Props are forwarded from App.jsx to CTASection so the mode
 * selection logic stays in App.jsx unchanged.
 */
export default function LandingPage({
  onSelectOffline,
  onSelectOnline,
  onOpenLeaderboard,
  onOpenAuth,
  onOpenTariff,
  onOpenGlossary,
  authUser,
  onLogout,
  theme,
  toggleTheme,
}) {
  // Add smooth scroll class to html element when landing is mounted
  useEffect(() => {
    document.documentElement.classList.add('landing-active');
    // Reset scroll to top on mount (returning from game)
    window.scrollTo(0, 0);

    return () => {
      document.documentElement.classList.remove('landing-active');
    };
  }, []);

  return (
    <div className="relative">
      {/* Universal SPIL Maritime Interactive Grid Backdrop */}
      <GridPulse className="fixed inset-0 pointer-events-none -z-10" />

      {/* Sticky navigation */}
      <StickyNav theme={theme} toggleTheme={toggleTheme} />

      {/* Section 1: Hero / Overview */}
      <HeroSection />

      {/* Section 2: Context — Why this game matters */}
      <ContextSection />

      {/* Section 3: Workflow — 4-step game flow (sticky horizontal scroll) */}
      <WorkflowSection />

      {/* Section 4: Mini Tutorial — Scroll-driven bayplan onboarding */}
      <TutorialSection />

      {/* Section 5: Bento Features Grid */}
      <FeaturesGrid />

      {/* Section 6: CTA Section with animated marquee & mode selection modal */}
      <CTASection
        onSelectOffline={onSelectOffline}
        onSelectOnline={onSelectOnline}
        onOpenLeaderboard={onOpenLeaderboard}
        onOpenAuth={onOpenAuth}
        onOpenTariff={onOpenTariff}
        onOpenGlossary={onOpenGlossary}
        authUser={authUser}
        onLogout={onLogout}
      />
    </div>
  );
}
