import { formatRupiah } from '../utils/gameHelpers';
import { Ship, Award, RefreshCw, AlertOctagon, Trophy, ShieldAlert, FileSpreadsheet, BarChart3 } from 'lucide-react';

export default function GameOverModal({ isOpen, cash, accumulatedPenalties, playerRating, history, players, onRestart, onOpenAnalytics }) {
  if (!isOpen) return null;
  
  const isBankrupt = cash < 0;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Game Over Container - SPIL Light Theme */}
      <div className="w-full max-w-4xl bg-white border border-slate-200/90 shadow-2xl rounded-3xl p-6 md:p-8 flex flex-col gap-6 max-h-[92vh] overflow-y-auto animate-slide-up relative">
        
        {/* Branding Watermark */}
        <div className="absolute top-4 right-4 text-[7px] text-slate-350 font-black tracking-widest select-none uppercase">
          Final Audit Record SPIL-LOG
        </div>

        {/* Header Ribbon */}
        <div className="text-center flex flex-col items-center gap-3 border-b border-slate-100 pb-5">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center border shadow-md ${
            isBankrupt 
              ? 'bg-rose-50 border-rose-200 text-spil-red animate-pulse' 
              : 'bg-amber-50 border-amber-250 text-amber-500 animate-bounce'
          }`}>
            {isBankrupt ? <AlertOctagon className="w-8 h-8" /> : <Trophy className="w-8 h-8" />}
          </div>
          
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 font-display">
              {isBankrupt ? 'Operasi Pelayaran Dihentikan! Bangkrut' : 'Siklus Pelayaran Selesai! (Termasuk Drain Phase)'}
            </h1>
            <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">
              Laporan Audit Resmi Stowage & Logistik Kapal PT. SPIL
            </p>
          </div>
        </div>

        {/* Player Rank & Rating Badge */}
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-inner">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-650 shrink-0">
              <Award className="w-6 h-6 animate-pulse" />
            </div>
            <div className="text-left">
              <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">
                Penilaian Rating Perwira Stowage
              </span>
              <span className="text-base font-black text-slate-700 uppercase tracking-wide">
                {playerRating || 'Stowage Inspector'}
              </span>
            </div>
          </div>
          
          <div className="text-right self-start md:self-auto shrink-0">
            <span className="text-[8px] text-slate-400 font-black block uppercase tracking-wider mb-1">
              Hasil Evaluasi Auditor
            </span>
            <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border ${
              isBankrupt 
                ? 'bg-rose-50 text-spil-red border-rose-200' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-250'
            }`}>
              {isBankrupt ? 'Kegagalan Finansial & Operasional' : 'Operator Disetujui / Layak Jalan'}
            </span>
          </div>
        </div>

        {/* Benchmark Final Podium (Human vs AI Bots) */}
        {players && Object.values(players).length > 1 && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
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
                          ? 'bg-emerald-50/80 border-emerald-300 shadow-sm ring-2 ring-emerald-500/20' 
                          : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-500">
                          {idx === 0 ? '🥇 Juara 1' : idx === 1 ? '🥈 Juara 2' : idx === 2 ? '🥉 Juara 3' : `#${idx + 1}`}
                        </span>
                        {isUser && (
                          <span className="text-[8px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase">
                            Anda
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-black text-slate-800 truncate mb-1">
                        {p.name}
                      </span>
                      <span className={`text-sm font-black ${p.cash >= 0 ? 'text-emerald-700' : 'text-spil-red'}`}>
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
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex justify-between items-center relative overflow-hidden">
            <div>
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1">
                Saldo Modal Akhir
              </span>
              <span className={`text-2xl font-black ${isBankrupt ? 'text-spil-red' : 'text-emerald-700'}`}>
                {formatRupiah(cash)}
              </span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${
              isBankrupt ? 'bg-rose-50 border-rose-200 text-spil-red' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              <Ship className="w-5 h-5" />
            </div>
          </div>

          {/* Cumulative Shifting Penalties */}
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex justify-between items-center relative overflow-hidden">
            <div>
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1">
                Total Denda Pelayaran
              </span>
              <span className="text-2xl font-black text-spil-red">
                {formatRupiah(accumulatedPenalties)}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-spil-red shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Historical Ledger Report */}
        {history && history.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3.5 flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              Laporan Riwayat Buku Besar Pelayaran 8-Minggu
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="text-slate-400 font-black border-b border-slate-250 pb-2.5 uppercase select-none text-[9px] tracking-wider">
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
                <tbody className="divide-y divide-slate-100">
                  {history.map((log, idx) => (
                    <tr key={idx} className="text-slate-655 font-bold hover:bg-slate-50/50">
                      <td className="py-3 text-slate-500 font-extrabold">Minggu {log.week}</td>
                      <td className="uppercase text-slate-800 font-black">{log.port}</td>
                      <td>{log.rolledCount}x</td>
                      <td className="text-spil-red">{log.rollingPenalty > 0 ? formatRupiah(log.rollingPenalty) : 'Rp 0'}</td>
                      <td>{log.restowCount}x</td>
                      <td className="text-spil-red">{log.restowPenalty > 0 ? formatRupiah(log.restowPenalty) : 'Rp 0'}</td>
                      <td className="text-emerald-700">+{formatRupiah(log.grossRevenue)}</td>
                      <td className={`text-right font-black ${log.netIncome >= 0 ? 'text-emerald-700' : 'text-spil-red'}`}>
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
        <div className="mt-2 flex flex-col sm:flex-row justify-center items-center gap-3 border-t border-slate-100 pt-5">
          {onOpenAnalytics && (
            <button
              onClick={onOpenAnalytics}
              className="flex items-center justify-center gap-2 bg-slate-850 hover:bg-slate-900 text-white font-extrabold text-xs px-6 py-3.5 rounded-xl uppercase tracking-widest shadow-md hover:scale-[1.02] active:scale-95 transition-all"
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Buka Laporan Audit Pembelajaran
            </button>
          )}
          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 bg-spil-green hover:bg-spil-green-hover text-white font-extrabold text-xs px-8 py-3.5 rounded-xl uppercase tracking-widest shadow-md hover:scale-[1.02] active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            Mulai Pelayaran Baru (Lobi Utama)
          </button>
        </div>
      </div>
    </div>
  );
}
