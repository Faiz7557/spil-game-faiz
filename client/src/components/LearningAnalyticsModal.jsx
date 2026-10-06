import {
  Award, AlertTriangle, Printer,
  X, CheckCircle, BarChart3, Lightbulb
} from 'lucide-react';
import { formatRupiah } from '../utils/gameHelpers';
import Sheet from './ui/Sheet';

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
    <Sheet onClose={onClose} labelledBy="analytics-title" printable>
      <div className="g-glass-modal max-w-4xl w-full overflow-hidden max-h-[92vh] flex flex-col print:shadow-none print:border-none print:max-h-none print:w-full transition-colors text-g-ink">
        {/* Header */}
        <div className="px-6 py-5 border-b border-g-hair flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-g-inset border border-g-hair">
              <Award className="w-6 h-6 text-g-ink2" />
            </div>
            <div>
              <span className="text-caption font-semibold text-g-muted">
                Laporan hasil belajar &middot; {totalWeeks} minggu
              </span>
              <h3 id="analytics-title" className="text-title-2 font-semibold mt-0.5">
                Analisis pembelajaran & benchmark
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="g-pill flex items-center gap-1.5 px-3.5 py-1.5 text-callout font-semibold"
            >
              <Printer className="w-4 h-4" /> Cetak / PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="g-pill w-8 h-8 flex items-center justify-center text-g-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 print:overflow-visible">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-g-inset border border-g-hair rounded-2xl">
              <span className="text-caption text-g-muted block">Saldo akhir</span>
              <span className={`text-headline font-semibold font-plex tabular-nums mt-1 block ${player?.cash < 0 ? 'text-g-danger-ink' : 'text-g-ink'}`}>
                {formatRupiah(player?.cash)}
              </span>
              <span className="text-caption text-g-muted mt-0.5 block">Modal awal Rp 150 jt</span>
            </div>

            <div className="p-4 bg-g-inset border border-g-hair rounded-2xl">
              <span className="text-caption text-g-muted block">Pendapatan kotor</span>
              <span className="text-headline font-semibold font-plex tabular-nums text-g-ink mt-1 block">
                {formatRupiah(totalGrossRevenue)}
              </span>
              <span className="text-caption text-g-muted mt-0.5 block">Dari kargo yang dibongkar</span>
            </div>

            <div className="p-4 bg-g-inset border border-g-hair rounded-2xl">
              <span className="text-caption text-g-muted block">Total denda</span>
              <span className={`text-headline font-semibold font-plex tabular-nums mt-1 block ${totalPenalties > 0 ? 'text-g-danger-ink' : 'text-g-ink'}`}>
                {formatRupiah(totalPenalties)}
              </span>
              <span className="text-caption text-g-muted mt-0.5 block">Restow + rolling</span>
            </div>

            <div className="p-4 bg-g-inset border border-g-hair rounded-2xl">
              <span className="text-caption text-g-muted block">Rating kapten</span>
              <span className="text-callout font-semibold text-g-ink mt-1 block leading-tight">
                {player?.playerRating || 'Perwira Logistik Junior'}
              </span>
              <span className="text-caption text-g-muted mt-0.5 block">Berdasarkan net profit</span>
            </div>
          </div>

          {/* Benchmark Comparison Table vs Bots */}
          {players.length > 1 && (
            <div className="bg-g-inset rounded-2xl p-4 border border-g-hair">
              <h4 className="text-callout font-semibold text-g-ink mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-g-muted" />
                Perbandingan performa: kamu vs bot AI
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-callout text-left">
                  <thead>
                    <tr className="border-b border-g-hair text-caption font-semibold text-g-muted">
                      <th className="py-2 px-3">Pemain</th>
                      <th className="py-2 px-3">Strategi</th>
                      <th className="py-2 px-3 text-right">Saldo kas</th>
                      <th className="py-2 px-3 text-right">Total denda</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-g-hair">
                    {players.map((p, idx) => {
                      const isHuman = !p.isBot;
                      return (
                        <tr key={p.id} className={isHuman ? 'bg-g-green-bg text-g-ink' : 'text-g-ink'}>
                          <td className="py-2.5 px-3 flex items-center gap-2">
                            <span>{p.avatar || (isHuman ? '👤' : '🤖')}</span>
                            <span className={isHuman ? 'font-semibold text-g-green-ink' : ''}>{p.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-g-muted">
                            {isHuman ? 'Chief Stowage Planner' : p.personality}
                          </td>
                          <td className="py-2.5 px-3 text-right font-plex tabular-nums text-g-ink">
                            {formatRupiah(p.cash)}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-plex tabular-nums ${(p.accumulatedPenalties || 0) > 0 ? 'text-g-danger-ink' : 'text-g-muted'}`}>
                            {formatRupiah(p.accumulatedPenalties || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {idx === 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-caption font-semibold bg-g-inv text-g-inv-ink">
                                Peringkat 1
                              </span>
                            ) : (
                              <span className="text-g-muted font-plex">#{idx + 1}</span>
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
            <h4 className="text-callout font-semibold text-g-ink flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-g-muted" />
              Catatan evaluasi & rekomendasi
            </h4>
            <div className="space-y-2.5">
              {insights.map((ins, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-2xl border flex items-start gap-3 text-callout ${
                    ins.type === 'success'
                      ? 'bg-g-green-bg border-g-green-line text-g-green-ink'
                      : 'bg-g-warn-bg border-g-warn-line text-g-warn-ink'
                  }`}
                >
                  {ins.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-g-green-ink shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-g-warn-ink shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block font-semibold mb-0.5">{ins.title}</strong>
                    <span className="text-g-ink">{ins.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-g-inset border-t border-g-hair flex justify-between items-center shrink-0 print:hidden">
          <span className="text-caption text-g-muted">
            PT Salam Pacific Indonesia Lines — Serious Game CSPP Research
          </span>
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
