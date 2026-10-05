import { Award, X, CheckCircle2, Lock } from 'lucide-react';
import { BADGE_DEFINITIONS } from '../../../shared/badgeDefinitions.js';

export default function BadgeGalleryModal({ isOpen, onClose, earnedBadges = [] }) {
  if (!isOpen) return null;

  const earnedSet = new Set(earnedBadges);
  const totalBadges = BADGE_DEFINITIONS.length;
  const earnedCount = earnedSet.size;
  const progressPercent = Math.round((earnedCount / totalBadges) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-white/10 animate-scale-up flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-spil-red px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md">
              <Award className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  Pencapaian Kapten SPIL
                </span>
              </div>
              <h3 className="text-base font-black tracking-tight mt-0.5">
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
        <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-lg shadow-sm">
              🏆
            </div>
            <div>
              <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wide block">
                Progres Koleksi Lencana
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                {earnedCount} dari {totalBadges} Penghargaan Terbuka ({progressPercent}%)
              </span>
            </div>
          </div>
          <div className="w-36 bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
            <div
              className="bg-gradient-to-r from-amber-400 to-yellow-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Badge Grid Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {BADGE_DEFINITIONS.map(badge => {
            const isEarned = earnedSet.has(badge.id);

            return (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border transition-all duration-300 flex items-start gap-3.5 relative overflow-hidden ${
                  isEarned
                    ? 'bg-white dark:bg-slate-800/90 border-amber-300/80 dark:border-amber-400/40 shadow-md ring-1 ring-amber-400/20'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-white/5 opacity-60'
                }`}
              >
                {/* Badge Icon */}
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border ${
                    isEarned
                      ? 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/60 dark:to-amber-900/60 border-amber-300 dark:border-amber-500/40 shadow-sm animate-pulse-slow'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-400'
                  }`}
                >
                  {isEarned ? badge.icon : '🔒'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">
                      {badge.category}
                    </span>
                    {isEarned ? (
                      <span className="flex items-center gap-1 text-[9px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Terbuka
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        <Lock className="w-3 h-3" /> Terkunci
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-black text-slate-800 dark:text-white leading-tight">
                    {badge.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                    {badge.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-white/10 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all"
          >
            Tutup Galeri
          </button>
        </div>
      </div>
    </div>
  );
}
