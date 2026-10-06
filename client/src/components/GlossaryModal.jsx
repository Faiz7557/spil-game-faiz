import { useState } from 'react';
import { GLOSSARY_SECTIONS } from '../utils/gameHelpers';
import { X, BookOpen, Compass, Layers, PhoneCall, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

const ICONS = [Compass, Layers, Layers, PhoneCall, FileSpreadsheet];

export default function GlossaryModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!isOpen) return null;

  const currentSection = GLOSSARY_SECTIONS[activeTab] || GLOSSARY_SECTIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center g-overlay p-4 overflow-y-auto">
      <div className="g-glass-modal w-full max-w-5xl p-6 md:p-8 flex flex-col gap-5 max-h-[94vh] overflow-y-auto animate-slide-up relative text-g-ink transition-colors">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-g-hair pb-4">
          <div>
            <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-150 dark:border-indigo-800 px-3 py-1 rounded-full">
              PANDUAN RESMI OPERASIONAL & ATURAN SPIL
            </span>
            <h2 className="text-xl font-semibold text-g-ink uppercase tracking-wide mt-2 font-display flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-650 dark:text-indigo-400" />
              Glosarium & Standar Operasional SPIL Game 4 Jalur
            </h2>
            <p className="text-xs text-g-muted font-medium mt-1">
              Dokumentasi komprehensif aturan permainan, koordinat bayplan, manajemen tarif kargo, dan evaluasi keuangan.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-g-muted hover:text-g-ink hover:bg-g-inset-hover transition-all"
            title="Tutup Glosarium"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-g-hair pb-3">
          {GLOSSARY_SECTIONS.map((sec, idx) => {
            const IconComponent = ICONS[idx] || BookOpen;
            const isActive = activeTab === idx;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  isActive
                    ? 'bg-spil-green text-white shadow-md scale-[1.02]'
                    : 'bg-g-inset text-g-ink2 border border-g-hair hover:bg-g-inset-hover '
                }`}
              >
                <IconComponent className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-g-muted '}`} />
                <span>Modul {idx + 1}: {sec.title.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="mb-4">
            <span className="text-[11px] font-semibold text-g-muted uppercase tracking-wider block">
              KATEGORI
            </span>
            <h3 className="text-base font-semibold text-g-ink uppercase tracking-wide mt-0.5">
              {currentSection.title}
            </h3>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentSection.items.map((item, idx) => (
              <div
                key={idx}
                className="bg-g-inset border border-g-hair p-4 rounded-2xl flex flex-col justify-between hover:border-g-line hover:bg-g-inset-hover transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-g-ink text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-spil-green dark:text-emerald-400 shrink-0" />
                      {item.term}
                    </h4>
                    {item.term.includes('Bay') || item.term.includes('01') || item.term.includes('Committed') ? (
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-150 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 uppercase">
                        Kunci
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[13px] text-g-ink2 leading-relaxed font-medium">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Close CTA */}
        <div className="flex justify-between items-center pt-3 border-t border-g-hair text-xs text-g-muted font-medium">
          <span>Modul {activeTab + 1} dari {GLOSSARY_SECTIONS.length}</span>
          <button
            onClick={onClose}
            className="bg-g-inv text-g-inv-ink hover:opacity-90 font-semibold text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider shadow-sm transition-all hover:scale-[1.01] active:scale-95"
          >
            Tutup Glosarium
          </button>
        </div>
      </div>
    </div>
  );
}
