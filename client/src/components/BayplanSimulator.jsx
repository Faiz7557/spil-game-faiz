import { useState, Fragment } from 'react';
import { getBayConfig, formatRupiah, getNextPort } from '../utils/gameHelpers';
import { 
  Ship, Info, ArrowDown, ShieldAlert, Sparkles, XCircle, Anchor, Lock,
  Play, PhoneCall, Check, Trash2, AlertCircle, ChevronDown, ChevronUp, TrendingUp, Users,
  ChevronLeft, ChevronRight, FileText
} from 'lucide-react';

export default function BayplanSimulator({ 
  grid, 
  currentPort, 
  pendingContainers, 
  onPlaceContainer, 
  onRemoveContainer,
  activePorts,
  // New props for sidebar UI overhaul:
  gameMode,
  cargoPool = [],
  onAcceptCargo,
  onDeclineCargo,
  vesselLevel,
  onUpgradeVessel,
  cumulativeGrossRevenue,
  activeOfflinePlayerName,
  onDepart,
  loading,
  isGameOver,
  isReadyCurrent,
  onToggleReadyOnline,
  onOpenTariff
}) {
  const [selectedPendingId, setSelectedPendingId] = useState(null);
  const [isDashboardExpanded, setIsDashboardExpanded] = useState(false);
  const [isGuideExpanded, setIsGuideExpanded] = useState(true);
  const [activeOrderIndex, setActiveOrderIndex] = useState(0);
  const nextPort = getNextPort(currentPort, activePorts);

  // Local helper to determine if a container is a restow blocker in real-time
  const checkIsRestowBlocker = (bay, row, tier, container) => {
    if (!container || container.destination === nextPort) return false;
    
    const stack = grid?.[bay]?.[row];
    if (!stack) return false;
    const tiers = getBayConfig(bay).tiers; // top to bottom (84, 82, 02)
    const currentTierIdx = tiers.indexOf(tier);
    if (currentTierIdx === -1) return false;
    
    // Check if there is ANY next-port container below this container in the stack
    // Larger indices in config.tiers represent lower physical positions
    for (let i = currentTierIdx + 1; i < tiers.length; i++) {
      const lowerContainer = stack[tiers[i]];
      if (lowerContainer && lowerContainer.destination === nextPort) {
        return true;
      }
    }
    return false;
  };

  // Drag and Drop handlers
  const handleDragStart = (e, containerId) => {
    e.dataTransfer.setData('text/plain', containerId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, bay, row, tier) => {
    e.preventDefault();
    const containerId = e.dataTransfer.getData('text/plain');
    if (containerId) {
      if (grid?.[bay]?.[row]?.[tier] !== null && grid?.[bay]?.[row]?.[tier] !== undefined) return;
      onPlaceContainer(containerId, bay, row, tier);
    }
  };

  // Click-to-place fallback handlers
  const handlePendingClick = (id) => {
    setSelectedPendingId(selectedPendingId === id ? null : id);
  };

  // Find container in pending list. Doubles as "is the selection still
  // valid" - once a placed container actually leaves the buffer (a
  // successful server round-trip), this naturally goes undefined and the
  // selection stops being actionable, with no need to explicitly clear
  // selectedPendingId anywhere.
  const activeSelectedContainer = pendingContainers.find(c => c.id === selectedPendingId);

  const handleSlotClick = (bay, row, tier) => {
    const containerInSlot = grid?.[bay]?.[row]?.[tier];

    if (containerInSlot) {
      // Transit cargo is locked in the vessel and cannot be removed
      if (containerInSlot.origin !== currentPort) {
        return;
      }
      // Slot occupied: Remove container and return to pending
      onRemoveContainer(bay, row, tier);
    } else if (activeSelectedContainer) {
      // Slot empty and container selected: Place container.
      onPlaceContainer(selectedPendingId, bay, row, tier);
    }
  };

  if (!grid) {
    return (
      <div className="w-full p-12 text-center text-white/80 font-bold bg-white/10 rounded-2xl animate-pulse">
        Memuat grid kapal...
      </div>
    );
  }

  // Bow first: bay numbers ascend from bow to stern
  const baysToRender = Object.keys(grid).sort((a, b) => parseInt(a) - parseInt(b));

  // Display order for a bay cross-section viewed from aft looking forward:
  // port (even rows, outermost first) on the left, centre 00, starboard (odd
  // rows) on the right. Display-only - the shared config order is untouched
  // because the server and research agents iterate it.
  const toDisplayRows = (rows) => {
    const even = rows.filter(r => r !== '00' && parseInt(r) % 2 === 0).sort((a, b) => parseInt(b) - parseInt(a));
    const odd = rows.filter(r => parseInt(r) % 2 === 1).sort((a, b) => parseInt(a) - parseInt(b));
    return [...even, ...rows.filter(r => r === '00'), ...odd];
  };

  // Compute dynamic slot capacity
  const totalSlots = Object.keys(grid).reduce((acc, bay) => {
    const config = getBayConfig(bay);
    return acc + (config.rows.length * config.tiers.length);
  }, 0);

  // Compute occupied slots total & by container type (DRY vs REEFER)
  const { occupiedSlotsCount, dryOccupied, dryTotal, reeferOccupied, reeferTotal } = Object.keys(grid).reduce((acc, bay) => {
    const config = getBayConfig(bay);
    const baySlots = config.rows.length * config.tiers.length;
    let count = 0;
    config.rows.forEach(row => {
      config.tiers.forEach(tier => {
        if (grid?.[bay]?.[row]?.[tier]) {
          count++;
        }
      });
    });
    acc.occupiedSlotsCount += count;
    if (config.containerType === 'REEFER') {
      acc.reeferOccupied += count;
      acc.reeferTotal += baySlots;
    } else {
      acc.dryOccupied += count;
      acc.dryTotal += baySlots;
    }
    return acc;
  }, { occupiedSlotsCount: 0, dryOccupied: 0, dryTotal: 0, reeferOccupied: 0, reeferTotal: 0 });
  const occupancyPercentage = totalSlots > 0 ? Math.round((occupiedSlotsCount / totalSlots) * 100) : 0;

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-6 animate-slide-up">
      {/* 1. Sidebar Control Panel */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        {/* Navigation & Sailing Control Card */}
        <div className="glass-panel p-4.5 bg-gradient-to-br from-white to-slate-50/50 border border-slate-200/90 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[8.5px] text-indigo-500 font-extrabold tracking-widest uppercase block mb-1">
                🛳️ KAPTEN AKTIF
              </span>
              <h4 className="font-extrabold text-[13px] text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                {gameMode === 'ONLINE' ? 'Anda' : (activeOfflinePlayerName || 'Captain')}
              </h4>
            </div>
            <div className="bg-white/90 border border-slate-150 shadow-inner px-3 py-1.5 rounded-xl text-right relative overflow-hidden">
              <span className="text-[7.5px] text-slate-400 font-black tracking-wider uppercase block mb-0.5">
                PORT SEKARANG
              </span>
              <span className="font-black text-xs uppercase text-slate-700 flex items-center justify-end gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {currentPort}
              </span>
            </div>
          </div>
          
          {/* Depart / Ready Button */}
          {gameMode === 'ONLINE' ? (
            <button
              onClick={onToggleReadyOnline}
              disabled={loading || isGameOver}
              className={`w-full flex items-center justify-center gap-2 disabled:opacity-50 text-white font-black text-xs py-3.5 px-4 rounded-xl uppercase tracking-widest shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${
                isReadyCurrent 
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-rose-200' 
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-205'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-white animate-pulse" />
              {loading ? 'Mengirim...' : (isReadyCurrent ? 'Batal Siap' : 'Siap Berlayar')}
            </button>
          ) : (
            <button
              onClick={onDepart}
              disabled={loading || isGameOver}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-650 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:from-slate-200 disabled:to-slate-300 disabled:opacity-40 text-white font-black text-xs py-3.5 px-4 rounded-xl uppercase tracking-widest shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300"
            >
              <Play className={`w-3.5 h-3.5 fill-white ${loading ? 'animate-pulse' : ''}`} />
              {loading ? `Berlayar ke ${nextPort}...` : 'Berangkat (Sailing)'}
            </button>
          )}

          {/* Capacity & Destination Legends */}
          <div className="border-t border-slate-100 pt-3 mt-1 flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Ship className="w-3.5 h-3.5 text-spil-green animate-pulse" />
                Vessel Capacity Status
              </span>
              <span className="font-extrabold text-slate-700">{occupiedSlotsCount} / {totalSlots} Slot ({occupancyPercentage}%)</span>
            </div>
            
            {/* Occupancy Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 border border-slate-200/70 overflow-hidden relative shadow-inner">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
              ></div>
            </div>

            {/* Quota breakdown DRY vs REEFER */}
            <div className="grid grid-cols-2 gap-2 text-[9px] font-black">
              <div className="bg-amber-50/80 border border-amber-200/70 p-1.5 rounded-lg flex items-center justify-between">
                <span className="text-amber-800 uppercase">DRY:</span>
                <span className="text-amber-900">{dryOccupied} / {dryTotal}</span>
              </div>
              <div className="bg-sky-50/80 border border-sky-200/70 p-1.5 rounded-lg flex items-center justify-between">
                <span className="text-sky-800 uppercase">REEFER:</span>
                <span className="text-sky-900">{reeferOccupied} / {reeferTotal}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 select-none">
              <span className="text-[7.5px] uppercase text-slate-400 font-black tracking-widest block">Cargo Route Targets:</span>
              <div className="grid grid-cols-4 gap-1">
                <span className="flex items-center justify-center gap-1 py-1 rounded-lg bg-white text-emerald-800 border border-slate-200/80 font-black text-[9px] shadow-sm hover:border-emerald-300 transition-all">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> SBY
                </span>
                <span className="flex items-center justify-center gap-1 py-1 rounded-lg bg-white text-sky-850 border border-slate-200/80 font-black text-[9px] shadow-sm hover:border-sky-300 transition-all">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span> MKS
                </span>
                <span className="flex items-center justify-center gap-1 py-1 rounded-lg bg-white text-purple-850 border border-slate-200/80 font-black text-[9px] shadow-sm hover:border-purple-300 transition-all">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> JYP
                </span>
                <span className="flex items-center justify-center gap-1 py-1 rounded-lg bg-white text-orange-850 border border-slate-200/80 font-black text-[9px] shadow-sm hover:border-orange-300 transition-all">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> MDN
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ISO 9711 Guide Card (Collapsible, Beautified) */}
        <div className="glass-panel bg-white border border-slate-200/90 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl flex flex-col overflow-hidden">
          <button 
            type="button"
            onClick={() => setIsGuideExpanded(!isGuideExpanded)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <Info className="w-3.5 h-3.5 text-indigo-650 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">
                  Standar Stowage (ISO 9711)
                </h3>
                <span className="text-[7.5px] text-slate-400 font-bold block uppercase mt-0.5 tracking-wider">
                  Sistem Koordinat Bay-Row-Tier
                </span>
              </div>
            </div>
            {isGuideExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {isGuideExpanded && (
            <div className="p-4 border-t border-slate-100/80 flex flex-col gap-3 animate-slide-up bg-slate-50/20 text-slate-650 font-medium">
              {/* Bay row */}
              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-gradient-to-br from-indigo-50/30 to-white border border-indigo-100/60 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[8.5px] font-black text-indigo-700 bg-indigo-50/80 border border-indigo-200/70 px-2 py-0.5 rounded-md tracking-wider">
                    BAY (Posisi Lambung)
                  </span>
                  <span className="text-[7.5px] font-black text-indigo-400 uppercase tracking-widest">DEPAN → BELAKANG</span>
                </div>
                <p className="text-[10px] leading-relaxed text-slate-600 mt-0.5">
                  Nomor ganjil/genap berurutan dari depan kapal (<strong className="text-indigo-800">Bow</strong>) ke belakang (<strong className="text-indigo-800">Stern</strong>).
                </p>
               </div>

              {/* Row row */}
              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-gradient-to-br from-emerald-50/30 to-white border border-emerald-100/60 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[8.5px] font-black text-emerald-700 bg-emerald-50/80 border border-emerald-200/70 px-2 py-0.5 rounded-md tracking-wider">
                    ROW (Baris Melintang)
                  </span>
                  <span className="text-[7.5px] font-black text-emerald-400 uppercase tracking-widest">KIRI / KANAN</span>
                </div>
                <p className="text-[10px] leading-relaxed text-slate-600 mt-0.5">
                  Baris melintang dari garis tengah. <span className="bg-emerald-50 text-emerald-800 px-1 py-0.2 rounded font-black text-[9px]">Ganjil</span> = Kanan (Starboard), <span className="bg-emerald-50 text-emerald-800 px-1 py-0.2 rounded font-black text-[9px]">Genap</span> = Kiri (Port), <span className="bg-emerald-50 text-emerald-800 px-1 py-0.2 rounded font-black text-[9px]">00</span> = Center.
                </p>
              </div>

              {/* Tier row */}
              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-gradient-to-br from-amber-50/30 to-white border border-amber-100/60 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[8.5px] font-black text-amber-700 bg-amber-50/80 border border-amber-200/70 px-2 py-0.5 rounded-md tracking-wider">
                    TIER (Tingkat Tinggi)
                  </span>
                  <span className="text-[7.5px] font-black text-amber-400 uppercase tracking-widest">VERTICAL HEIGHT</span>
                </div>
                <p className="text-[10px] leading-relaxed text-slate-600 mt-0.5">
                  Tingkat tinggi kontainer (nomor genap). <span className="bg-amber-50 text-amber-800 px-1 py-0.2 rounded font-black text-[9px]">02</span> = Di bawah palka (Hold). <span className="bg-amber-50 text-amber-800 px-1 py-0.2 rounded font-black text-[9px]">82, 84</span> = Di atas dek (Deck).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Marketplace (Pasar Kargo) Card */}
        <div className="glass-panel p-4 bg-white border border-slate-200/90 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl flex flex-col justify-between gap-3">
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <div className="p-1 rounded-lg bg-indigo-50 border border-indigo-100">
                <PhoneCall className="w-3.5 h-3.5 text-indigo-650 animate-pulse" />
              </div>
              Pasar Kargo (Sales Call)
            </h3>
            <div className="flex items-center gap-1.5">
              {onOpenTariff && (
                <button
                  type="button"
                  onClick={onOpenTariff}
                  className="text-[8px] font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all"
                  title="Buka Lembar Informasi Tarif PT. SPIL"
                >
                  <FileText className="w-2.5 h-2.5" /> Tarif
                </button>
              )}
              <span className="text-[8px] font-black text-indigo-750 bg-indigo-50 border border-indigo-150/60 px-2 py-0.5 rounded-full shadow-sm">
                {cargoPool.length} Kontrak
              </span>
            </div>
          </div>

          {cargoPool.length === 0 ? (
            <div className="py-8 text-center text-slate-400 font-bold text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Ship className="w-8 h-8 mx-auto text-slate-350 mb-2" />
              Pasar Kargo Kosong
              <span className="text-[8.5px] text-slate-400 block mt-0.5 uppercase font-black tracking-wider">Kapal siap diberangkatkan!</span>
            </div>
          ) : (() => {
            const safeOrderIndex = Math.min(activeOrderIndex, Math.max(0, cargoPool.length - 1));
            const activeOrder = cargoPool[safeOrderIndex];
            if (!activeOrder) return null;
            const isCommitted = activeOrder.customerType === 'Committed';
            const isReefer = activeOrder.containerType === 'REEFER';
            const isNextPort = activeOrder.destination === nextPort;
            
            return (
              <div 
                className={`rounded-xl p-3.5 border-t border-b border-r border-l-4 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between ${
                  isCommitted 
                    ? 'border-slate-200/90 border-l-spil-red bg-gradient-to-br from-rose-50/30 via-white to-white'
                    : 'border-slate-200/90 border-l-spil-green bg-gradient-to-br from-emerald-50/20 via-white to-white'
                }`}
              >
                {/* Contract Navigator pagination */}
                {cargoPool.length > 1 && (
                  <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-100/80 text-[8.5px]">
                    <span className="font-extrabold text-slate-400 uppercase tracking-wider">
                      Kontrak {safeOrderIndex + 1} dari {cargoPool.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveOrderIndex(prev => (prev > 0 ? prev - 1 : cargoPool.length - 1))}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
                        title="Kontrak Sebelumnya"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveOrderIndex(prev => (prev < cargoPool.length - 1 ? prev + 1 : 0))}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
                        title="Kontrak Berikutnya"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="truncate">
                    <h4 className="text-[11px] font-extrabold text-slate-800 truncate" title={activeOrder.customerName}>
                      {activeOrder.customerName}
                    </h4>
                    <span className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                      Ref Code: {activeOrder.id.split('_').slice(-2).join('-')}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    {isCommitted ? (
                      <span className="text-[7.5px] font-black tracking-widest px-2 py-0.5 rounded bg-spil-red text-white uppercase shadow-sm">
                        COMMITTED
                      </span>
                    ) : (
                      <span className="text-[7.5px] font-black tracking-widest px-2 py-0.5 rounded bg-sky-50 border border-sky-150 text-sky-700 uppercase shadow-sm">
                        NON-COMMITTED
                      </span>
                    )}
                    <span className={`text-[7px] font-black tracking-wider px-1.5 py-0.5 rounded uppercase ${
                      isNextPort 
                        ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                        : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                    }`}>
                      {isNextPort ? '⚡ NEXT PORT' : '⚓ LATER PORT'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/50 mb-3 text-[10px]">
                  <div>
                    <span className="text-[7px] text-slate-400 font-black block uppercase tracking-wider">
                      CARGO TIPE / QTY
                    </span>
                    <span className={`font-black uppercase flex items-center gap-1 mt-0.5 ${isReefer ? 'text-sky-700' : 'text-amber-700'}`}>
                      {activeOrder.containerType}
                      <span className="text-slate-500 font-extrabold">({activeOrder.quantity}x)</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[7px] text-slate-400 font-black block uppercase tracking-wider">
                      DESTINATION PORT
                    </span>
                    <span className="font-black text-slate-700 uppercase truncate block mt-0.5">
                      {activeOrder.destination}
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-200/70 flex justify-between items-center mt-1">
                    <span className="text-[7px] text-slate-400 font-black uppercase tracking-wider">
                      TENTATIF UANG TAMBANG
                    </span>
                    <span className="font-black text-emerald-700 text-[10.5px]">
                      {formatRupiah(activeOrder.tariff)} / unit
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => onAcceptCargo(activeOrder.id)}
                    className={`flex-grow py-2 text-[9px] font-black rounded-lg shadow-sm border border-transparent transition-all duration-300 uppercase tracking-widest text-white hover:scale-[1.01] hover:shadow active:scale-95 flex items-center justify-center gap-1 ${
                      isCommitted
                        ? 'bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 shadow-rose-100'
                        : 'bg-gradient-to-r from-emerald-650 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-100'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                    Klaim Kontrak
                  </button>
                  
                  {!isCommitted ? (
                    <button
                      onClick={() => onDeclineCargo(activeOrder.id)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-spil-red hover:scale-[1.02] active:scale-95 transition-all duration-200 shrink-0 shadow-sm"
                      title="Tolak Penawaran"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div 
                      className="p-2 bg-rose-50/50 border border-rose-150 text-spil-red rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                      title="Kontrak committed wajib diambil."
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>        {/* Buffer Area (Staging Yard) Card */}
        <div className="glass-panel p-4 bg-white border border-slate-200/90 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col flex-grow min-h-[220px] max-h-[300px] overflow-hidden gap-2">
          <div className="mb-1 flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <div className="p-1 rounded-lg bg-emerald-50 border border-emerald-100">
                <span className="text-xs">📥</span>
              </div>
              Buffer Kargo
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[7.5px] font-black text-emerald-800 bg-emerald-50 border border-emerald-150/70 px-2 py-0.5 rounded-full shadow-inner">
                {pendingContainers.length} Kontainer
              </span>
              {selectedPendingId && (
                <button 
                  onClick={() => setSelectedPendingId(null)}
                  className="text-[8px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold px-2 py-0.5 rounded-md border border-slate-300 shadow-sm hover:scale-[1.01] active:scale-95 transition-all"
                >
                  BATAL
                </button>
              )}
            </div>
          </div>
          
          <p className="text-[7.5px] text-slate-400 font-black mb-1 leading-relaxed uppercase tracking-wider select-none">
            Klik / Seret kontainer untuk dimuat ke kapal:
          </p>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {pendingContainers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-8 border-2 border-dashed border-slate-250/70 rounded-xl bg-slate-50/30">
                <Sparkles className="w-5 h-5 mb-1.5 text-slate-350 animate-pulse" />
                Buffer Kosong
                <span className="text-[8px] text-slate-400 mt-0.5 block uppercase font-black tracking-wider">
                  Silakan klaim kargo di pasar kargo.
                </span>
              </div>
            ) : (
              pendingContainers.map(container => {
                const isSelected = selectedPendingId === container.id;
                const isReefer = container.containerType === 'REEFER';
                const dest = container.destination;
                
                // Color codes matching port destinations for left bar
                let portColorBar = 'bg-slate-300';
                if (dest === 'SBY') portColorBar = 'bg-emerald-500';
                else if (dest === 'MKS') portColorBar = 'bg-sky-500';
                else if (dest === 'JYP') portColorBar = 'bg-purple-500';
                else if (dest === 'MDN') portColorBar = 'bg-orange-500';
                
                return (
                  <div
                    key={container.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, container.id)}
                    onClick={() => handlePendingClick(container.id)}
                    className={`cursor-pointer rounded-xl p-2.5 border transition-all duration-255 select-none relative overflow-hidden text-[9.5px] shadow-sm hover:translate-x-1 hover:shadow-md ${
                      isSelected 
                        ? 'bg-emerald-50/40 border-emerald-500 ring-2 ring-emerald-500/30 scale-[0.98]'
                        : 'bg-white hover:bg-slate-50/50 border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    {/* Left port color accent bar */}
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${portColorBar}`}></div>

                    <div className="flex justify-between items-center mb-1.5 pl-2">
                      <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                        isReefer 
                          ? 'bg-sky-50 text-sky-700 border border-sky-200/60 shadow-sm' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200/60 shadow-sm'
                      }`}>
                        {container.containerType}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className={`text-[6.5px] font-black px-1 py-0.2 rounded uppercase ${
                          container.destination === nextPort
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                        }`}>
                          {container.destination === nextPort ? '⚡ NEXT PORT' : '⚓ LATER PORT'}
                        </span>
                        <span className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider">
                          BOX: {container.id.split('_').slice(-2).join('-')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end mt-1 pl-2">
                      <div>
                        <span className="text-[7.5px] text-slate-400 block uppercase font-extrabold tracking-wider select-none">
                          PELABUHAN TUJUAN
                        </span>
                        <span className="text-[11px] font-extrabold text-slate-700 uppercase leading-none mt-0.5 block">
                          {container.destination}
                        </span>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-[7.5px] text-slate-400 block uppercase font-extrabold tracking-wider select-none">
                          UANG TAMBANG
                        </span>
                        <span className="text-[10px] font-extrabold text-emerald-700 leading-none block mt-0.5">
                          {formatRupiah(container.tariff).split('.')[0]} Jt
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {activeSelectedContainer && (
            <div className="mt-1 bg-emerald-50/70 border border-emerald-150 p-2.5 rounded-xl text-[9.5px] flex gap-2 items-start shadow-sm animate-fade-in">
              <Info className="w-3.5 h-3.5 text-spil-green shrink-0 mt-0.5 animate-pulse" />
              <div className="text-slate-655 font-bold leading-normal">
                Stow {activeSelectedContainer.containerType} ke <strong className="text-slate-800 uppercase">{activeSelectedContainer.destination}</strong>. Klik pada slot kapal untuk memuat.
              </div>
            </div>
          )}
        </div>
        {/* Vessel Upgrade & Route Milestones Collapsible Panel */}
        <div className="glass-panel bg-white border border-slate-200/90 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl flex flex-col overflow-hidden">
          {/* Header Toggle */}
          <button 
            type="button"
            onClick={() => setIsDashboardExpanded(!isDashboardExpanded)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-650" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">
                  Upgrade & Rute
                </h3>
                <span className="text-[7.5px] text-slate-400 font-bold block uppercase mt-0.5 tracking-wider">
                  Kapal Lvl {vesselLevel || 1} • 4 Jalur Pelayaran Resmi
                </span>
              </div>
            </div>
            {isDashboardExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Expanded Content */}
          {isDashboardExpanded && (
            <div className="p-4 border-t border-slate-100 flex flex-col gap-4 animate-slide-up text-xs bg-slate-50/20">
              {/* Vessel Upgrade Panel */}
              <div className="p-3 bg-gradient-to-br from-indigo-50/30 to-white border border-indigo-100/60 rounded-xl shadow-sm">
                <span className="text-[8px] text-indigo-700 bg-indigo-50/70 border border-indigo-200/70 px-2 py-0.5 rounded-md font-black tracking-widest uppercase block mb-2 w-max">
                  ⚙️ VESSEL UPGRADE SYSTEM
                </span>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mb-3">
                  {vesselLevel === 1 && 'Level 1: Kapal Kecil (3 Bay, 36 Slot). Upgrade ke Lvl 2 untuk menambah Bay 18 & 14.'}
                  {vesselLevel === 2 && 'Level 2: Kapal Sedang (5 Bay, 54 Slot). Upgrade ke Lvl 3 untuk menambah Bay 26 & 22.'}
                  {vesselLevel === 3 && 'Level 3: Kapal Besar (7 Bay, 78 Slot - Maksimum).'}
                </p>
                {gameMode === 'OFFLINE' ? (
                  vesselLevel < 3 ? (
                    <button
                      onClick={onUpgradeVessel}
                      className="w-full bg-gradient-to-r from-indigo-650 to-indigo-700 hover:from-indigo-700 hover:to-indigo-850 text-white font-extrabold text-[9.5px] py-2 px-3 rounded-lg uppercase tracking-widest shadow-sm flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] hover:shadow active:scale-95"
                    >
                      <span>Upgrade Lvl {vesselLevel + 1}</span>
                      <span className="bg-indigo-850 px-1.5 py-0.5 rounded text-[8px] font-black shadow-inner">
                        {vesselLevel === 1 ? 'Rp 50M' : 'Rp 100M'}
                      </span>
                    </button>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-150 p-2 rounded-lg text-center text-[8.5px] font-black text-emerald-800 uppercase tracking-widest shadow-inner">
                      ✅ Kapal Ukuran Maksimal
                    </div>
                  )
                ) : (
                  <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-center text-[8.5px] font-black text-slate-400 uppercase tracking-widest shadow-inner">
                    🔒 Upgrade Hanya di Offline
                  </div>
                )}
              </div>

              {/* Rotasi Sirkuit Pelayaran SPIL (4 Jalur) */}
              <div className="border-t border-slate-100/80 pt-3.5 flex flex-col gap-3">
                <span className="text-[8px] text-slate-450 font-black tracking-widest uppercase block border-l-2 border-spil-green pl-2">
                  🚢 ROTASI SIRKUIT SPIL (4 JALUR RESMI)
                </span>
                
                {/* Circuit listing */}
                <div className="space-y-1.5">
                  {[
                    { code: 'SBY', name: 'Surabaya (Tanjung Perak)' },
                    { code: 'MKS', name: 'Makassar (Soekarno-Hatta)' },
                    { code: 'JYP', name: 'Jayapura (Pel. Jayapura)' },
                    { code: 'MDN', name: 'Medan (Belawan)' }
                  ].map((portItem) => {
                    const isCurrent = currentPort === portItem.code;
                    const isNext = nextPort === portItem.code;
                    return (
                      <div 
                        key={portItem.code} 
                        className={`flex justify-between items-center p-2 rounded-xl border text-[10px] transition-all duration-200 ${
                          isCurrent 
                            ? 'bg-emerald-50 border-emerald-300 font-extrabold text-emerald-900 shadow-sm' 
                            : isNext
                            ? 'bg-blue-50/80 border-blue-200 text-blue-900 font-semibold'
                            : 'bg-white/60 border-slate-150 text-slate-600'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 font-bold">
                          <span className="font-mono text-[9px] px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">{portItem.code}</span>
                          <span className="truncate max-w-[130px]">{portItem.name}</span>
                        </span>
                        {isCurrent ? (
                          <span className="text-[7.5px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-md uppercase tracking-wider">SAAT INI</span>
                        ) : isNext ? (
                          <span className="text-[7.5px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-md uppercase tracking-wider">BERIKUTNYA</span>
                        ) : (
                          <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">TRANSIT</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-1 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-950 p-2.5 rounded-xl text-center text-[9px] text-slate-400 font-bold leading-tight shadow-md">
                  PENDAPATAN KUMULATIF:<br/>
                  <strong className="text-white text-xs block mt-1 tracking-wide font-black">{formatRupiah(cumulativeGrossRevenue || 0)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Vessel Bayplan Simulator Canvas */}
      <div className="lg:col-span-3 flex flex-col gap-6 overflow-x-auto">
        {/* Orientation Guidance Bar (ISO 9711) */}
        <div className="flex justify-between items-center bg-white border border-slate-200/90 px-4 py-2 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest shadow-sm select-none">
          <span className="flex items-center gap-1.5 text-indigo-700">
            <Ship className="w-3.5 h-3.5" /> HALUAN / BOW (DEPAN KAPAL)
          </span>
          <span className="text-slate-350 font-extrabold hidden md:inline">
            BAY DARI ATAS KE BAWAH · PENAMPANG TAMPAK DARI BURITAN (KIRI = PORT)
          </span>
          <span className="flex items-center gap-1.5 text-slate-700">
            BURITAN / STERN (BELAKANG KAPAL) ⚓
          </span>
        </div>

        {/* Each bay card needs ~720px to show all 4 rows legibly, wider than
            a phone screen - this scrolls sideways within its own box rather
            than shrinking the grid into illegible slots. Hint is mobile-only
            since desktop/tablet already show the full width. */}
        <p className="sm:hidden text-[10px] text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1.5 -mb-2">
          <span aria-hidden="true">↔️</span> Geser ke samping untuk lihat semua baris kapal
        </p>
        {/* Scrollable container grid workspace */}
        <div className="flex flex-col gap-6 pb-4 min-w-[720px] max-h-[1100px] overflow-y-auto pr-3 scrollbar-thin">
          {baysToRender.map((bay, idx) => {
            const config = getBayConfig(bay);
            const isReeferBay = config.containerType === 'REEFER';
            // Bays are numbered ascending from bow to stern (ISO 9711-1 and the
            // official stowage sheet glossary), so the lowest bay is the bow.
            const isBowBay = idx === 0;
            const isSternBay = idx === baysToRender.length - 1;
            
            return (
              <div 
                key={bay} 
                className="glass-panel p-5 bg-white border-t-4 border-t-slate-400 shadow-sm"
              >
                {/* Bay Header */}
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Anchor className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-slate-800 tracking-wider">
                          BAY {bay}
                        </h4>
                        {isBowBay && (
                          <span className="text-[7.5px] font-black bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.2 rounded uppercase">
                            HALUAN (BOW)
                          </span>
                        )}
                        {isSternBay && (
                          <span className="text-[7.5px] font-black bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.2 rounded uppercase">
                            BURITAN (STERN)
                          </span>
                        )}
                      </div>
                      <span className="text-[8px] text-slate-400 font-bold uppercase block mt-0.5">
                        Tipe: {config.containerType} | Rows: {toDisplayRows(config.rows).join(', ')} | Tiers: {config.tiers.join(', ')}
                      </span>
                    </div>
                  </div>
                                    <span className={`text-[8.5px] font-black px-2.5 py-1 rounded-md border ${
                    isReeferBay 
                      ? 'bg-sky-50 text-sky-700 border-sky-200 shadow-sm' 
                      : 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                  }`}>
                    {isReeferBay ? 'REEFER PLUG SLOTS' : 'DRY SLOTS'}
                  </span>
                </div>

                {/* Stacking Grid Rows */}
                <div className="flex flex-col gap-1.5 w-full">
                  {/* Rows headers with Port/Starboard Side indicators */}
                  <div className="grid grid-cols-5 text-center text-[9px] font-black text-slate-400 mb-1.5 uppercase select-none tracking-widest">
                    <div></div>
                    {toDisplayRows(config.rows).map(row => {
                      let sideLabel = '';
                      if (row === '00') sideLabel = '(Center)';
                      else if (parseInt(row) % 2 === 1) sideLabel = '(Stbd/Kanan)';
                      else if (parseInt(row) % 2 === 0) sideLabel = '(Port/Kiri)';
                      
                      return (
                        <div key={row} className="font-black flex flex-col items-center">
                          <span>Row {row}</span>
                          <span className="text-[7px] text-slate-400 font-extrabold tracking-normal normal-case">{sideLabel}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Render tiers from top to bottom */}
                  {config.tiers.map(tier => {
                    const isUnderdeck = tier === '02';
                    
                    return (
                      <Fragment key={tier}>
                        {/* Visual Hatch Cover Plate above Tier 02 */}
                        {isUnderdeck && (
                          <div className="col-span-5 flex items-center gap-2.5 my-2.5 py-1 px-3 bg-slate-100 border border-slate-250 rounded-lg shadow-sm">
                            <span className="text-[8px] font-black tracking-widest text-slate-600 uppercase select-none flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                              HATCH COVER DECK PLATE
                            </span>
                            <div className="flex-1 h-[2px] bg-slate-250"></div>
                            <ArrowDown className="w-3.5 h-3.5 text-slate-500 animate-bounce" />
                            <span className="text-[8px] font-black text-slate-600 tracking-widest select-none uppercase">
                              UNDERDECK HOLD
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-5 items-center gap-3 h-16">
                          {/* Left Column: Tier label */}
                          <div className="flex flex-col justify-center items-center h-full bg-slate-50 border border-slate-200 rounded-xl select-none">
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">
                              Tier {tier}
                            </span>
                            <span className="text-[8px] text-slate-400 font-bold block uppercase mt-0.5">
                              {isUnderdeck ? 'Hold' : 'Deck'}
                            </span>
                          </div>

                          {/* Grid slots data columns */}
                          {toDisplayRows(config.rows).map(row => {
                            const container = grid?.[bay]?.[row]?.[tier];
                            const isRestowed = checkIsRestowBlocker(bay, row, tier, container);
                            
                            // Style mappings
                            let bgClass = 'bg-slate-50/50 hover:bg-slate-50 border-slate-200 border-dashed hover:border-slate-300 text-slate-400';
                            let textClass = 'text-slate-400';
                            let borderClass = 'border-slate-200/80';
                            
                            if (container) {
                              const dest = container.destination;
                              if (dest === 'SBY') {
                                bgClass = 'bg-emerald-100/70 hover:bg-emerald-100 text-emerald-950 font-black';
                                textClass = 'text-emerald-900';
                                borderClass = 'border-emerald-350 shadow-sm';
                              } else if (dest === 'MKS') {
                                bgClass = 'bg-sky-100/70 hover:bg-sky-100 text-sky-950 font-black';
                                textClass = 'text-sky-900';
                                borderClass = 'border-sky-350 shadow-sm';
                              } else if (dest === 'JYP') {
                                bgClass = 'bg-purple-100/70 hover:bg-purple-100 text-purple-950 font-black';
                                textClass = 'text-purple-900';
                                borderClass = 'border-purple-350 shadow-sm';
                              } else if (dest === 'MDN') {
                                bgClass = 'bg-amber-100/70 hover:bg-amber-100 text-amber-950 font-black';
                                textClass = 'text-amber-900';
                                borderClass = 'border-amber-350 shadow-sm';
                              }
                            }

                            const isTargetSelectedSlot = selectedPendingId && !container;
                            const isTransit = container && container.origin !== currentPort;
                            
                            return (
                              <div
                                key={row}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, bay, row, tier)}
                                onClick={() => handleSlotClick(bay, row, tier)}
                                title={container ? (isTransit ? `Kargo Transit (${container.origin} → ${container.destination}) - Terkunci` : `Kargo dari ${container.origin} ke ${container.destination} - Klik untuk Bongkar`) : (isTargetSelectedSlot ? 'Klik untuk Letakkan Kontainer' : 'Slot Kosong')}
                                className={`relative h-full rounded-xl border flex flex-col justify-center items-center cursor-pointer transition-all duration-200 select-none ${bgClass} ${borderClass} ${
                                  isTargetSelectedSlot 
                                    ? 'border-dashed border-spil-green bg-emerald-50/80 animate-pulse'
                                    : ''
                                } ${
                                  isRestowed 
                                    ? 'border-spil-red border-2 shadow-md animate-border-pulse' 
                                    : ''
                                } ${
                                  isTransit ? 'opacity-90 saturate-[0.85]' : ''
                                }`}
                              >
                                {container ? (
                                  <>
                                    {/* Action overlays on hover */}
                                    {!isTransit ? (
                                      <div className="absolute top-1 right-1.5 opacity-0 hover:opacity-100 transition-opacity">
                                        <XCircle className="w-3.5 h-3.5 text-spil-red" />
                                      </div>
                                    ) : (
                                      <div className="absolute top-1 right-1.5 text-slate-400" title="Transit Cargo (Locked)">
                                        <Lock className="w-2.5 h-2.5" />
                                      </div>
                                    )}
                                    
                                    <div className="absolute top-1 left-2 text-[7.5px] font-black uppercase text-slate-500 select-none">
                                      {container.containerType}
                                    </div>
                                    
                                    <span className={`text-xs md:text-sm font-black tracking-widest ${textClass}`}>
                                      {container.destination}
                                    </span>
                                    
                                    <span className="text-[7.5px] font-extrabold text-slate-700 mt-0.5 leading-none">
                                      Rev: {formatRupiah(container.tariff).split('.')[0]} Jt
                                    </span>

                                    {/* Stripe patterns */}
                                    <div className={`absolute inset-0 rounded-xl pointer-events-none opacity-30 ${
                                      container.containerType === 'REEFER' ? 'reefer-pattern' : 'dry-pattern'
                                    }`}></div>

                                    {/* Floating warning icon for restowed container */}
                                    {isRestowed && (
                                      <div 
                                        className="absolute -top-1.5 -right-1.5 bg-spil-red border border-white shadow-md rounded-full p-0.5 text-white animate-bounce"
                                        title={`Restow Blocker! Menghalangi bongkar muat kargo ${nextPort} di pelabuhan berikutnya. Shifting fee Rp 3.000.000 / gerakan.`}
                                      >
                                        <ShieldAlert className="w-3 h-3" />
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  /* Empty slot placeholder */
                                  <span className="text-[9px] text-slate-400 font-extrabold opacity-60 tracking-wider">
                                    KOSONG
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
