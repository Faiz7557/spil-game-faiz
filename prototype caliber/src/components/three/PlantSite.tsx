// The site at a glance: every plant in the register as a block on one schematic site, a column of light whose
// height is that plant's recorded actual loss, and pins on the five machines with a full evidence package.
// The layout is schematic (the data has no plot plan) and says so on screen. Clicking a plant filters the page.
import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Factory, Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Box, CylY, EdgeStyle, Pipe } from "./parts";
import { useScenePalette, type ScenePalette } from "./palette";
import { useInView } from "./useInView";

export interface PlantStat { plant: string; n: number; open: number; actual: number; rcaDuePassed: number }
export interface SitePin { tag: string; plant: string; status: string; name: string }

type Kind = "cracker" | "resin" | "utility" | "polymer" | "generic";
/** Only these four plant names appear in the data (equipment sheets); every other plant is drawn as a generic unit. */
const KNOWN: Record<string, { kind: Kind; name: string }> = {
  ZCU: { kind: "cracker", name: "Cracker Unit" }, ARP: { kind: "resin", name: "Resin Plant" },
  NUP: { kind: "utility", name: "Utility Plant" }, OPP: { kind: "polymer", name: "Polymer Plant" },
};
const ORDER = ["SMX", "OPP", "OP2", "BRP", "CRP", "ZCU", "ARP", "OP3", "TKX", "NUP", "OPU", "BDX"];
const PLOT = { w: 9, d: 7, gap: 3.2 };
const COLS = 4;

const usdM = (v: number) => `US$${(v / 1e6).toFixed(1)}M`;
const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

function plotCenter(i: number): [number, number] {
  const c = i % COLS, r = Math.floor(i / COLS);
  const rows = Math.ceil(ORDER.length / COLS);
  return [(c - (COLS - 1) / 2) * (PLOT.w + PLOT.gap), (r - (rows - 1) / 2) * (PLOT.d + PLOT.gap)];
}

/** A lit window band on a building, brighter at night. */
function Windows({ size, at, p }: { size: [number, number, number]; at: [number, number, number]; p: ScenePalette }) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={p.window} emissive={p.window} emissiveIntensity={p.theme === "dark" ? 0.75 : 0.1} toneMapped={false} />
    </mesh>
  );
}

function Building({ w, h, d, at, p }: { w: number; h: number; d: number; at: [number, number]; p: ScenePalette }) {
  return (
    <group position={[at[0], 0, at[1]]}>
      <Box size={[w, h, d]} at={[0, h / 2, 0]} color={p.theme === "dark" ? "#1e2220" : "#f4f2ea"} p={p} metal={0.1} rough={0.8} />
      <Windows size={[w * 0.82, 0.14, d + 0.02]} at={[0, h * 0.62, 0]} p={p} />
      {h > 1.6 && <Windows size={[w * 0.82, 0.14, d + 0.02]} at={[0, h * 0.32, 0]} p={p} />}
    </group>
  );
}

function Tank({ r, h, at, p, cone }: { r: number; h: number; at: [number, number]; p: ScenePalette; cone?: boolean }) {
  return (
    <group position={[at[0], 0, at[1]]}>
      <CylY r={r} h={h} at={[0, h / 2, 0]} color={p.steel} p={p} metal={0.6} />
      {cone ? <CylY r={r} rTop={0.06} h={r * 0.8} at={[0, h + r * 0.4, 0]} color={p.steel} p={p} />
        : <CylY r={r * 1.02} h={0.06} at={[0, h + 0.03, 0]} color={p.steelDark} p={p} edges={false} />}
    </group>
  );
}

function Column({ r, h, at, p }: { r: number; h: number; at: [number, number]; p: ScenePalette }) {
  return (
    <group position={[at[0], 0, at[1]]}>
      <CylY r={r} h={h} at={[0, h / 2, 0]} color={p.paintAlt} p={p} />
      {Array.from({ length: Math.floor(h / 1.4) }, (_, i) => <CylY key={i} r={r * 1.22} h={0.05} at={[0, 1 + i * 1.4, 0]} color={p.steel} p={p} edges={false} />)}
    </group>
  );
}

function Flare({ at, p }: { at: [number, number]; p: ScenePalette }) {
  const flame = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (flame.current) flame.current.scale.y = 1 + Math.sin(clock.getElapsedTime() * 7) * 0.12; });
  return (
    <group position={[at[0], 0, at[1]]}>
      <CylY r={0.12} rTop={0.08} h={7.5} at={[0, 3.75, 0]} color={p.steel} p={p} />
      <mesh ref={flame} position={[0, 7.85, 0]}>
        <coneGeometry args={[0.18, 0.7, 12]} />
        <meshBasicMaterial color="#ffb347" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 8, 0]} color="#ffa040" intensity={p.theme === "dark" ? 6 : 2} distance={9} />
    </group>
  );
}

function PipeRack({ from, to, p }: { from: [number, number]; to: [number, number]; p: ScenePalette }) {
  const y = 1.3;
  return (
    <group>
      <Pipe points={[[from[0], y, from[1]], [to[0], y, to[1]]]} r={0.09} p={p} />
      <Pipe points={[[from[0], y + 0.25, from[1] + 0.2], [to[0], y + 0.25, to[1] + 0.2]]} r={0.07} p={p} />
      {Array.from({ length: 5 }, (_, i) => {
        const t = i / 4;
        return <Box key={i} size={[0.12, y + 0.3, 0.6]} at={[from[0] + (to[0] - from[0]) * t, (y + 0.3) / 2, from[1] + (to[1] - from[1]) * t + 0.1]} color={p.steelDark} p={p} edges={false} />;
      })}
    </group>
  );
}

/** The process equipment on one plot. Known plants get their own arrangement; the rest vary by a stable hash. */
function Unit({ kind, seed, p }: { kind: Kind; seed: number; p: ScenePalette }) {
  if (kind === "cracker") return (
    <group>
      {[-2.6, -1.4, -0.2].map((x) => <group key={x}><Box size={[0.9, 1.6, 3.2]} at={[x, 0.8, -1.2]} color={p.steelDark} p={p} /><CylY r={0.14} h={2.4} at={[x, 2.8, -2.2]} color={p.steel} p={p} /></group>)}
      <Column r={0.45} h={5.6} at={[1.6, -1.4]} p={p} /><Column r={0.35} h={4.4} at={[2.7, -1.6]} p={p} />
      <Flare at={[3.4, 2.4]} p={p} />
      <PipeRack from={[-3.4, 1.4]} to={[2.4, 1.4]} p={p} />
    </group>
  );
  if (kind === "resin") return (
    <group>
      {[[-2.8, -1.8], [-1.2, -1.8], [-2.8, -0.2], [-1.2, -0.2]].map(([x, z]) => <Tank key={`${x}${z}`} r={0.68} h={1.9} at={[x, z]} p={p} />)}
      <Building w={3.2} h={2.4} d={2.6} at={[2, -0.9]} p={p} />
      <Column r={0.32} h={3.6} at={[0.3, 1.8]} p={p} />
      <PipeRack from={[-3.4, 1.9]} to={[3.2, 1.9]} p={p} />
    </group>
  );
  if (kind === "utility") return (
    <group>
      {[-2.4, -0.4].map((x) => (
        <group key={x}>
          <CylY r={1.0} rTop={0.72} h={2.6} at={[x, 1.3, -1.2]} color={p.theme === "dark" ? "#2b302d" : "#e7e4da"} p={p} metal={0.1} rough={0.9} />
          <CylY r={0.78} rTop={0.88} h={0.6} at={[x, 2.9, -1.2]} color={p.theme === "dark" ? "#2b302d" : "#e7e4da"} p={p} metal={0.1} rough={0.9} />
        </group>
      ))}
      <Building w={3.0} h={1.8} d={2.2} at={[2.3, -1.0]} p={p} />
      <CylY r={0.22} h={4.6} at={[3.3, 2.3, -1.6]} color={p.steel} p={p} />
      <PipeRack from={[-3.4, 1.6]} to={[3.4, 1.6]} p={p} />
    </group>
  );
  if (kind === "polymer") return (
    <group>
      {[-3, -2, -1, 0].map((x) => <Tank key={x} r={0.42} h={3.2} at={[x, -1.8]} p={p} cone />)}
      <Building w={4.4} h={1.9} d={1.8} at={[1.2, 0.9]} p={p} />
      <Column r={0.36} h={4.2} at={[2.8, -1.6]} p={p} />
      <PipeRack from={[-3.4, -0.4]} to={[3.2, -0.4]} p={p} />
    </group>
  );
  const tanks = 2 + (seed % 3), tall = (seed >> 3) % 2 === 0;
  return (
    <group>
      {Array.from({ length: tanks }, (_, i) => <Tank key={i} r={0.6} h={1.5 + ((seed >> i) % 3) * 0.3} at={[-2.9 + i * 1.5, -1.6]} p={p} />)}
      <Building w={2.8} h={tall ? 2.2 : 1.5} d={2.2} at={[2.0, -1.2]} p={p} />
      {tall && <Column r={0.3} h={3.8} at={[0.4, 1.6]} p={p} />}
      <PipeRack from={[-3.4, 1.0]} to={[3.4, 1.0]} p={p} />
    </group>
  );
}

/** Recorded actual loss as a column of light at the plot's front corner. */
function LossColumn({ h, at, p, on }: { h: number; at: [number, number]; p: ScenePalette; on: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const grown = useRef(0);
  useFrame((_, dt) => {
    grown.current = Math.min(1, grown.current + dt * 0.8);
    const e = 1 - Math.pow(1 - grown.current, 3);
    if (ref.current) { ref.current.scale.y = Math.max(0.001, e); ref.current.position.y = (h * e) / 2; }
  });
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh ref={ref}>
        <cylinderGeometry args={[0.32, 0.32, h, 24, 1, true]} />
        <meshBasicMaterial color={p.accent} transparent opacity={on ? 0.55 : 0.32} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} blending={p.theme === "dark" ? THREE.AdditiveBlending : THREE.NormalBlending} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.34, 0.5, 32]} />
        <meshBasicMaterial color={p.accent} transparent opacity={0.7} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Plot({ stat, i, maxLoss, pins, selected, hovered, onHover, onPick, onPin, p }: {
  stat: PlantStat; i: number; maxLoss: number; pins: SitePin[]; selected: boolean; hovered: boolean;
  onHover: (k: string | null) => void; onPick: (k: string) => void; onPin: (tag: string) => void; p: ScenePalette;
}) {
  const [x, z] = plotCenter(i);
  const known = KNOWN[stat.plant];
  const h = 0.6 + (stat.actual / maxLoss) * 7;
  const lit = selected || hovered;
  const corner: [number, number] = [PLOT.w / 2 - 0.9, PLOT.d / 2 - 0.9];
  return (
    <group position={[x, 0, z]}
      onPointerOver={(e) => { e.stopPropagation(); onHover(stat.plant); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { onHover(null); document.body.style.cursor = ""; }}
      onClick={(e) => { e.stopPropagation(); onPick(stat.plant); }}>
      {/* pad with a kerb, lit at the edge when selected */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[PLOT.w, 0.12, PLOT.d]} />
        <meshStandardMaterial color={p.pad} roughness={0.95} metalness={0} />
      </mesh>
      <lineSegments position={[0, 0.13, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(PLOT.w, 0.001, PLOT.d)]} />
        <lineBasicMaterial color={lit ? p.accent : p.padEdge} transparent opacity={lit ? 1 : 0.7} toneMapped={false} />
      </lineSegments>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.14, 0]}>
          <planeGeometry args={[PLOT.w, PLOT.d]} />
          <meshBasicMaterial color={p.accent} transparent opacity={p.theme === "dark" ? 0.1 : 0.07} depthWrite={false} />
        </mesh>
      )}
      <EdgeStyle.Provider value={lit ? { opacity: 0.95, color: p.accent } : { opacity: p.theme === "dark" ? 0.16 : 0.12 }}>
        <group position={[0, 0.12, -0.3]} scale={0.92}>
          <Unit kind={known?.kind ?? "generic"} seed={hash(stat.plant)} p={p} />
        </group>
      </EdgeStyle.Provider>
      <LossColumn h={h} at={corner} p={p} on={lit} />
      <Html position={[corner[0], h + 0.7, corner[1]]} center zIndexRange={[12, 0]} style={{ pointerEvents: "none" }}>
        <div className={cn("whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] leading-tight shadow-[0_6px_18px_rgb(var(--shade-rgb)/calc(0.5*var(--shade-k)))] backdrop-blur-md transition-colors",
          lit ? "border-accent/60 bg-[rgb(var(--panel-2-rgb)/0.95)]" : "border-line-strong bg-[rgb(var(--panel-2-rgb)/0.78)]")}>
          <span className="font-mono font-semibold text-ink-hi">{stat.plant}</span>
          <span className="ml-1.5 text-ink-2 tabular-nums">{usdM(stat.actual)}</span>
          {lit && <span className="block text-ink-3">{stat.open} open · {stat.rcaDuePassed} RCA overdue</span>}
        </div>
      </Html>
      {pins.map((pin, j) => {
        const px = -PLOT.w / 2 + 1.4 + j * 2.6, pz = PLOT.d / 2 - 1.0;
        const c = pin.status === "TRIP" ? p.trip : pin.status === "ALARM" ? p.alarm : p.ok;
        return (
          <group key={pin.tag} position={[px, 0, pz]}>
            <CylY r={0.03} h={2.2} at={[0, 1.1, 0]} color={c} p={p} edges={false} />
            <mesh position={[0, 2.25, 0]}><sphereGeometry args={[0.16, 20, 20]} /><meshBasicMaterial color={c} toneMapped={false} /></mesh>
            <Html position={[0, 2.75, 0]} center zIndexRange={[13, 0]}>
              <button type="button" onClick={(e) => { e.stopPropagation(); onPin(pin.tag); }} title={`${pin.name}: open the investigation`}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line-strong bg-[rgb(var(--panel-2-rgb)/0.92)] py-0.5 pl-1.5 pr-2 text-[11px] font-semibold text-ink-hi shadow-[0_4px_12px_rgb(var(--shade-rgb)/calc(0.45*var(--shade-k)))] backdrop-blur-md transition-transform hover:scale-105">
                <span className="size-1.5 rounded-full" style={{ background: c }} />{pin.name}
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function Scene({ stats, pins, selected, hovered, onHover, onPick, onPin, autoRotate, resetKey, p }: {
  stats: PlantStat[]; pins: SitePin[]; selected: string | null; hovered: string | null; onHover: (k: string | null) => void;
  onPick: (k: string) => void; onPin: (t: string) => void; autoRotate: boolean; resetKey: number; p: ScenePalette;
}) {
  const maxLoss = Math.max(...stats.map((s) => s.actual), 1);
  const controls = useRef<React.ElementRef<typeof OrbitControls>>(null);
  useEffect(() => { controls.current?.reset(); }, [resetKey]);
  const ordered = ORDER.map((k) => stats.find((s) => s.plant === k)).filter((s): s is PlantStat => !!s);
  return (
    <>
      <color attach="background" args={[p.bg]} />
      <fog attach="fog" args={[p.bg, 60, 120]} />
      <ambientLight intensity={p.ambient} />
      <hemisphereLight args={[p.theme === "dark" ? "#c8f0c0" : "#ffffff", p.theme === "dark" ? "#0b0d0c" : "#e9dcc8", p.fillLight]} />
      <directionalLight position={[18, 30, 12]} intensity={p.keyLight * 0.9} castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={24} shadow-camera-bottom={-24} />
      <directionalLight position={[-20, 10, -16]} intensity={0.5} color={p.accent} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color={p.ground} roughness={1} metalness={0} />
      </mesh>
      <gridHelper args={[140, 70, p.groundLine, p.groundLine]} position={[0, 0.005, 0]} />
      {/* roads between the plots */}
      {[-1, 0, 1].map((c) => <mesh key={`v${c}`} rotation={[-Math.PI / 2, 0, 0]} position={[c * (PLOT.w + PLOT.gap) / 1, 0.01, 0]}><planeGeometry args={[1.6, 34]} /><meshStandardMaterial color={p.road} roughness={1} /></mesh>)}
      {[-0.5, 0.5].map((r) => <mesh key={`h${r}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, r * (PLOT.d + PLOT.gap)]}><planeGeometry args={[50, 1.6]} /><meshStandardMaterial color={p.road} roughness={1} /></mesh>)}

      {ordered.map((s) => (
        <Plot key={s.plant} stat={s} i={ORDER.indexOf(s.plant)} maxLoss={maxLoss} pins={pins.filter((x) => x.plant === s.plant)}
          selected={selected === s.plant} hovered={hovered === s.plant} onHover={onHover} onPick={onPick} onPin={onPin} p={p} />
      ))}
      <ContactShadows position={[0, 0.02, 0]} opacity={p.theme === "dark" ? 0.5 : 0.3} scale={60} blur={2.5} far={8} />
      <OrbitControls ref={controls} makeDefault target={[0, 0, 0]} enablePan={false} enableDamping dampingFactor={0.08}
        autoRotate={autoRotate} autoRotateSpeed={0.3} minDistance={22} maxDistance={95} minPolarAngle={0.45} maxPolarAngle={1.18} />
    </>
  );
}

export default function PlantSite({ stats, pins, selected, onPick, onPin }: {
  stats: PlantStat[]; pins: SitePin[]; selected: string | null; onPick: (plant: string) => void; onPin: (tag: string) => void;
}) {
  const p = useScenePalette();
  const [hovered, setHovered] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const [box, inView] = useInView<HTMLDivElement>();
  const narrow = typeof matchMedia !== "undefined" && matchMedia("(max-width: 640px)").matches;
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const focus = stats.find((s) => s.plant === (hovered ?? selected));
  const total = stats.reduce((a, s) => ({ n: a.n + s.n, open: a.open + s.open, actual: a.actual + s.actual, rca: a.rca + s.rcaDuePassed }), { n: 0, open: 0, actual: 0, rca: 0 });
  const known = focus ? KNOWN[focus.plant] : undefined;

  return (
    <section aria-labelledby="site-h" className="tw relative h-full overflow-hidden rounded-2xl border border-line [background:var(--glass),var(--panel)] shadow-[var(--shadow)]">
      <div ref={box} className="relative h-[460px] sm:h-[520px]">
        {inView && (
          <Canvas shadows dpr={[1, 2]} camera={{ position: narrow ? [48, 50, 58] : [31, 30, 37], fov: 31 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
            onPointerMissed={() => setHovered(null)} aria-label="Schematic 3D site of the twelve plants in the incident register">
            <Suspense fallback={null}>
              <Scene stats={stats} pins={pins} selected={selected} hovered={hovered} onHover={setHovered} onPick={onPick} onPin={onPin}
                autoRotate={autoRotate && !reduced && !hovered} resetKey={resetKey} p={p} />
            </Suspense>
          </Canvas>
        )}

        <div className="pointer-events-none absolute left-0 top-0 max-w-[420px] p-5">
          <h2 id="site-h" className="flex items-center gap-2 text-[15px] font-semibold text-ink-hi"><Factory className="size-4 text-accent-ink" strokeWidth={1.7} aria-hidden="true" />The site at a glance</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3 max-sm:hidden">Twelve plants from the incident register. Column height is recorded actual loss; pins are the five machines with a full evidence package. Select a plant to filter the page.</p>
        </div>

        <aside aria-live="polite" className="pointer-events-none absolute right-4 top-4 w-[236px] rounded-xl border border-line bg-[rgb(var(--panel-2-rgb)/0.82)] p-4 shadow-[var(--shadow)] backdrop-blur-xl max-sm:hidden">
          <p className="text-[11.5px] font-medium text-ink-3">{focus ? (known ? `${known.name} · ${focus.plant}` : `Plant ${focus.plant}`) : "All twelve plants"}</p>
          <p className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink-hi tabular-nums">{usdM(focus ? focus.actual : total.actual)}</p>
          <p className="mt-1 text-[11.5px] text-ink-3">recorded actual loss</p>
          <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
            {[["records", focus ? focus.n : total.n, ""], ["open", focus ? focus.open : total.open, "text-caution-ink"], ["RCA overdue", focus ? focus.rcaDuePassed : total.rca, "text-danger-ink"]].map(([k, v, c]) => (
              <div key={k as string}><dd className={cn("m-0 text-[17px] font-semibold leading-none tabular-nums text-ink-hi", c as string)}>{v}</dd><dt className="mt-1 text-[10.5px] text-ink-3">{k}</dt></div>
            ))}
          </dl>
          {selected && <p className="mt-3 text-[11.5px] text-accent-ink">Page filtered to {selected}. Select it again to clear.</p>}
        </aside>

        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 p-3">
          <button type="button" className="btn sm backdrop-blur-md" onClick={() => setAutoRotate((a) => !a)} aria-pressed={autoRotate}>
            {autoRotate ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}{autoRotate ? "Pause orbit" : "Orbit"}
          </button>
          <button type="button" className="btn sm backdrop-blur-md" onClick={() => setResetKey((k) => k + 1)}><RotateCcw aria-hidden="true" />Reset view</button>
          <div className="seg max-md:hidden" role="group" aria-label="Plants">
            {ORDER.filter((k) => stats.some((s) => s.plant === k)).map((k) => (
              <button key={k} type="button" aria-pressed={selected === k} onClick={() => onPick(k)} onMouseEnter={() => setHovered(k)} onMouseLeave={() => setHovered(null)} className="!px-2 font-mono !text-[11px]">{k}</button>
            ))}
          </div>
          <span className="ml-auto rounded-md bg-[rgb(var(--panel-rgb)/0.7)] px-2 py-1 text-[11.5px] text-ink-3 backdrop-blur-md max-sm:ml-0">Schematic layout, not a plot plan · unit shapes illustrative</span>
        </div>
      </div>
    </section>
  );
}
