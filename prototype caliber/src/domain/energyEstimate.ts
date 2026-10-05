// prototype/src/domain/energyEstimate.ts
// Converts the motor-current proxy to an energy and emissions ESTIMATE using company inputs. Nothing is pre-filled:
// voltage and power factor come from the motor nameplate or meter, the emission factor from the approved grid factor.
export interface EnergyInputs { voltageV: number | null; powerFactor: number | null; efKgPerKwh: number | null }

export function estimateEnergy(currentA: number[], run: string[], i: EnergyInputs) {
  if (i.voltageV == null || i.powerFactor == null) return { kwh: null, tco2: null };
  const kwh = currentA.reduce((s, a, h) => s + (run[h] === "ON" ? (Math.sqrt(3) * i.voltageV! * a * i.powerFactor!) / 1000 : 0), 0);
  return { kwh, tco2: i.efKgPerKwh == null ? null : (kwh * i.efKgPerKwh) / 1000 };
}
