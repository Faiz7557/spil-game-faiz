import { formatRupiah, PORT_NAMES } from '../utils/gameHelpers';
import { Compass, AlertTriangle, ShieldCheck, ArrowRight, FileSpreadsheet, Calendar, Activity, ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react';
import Sheet from './ui/Sheet';

export default function PerformanceModal({ isOpen, evaluation, history, onClose }) {
  if (!isOpen || !evaluation) return null;

  const isProfit = evaluation.netIncome >= 0;

  return (
    <Sheet onClose={onClose} labelledBy="performance-title">
      {/* Weekly report; closing it continues the voyage */}
      <div className="g-glass-modal w-full max-w-4xl p-6 md:p-8 flex flex-col gap-6 max-h-[92vh] overflow-y-auto relative text-g-ink transition-colors">

        {/* Branding Watermark */}

        {/* Modal Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-g-hair pb-4.5 gap-3">
          <div>
            <span className="text-caption font-semibold text-g-muted">
              Lembar kinerja mingguan
            </span>
            <h2 id="performance-title" className="text-title-2 font-semibold text-g-ink mt-0.5">
              Audit operasional {evaluation.port} ({PORT_NAMES[evaluation.port]})
            </h2>
          </div>

          <div className="text-left md:text-right shrink-0">
            <span className="text-caption text-g-muted block">
              Periode voyage
            </span>
            <span className="text-callout font-semibold text-g-ink flex items-center gap-1 mt-0.5 md:justify-end">
              <Calendar className="w-3.5 h-3.5 text-g-muted" /> Minggu {evaluation.week} selesai
            </span>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Gross Revenue */}
          <div className="bg-g-inset border border-g-hair p-4.5 rounded-xl flex flex-col justify-center relative overflow-hidden">
            <span className="text-caption text-g-muted block mb-1 select-none">
              Penerimaan freight kotor
            </span>
            <span className="text-headline font-semibold font-plex tabular-nums text-g-ink">
              +{formatRupiah(evaluation.grossRevenue)}
            </span>
          </div>

          {/* Shifting & Rolling Penalties */}
          <div className="bg-g-inset border border-g-hair p-4.5 rounded-xl flex flex-col justify-center relative overflow-hidden">
            <span className="text-caption text-g-muted block mb-1 select-none">
              Denda operasional port
            </span>
            <span className={`text-headline font-semibold font-plex tabular-nums ${evaluation.rollingPenalty + evaluation.restowPenalty > 0 ? 'text-g-danger-ink' : 'text-g-ink'}`}>
              -{formatRupiah(evaluation.rollingPenalty + evaluation.restowPenalty)}
            </span>
          </div>

          {/* Net Weekly Income */}
          <div className="bg-g-inset border border-g-hair p-4.5 rounded-xl flex flex-col justify-center">
            <span className="text-caption text-g-muted block mb-1 select-none">
              Hasil usaha bersih
            </span>
            <span className={`text-headline font-semibold font-plex tabular-nums ${isProfit ? 'text-g-green-ink' : 'text-g-danger-ink'}`}>
              {isProfit ? '+' : ''}{formatRupiah(evaluation.netIncome)}
            </span>
          </div>
        </div>

        {/* Terminal Crane Movements Audit */}
        <div className="bg-g-inset border border-g-hair rounded-2xl p-4.5">
          <div className="flex justify-between items-center border-b border-g-hair pb-2.5 mb-3">
            <h3 className="text-callout font-semibold text-g-ink flex items-center gap-2">
              <Activity className="w-4 h-4 text-g-muted shrink-0" />
              Pergerakan crane terminal
            </h3>
            <span className="text-caption text-g-muted">
              Total: {evaluation.totalCraneMoves || (evaluation.dischargedCount || 0) + (evaluation.loadedCount || 0) + ((evaluation.restowCount || 0) * 2)} gerakan
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Discharge Moves */}
            <div className="bg-g-inset p-3 rounded-xl border border-g-hair flex flex-col justify-between">
              <div className="flex items-center justify-between text-g-muted mb-1">
                <span className="text-caption">1. Bongkar (discharge)</span>
                <ArrowDownCircle className="w-3.5 h-3.5" />
              </div>
              <span className="text-headline font-semibold font-plex tabular-nums text-g-ink">
                {evaluation.dischargedCount || 0} <span className="text-caption font-sans text-g-muted">gerakan</span>
              </span>
              <span className="text-caption text-g-muted block mt-1">
                Kontainer tiba di tujuan
              </span>
            </div>

            {/* Load Moves */}
            <div className="bg-g-inset p-3 rounded-xl border border-g-hair flex flex-col justify-between">
              <div className="flex items-center justify-between text-g-muted mb-1">
                <span className="text-caption">2. Muat (load)</span>
                <ArrowUpCircle className="w-3.5 h-3.5" />
              </div>
              <span className="text-headline font-semibold font-plex tabular-nums text-g-ink">
                {evaluation.loadedCount || 0} <span className="text-caption font-sans text-g-muted">gerakan</span>
              </span>
              <span className="text-caption text-g-muted block mt-1">
                Kargo baru dimuat
              </span>
            </div>

            {/* Restow Moves */}
            <div className="bg-g-inset p-3 rounded-xl border border-g-hair flex flex-col justify-between">
              <div className="flex items-center justify-between text-g-muted mb-1">
                <span className="text-caption">3. Shifting (restow)</span>
                <RefreshCw className={`w-3.5 h-3.5 ${evaluation.restowCount > 0 ? 'text-g-danger-ink' : ''}`} />
              </div>
              <span className={`text-headline font-semibold font-plex tabular-nums ${evaluation.restowCount > 0 ? 'text-g-danger-ink' : 'text-g-ink'}`}>
                {evaluation.restowMovements !== undefined ? evaluation.restowMovements : (evaluation.restowCount || 0) * 2} <span className="text-caption font-sans text-g-muted">gerakan</span>
              </span>
              <span className="text-caption text-g-muted block mt-1">
                {evaluation.restowCount || 0} blocker × 2 (turun + naik)
              </span>
            </div>

            {/* Terminal Total */}
            <div className="bg-g-surface p-3 rounded-xl border border-g-line flex flex-col justify-between">
              <div className="flex items-center justify-between text-g-muted mb-1">
                <span className="text-caption font-semibold text-g-ink2">Total operasi crane</span>
              </div>
              <span className="text-headline font-semibold font-plex tabular-nums text-g-ink">
                {evaluation.totalCraneMoves || (evaluation.dischargedCount || 0) + (evaluation.loadedCount || 0) + ((evaluation.restowCount || 0) * 2)} <span className="text-caption font-sans text-g-muted">gerakan</span>
              </span>
              <span className="text-caption text-g-muted block mt-1">
                Audit efisiensi pelabuhan
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Audit Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Rolled Cargo Details */}
          <div className="bg-g-inset border border-g-hair rounded-2xl p-4.5">
            <h3 className="text-callout font-semibold text-g-ink mb-3.5 flex items-center gap-1.5 border-b border-g-hair pb-2">
              <AlertTriangle className="w-4 h-4 text-g-muted shrink-0" />
              Kontainer rolled ({evaluation.rolledCount} unit)
            </h3>

            {evaluation.rolledDetails && evaluation.rolledDetails.length > 0 ? (
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                {evaluation.rolledDetails.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-callout p-3 rounded-xl bg-g-surface border border-g-hair">
                    <div>
                      <span className="font-semibold text-g-ink block">
                        {item.customerName}
                      </span>
                      <span className="text-caption text-g-muted block mt-0.5">
                        {item.customerType === 'Regular' ? 'Non-committed' : item.customerType} · {item.containerType} ({item.missingCount}x rolled)
                      </span>
                    </div>
                    <span className="text-g-danger-ink font-plex tabular-nums">
                      -{formatRupiah(item.totalPenalty)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-g-muted text-callout flex flex-col items-center justify-center gap-2 border border-dashed border-g-line rounded-xl">
                <ShieldCheck className="w-6 h-6 text-g-green-ink" />
                Semua kontainer termuat. Tidak ada denda rolling.
              </div>
            )}
          </div>

          {/* 2. Shifting & Restow Details */}
          <div className="bg-g-inset border border-g-hair rounded-2xl p-4.5">
            <h3 className="text-callout font-semibold text-g-ink mb-3.5 flex items-center gap-1.5 border-b border-g-hair pb-2">
              <Compass className="w-4 h-4 text-g-muted shrink-0" />
              Restow / shifting ({evaluation.restowCount} blocker)
            </h3>

            {evaluation.restowDetails && evaluation.restowDetails.length > 0 ? (
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                {evaluation.restowDetails.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-callout p-3 rounded-xl bg-g-surface border border-g-hair">
                    <div>
                      <span className="font-semibold text-g-ink">
                        Bay {item.bay}, row {item.row}, tier {item.tier}
                      </span>
                      <span className="text-caption text-g-muted block mt-0.5">
                        Kargo later port menghalangi kargo bongkar next port
                      </span>
                    </div>
                    <span className="text-g-danger-ink font-plex tabular-nums">
                      {formatRupiah(item.penalty || -6000000)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-g-muted text-callout flex flex-col items-center justify-center gap-2 border border-dashed border-g-line rounded-xl">
                <ShieldCheck className="w-6 h-6 text-g-green-ink" />
                Tidak ada gerakan shifting minggu ini.
              </div>
            )}
          </div>
        </div>

        {/* Ledger History table */}
        {history && history.length > 0 && (
          <div className="bg-g-inset border border-g-hair rounded-2xl p-4.5">
            <h3 className="text-callout font-semibold text-g-ink mb-3 flex items-center gap-1.5 border-b border-g-hair pb-2">
              <FileSpreadsheet className="w-4 h-4 text-g-muted shrink-0" />
              Riwayat per minggu
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-callout text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="text-g-muted font-semibold border-b border-g-hair pb-2 select-none text-caption">
                    <th className="py-2.5">Minggu</th>
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

        {/* Next Port CTA button */}
        <div className="mt-2 flex justify-end border-t border-g-hair pt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 bg-g-green hover:bg-g-green-hover text-white font-semibold text-callout px-6 py-3 rounded-full transition-colors"
          >
            Berlayar ke tujuan berikutnya
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Sheet>
  );
}
