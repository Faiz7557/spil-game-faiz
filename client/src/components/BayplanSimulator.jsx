import { useEffect, useState } from 'react';
import { getBayConfig, getNextPort, calculateCapacityMetrics } from '../utils/gameHelpers';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useElementSize } from '../hooks/useElementSize';
import CargoRail from './game/CargoRail';
import BayCrossSection from './game/BayCrossSection';
import ShipProfile from './game/ShipProfile';
import ReadinessBar from './game/ReadinessBar';
import { formatJt, rollingPenalty, RESTOW_PENALTY } from './game/gameUi';

// Display order for a bay cross-section viewed from aft looking forward:
// port (even rows, outermost first) on the left, centre 00, starboard (odd
// rows) on the right. Display-only - the shared config order is untouched
// because the server and research agents iterate it.
const toDisplayRows = (rows) => {
  const even = rows.filter((r) => r !== '00' && parseInt(r, 10) % 2 === 0).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  const odd = rows.filter((r) => parseInt(r, 10) % 2 === 1).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  return [...even, ...rows.filter((r) => r === '00'), ...odd];
};

export default function BayplanSimulator({
  grid,
  currentPort,
  pendingContainers,
  onPlaceContainer,
  onRemoveContainer,
  activePorts,
  gameMode,
  cargoPool = [],
  onAcceptCargo,
  onDeclineCargo,
  vesselLevel,
  onUpgradeVessel,
  cumulativeGrossRevenue,
  onDepart,
  loading,
  isGameOver,
  isReadyCurrent,
  onToggleReadyOnline,
  isDrainPhase = false,
  isSpectator = false,
  players,
  playerId
}) {
  const [selectedPendingId, setSelectedPendingId] = useState(null);
  const [placedHistory, setPlacedHistory] = useState([]);
  const [tab, setTab] = useState('offers');
  const [railOpen, setRailOpen] = useState(false);
  const [selectedBay, setSelectedBay] = useState(null);
  const [sectionRef, sectionSize] = useElementSize();

  const railSide = useMediaQuery('(min-width: 1024px)');
  const nextPort = getNextPort(currentPort, activePorts);
  const readOnly = isSpectator;

  const activeSelectedContainer = pendingContainers.find((c) => c.id === selectedPendingId) || null;

  const baysToRender = grid ? Object.keys(grid).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)) : [];
  const bay = baysToRender.includes(selectedBay) ? selectedBay : baysToRender[0];
  const bayIndex = baysToRender.indexOf(bay);

  // A container blocks a next-port box below it in the same stack -> restow.
  const isBlocker = (b, row, tier, container) => {
    if (!container || container.destination === nextPort) return false;
    const stack = grid?.[b]?.[row];
    if (!stack) return false;
    const tiers = getBayConfig(b).tiers;
    const idx = tiers.indexOf(tier);
    if (idx === -1) return false;
    for (let i = idx + 1; i < tiers.length; i++) {
      const lower = stack[tiers[i]];
      if (lower && lower.destination === nextPort) return true;
    }
    return false;
  };

  const placeContainer = (container, b, row, tier) => {
    setPlacedHistory((prev) => [...prev, { containerId: container.id, bay: b, row, tier }]);
    onPlaceContainer(container.id, b, row, tier);
    // Keep going with the same kind of box, like a planner working a batch.
    const rest = pendingContainers.filter((c) => c.id !== container.id);
    const next = rest.find((c) => c.destination === container.destination && c.containerType === container.containerType) || rest[0];
    setSelectedPendingId(next ? next.id : null);
  };

  const undo = () => {
    if (placedHistory.length === 0 || readOnly) return;
    const last = placedHistory[placedHistory.length - 1];
    onRemoveContainer(last.bay, last.row, last.tier);
    setPlacedHistory((prev) => prev.slice(0, -1));
  };

  // Ctrl+Z undoes the last placement, Escape drops the current selection.
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        undo();
      } else if (e.key === 'Escape') {
        setSelectedPendingId(null);
        setRailOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const slotIsPlaceable = (container, b, row, tier) => {
    if (!container || grid?.[b]?.[row]?.[tier]) return false;
    if (getBayConfig(b).containerType !== container.containerType) return false;
    if (tier === '84' && !grid?.[b]?.[row]?.['82']) return false;
    return true;
  };

  const handleCellClick = (b, row, tier) => {
    if (readOnly) return;
    const occupant = grid?.[b]?.[row]?.[tier];
    if (occupant) {
      if (occupant.origin !== currentPort) return; // transit cargo is locked
      onRemoveContainer(b, row, tier);
      setPlacedHistory((prev) => prev.filter((p) => !(p.bay === b && p.row === row && p.tier === tier)));
    } else if (slotIsPlaceable(activeSelectedContainer, b, row, tier)) {
      placeContainer(activeSelectedContainer, b, row, tier);
    }
  };

  const handleDropOnCell = (e, b, row, tier) => {
    e.preventDefault();
    if (readOnly) return;
    const id = e.dataTransfer.getData('text/plain');
    const container = pendingContainers.find((c) => c.id === id);
    if (slotIsPlaceable(container, b, row, tier)) placeContainer(container, b, row, tier);
  };

  const handleDragStart = (e, id) => e.dataTransfer.setData('text/plain', id);

  const handleSelect = (id) => {
    setSelectedPendingId(id);
    if (id && !railSide) setRailOpen(false);
  };

  const handleAccept = (orderId) => {
    onAcceptCargo(orderId);
    setTab('buffer');
    // Claimed boxes are named <order>_cont_<n>; start with the first one.
    setSelectedPendingId(`${orderId}_cont_0`);
    if (!railSide) setRailOpen(false);
  };

  if (!grid || !bay) {
    return <div className="p-12 text-center text-g-muted font-medium animate-pulse">Memuat grid kapal...</div>;
  }

  // ---- derived numbers -------------------------------------------------
  const metrics = calculateCapacityMetrics(grid, pendingContainers);
  const freeSlots = { DRY: metrics.dry.free, REEFER: metrics.reefer.free };

  let waitingRevenue = 0;
  let blockerCount = 0;
  baysToRender.forEach((b) => {
    const cfg = getBayConfig(b);
    cfg.rows.forEach((row) => cfg.tiers.forEach((tier) => {
      const c = grid[b]?.[row]?.[tier];
      if (!c) return;
      waitingRevenue += c.tariff || 0;
      if (isBlocker(b, row, tier, c)) blockerCount++;
    }));
  });

  const bayConfig = getBayConfig(bay);
  const displayRows = toDisplayRows(bayConfig.rows);
  let validCount = 0;
  if (activeSelectedContainer && !readOnly) {
    bayConfig.rows.forEach((row) => bayConfig.tiers.forEach((tier) => {
      if (slotIsPlaceable(activeSelectedContainer, bay, row, tier)) validCount++;
    }));
  }

  const committedOpen = cargoPool.filter((o) => o.customerType === 'Committed');
  const committedUnits = committedOpen.reduce((a, o) => a + o.quantity, 0);
  const committedPenalty = committedOpen.reduce((a, o) => a + o.quantity * rollingPenalty('Committed', o.containerType), 0);
  const bufferPenalty = pendingContainers.reduce((a, c) => a + rollingPenalty(c.customerType, c.containerType), 0);
  const blockerPenalty = blockerCount * RESTOW_PENALTY;
  const totalPenalty = committedPenalty + bufferPenalty + blockerPenalty;

  const checks = [
    {
      key: 'committed',
      num: committedUnits,
      label: 'Unit Committed',
      short: committedUnits ? 'belum diklaim' : 'semua diklaim',
      detail: committedOpen.length ? committedOpen.map((o) => `${o.customerName} ×${o.quantity}`).join(' · ') : 'Semua kontrak Committed sudah diklaim',
      value: committedPenalty ? `−${formatJt(committedPenalty)} jt` : 'Rp 0',
      bad: committedPenalty > 0
    },
    {
      key: 'rolled',
      num: pendingContainers.length,
      label: 'Box akan rolled',
      short: pendingContainers.length ? 'buffer belum dimuat' : 'buffer kosong',
      detail: pendingContainers.length ? `${pendingContainers.length} box akan tertinggal (rolled)` : 'Buffer kosong',
      value: bufferPenalty ? `−${formatJt(bufferPenalty)} jt` : 'Rp 0',
      bad: bufferPenalty > 0
    },
    {
      key: 'restow',
      num: blockerCount,
      tone: 'warn',
      label: 'Penghalang restow',
      short: blockerCount ? `ditagih saat sandar di ${nextPort}` : 'tidak ada',
      detail: blockerCount ? `${blockerCount} box menutupi kargo ${nextPort}` : `Tidak ada box yang menutupi kargo ${nextPort}`,
      value: blockerPenalty ? `−${formatJt(blockerPenalty)} jt` : 'Rp 0',
      bad: blockerPenalty > 0
    }
  ];

  const isOnline = gameMode === 'ONLINE';
  const penaltyHint = totalPenalty ? `Estimasi denda Rp ${formatJt(totalPenalty)} jt` : 'Tanpa denda yang terdeteksi';
  let depart;
  if (isSpectator) {
    depart = { label: 'Hanya menonton', sub: 'Mode penonton: semua kontrol nonaktif', disabled: true };
  } else if (isOnline) {
    depart = {
      label: loading ? 'Mengirim…' : isReadyCurrent ? 'Batal siap' : `Siap berlayar ke ${nextPort}`,
      sub: isReadyCurrent ? 'Menunggu pemain lain' : 'Kapal berangkat saat semua siap',
      variant: isReadyCurrent ? 'ready' : 'primary',
      disabled: loading || isGameOver,
      onClick: onToggleReadyOnline
    };
  } else {
    depart = {
      label: loading ? `Berlayar ke ${nextPort}…` : `Berangkat ke ${nextPort}`,
      sub: penaltyHint,
      variant: 'primary',
      disabled: loading || isGameOver,
      onClick: onDepart
    };
  }

  let advice;
  if (readOnly) advice = 'Mode penonton: susunan hanya bisa diamati.';
  else if (!activeSelectedContainer) {
    advice = pendingContainers.length
      ? 'Pilih box di buffer untuk melihat slot yang valid.'
      : 'Klaim tawaran dulu. Slot valid akan menyala hijau di penampang.';
  } else if (activeSelectedContainer.destination === nextPort) {
    advice = `Next port (${nextPort}): taruh di atas tumpukan agar tidak perlu restow. Ada ${validCount} slot valid di bay ${bay}.`;
  } else {
    advice = `Later port: taruh di bawah atau di atas box later port lain. Kuning = akan menutupi kargo ${nextPort}. ${validCount} slot valid di bay ${bay}.`;
  }

  // Players list for the rail (sorted by cash, current captain highlighted).
  const playerRows = Object.values(players || {})
    .sort((a, b) => b.cash - a.cash)
    .map((p, i) => ({
      id: p.id,
      rank: String(i + 1),
      name: p.name,
      me: p.id === playerId,
      cash: p.cash,
      sub: isOnline ? (p.ready ? 'siap berlayar' : 'menyusun…') : (p.isBot ? 'bot lawan' : 'kapten manusia')
    }));
  const myRank = playerRows.findIndex((p) => p.me) + 1;
  const playersLabel = isOnline ? 'Pemain' : 'Lawan';

  const totalSlots = baysToRender.reduce((a, b) => {
    const cfg = getBayConfig(b);
    return a + cfg.rows.length * cfg.tiers.length;
  }, 0);

  const railClass = railSide
    ? 'order-2 sticky top-[var(--g-header-h)] h-[calc(100vh-var(--g-header-h))]'
    : `fixed top-0 right-0 bottom-0 w-[min(380px,92vw)] z-[44] shadow-[-12px_0_32px_var(--g-shadow)] ${railOpen ? 'flex' : 'hidden'}`;

  return (
    <div className={railSide ? 'grid grid-cols-[minmax(0,1fr)_290px] xl:grid-cols-[minmax(0,1fr)_330px] items-start' : 'block'}>
      <CargoRail
        className={railClass}
        drawer={!railSide}
        onClose={() => setRailOpen(false)}
        tab={tab}
        onTab={setTab}
        playersLabel={playersLabel}
        badges={{
          offers: String(isDrainPhase ? 0 : cargoPool.length),
          buffer: String(pendingContainers.length),
          players: myRank ? `#${myRank}` : ''
        }}
        offers={{
          cargoPool,
          isDrainPhase,
          activePorts,
          currentPort,
          nextPort,
          freeSlots,
          gameMode,
          readOnly,
          onAccept: handleAccept,
          onDecline: onDeclineCargo
        }}
        buffer={{
          pendingContainers,
          selectedId: activeSelectedContainer ? activeSelectedContainer.id : null,
          nextPort,
          readOnly,
          onSelect: handleSelect,
          onDragStart: handleDragStart,
          canUndo: placedHistory.length > 0,
          onUndo: undo
        }}
        players={{ rows: playerRows, gameMode }}
        vessel={{
          vesselLevel,
          gameMode,
          readOnly,
          onUpgradeVessel,
          cumulativeGrossRevenue,
          activePorts,
          currentPort,
          nextPort
        }}
        selected={activeSelectedContainer}
        advice={advice}
      />

      {!railSide && railOpen && (
        <div className="fixed inset-0 z-[43] bg-[var(--g-scrim)]" onClick={() => setRailOpen(false)} aria-hidden="true" />
      )}
      {!railSide && !railOpen && (
        <button
          type="button"
          onClick={() => setRailOpen(true)}
          className="fixed left-1/2 -translate-x-1/2 bottom-[18px] z-[26] bg-g-inv text-g-inv-ink border border-g-inv rounded-full px-4 py-2.5 text-[13.5px] font-medium whitespace-nowrap shadow-[0_8px_24px_var(--g-shadow)]"
        >
          Tawaran {isDrainPhase ? 0 : cargoPool.length} · Buffer {pendingContainers.length}
        </button>
      )}

      <main
        ref={sectionRef}
        className="order-1 w-full max-w-[1320px] mx-auto flex flex-col gap-3.5 min-w-0 px-[clamp(10px,2vw,22px)] pt-3.5 pb-24 lg:pb-7"
      >
        <BayCrossSection
          bay={bay}
          bayIndex={bayIndex}
          bayCount={baysToRender.length}
          config={bayConfig}
          displayRows={displayRows}
          grid={grid}
          currentPort={currentPort}
          nextPort={nextPort}
          activePorts={activePorts}
          selected={readOnly ? null : activeSelectedContainer}
          readOnly={readOnly}
          width={sectionSize.width}
          isBlocker={isBlocker}
          validCount={validCount}
          onPrev={() => setSelectedBay(baysToRender[(bayIndex - 1 + baysToRender.length) % baysToRender.length])}
          onNext={() => setSelectedBay(baysToRender[(bayIndex + 1) % baysToRender.length])}
          onCellClick={handleCellClick}
          onDropOnCell={handleDropOnCell}
        />

        <ShipProfile
          bays={baysToRender}
          grid={grid}
          getConfig={getBayConfig}
          displayRows={toDisplayRows}
          selectedBay={bay}
          onSelectBay={setSelectedBay}
          isBlocker={isBlocker}
          totalSlots={totalSlots}
        />

        <ReadinessBar
          grid={grid}
          pendingContainers={pendingContainers}
          waitingRevenue={waitingRevenue}
          checks={checks}
          totalPenalty={totalPenalty}
          depart={depart}
        />
      </main>
    </div>
  );
}
