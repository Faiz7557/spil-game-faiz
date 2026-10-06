import { useState } from 'react';
import { GLOSSARY_SECTIONS } from '../utils/gameHelpers';
import { X, BookOpen, Compass, Layers, PhoneCall, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import Sheet from './ui/Sheet';

const ICONS = [Compass, Layers, Layers, PhoneCall, FileSpreadsheet];

export default function GlossaryModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!isOpen) return null;

  const currentSection = GLOSSARY_SECTIONS[activeTab] || GLOSSARY_SECTIONS[0];

  return (
    <Sheet onClose={onClose} labelledBy="glossary-title">
      <div className="g-glass-modal w-full max-w-5xl p-6 md:p-8 flex flex-col gap-5 max-h-[94vh] overflow-y-auto relative text-g-ink transition-colors">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-g-hair pb-4">
          <div>
            <span className="text-caption font-semibold text-g-muted">
              Panduan operasional & aturan
            </span>
            <h2 id="glossary-title" className="text-title-2 font-semibold text-g-ink mt-0.5 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-g-ink2" />
              Glosarium & standar operasional
            </h2>
            <p className="text-callout text-g-muted mt-1">
              Dokumentasi komprehensif aturan permainan, koordinat bayplan, manajemen tarif kargo, dan evaluasi keuangan.
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

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-g-hair pb-3">
          {GLOSSARY_SECTIONS.map((sec, idx) => {
            const IconComponent = ICONS[idx] || BookOpen;
            const isActive = activeTab === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveTab(idx)}
                aria-pressed={isActive}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-callout font-semibold transition-colors duration-200 ${
                  isActive ? 'bg-g-inv text-g-inv-ink border-transparent' : 'bg-g-inset text-g-ink2 border border-g-hair hover:bg-g-inset-hover'
                }`}
              >
                <IconComponent className={`w-3.5 h-3.5 ${isActive ? '' : 'text-g-muted'}`} />
                <span>Modul {idx + 1}: {sec.title.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="mb-4">
            <span className="text-caption font-semibold text-g-muted block">
              Kategori
            </span>
            <h3 className="text-headline font-semibold text-g-ink mt-0.5">
              {currentSection.title}
            </h3>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentSection.items.map((item, idx) => (
              <div
                key={idx}
                className="bg-g-inset border border-g-hair p-4 rounded-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-g-ink text-callout flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-g-green-ink shrink-0" />
                      {item.term}
                    </h4>
                    {item.term.includes('Bay') || item.term.includes('01') || item.term.includes('Committed') ? (
                      <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-g-surface border border-g-hair text-g-muted">
                        Kunci
                      </span>
                    ) : null}
                  </div>
                  <p className="text-callout text-g-ink2">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Close CTA */}
        <div className="flex justify-between items-center pt-3 border-t border-g-hair text-callout text-g-muted">
          <span>Modul {activeTab + 1} dari {GLOSSARY_SECTIONS.length}</span>
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
