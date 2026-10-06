import { Anchor, RotateCcw } from 'lucide-react';
import { PortChip, TypeChip, ContractTag } from './Chips';
import { formatJt, rpJt, PORT_LONG_NAMES, portVars } from './gameUi';

const emptyNote = 'text-[13px] text-g-muted py-[18px] px-1.5 text-center [text-wrap:pretty]';

function OfferCard({ order, hop, free, isNext, readOnly, onAccept, onDecline }) {
  const committed = order.customerType === 'Committed';
  const short = order.quantity > free;
  return (
    <div className="border border-g-line rounded-[10px] px-3 py-[11px] flex flex-col gap-[7px] bg-g-surface">
      <div className="flex items-center gap-[7px] min-w-0">
        <ContractTag committed={committed} />
        <span className="text-[13.5px] font-medium whitespace-nowrap overflow-hidden text-ellipsis min-w-0" title={order.customerName}>
          {order.customerName}
        </span>
        <span className="ml-auto font-plex text-[13px] whitespace-nowrap">{rpJt(order.tariff * order.quantity)}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <PortChip port={order.destination} />
        <TypeChip type={order.containerType} />
        <span className="font-plex text-xs">×{order.quantity}</span>
        <span className="font-plex text-xs text-g-muted">{formatJt(order.tariff)}/box</span>
        <span className="text-xs text-g-muted">{hop} hop</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-[11.5px] ${short ? 'text-g-danger' : 'text-g-muted'}`}>
          {short
            ? `Hanya ${free} slot ${order.containerType} tersisa`
            : `${isNext ? 'Next port · taruh di atas' : 'Later port · taruh di bawah'} · ${free} slot`}
        </span>
        <span className="ml-auto flex gap-1.5">
          {!committed && !readOnly && (
            <button
              type="button"
              onClick={() => onDecline(order.id)}
              className="border border-g-line bg-g-surface hover:bg-g-tint rounded-[7px] px-2.5 py-[5px] text-[12.5px] text-g-ink2"
            >
              Tolak
            </button>
          )}
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onAccept(order.id)}
            className={`rounded-[7px] border px-3 py-[5px] text-[12.5px] ${
              readOnly
                ? 'border-g-sunk bg-g-tint text-g-faint cursor-not-allowed'
                : 'border-g-green bg-g-green text-white font-medium hover:bg-g-green-hover'
            }`}
          >
            Klaim
          </button>
        </span>
      </div>
    </div>
  );
}

function OffersPanel({ cargoPool, isDrainPhase, activePorts, currentPort, nextPort, freeSlots, gameMode, readOnly, onAccept, onDecline }) {
  if (isDrainPhase) {
    return (
      <div className="border border-g-line bg-g-warn-bg rounded-[10px] p-4 text-center flex flex-col items-center gap-1.5">
        <Anchor className="w-5 h-5 text-g-warn" />
        <span className="text-[13.5px] font-medium text-g-warn-ink">Masa pengosongan</span>
        <span className="text-[12.5px] text-g-ink2 [text-wrap:pretty]">
          Tidak ada tawaran baru. Selesaikan pelayaran agar pendapatan kargo di atas kapal diakui.
        </span>
      </div>
    );
  }
  const route = activePorts && activePorts.length ? activePorts : ['SBY', 'MKS', 'JYP', 'MDN'];
  const hopOf = (dest) => {
    const from = route.indexOf(currentPort);
    const to = route.indexOf(dest);
    return from < 0 || to < 0 ? 0 : (to - from + route.length) % route.length;
  };
  return (
    <>
      {gameMode === 'ONLINE' && (
        <span className="text-xs text-g-info bg-g-info-bg rounded-[7px] px-[9px] py-1.5">
          Pasar bersama · kontrak yang diklaim pemain lain hilang dari daftar
        </span>
      )}
      {cargoPool.map((o) => (
        <OfferCard
          key={o.id}
          order={o}
          hop={hopOf(o.destination)}
          free={freeSlots[o.containerType] ?? 0}
          isNext={o.destination === nextPort}
          readOnly={readOnly}
          onAccept={onAccept}
          onDecline={onDecline}
        />
      ))}
      {cargoPool.length === 0 && <span className={emptyNote}>Semua tawaran sudah diputuskan. Kapal siap berangkat.</span>}
    </>
  );
}

function BufferPanel({ pendingContainers, selectedId, nextPort, readOnly, onSelect, onDragStart, canUndo, onUndo }) {
  return (
    <>
      {(canUndo || selectedId) && !readOnly && (
        <div className="flex gap-1.5 justify-end">
          {canUndo && (
            <button
              type="button"
              onClick={onUndo}
              title="Batalkan penempatan terakhir (Ctrl+Z)"
              className="flex items-center gap-1 text-xs border border-g-line bg-g-surface hover:bg-g-tint rounded-[7px] px-2.5 py-1 text-g-ink2"
            >
              <RotateCcw className="w-3 h-3" /> Urungkan
            </button>
          )}
          {selectedId && (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="text-xs border border-g-line bg-g-surface hover:bg-g-tint rounded-[7px] px-2.5 py-1 text-g-ink2"
            >
              Batal pilih
            </button>
          )}
        </div>
      )}
      {pendingContainers.map((c) => {
        const on = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            draggable={!readOnly}
            onDragStart={(e) => onDragStart(e, c.id)}
            onClick={() => !readOnly && onSelect(on ? null : c.id)}
            aria-pressed={on}
            title={c.id}
            className={`flex flex-col items-start gap-1 text-left w-full px-[11px] py-[9px] rounded-[9px] bg-g-surface ${
              on ? 'border-2 border-g-green bg-g-green-bg' : 'border border-g-line hover:bg-g-tint'
            } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className="flex items-center gap-1.5 w-full">
              <PortChip port={c.destination} />
              <TypeChip type={c.containerType} />
              <span className="ml-auto text-[11.5px] text-g-muted">
                {c.destination === nextPort ? 'Next port' : 'Later port'} · {c.customerType === 'Committed' ? 'Committed' : 'Opsional'}
              </span>
            </span>
            <span className="text-[12.5px] text-g-ink2">{c.customerName} · {formatJt(c.tariff)} jt</span>
          </button>
        );
      })}
      {pendingContainers.length === 0 && (
        <span className={emptyNote}>Buffer kosong. Klaim tawaran untuk memasukkan box ke sini.</span>
      )}
    </>
  );
}

function PlayersPanel({ rows, gameMode }) {
  return (
    <>
      <span className="text-xs text-g-muted">
        {gameMode === 'ONLINE'
          ? 'Kapal berangkat saat semua pemain siap atau waktu habis.'
          : 'Kas setiap kapten dibandingkan; gelar akhir dihitung dari bot yang Anda kalahkan.'}
      </span>
      {rows.map((p) => (
        <div
          key={p.id}
          className={`flex items-center gap-2.5 px-2.5 py-[9px] rounded-[9px] border ${
            p.me ? 'border-g-green-line bg-g-green-bg' : 'border-g-sunk bg-g-surface'
          }`}
        >
          <span className="font-plex text-xs text-g-muted w-4">{p.rank}</span>
          <span className="flex-1 min-w-0 text-[13.5px]">
            <span className="block truncate" title={p.name}>{p.name}{p.me ? ' · Anda' : ''}</span>
            <span className="block text-[11.5px] text-g-muted">{p.sub}</span>
          </span>
          <span className={`font-plex text-[13px] ${p.cash < 0 ? 'text-g-danger' : ''}`}>{formatJt(p.cash)}</span>
        </div>
      ))}
    </>
  );
}

function VesselPanel({ vesselLevel, gameMode, readOnly, onUpgradeVessel, cumulativeGrossRevenue, activePorts, currentPort, nextPort }) {
  const level = vesselLevel || 1;
  const info = {
    1: 'Level 1 · Kapal Kecil (3 bay, 36 slot). Upgrade ke level 2 menambah bay 18 dan 14.',
    2: 'Level 2 · Kapal Sedang (5 bay, 54 slot). Upgrade ke level 3 menambah bay 26 dan 22.',
    3: 'Level 3 · Kapal Besar (7 bay, 78 slot), ukuran maksimum.'
  }[level];
  const route = activePorts && activePorts.length ? activePorts : ['SBY', 'MKS', 'JYP', 'MDN'];
  return (
    <>
      <div className="border border-g-line rounded-[10px] p-3 bg-g-surface flex flex-col gap-2">
        <span className="font-medium text-[13.5px]">Upgrade kapal</span>
        <span className="text-[12.5px] text-g-muted [text-wrap:pretty]">{info}</span>
        {gameMode === 'OFFLINE' ? (
          level < 3 ? (
            <button
              type="button"
              onClick={onUpgradeVessel}
              disabled={readOnly}
              className="border border-g-green bg-g-green hover:bg-g-green-hover text-white rounded-lg px-3 py-2 text-[13px] font-medium flex items-center justify-between disabled:opacity-50"
            >
              Upgrade ke level {level + 1}
              <span className="font-plex text-xs">{level === 1 ? 'Rp 50 jt' : 'Rp 100 jt'}</span>
            </button>
          ) : (
            <span className="text-xs text-g-green-ink bg-g-green-bg border border-g-green-line rounded-lg px-2.5 py-1.5 text-center">Ukuran maksimum</span>
          )
        ) : (
          <span className="text-xs text-g-muted bg-g-tint border border-g-sunk rounded-lg px-2.5 py-1.5 text-center">Upgrade hanya tersedia di mode offline</span>
        )}
      </div>

      <div className="border border-g-line rounded-[10px] p-3 bg-g-surface flex flex-col gap-1.5">
        <span className="font-medium text-[13.5px]">Rotasi sirkuit SPIL</span>
        {route.map((port) => {
          const isCurrent = port === currentPort;
          const isNext = port === nextPort;
          return (
            <div
              key={port}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[13px] ${
                isCurrent ? 'border-g-green-line bg-g-green-bg font-medium' : 'border-g-sunk'
              }`}
            >
              <PortChip port={port} />
              <span className="truncate">{PORT_LONG_NAMES[port] || port}</span>
              <span className="ml-auto text-[11.5px]" style={{ color: isCurrent ? 'var(--g-green-ink)' : isNext ? portVars(port).ink : 'var(--g-muted)' }}>
                {isCurrent ? 'sandar' : isNext ? 'berikutnya' : 'transit'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="border border-g-sunk rounded-[10px] px-3 py-2.5 bg-g-tint flex justify-between items-baseline gap-2">
        <span className="text-xs text-g-muted">Pendapatan kumulatif</span>
        <span className="font-plex text-[13px] text-g-green-ink">{rpJt(cumulativeGrossRevenue || 0)}</span>
      </div>
    </>
  );
}

export default function CargoRail({
  tab,
  onTab,
  badges,
  playersLabel,
  offers,
  buffer,
  players,
  vessel,
  selected,
  advice,
  drawer,
  onClose,
  className = ''
}) {
  const tabs = [
    { id: 'offers', label: 'Tawaran', badge: badges.offers },
    { id: 'buffer', label: 'Buffer', badge: badges.buffer },
    { id: 'players', label: playersLabel, badge: badges.players },
    { id: 'vessel', label: 'Kapal', badge: '' }
  ];
  return (
    <aside className={`bg-g-surface border-l border-g-line flex flex-col min-w-0 ${className}`} aria-label="Panel kargo">
      {drawer && (
        <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-g-sunk">
          <span className="font-medium">Panel kargo</span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto border border-g-line bg-g-surface rounded-[7px] px-2.5 py-1 text-[13px]"
          >
            Tutup
          </button>
        </div>
      )}
      <div className="flex gap-0.5 px-3 py-2.5 border-b border-g-sunk" role="tablist">
        {tabs.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-[7px] px-1 py-[7px] text-[13px] ${
                on ? 'bg-g-bg font-medium text-g-ink' : 'text-g-muted hover:bg-g-tint'
              }`}
            >
              {t.label}
              {t.badge !== '' && <span className="font-plex text-[11px] text-g-muted">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-3 flex flex-col gap-2">
        {tab === 'offers' && <OffersPanel {...offers} />}
        {tab === 'buffer' && <BufferPanel {...buffer} />}
        {tab === 'players' && <PlayersPanel {...players} />}
        {tab === 'vessel' && <VesselPanel {...vessel} />}
      </div>

      <div className="border-t border-g-sunk px-3.5 py-3 flex flex-col gap-1.5 bg-g-tint2">
        <span className="font-plex text-[11px] tracking-[.1em] uppercase text-g-muted">Box dipilih</span>
        {selected && (
          <span className="flex items-center gap-1.5">
            <PortChip port={selected.destination} />
            <TypeChip type={selected.containerType} />
            <span className="text-[12.5px] text-g-ink2 truncate">{selected.customerName}</span>
          </span>
        )}
        <span className="text-[12.5px] text-g-ink2 [text-wrap:pretty]">{advice}</span>
      </div>
    </aside>
  );
}
