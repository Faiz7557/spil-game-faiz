// The machine, in 3D: a schematic model of the asset with each recorded parameter pinned to the part it is measured at,
// coloured by the review week against its own limits. Replay steps the review week forward.


import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Box as BoxIcon, Pause, Play, RotateCcw, Rotate3d } from "lucide-react";
import type { Equipment } from "../../domain/types";
import { fmtDate } from "../../domain/kpis";
import { gaugeZone } from "@/components/ui/gauge";
import { cn } from "@/lib/utils";
import { ANCHORS, FRAMING, MachineModel, kindOf, type MachineKind } from "./machines";
import { Hotspot } from "./parts";
import { useScenePalette, zoneColor, type ScenePalette } from "./palette";
import { useInView } from "./useInView";

type Zone = "ok" | "alarm" | "trip";

/** A translucent ring that sweeps along the machine: the "being read" cue of a digital twin. */
function ScanRing({ span, p }: { span: [number, number]; p: ScenePalette }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = (clock.getElapsedTime() / 4.5) % 1;
    const e = t < 0.7 ? t / 0.7 : 1;
    m.position.x = span[0] + (span[1] - span[0]) * e;
    (m.material as THREE.MeshBasicMaterial).opacity = t < 0.7 ? Math.sin(e * Math.PI) * 0.32 : 0;
  });
  return (
    <mesh ref={ref} rotation={[0, Math.PI / 2, 0]} position={[span[0], 1.35, 0]}>
      <torusGeometry args={[1.45, 0.012, 8, 96]} />
      <meshBasicMaterial color={p.accent} transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Scene({ kind, zones, active, onHover, autoRotate, resetKey, p }: {
  kind: MachineKind; zones: Zone[]; active: number | null; onHover: (i: number | null) => void; autoRotate: boolean; resetKey: number; p: ScenePalette;
}) {
  const f = FRAMING[kind];
  const controls = useRef<React.ElementRef<typeof OrbitControls>>(null);
  useEffect(() => { controls.current?.reset(); }, [resetKey]);
  return (
    <>
      <fog attach="fog" args={[p.bg, 14, 30]} />
      <ambientLight intensity={p.ambient} />
      <hemisphereLight args={[p.theme === "dark" ? "#c8f0c0" : "#ffffff", p.theme === "dark" ? "#0b0d0c" : "#e9dcc8", p.fillLight]} />
      <directionalLight position={[6, 9, 5]} intensity={p.keyLight} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
      <directionalLight position={[-6, 3, -4]} intensity={0.6} color={p.accent} />

      <group>
        <MachineModel kind={kind} p={p} />
        {ANCHORS[kind].map((at, i) => (
          <group key={i}>
            <Hotspot at={at} color={zoneColor(p, zones[i] ?? "ok")} active={active === i} urgent={zones[i] !== "ok"} />
            <Html position={[at[0], at[1] + 0.34, at[2]]} center zIndexRange={[10, 0]}>
              <button type="button" onMouseEnter={() => onHover(i)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(i)} onBlur={() => onHover(null)}
                aria-label={`Sensor ${i + 1}`}
                className={cn("grid size-6 place-items-center rounded-full border font-mono text-[11px] font-semibold shadow-[0_4px_12px_rgb(var(--shade-rgb)/calc(0.5*var(--shade-k)))] backdrop-blur-md transition-transform duration-150",
                  active === i ? "scale-125" : "",
                  zones[i] === "trip" ? "border-danger/60 bg-danger text-white" : zones[i] === "alarm" ? "border-caution/60 bg-caution text-[#1b1200]" : "border-line-strong bg-[var(--panel-2)] text-ink-hi")}>
                {i + 1}
              </button>
            </Html>
          </group>
        ))}
        <ScanRing span={f.span} p={p} />
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow>
        <circleGeometry args={[9, 64]} />
        <meshStandardMaterial color={p.ground} roughness={1} metalness={0} />
      </mesh>
      <gridHelper args={[18, 36, p.groundLine, p.groundLine]} position={[0, -0.11, 0]} />
      <ContactShadows position={[0, -0.1, 0]} opacity={p.theme === "dark" ? 0.6 : 0.35} scale={14} blur={2.4} far={4} />

      <OrbitControls ref={controls} makeDefault target={f.target} enablePan={false} enableDamping dampingFactor={0.08}
        autoRotate={autoRotate} autoRotateSpeed={0.55} minDistance={4} maxDistance={20} minPolarAngle={0.35} maxPolarAngle={1.42} />
    </>
  );
}

/** The 3D card of the checkup board. The parent owns the highlighted sensor, so a checklist row and its pin light together. */
export default function MachineView({ eq, week, onWeek, canReplay, active, onActive }: {
  eq: Equipment; week: number; onWeek: (w: number) => void; canReplay: boolean; active: number | null; onActive: (i: number | null) => void;
}) {
  const p = useScenePalette();
  const kind = kindOf(eq.tag);
  const row = eq.history[week];
  const zones = useMemo(() => eq.params.map((pr, i) => gaugeZone(row.values[i], pr.alarm, pr.trip, pr.direction)), [eq, row]);
  const [autoRotate, setAutoRotate] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [box, inView] = useInView<HTMLDivElement>();
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Replay: step the review week forward, stopping at the last recorded route.
  useEffect(() => {
    if (!playing) return;
    if (week >= eq.history.length - 1) { setPlaying(false); return; }
    const id = setTimeout(() => onWeek(week + 1), 900);
    return () => clearTimeout(id);
  }, [playing, week, eq.history.length, onWeek]);

  return (
    <section aria-labelledby="machine-h" className="tw flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line [background:var(--glass),var(--panel)] shadow-[var(--shadow)]">
      <div className="flex items-center gap-2 px-5 pb-1 pt-4">
        <h2 id="machine-h" className="flex items-center gap-2 text-[15px] font-semibold text-ink-hi"><BoxIcon className="size-4 text-accent-ink" strokeWidth={1.7} aria-hidden="true" />Machine view</h2>
        <span className="ml-auto flex gap-1">
          <button type="button" onClick={() => setAutoRotate((a) => !a)} aria-pressed={autoRotate} className="btn ghost sm" title={autoRotate ? "Stop turning" : "Turn slowly"} aria-label={autoRotate ? "Stop turning" : "Turn slowly"}><Rotate3d aria-hidden="true" /></button>
          <button type="button" onClick={() => setResetKey((k) => k + 1)} className="btn ghost sm" title="Reset view" aria-label="Reset view"><RotateCcw aria-hidden="true" /></button>
        </span>
      </div>
      <div ref={box} className="relative min-h-[340px] flex-1">
        {inView && (
          <Canvas shadows dpr={[1, 2]} camera={{ position: FRAMING[kind].pos, fov: 34 }} frameloop={reduced ? "demand" : "always"}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }} aria-label={`3D model of ${eq.tag}`} style={{ position: "absolute", inset: 0 }}>
            <Suspense fallback={null}>
              <Scene kind={kind} zones={zones} active={active} onHover={onActive} autoRotate={autoRotate && !reduced} resetKey={resetKey} p={p} />
            </Suspense>
          </Canvas>
        )}
        <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-ink-4">Schematic, not to scale · drag to turn</span>
      </div>
      <div className="flex items-center gap-3 border-t border-line px-5 py-3">
        {canReplay && (
          <button type="button" className="btn sm" onClick={() => { if (week >= eq.history.length - 1) onWeek(0); setPlaying((x) => !x); }} aria-pressed={playing}>
            {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}{playing ? "Pause" : "Replay"}
          </button>
        )}
        <div className="flex h-6 flex-1 items-end gap-[2px]" role="img" aria-label={`${eq.history.length} weekly routes, week ${week + 1} selected`}>
          {eq.history.map((h, i) => (
            <button key={h.week} type="button" tabIndex={-1} onClick={() => { setPlaying(false); onWeek(i); }}
              title={canReplay ? `Week ${i + 1} · ${fmtDate(h.date)} · ${h.status}` : `Week ${i + 1} · ${fmtDate(h.date)}`}
              className={cn("flex-1 rounded-[2px] transition-[height,opacity] duration-200",
                !canReplay ? "bg-ink-4" : h.status === "TRIP" ? "bg-danger" : h.status === "ALARM" ? "bg-caution" : "bg-ok/70",
                i === week ? "h-6 opacity-100" : "h-3 opacity-50 hover:opacity-100")} />
          ))}
        </div>
        <span className="shrink-0 text-[12px] tabular-nums text-ink-3">Week {week + 1} · {fmtDate(row.date)}</span>
      </div>
    </section>
  );
}
