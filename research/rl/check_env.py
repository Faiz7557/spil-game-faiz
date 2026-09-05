"""Invariant checks for the RL environment. No training, no torch.

    python -m research.rl.check_env
    python -m research.rl.check_env --episodes 50

Run this before spending compute on a training run: an environment that hands
out an all-zero action mask, or silently corrupts the grid, will produce a
training curve that looks plausible and means nothing.

Gymnasium's own `check_env` is deliberately not used here. It probes an
environment by stepping with `action_space.sample()`, which ignores the action
mask, and `env.step` raises on an illegal action by design - a masked algorithm
that emits one has a bug worth surfacing. The checks below cover the same
ground while respecting the mask.
"""

import argparse
import sys

import numpy as np

from ..pyharness.circuit import CAPACITY, NOMINAL_SCENARIO, occupied
from ..pyharness.constants import validate_grid_physics
from .env import (
    DECLINE_ACTION, N_ACTIONS, N_SLOTS, OBS_LEN, REWARD_SCALE, StowagePlanningEnv,
)


class CheckFailed(Exception):
    pass


def _require(condition, message):
    if not condition:
        raise CheckFailed(message)


def _check_obs(obs, step_label):
    _require(obs.shape == (OBS_LEN,),
             '%s: observation shape %s, expected (%d,)' % (step_label, obs.shape, OBS_LEN))
    _require(obs.dtype == np.float32,
             '%s: observation dtype %s, expected float32' % (step_label, obs.dtype))
    _require(np.isfinite(obs).all(), '%s: observation contains NaN or inf' % step_label)
    _require(obs.min() >= -1.0 and obs.max() <= 1.0,
             '%s: observation outside [-1, 1]: min=%.4f max=%.4f'
             % (step_label, obs.min(), obs.max()))


def _check_mask(env, step_label):
    mask = env.action_masks()
    _require(mask.shape == (N_ACTIONS,),
             '%s: mask shape %s, expected (%d,)' % (step_label, mask.shape, N_ACTIONS))
    _require(mask.any(), '%s: all-zero action mask - MaskablePPO would crash here'
             % step_label)

    container = env.current_container
    if mask[DECLINE_ACTION]:
        _require(env.container_index == 0,
                 '%s: decline offered on container %d of an order; an order cannot '
                 'be un-accepted once part of it is loaded'
                 % (step_label, env.container_index))
        _require(container['customerType'] != 'Committed',
                 '%s: decline offered on a Committed order' % step_label)
    return mask


def run_episode_checks(env, rng, policy='random'):
    obs, info = env.reset()
    _check_obs(obs, 'reset')

    steps = 0
    total_reward = 0.0
    terminated = False

    while not terminated:
        mask = _check_mask(env, 'step %d' % steps)
        legal = np.flatnonzero(mask)
        action = int(legal[0]) if policy == 'first' else int(rng.choice(legal))

        obs, reward, terminated, truncated, info = env.step(action)
        steps += 1
        total_reward += reward

        _check_obs(obs, 'step %d' % steps)
        _require(not truncated, 'step %d: env reported truncation, which it never does'
                 % steps)
        _require(np.isfinite(reward), 'step %d: non-finite reward' % steps)

        physics = validate_grid_physics(env.grid)
        _require(physics.valid,
                 'step %d: grid physics violated - %s' % (steps, physics.errors[:1]))
        _require(occupied(env.grid) <= CAPACITY,
                 'step %d: %d containers aboard, capacity is %d'
                 % (steps, occupied(env.grid), CAPACITY))
        _require(steps < 2000, 'episode did not terminate within 2000 steps')

    return steps, total_reward, info


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--episodes', type=int, default=20)
    parser.add_argument('--seed', type=int, default=0)
    args = parser.parse_args(argv)

    print('slots %d, actions %d (decline = %d), observation %d dims'
          % (N_SLOTS, N_ACTIONS, DECLINE_ACTION, OBS_LEN))
    print('reward scale 1e%d\n' % int(np.log10(REWARD_SCALE)))

    rng = np.random.default_rng(args.seed)
    env = StowagePlanningEnv(split='train', randomize_strata=True)
    env.reset(seed=args.seed)

    lengths = []
    rewards = []
    placed = rolled = declined = 0

    try:
        for ep in range(args.episodes):
            steps, total, info = run_episode_checks(env, rng)
            lengths.append(steps)
            rewards.append(total)
            placed += info['placed']
            rolled += info['rolled']
            declined += info['declined']

        # Same options must reproduce the same episode, or the seed splits mean
        # nothing and no result is reproducible.
        opts = {'seed_value': 300_000, 'scenario': NOMINAL_SCENARIO}
        traces = []
        for _ in range(2):
            env.reset(options=opts)
            trace = []
            done = False
            while not done:
                legal = np.flatnonzero(env.action_masks())
                _obs, reward, done, _trunc, _info = env.step(int(legal[0]))
                trace.append(reward)
            traces.append(trace)
        _require(traces[0] == traces[1],
                 'the same reset options produced two different episodes')

    except CheckFailed as exc:
        print('FAILED: %s' % exc)
        return 1

    n = len(lengths)
    print('%d episodes, all invariants held' % n)
    print('  steps per episode   mean %.1f   min %d   max %d'
          % (sum(lengths) / n, min(lengths), max(lengths)))
    print('  shaped return       mean %.2f  min %.2f  max %.2f'
          % (sum(rewards) / n, min(rewards), max(rewards)))
    print('  containers placed   %d' % placed)
    print('  containers rolled   %d' % rolled)
    print('  orders declined     %d' % declined)
    print('  determinism         same options reproduce the same episode')
    print('\nsteps/episode matters for the training budget: 2M timesteps is')
    print('about %d episodes at this length.' % int(2_000_000 / (sum(lengths) / n)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
