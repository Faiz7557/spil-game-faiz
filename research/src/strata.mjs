/**
 * Factorial design for the sensitivity experiment (V5).
 *
 * Three scenario factors, crossed fully: 4 x 2 x 3 = 24 strata.
 *
 *   rho    offered load        {0.60, 0.75, 0.90, 1.05}
 *   sigma  REEFER share        {0.30, 0.45}
 *   kappa  Committed share     {0.25, 0.40, 0.55}
 *
 * rho is specified in the units the thesis reports and converted to the
 * generator's `intensity` knob by intensityForRho(), so a stratum label means
 * the same thing in the results table as it does in the method chapter.
 *
 * The NOMINAL cell (rho 0.90, sigma 0.30, kappa 0.40) is deliberately inside
 * the design, so the main experiment is the centre of the sensitivity study
 * rather than a separate, unrelated condition.
 *
 * Note on the stress corner: at rho = 1.05 with sigma = 0.45 the REEFER berth
 * is oversubscribed (rho_REEFER > 1.4), so some cargo MUST roll no matter how
 * good the agent is. That cell is kept on purpose - it tests whether the
 * ranking survives a regime where skill cannot fully compensate.
 */
import { intensityForRho, rhoFor, rhoReeferFor } from './circuit.mjs';

export const LEVELS = {
  rho: [0.60, 0.75, 0.90, 1.05],
  sigma: [0.30, 0.45],
  kappa: [0.25, 0.40, 0.55]
};

export const NOMINAL_CELL = { rho: 0.90, sigma: 0.30, kappa: 0.40 };

export const scenarioFor = ({ rho, sigma, kappa }) => ({
  intensity: intensityForRho(rho),
  reeferShare: sigma,
  committedShare: kappa
});

export const stratumId = ({ rho, sigma, kappa }) =>
  'r' + rho.toFixed(2) + '_s' + sigma.toFixed(2) + '_k' + kappa.toFixed(2);

/** All 24 cells, each with its label, generator scenario and derived loads. */
export const allStrata = () => {
  const out = [];
  for (const rho of LEVELS.rho) {
    for (const sigma of LEVELS.sigma) {
      for (const kappa of LEVELS.kappa) {
        const cell = { rho, sigma, kappa };
        const scenario = scenarioFor(cell);
        out.push({
          ...cell,
          id: stratumId(cell),
          isNominal: rho === NOMINAL_CELL.rho
            && sigma === NOMINAL_CELL.sigma
            && kappa === NOMINAL_CELL.kappa,
          scenario,
          rhoActual: rhoFor(scenario),
          rhoReefer: rhoReeferFor(scenario)
        });
      }
    }
  }
  return out;
};
