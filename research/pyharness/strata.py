"""Port of research/src/strata.mjs - the factorial design for V5.

Three scenario factors, crossed fully: 4 x 2 x 3 = 24 strata.

    rho    offered load        {0.60, 0.75, 0.90, 1.05}
    sigma  REEFER share        {0.30, 0.45}
    kappa  Committed share     {0.25, 0.40, 0.55}

Also the sampling pool for RL domain randomization: an episode draws a seed from
the TRAIN range and a stratum from here independently, because `seed` only feeds
the demand PRNG while the stratum only sets `generate_orders`' scenario knobs.
The two axes are orthogonal, so no stratum can leak a TEST or SENS seed.
"""

from .circuit import intensity_for_rho, rho_for, rho_reefer_for

LEVELS = {
    'rho': [0.60, 0.75, 0.90, 1.05],
    'sigma': [0.30, 0.45],
    'kappa': [0.25, 0.40, 0.55],
}

NOMINAL_CELL = {'rho': 0.90, 'sigma': 0.30, 'kappa': 0.40}


def scenario_for(cell):
    return {
        'intensity': intensity_for_rho(cell['rho']),
        'reeferShare': cell['sigma'],
        'committedShare': cell['kappa'],
    }


def stratum_id(cell):
    return 'r%.2f_s%.2f_k%.2f' % (cell['rho'], cell['sigma'], cell['kappa'])


def all_strata():
    """All 24 cells, each with its label, generator scenario and derived loads."""
    out = []
    for rho in LEVELS['rho']:
        for sigma in LEVELS['sigma']:
            for kappa in LEVELS['kappa']:
                cell = {'rho': rho, 'sigma': sigma, 'kappa': kappa}
                scenario = scenario_for(cell)
                out.append({
                    **cell,
                    'id': stratum_id(cell),
                    'isNominal': (rho == NOMINAL_CELL['rho']
                                  and sigma == NOMINAL_CELL['sigma']
                                  and kappa == NOMINAL_CELL['kappa']),
                    'scenario': scenario,
                    'rhoActual': rho_for(scenario),
                    'rhoReefer': rho_reefer_for(scenario),
                })
    return out
