"""Scores a trained policy through the harness and writes the standard CSVs.

    python -m research.rl.evaluate --model research/results/rl/ppo_seed0/best_model.zip \
        --algo ppo --agent-name annealingPpo --mode test --seeds 300

    python -m research.rl.evaluate --model ... --mode sens --seeds 100

Every number here comes from `run_episode`, the same episode loop that produced
A1-A4, and the columns match `run-pilot.mjs` and `run-sensitivity.mjs` exactly so
`analysis/stats.py` can read the rows without changes.

Seeds come from TEST for `--mode test` and SENS for `--mode sens`. Neither range
overlaps the TRAIN and VAL ranges the policy saw, so the disjointness that
docs/ASUMSI.md A-12 promises is enforced by construction rather than remembered.

ON decision_ms. It is recorded because the harness records it, but per A-13 it is
NOT comparable to the A1-A4 figures: those were measured in Node, these in
Python, and the ratio would say more about the two runtimes than about the two
algorithms. Report it separately and compare orders of magnitude only.

WHICH LINEUP SLOT. `--plan` defaults to A5. Whether the DQN and A2C comparators
join the ranked A1..A5 table or are reported alongside it as references is a
decision for the method chapter, not for this script, so it is an argument.
"""

import argparse
import sys
from pathlib import Path

import numpy as np

try:
    from sb3_contrib import MaskablePPO
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        'stable-baselines3 and sb3-contrib are required.\n'
        '    pip install -r research/rl/requirements.txt') from exc

from ..pyharness.circuit import NOMINAL_SCENARIO, rho_for, rho_reefer_for, run_episode
from ..pyharness.strata import all_strata
from .env import SPLITS
from .masked_algos import MaskableA2C, MaskableDQN
from .policy_agent import PolicyAgent, maskable_policy

LOADERS = {'ppo': MaskablePPO, 'a2c': MaskableA2C, 'dqn': MaskableDQN}

PILOT_HEADER = (
    'seed,agent,plan,replicates,rho,sigma,kappa,'
    'cash,cash_sd_within,revenue,revenue_load,revenue_discharge,revenue_drain,'
    'restow,rolled,restow_penalty,restow_penalty_drain,rolling_penalty,'
    'utilisation,accepted,loaded,offered,'
    'aboard_at_horizon,value_aboard_at_horizon,'
    'decision_ms,decision_ms_max,mean_decision_ms')

SENS_HEADER = (
    'stratum,rho,sigma,kappa,rho_reefer,seed,agent,plan,cash,revenue,restow,rolled,'
    'utilisation,accepted,loaded,offered,mean_decision_ms')


def _mean(results, key):
    return float(np.mean([r[key] for r in results]))


def _pilot_row(results, name, plan, scenario):
    """One row per scenario-seed, averaged over the TRAINING seeds.

    A trained policy is deterministic at evaluation time, so re-running it on
    one scenario changes nothing. What does change is which policy you get: the
    training run is stochastic, and a single training seed would report a draw
    from that distribution as if it were the algorithm.

    So training seeds are treated exactly as ASUMSI A-15 treats an agent's own
    repetitions - the cell value entering the blocked design is the mean over
    them, and the spread across them is reported separately as `cash_sd_within`
    rather than being folded into the between-seed variation.
    """
    cash = [r['cash'] for r in results]
    sd = float(np.std(cash, ddof=1)) if len(cash) > 1 else 0.0
    return ','.join(str(x) for x in [
        results[0]['seed'], name, plan, len(results),
        '%.4f' % rho_for(scenario), scenario['reeferShare'], scenario['committedShare'],
        '%.0f' % _mean(results, 'cash'), '%.0f' % sd, '%.0f' % _mean(results, 'revenue'),
        '%.0f' % _mean(results, 'revenueLoad'),
        '%.0f' % _mean(results, 'revenueDischarge'),
        '%.0f' % _mean(results, 'revenueDrain'),
        '%.3f' % _mean(results, 'restowContainers'), '%.3f' % _mean(results, 'rolled'),
        '%.0f' % _mean(results, 'restowPenalty'),
        '%.0f' % _mean(results, 'restowPenaltyDrain'),
        '%.0f' % _mean(results, 'rollingPenalty'),
        '%.6f' % _mean(results, 'meanUtilisation'),
        '%.3f' % _mean(results, 'accepted'), '%.3f' % _mean(results, 'loaded'),
        '%.0f' % _mean(results, 'offered'),
        '%.3f' % _mean(results, 'aboardAtHorizon'),
        '%.0f' % _mean(results, 'valueAboardAtHorizon'),
        '%.4f' % _mean(results, 'decisionMs'), '%.4f' % _mean(results, 'decisionMsMax'),
        '%.4f' % _mean(results, 'meanDecisionMs'),
    ])


def _sens_row(results, name, plan, stratum):
    scenario = stratum['scenario']
    return ','.join(str(x) for x in [
        stratum['id'], '%.2f' % stratum['rho'], '%.2f' % stratum['sigma'],
        '%.2f' % stratum['kappa'], '%.4f' % rho_reefer_for(scenario),
        results[0]['seed'], name, plan,
        '%.0f' % _mean(results, 'cash'), '%.0f' % _mean(results, 'revenue'),
        '%.3f' % _mean(results, 'restowContainers'), '%.3f' % _mean(results, 'rolled'),
        '%.6f' % _mean(results, 'meanUtilisation'),
        '%.3f' % _mean(results, 'accepted'), '%.3f' % _mean(results, 'loaded'),
        '%.0f' % _mean(results, 'offered'), '%.4f' % _mean(results, 'meanDecisionMs'),
    ])


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model', required=True, nargs='+',
                        help='one checkpoint per TRAINING seed. Passing all of '
                             'them averages over the seeds (ASUMSI A-15); passing '
                             'one reports a single draw from the training '
                             'distribution as if it were the algorithm.')
    parser.add_argument('--algo', choices=sorted(LOADERS), required=True)
    parser.add_argument('--agent-name', required=True,
                        help='the name this agent gets in the results table')
    parser.add_argument('--plan', default='A5')
    parser.add_argument('--mode', choices=['test', 'sens'], default='test')
    parser.add_argument('--seeds', type=int, default=300)
    parser.add_argument('--out', default=None)
    args = parser.parse_args(argv)

    agents = []
    for path in args.model:
        model = LOADERS[args.algo].load(path, device='cpu')
        agents.append(PolicyAgent(maskable_policy(model, deterministic=True),
                                  name=args.agent_name, plan=args.plan))
    print('%d training seed(s): %s' % (len(agents), ', '.join(args.model)))
    if len(agents) == 1:
        print('  NOTE: one checkpoint only, so cash_sd_within will be 0 and the '
              'row reports a single training draw, not the algorithm.')

    if args.mode == 'test':
        lo, hi = SPLITS['test']
        if args.seeds > hi - lo:
            print('TEST holds only %d seeds; asked for %d' % (hi - lo, args.seeds))
            return 2
        seeds = [lo + i for i in range(args.seeds)]
        rows = [PILOT_HEADER]
        cash = []
        for seed in seeds:
            results = [run_episode(a, seed, scenario=NOMINAL_SCENARIO) for a in agents]
            rows.append(_pilot_row(results, args.agent_name, args.plan,
                                   NOMINAL_SCENARIO))
            cash.append(_mean(results, 'cash'))
        out = Path(args.out or 'research/results/rl_test_%s.csv' % args.agent_name)
        summary = 'TEST  %d seeds, nominal   mean cash %.0f   median %.0f' % (
            len(seeds), float(np.mean(cash)), float(np.median(cash)))
    else:
        lo, _hi = SPLITS['sens']
        seeds = [lo + i for i in range(args.seeds)]
        strata = all_strata()
        rows = [SENS_HEADER]
        cash = []
        for stratum in strata:
            for seed in seeds:
                results = [run_episode(a, seed, scenario=stratum['scenario'])
                           for a in agents]
                rows.append(_sens_row(results, args.agent_name, args.plan, stratum))
                cash.append(_mean(results, 'cash'))
            print('  %-20s done' % stratum['id'])
        out = Path(args.out or 'research/results/rl_sens_%s.csv' % args.agent_name)
        summary = 'SENS  %d strata x %d seeds   mean cash %.0f' % (
            len(strata), len(seeds), float(np.mean(cash)))

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text('\n'.join(rows), encoding='utf-8')

    print('\n%s' % summary)
    print('wrote %d rows -> %s' % (len(rows) - 1, out))
    return 0


if __name__ == '__main__':
    sys.exit(main())
