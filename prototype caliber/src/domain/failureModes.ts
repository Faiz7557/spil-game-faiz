// prototype/src/domain/failureModes.ts
// Failure-mode library for the five equipment families that have condition data in the CALIBER case.
// Written by the team from general reliability practice and mapped to ISO 14224 (Annex B) failure-mode and
// failure-mechanism codes. Not independently reviewed yet, and the team read the five RCA decks before writing it:
// results that use it are labelled accordingly (docs/bukti_ai_diagnosis.md). In a pilot it is replaced by the
// company's FMEA/RCM library.

export type SignalKind =
  | "vibration" | "bearing_temp" | "lube_water" | "lube_supply_press" | "seal_flush_flow" | "discharge_press"
  | "motor_current" | "winding_temp" | "harmonic_2x" | "coupling_offset" | "dp" | "duty" | "outlet_temp" | "feed_heavy_ends";
/** 1 = rises, -1 = falls, 0 = should stay inside the baseline band. */
export type Dir = 1 | -1 | 0;
export type Family = "CO" | "PU" | "EM" | "HX" | "BL";

export interface FailureMode {
  id: string; family: Family; title: string;
  iso14224: { mode: string; mechanism: string };
  /** Expected movement per signal; null = may move either way, so it neither supports nor contradicts. */
  signature: Partial<Record<SignalKind, Dir | null>>;
  check: { test: string; ifTrue: string; ifFalse: string; cost: "low" | "medium" | "high" };
  /** Register component names (lower case) this mode can explain; used for records without condition data. */
  components: string[];
}

/** Equipment.type in the condition files → family. */
export const EQUIPMENT_FAMILY: Record<string, Family> = {
  "Centrifugal Compressor": "CO", "Centrifugal Pump": "PU", "Centrifugal Pump / Electric Motor": "EM",
  "Shell & Tube Heat Exchanger": "HX", "Centrifugal Blower": "BL",
};
/** Incident.eq_type code in the register → family. */
export const REGISTER_FAMILY: Record<string, Family> = { CO: "CO", PU: "PU", EM: "EM", HB: "HX", BL: "BL" };

export const FAILURE_MODES: FailureMode[] = [
  // Centrifugal compressor
  { id: "CO-1", family: "CO", title: "Journal-bearing distress from water contamination of the lube oil",
    iso14224: { mode: "VIB", mechanism: "5.2 Contamination" },
    signature: { vibration: 1, bearing_temp: 1, lube_water: 1, lube_supply_press: null },
    check: { test: "Take a lube-oil sample for Karl Fischer water content, then pressure-test the lube-oil cooler tubes.",
      ifTrue: "Water above the alarm limit points to ingress; the cooler test locates the source.",
      ifFalse: "Water in range argues against contamination; look at oil supply and alignment next.", cost: "low" },
    components: ["journal bearing", "bearing"] },
  { id: "CO-2", family: "CO", title: "Oil starvation from low lube-oil supply (filter plugging, pump or pressure-control fault)",
    iso14224: { mode: "OHE", mechanism: "5.1 Blockage/plugged" },
    signature: { lube_supply_press: -1, bearing_temp: 1, vibration: 1, lube_water: 0 },
    check: { test: "Read lube-oil filter dP, standby-pump auto-start history and the pressure-control valve setting.",
      ifTrue: "High filter dP or pump starts confirm a supply problem.", ifFalse: "Normal supply side moves suspicion to the bearing itself.", cost: "low" },
    components: ["bearing", "journal bearing", "valve"] },
  { id: "CO-3", family: "CO", title: "Rotor unbalance from deposits or fouling",
    iso14224: { mode: "VIB", mechanism: "1.2 Vibration" },
    signature: { vibration: 1, bearing_temp: 0, lube_water: 0, lube_supply_press: 0 },
    check: { test: "Vibration spectrum: look for a dominant 1X component with stable phase.",
      ifTrue: "Dominant 1X with stable phase indicates unbalance.", ifFalse: "Other orders point away from unbalance.", cost: "low" },
    components: ["impeller", "rotor"] },
  { id: "CO-4", family: "CO", title: "Shaft misalignment",
    iso14224: { mode: "VIB", mechanism: "1.3 Clearance/alignment failure" },
    signature: { vibration: 1, bearing_temp: 1, lube_water: 0, lube_supply_press: 0 },
    check: { test: "Check 2X and axial vibration; schedule a hot alignment check at the next stop.",
      ifTrue: "High 2X/axial supports misalignment.", ifFalse: "Low 2X/axial argues against it.", cost: "medium" },
    components: ["coupling", "shaft"] },
  { id: "CO-5", family: "CO", title: "Bearing wear-out (fatigue at end of life)",
    iso14224: { mode: "VIB", mechanism: "2.6 Fatigue" },
    signature: { vibration: 1, bearing_temp: 1, lube_water: 0, lube_supply_press: 0 },
    check: { test: "Oil debris analysis (ferrography) for babbitt particles; compare bearing age with its design life.",
      ifTrue: "Babbitt debris with an old bearing supports wear-out.", ifFalse: "Clean oil or a young bearing argues against it.", cost: "low" },
    components: ["bearing", "journal bearing"] },
  // Centrifugal pump
  { id: "PU-1", family: "PU", title: "Mechanical-seal failure from dry running or cavitation (low NPSH, low seal flush)",
    iso14224: { mode: "ELP", mechanism: "2.1 Cavitation" },
    signature: { seal_flush_flow: -1, discharge_press: -1, vibration: 1, bearing_temp: null },
    check: { test: "Compare suction pressure with NPSH required during rate changes and log seal-flush flow against the seal plan minimum.",
      ifTrue: "NPSH margin loss and low flush flow confirm dry-running risk.", ifFalse: "Adequate margin and flush point to another seal failure cause.", cost: "low" },
    components: ["mechanical seal", "seal"] },
  { id: "PU-2", family: "PU", title: "Bearing lubrication degradation",
    iso14224: { mode: "OHE", mechanism: "2.4 Wear" },
    signature: { vibration: 1, bearing_temp: 1, discharge_press: 0, seal_flush_flow: 0 },
    check: { test: "Inspect oil level and condition; trend bearing temperature against ambient.",
      ifTrue: "Degraded or low oil supports a lubrication fault.", ifFalse: "Good oil moves suspicion elsewhere.", cost: "low" },
    components: ["bearing"] },
  { id: "PU-3", family: "PU", title: "Impeller wear or internal recirculation",
    iso14224: { mode: "LOO", mechanism: "2.4 Wear" },
    signature: { discharge_press: -1, vibration: null, seal_flush_flow: 0, bearing_temp: 0 },
    check: { test: "Performance test: compare flow and head with the pump curve.",
      ifTrue: "Head below the curve at the same flow indicates internal wear.", ifFalse: "Head on the curve argues against it.", cost: "medium" },
    components: ["impeller"] },
  { id: "PU-4", family: "PU", title: "Pump-driver misalignment",
    iso14224: { mode: "VIB", mechanism: "1.3 Clearance/alignment failure" },
    signature: { vibration: 1, bearing_temp: 1, discharge_press: 0, seal_flush_flow: 0 },
    check: { test: "Check 2X/axial vibration and coupling condition; laser alignment at the next opportunity.",
      ifTrue: "Offset beyond tolerance confirms misalignment.", ifFalse: "Alignment in tolerance rules it out.", cost: "medium" },
    components: ["coupling", "shaft"] },
  { id: "PU-5", family: "PU", title: "Seal-flush line plugging (strainer or orifice)",
    iso14224: { mode: "PLU", mechanism: "5.1 Blockage/plugged" },
    signature: { seal_flush_flow: -1, discharge_press: 0, vibration: 0, bearing_temp: 0 },
    check: { test: "Inspect the seal-flush strainer and orifice; compare flush flow before and after cleaning.",
      ifTrue: "Flow restored after cleaning confirms plugging.", ifFalse: "Unchanged flow points upstream.", cost: "low" },
    components: ["mechanical seal", "seal", "valve"] },
  // Electric motor driving a pump
  { id: "EM-1", family: "EM", title: "Motor bearing grease degradation (interval too long for duty)",
    iso14224: { mode: "OHE", mechanism: "2.4 Wear" },
    signature: { bearing_temp: 1, vibration: 1, motor_current: null, winding_temp: null },
    check: { test: "Ultrasound or grease inspection at the drive-end bearing; compare the re-lubrication interval with duty and ambient.",
      ifTrue: "Dry or degraded grease confirms lubrication failure.", ifFalse: "Good grease points to load or alignment.", cost: "low" },
    components: ["motor bearing", "bearing"] },
  { id: "EM-2", family: "EM", title: "Stator winding insulation degradation",
    iso14224: { mode: "OHE", mechanism: "4.5 Earth/isolation fault" },
    signature: { winding_temp: 1, motor_current: 1, bearing_temp: 0, vibration: 0 },
    check: { test: "Insulation resistance and polarization index test at the next stop.",
      ifTrue: "Low IR/PI confirms insulation degradation.", ifFalse: "Healthy insulation rules it out.", cost: "medium" },
    components: ["motor", "stator", "winding"] },
  { id: "EM-3", family: "EM", title: "Overload from the driven pump or process",
    iso14224: { mode: "OHE", mechanism: "2.7 Overheating" },
    signature: { motor_current: 1, winding_temp: 1, bearing_temp: null, vibration: 0 },
    check: { test: "Compare pump flow and head with the curve and check recent process or rate changes.",
      ifTrue: "Operation right of the curve explains the overload.", ifFalse: "Normal duty points to the motor itself.", cost: "low" },
    components: ["motor", "impeller"] },
  { id: "EM-4", family: "EM", title: "Motor-pump misalignment or soft foot",
    iso14224: { mode: "VIB", mechanism: "1.3 Clearance/alignment failure" },
    signature: { vibration: 1, bearing_temp: 1, motor_current: 0, winding_temp: 0 },
    check: { test: "Laser alignment and soft-foot check.", ifTrue: "Out-of-tolerance offset confirms it.", ifFalse: "In tolerance rules it out.", cost: "medium" },
    components: ["coupling", "shaft"] },
  // Shell & tube heat exchanger
  { id: "HX-1", family: "HX", title: "Tube-side fouling driven by feed contaminants (heavy ends)",
    iso14224: { mode: "PDE", mechanism: "5.1 Blockage/plugged" },
    signature: { dp: 1, duty: -1, outlet_temp: -1, feed_heavy_ends: 1 },
    check: { test: "Lab analysis of feed heavy ends with the tube-side dP trend; inspect tubes at the next cleaning.",
      ifTrue: "Rising heavy ends with rising dP confirms feed-driven fouling.", ifFalse: "Clean feed points to the other side or bypassing.", cost: "low" },
    components: ["tube bundle"] },
  { id: "HX-2", family: "HX", title: "Shell-side (utility side) fouling",
    iso14224: { mode: "PDE", mechanism: "5.1 Blockage/plugged" },
    signature: { duty: -1, outlet_temp: -1, dp: 0, feed_heavy_ends: 0 },
    check: { test: "Trend shell-side dP and utility inlet/outlet temperatures.",
      ifTrue: "Rising shell-side dP confirms it.", ifFalse: "Flat shell-side dP rules it out.", cost: "low" },
    components: ["tube bundle", "shell"] },
  { id: "HX-3", family: "HX", title: "Flow bypassing (passing bypass valve or pass-partition leak)",
    iso14224: { mode: "INL", mechanism: "1.1 Leakage" },
    signature: { duty: -1, outlet_temp: -1, dp: -1, feed_heavy_ends: 0 },
    check: { test: "Check bypass valve position and pass-partition gasket at the next opening.",
      ifTrue: "A passing valve or gasket explains duty loss with falling dP.", ifFalse: "Tight bypass rules it out.", cost: "medium" },
    components: ["gasket", "valve"] },
  // Centrifugal blower
  { id: "BL-1", family: "BL", title: "Coupling misalignment and soft foot",
    iso14224: { mode: "VIB", mechanism: "1.3 Clearance/alignment failure" },
    signature: { vibration: 1, harmonic_2x: 1, coupling_offset: 1, bearing_temp: null },
    check: { test: "Laser alignment and soft-foot check; inspect the coupling element.",
      ifTrue: "Offset and soft foot beyond tolerance confirm it.", ifFalse: "In tolerance moves suspicion to looseness or bearings.", cost: "low" },
    components: ["coupling"] },
  { id: "BL-2", family: "BL", title: "Impeller unbalance from deposits",
    iso14224: { mode: "VIB", mechanism: "1.2 Vibration" },
    signature: { vibration: 1, harmonic_2x: 0, coupling_offset: 0, bearing_temp: null },
    check: { test: "Vibration spectrum for dominant 1X; inspect and clean the impeller.",
      ifTrue: "Dominant 1X that drops after cleaning confirms it.", ifFalse: "Other orders point elsewhere.", cost: "low" },
    components: ["impeller", "rotor"] },
  { id: "BL-3", family: "BL", title: "Rolling-bearing defect or lubrication",
    iso14224: { mode: "VIB", mechanism: "2.4 Wear" },
    signature: { vibration: 1, bearing_temp: 1, harmonic_2x: null, coupling_offset: 0 },
    check: { test: "Envelope spectrum for bearing defect frequencies; check grease condition.",
      ifTrue: "Defect frequencies confirm a bearing fault.", ifFalse: "No defect frequencies rule it out.", cost: "low" },
    components: ["bearing"] },
  { id: "BL-4", family: "BL", title: "Mechanical looseness (base, hold-down bolts)",
    iso14224: { mode: "VIB", mechanism: "1.5 Looseness" },
    signature: { vibration: 1, harmonic_2x: 1, coupling_offset: 0, bearing_temp: null },
    check: { test: "Check hold-down bolt torque and base condition; look for multiple running-speed harmonics.",
      ifTrue: "Loose bolts or many harmonics confirm looseness.", ifFalse: "Tight base rules it out.", cost: "low" },
    components: ["shaft", "coupling"] },
];

export const modesFor = (f: Family) => FAILURE_MODES.filter((m) => m.family === f);
export const modeById = (id: string) => FAILURE_MODES.find((m) => m.id === id);
