import { useLayoutEffect, useRef, useState } from 'react';
import { Anchor, RotateCcw } from 'lucide-react';
import { PortChip, TypeChip, ContractTag } from './Chips';
import { formatJt, rpJt, PORT_LONG_NAMES, portVars } from './gameUi';

const emptyNote = 'text-callout text-g-muted py-[18px] px-1.5 text-center [text-wrap:pretty]';

function OfferCard({ order, hop, free, isNext, readOnly, onAccept, onDecline }) {
  const committed = order.customerType === 'Committed';
  const short = order.quantity > free;
  return (
    <div className="g-inset rounded-2xl px-3 py-[11px] flex flex-col gap-[7px]">
      <div className="flex items-center gap-[7px] min-w-0">
        <ContractTag committed={committed} />
        <span className="text-callout font-medium whitespace-nowrap overflow-hidden text-ellipsis min-w-0" title={order.customerName}>
          {order.customerName}
        </span>
        <span className="ml-auto font-plex text-callout whitespace-nowrap">{rpJt(order.tariff * order.quantity)}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <PortChip port={order.destination} />
        <TypeChip type={order.containerType} />
        <span className="font-plex text-caption">×{order.quantity}</span>
        <span className="font-plex text-caption text-g-muted">{formatJt(order.tariff)}/box</span>
        <span className="text-caption text-g-muted">{hop} hop</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-caption ${short ? 'text-g-danger' : 'text-g-muted'}`}>
          {short
            ? `Hanya ${free} slot ${order.containerType} tersisa`
            : `${isNext ? 'Next port · taruh di atas' : 'Later port · taruh di bawah'} · ${free} slot`}
        </span>
        <span className="ml-auto flex gap-1.5">
          {!committed && !readOnly && (
            <button
              type="button"
              onClick={() => onDecline(order.id)}
              className="g-pill px-3 py-[5px] text-callout text-g-ink2"
            >
              Tolak
            </button>
          )}
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onAccept(order.id)}
            className={`rounded-full border px-3.5 py-[5px] text-callout ${
              readOnly
                ? 'border-g-hair bg-g-inset text-g-faint cursor-not-allowed'
                : 'g-btn-green font-medium'
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
      <div className="border border-g-hair bg-g-warn-bg rounded-2xl p-4 text-center flex flex-col items-center gap-1.5">
        <Anchor className="w-5 h-5 text-g-warn" />
        <span className="text-callout font-medium text-g-warn-ink">Masa pengosongan</span>
        <span className="text-callout text-g-ink2 [text-wrap:pretty]">
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
  // Offers arrive one at a time: only the head of the pool is on the table,
  // the next one shows up once it is claimed (or declined).
  const current = cargoPool[0];
  const waiting = cargoPool.length - 1;
  return (
    <>
      {gameMode === 'ONLINE' && (
        <span className="text-caption text-g-info bg-g-info-bg rounded-xl px-[9px] py-1.5">
          Pasar bersama · kontrak yang diklaim pemain lain langsung diganti tawaran berikutnya
        </span>
      )}
      {current && (
        <OfferCard
          key={current.id}
          order={current}
          hop={hopOf(current.destination)}
          free={freeSlots[current.containerType] ?? 0}
          isNext={current.destination === nextPort}
          readOnly={readOnly}
          onAccept={onAccept}
          onDecline={onDecline}
        />
      )}
      {waiting > 0 && (
        <span className="text-caption text-g-muted text-center">
          {waiting} tawaran lagi menunggu · muncul setelah tawaran ini diklaim
        </span>
      )}
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
              className="flex items-center gap-1 text-caption g-pill px-3 py-1 text-g-ink2"
            >
              <RotateCcw className="w-3 h-3" /> Urungkan
            </button>
          )}
          {selectedId && (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="text-caption g-pill px-3 py-1 text-g-ink2"
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
            data-pending-id={c.id}
            draggable={!readOnly}
            onDragStart={(e) => onDragStart(e, c.id)}
            onClick={() => !readOnly && onSelect(on ? null : c.id)}
            aria-pressed={on}
            title={c.id}
            className={`flex flex-col items-start gap-1 text-left w-full px-[11px] py-[9px] rounded-[14px] ${
              on ? 'border-2 border-g-green bg-g-green-bg' : 'border border-g-hair bg-g-inset hover:bg-g-inset-hover'
            } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className="flex items-center gap-1.5 w-full">
              <PortChip port={c.destination} />
              <TypeChip type={c.containerType} />
              <span className="ml-auto text-caption text-g-muted">
                {c.destination === nextPort ? 'Next port' : 'Later port'} · {c.customerType === 'Committed' ? 'Committed' : 'Opsional'}
              </span>
            </span>
            <span className="text-callout text-g-ink2">{c.customerName} · {formatJt(c.tariff)} jt</span>
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
      <span className="text-caption text-g-muted">
        {gameMode === 'ONLINE'
          ? 'Kapal berangkat saat semua pemain siap atau waktu habis.'
          : 'Kas setiap kapten dibandingkan; gelar akhir dihitung dari bot yang Anda kalahkan.'}
      </span>
      {rows.map((p) => (
        <div
          key={p.id}
          className={`flex items-center gap-2.5 px-2.5 py-[9px] rounded-[14px] border ${
            p.me ? 'border-g-green-line bg-g-green-bg' : 'border-g-hair bg-g-inset'
          }`}
        >
          <span className="font-plex text-caption text-g-muted w-4">{p.rank}</span>
          <span className="flex-1 min-w-0 text-callout">
            <span className="block truncate" title={p.name}>{p.name}{p.me ? ' · Anda' : ''}</span>
            <span className="block text-caption text-g-muted">{p.sub}</span>
          </span>
          <span className={`font-plex text-callout ${p.cash < 0 ? 'text-g-danger' : ''}`}>{formatJt(p.cash)}</span>
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
      <div className="g-inset rounded-2xl p-3 flex flex-col gap-2">
        <span className="font-medium text-callout">Upgrade kapal</span>
        <span className="text-callout text-g-muted [text-wrap:pretty]">{info}</span>
        {gameMode === 'OFFLINE' ? (
          level < 3 ? (
            <button
              type="button"
              onClick={onUpgradeVessel}
              disabled={readOnly}
              className="g-btn-green rounded-full px-4 py-2 text-callout font-medium flex items-center justify-between"
            >
              Upgrade ke level {level + 1}
              <span className="font-plex text-caption">{level === 1 ? 'Rp 50 jt' : 'Rp 100 jt'}</span>
            </button>
          ) : (
            <span className="text-caption text-g-green-ink bg-g-green-bg border border-g-green-line rounded-xl px-2.5 py-1.5 text-center">Ukuran maksimum</span>
          )
        ) : (
          <span className="text-caption text-g-muted bg-g-inset border border-g-hair rounded-xl px-2.5 py-1.5 text-center">Upgrade hanya tersedia di mode offline</span>
        )}
      </div>

      <div className="g-inset rounded-2xl p-3 flex flex-col gap-1.5">
        <span className="font-medium text-callout">Rotasi sirkuit SPIL</span>
        {route.map((port) => {
          const isCurrent = port === currentPort;
          const isNext = port === nextPort;
          return (
            <div
              key={port}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-callout ${
                isCurrent ? 'border-g-green-line bg-g-green-bg font-medium' : 'border-g-hair'
              }`}
            >
              <PortChip port={port} />
              <span className="truncate">{PORT_LONG_NAMES[port] || port}</span>
              <span className="ml-auto text-caption" style={{ color: isCurrent ? 'var(--g-green-ink)' : isNext ? portVars(port).ink : 'var(--g-muted)' }}>
                {isCurrent ? 'sandar' : isNext ? 'berikutnya' : 'transit'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="g-inset rounded-2xl px-3 py-2.5 flex justify-between items-baseline gap-2">
        <span className="text-caption text-g-muted">Pendapatan kumulatif</span>
        <span className="font-plex text-callout text-g-green-ink">{rpJt(cumulativeGrossRevenue || 0)}</span>
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
  // The thumb follows the active tab's real box: tab widths differ with
  // their labels and badges, so equal slices would drift off target.
  const trackRef = useRef(null);
  const [thumb, setThumb] = useState(null);
  const badgeKey = tabs.map((t) => t.badge).join('|');
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const el = track.querySelector('[aria-selected="true"]');
      if (el) setThumb({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [tab, badgeKey, playersLabel]);

  return (
    <aside className={`g-glass-rail border-l border-g-edge flex flex-col min-w-0 ${className}`} aria-label="Panel kargo">
      {drawer && (
        <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-g-hair">
          <span className="font-medium">Panel kargo</span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto g-pill px-3 py-1 text-callout"
          >
            Tutup
          </button>
        </div>
      )}
      {/* Segmented control: one track, a thumb that slides to the active tab. */}
      <div className="px-3 py-2.5 border-b border-g-hair">
        <div ref={trackRef} className="relative flex p-0.5 rounded-full bg-g-inset border border-g-hair" role="tablist">
          {thumb && (
            <span
              aria-hidden="true"
              className="absolute top-0.5 bottom-0.5 left-0 rounded-full bg-g-surface border border-g-hair shadow-[0_1px_2px_var(--g-shadow)] transition-[transform,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
              style={{ width: thumb.width, transform: `translateX(${thumb.left}px)` }}
            />
          )}
          {tabs.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onTab(t.id)}
                className={`relative z-[1] flex-1 flex items-center justify-center gap-1.5 rounded-full px-1 py-[6px] text-callout transition-colors ${
                  on ? 'font-medium text-g-ink' : 'text-g-muted hover:text-g-ink2'
                }`}
              >
                {t.label}
                {t.badge !== '' && <span className="font-plex text-caption text-g-muted">{t.badge}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-3 flex flex-col gap-2">
        {tab === 'offers' && <OffersPanel {...offers} />}
        {tab === 'buffer' && <BufferPanel {...buffer} />}
        {tab === 'players' && <PlayersPanel {...players} />}
        {tab === 'vessel' && <VesselPanel {...vessel} />}
      </div>

      <div className="border-t border-g-hair px-3.5 py-3 flex flex-col gap-1.5 bg-g-inset">
        <span className="font-plex text-caption text-g-muted">Box dipilih</span>
        {selected && (
          <span className="flex items-center gap-1.5">
            <PortChip port={selected.destination} />
            <TypeChip type={selected.containerType} />
            <span className="text-callout text-g-ink2 truncate">{selected.customerName}</span>
          </span>
        )}
        <span className="text-callout text-g-ink2 [text-wrap:pretty]">{advice}</span>
      </div>
    </aside>
  );
}
