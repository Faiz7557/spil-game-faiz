import { useState } from 'react';
import { Ship, X, Layers, Compass, Plug, Package } from 'lucide-react';
import { getBayConfig } from '../utils/gameHelpers';
import Sheet from './ui/Sheet';
import { TypeChip } from './game/Chips';

const TABS = [
  { id: 'bay', Icon: Ship, label: '1. Bay (depan–belakang)' },
  { id: 'row', Icon: Compass, label: '2. Row (kiri–kanan)' },
  { id: 'tier', Icon: Layers, label: '3. Tier (palka–dek)' }
];

export default function ISOVisualizerModal({ isOpen, onClose }) {
  const [selectedAspect, setSelectedAspect] = useState('bay'); // 'bay' | 'row' | 'tier'
  const [activeBay, setActiveBay] = useState('10');

  if (!isOpen) return null;

  const activeCfg = getBayConfig(activeBay);

  return (
    <Sheet onClose={onClose} labelledBy="iso-title">
      <div className="g-glass-modal max-w-3xl w-full overflow-hidden max-h-[90vh] flex flex-col transition-colors text-g-ink">
        {/* Header */}
        <div className="px-6 py-4 border-b border-g-hair flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-g-inset border border-g-hair">
              <Ship className="w-5 h-5 text-g-ink2" />
            </div>
            <div>
              <h3 id="iso-title" className="text-headline font-semibold">
                Standar ISO 9711-1 (Bay-Row-Tier)
              </h3>
              <p className="text-callout text-g-muted">
                Panduan interaktif sistem koordinat stowage kapal kontainer
              </p>
            </div>
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-g-hair bg-g-inset px-6 shrink-0" role="tablist">
          {TABS.map(({ id, Icon, label }) => {
            const active = selectedAspect === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedAspect(id)}
                className={`py-3 px-4 font-semibold text-callout whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                  active
                    ? 'border-g-ink text-g-ink'
                    : 'border-transparent text-g-muted hover:text-g-ink'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {selectedAspect === 'bay' && (
            <div className="space-y-4">
              <div className="bg-g-inset p-4 rounded-2xl border border-g-hair">
                <h4 className="text-callout font-semibold text-g-ink mb-1">
                  Apa itu bay?
                </h4>
                <p className="text-callout text-g-ink2">
                  <strong className="font-semibold">Bay</strong> membagi kapal dari haluan (depan/bow) hingga buritan (belakang/stern).
                  Pada standar maritim internasional ISO 9711:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-callout">
                  <div className="p-3 bg-g-surface rounded-xl border border-g-hair">
                    <span className="font-semibold text-g-ink block mb-1">Nomor bay ganjil</span>
                    <span className="text-g-ink2">Digunakan untuk kontainer ukuran standar 20 kaki (Twenty-foot Equivalent Unit / TEU).</span>
                  </div>
                  <div className="p-3 bg-g-surface rounded-xl border border-g-hair">
                    <span className="font-semibold text-g-ink block mb-1">Nomor bay genap</span>
                    <span className="text-g-ink2">Digunakan untuk kontainer 40 kaki (FEU) yang memakan dua slot 20 kaki sekaligus.</span>
                  </div>
                </div>
              </div>

              {/* Interactive Vessel Top View Diagram */}
              <div className="bg-g-sunk rounded-2xl p-5 border border-g-hair">
                <div className="flex justify-between items-center mb-3 text-caption text-g-muted">
                  <span>Haluan (bow / depan kapal) →</span>
                  <span className="font-semibold text-g-ink2">Kapal kontainer SPIL</span>
                  <span>→ Buritan (stern / belakang)</span>
                </div>

                <div className="grid grid-cols-5 gap-2.5 p-3 bg-g-surface rounded-xl border border-g-hair">
                  {/* Bays run from bow to stern (02 = haluan), same as the ship profile in the workspace. */}
                  {['02', '06', '10', '14', '18'].map(bay => {
                    const cfg = getBayConfig(bay);
                    const isSelected = activeBay === bay;

                    return (
                      <button
                        key={bay}
                        type="button"
                        onClick={() => setActiveBay(bay)}
                        aria-pressed={isSelected}
                        className={`p-3 rounded-xl border transition-colors flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'bg-g-inv text-g-inv-ink border-transparent'
                            : 'bg-g-inset border-g-hair hover:bg-g-inset-hover'
                        }`}
                      >
                        <span className={`text-caption ${isSelected ? 'opacity-70' : 'text-g-muted'}`}>Bay</span>
                        <span className="text-headline font-plex font-medium tabular-nums">{bay}</span>
                        <TypeChip type={cfg.containerType} />
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 p-3 bg-g-surface rounded-xl text-callout border border-g-hair flex items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-g-ink">Bay {activeBay} terpilih</span>
                    <span className="text-g-muted ml-2">
                      (khusus {activeCfg.containerType}, {activeCfg.rows.length} row × {activeCfg.tiers.length} tier)
                    </span>
                  </div>
                  <span className="text-caption font-semibold text-g-ink2 flex items-center gap-1.5 shrink-0">
                    {activeCfg.containerType === 'REEFER'
                      ? <><Plug className="w-3.5 h-3.5" /> Dilengkapi plug listrik</>
                      : <><Package className="w-3.5 h-3.5" /> Kargo kering standar</>}
                  </span>
                </div>
              </div>
            </div>
          )}

          {selectedAspect === 'row' && (
            <div className="space-y-4">
              <div className="bg-g-inset p-4 rounded-2xl border border-g-hair">
                <h4 className="text-callout font-semibold text-g-ink mb-1">
                  Aturan penomoran row (melintang)
                </h4>
                <p className="text-callout text-g-ink2 mb-3">
                  Sumbu tengah kapal menjadi patokan utama pembagian baris (row):
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-callout">
                  <div className="p-3 bg-g-surface rounded-xl border border-g-hair">
                    <span className="font-semibold text-g-ink block mb-1">Row 00 (centerline)</span>
                    <span className="text-g-ink2">Terletak persis di garis tengah kapal. Hanya ada bila total baris ganjil (seperti Bay 18).</span>
                  </div>
                  <div className="p-3 bg-g-surface rounded-xl border border-g-hair">
                    <span className="font-semibold text-g-ink block mb-1">Nomor ganjil (01, 03)</span>
                    <span className="text-g-ink2">Terletak di sisi <strong className="font-semibold">kanan kapal (starboard)</strong>. Semakin besar nomornya, semakin ke pinggir lambung kanan.</span>
                  </div>
                  <div className="p-3 bg-g-surface rounded-xl border border-g-hair">
                    <span className="font-semibold text-g-ink block mb-1">Nomor genap (02, 04)</span>
                    <span className="text-g-ink2">Terletak di sisi <strong className="font-semibold">kiri kapal (port)</strong>. Semakin besar nomornya, semakin ke pinggir lambung kiri.</span>
                  </div>
                </div>
              </div>

              {/* Cross-section visual diagram */}
              <div className="bg-g-sunk rounded-2xl p-5 border border-g-hair">
                <h5 className="text-caption font-semibold text-center text-g-muted mb-3">
                  Potongan melintang kapal (tampak dari belakang / aft view)
                </h5>
                <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
                  {[
                    { side: 'Port (kiri)', row: '04' },
                    { side: 'Port (kiri)', row: '02' },
                    { side: 'Pusat', row: '00', center: true },
                    { side: 'Starboard (kanan)', row: '01' },
                    { side: 'Starboard (kanan)', row: '03' }
                  ].map(({ side, row, center }) => (
                    <div
                      key={row}
                      className={`${center ? 'w-12' : 'flex-1'} text-center p-3 rounded-xl border ${
                        center ? 'bg-g-inset border-dashed border-g-line' : 'bg-g-surface border-g-hair'
                      }`}
                    >
                      <span className="text-caption text-g-muted block">{side}</span>
                      <span className={`font-plex font-medium tabular-nums ${center ? 'text-caption text-g-muted' : 'text-headline text-g-ink'}`}>
                        {center ? row : `Row ${row}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedAspect === 'tier' && (
            <div className="space-y-4">
              <div className="bg-g-inset p-4 rounded-2xl border border-g-hair">
                <h4 className="text-callout font-semibold text-g-ink mb-1">
                  Aturan penomoran tier (ketinggian tumpukan)
                </h4>
                <p className="text-callout text-g-ink2 mb-3">
                  Tier menyatakan ketinggian tumpukan kontainer, dipisahkan oleh <strong className="font-semibold">tutup palka (hatch cover)</strong>:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-callout">
                  <div className="p-3 bg-g-surface rounded-xl border border-g-hair">
                    <span className="font-semibold text-g-ink block mb-1">Di dalam palka (underdeck / hold)</span>
                    <span className="text-g-ink2">Menggunakan nomor genap kecil: <strong className="font-semibold">Tier 02, 04, 06</strong>. Terlindung dari cuaca laut. <em>Catatan: slot ini terkunci apabila tutup palka sudah tertutup oleh kontainer dek atas.</em></span>
                  </div>
                  <div className="p-3 bg-g-surface rounded-xl border border-g-hair">
                    <span className="font-semibold text-g-ink block mb-1">Di atas geladak (on-deck)</span>
                    <span className="text-g-ink2">Menggunakan nomor diawali angka 8: <strong className="font-semibold">Tier 82, 84, 86</strong>. Duduk di atas tutup palka. Mudah dan cepat diakses oleh crane saat bongkar muat.</span>
                  </div>
                </div>
              </div>

              {/* Vertical Stack Visual Diagram */}
              <div className="bg-g-sunk rounded-2xl p-5 max-w-md mx-auto border border-g-hair">
                <h5 className="text-caption font-semibold text-center text-g-muted mb-3">
                  Tumpukan vertikal kontainer (satu baris)
                </h5>
                <div className="space-y-2">
                  <div className="p-3 bg-g-surface border border-g-hair rounded-xl text-center">
                    <span className="text-callout font-semibold text-g-ink">Tier 84 (on-deck atas)</span>
                    <span className="text-caption text-g-muted block">Wajib ada Tier 82 di bawahnya agar tidak melayang</span>
                  </div>
                  <div className="p-3 bg-g-surface border border-g-hair rounded-xl text-center">
                    <span className="text-callout font-semibold text-g-ink">Tier 82 (on-deck bawah)</span>
                    <span className="text-caption text-g-muted block">Duduk langsung di atas tutup palka kapal</span>
                  </div>
                  <div className="flex items-center gap-2.5 py-1 text-caption font-semibold text-g-muted">
                    <i className="flex-1 h-[3px] rounded-sm bg-g-faint block" />
                    <span>Tutup palka (hatch cover)</span>
                    <i className="flex-1 h-[3px] rounded-sm bg-g-faint block" />
                  </div>
                  <div className="p-3 bg-g-inset border border-g-hair rounded-xl text-center">
                    <span className="text-callout font-semibold text-g-ink">Tier 02 (underdeck / dalam palka)</span>
                    <span className="text-caption text-g-muted block">Kargo tujuan jauh (later port) sebaiknya disimpan di sini</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-g-inset border-t border-g-hair flex justify-end shrink-0">
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
