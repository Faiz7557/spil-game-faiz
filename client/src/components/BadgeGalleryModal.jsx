import { Award, X, CheckCircle2, Lock, Trophy } from 'lucide-react';
import { BADGE_DEFINITIONS } from '../../../shared/badgeDefinitions.js';
import Sheet from './ui/Sheet';

export default function BadgeGalleryModal({ isOpen, onClose, earnedBadges = [] }) {
  if (!isOpen) return null;

  const earnedSet = new Set(earnedBadges);
  const totalBadges = BADGE_DEFINITIONS.length;
  const earnedCount = earnedSet.size;
  const progressPercent = Math.round((earnedCount / totalBadges) * 100);

  return (
    <Sheet onClose={onClose} labelledBy="badge-gallery-title">
      <div className="g-glass-modal max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] transition-colors text-g-ink">
        {/* Header */}
        <div className="px-6 py-5 border-b border-g-hair flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-g-inset border border-g-hair">
              <Award className="w-6 h-6 text-g-ink2" />
            </div>
            <div>
              <span className="text-caption font-semibold text-g-muted">
                Pencapaian kapten
              </span>
              <h3 id="badge-gallery-title" className="text-title-2 font-semibold">
                Galeri lencana
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

        {/* Progress Header Card */}
        <div className="bg-g-inset px-6 py-4 border-b border-g-hair flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-g-surface border border-g-hair flex items-center justify-center text-g-ink2">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-callout font-semibold text-g-ink block">
                Progres koleksi
              </span>
              <span className="text-caption text-g-muted">
                {earnedCount} dari {totalBadges} lencana terbuka ({progressPercent}%)
              </span>
            </div>
          </div>
          <div className="w-36 bg-g-inset-hover h-2 rounded-full overflow-hidden flex">
            <div
              className="h-full rounded-full bg-g-green transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Badge Grid Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 auto-rows-min gap-3.5">
          {BADGE_DEFINITIONS.map(badge => {
            const isEarned = earnedSet.has(badge.id);

            return (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border transition-colors duration-300 flex items-start gap-3.5 relative overflow-hidden ${
                  isEarned
                    ? 'bg-g-inset border-g-green-line'
                    : 'bg-g-inset border-g-hair opacity-60'
                }`}
              >
                {/* Badge Icon */}
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-title-2 shrink-0 border ${
                    isEarned
                      ? 'bg-g-surface border-g-hair'
                      : 'bg-g-inset border-g-hair text-g-muted'
                  }`}
                >
                  {isEarned ? badge.icon : <Lock className="w-5 h-5" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-caption text-g-muted">
                      {badge.category}
                    </span>
                    {isEarned ? (
                      <span className="flex items-center gap-1 text-caption font-semibold text-g-green-ink">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Terbuka
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-caption text-g-muted">
                        <Lock className="w-3.5 h-3.5" /> Terkunci
                      </span>
                    )}
                  </div>

                  <h4 className="text-callout font-semibold text-g-ink leading-tight">
                    {badge.title}
                  </h4>
                  <p className="text-caption text-g-muted mt-1">
                    {badge.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-g-inset border-t border-g-hair flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="g-pill px-5 py-2.5 font-semibold text-callout"
          >
            Tutup
          </button>
        </div>
      </div>
    </Sheet>
  );
}
