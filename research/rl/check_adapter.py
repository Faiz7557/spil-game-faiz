"""Does scoring a policy give the same behaviour as training it?

    python -m research.rl.check_adapter

The learning agents are trained through `StowagePlanningEnv` and scored through
`run_episode` + `PolicyAgent`. Those are two different loops over the same
problem, and if they disagree, A5's reported result is not the behaviour that was
trained - it is whatever the second loop happened to do instead.

So this drives one fixed policy down both paths on identical (seed, scenario)
pairs and asserts the placement traces are identical: same containers, same
slots, same order. It also asserts the harness saw no physics violation and that
its `loaded` count matches the number of placements the policy actually made.

The probe policy is a fixed random linear scorer over the observation rather than
a trained model. It needs no torch, it is deterministic, and it makes varied
choices - a "first legal slot" policy would pass this test while exercising
almost none of the protocol.
"""

import argparse
import sys

import numpy as np

from ..pyharness.circuit import NOMINAL_SCENARIO, run_episode
from ..pyharness.strata import all_strata
from .env import DECLINE_ACTION, N_ACTIONS, OBS_LEN, SLOTS, StowagePlanningEnv
from .policy_agent import PolicyAgent


def linear_probe_policy(seed=0):
    """A deterministic, observation-dependent policy. Not trained, just varied."""
    weights = np.random.default_rng(seed).normal(size=(OBS_LEN, N_ACTIONS))

    def policy_fn(obs, mask):
        scores = np.asarray(obs, dtype=np.float64) @ weights
        scores = np.where(np.asarray(mask, dtype=bool), scores, -np.inf)
        return int(np.argmax(scores))

    return policy_fn


class _RecordingPolicyAgent(PolicyAgent):
    """PolicyAgent that keeps its plans, which stow() otherwise clears."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.trace = []

    def select(self, orders, ctx):
        accepted = super().select(orders, ctx)
        self.trace.extend(
            (container_id, self._placement[container_id])
            for container_id in self._placement_order)
        return accepted


def _env_trace(policy_fn, seed_value, scenario):
    """Placements made when the policy drives the training environment."""
    env = StowagePlanningEnv(split='test')
    obs, _info = env.reset(seed=0, options={'seed_value': seed_value,
                                            'scenario': scenario})
    trace = []
    total_reward = 0.0
    done = False

    while not done:
        mask = env.action_masks()
        container_id = env.current_container['id']
        action = policy_fn(obs, mask)
        if action != DECLINE_ACTION:
            trace.append((container_id, SLOTS[action]))
        obs, reward, done, _truncated, _info = env.step(action)
        total_reward += reward

    return trace, total_reward


def _harness_trace(policy_fn, seed_value, scenario):
    """Placements made when the same policy is scored by run_episode."""
    agent = _RecordingPolicyAgent(policy_fn, name='probe')
    result = run_episode(agent, seed_value, scenario=scenario)
    return agent.trace, result


def _first_difference(a, b):
    for i, (x, y) in enumerate(zip(a, b)):
        if x != y:
            return i, x, y
    if len(a) != len(b):
        i = min(len(a), len(b))
        return i, (a[i] if i < len(a) else None), (b[i] if i < len(b) else None)
    return None


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--seeds', type=int, default=5)
    parser.add_argument('--policy-seed', type=int, default=0)
    args = parser.parse_args(argv)

    strata = all_strata()
    scenarios = [
        ('nominal', NOMINAL_SCENARIO),
        (strata[0]['id'], strata[0]['scenario']),
        (strata[-1]['id'], strata[-1]['scenario']),
    ]
    seeds = [300_000 + i for i in range(args.seeds)]

    policy_fn = linear_probe_policy(args.policy_seed)
    failures = 0

    for label, scenario in scenarios:
        for seed in seeds:
            env_trace, shaped_return = _env_trace(policy_fn, seed, scenario)
            harness_trace, result = _harness_trace(policy_fn, seed, scenario)

            diff = _first_difference(env_trace, harness_trace)
            if diff is not None:
                i, got_env, got_harness = diff
                print('  FAIL  %s seed=%d' % (label, seed))
                print('          placement %d differs' % i)
                print('          env     %r' % (got_env,))
                print('          harness %r' % (got_harness,))
                failures += 1
                continue

            if result['physicsViolations'] != 0:
                print('  FAIL  %s seed=%d: %d physics violations'
                      % (label, seed, result['physicsViolations']))
                failures += 1
                continue

            if result['loaded'] != len(harness_trace):
                print('  FAIL  %s seed=%d: harness loaded %d, policy placed %d'
                      % (label, seed, result['loaded'], len(harness_trace)))
                failures += 1
                continue

            print('  ok    %-18s seed=%d  placements=%-4d cash=%-14d shaped=%.2f'
                  % (label, seed, len(env_trace), result['cash'], shaped_return))

    print()
    if failures:
        print('ADAPTER MISMATCH: %d of %d cases diverged' % (
            failures, len(scenarios) * len(seeds)))
        print('A5 would be scored on behaviour it was not trained for.')
        return 1

    print('ADAPTER OK: %d cases, training and scoring agree placement for placement'
          % (len(scenarios) * len(seeds)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
