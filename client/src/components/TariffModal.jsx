import { useState } from 'react';
import { TARIFF_TABLE, PORT_CODES_INFO, formatRupiah, PORT_NAMES } from '../utils/gameHelpers';
import { X, DollarSign, Filter, Sparkles, AlertCircle, Ship } from 'lucide-react';

const PORTS = ['SBY', 'MKS', 'JYP', 'MDN'];

export default function TariffModal({ isOpen, onClose, currentPort }) {
  const [selectedOrigin, setSelectedOrigin] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'DRY' | 'REEFER'

  if (!isOpen) return null;

  // Build flattened route list
  const routes = [];
  PORTS.forEach(orig => {
    if (selectedOrigin !== 'ALL' && orig !== selectedOrigin) return;
    PORTS.forEach(dest => {
      if (orig === dest) return;
      const rates = TARIFF_TABLE[orig]?.[dest];
      if (rates) {
        routes.push({
          origin: orig,
          destination: dest,
          dry: rates.DRY,
          reefer: rates.REEFER,
          premium: rates.REEFER - rates.DRY,
          isCurrentOrigin: orig === currentPort
        });
      }
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center g-overlay p-4 overflow-y-auto">
      <div className="g-glass-modal w-full max-w-4xl p-6 md:p-8 flex flex-col gap-5 max-h-[92vh] overflow-y-auto animate-slide-up relative text-g-ink transition-colors">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-g-hair pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full">
                PT. SPIL LOGISTICS DOCUMENT
              </span>
              {currentPort && (
                <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-150 dark:border-indigo-800 px-2.5 py-1 rounded-full">
                  Pelabuhan Saat Ini: {PORT_CODES_INFO[currentPort]?.fullLabel || currentPort}
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-g-ink uppercase tracking-wide mt-2 font-display flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Lembar Informasi Tarif Muatan PT. SPIL
            </h2>
            <p className="text-xs text-g-muted font-medium mt-1">
              Matriks Uang Tambang (Freight Rate) Resmi per Unit Kontainer untuk Jalur Surabaya, Makassar, Jayapura, Medan
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-g-muted hover:text-g-ink hover:bg-g-inset-hover transition-all"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-g-inset p-3 rounded-2xl border border-g-hair">
          {/* Origin filter tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-g-muted uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Asal:
            </span>
            <button
              onClick={() => setSelectedOrigin('ALL')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all ${
                selectedOrigin === 'ALL'
                  ? 'bg-g-inv text-g-inv-ink shadow-sm'
                  : 'bg-g-inset text-g-ink2 border border-g-hair hover:bg-g-inset-hover '
              }`}
            >
              Semua Asal
            </button>
            {PORTS.map(port => {
              const isCurrent = port === currentPort;
              const isSelected = selectedOrigin === port;
              const label = PORT_CODES_INFO[port]?.fullLabel || port;
              return (
                <button
                  key={port}
                  onClick={() => setSelectedOrigin(port)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-spil-green text-white shadow-sm'
                      : 'bg-g-inset text-g-ink2 border border-g-hair hover:bg-g-inset-hover '
                  }`}
                >
                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>}
                  {label}
                </button>
              );
            })}
          </div>

          {/* Container Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-g-muted uppercase tracking-wider mr-1">Tipe:</span>
            {['ALL', 'DRY', 'REEFER'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all ${
                  filterType === type
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-g-inset text-g-ink2 border border-g-hair hover:bg-g-inset-hover '
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Tariff Table */}
        <div className="overflow-x-auto rounded-2xl border border-g-hair shadow-sm max-h-[380px] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-g-surface sticky top-0 z-10 border-b border-g-hair">
              <tr className="text-g-muted font-semibold uppercase text-[11px] tracking-wider select-none">
                <th className="py-3 px-4">Asal (Origin)</th>
                <th className="py-3 px-4">Tujuan (Destination)</th>
                {filterType !== 'REEFER' && <th className="py-3 px-4 text-right">Tarif DRY</th>}
                {filterType !== 'DRY' && <th className="py-3 px-4 text-right">Tarif REEFER</th>}
                {filterType === 'ALL' && <th className="py-3 px-4 text-right">Selisih Premium</th>}
                <th className="py-3 px-4 text-center">Rekomendasi Stowage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-g-hair">
              {routes.map((r, idx) => {
                const originLabel = PORT_CODES_INFO[r.origin]?.fullLabel || r.origin;
                const destLabel = PORT_CODES_INFO[r.destination]?.fullLabel || r.destination;
                const isHighYield = r.dry >= 12000000 || r.reefer >= 19000000;

                return (
                  <tr
                    key={idx}
                    className={`font-medium hover:bg-g-inset-hover transition-colors ${
                      r.isCurrentOrigin ? 'bg-emerald-50/30 dark:bg-emerald-950/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-g-ink">{originLabel}</span>
                        <span className="text-[11px] text-g-muted">({PORT_NAMES[r.origin]})</span>
                        {r.isCurrentOrigin && (
                          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                            PORT ANDA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-g-ink">{destLabel}</span>
                        <span className="text-[11px] text-g-muted">({PORT_NAMES[r.destination]})</span>
                      </div>
                    </td>
                    {filterType !== 'REEFER' && (
                      <td className="py-3 px-4 text-right font-semibold text-amber-700 dark:text-amber-400">
                        {formatRupiah(r.dry)}
                      </td>
                    )}
                    {filterType !== 'DRY' && (
                      <td className="py-3 px-4 text-right font-semibold text-sky-700 dark:text-sky-400">
                        <div className="flex items-center justify-end gap-1">
                          {formatRupiah(r.reefer)}
                          {isHighYield && <Sparkles className="w-3 h-3 text-amber-500" />}
                        </div>
                      </td>
                    )}
                    {filterType === 'ALL' && (
                      <td className="py-3 px-4 text-right font-semibold text-emerald-700 dark:text-emerald-400 text-[11px]">
                        +{formatRupiah(r.premium)}
                      </td>
                    )}
                    <td className="py-3 px-4 text-center">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-g-inset border border-g-hair text-g-ink2 uppercase">
                        {r.origin === 'SBY' && r.destination === 'JYP' ? 'Long Haul (Underdeck)' : 'Direct Stacking'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Strategic Guidance Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-g-inset p-3.5 rounded-2xl border border-g-hair">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-g-ink2 leading-relaxed font-medium">
              <strong className="text-g-ink block uppercase">Kontainer Reefer Memiliki Nilai Lebih Tinggi:</strong>
              Tarif Reefer memberikan freight ~60-70% lebih tinggi dari Dry, tetapi hanya bisa diletakkan pada <strong className="text-sky-700 dark:text-sky-400">Bay 02 (12 Slot)</strong> yang memiliki fasilitas reefer plug.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Ship className="w-4 h-4 text-indigo-650 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-g-ink2 leading-relaxed font-medium">
              <strong className="text-g-ink block uppercase">Prinsip Stowage Later Port:</strong>
              Kargo dengan rute jauh (misal Jayapura/Medan) sebaiknya diletakkan di <strong className="text-indigo-700 dark:text-indigo-400">Underdeck (Tier 02)</strong> agar tidak menghalangi bongkar muat kargo Next Port.
            </div>
          </div>
        </div>

        {/* Footer Close CTA */}
        <div className="flex justify-end pt-2 border-t border-g-hair">
          <button
            onClick={onClose}
            className="bg-spil-green hover:bg-spil-green-hover text-white font-semibold text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider shadow-sm transition-all hover:scale-[1.01] active:scale-95"
          >
            Tutup Lembar Tarif
          </button>
        </div>
      </div>
    </div>
  );
}
