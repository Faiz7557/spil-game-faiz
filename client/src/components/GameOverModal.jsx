import { formatRupiah } from '../utils/gameHelpers';
import { Ship, Award, RefreshCw, AlertOctagon, Trophy, ShieldAlert, FileSpreadsheet, BarChart3 } from 'lucide-react';

export default function GameOverModal({ isOpen, cash, accumulatedPenalties, playerRating, history, players, onRestart, onOpenAnalytics }) {
  if (!isOpen) return null;
  
  const isBankrupt = cash < 0;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center g-overlay p-4 overflow-y-auto">
      {/* Game Over Container - SPIL Light & Dark Theme */}
      <div className="g-glass-modal w-full max-w-4xl p-6 md:p-8 flex flex-col gap-6 max-h-[92vh] overflow-y-auto animate-slide-up relative text-g-ink transition-colors">
        
        {/* Branding Watermark */}
        <div className="absolute top-4 right-4 text-[11px] text-g-muted font-semibold tracking-wider select-none uppercase">
          Final Audit Record SPIL-LOG
        </div>

        {/* Header Ribbon */}
        <div className="text-center flex flex-col items-center gap-3 border-b border-g-hair pb-5">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center border shadow-md ${
            isBankrupt 
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-spil-red dark:text-rose-400 animate-pulse' 
              : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-500 dark:text-amber-400 animate-bounce'
          }`}>
            {isBankrupt ? <AlertOctagon className="w-8 h-8" /> : <Trophy className="w-8 h-8" />}
          </div>
          
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-g-ink font-display">
              {isBankrupt ? 'Operasi Pelayaran Dihentikan! Bangkrut' : 'Siklus Pelayaran Selesai! (Termasuk Drain Phase)'}
            </h1>
            <p className="text-[11px] text-g-muted font-semibold uppercase mt-1 tracking-wider">
              Laporan Audit Resmi Stowage & Logistik Kapal PT. SPIL
            </p>
          </div>
        </div>

        {/* Player Rank & Rating Badge */}
        <div className="bg-g-inset border border-g-hair p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-inner">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-150 dark:border-indigo-800 flex items-center justify-center text-indigo-650 dark:text-indigo-300 shrink-0">
              <Award className="w-6 h-6 animate-pulse" />
            </div>
            <div className="text-left">
              <span className="text-[11px] text-g-muted font-semibold uppercase tracking-wider block">
                Penilaian Rating Perwira Stowage
              </span>
              <span className="text-base font-semibold text-g-ink uppercase tracking-wide">
                {playerRating || 'Stowage Inspector'}
              </span>
            </div>
          </div>
          
          <div className="text-right self-start md:self-auto shrink-0">
            <span className="text-[11px] text-g-muted font-semibold block uppercase tracking-wider mb-1">
              Hasil Evaluasi Auditor
            </span>
            <span className={`text-[11px] font-semibold uppercase px-3 py-1.5 rounded-lg border ${
              isBankrupt 
                ? 'bg-rose-50 dark:bg-rose-950/60 text-spil-red dark:text-rose-300 border-rose-200 dark:border-rose-800' 
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            }`}>
              {isBankrupt ? 'Kegagalan Finansial & Operasional' : 'Operator Disetujui / Layak Jalan'}
            </span>
          </div>
        </div>

        {/* Benchmark Final Podium (Human vs AI Bots) */}
        {players && Object.values(players).length > 1 && (
          <div className="bg-g-inset border border-g-hair rounded-2xl p-4.5">
            <h3 className="text-xs font-semibold text-g-ink uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-g-hair pb-2">
              <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
              Klasemen Akhir Pelayaran 8-Minggu (Human vs AI Benchmark)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.values(players)
                .sort((a, b) => b.cash - a.cash)
                .map((p, idx) => {
                  const isUser = !p.isBot;
                  return (
                    <div 
                      key={p.id || idx}
                      className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                        isUser 
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-sm ring-2 ring-emerald-500/20' 
                          : 'bg-g-inset border-g-hair shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold uppercase text-g-muted">
                          {idx === 0 ? '🥇 Juara 1' : idx === 1 ? '🥈 Juara 2' : idx === 2 ? '🥉 Juara 3' : `#${idx + 1}`}
                        </span>
                        {isUser && (
                          <span className="text-[11px] font-semibold bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase">
                            Anda
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-g-ink truncate mb-1">
                        {p.name}
                      </span>
                      <span className={`text-sm font-semibold ${p.cash >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-spil-red dark:text-rose-400'}`}>
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
              <span className="text-[11px] text-g-muted font-semibold uppercase tracking-wider block mb-1">
                Saldo Modal Akhir
              </span>
              <span className={`text-2xl font-semibold ${isBankrupt ? 'text-spil-red dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {formatRupiah(cash)}
              </span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${
              isBankrupt ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-spil-red dark:text-rose-300' : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
            }`}>
              <Ship className="w-5 h-5" />
            </div>
          </div>

          {/* Cumulative Shifting Penalties */}
          <div className="bg-g-inset border border-g-hair p-5 rounded-xl flex justify-between items-center relative overflow-hidden">
            <div>
              <span className="text-[11px] text-g-muted font-semibold uppercase tracking-wider block mb-1">
                Total Denda Pelayaran
              </span>
              <span className="text-2xl font-semibold text-spil-red dark:text-rose-400">
                {formatRupiah(accumulatedPenalties)}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-spil-red dark:text-rose-300 shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Historical Ledger Report */}
        {history && history.length > 0 && (
          <div className="bg-g-inset border border-g-hair rounded-2xl p-4.5">
            <h3 className="text-xs font-semibold text-g-ink uppercase tracking-wider mb-3.5 flex items-center gap-1.5 border-b border-g-hair pb-2.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              Laporan Riwayat Buku Besar Pelayaran 8-Minggu
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="text-g-muted font-semibold border-b border-g-hair pb-2.5 uppercase select-none text-[11px] tracking-wider">
                    <th className="py-2">Minggu</th>
                    <th>Pelabuhan</th>
                    <th>Unit Rolled</th>
                    <th>Denda Rolling</th>
                    <th>Blocker Restow</th>
                    <th>Denda Restow</th>
                    <th>Gross Freight</th>
                    <th className="text-right">Net Income</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-g-hair">
                  {history.map((log, idx) => (
                    <tr key={idx} className="text-g-ink2 font-medium hover:bg-g-inset-hover">
                      <td className="py-3 text-g-muted font-semibold">Minggu {log.week}</td>
                      <td className="uppercase text-g-ink font-semibold">{log.port}</td>
                      <td>{log.rolledCount}x</td>
                      <td className="text-spil-red dark:text-rose-400">{log.rollingPenalty > 0 ? formatRupiah(log.rollingPenalty) : 'Rp 0'}</td>
                      <td>{log.restowCount}x</td>
                      <td className="text-spil-red dark:text-rose-400">{log.restowPenalty > 0 ? formatRupiah(log.restowPenalty) : 'Rp 0'}</td>
                      <td className="text-emerald-700 dark:text-emerald-400">+{formatRupiah(log.grossRevenue)}</td>
                      <td className={`text-right font-semibold ${log.netIncome >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-spil-red dark:text-rose-400'}`}>
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
              onClick={onOpenAnalytics}
              className="flex items-center justify-center gap-2 bg-g-inv text-g-inv-ink hover:opacity-90 font-semibold text-xs px-6 py-3.5 rounded-xl uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-all"
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Buka Laporan Audit Pembelajaran
            </button>
          )}
          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 bg-spil-green hover:bg-spil-green-hover text-white font-semibold text-xs px-8 py-3.5 rounded-xl uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            Mulai Pelayaran Baru (Lobi Utama)
          </button>
        </div>
      </div>
    </div>
  );
}
