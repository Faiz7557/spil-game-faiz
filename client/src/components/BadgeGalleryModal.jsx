import { Award, X, CheckCircle2, Lock } from 'lucide-react';
import { BADGE_DEFINITIONS } from '../../../shared/badgeDefinitions.js';

export default function BadgeGalleryModal({ isOpen, onClose, earnedBadges = [] }) {
  if (!isOpen) return null;

  const earnedSet = new Set(earnedBadges);
  const totalBadges = BADGE_DEFINITIONS.length;
  const earnedCount = earnedSet.size;
  const progressPercent = Math.round((earnedCount / totalBadges) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 g-overlay animate-fade-in">
      <div className="g-glass-modal max-w-2xl w-full overflow-hidden animate-scale-up flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-spil-red px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md">
              <Award className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  Pencapaian Kapten SPIL
                </span>
              </div>
              <h3 className="text-base font-semibold tracking-tight mt-0.5">
                Galeri Lencana & Rekor Keunggulan
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Header Card */}
        <div className="bg-g-inset px-6 py-4 border-b border-g-hair flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-lg shadow-sm">
              🏆
            </div>
            <div>
              <span className="text-xs font-semibold text-g-ink uppercase tracking-wide block">
                Progres Koleksi Lencana
              </span>
              <span className="text-[11px] text-g-muted font-semibold">
                {earnedCount} dari {totalBadges} Penghargaan Terbuka ({progressPercent}%)
              </span>
            </div>
          </div>
          <div className="w-36 bg-g-inset-hover h-2.5 rounded-full overflow-hidden flex">
            <div
              className="bg-gradient-to-r from-amber-400 to-yellow-600 h-full rounded-full transition-all duration-500"
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
                className={`p-4 rounded-2xl border transition-all duration-300 flex items-start gap-3.5 relative overflow-hidden ${
                  isEarned
                    ? 'bg-g-inset border-amber-300/80 dark:border-amber-400/40 shadow-md ring-1 ring-amber-400/20'
                    : 'bg-g-inset border-g-hair opacity-60'
                }`}
              >
                {/* Badge Icon */}
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border ${
                    isEarned
                      ? 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/60 dark:to-amber-900/60 border-amber-300 dark:border-amber-500/40 shadow-sm animate-pulse-slow'
                      : 'bg-g-inset border-g-hair text-g-muted'
                  }`}
                >
                  {isEarned ? badge.icon : '🔒'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-g-muted">
                      {badge.category}
                    </span>
                    {isEarned ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Terbuka
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-g-muted bg-g-inset px-2 py-0.5 rounded-md">
                        <Lock className="w-3 h-3" /> Terkunci
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-semibold text-g-ink leading-tight">
                    {badge.title}
                  </h4>
                  <p className="text-[11px] text-g-muted leading-relaxed mt-1">
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
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-g-inv text-g-inv-ink hover:opacity-90 font-semibold text-xs uppercase tracking-wider shadow-sm transition-all"
          >
            Tutup Galeri
          </button>
        </div>
      </div>
    </div>
  );
}
