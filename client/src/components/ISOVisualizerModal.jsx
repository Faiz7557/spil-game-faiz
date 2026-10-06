import { useState } from 'react';
import { Ship, X, Layers, Compass } from 'lucide-react';
import { getBayConfig } from '../utils/gameHelpers';

export default function ISOVisualizerModal({ isOpen, onClose }) {
  const [selectedAspect, setSelectedAspect] = useState('bay'); // 'bay' | 'row' | 'tier'
  const [activeBay, setActiveBay] = useState('10');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 g-overlay animate-fade-in">
      <div className="g-glass-modal max-w-3xl w-full overflow-hidden animate-scale-up max-h-[90vh] flex flex-col transition-colors">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-spil-red px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <Ship className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-wide">
                Visualisator Standar ISO 9711-1 (Bay-Row-Tier)
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Panduan interaktif sistem koordinat stowage kapal kontainer dunia nyata
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-g-hair bg-g-inset px-6 shrink-0">
          <button
            onClick={() => setSelectedAspect('bay')}
            className={`py-3 px-4 font-semibold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              selectedAspect === 'bay'
                ? 'border-spil-red text-spil-red bg-g-inset '
                : 'border-transparent text-g-muted hover:text-g-ink '
            }`}
          >
            <Ship className="w-4 h-4" />
            1. Bay (Membujur: Depan-Belakang)
          </button>
          <button
            onClick={() => setSelectedAspect('row')}
            className={`py-3 px-4 font-semibold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              selectedAspect === 'row'
                ? 'border-spil-red text-spil-red bg-g-inset '
                : 'border-transparent text-g-muted hover:text-g-ink '
            }`}
          >
            <Compass className="w-4 h-4" />
            2. Row (Melintang: Kiri-Kanan)
          </button>
          <button
            onClick={() => setSelectedAspect('tier')}
            className={`py-3 px-4 font-semibold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              selectedAspect === 'tier'
                ? 'border-spil-red text-spil-red bg-g-inset '
                : 'border-transparent text-g-muted hover:text-g-ink '
            }`}
          >
            <Layers className="w-4 h-4" />
            3. Tier (Ketinggian: Palka-Dek)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {selectedAspect === 'bay' && (
            <div className="space-y-4">
              <div className="bg-g-inset p-4 rounded-2xl border border-g-hair">
                <h4 className="text-xs font-semibold text-g-ink uppercase tracking-wide mb-1">
                  Apa itu Bay?
                </h4>
                <p className="text-[13px] text-g-ink2 leading-relaxed">
                  <strong>Bay</strong> membagi kapal dari haluan (depan/bow) hingga buritan (belakang/stern). 
                  Pada standar maritim internasional ISO 9711:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs">
                  <div className="p-3 bg-g-inset rounded-xl border border-g-hair">
                    <span className="font-semibold text-spil-red dark:text-rose-400 block mb-1">📦 Nomor Bay Ganjil</span>
                    <span className="text-g-ink2">Digunakan untuk kontainer ukuran standar 20 kaki (Twenty-foot Equivalent Unit / TEU).</span>
                  </div>
                  <div className="p-3 bg-g-inset rounded-xl border border-g-hair">
                    <span className="font-semibold text-blue-600 dark:text-blue-400 block mb-1">📦 Nomor Bay Genap</span>
                    <span className="text-g-ink2">Digunakan untuk kontainer 40 kaki (FEU) yang memakan dua slot 20 kaki sekaligus.</span>
                  </div>
                </div>
              </div>

              {/* Interactive Vessel Top View Diagram */}
              <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-5 text-white shadow-inner border border-slate-800 dark:border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-medium text-slate-400">Haluan (Bow / Depan Kapal) ➔</span>
                  <span className="text-xs font-semibold text-emerald-400">Kapal Kontainer SPIL</span>
                  <span className="text-[11px] font-medium text-slate-400">➔ Buritan (Stern / Belakang)</span>
                </div>

                <div className="grid grid-cols-5 gap-2.5 p-3 bg-slate-800/80 dark:bg-slate-900 rounded-xl border border-slate-700 dark:border-white/10">
                  {['18', '14', '10', '06', '02'].map(bay => {
                    const cfg = getBayConfig(bay);
                    const isReefer = cfg.containerType === 'REEFER';
                    const isSelected = activeBay === bay;

                    return (
                      <button
                        key={bay}
                        onClick={() => setActiveBay(bay)}
                        className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'bg-spil-red border-white shadow-lg scale-105'
                            : 'bg-slate-700/60 dark:bg-slate-800/60 border-slate-600 dark:border-white/10 hover:bg-slate-700 dark:hover:bg-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <span className="text-[11px] font-medium text-slate-300">Bay</span>
                        <span className="text-sm font-semibold">{bay}</span>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${isReefer ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'bg-slate-600 text-slate-300'}`}>
                          {isReefer ? 'REEFER' : 'DRY'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 p-3 bg-slate-800/90 dark:bg-slate-900/90 rounded-xl text-xs border border-slate-700/80 dark:border-white/10 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white">Detail Bay Terpilih: Bay {activeBay}</span>
                    <span className="text-slate-400 ml-2">
                      ({getBayConfig(activeBay).containerType} Container Only, {getBayConfig(activeBay).rows.length} Baris x {getBayConfig(activeBay).tiers.length} Tier)
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-400">
                    {getBayConfig(activeBay).containerType === 'REEFER' ? '🔌 Dilengkapi Plug Listrik Recharging' : '📦 Kargo Kering Standar'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {selectedAspect === 'row' && (
            <div className="space-y-4">
              <div className="bg-g-inset p-4 rounded-2xl border border-g-hair">
                <h4 className="text-xs font-semibold text-g-ink uppercase tracking-wide mb-1">
                  Aturan Penomoran Row (Melintang)
                </h4>
                <p className="text-[13px] text-g-ink2 leading-relaxed mb-3">
                  Sumbu tengah kapal menjadi patokan utama pembagian baris (Row):
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-g-inset rounded-xl border border-g-hair">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">Row 00 (Centerline)</span>
                    <span className="text-g-ink2">Terletak persis di garis tengah kapal (Centerline). Hanya ada bila total baris ganjil (seperti Bay 18).</span>
                  </div>
                  <div className="p-3 bg-g-inset rounded-xl border border-g-hair">
                    <span className="font-semibold text-blue-600 dark:text-blue-400 block mb-1">Nomor Ganjil (01, 03)</span>
                    <span className="text-g-ink2">Terletak di sisi <strong>Kanan Kapal (Starboard side)</strong>. Semakin besar nomornya, semakin ke pinggir lambung kanan.</span>
                  </div>
                  <div className="p-3 bg-g-inset rounded-xl border border-g-hair">
                    <span className="font-semibold text-purple-600 dark:text-purple-400 block mb-1">Nomor Genap (02, 04)</span>
                    <span className="text-g-ink2">Terletak di sisi <strong>Kiri Kapal (Port side)</strong>. Semakin besar nomornya, semakin ke pinggir lambung kiri.</span>
                  </div>
                </div>
              </div>

              {/* Cross-section visual diagram */}
              <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-5 text-white border border-slate-800 dark:border-white/10">
                <h5 className="text-xs font-semibold text-center text-slate-300 mb-3 uppercase tracking-wider">
                  Potongan Melintang Kapal (Tampak dari Belakang / Aft View)
                </h5>
                <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
                  <div className="flex-1 text-center p-3 bg-purple-900/40 border border-purple-500/50 rounded-xl">
                    <span className="text-[11px] text-purple-300 block font-medium">Port Side (Kiri)</span>
                    <span className="text-lg font-semibold text-purple-200">Row 04</span>
                  </div>
                  <div className="flex-1 text-center p-3 bg-purple-900/40 border border-purple-500/50 rounded-xl">
                    <span className="text-[11px] text-purple-300 block font-medium">Port Side (Kiri)</span>
                    <span className="text-lg font-semibold text-purple-200">Row 02</span>
                  </div>
                  <div className="w-12 text-center p-3 bg-slate-800 dark:bg-slate-900 border border-slate-600 dark:border-white/10 rounded-xl">
                    <span className="text-[11px] text-slate-400 block font-medium">Pusat</span>
                    <span className="text-xs font-semibold text-slate-300">00</span>
                  </div>
                  <div className="flex-1 text-center p-3 bg-blue-900/40 border border-blue-500/50 rounded-xl">
                    <span className="text-[11px] text-blue-300 block font-medium">Starboard (Kanan)</span>
                    <span className="text-lg font-semibold text-blue-200">Row 01</span>
                  </div>
                  <div className="flex-1 text-center p-3 bg-blue-900/40 border border-blue-500/50 rounded-xl">
                    <span className="text-[11px] text-blue-300 block font-medium">Starboard (Kanan)</span>
                    <span className="text-lg font-semibold text-blue-200">Row 03</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedAspect === 'tier' && (
            <div className="space-y-4">
              <div className="bg-g-inset p-4 rounded-2xl border border-g-hair">
                <h4 className="text-xs font-semibold text-g-ink uppercase tracking-wide mb-1">
                  Aturan Penomoran Tier (Ketinggian Tumpukan)
                </h4>
                <p className="text-[13px] text-g-ink2 leading-relaxed mb-3">
                  Tier menyatakan ketinggian tumpukan kontainer, dipisahkan oleh <strong>Tutup Palka (Hatch Cover)</strong>:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60">
                    <span className="font-semibold text-amber-900 dark:text-amber-300 block mb-1">⚓ Di Dalam Palka (Underdeck / Hold)</span>
                    <span className="text-g-ink">Menggunakan nomor genap kecil: <strong>Tier 02, 04, 06</strong>. Terlindung dari cuaca laut. <em>Catatan: slot ini terkunci apabila tutup palka sudah tertutup oleh kontainer dek atas!</em></span>
                  </div>
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-950/40 rounded-xl border border-cyan-200 dark:border-cyan-800/60">
                    <span className="font-semibold text-cyan-900 dark:text-cyan-300 block mb-1">🌊 Di Atas Geladak (On-Deck)</span>
                    <span className="text-g-ink">Menggunakan nomor diawali angka 8: <strong>Tier 82, 84, 86</strong>. Duduk di atas tutup palka. Mudah dan cepat diakses oleh crane saat bongkar muat.</span>
                  </div>
                </div>
              </div>

              {/* Vertical Stack Visual Diagram */}
              <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-5 text-white max-w-md mx-auto border border-slate-800 dark:border-white/10">
                <h5 className="text-xs font-semibold text-center text-slate-300 mb-3 uppercase tracking-wider">
                  Tumpukan Vertikal Kontainer (Satu Baris)
                </h5>
                <div className="space-y-2">
                  <div className="p-3 bg-cyan-600/30 border border-cyan-400 rounded-xl text-center">
                    <span className="text-xs font-semibold text-cyan-300">Tier 84 (On-Deck Atas)</span>
                    <span className="text-[11px] text-cyan-200 block">Wajib ada Tier 82 di bawahnya agar tidak melayang</span>
                  </div>
                  <div className="p-3 bg-cyan-600/30 border border-cyan-400 rounded-xl text-center">
                    <span className="text-xs font-semibold text-cyan-300">Tier 82 (On-Deck Bawah)</span>
                    <span className="text-[11px] text-cyan-200 block">Duduk langsung di atas tutup palka kapal</span>
                  </div>
                  <div className="py-1 px-4 bg-slate-700/80 rounded-md border border-dashed border-amber-400 text-center text-[11px] font-semibold text-amber-300">
                    ─── TUTUP PALKA KAPAL (HATCH COVER) ───
                  </div>
                  <div className="p-3 bg-amber-600/30 border border-amber-400 rounded-xl text-center">
                    <span className="text-xs font-semibold text-amber-300">Tier 02 (Underdeck / Dalam Palka)</span>
                    <span className="text-[11px] text-amber-200 block">Kargo tujuan jauh (Later Port) sebaiknya disimpan di sini</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-g-inset border-t border-g-hair flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-g-inv text-g-inv-ink hover:opacity-90 font-semibold text-xs uppercase tracking-wider shadow-sm transition-all"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
}
