"""Trains one learning agent.

    python -m research.rl.train --algo ppo --timesteps 2000000
    python -m research.rl.train --algo a2c --timesteps 2000000
    python -m research.rl.train --algo dqn --timesteps 2000000

MODEL SELECTION USES THE REAL OBJECTIVE, NOT THE TRAINING REWARD. The shaped
per-step reward exists to make the gradient signal dense; it is a proxy. So the
evaluation callback scores the policy the way the thesis scores every other
agent - `run_episode` on held-out VAL seeds, reporting final cash - and keeps the
checkpoint that maximises that. Selecting on the shaped return would pick the
policy that best games the proxy.

Training draws seeds from TRAIN and a stratum from all 24 cells per episode;
evaluation draws from VAL across the same 24 strata, so the checkpoint that gets
kept is the one that generalises rather than the one tuned to the nominal cell.
TEST and SENS are never touched here.

CPU on purpose. The policy is a 2x64 MLP, far too small to amortise transfer to a
GPU, and the bottleneck is stepping the environment.

The envs run IN THIS PROCESS by default (`--vec dummy`). `--vec subproc` spawns
one process per env, and on Windows spawn means each worker re-imports SB3, which
imports `torch.utils.tensorboard`, which imports tensorflow, keras, sklearn and
scipy - roughly 1.5 GB per worker. Eight of those do not fit in 15 GB, and the
run dies with MemoryError after thrashing. This environment is cheap pure Python
and MaskablePPO needs a second IPC round-trip per step just to fetch the action
mask, so in-process is both safer and faster here.

The `__main__` guard at the bottom is still load-bearing for `--vec subproc`:
Windows spawn re-runs the module, and without the guard the process would fork
itself without end.
"""

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np

try:
    import torch as th
    from sb3_contrib import MaskablePPO
    from sb3_contrib.common.wrappers import ActionMasker
    from stable_baselines3.common.callbacks import BaseCallback
    from stable_baselines3.common.monitor import Monitor
    from stable_baselines3.common.sb2_compat.rmsprop_tf_like import RMSpropTFLike
    from stable_baselines3.common.utils import set_random_seed
    from stable_baselines3.common.vec_env import DummyVecEnv, SubprocVecEnv
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        'stable-baselines3 and sb3-contrib are required to train.\n'
        '    pip install -r research/rl/requirements.txt') from exc

from ..pyharness.circuit import CONFIG, run_episode
from ..pyharness.strata import all_strata
from .env import SPLITS, StowagePlanningEnv
from .masked_algos import MaskableA2C, MaskableDQN
from .policy_agent import PolicyAgent, maskable_policy


def _mask_fn(env):
    return env.unwrapped.action_masks()


def make_env(split, seed, rank):
    def _init():
        env = StowagePlanningEnv(split=split, randomize_strata=True)
        env = Monitor(env)
        env = ActionMasker(env, _mask_fn)
        env.reset(seed=seed + rank)
        return env
    return _init


class HarnessEvalCallback(BaseCallback):
    """Scores the policy through run_episode and keeps the best checkpoint.

    Deliberately not SB3's EvalCallback: that one measures the shaped training
    reward, which is the proxy rather than the quantity the thesis reports.
    """

    def __init__(self, seeds, scenarios, eval_freq, save_path, verbose=1):
        super().__init__(verbose)
        self.seeds = seeds
        self.scenarios = scenarios
        self.eval_freq = eval_freq
        self.save_path = Path(save_path)
        self.best_profit = -np.inf
        self._last_eval = 0
        self.history = []

    def _evaluate(self):
        agent = PolicyAgent(maskable_policy(self.model, deterministic=True),
                            name='eval')
        profits = []
        for scenario in self.scenarios:
            for seed in self.seeds:
                result = run_episode(agent, seed, scenario=scenario)
                profits.append(result['cash'] - CONFIG['startCash'])
        return float(np.mean(profits))

    def _on_step(self):
        if self.num_timesteps - self._last_eval < self.eval_freq:
            return True
        self._last_eval = self.num_timesteps

        started = time.perf_counter()
        mean_profit = self._evaluate()
        elapsed = time.perf_counter() - started

        self.logger.record('eval/mean_profit', mean_profit)
        self.logger.record('eval/episodes', len(self.seeds) * len(self.scenarios))
        self.history.append({'timesteps': self.num_timesteps, 'mean_profit': mean_profit})

        if mean_profit > self.best_profit:
            self.best_profit = mean_profit
            self.model.save(self.save_path / 'best_model')
            marker = '  <- best, saved'
        else:
            marker = ''

        if self.verbose:
            print('  eval @ %9d steps   mean profit %15.0f   (%.1fs)%s'
                  % (self.num_timesteps, mean_profit, elapsed, marker))
        return True


def build_ppo(env, seed, tb, n_envs):
    return MaskablePPO(
        'MlpPolicy', env, seed=seed, device='cpu', verbose=0, tensorboard_log=tb,
        n_steps=512, batch_size=256, n_epochs=10,
        learning_rate=3e-4, gamma=0.995, gae_lambda=0.95,
        ent_coef=0.01, vf_coef=0.5, max_grad_norm=0.5,
        policy_kwargs=dict(net_arch=[64, 64]))


def build_a2c(env, seed, tb, n_envs):
    n_steps = 64
    return MaskableA2C(
        'MlpPolicy', env, seed=seed, device='cpu', verbose=0, tensorboard_log=tb,
        # n_epochs and clip_range are inert: MaskableA2C replaces train().
        n_steps=n_steps, batch_size=n_steps * n_envs, n_epochs=1,
        learning_rate=7e-4, gamma=0.995, gae_lambda=1.0,
        ent_coef=0.01, vf_coef=0.5, max_grad_norm=0.5,
        normalize_advantage=False,
        policy_kwargs=dict(
            net_arch=[64, 64],
            optimizer_class=RMSpropTFLike,
            optimizer_kwargs=dict(alpha=0.99, eps=1e-5, weight_decay=0.0)))


def build_dqn(env, seed, tb, n_envs):
    return MaskableDQN(
        'MlpPolicy', env, seed=seed, device='cpu', verbose=0, tensorboard_log=tb,
        # 1M is SB3's own default. At a 10M-step budget a 200k buffer holds only
        # 2% of the run, and DQN's curve could then flatten because it ran out of
        # replay diversity rather than because the algorithm had converged - which
        # would be read off the curve as "DQN converged at X" and be wrong.
        learning_rate=1e-4, buffer_size=1_000_000, learning_starts=10_000,
        batch_size=128, gamma=0.995, tau=1.0,
        train_freq=4, gradient_steps=1, target_update_interval=2_000,
        exploration_fraction=0.2, exploration_initial_eps=1.0,
        exploration_final_eps=0.05, max_grad_norm=10.0,
        policy_kwargs=dict(net_arch=[64, 64]))


BUILDERS = {'ppo': build_ppo, 'a2c': build_a2c, 'dqn': build_dqn}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--algo', choices=sorted(BUILDERS), required=True)
    parser.add_argument('--timesteps', type=int, default=2_000_000)
    parser.add_argument('--n-envs', type=int, default=8,
                        help='ignored for dqn, which is off-policy and runs one env')
    parser.add_argument('--seed', type=int, default=0)
    parser.add_argument('--eval-freq', type=int, default=50_000)
    parser.add_argument('--eval-seeds', type=int, default=3,
                        help='VAL seeds per stratum; total episodes is this x 24')
    parser.add_argument('--vec', choices=['dummy', 'subproc'], default='dummy',
                        help='dummy runs the envs in this process. subproc spawns '
                             'one process per env, and on Windows each one re-imports '
                             'SB3, which pulls in tensorflow via torch.utils.tensorboard '
                             '- about 1.5 GB per worker. Eight of those exhaust 15 GB '
                             'of RAM and the run dies with MemoryError. This env is '
                             'cheap pure Python, so in-process is also faster.')
    parser.add_argument('--threads', type=int, default=1,
                        help='torch intra-op threads. A 2x64 MLP is far too small to '
                             'benefit; the thread coordination costs more than the '
                             'matmuls.')
    parser.add_argument('--out', default=None)
    args = parser.parse_args(argv)

    out = Path(args.out or ('research/results/rl/%s_seed%d' % (args.algo, args.seed)))
    out.mkdir(parents=True, exist_ok=True)

    set_random_seed(args.seed)
    th.set_num_threads(args.threads)

    # DQN is off-policy with a replay buffer; parallel envs buy it much less than
    # they buy PPO, and its exploration override assumes one stream per step.
    n_envs = 1 if args.algo == 'dqn' else max(1, args.n_envs)

    env_fns = [make_env('train', args.seed, i) for i in range(n_envs)]
    env = (SubprocVecEnv(env_fns) if args.vec == 'subproc' and n_envs > 1
           else DummyVecEnv(env_fns))

    val_lo, _val_hi = SPLITS['val']
    eval_seeds = [val_lo + i for i in range(args.eval_seeds)]
    eval_scenarios = [s['scenario'] for s in all_strata()]

    callback = HarnessEvalCallback(
        seeds=eval_seeds, scenarios=eval_scenarios,
        eval_freq=args.eval_freq, save_path=out)

    model = BUILDERS[args.algo](env, args.seed, str(out / 'tb'), n_envs)

    print('algo %s   timesteps %d   envs %d (%s)   torch threads %d   seed %d' % (
        args.algo, args.timesteps, n_envs, args.vec, args.threads, args.seed))
    print('eval: %d VAL seeds x %d strata = %d episodes every %d steps'
          % (len(eval_seeds), len(eval_scenarios),
             len(eval_seeds) * len(eval_scenarios), args.eval_freq))
    print('output %s\n' % out)

    started = time.perf_counter()
    model.learn(total_timesteps=args.timesteps, callback=callback,
                progress_bar=False)
    elapsed = time.perf_counter() - started

    model.save(out / 'final_model')
    env.close()

    with open(out / 'run.json', 'w', encoding='utf-8') as fh:
        json.dump({
            'algo': args.algo,
            'timesteps': args.timesteps,
            'n_envs': n_envs,
            'seed': args.seed,
            'wall_clock_seconds': elapsed,
            'best_val_profit': (None if not np.isfinite(callback.best_profit)
                                else callback.best_profit),
            'eval_seeds': eval_seeds,
            'eval_strata': len(eval_scenarios),
            'eval_history': callback.history,
            'hyperparameters': {
                k: v for k, v in model.__dict__.items()
                if isinstance(v, (int, float, str, bool))
            },
        }, fh, indent=2)

    print('\ndone in %.1f min   best VAL mean profit %.0f' % (
        elapsed / 60, callback.best_profit))
    print('saved %s and %s' % (out / 'best_model.zip', out / 'final_model.zip'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
