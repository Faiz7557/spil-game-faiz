import { formatRupiah, PORT_NAMES } from '../utils/gameHelpers';
import { Compass, AlertTriangle, ShieldCheck, ArrowRight, FileSpreadsheet, Calendar } from 'lucide-react';

export default function PerformanceModal({ isOpen, evaluation, history, onClose }) {
  if (!isOpen || !evaluation) return null;
  
  const isProfit = evaluation.netIncome >= 0;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Modal Card Overhaul - SPIL Light Theme */}
      <div className="w-full max-w-4xl bg-white border border-slate-200/90 shadow-2xl rounded-3xl p-6 md:p-8 flex flex-col gap-6 max-h-[92vh] overflow-y-auto animate-slide-up relative">
        
        {/* Branding Watermark */}
        <div className="absolute top-4 right-4 text-[7px] text-slate-350 font-black tracking-widest select-none uppercase">
          Audit Slip SPIL-LOG
        </div>

        {/* Modal Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4.5 gap-3">
          <div>
            <span className="text-[9px] text-indigo-700 font-black uppercase tracking-widest bg-indigo-50 border border-indigo-150 px-3 py-1 rounded-full">
              📜 Lembar Kinerja Mingguan
            </span>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide mt-2.5 font-display">
              Audit Operasional Port: {evaluation.port} ({PORT_NAMES[evaluation.port]})
            </h2>
          </div>
          
          <div className="text-left md:text-right shrink-0">
            <span className="text-[8px] text-slate-400 font-black block uppercase tracking-wider">
              Periode Voyage
            </span>
            <span className="text-xs font-black text-indigo-650 flex items-center gap-1 mt-0.5 justify-end uppercase">
              <Calendar className="w-3.5 h-3.5" /> Minggu {evaluation.week} Selesai
            </span>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Gross Revenue */}
          <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-xl flex flex-col justify-center relative overflow-hidden">
            <span className="text-[8.5px] text-slate-400 font-black uppercase tracking-wider block mb-1 select-none">
              Penerimaan Freight Kotor
            </span>
            <span className="text-lg font-black text-emerald-700">
              +{formatRupiah(evaluation.grossRevenue)}
            </span>
          </div>

          {/* Shifting & Rolling Penalties */}
          <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-xl flex flex-col justify-center relative overflow-hidden">
            <span className="text-[8.5px] text-slate-400 font-black uppercase tracking-wider block mb-1 select-none">
              Denda Operasional Port
            </span>
            <span className={`text-lg font-black ${evaluation.rollingPenalty + evaluation.restowPenalty > 0 ? 'text-spil-red' : 'text-slate-400'}`}>
              -{formatRupiah(evaluation.rollingPenalty + evaluation.restowPenalty)}
            </span>
          </div>

          {/* Net Weekly Income */}
          <div className={`p-4.5 rounded-xl flex flex-col justify-center border ${
            isProfit 
              ? 'bg-emerald-50/50 border-emerald-250 text-emerald-800' 
              : 'bg-rose-50/50 border-rose-250 text-spil-red'
          }`}>
            <span className="text-[8.5px] font-black uppercase tracking-wider block mb-1 select-none">
              Hasil Usaha Bersih
            </span>
            <span className="text-lg font-black">
              {isProfit ? '+' : ''}{formatRupiah(evaluation.netIncome)}
            </span>
          </div>
        </div>

        {/* Detailed Audit Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Rolled Cargo Details */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4.5">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3.5 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <AlertTriangle className="w-4 h-4 text-spil-red shrink-0" />
              Audit Kontainer Rolled ({evaluation.rolledCount} unit)
            </h3>
            
            {evaluation.rolledDetails && evaluation.rolledDetails.length > 0 ? (
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                {evaluation.rolledDetails.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                    <div>
                      <span className="font-extrabold text-slate-700 block">
                        {item.customerName}
                      </span>
                      <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                        {item.customerType} | {item.containerType} ({item.missingCount}x rolled)
                      </span>
                    </div>
                    <span className="text-spil-red font-black">
                      -{formatRupiah(item.totalPenalty)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs font-bold flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 rounded-xl bg-white/50">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                Semua kontainer termuat! Bebas denda rolling kargo.
              </div>
            )}
          </div>

          {/* 2. Shifting & Restow Details */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4.5">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3.5 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
              Audit Restow / Shifting ({evaluation.restowCount} Blocker)
            </h3>
            
            {evaluation.restowDetails && evaluation.restowDetails.length > 0 ? (
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                {evaluation.restowDetails.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                    <div>
                      <span className="font-extrabold text-slate-700 uppercase">
                        Kapal Bay {item.bay}, Row {item.row}, Tier {item.tier}
                      </span>
                      <span className="text-[8.5px] text-slate-400 font-bold uppercase block mt-0.5">
                        Kargo Later Port menghalangi kargo bongkar Next Port
                      </span>
                    </div>
                    <span className="text-spil-red font-black">
                      {formatRupiah(item.penalty || -6000000)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs font-bold flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 rounded-xl bg-white/50">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                Penyusunan bayplan optimal! Bebas denda gerakan shifting.
              </div>
            )}
          </div>
        </div>

        {/* Ledger History table */}
        {history && history.length > 0 && (
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4.5">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-650 shrink-0" />
              Riwayat Buku Besar Pelayaran (Ledger)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="text-slate-400 font-black border-b border-slate-200 pb-2 uppercase select-none text-[9px] tracking-wider">
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
                <tbody className="divide-y divide-slate-100">
                  {history.map((log, idx) => (
                    <tr key={idx} className="text-slate-600 font-bold hover:bg-slate-50/40">
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

        {/* Next Port CTA button */}
        <div className="mt-2 flex justify-end border-t border-slate-100 pt-5">
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
