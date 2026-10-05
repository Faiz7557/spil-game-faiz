// The five documented machines, modelled procedurally at schematic fidelity: the right arrangement (casing,
// bearings, coupling, driver, lube console, nozzles), not a vendor drawing. Every component drawn is one the case
// data names: the equipment sheet (type, monitored parameters) or the RCA deck (parts found, inspected or repaired).
//   KO-3201 centrifugal compressor: DE/NDE journal bearings, lube-oil console with reservoir, filters and the
//     lube-oil coolers whose tube leak watered the oil.
//   PU-2101B centrifugal pump (API-682 seal): seal chamber, Plan 11 flush from discharge, seal pot and seal cooler.
//   PM-4405B motor-driven CW pump: motor DE/NDE greased bearings, fan cowl, terminal box (ampere), winding RTDs.
//   HE-3301 shell & tube exchanger: removable bundle, channel with tube-side inlet and outlet (the dP is across
//     them), shell-side nozzles.
//   BL-5702 centrifugal blower: scroll housing, two bearing pedestals, elastomer coupling, motor on shimmed feet
//     (the soft-foot finding).
// What the data does not state (the compressor driver, the CW pump casing style) stays generic. Each model exports the anchor point of
// every recorded condition parameter, in the order the equipment sheet lists them, so a reading can sit on the
// part it was measured at.
import * as THREE from "three";
import { Box, CylX, CylY, CylZ, Fins, Metal, Nozzle, Pipe, Skid } from "./parts";
import type { ScenePalette } from "./palette";

type V3 = [number, number, number];
export type MachineKind = "compressor" | "pump" | "motorpump" | "exchanger" | "blower";

export const kindOf = (tag: string): MachineKind =>
  tag.startsWith("KO") ? "compressor" : tag.startsWith("PM") ? "motorpump" : tag.startsWith("HE") ? "exchanger" : tag.startsWith("BL") ? "blower" : "pump";

/** Sensor anchors per machine, in the equipment sheet's parameter order. */
export const ANCHORS: Record<MachineKind, V3[]> = {
  // DE radial vibration, lube oil water content, lube oil supply pressure, bearing metal temperature
  compressor: [[0.1, 1.86, 0.25], [-1, 2.02, 2.2], [-0.35, 1.25, 1.55], [-2.9, 1.86, 0.25]],
  // overall vibration, seal flush flow, discharge pressure, bearing temperature
  pump: [[-0.6, 1.4, 0.22], [-0.98, 1.36, 0.5], [-1.25, 2.25, 0], [-0.15, 1.4, 0.22]],
  // motor DE bearing temperature, motor vibration, motor ampere, winding temperature
  motorpump: [[0.62, 1.5, 0.3], [1.4, 1.72, 0.3], [1.35, 1.98, 0], [2.0, 1.15, 0.66]],
  // tube-side dP, heat duty, cold outlet temperature, feed heavy-ends
  exchanger: [[-2.7, 2.12, 0.42], [0, 2.1, 0.3], [1.6, 2.78, 0], [-2.85, 2.78, 0]],
  // overall vibration, 2X harmonic, coupling offset, bearing temperature
  blower: [[-0.3, 2.0, 0.28], [0.42, 2.0, 0.28], [0.98, 1.98, 0], [-0.3, 1.58, 0.5]],
};

/** Where the camera starts for each machine, and the length the scan ring sweeps. */
export const FRAMING: Record<MachineKind, { pos: V3; target: V3; span: [number, number] }> = {
  compressor: { pos: [10.6, 6.9, 12.2], target: [0, 1.2, 0.6], span: [-3.4, 3.7] },
  pump: { pos: [7.3, 4.8, 8.3], target: [0, 1.0, 0], span: [-2.3, 2.5] },
  motorpump: { pos: [7.6, 4.9, 8.6], target: [0.2, 1.0, 0], span: [-2.3, 2.7] },
  exchanger: { pos: [9.2, 6.0, 10.6], target: [-0.3, 1.3, 0], span: [-3.2, 2.7] },
  blower: { pos: [8.3, 5.6, 10.0], target: [0, 1.4, 0], span: [-2.5, 2.9] },
};

function Compressor({ p }: { p: ScenePalette }) {
  return (
    <group>
      <Skid w={7.4} d={2.6} at={[0.2, 0, 0]} p={p} />
      {/* barrel casing on its pedestals */}
      <Box size={[0.42, 0.9, 1.6]} at={[-2.3, 0.67, 0]} color={p.steelDark} p={p} />
      <Box size={[0.42, 0.9, 1.6]} at={[-0.5, 0.67, 0]} color={p.steelDark} p={p} />
      <CylX r={0.85} len={2.4} at={[-1.4, 1.35, 0]} color={p.paint} p={p} metal={0.35} rough={0.5} />
      <CylX r={0.95} len={0.18} at={[-2.62, 1.35, 0]} color={p.steel} p={p} />
      <CylX r={0.95} len={0.18} at={[-0.18, 1.35, 0]} color={p.steel} p={p} />
      <CylX r={0.9} len={0.08} at={[-1.4, 1.35, 0]} color={p.steel} p={p} edges={false} />
      {/* bearing housings and the exposed shaft */}
      <CylX r={0.36} len={0.5} at={[-2.95, 1.35, 0]} color={p.steel} p={p} />
      <CylX r={0.36} len={0.5} at={[0.12, 1.35, 0]} color={p.steel} p={p} />
      <CylX r={0.09} len={4.2} at={[0.2, 1.35, 0]} color={p.pipe} p={p} edges={false} />
      {/* suction and discharge nozzles with their lines */}
      <Nozzle at={[-1.95, 2.1, 0]} r={0.32} h={0.7} p={p} />
      <Nozzle at={[-0.85, 2.1, 0]} r={0.26} h={0.55} p={p} />
      <Pipe points={[[-1.95, 2.85, 0], [-1.95, 3.35, 0], [-1.95, 3.35, -1.2], [-1.95, 3.35, -2.4]]} r={0.3} p={p} />
      <Pipe points={[[-0.85, 2.7, 0], [-0.85, 3.05, 0], [-0.85, 3.05, -1.1], [-0.85, 3.05, -2.4]]} r={0.24} p={p} />
      {/* coupling guard, then the driver */}
      <Box size={[0.9, 0.56, 0.62]} at={[0.85, 1.35, 0]} color={p.guard} p={p} metal={0.2} rough={0.5} />
      <Box size={[2.2, 0.72, 1.4]} at={[2.5, 0.58, 0]} color={p.steelDark} p={p} />
      <CylX r={0.74} len={2.0} at={[2.5, 1.32, 0]} color={p.paintAlt} p={p} />
      <Fins r={0.74} len={1.7} at={[2.5, 1.32, 0]} p={p} />
      <CylX r={0.66} len={0.3} at={[3.65, 1.32, 0]} color={p.steel} p={p} />
      <Box size={[0.52, 0.36, 0.5]} at={[2.4, 2.2, 0]} color={p.steelDark} p={p} />
      {/* lube oil console beside the train */}
      <Box size={[2.0, 0.18, 1.3]} at={[-1, 0.09, 2.2]} color={p.steelDark} p={p} />
      <Box size={[1.6, 0.9, 1.0]} at={[-1, 0.63, 2.2]} color={p.steelDark} p={p} />
      <CylX r={0.38} len={1.3} at={[-1, 1.48, 2.2]} color={p.paint} p={p} />
      <CylY r={0.13} h={0.5} at={[-0.25, 1.33, 2.45]} color={p.steel} p={p} />
      <CylY r={0.13} h={0.5} at={[-0.25, 1.33, 1.95]} color={p.steel} p={p} />
      <Pipe points={[[-0.35, 1.2, 1.75], [-0.35, 1.2, 1.2], [0.12, 1.05, 0.5], [0.12, 1.08, 0.3]]} r={0.05} p={p} />
      <Pipe points={[[-1.65, 1.2, 1.75], [-2.4, 1.15, 1.2], [-2.95, 1.05, 0.5], [-2.95, 1.08, 0.3]]} r={0.05} p={p} />
      {/* twin lube-oil coolers (one on line, one standby): the tube leak that watered the oil was here */}
      <Box size={[0.9, 0.12, 1.3]} at={[-2.45, 0.06, 2.2]} color={p.steelDark} p={p} />
      {[2.5, 1.9].map((z) => (
        <group key={z}>
          <CylY r={0.2} h={1.1} at={[-2.45, 0.7, z]} color={p.paintAlt} p={p} />
          <CylY r={0.23} h={0.06} at={[-2.45, 1.26, z]} color={p.steel} p={p} />
          <CylY r={0.23} h={0.06} at={[-2.45, 0.16, z]} color={p.steel} p={p} />
          <Pipe points={[[-2.3, 0.45, z], [-2.0, 0.45, z], [-2.0, 0.45, z + (z > 2.2 ? 0.5 : -0.5)]]} r={0.04} p={p} />
        </group>
      ))}
      <Pipe points={[[-1.8, 0.9, 2.2], [-2.25, 0.9, 2.2]]} r={0.05} p={p} />
    </group>
  );
}

function Pump({ p, motor = false }: { p: ScenePalette; motor?: boolean }) {
  const mr = motor ? 0.62 : 0.5;
  return (
    <group>
      <Skid w={4.8} d={1.7} at={[0.25, 0, 0]} p={p} />
      {/* volute casing, axial suction, top discharge */}
      <Box size={[0.5, 0.5, 0.6]} at={[-1.3, 0.47, 0]} color={p.steelDark} p={p} />
      <CylX r={0.62} len={0.5} at={[-1.3, 1.0, 0]} color={p.paint} p={p} metal={0.35} />
      <CylX r={0.2} len={0.6} at={[-1.85, 1.0, 0]} color={p.steel} p={p} edges={false} />
      <CylX r={0.3} len={0.07} at={[-2.15, 1.0, 0]} color={p.steel} p={p} />
      <Pipe points={[[-2.18, 1.0, 0], [-2.6, 1.0, 0], [-2.6, 1.0, -0.6], [-2.6, 1.0, -1.4]]} r={0.2} p={p} />
      <Nozzle at={[-1.25, 1.55, 0]} r={0.17} h={0.55} p={p} />
      <Pipe points={[[-1.25, 2.15, 0], [-1.25, 2.55, 0], [-1.25, 2.55, -0.7], [-1.25, 2.55, -1.4]]} r={0.17} p={p} />
      {/* seal chamber with its flush line, bearing frame */}
      <CylX r={0.34} len={0.16} at={[-0.97, 1.0, 0]} color={p.steel} p={p} />
      <Pipe points={[[-1.15, 1.55, 0.25], [-1.1, 1.62, 0.45], [-0.98, 1.4, 0.5], [-0.97, 1.2, 0.36]]} r={0.035} p={p} />
      {!motor && (
        <group>
          {/* seal pot on its stand and the seal cooler, both on the RCA checklist for the API-682 seal */}
          <Box size={[0.06, 1.3, 0.06]} at={[-0.7, 0.85, 0.75]} color={p.steelDark} p={p} edges={false} />
          <CylY r={0.13} h={0.42} at={[-0.7, 1.72, 0.75]} color={p.paint} p={p} />
          <CylY r={0.15} h={0.04} at={[-0.7, 1.95, 0.75]} color={p.steel} p={p} edges={false} />
          <CylY r={0.09} h={0.34} at={[-0.4, 1.62, 0.75]} color={p.paintAlt} p={p} />
          <Pipe points={[[-0.97, 1.08, 0.3], [-0.97, 1.5, 0.75], [-0.83, 1.6, 0.75]]} r={0.025} p={p} />
          <Pipe points={[[-0.57, 1.7, 0.75], [-0.49, 1.7, 0.75]]} r={0.025} p={p} />
          <Pipe points={[[-0.4, 1.45, 0.75], [-0.4, 1.3, 1.0], [-0.4, 1.3, 1.3]]} r={0.025} p={p} />
        </group>
      )}
      <CylX r={0.3} len={1.0} at={[-0.4, 1.0, 0]} color={p.steel} p={p} />
      <Box size={[0.5, 0.55, 0.5]} at={[-0.4, 0.5, 0]} color={p.steelDark} p={p} />
      {/* coupling guard and motor */}
      <Box size={[0.56, 0.46, 0.46]} at={[0.3, 1.0, 0]} color={p.guard} p={p} metal={0.2} rough={0.5} />
      <Box size={[1.4, 1.0 - mr, 0.9]} at={[1.4, 0.22 + (1.0 - mr) / 2, 0]} color={p.steelDark} p={p} />
      <CylX r={mr} len={1.6} at={[1.4, 1.0, 0]} color={p.paintAlt} p={p} />
      <Fins r={mr} len={1.35} at={[1.4, 1.0, 0]} count={16} p={p} />
      <CylX r={mr * 0.95} len={0.32} at={[2.35, 1.0, 0]} color={p.steel} p={p} />
      <Box size={[0.42, 0.3, 0.42]} at={[1.35, 1.0 + mr + 0.12, 0]} color={p.steelDark} p={p} />
      {motor && (
        <group>
          {/* TEFC fan cowl over the NDE, and the grease nipples of the DE and NDE bearings */}
          <CylX r={mr * 1.04} len={0.42} at={[2.62, 1.0, 0]} color={p.paintAlt} p={p} />
          <CylX r={mr * 0.9} len={0.03} at={[2.84, 1.0, 0]} color={p.steelDark} p={p} edges={false} />
          {[0.66, 2.16].map((x) => <CylY key={x} r={0.035} h={0.16} at={[x, 1.0 + mr + 0.04, 0.12]} color={p.guard} p={p} edges={false} />)}
        </group>
      )}
    </group>
  );
}

function Exchanger({ p }: { p: ScenePalette }) {
  return (
    <group>
      <Box size={[6.6, 0.24, 1.9]} at={[-0.25, 0.12, 0]} color={p.theme === "dark" ? "#1d201e" : "#d7d3c5"} p={p} edges={false} rough={0.9} metal={0} />
      {[-1.5, 1.4].map((x) => <Box key={x} size={[0.36, 0.86, 1.3]} at={[x, 0.66, 0]} color={p.steelDark} p={p} />)}
      {/* shell, rear dished head, channel with its flanges and cover */}
      <CylX r={0.7} len={4.6} at={[0, 1.35, 0]} color={p.paintAlt} p={p} />
      <mesh position={[2.3, 1.35, 0]} scale={[0.4, 1, 1]} castShadow>
        <sphereGeometry args={[0.7, 32, 16, 0, Math.PI * 2, 0, Math.PI]} />
        <Metal color={p.paintAlt} edges={p.edge} />
      </mesh>
      <CylX r={0.74} len={0.8} at={[-2.7, 1.35, 0]} color={p.paint} p={p} />
      <CylX r={0.83} len={0.09} at={[-2.3, 1.35, 0]} color={p.steel} p={p} />
      <CylX r={0.83} len={0.09} at={[-3.1, 1.35, 0]} color={p.steel} p={p} />
      <CylX r={0.78} len={0.06} at={[-3.18, 1.35, 0]} color={p.steel} p={p} />
      {/* nozzles: tube side (feed) in on the channel top, shell side in and out on top */}
      <Nozzle at={[-2.85, 2.05, 0]} r={0.2} h={0.6} p={p} />
      {/* tube-side outlet under the channel: the dP the sheet records is across this inlet and outlet pair */}
      <Nozzle at={[-2.55, 0.66, 0]} r={0.18} h={0.28} dir={-1} p={p} />
      <Pipe points={[[-2.55, 0.36, 0], [-2.55, 0.36, -0.9], [-2.55, 0.36, -1.9]]} r={0.16} p={p} />
      <Nozzle at={[-1.6, 2.05, 0]} r={0.24} h={0.5} p={p} />
      <Nozzle at={[1.6, 2.05, 0]} r={0.24} h={0.6} p={p} />
      <Pipe points={[[-2.85, 2.7, 0], [-2.85, 3.05, 0], [-2.85, 3.05, -1.0], [-2.85, 3.05, -1.9]]} r={0.18} p={p} />
      <Pipe points={[[1.6, 2.7, 0], [1.6, 3.15, 0], [1.6, 3.15, -1.0], [1.6, 3.15, -1.9]]} r={0.22} p={p} />
      {/* shell bands */}
      {[-1.0, 0.0, 1.0].map((x) => <CylX key={x} r={0.715} len={0.05} at={[x, 1.35, 0]} color={p.steel} p={p} edges={false} />)}
    </group>
  );
}

function Blower({ p }: { p: ScenePalette }) {
  const cone = new THREE.Euler(0, 0, Math.PI / 2);
  return (
    <group>
      <Skid w={5.6} d={2.4} at={[0.2, 0, 0]} p={p} />
      {/* scroll housing with its outlet duct and inlet cone */}
      <Box size={[1.0, 0.5, 1.4]} at={[-1.25, 0.47, 0]} color={p.steelDark} p={p} />
      <CylX r={1.15} len={0.8} at={[-1.25, 1.62, 0]} color={p.paint} p={p} metal={0.3} />
      <Box size={[0.8, 1.15, 0.95]} at={[-1.25, 2.5, 0.62]} color={p.paint} p={p} metal={0.3} />
      <Box size={[0.95, 0.1, 1.1]} at={[-1.25, 3.1, 0.62]} color={p.steel} p={p} />
      <mesh position={[-1.9, 1.62, 0]} rotation={cone} castShadow>
        <cylinderGeometry args={[0.62, 0.42, 0.5, 36, 1, true]} />
        <Metal color={p.steel} edges={p.edge} />
      </mesh>
      {/* bearing pedestals, shaft, coupling guard, motor */}
      {[-0.3, 0.42].map((x) => (
        <group key={x}>
          <Box size={[0.34, 1.15, 0.7]} at={[x, 0.8, 0]} color={p.steelDark} p={p} />
          <CylX r={0.26} len={0.36} at={[x, 1.62, 0]} color={p.steel} p={p} />
        </group>
      ))}
      <CylX r={0.08} len={1.7} at={[0.1, 1.62, 0]} color={p.pipe} p={p} edges={false} />
      <Box size={[0.5, 0.42, 0.42]} at={[0.98, 1.62, 0]} color={p.guard} p={p} metal={0.2} rough={0.5} />
      <Box size={[1.6, 1.0, 1.0]} at={[2.1, 0.72, 0]} color={p.steelDark} p={p} />
      {/* motor feet on their shims: the RCA found one foot 0.12 mm soft */}
      {[[1.45, 0.42], [2.75, 0.42], [1.45, -0.42], [2.75, -0.42]].map(([x, z]) => (
        <Box key={x + "," + z} size={[0.3, 0.05, 0.26]} at={[x, 0.245, z]} color={p.guard} p={p} edges={false} />
      ))}
      <CylX r={0.6} len={1.6} at={[2.1, 1.62, 0]} color={p.paintAlt} p={p} />
      <Fins r={0.6} len={1.35} at={[2.1, 1.62, 0]} count={16} p={p} />
      <CylZ r={0.12} len={0.3} at={[2.1, 1.62, 0.7]} color={p.steel} p={p} edges={false} />
      <Box size={[0.42, 0.3, 0.42]} at={[2.05, 2.36, 0]} color={p.steelDark} p={p} />
    </group>
  );
}

export function MachineModel({ kind, p }: { kind: MachineKind; p: ScenePalette }) {
  if (kind === "compressor") return <Compressor p={p} />;
  if (kind === "exchanger") return <Exchanger p={p} />;
  if (kind === "blower") return <Blower p={p} />;
  return <Pump p={p} motor={kind === "motorpump"} />;
}
