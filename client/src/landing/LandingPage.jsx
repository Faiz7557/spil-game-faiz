import { useEffect, useState } from 'react';
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
 * Props are forwarded from App.jsx to CTASection so the mode
 * selection logic stays in App.jsx unchanged. The mode modal state
 * lives here so the hero's primary button can open it too.
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
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);

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
      <HeroSection onStart={() => setIsModeModalOpen(true)} />

      {/* Section 2: Context — Why this game matters */}
      <ContextSection />

      {/* Section 3: Workflow — 4-step game flow (horizontal card gallery) */}
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
        isModeModalOpen={isModeModalOpen}
        onOpenModeModal={() => setIsModeModalOpen(true)}
        onCloseModeModal={() => setIsModeModalOpen(false)}
      />
    </div>
  );
}
