import { formatRupiah } from '../utils/gameHelpers';
import { Ship, Award, RefreshCw, AlertOctagon, Trophy, ShieldAlert, FileSpreadsheet, BarChart3 } from 'lucide-react';
import Sheet from './ui/Sheet';

export default function GameOverModal({ isOpen, cash, accumulatedPenalties, playerRating, history, players, onRestart, onOpenAnalytics }) {
  if (!isOpen) return null;

  const isBankrupt = cash < 0;

  return (
    <Sheet labelledBy="gameover-title">
      {/* Game Over Container - blocking: the player leaves via the buttons */}
      <div className="g-glass-modal w-full max-w-4xl p-6 md:p-8 flex flex-col gap-6 max-h-[92vh] overflow-y-auto relative text-g-ink transition-colors">

        {/* Branding Watermark */}
        <div className="absolute top-4 right-5 text-caption text-g-faint select-none">
          Rekap akhir pelayaran
        </div>

        {/* Header Ribbon */}
        <div className="text-center flex flex-col items-center gap-3 border-b border-g-hair pb-5">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center border ${
            isBankrupt
              ? 'bg-g-danger-bg border-g-danger-line text-g-danger-ink'
              : 'bg-g-inset border-g-hair text-g-ink2'
          }`}>
            {isBankrupt ? <AlertOctagon className="w-8 h-8" /> : <Trophy className="w-8 h-8" />}
          </div>

          <div>
            <h1 id="gameover-title" className="text-title-2 md:text-title-1 font-semibold text-g-ink">
              {isBankrupt ? 'Operasi dihentikan: bangkrut' : 'Siklus pelayaran selesai'}
            </h1>
            <p className="text-callout text-g-muted mt-1">
              {isBankrupt ? 'Saldo kas jatuh di bawah nol.' : 'Termasuk drain phase. Berikut rekap stowage dan keuangan kapalmu.'}
            </p>
          </div>
        </div>

        {/* Player Rank & Rating Badge */}
        <div className="bg-g-inset border border-g-hair p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-g-surface border border-g-hair flex items-center justify-center text-g-ink2 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div className="text-left">
              <span className="text-caption text-g-muted block">
                Rating perwira stowage
              </span>
              <span className="text-headline font-semibold text-g-ink">
                {playerRating || 'Stowage Inspector'}
              </span>
            </div>
          </div>

          <div className="text-right self-start md:self-auto shrink-0">
            <span className="text-caption text-g-muted block mb-1">
              Hasil evaluasi
            </span>
            <span className={`text-callout font-semibold px-3 py-1.5 rounded-full border ${
              isBankrupt
                ? 'bg-g-danger-bg text-g-danger-ink border-g-danger-line'
                : 'bg-g-green-bg text-g-green-ink border-g-green-line'
            }`}>
              {isBankrupt ? 'Gagal secara finansial' : 'Layak jalan'}
            </span>
          </div>
        </div>

        {/* Benchmark Final Podium (Human vs AI Bots) */}
        {players && Object.values(players).length > 1 && (
          <div className="bg-g-inset border border-g-hair rounded-2xl p-4.5">
            <h3 className="text-callout font-semibold text-g-ink mb-3 flex items-center gap-1.5 border-b border-g-hair pb-2">
              <Trophy className="w-4 h-4 text-g-muted shrink-0" />
              Klasemen akhir (pemain vs bot AI)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.values(players)
                .sort((a, b) => b.cash - a.cash)
                .map((p, idx) => {
                  const isUser = !p.isBot;
                  return (
                    <div
                      key={p.id || idx}
                      className={`p-3 rounded-xl border flex flex-col justify-between ${
                        isUser ? 'bg-g-surface border-g-green-line' : 'bg-g-inset border-g-hair'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-caption font-semibold text-g-muted font-plex">
                          #{idx + 1}
                        </span>
                        {isUser && (
                          <span className="text-caption font-semibold bg-g-green text-white px-2 py-0.5 rounded-full">
                            Anda
                          </span>
                        )}
                      </div>
                      <span className="text-callout font-semibold text-g-ink truncate mb-1">
                        {p.name}
                      </span>
                      <span className={`text-callout font-plex tabular-nums ${p.cash >= 0 ? 'text-g-ink' : 'text-g-danger-ink'}`}>
                        {formatRupiah(p.cash)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Final Financial Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Final Cash Reserves */}
          <div className="bg-g-inset border border-g-hair p-5 rounded-xl flex justify-between items-center relative overflow-hidden">
            <div>
              <span className="text-caption text-g-muted block mb-1">
                Saldo akhir
              </span>
              <span className={`text-title-2 font-semibold font-plex tabular-nums ${isBankrupt ? 'text-g-danger-ink' : 'text-g-ink'}`}>
                {formatRupiah(cash)}
              </span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isBankrupt ? 'bg-g-danger-bg border-g-danger-line text-g-danger-ink' : 'bg-g-surface border-g-hair text-g-muted'
            }`}>
              <Ship className="w-5 h-5" />
            </div>
          </div>

          {/* Cumulative Shifting Penalties */}
          <div className="bg-g-inset border border-g-hair p-5 rounded-xl flex justify-between items-center relative overflow-hidden">
            <div>
              <span className="text-caption text-g-muted block mb-1">
                Total denda pelayaran
              </span>
              <span className={`text-title-2 font-semibold font-plex tabular-nums ${accumulatedPenalties > 0 ? 'text-g-danger-ink' : 'text-g-ink'}`}>
                {formatRupiah(accumulatedPenalties)}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-g-surface border border-g-hair flex items-center justify-center text-g-muted">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Historical Ledger Report */}
        {history && history.length > 0 && (
          <div className="bg-g-inset border border-g-hair rounded-2xl p-4.5">
            <h3 className="text-callout font-semibold text-g-ink mb-3.5 flex items-center gap-1.5 border-b border-g-hair pb-2.5">
              <FileSpreadsheet className="w-4 h-4 text-g-muted shrink-0" />
              Riwayat per minggu
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-callout text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="text-g-muted font-semibold border-b border-g-hair pb-2.5 select-none text-caption">
                    <th className="py-2">Minggu</th>
                    <th>Pelabuhan</th>
                    <th>Unit rolled</th>
                    <th>Denda rolling</th>
                    <th>Blocker restow</th>
                    <th>Denda restow</th>
                    <th>Gross freight</th>
                    <th className="text-right">Net income</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-g-hair">
                  {history.map((log, idx) => (
                    <tr key={idx} className="text-g-ink2 font-plex tabular-nums hover:bg-g-inset-hover">
                      <td className="py-3 font-sans text-g-muted">Minggu {log.week}</td>
                      <td className="text-g-ink">{log.port}</td>
                      <td>{log.rolledCount}x</td>
                      <td className={log.rollingPenalty > 0 ? 'text-g-danger-ink' : ''}>{log.rollingPenalty > 0 ? formatRupiah(log.rollingPenalty) : 'Rp 0'}</td>
                      <td>{log.restowCount}x</td>
                      <td className={log.restowPenalty > 0 ? 'text-g-danger-ink' : ''}>{log.restowPenalty > 0 ? formatRupiah(log.restowPenalty) : 'Rp 0'}</td>
                      <td>+{formatRupiah(log.grossRevenue)}</td>
                      <td className={`text-right font-medium ${log.netIncome >= 0 ? 'text-g-green-ink' : 'text-g-danger-ink'}`}>
                        {log.netIncome >= 0 ? '+' : ''}{formatRupiah(log.netIncome)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-2 flex flex-col sm:flex-row justify-center items-center gap-3 border-t border-g-hair pt-5">
          {onOpenAnalytics && (
            <button
              type="button"
              onClick={onOpenAnalytics}
              className="g-pill flex items-center justify-center gap-2 font-semibold text-callout px-6 py-3"
            >
              <BarChart3 className="w-4 h-4" />
              Buka laporan pembelajaran
            </button>
          )}
          <button
            type="button"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 bg-g-green hover:bg-g-green-hover text-white font-semibold text-callout px-8 py-3 rounded-full transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Mulai pelayaran baru
          </button>
        </div>
      </div>
    </Sheet>
  );
}
