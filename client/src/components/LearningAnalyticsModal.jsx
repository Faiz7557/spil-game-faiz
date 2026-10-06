import { 
  Award, AlertTriangle, Printer, 
  X, CheckCircle, BarChart3, Lightbulb
} from 'lucide-react';
import { formatRupiah } from '../utils/gameHelpers';

export default function LearningAnalyticsModal({ 
  isOpen, 
  onClose, 
  players = [], 
  humanPlayer = null,
  totalWeeks = 11
}) {
  if (!isOpen) return null;

  const player = humanPlayer || players[0];
  const logs = player?.performanceLog || [];
  
  // Aggregate human metrics
  const totalGrossRevenue = logs.reduce((sum, w) => sum + (w.grossRevenue || 0), 0);
  const totalRestowPenalty = logs.reduce((sum, w) => sum + (w.restowPenalty || 0), 0);
  const totalRollingPenalty = logs.reduce((sum, w) => sum + (w.rollingPenalty || 0), 0);
  const totalPenalties = totalRestowPenalty + totalRollingPenalty;
  const totalRestows = logs.reduce((sum, w) => sum + (w.restowCount || 0), 0);
  const totalRolled = logs.reduce((sum, w) => sum + (w.rolledCount || 0), 0);

  // Generate automated learning insights
  const insights = [];
  if (totalRestowPenalty > totalGrossRevenue * 0.25) {
    insights.push({
      type: 'warning',
      title: 'Denda Restow Terlalu Tinggi',
      desc: `Denda restow Anda mencapai ${formatRupiah(totalRestowPenalty)} (${Math.round((totalRestowPenalty / totalGrossRevenue) * 100)}% dari pendapatan). Biasakan menata kargo Next Port di dek atas dan Later Port di palka bawah.`
    });
  } else if (totalRestows === 0) {
    insights.push({
      type: 'success',
      title: 'Strategi Stowage Sempurna!',
      desc: 'Luar biasa! Anda berhasil berlayar tanpa ada satupun restow blocker. Ini membuktikan pemahaman mendalam tentang tata letak ISO 9711.'
    });
  }

  if (totalRolled > 4) {
    insights.push({
      type: 'warning',
      title: 'Kelebihan Kapasitas (Overbooking)',
      desc: `Terdapat ${totalRolled} kontainer gagal muat. Jangan ragu menolak order Non-Committed saat kapasitas kapal di widget budget sudah mendekati 80%.`
    });
  }

  if (player?.cash >= 250000000) {
    insights.push({
      type: 'success',
      title: 'Performa Finansial Unggul',
      desc: `Total saldo akhir Anda sebesar ${formatRupiah(player?.cash)} memenuhi standar perwira logistik senior SPIL!`
    });
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 g-overlay animate-fade-in print:bg-white print:p-0 print:static">
      <div className="g-glass-modal max-w-4xl w-full overflow-hidden animate-scale-up max-h-[92vh] flex flex-col print:shadow-none print:border-none print:max-h-none print:w-full transition-colors text-g-ink">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-spil-green px-6 py-5 text-white flex items-center justify-between shrink-0 print:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md">
              <Award className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                  Laporan Hasil Belajar Resmi
                </span>
                <span className="text-[11px] text-slate-300">Durasi: {totalWeeks} Minggu</span>
              </div>
              <h3 className="text-lg font-semibold tracking-tight mt-0.5">
                Audit Analisis Pembelajaran & Skor Benchmark SPIL
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition-colors"
            >
              <Printer className="w-4 h-4" /> Cetak / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 print:overflow-visible">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide block">Saldo Akhir (Cash)</span>
              <span className="text-lg font-semibold text-emerald-950 dark:text-white mt-1 block">
                {formatRupiah(player?.cash)}
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-300 font-semibold mt-0.5 block">Modal Awal Rp 150 Jt</span>
            </div>

            <div className="p-4 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 rounded-2xl">
              <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide block">Pendapatan Kotor</span>
              <span className="text-lg font-semibold text-blue-950 dark:text-white mt-1 block">
                {formatRupiah(totalGrossRevenue)}
              </span>
              <span className="text-[11px] text-blue-600 dark:text-blue-300 font-semibold mt-0.5 block">Dari kargo ter-discharge</span>
            </div>

            <div className="p-4 bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 rounded-2xl">
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wide block">Total Denda Akumulasi</span>
              <span className="text-lg font-semibold text-rose-950 dark:text-white mt-1 block">
                {formatRupiah(totalPenalties)}
              </span>
              <span className="text-[11px] text-rose-600 dark:text-rose-300 font-semibold mt-0.5 block">Restow + Rolling</span>
            </div>

            <div className="p-4 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 rounded-2xl">
              <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide block">Rating Kapten</span>
              <span className="text-sm font-semibold text-purple-950 dark:text-white mt-1 block leading-tight">
                {player?.playerRating || 'Perwira Logistik Junior'}
              </span>
              <span className="text-[11px] text-purple-600 dark:text-purple-300 font-semibold mt-0.5 block">Berdasarkan net profit</span>
            </div>
          </div>

          {/* Benchmark Comparison Table vs Bots */}
          {players.length > 1 && (
            <div className="bg-g-inset rounded-2xl p-4 border border-g-hair">
              <h4 className="text-xs font-semibold text-g-ink uppercase tracking-wider mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-spil-green dark:text-emerald-400" />
                Perbandingan Performa: Anda vs AI Benchmark Agents
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-g-hair text-[11px] font-semibold uppercase text-g-muted">
                      <th className="py-2 px-3">Agen / Pemain</th>
                      <th className="py-2 px-3">Tipe Strategi</th>
                      <th className="py-2 px-3 text-right">Saldo Kas</th>
                      <th className="py-2 px-3 text-right">Akumulasi Denda</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-g-hair">
                    {players.map((p, idx) => {
                      const isHuman = !p.isBot;
                      return (
                        <tr key={p.id} className={isHuman ? 'bg-emerald-50/80 dark:bg-emerald-950/50 font-semibold' : 'text-g-ink '}>
                          <td className="py-2.5 px-3 flex items-center gap-2">
                            <span>{p.avatar || (isHuman ? '👤' : '🤖')}</span>
                            <span className={isHuman ? 'text-spil-green dark:text-emerald-400' : 'text-g-ink '}>{p.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-g-muted text-[11px]">
                            {isHuman ? 'Chief Stowage Planner' : p.personality}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-g-ink">
                            {formatRupiah(p.cash)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400 font-semibold">
                            {formatRupiah(p.accumulatedPenalties || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {idx === 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                                🥇 Peringkat 1
                              </span>
                            ) : (
                              <span className="text-g-muted text-[11px]">#{idx + 1}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI Pedagogical Insights */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-g-ink uppercase tracking-wider flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              Catatan Evaluasi Edukatif & Rekomendasi Solusi
            </h4>
            <div className="space-y-2.5">
              {insights.map((ins, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-2xl border flex items-start gap-3 text-xs ${
                    ins.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  {ins.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block font-semibold text-xs mb-0.5">{ins.title}</strong>
                    <span className="leading-relaxed text-g-ink">{ins.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-g-inset border-t border-g-hair flex justify-between items-center shrink-0 print:hidden">
          <span className="text-[11px] text-g-muted font-medium">
            PT. Salam Pacific Indonesia Lines — Serious Game CSPP Research
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-g-inv text-g-inv-ink hover:opacity-90 font-semibold text-xs uppercase tracking-wider shadow-sm transition-all"
          >
            Tutup Laporan
          </button>
        </div>
      </div>
    </div>
  );
}
