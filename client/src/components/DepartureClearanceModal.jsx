import { formatRupiah, PORT_NAMES } from '../utils/gameHelpers';
import { Anchor, ArrowRight, AlertTriangle, ShieldCheck, Ship, Play, X } from 'lucide-react';

export default function DepartureClearanceModal({
  isOpen,
  currentPort,
  nextPort,
  grid,
  pendingContainers = [],
  cargoPool = [],
  onConfirm,
  onCancel,
  loading = false,
  isOnline = false
}) {
  if (!isOpen) return null;

  // 1. Calculate Vessel Occupancy
  let totalSlots = 0;
  let occupiedSlots = 0;
  let dryCount = 0;
  let reeferCount = 0;
  let nextPortDischargeCount = 0;
  let nextPortDischargeRevenue = 0;

  if (grid) {
    Object.keys(grid).forEach(bay => {
      Object.keys(grid[bay]).forEach(row => {
        Object.keys(grid[bay][row]).forEach(tier => {
          totalSlots++;
          const container = grid[bay][row][tier];
          if (container) {
            occupiedSlots++;
            if (container.containerType === 'REEFER') reeferCount++;
            else dryCount++;

            if (container.destination === nextPort) {
              nextPortDischargeCount++;
              nextPortDischargeRevenue += container.tariff || 0;
            }
          }
        });
      });
    });
  }

  // 2. Calculate Restows (Shifting)
  let restowBlockerCount = 0;
  if (grid) {
    Object.keys(grid).forEach(bay => {
      Object.keys(grid[bay]).forEach(row => {
        const stack = grid[bay][row];
        const tiers = ['02', '82', '84'];
        let nextPortFound = false;
        tiers.forEach(tier => {
          const c = stack[tier];
          if (c) {
            if (c.destination === nextPort) {
              nextPortFound = true;
            } else if (nextPortFound) {
              restowBlockerCount++;
            }
          }
        });
      });
    });
  }
  const restowMovements = restowBlockerCount * 2;
  const restowPenalty = restowMovements * 3000000;

  // 3. Calculate Rolling Penalties for unplaced buffer containers
  let bufferRollingPenalty = 0;
  const unplacedCount = pendingContainers.length;
  pendingContainers.forEach(c => {
    const isComm = c.customerType === 'Committed';
    const fee = isComm 
      ? (c.containerType === 'DRY' ? 16000000 : 24000000)
      : (c.containerType === 'DRY' ? 8000000 : 16000000);
    bufferRollingPenalty += fee;
  });

  // 4. Calculate Ignored Committed Orders in Cargo Pool
  let ignoredCommittedCount = 0;
  let ignoredCommittedPenalty = 0;
  cargoPool.forEach(order => {
    if (order.customerType === 'Committed') {
      ignoredCommittedCount += order.quantity;
      const fee = order.containerType === 'DRY' ? 16000000 : 24000000;
      ignoredCommittedPenalty += order.quantity * fee;
    }
  });

  const totalPenalties = restowPenalty + bufferRollingPenalty + ignoredCommittedPenalty;
  const estimatedNet = nextPortDischargeRevenue - totalPenalties;
  const hasSevereWarnings = totalPenalties > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-2xl bg-white border border-slate-200/90 shadow-2xl rounded-3xl p-6 md:p-7 flex flex-col gap-5 max-h-[92vh] overflow-y-auto animate-slide-up relative">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block mb-1.5">
              🚢 Clearance Manifest Keberangkatan
            </span>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">
              Pemeriksaan Izin Berlayar (Pre-Flight Check)
            </h2>
            <p className="text-xs text-slate-500 font-bold mt-0.5">
              Verifikasi stabilitas muatan dan proyeksi finansial sebelum melepas tali dermaga.
            </p>
          </div>
          <button 
            type="button" 
            onClick={onCancel}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Route Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Anchor className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">Pelabuhan Asal</span>
              <span className="text-xs font-black text-slate-800 uppercase">{currentPort} ({PORT_NAMES[currentPort]})</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[7.5px] text-indigo-500 font-black tracking-widest uppercase">Voyage Transit</span>
            <ArrowRight className="w-4 h-4 text-indigo-600 animate-bounce-horizontal" />
          </div>
          <div className="flex items-center gap-2 text-right">
            <div>
              <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">Tujuan Berikutnya</span>
              <span className="text-xs font-black text-indigo-700 uppercase">{nextPort} ({PORT_NAMES[nextPort]})</span>
            </div>
            <Ship className="w-4 h-4 text-indigo-600" />
          </div>
        </div>

        {/* Audit Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Capacity */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block mb-1">
              Daya Angkut Kapal
            </span>
            <span className="text-base font-black text-slate-800">
              {occupiedSlots} / {totalSlots} <span className="text-[10px] text-slate-400">TEU</span>
            </span>
            <span className="text-[8px] text-slate-500 font-bold block mt-1">
              DRY: {dryCount} · REEFER: {reeferCount}
            </span>
          </div>

          {/* Next Port Discharge */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-[8px] text-emerald-700 font-black uppercase tracking-wider block mb-1">
              Bongkar di {nextPort}
            </span>
            <span className="text-base font-black text-emerald-800">
              {nextPortDischargeCount} <span className="text-[10px] text-emerald-600">Kontainer</span>
            </span>
            <span className="text-[8px] text-emerald-700 font-bold block mt-1">
              +{formatRupiah(nextPortDischargeRevenue)}
            </span>
          </div>

          {/* Denda Restow & Rolling */}
          <div className={`p-3.5 rounded-xl border ${hasSevereWarnings ? 'bg-rose-50/80 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[8px] font-black uppercase tracking-wider block mb-1 ${hasSevereWarnings ? 'text-spil-red' : 'text-slate-400'}`}>
              Potensi Denda Port
            </span>
            <span className={`text-base font-black ${hasSevereWarnings ? 'text-spil-red' : 'text-slate-700'}`}>
              -{formatRupiah(totalPenalties)}
            </span>
            <span className="text-[8px] text-slate-500 font-bold block mt-1">
              {hasSevereWarnings ? 'Perlu dievaluasi!' : 'Bebas Denda!'}
            </span>
          </div>
        </div>

        {/* Warning Checklist (If any penalties exist) */}
        {hasSevereWarnings && (
          <div className="bg-rose-50/60 border border-rose-250 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-spil-red">
              <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
              <span className="text-xs font-black uppercase tracking-wider">Perhatian: Denda Terdeteksi Sebelum Keberangkatan</span>
            </div>
            <ul className="text-xs font-semibold text-slate-700 space-y-1.5 pl-6 list-disc">
              {restowBlockerCount > 0 && (
                <li>
                  <strong className="text-spil-red">{restowBlockerCount} Blocker Restow:</strong> Menghalangi kargo pelabuhan berikutnya ({restowMovements} gerakan shifting = <strong className="text-spil-red">-{formatRupiah(restowPenalty)}</strong>).
                </li>
              )}
              {unplacedCount > 0 && (
                <li>
                  <strong className="text-spil-red">{unplacedCount} Kontainer di Buffer:</strong> Kargo sudah diklaim tetapi belum dimuat ke kapal (Rolling Penalty = <strong className="text-spil-red">-{formatRupiah(bufferRollingPenalty)}</strong>).
                </li>
              )}
              {ignoredCommittedCount > 0 && (
                <li>
                  <strong className="text-spil-red">{ignoredCommittedCount} Kontrak Committed Terabaikan:</strong> Kontrak prioritas belum diklaim di pasar (Denda = <strong className="text-spil-red">-{formatRupiah(ignoredCommittedPenalty)}</strong>).
                </li>
              )}
            </ul>
          </div>
        )}

        {!hasSevereWarnings && (
          <div className="bg-emerald-50 border border-emerald-250 rounded-2xl p-3.5 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-emerald-900">
              Kapal memenuhi standar operasional prima! Bebas restow blocker dan seluruh kontrak prioritas telah terakomodasi.
            </span>
          </div>
        )}

        {/* Projected Financial Net */}
        <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-4 rounded-2xl">
          <div>
            <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">
              Proyeksi Hasil Usaha Bersih Voyage
            </span>
            <span className={`text-lg font-black ${estimatedNet >= 0 ? 'text-emerald-700' : 'text-spil-red'}`}>
              {estimatedNet >= 0 ? '+' : ''}{formatRupiah(estimatedNet)}
            </span>
          </div>
          <span className="text-[9px] font-bold text-slate-400 max-w-xs text-right">
            Diakui saat kapal bersandar di pelabuhan {nextPort}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-250 text-slate-700 font-extrabold text-xs uppercase tracking-wider hover:bg-slate-100 transition-colors"
          >
            Kembali Menata
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs uppercase tracking-widest shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            {loading ? 'Memproses Pelayaran...' : (isOnline ? 'Konfirmasi Siap Berlayar' : 'Konfirmasi Berangkat')}
          </button>
        </div>

      </div>
    </div>
  );
}
