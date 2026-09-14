import { useState } from 'react';
import { GLOSSARY_SECTIONS } from '../utils/gameHelpers';
import { X, BookOpen, Compass, Layers, PhoneCall, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

const ICONS = [Compass, Layers, Layers, PhoneCall, FileSpreadsheet];

export default function GlossaryModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!isOpen) return null;

  const currentSection = GLOSSARY_SECTIONS[activeTab] || GLOSSARY_SECTIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 md:p-8 flex flex-col gap-5 max-h-[94vh] overflow-y-auto animate-slide-up relative">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div>
            <span className="text-[9px] text-indigo-700 font-black uppercase tracking-widest bg-indigo-50 border border-indigo-150 px-3 py-1 rounded-full">
              PANDUAN RESMI OPERASIONAL & ATURAN SPIL
            </span>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide mt-2 font-display flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-650" />
              Glosarium & Standar Operasional SPIL Game 4 Jalur
            </h2>
            <p className="text-xs text-slate-500 font-bold mt-1">
              Dokumentasi komprehensif aturan permainan, koordinat bayplan, manajemen tarif kargo, dan evaluasi keuangan.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            title="Tutup Glosarium"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200/80 pb-3">
          {GLOSSARY_SECTIONS.map((sec, idx) => {
            const IconComponent = ICONS[idx] || BookOpen;
            const isActive = activeTab === idx;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                  isActive
                    ? 'bg-spil-green text-white shadow-md scale-[1.02]'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <IconComponent className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>Modul {idx + 1}: {sec.category.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="mb-4">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
              KATEGORI
            </span>
            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wide mt-0.5">
              {currentSection.category}
            </h3>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentSection.items.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-50/70 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-spil-green shrink-0" />
                      {item.term}
                    </h4>
                    {item.term.includes('Bay') || item.term.includes('01') || item.term.includes('Committed') ? (
                      <span className="text-[7.5px] font-black px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-150 text-indigo-700 uppercase">
                        Kunci
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-bold">
                    {item.definition}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Close CTA */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs text-slate-400 font-bold">
          <span>Modul {activeTab + 1} dari {GLOSSARY_SECTIONS.length}</span>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider shadow-sm transition-all hover:scale-[1.01] active:scale-95"
          >
            Tutup Glosarium
          </button>
        </div>
      </div>
    </div>
  );
}
