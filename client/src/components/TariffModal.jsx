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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 md:p-8 flex flex-col gap-5 max-h-[92vh] overflow-y-auto animate-slide-up relative">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-emerald-800 font-black uppercase tracking-widest bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                PT. SPIL LOGISTICS DOCUMENT
              </span>
              {currentPort && (
                <span className="text-[9px] text-indigo-700 font-black uppercase tracking-widest bg-indigo-50 border border-indigo-150 px-2.5 py-1 rounded-full">
                  Pelabuhan Saat Ini: {PORT_CODES_INFO[currentPort]?.fullLabel || currentPort}
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide mt-2 font-display flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Lembar Informasi Tarif Muatan PT. SPIL
            </h2>
            <p className="text-xs text-slate-500 font-bold mt-1">
              Matriks Uang Tambang (Freight Rate) Resmi per Unit Kontainer untuk Jalur Surabaya, Makassar, Jayapura, Medan
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
          {/* Origin filter tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Asal:
            </span>
            <button
              onClick={() => setSelectedOrigin('ALL')}
              className={`text-xs font-black px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all ${
                selectedOrigin === 'ALL'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
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
                  className={`text-xs font-black px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-spil-green text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
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
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-1">Tipe:</span>
            {['ALL', 'DRY', 'REEFER'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all ${
                  filterType === type
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Tariff Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm max-h-[380px] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr className="text-slate-500 font-black uppercase text-[9px] tracking-wider select-none">
                <th className="py-3 px-4">Asal (Origin)</th>
                <th className="py-3 px-4">Tujuan (Destination)</th>
                {filterType !== 'REEFER' && <th className="py-3 px-4 text-right">Tarif DRY</th>}
                {filterType !== 'DRY' && <th className="py-3 px-4 text-right">Tarif REEFER</th>}
                {filterType === 'ALL' && <th className="py-3 px-4 text-right">Selisih Premium</th>}
                <th className="py-3 px-4 text-center">Rekomendasi Stowage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {routes.map((r, idx) => {
                const originLabel = PORT_CODES_INFO[r.origin]?.fullLabel || r.origin;
                const destLabel = PORT_CODES_INFO[r.destination]?.fullLabel || r.destination;
                const isHighYield = r.dry >= 12000000 || r.reefer >= 19000000;

                return (
                  <tr
                    key={idx}
                    className={`font-bold hover:bg-slate-50/80 transition-colors ${
                      r.isCurrentOrigin ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-800">{originLabel}</span>
                        <span className="text-[9px] text-slate-400">({PORT_NAMES[r.origin]})</span>
                        {r.isCurrentOrigin && (
                          <span className="text-[7.5px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                            PORT ANDA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-800">{destLabel}</span>
                        <span className="text-[9px] text-slate-400">({PORT_NAMES[r.destination]})</span>
                      </div>
                    </td>
                    {filterType !== 'REEFER' && (
                      <td className="py-3 px-4 text-right font-black text-amber-700">
                        {formatRupiah(r.dry)}
                      </td>
                    )}
                    {filterType !== 'DRY' && (
                      <td className="py-3 px-4 text-right font-black text-sky-700">
                        <div className="flex items-center justify-end gap-1">
                          {formatRupiah(r.reefer)}
                          {isHighYield && <Sparkles className="w-3 h-3 text-amber-500" />}
                        </div>
                      </td>
                    )}
                    {filterType === 'ALL' && (
                      <td className="py-3 px-4 text-right font-extrabold text-emerald-700 text-[11px]">
                        +{formatRupiah(r.premium)}
                      </td>
                    )}
                    <td className="py-3 px-4 text-center">
                      <span className="text-[8.5px] font-black px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 uppercase">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-600 leading-relaxed font-bold">
              <strong className="text-slate-800 block uppercase">Kontainer Reefer Memiliki Nilai Lebih Tinggi:</strong>
              Tarif Reefer memberikan freight ~60-70% lebih tinggi dari Dry, tetapi hanya bisa diletakkan pada <strong className="text-sky-700">Bay 02 (12 Slot)</strong> yang memiliki fasilitas reefer plug.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Ship className="w-4 h-4 text-indigo-650 shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-600 leading-relaxed font-bold">
              <strong className="text-slate-800 block uppercase">Prinsip Stowage Later Port:</strong>
              Kargo dengan rute jauh (misal Jayapura/Medan) sebaiknya diletakkan di <strong className="text-indigo-700">Underdeck (Tier 02)</strong> agar tidak menghalangi bongkar muat kargo Next Port.
            </div>
          </div>
        </div>

        {/* Footer Close CTA */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="bg-spil-green hover:bg-spil-green-hover text-white font-extrabold text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider shadow-sm transition-all hover:scale-[1.01] active:scale-95"
          >
            Tutup Lembar Tarif
          </button>
        </div>
      </div>
    </div>
  );
}
