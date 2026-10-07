import { useEffect } from 'react';
import StickyNav from './StickyNav';
import HeroSection from './HeroSection';
import ContextSection from './ContextSection';
import WorkflowSection from './WorkflowSection';
import TutorialSection from './TutorialSection';
import FeaturesGrid from './FeaturesGrid';
import CTASection from './CTASection';

/**
 * LandingPage — progressive disclosure narrative:
 * Overview → Context → Workflow → Tutorial → Features → CTA.
 *
 * Visual language follows the Apple-inspired foundation in index.css
 * (.lp tokens: one typeface, neutral alternating grounds, 28px tiles,
 * green as the only action colour).
 *
 * Both "start" buttons open the game lobby directly; offline vs online is
 * picked inside the lobby.
 */
export default function LandingPage({
  onStart,
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
    <div className="lp relative">
      {/* Sticky navigation */}
      <StickyNav theme={theme} toggleTheme={toggleTheme} />

      {/* Section 1: Hero / Overview */}
      <HeroSection onStart={onStart} />

      {/* Section 2: Context — Why this game matters */}
      <ContextSection />

      {/* Section 3: Workflow — 4-step game flow (horizontal card gallery) */}
      <WorkflowSection />

      {/* Section 4: Mini Tutorial — Scroll-driven bayplan onboarding */}
      <TutorialSection />

      {/* Section 5: Bento Features Grid */}
      <FeaturesGrid />

      {/* Section 6: CTA Section with animated marquee */}
      <CTASection
        onStart={onStart}
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
