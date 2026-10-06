import { useState } from 'react';
import { TARIFF_TABLE, PORT_CODES_INFO, formatRupiah, PORT_NAMES } from '../utils/gameHelpers';
import { X, DollarSign, Filter, Sparkles, AlertCircle, Ship } from 'lucide-react';
import Sheet from './ui/Sheet';

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
    <Sheet onClose={onClose} labelledBy="tariff-title">
      <div className="g-glass-modal w-full max-w-4xl p-6 md:p-8 flex flex-col gap-5 max-h-[92vh] overflow-y-auto relative text-g-ink transition-colors">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-g-hair pb-4">
          <div>
            <div className="flex items-center gap-2 text-caption font-semibold text-g-muted">
              <span>Dokumen tarif PT SPIL</span>
              {currentPort && (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <span className="text-g-green-ink">
                    Pelabuhan saat ini: {PORT_CODES_INFO[currentPort]?.fullLabel || currentPort}
                  </span>
                </>
              )}
            </div>
            <h2 id="tariff-title" className="text-title-2 font-semibold text-g-ink mt-0.5 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-g-ink2" />
              Lembar tarif muatan
            </h2>
            <p className="text-callout text-g-muted mt-1">
              Freight rate per unit kontainer untuk jalur Surabaya, Makassar, Jayapura, dan Medan.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="g-pill w-8 h-8 shrink-0 flex items-center justify-center text-g-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-g-inset p-3 rounded-2xl border border-g-hair">
          {/* Origin filter tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-callout text-g-muted mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Asal
            </span>
            <button
              type="button"
              onClick={() => setSelectedOrigin('ALL')}
              aria-pressed={selectedOrigin === 'ALL'}
              className={`text-callout font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                selectedOrigin === 'ALL' ? 'bg-g-inv text-g-inv-ink border-transparent' : 'bg-g-inset text-g-ink2 border border-g-hair hover:bg-g-inset-hover'
              }`}
            >
              Semua asal
            </button>
            {PORTS.map(port => {
              const isCurrent = port === currentPort;
              const isSelected = selectedOrigin === port;
              const label = PORT_CODES_INFO[port]?.fullLabel || port;
              return (
                <button
                  key={port}
                  type="button"
                  onClick={() => setSelectedOrigin(port)}
                  aria-pressed={isSelected}
                  className={`text-callout font-semibold px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
                    isSelected ? 'bg-g-inv text-g-inv-ink border-transparent' : 'bg-g-inset text-g-ink2 border border-g-hair hover:bg-g-inset-hover'
                  }`}
                >
                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-g-green" title="Pelabuhan saat ini"></span>}
                  {label}
                </button>
              );
            })}
          </div>

          {/* Container Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-callout text-g-muted mr-1">Tipe</span>
            {['ALL', 'DRY', 'REEFER'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                aria-pressed={filterType === type}
                className={`text-callout font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  filterType === type ? 'bg-g-inv text-g-inv-ink border-transparent' : 'bg-g-inset text-g-ink2 border border-g-hair hover:bg-g-inset-hover'
                }`}
              >
                {type === 'ALL' ? 'Semua' : type}
              </button>
            ))}
          </div>
        </div>

        {/* Tariff Table */}
        <div className="overflow-x-auto rounded-2xl border border-g-hair max-h-[380px] overflow-y-auto">
          <table className="w-full text-callout text-left border-collapse">
            <thead className="bg-g-surface sticky top-0 z-10 border-b border-g-hair">
              <tr className="text-g-muted font-semibold text-caption select-none">
                <th className="py-3 px-4">Asal</th>
                <th className="py-3 px-4">Tujuan</th>
                {filterType !== 'REEFER' && <th className="py-3 px-4 text-right">Tarif DRY</th>}
                {filterType !== 'DRY' && <th className="py-3 px-4 text-right">Tarif REEFER</th>}
                {filterType === 'ALL' && <th className="py-3 px-4 text-right">Selisih premium</th>}
                <th className="py-3 px-4 text-center">Rekomendasi stowage</th>
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
                    className={`hover:bg-g-inset-hover transition-colors ${r.isCurrentOrigin ? 'bg-g-green-bg' : ''}`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-g-ink">{originLabel}</span>
                        <span className="text-caption text-g-muted">({PORT_NAMES[r.origin]})</span>
                        {r.isCurrentOrigin && (
                          <span className="text-caption font-semibold text-g-green-ink whitespace-nowrap">
                            Port Anda
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-g-ink">{destLabel}</span>
                        <span className="text-caption text-g-muted">({PORT_NAMES[r.destination]})</span>
                      </div>
                    </td>
                    {filterType !== 'REEFER' && (
                      <td className="py-3 px-4 text-right font-plex tabular-nums whitespace-nowrap text-g-ink">
                        {formatRupiah(r.dry)}
                      </td>
                    )}
                    {filterType !== 'DRY' && (
                      <td className="py-3 px-4 text-right font-plex tabular-nums whitespace-nowrap text-g-ink">
                        <div className="flex items-center justify-end gap-1">
                          {formatRupiah(r.reefer)}
                          {isHighYield && <Sparkles className="w-3 h-3 text-g-green-ink" aria-label="Tarif tinggi" />}
                        </div>
                      </td>
                    )}
                    {filterType === 'ALL' && (
                      <td className="py-3 px-4 text-right font-plex tabular-nums whitespace-nowrap text-g-muted">
                        +{formatRupiah(r.premium)}
                      </td>
                    )}
                    <td className="py-3 px-4 text-center">
                      <span className="text-caption px-2 py-0.5 rounded-full bg-g-inset border border-g-hair text-g-ink2 whitespace-nowrap">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-caption bg-g-inset p-3.5 rounded-2xl border border-g-hair">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-g-muted shrink-0 mt-0.5" />
            <div className="text-callout text-g-ink2">
              <strong className="text-g-ink font-semibold block">Kontainer reefer bernilai lebih tinggi</strong>
              Tarif Reefer memberikan freight ~60-70% lebih tinggi dari Dry, tetapi hanya bisa diletakkan pada <strong className="font-semibold text-g-ink">Bay 02 (12 Slot)</strong> yang memiliki fasilitas reefer plug.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Ship className="w-4 h-4 text-g-muted shrink-0 mt-0.5" />
            <div className="text-callout text-g-ink2">
              <strong className="text-g-ink font-semibold block">Prinsip stowage later port</strong>
              Kargo dengan rute jauh (misal Jayapura/Medan) sebaiknya diletakkan di <strong className="font-semibold text-g-ink">Underdeck (Tier 02)</strong> agar tidak menghalangi bongkar muat kargo Next Port.
            </div>
          </div>
        </div>

        {/* Footer Close CTA */}
        <div className="flex justify-end pt-2 border-t border-g-hair">
          <button
            type="button"
            onClick={onClose}
            className="g-pill font-semibold text-callout px-6 py-2.5"
          >
            Tutup
          </button>
        </div>
      </div>
    </Sheet>
  );
}
