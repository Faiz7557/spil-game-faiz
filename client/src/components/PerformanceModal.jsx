import { formatRupiah, PORT_NAMES } from '../utils/gameHelpers';
import { Compass, AlertTriangle, ShieldCheck, ArrowRight, FileSpreadsheet, Calendar, Activity, ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react';

export default function PerformanceModal({ isOpen, evaluation, history, onClose }) {
  if (!isOpen || !evaluation) return null;
  
  const isProfit = evaluation.netIncome >= 0;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Modal Card Overhaul - SPIL Light & Dark Theme */}
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-2xl rounded-3xl p-6 md:p-8 flex flex-col gap-6 max-h-[92vh] overflow-y-auto animate-slide-up relative text-slate-800 dark:text-slate-100 transition-colors">
        
        {/* Branding Watermark */}
        <div className="absolute top-4 right-4 text-[7px] text-slate-400 dark:text-slate-500 font-black tracking-widest select-none uppercase">
          Audit Slip SPIL-LOG
        </div>

        {/* Modal Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 dark:border-white/10 pb-4.5 gap-3">
          <div>
            <span className="text-[9px] text-indigo-700 dark:text-indigo-300 font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-150 dark:border-indigo-800 px-3 py-1 rounded-full">
              📜 Lembar Kinerja Mingguan
            </span>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wide mt-2.5 font-display">
              Audit Operasional Port: {evaluation.port} ({PORT_NAMES[evaluation.port]})
            </h2>
          </div>
          
          <div className="text-left md:text-right shrink-0">
            <span className="text-[8px] text-slate-400 dark:text-slate-400 font-black block uppercase tracking-wider">
              Periode Voyage
            </span>
            <span className="text-xs font-black text-indigo-650 dark:text-indigo-400 flex items-center gap-1 mt-0.5 justify-end uppercase">
              <Calendar className="w-3.5 h-3.5" /> Minggu {evaluation.week} Selesai
            </span>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Gross Revenue */}
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 p-4.5 rounded-xl flex flex-col justify-center relative overflow-hidden">
            <span className="text-[8.5px] text-slate-400 dark:text-slate-400 font-black uppercase tracking-wider block mb-1 select-none">
              Penerimaan Freight Kotor
            </span>
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
              +{formatRupiah(evaluation.grossRevenue)}
            </span>
          </div>

          {/* Shifting & Rolling Penalties */}
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 p-4.5 rounded-xl flex flex-col justify-center relative overflow-hidden">
            <span className="text-[8.5px] text-slate-400 dark:text-slate-400 font-black uppercase tracking-wider block mb-1 select-none">
              Denda Operasional Port
            </span>
            <span className={`text-lg font-black ${evaluation.rollingPenalty + evaluation.restowPenalty > 0 ? 'text-spil-red dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
              -{formatRupiah(evaluation.rollingPenalty + evaluation.restowPenalty)}
            </span>
          </div>

          {/* Net Weekly Income */}
          <div className={`p-4.5 rounded-xl flex flex-col justify-center border ${
            isProfit 
              ? 'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-250 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
              : 'bg-rose-50/50 dark:bg-rose-950/40 border-rose-250 dark:border-rose-800 text-spil-red dark:text-rose-400'
          }`}>
            <span className="text-[8.5px] font-black uppercase tracking-wider block mb-1 select-none">
              Hasil Usaha Bersih
            </span>
            <span className="text-lg font-black">
              {isProfit ? '+' : ''}{formatRupiah(evaluation.netIncome)}
            </span>
          </div>
        </div>

        {/* Terminal Crane Movements Audit */}
        <div className="bg-slate-50/70 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl p-4.5">
          <div className="flex justify-between items-center border-b border-slate-200/80 dark:border-white/10 pb-2.5 mb-3">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              Audit Pergerakan Crane Terminal (Terminal Crane Moves)
            </h3>
            <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 uppercase">
              Total Crane Moves: {evaluation.totalCraneMoves || (evaluation.dischargedCount || 0) + (evaluation.loadedCount || 0) + ((evaluation.restowCount || 0) * 2)} Gerakan
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Discharge Moves */}
            <div className="bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-400 mb-1">
                <span className="text-[8px] font-black uppercase tracking-wider">1. Bongkar (Discharge)</span>
                <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-base font-black text-slate-800 dark:text-white">
                {evaluation.dischargedCount || 0} <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Gerakan</span>
              </span>
              <span className="text-[7.5px] text-slate-400 dark:text-slate-400 font-bold block mt-1 uppercase">
                Kontainer tiba di tujuan
              </span>
            </div>

            {/* Load Moves */}
            <div className="bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-400 mb-1">
                <span className="text-[8px] font-black uppercase tracking-wider">2. Muat (Load)</span>
                <ArrowUpCircle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              </div>
              <span className="text-base font-black text-slate-800 dark:text-white">
                {evaluation.loadedCount || 0} <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Gerakan</span>
              </span>
              <span className="text-[7.5px] text-slate-400 dark:text-slate-400 font-bold block mt-1 uppercase">
                Kargo baru dimuat
              </span>
            </div>

            {/* Restow Moves */}
            <div className="bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-400 mb-1">
                <span className="text-[8px] font-black uppercase tracking-wider">3. Shifting (Restow)</span>
                <RefreshCw className={`w-3.5 h-3.5 ${evaluation.restowCount > 0 ? 'text-spil-red dark:text-rose-400 animate-spin' : 'text-slate-400'}`} />
              </div>
              <span className={`text-base font-black ${evaluation.restowCount > 0 ? 'text-spil-red dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
                {evaluation.restowMovements !== undefined ? evaluation.restowMovements : (evaluation.restowCount || 0) * 2} <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Gerakan</span>
              </span>
              <span className="text-[7.5px] text-slate-400 dark:text-slate-400 font-bold block mt-1 uppercase">
                {evaluation.restowCount || 0} Blocker × 2 (Turun + Naik)
              </span>
            </div>

            {/* Terminal Total */}
            <div className="bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/40 dark:to-slate-800/90 p-3 rounded-xl border border-indigo-150 dark:border-indigo-800/60 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-indigo-500 dark:text-indigo-400 mb-1">
                <span className="text-[8px] font-black uppercase tracking-wider">Total Crane Ops</span>
                <span className="text-[9px] font-black">CRANE</span>
              </div>
              <span className="text-base font-black text-indigo-900 dark:text-indigo-200">
                {evaluation.totalCraneMoves || (evaluation.dischargedCount || 0) + (evaluation.loadedCount || 0) + ((evaluation.restowCount || 0) * 2)} <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">Moves</span>
              </span>
              <span className="text-[7.5px] text-indigo-600 dark:text-indigo-400 font-bold block mt-1 uppercase">
                Audit efisiensi pelabuhan
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Audit Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Rolled Cargo Details */}
          <div className="bg-slate-50/60 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl p-4.5">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest mb-3.5 flex items-center gap-1.5 border-b border-slate-200 dark:border-white/10 pb-2">
              <AlertTriangle className="w-4 h-4 text-spil-red dark:text-rose-400 shrink-0" />
              Audit Kontainer Rolled ({evaluation.rolledCount} unit)
            </h3>
            
            {evaluation.rolledDetails && evaluation.rolledDetails.length > 0 ? (
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                {evaluation.rolledDetails.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 shadow-sm">
                    <div>
                      <span className="font-extrabold text-slate-700 dark:text-slate-200 block">
                        {item.customerName}
                      </span>
                      <span className="text-[8.5px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                        {item.customerType === 'Regular' ? 'Non-Committed' : item.customerType} | {item.containerType} ({item.missingCount}x rolled)
                      </span>
                    </div>
                    <span className="text-spil-red dark:text-rose-400 font-black">
                      -{formatRupiah(item.totalPenalty)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 dark:text-slate-400 text-xs font-bold flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 dark:border-white/10 rounded-xl bg-white/50 dark:bg-slate-800/50">
                <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                Semua kontainer termuat! Bebas denda rolling kargo.
              </div>
            )}
          </div>

          {/* 2. Shifting & Restow Details */}
          <div className="bg-slate-50/60 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl p-4.5">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest mb-3.5 flex items-center gap-1.5 border-b border-slate-200 dark:border-white/10 pb-2">
              <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              Audit Restow / Shifting ({evaluation.restowCount} Blocker)
            </h3>
            
            {evaluation.restowDetails && evaluation.restowDetails.length > 0 ? (
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                {evaluation.restowDetails.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-white/10 shadow-sm">
                    <div>
                      <span className="font-extrabold text-slate-700 dark:text-slate-200 uppercase">
                        Kapal Bay {item.bay}, Row {item.row}, Tier {item.tier}
                      </span>
                      <span className="text-[8.5px] text-slate-400 dark:text-slate-400 font-bold uppercase block mt-0.5">
                        Kargo Later Port menghalangi kargo bongkar Next Port
                      </span>
                    </div>
                    <span className="text-spil-red dark:text-rose-400 font-black">
                      {formatRupiah(item.penalty || -6000000)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 dark:text-slate-400 text-xs font-bold flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 dark:border-white/10 rounded-xl bg-white/50 dark:bg-slate-800/50">
                <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                Penyusunan bayplan optimal! Bebas denda gerakan shifting.
              </div>
            )}
          </div>
        </div>

        {/* Ledger History table */}
        {history && history.length > 0 && (
          <div className="bg-slate-50/60 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl p-4.5">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-slate-200 dark:border-white/10 pb-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-650 dark:text-indigo-400 shrink-0" />
              Riwayat Buku Besar Pelayaran (Ledger)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="text-slate-400 dark:text-slate-400 font-black border-b border-slate-200 dark:border-white/10 pb-2 uppercase select-none text-[9px] tracking-wider">
                    <th className="py-2.5">Minggu</th>
                    <th>Pelabuhan</th>
                    <th>Unit Rolled</th>
                    <th>Denda Rolling</th>
                    <th>Blocker Restow</th>
                    <th>Denda Restow</th>
                    <th>Gross Freight</th>
                    <th className="text-right">Net Income</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {history.map((log, idx) => (
                    <tr key={idx} className="text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50/40 dark:hover:bg-slate-800/50">
                      <td className="py-3 text-slate-500 dark:text-slate-400 font-extrabold">Minggu {log.week}</td>
                      <td className="uppercase text-slate-800 dark:text-white font-black">{log.port}</td>
                      <td>{log.rolledCount}x</td>
                      <td className="text-spil-red dark:text-rose-400">{log.rollingPenalty > 0 ? formatRupiah(log.rollingPenalty) : 'Rp 0'}</td>
                      <td>{log.restowCount}x</td>
                      <td className="text-spil-red dark:text-rose-400">{log.restowPenalty > 0 ? formatRupiah(log.restowPenalty) : 'Rp 0'}</td>
                      <td className="text-emerald-700 dark:text-emerald-400">+{formatRupiah(log.grossRevenue)}</td>
                      <td className={`text-right font-black ${log.netIncome >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-spil-red dark:text-rose-400'}`}>
                        {log.netIncome >= 0 ? '+' : ''}{formatRupiah(log.netIncome)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Next Port CTA button */}
        <div className="mt-2 flex justify-end border-t border-slate-100 dark:border-white/10 pt-5">
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-spil-green hover:bg-spil-green-hover text-white font-extrabold text-xs px-6 py-3.5 rounded-xl uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-all"
          >
            Berlayar ke Tujuan Berikutnya
            <ArrowRight className="w-4 h-4 animate-bounce-horizontal" />
          </button>
        </div>
      </div>
    </div>
  );
}
