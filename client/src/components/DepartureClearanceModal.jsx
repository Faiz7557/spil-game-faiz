import { formatRupiah, PORT_NAMES } from '../utils/gameHelpers';
import { Anchor, ArrowRight, AlertTriangle, ShieldCheck, Ship, Play, X } from 'lucide-react';
import Sheet from './ui/Sheet';

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
    <Sheet onClose={loading ? undefined : onCancel} labelledBy="departure-title">
      <div className="g-glass-modal w-full max-w-2xl p-6 md:p-7 flex flex-col gap-5 max-h-[92vh] overflow-y-auto relative text-g-ink transition-colors">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-g-hair pb-4">
          <div>
            <span className="text-caption font-semibold text-g-muted">
              Clearance keberangkatan
            </span>
            <h2 id="departure-title" className="text-title-2 font-semibold text-g-ink mt-0.5">
              Pemeriksaan izin berlayar
            </h2>
            <p className="text-callout text-g-muted mt-0.5">
              Verifikasi stabilitas muatan dan proyeksi finansial sebelum melepas tali dermaga.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Tutup"
            className="g-pill w-8 h-8 shrink-0 flex items-center justify-center text-g-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Route Card */}
        <div className="bg-g-inset border border-g-hair rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Anchor className="w-4 h-4 text-g-muted" />
            <div>
              <span className="text-caption text-g-muted block">Pelabuhan asal</span>
              <span className="text-callout font-semibold text-g-ink">{currentPort} ({PORT_NAMES[currentPort]})</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-caption text-g-muted">Voyage</span>
            <ArrowRight className="w-4 h-4 text-g-muted" />
          </div>
          <div className="flex items-center gap-2 text-right">
            <div>
              <span className="text-caption text-g-muted block">Tujuan berikutnya</span>
              <span className="text-callout font-semibold text-g-ink">{nextPort} ({PORT_NAMES[nextPort]})</span>
            </div>
            <Ship className="w-4 h-4 text-g-muted" />
          </div>
        </div>

        {/* Audit Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-caption">
          {/* Capacity */}
          <div className="p-3.5 rounded-xl bg-g-inset border border-g-hair">
            <span className="text-caption text-g-muted block mb-1">
              Daya angkut kapal
            </span>
            <span className="text-headline font-semibold font-plex tabular-nums text-g-ink">
              {occupiedSlots} / {totalSlots} <span className="text-caption font-sans text-g-muted">TEU</span>
            </span>
            <span className="text-caption text-g-muted block mt-1">
              DRY: {dryCount} · REEFER: {reeferCount}
            </span>
          </div>

          {/* Next Port Discharge */}
          <div className="p-3.5 rounded-xl bg-g-inset border border-g-hair">
            <span className="text-caption text-g-muted block mb-1">
              Bongkar di {nextPort}
            </span>
            <span className="text-headline font-semibold font-plex tabular-nums text-g-ink">
              {nextPortDischargeCount} <span className="text-caption font-sans text-g-muted">kontainer</span>
            </span>
            <span className="text-caption font-plex tabular-nums text-g-green-ink block mt-1">
              +{formatRupiah(nextPortDischargeRevenue)}
            </span>
          </div>

          {/* Denda Restow & Rolling */}
          <div className={`p-3.5 rounded-xl border ${hasSevereWarnings ? 'bg-g-danger-bg border-g-danger-line ' : 'bg-g-inset border-g-hair '}`}>
            <span className={`text-caption block mb-1 ${hasSevereWarnings ? 'text-g-danger-ink' : 'text-g-muted'}`}>
              Potensi denda port
            </span>
            <span className={`text-headline font-semibold font-plex tabular-nums ${hasSevereWarnings ? 'text-g-danger-ink' : 'text-g-ink'}`}>
              -{formatRupiah(totalPenalties)}
            </span>
            <span className="text-caption text-g-muted block mt-1">
              {hasSevereWarnings ? 'Perlu dievaluasi' : 'Bebas denda'}
            </span>
          </div>
        </div>

        {/* Warning Checklist (If any penalties exist) */}
        {hasSevereWarnings && (
          <div className="bg-g-danger-bg border border-g-danger-line rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-g-danger-ink">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-callout font-semibold">Ada denda yang akan dikenakan</span>
            </div>
            <ul className="text-callout text-g-ink space-y-1.5 pl-6 list-disc">
              {restowBlockerCount > 0 && (
                <li>
                  <strong className="font-semibold text-g-danger-ink">{restowBlockerCount} blocker restow:</strong> Menghalangi kargo pelabuhan berikutnya ({restowMovements} gerakan shifting = <strong className="font-semibold text-g-danger-ink">-{formatRupiah(restowPenalty)}</strong>).
                </li>
              )}
              {unplacedCount > 0 && (
                <li>
                  <strong className="font-semibold text-g-danger-ink">{unplacedCount} kontainer di buffer:</strong> Kargo sudah diklaim tetapi belum dimuat ke kapal (rolling penalty = <strong className="font-semibold text-g-danger-ink">-{formatRupiah(bufferRollingPenalty)}</strong>).
                </li>
              )}
              {ignoredCommittedCount > 0 && (
                <li>
                  <strong className="font-semibold text-g-danger-ink">{ignoredCommittedCount} kontrak committed terabaikan:</strong> Kontrak prioritas belum diklaim di pasar (Denda = <strong className="font-semibold text-g-danger-ink">-{formatRupiah(ignoredCommittedPenalty)}</strong>).
                </li>
              )}
            </ul>
          </div>
        )}

        {!hasSevereWarnings && (
          <div className="bg-g-green-bg border border-g-green-line rounded-2xl p-3.5 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-g-green-ink shrink-0" />
            <span className="text-callout text-g-green-ink">
              Kapal siap berlayar. Tidak ada restow blocker dan seluruh kontrak prioritas sudah terakomodasi.
            </span>
          </div>
        )}

        {/* Projected Financial Net */}
        <div className="flex justify-between items-center bg-g-inset border border-g-hair p-4 rounded-2xl">
          <div>
            <span className="text-caption text-g-muted block">
              Proyeksi hasil bersih voyage
            </span>
            <span className={`text-title-2 font-semibold font-plex tabular-nums ${estimatedNet >= 0 ? 'text-g-green-ink' : 'text-g-danger-ink'}`}>
              {estimatedNet >= 0 ? '+' : ''}{formatRupiah(estimatedNet)}
            </span>
          </div>
          <span className="text-caption text-g-muted max-w-xs text-right">
            Diakui saat kapal bersandar di pelabuhan {nextPort}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="g-pill flex-1 py-3 px-4 font-semibold text-callout"
          >
            Kembali menata
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-full g-btn-green font-semibold text-callout flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            {loading ? 'Memproses pelayaran…' : (isOnline ? 'Konfirmasi siap berlayar' : 'Konfirmasi berangkat')}
          </button>
        </div>

      </div>
    </Sheet>
  );
}
