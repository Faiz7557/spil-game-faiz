import { Package, AlertTriangle, Info } from 'lucide-react';
import { calculateCapacityMetrics } from '../utils/gameHelpers';

export default function CapacityMeter({ grid, pendingContainers = [] }) {
  const metrics = calculateCapacityMetrics(grid, pendingContainers);

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-50 text-spil-green">
            <Package className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Budget & Kapasitas Kapal
            </h4>
            <p className="text-[10px] text-slate-500 font-medium">
              Alokasi slot vs Kontainer yang harus dimuat
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-black text-slate-700">
            {metrics.totalOccupied}/{metrics.totalSlots}
          </span>
          <span className="text-[10px] text-slate-400 font-bold ml-1">
            ({metrics.overallPercent}%)
          </span>
        </div>
      </div>

      <div className="space-y-3.5">
        {/* DRY Container Capacity */}
        <div>
          <div className="flex justify-between items-center text-xs font-bold mb-1.5">
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              Kontainer Kering (DRY)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">
                Sisa: <strong className="text-slate-800">{metrics.dry.free}</strong> slot
              </span>
              {metrics.dry.isOverbooked && (
                <span className="flex items-center gap-1 text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md font-extrabold border border-rose-200 animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> Overbooked!
                </span>
              )}
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-500 ${metrics.dry.isOverbooked ? 'bg-rose-500' : 'bg-spil-green'}`}
              style={{ width: `${Math.min(100, metrics.dry.percent)}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400 font-semibold">
            <span>Terisi: {metrics.dry.occupied} / {metrics.dry.total} slot</span>
            <span>Antrean Muat: {metrics.dry.pending} unit</span>
          </div>
        </div>

        {/* REEFER Container Capacity */}
        <div>
          <div className="flex justify-between items-center text-xs font-bold mb-1.5">
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block"></span>
              Kontainer Berpendingin (REEFER)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">
                Sisa: <strong className="text-slate-800">{metrics.reefer.free}</strong> slot
              </span>
              {metrics.reefer.isOverbooked && (
                <span className="flex items-center gap-1 text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md font-extrabold border border-rose-200 animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> Overbooked!
                </span>
              )}
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-500 ${metrics.reefer.isOverbooked ? 'bg-rose-500' : 'bg-cyan-500'}`}
              style={{ width: `${Math.min(100, metrics.reefer.percent)}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400 font-semibold">
            <span>Terisi: {metrics.reefer.occupied} / {metrics.reefer.total} slot (Bay 10/14)</span>
            <span>Antrean Muat: {metrics.reefer.pending} unit</span>
          </div>
        </div>
      </div>

      {(metrics.dry.isOverbooked || metrics.reefer.isOverbooked) && (
        <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2 leading-tight">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Peringatan Denda:</strong> Kontainer yang sudah diklaim tetapi tidak muat di kapal akan terkena denda rolling saat berlayar.
          </span>
        </div>
      )}
    </div>
  );
}
