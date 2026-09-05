"""Gymnasium environment for the learning agents (A5 and the RL comparators).

WHY THIS EXISTS SEPARATELY FROM run_episode(). The harness drives an agent by
calling `select(orders, ctx)` then `stow(containers, grid, ctx)` - it owns the
loop. An RL algorithm needs the opposite: it owns the loop and the environment
answers one step at a time.

So this file adds a week loop and a reward signal around `PortCall`, which holds
the actual decision protocol. TRAINING happens here; SCORING DOES NOT. The
numbers that reach the results table come from `run_episode` with the trained
policy wrapped by `policy_agent.PolicyAgent`, exactly like A1-A4, so no second
accounting path can decide the headline result.

REWARD. Shaped per step, and deliberately the same objective A3 and A4 minimise,
just handed out incrementally (see `PortCall.apply`):

    place    +tariff - 2 * restowCostPerMove * (overstow pairs created)
    roll     -rolling penalty for that container
    decline  0

Crediting the tariff at LOAD time is only sound because `CONFIG.drainWeeks = 3`
guarantees everything loaded is eventually discharged, so load-time and
discharge-time recognition agree on the episode total. With a truncated horizon
this shaping would quietly reward cargo that never gets delivered.

The three drain weeks are not simulated: they hold no decisions, and the shaped
reward already priced future shifts at placement time. The drain still matters
for scoring, which is another reason scoring goes through `run_episode`.
"""

import numpy as np

try:
    import gymnasium as gym
    from gymnasium import spaces
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        'gymnasium is required for the RL environment.\n'
        '    pip install -r research/rl/requirements.txt') from exc

from ..pyharness.circuit import CONFIG, NOMINAL_SCENARIO
from ..pyharness.constants import create_empty_grid
from ..pyharness.engine import generate_orders, process_sailing_transition, rng_for_port_call
from ..pyharness.strata import all_strata
from .portcall import (  # noqa: F401  (re-exported for callers and checks)
    DECLINE_ACTION, DRY_SLOTS, N_ACTIONS, N_SLOTS, OBS_LEN, REEFER_SLOTS, REWARD_SCALE,
    SLOTS, PortCall,
)

# Seed splits, disjoint by construction. A5 must never be evaluated on a seed it
# trained on; see research/README.md and docs/ASUMSI.md A-12. The stratum is
# drawn independently of the seed, because the seed only feeds the demand PRNG
# while the stratum only sets generate_orders' scenario knobs - so training
# across all 24 strata cannot leak a TEST or SENS seed.
SPLITS = {
    'train': (0, 200_000),
    'val': (200_000, 300_000),
    'test': (300_000, 310_000),
    'sens': (310_000, 400_000),
}

STRATA = all_strata()


class StowagePlanningEnv(gym.Env):
    """One carrier, one vessel, eight port-calls of accept-and-stow decisions."""

    metadata = {'render_modes': []}

    def __init__(self, split='train', randomize_strata=True, scenario=None):
        super().__init__()
        if split not in SPLITS:
            raise ValueError('unknown split %r, expected one of %s'
                             % (split, sorted(SPLITS)))
        self.split = split
        self.randomize_strata = randomize_strata
        self.fixed_scenario = scenario

        self.action_space = spaces.Discrete(N_ACTIONS)
        self.observation_space = spaces.Box(
            low=-1.0, high=1.0, shape=(OBS_LEN,), dtype=np.float32)

        self._ports = CONFIG['ports']
        self._horizon = CONFIG['horizonWeeks']
        self._pc = None
        self._finished = True

    # --- gymnasium API ------------------------------------------------------

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        options = options or {}

        lo, hi = SPLITS[self.split]
        self._episode_seed = int(options.get(
            'seed_value', self.np_random.integers(lo, hi)))

        if 'scenario' in options:
            self._scenario = options['scenario']
            self._stratum_id = options.get('stratum_id', 'custom')
        elif self.fixed_scenario is not None:
            self._scenario = self.fixed_scenario
            self._stratum_id = 'fixed'
        elif self.randomize_strata:
            stratum = STRATA[int(self.np_random.integers(len(STRATA)))]
            self._scenario = stratum['scenario']
            self._stratum_id = stratum['id']
        else:
            self._scenario = NOMINAL_SCENARIO
            self._stratum_id = 'nominal'

        self._grid = create_empty_grid(CONFIG['bays'])
        self._week = 1
        self._pending_reward = 0.0
        self._finished = False
        self._placed = 0
        self._rolled = 0
        self._declined = 0

        self._begin_week()
        self._advance()
        return self._pc.observation(), self._info()

    def step(self, action):
        if self._finished:
            raise RuntimeError('step() called on a finished episode; call reset()')

        step_reward = self._pc.apply(int(action))
        self._advance()

        reward = step_reward + self._pending_reward
        self._pending_reward = 0.0

        return self._pc.observation(), reward, self._finished, False, self._info()

    def action_masks(self):
        """The sb3-contrib contract. Never all-zero: `_advance` only stops at a
        decision point where at least one slot is legal."""
        return self._pc.mask

    # --- accessors used by check_env ----------------------------------------

    @property
    def grid(self):
        return self._grid

    @property
    def current_container(self):
        return self._pc.decision

    @property
    def container_index(self):
        return self._pc.container_i

    # --- episode machinery --------------------------------------------------

    def _begin_week(self):
        week = self._week
        port = self._ports[(week - 1) % len(self._ports)]
        orders = generate_orders(
            port, week, self._ports,
            rng_for_port_call(self._episode_seed, week, port),
            self._scenario)
        self._pc = PortCall(self._grid, orders, port, self._ports, week, self._horizon)

    def _next_week(self):
        """Sail, then open the next port-call. False when the horizon is over."""
        self._placed += self._pc.placed
        self._rolled += len(self._pc.rolled)
        self._declined += len(self._pc.declined_order_ids)

        next_port = self._ports[self._week % len(self._ports)]
        self._grid = process_sailing_transition(self._grid, next_port)
        self._week += 1

        if self._week > self._horizon:
            # A terminal PortCall with no orders, so the final observation shows
            # the grid as it actually is after the last sailing rather than the
            # stale pre-sailing one.
            self._pc = PortCall(self._grid, [], next_port, self._ports,
                                self._week, self._horizon)
            return False

        self._begin_week()
        return True

    def _advance(self):
        """Walk to the next decision, crossing weeks as needed."""
        while True:
            has_decision = self._pc.advance()
            self._pending_reward += self._pc.drain_pending()
            if has_decision:
                return
            if not self._next_week():
                self._finished = True
                return

    def _info(self):
        return {
            'episode_seed': self._episode_seed,
            'stratum': self._stratum_id,
            'week': self._week,
            'placed': self._placed + (0 if self._finished else self._pc.placed),
            'rolled': self._rolled + (0 if self._finished else len(self._pc.rolled)),
            'declined': self._declined + (
                0 if self._finished else len(self._pc.declined_order_ids)),
        }
