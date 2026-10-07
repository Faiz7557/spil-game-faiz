import { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import BayCrossSection from '../components/game/BayCrossSection';
import { PORTS, getBayConfig } from '../../../shared/gameConstants.js';

// A frozen moment from a real voyage, rendered with the game's own bay
// component: the ship is at SBY, MKS is next. Row 01 shows the lesson the
// game teaches — a JYP box loaded on top of MKS cargo becomes a restow
// blocker. Transit boxes (TR) came aboard at earlier ports.
const DEMO_BAY = '06';
const DEMO_BAY_INDEX = 3;
const DEMO_BAY_COUNT = 5;
const DEMO_CURRENT = 'SBY';
const DEMO_NEXT = 'MKS';
const DEMO_ROWS = ['04', '02', '01', '03'];
const DEMO_CONFIG = getBayConfig(DEMO_BAY);

const box = (id, destination, origin, tariff) => ({ id, destination, origin, containerType: 'DRY', tariff });

const DEMO_GRID = {
  [DEMO_BAY]: {
    '04': { '84': null, '82': box('TR-2231', 'MKS', 'JYP', 11800000), '02': box('TR-1907', 'JYP', 'MDN', 15400000) },
    '02': { '84': box('SB-0412', 'MKS', 'SBY', 9600000), '82': box('SB-0398', 'JYP', 'SBY', 14200000), '02': box('SB-0377', 'MDN', 'SBY', 16800000) },
    '01': { '84': box('SB-0420', 'JYP', 'SBY', 14200000), '82': box('SB-0405', 'MKS', 'SBY', 9600000), '02': box('TR-1911', 'JYP', 'MDN', 15400000) },
    '03': { '84': null, '82': null, '02': box('SB-0381', 'MDN', 'SBY', 16800000) }
  }
};

// Anything sitting above a box that leaves at the next port blocks it.
const isDemoBlocker = (bay, row, tier, container) => {
  if (container.destination === DEMO_NEXT) return false;
  const tiers = DEMO_CONFIG.tiers;
  return tiers
    .slice(tiers.indexOf(tier) + 1)
    .some((below) => DEMO_GRID[bay]?.[row]?.[below]?.destination === DEMO_NEXT);
};

const noop = () => {};

const FACTS = [
  { value: '4', label: 'Pelabuhan domestik' },
  { value: '11', label: 'Minggu pelayaran' },
  { value: 'Ratusan', label: 'Kontainer per permainan' }
];

const HeroSection = ({ onStart }) => {
  const stageRef = useRef(null);
  const [stageWidth, setStageWidth] = useState(960);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setStageWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scrollToWorkflow = () => {
    document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="hero" className="lp-page pt-[52px]">
      <div className="max-w-[1024px] mx-auto px-4 sm:px-6 pt-16 md:pt-24 text-center">
        <p className="lp-eyebrow mb-3">Simulator stowage kontainer</p>
        <h1 className="lp-hero-title lp-ink">Kuasai logistik laut.</h1>
        <p className="lp-lead lp-muted mt-5 max-w-[680px] mx-auto">
          Susun kontainer di bayplan, hindari restow, dan antar kargo ke empat pelabuhan selama sebelas minggu pelayaran.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
          <button type="button" onClick={onStart} className="lp-btn lp-btn-primary">
            Mulai berlayar
          </button>
          <button type="button" onClick={scrollToWorkflow} className="lp-link lp-body">
            Lihat alur permainan <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 mt-14 md:mt-20">
        <figure className="lp-tile px-3 py-4 sm:p-8 md:p-12">
          <div ref={stageRef} inert className="select-none">
            <BayCrossSection
              bay={DEMO_BAY}
              bayIndex={DEMO_BAY_INDEX}
              bayCount={DEMO_BAY_COUNT}
              config={DEMO_CONFIG}
              displayRows={DEMO_ROWS}
              grid={DEMO_GRID}
              currentPort={DEMO_CURRENT}
              nextPort={DEMO_NEXT}
              activePorts={PORTS}
              selected={null}
              readOnly
              width={stageWidth + 44}
              isBlocker={isDemoBlocker}
              validCount={0}
              onPrev={noop}
              onNext={noop}
              onCellClick={noop}
              onDropOnCell={noop}
            />
          </div>
          <figcaption className="lp-small lp-muted mt-5 md:mt-7 text-center">
            Bay 06 dilihat dari buritan saat kapal sandar di Surabaya. Kontainer JYP di row 01 menutupi kargo Makassar, jadi harus dibongkar-muat ulang.
          </figcaption>
        </figure>
      </div>

      <dl className="max-w-[1024px] mx-auto px-4 sm:px-6 pt-12 pb-16 md:pt-16 md:pb-24 grid grid-cols-3 gap-4 text-center">
        {FACTS.map((fact) => (
          <div key={fact.label} className="flex flex-col-reverse">
            <dt className="lp-small lp-muted mt-1">{fact.label}</dt>
            <dd className="lp-h3 lp-ink">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default HeroSection;
