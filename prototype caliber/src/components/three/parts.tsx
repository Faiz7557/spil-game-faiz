// Procedural building blocks for the equipment models: everything is cylinders, boxes and swept tubes, so the
// models need no downloaded assets. Units are roughly metres; Y is up, the machine shaft runs along X.
import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import type { ScenePalette } from "./palette";

type V3 = [number, number, number];

/** Outline strength for everything inside: a selected plant on the site view lights its wireframe. */
export const EdgeStyle = createContext<{ opacity: number; color?: string }>({ opacity: 0.22 });

/** Metal with a faint digital-twin outline, the look the whole scene shares. */
export function Metal({ color, rough = 0.42, metal = 0.55, edges, edgeOpacity, children }: {
  color: string; rough?: number; metal?: number; edges?: string; edgeOpacity?: number; children?: ReactNode;
}) {
  const style = useContext(EdgeStyle);
  return (
    <>
      <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
      {edges && <Edges threshold={28} color={style.color ?? edges} transparent opacity={edgeOpacity ?? style.opacity} />}
      {children}
    </>
  );
}

/** A cylinder whose axis runs along X (shafts, casings, shells). */
export function CylX({ r, len, at, color, p, seg = 40, rough, metal, edges = true }: {
  r: number; len: number; at: V3; color: string; p: ScenePalette; seg?: number; rough?: number; metal?: number; edges?: boolean;
}) {
  return (
    <mesh position={at} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, len, seg]} />
      <Metal color={color} rough={rough} metal={metal} edges={edges ? p.edge : undefined} />
    </mesh>
  );
}

/** A cylinder standing on Y (nozzles, tanks, columns). */
export function CylY({ r, h, at, color, p, seg = 32, rTop, edges = true, rough, metal }: {
  r: number; h: number; at: V3; color: string; p: ScenePalette; seg?: number; rTop?: number; edges?: boolean; rough?: number; metal?: number;
}) {
  return (
    <mesh position={at} castShadow receiveShadow>
      <cylinderGeometry args={[rTop ?? r, r, h, seg]} />
      <Metal color={color} rough={rough} metal={metal} edges={edges ? p.edge : undefined} />
    </mesh>
  );
}

/** A cylinder whose axis runs along Z. */
export function CylZ({ r, len, at, color, p, seg = 36, edges = true }: { r: number; len: number; at: V3; color: string; p: ScenePalette; seg?: number; edges?: boolean }) {
  return (
    <mesh position={at} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, len, seg]} />
      <Metal color={color} edges={edges ? p.edge : undefined} />
    </mesh>
  );
}

export function Box({ size, at, color, p, edges = true, rough, metal, rot }: {
  size: V3; at: V3; color: string; p: ScenePalette; edges?: boolean; rough?: number; metal?: number; rot?: V3;
}) {
  return (
    <mesh position={at} rotation={rot} castShadow receiveShadow>
      <boxGeometry args={size} />
      <Metal color={color} rough={rough} metal={metal} edges={edges ? p.edge : undefined} />
    </mesh>
  );
}

/** A nozzle: a short pipe with a flange ring at its end, pointing up (+Y) or down from `at`. */
export function Nozzle({ at, r = 0.18, h = 0.6, dir = 1, p }: { at: V3; r?: number; h?: number; dir?: 1 | -1; p: ScenePalette }) {
  const [x, y, z] = at;
  return (
    <group>
      <CylY r={r} h={h} at={[x, y + (dir * h) / 2, z]} color={p.steel} p={p} edges={false} />
      <CylY r={r * 1.55} h={0.08} at={[x, y + dir * h, z]} color={p.steel} p={p} />
    </group>
  );
}

/** A swept pipe through a list of points, with soft bends. */
export function Pipe({ points, r = 0.06, color, p }: { points: V3[]; r?: number; color?: string; p: ScenePalette }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((v) => new THREE.Vector3(...v)), false, "catmullrom", 0.08);
    return new THREE.TubeGeometry(curve, Math.max(24, points.length * 16), r, 12, false);
  }, [points, r]);
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color={color ?? p.pipe} roughness={0.35} metalness={0.7} />
    </mesh>
  );
}

/** A steel baseplate (skid) with a lip, the plinth every rotating machine sits on. */
export function Skid({ w, d, at = [0, 0, 0], p }: { w: number; d: number; at?: V3; p: ScenePalette }) {
  return (
    <group position={at}>
      <Box size={[w, 0.22, d]} at={[0, 0.11, 0]} color={p.steelDark} p={p} rough={0.6} metal={0.4} />
      <Box size={[w + 0.3, 0.12, d + 0.3]} at={[0, -0.06, 0]} color={p.theme === "dark" ? "#1d201e" : "#d7d3c5"} p={p} edges={false} rough={0.9} metal={0} />
    </group>
  );
}

/** Cooling fins along a motor or bearing housing. */
export function Fins({ r, len, at, count = 14, p }: { r: number; len: number; at: V3; count?: number; p: ScenePalette }) {
  return (
    <group position={at}>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        return (
          <mesh key={i} position={[0, Math.sin(a) * r, Math.cos(a) * r]} rotation={[a, 0, 0]} castShadow>
            <boxGeometry args={[len, 0.05, 0.12]} />
            <meshStandardMaterial color={p.paint} roughness={0.5} metalness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

/** A sensor point: a glowing core with a ring that breathes faster when the reading is out of band. */
export function Hotspot({ at, color, active, urgent }: { at: V3; color: string; active?: boolean; urgent?: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ring.current;
    if (!m) return;
    const speed = urgent ? 3.2 : 1.4;
    const t = (clock.getElapsedTime() * speed) % 1;
    m.scale.setScalar(1 + t * 1.6);
    (m.material as THREE.MeshBasicMaterial).opacity = (1 - t) * (active ? 0.7 : 0.45);
  });
  return (
    <group position={at}>
      <mesh>
        <sphereGeometry args={[active ? 0.13 : 0.1, 24, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={ring}>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight color={color} intensity={active ? 2.2 : 1.1} distance={1.8} decay={2} />
    </group>
  );
}
