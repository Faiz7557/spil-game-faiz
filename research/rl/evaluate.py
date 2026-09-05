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


def _pilot_row(r, name, plan, scenario):
    # A deterministic policy has no within-seed spread, so one run per seed is
    # the whole story; see README, "Repetitions for stochastic agents".
    return ','.join(str(x) for x in [
        r['seed'], name, plan, 1,
        '%.4f' % rho_for(scenario), scenario['reeferShare'], scenario['committedShare'],
        '%.0f' % r['cash'], 0, '%.0f' % r['revenue'],
        '%.0f' % r['revenueLoad'], '%.0f' % r['revenueDischarge'], '%.0f' % r['revenueDrain'],
        '%.3f' % r['restowContainers'], '%.3f' % r['rolled'],
        '%.0f' % r['restowPenalty'], '%.0f' % r['restowPenaltyDrain'],
        '%.0f' % r['rollingPenalty'],
        '%.6f' % r['meanUtilisation'], '%.3f' % r['accepted'], '%.3f' % r['loaded'],
        '%.0f' % r['offered'],
        '%.3f' % r['aboardAtHorizon'], '%.0f' % r['valueAboardAtHorizon'],
        '%.4f' % r['decisionMs'], '%.4f' % r['decisionMsMax'], '%.4f' % r['meanDecisionMs'],
    ])


def _sens_row(r, name, plan, stratum):
    scenario = stratum['scenario']
    return ','.join(str(x) for x in [
        stratum['id'], '%.2f' % stratum['rho'], '%.2f' % stratum['sigma'],
        '%.2f' % stratum['kappa'], '%.4f' % rho_reefer_for(scenario),
        r['seed'], name, plan,
        '%.0f' % r['cash'], '%.0f' % r['revenue'],
        '%.3f' % r['restowContainers'], '%.3f' % r['rolled'],
        '%.6f' % r['meanUtilisation'], '%.3f' % r['accepted'], '%.3f' % r['loaded'],
        '%.0f' % r['offered'], '%.4f' % r['meanDecisionMs'],
    ])


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model', required=True)
    parser.add_argument('--algo', choices=sorted(LOADERS), required=True)
    parser.add_argument('--agent-name', required=True,
                        help='the name this agent gets in the results table')
    parser.add_argument('--plan', default='A5')
    parser.add_argument('--mode', choices=['test', 'sens'], default='test')
    parser.add_argument('--seeds', type=int, default=300)
    parser.add_argument('--out', default=None)
    args = parser.parse_args(argv)

    model = LOADERS[args.algo].load(args.model, device='cpu')
    agent = PolicyAgent(maskable_policy(model, deterministic=True),
                        name=args.agent_name, plan=args.plan)

    if args.mode == 'test':
        lo, hi = SPLITS['test']
        if args.seeds > hi - lo:
            print('TEST holds only %d seeds; asked for %d' % (hi - lo, args.seeds))
            return 2
        seeds = [lo + i for i in range(args.seeds)]
        rows = [PILOT_HEADER]
        cash = []
        for seed in seeds:
            r = run_episode(agent, seed, scenario=NOMINAL_SCENARIO)
            rows.append(_pilot_row(r, args.agent_name, args.plan, NOMINAL_SCENARIO))
            cash.append(r['cash'])
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
                r = run_episode(agent, seed, scenario=stratum['scenario'])
                rows.append(_sens_row(r, args.agent_name, args.plan, stratum))
                cash.append(r['cash'])
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
