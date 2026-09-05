"""The per-port-call decision protocol, shared by training and by scoring.

Both users of this file need the identical protocol and the identical
observation layout, for different reasons:

  - `env.py` wraps it in a week loop and a reward signal, so an RL algorithm can
    train against it.
  - `policy_agent.py` wraps it in the `select()`/`stow()` interface, so a trained
    policy can be scored by `run_episode` exactly like A1-A4.

If the two built observations separately, the policy would be trained on one
input distribution and evaluated on another, and the whole comparison would
quietly stop meaning anything. Hence one implementation, used twice.

THE PROTOCOL. Orders are processed farthest-destination-first, then highest
tariff - the same loading discipline A3 uses, and what keeps tier 02 reachable
while the stack above it is still empty. Containers within an order go one at a
time, and the accept decision is folded into the first container's placement:

    action 0..35   place the current container in that slot
    action 36      decline this order outright

Action 36 is legal only on an order's FIRST container, and never for a Committed
order - A3 and A4 both accept Committed cargo unconditionally, so allowing the
learner to decline it would be comparing different problems.

A decision is only presented when at least one slot is legal. When none is, there
is nothing to choose: a non-committed order at its first container is declined
for free, anything else is rolled at the penalty. That is what guarantees the
action mask is never all-zero, which would otherwise crash MaskablePPO.
"""

import numpy as np

from ..pyharness.agents import hops_cells, overstow_delta, tiers_bottom_up
from ..pyharness.circuit import (
    CONFIG, free_slot_count, hops_between, roll_penalty, unpack, valid_slots,
)
from ..pyharness.constants import create_empty_grid, get_bay_config
from ..pyharness.jscompat import js_object_keys

# --- slot indexing ----------------------------------------------------------
# A stable bijection between action index and (bay, row, tier), built from an
# empty grid so the enumeration follows the same key order valid_slots() walks.


def _build_slot_index():
    grid = create_empty_grid(CONFIG['bays'])
    slots = []
    for bay in js_object_keys(grid):
        cfg = get_bay_config(bay)
        for row in cfg.rows:
            for tier in cfg.tiers:
                slots.append((bay, row, tier))
    return slots


SLOTS = _build_slot_index()
SLOT_INDEX = {s: i for i, s in enumerate(SLOTS)}
N_SLOTS = len(SLOTS)
DECLINE_ACTION = N_SLOTS
N_ACTIONS = N_SLOTS + 1

DRY_SLOTS = sum(1 for bay, _, _ in SLOTS if get_bay_config(bay).container_type == 'DRY')
REEFER_SLOTS = N_SLOTS - DRY_SLOTS

# --- observation layout -----------------------------------------------------
# [0            : N_SLOTS)      remaining hops of the container in each slot,
#                              normalised; -1 marks an empty slot
# [N_SLOTS      : 2*N_SLOTS)    legality of each slot for the current container
# [2*N_SLOTS    : +6)           current container: reefer, committed, tariff,
#                              hops, is-first-container, share of order left
# [2*N_SLOTS+6  : +5)           week, weeks left, free DRY, free REEFER,
#                              orders left at this port-call
# [2*N_SLOTS+11 : +4)           one-hot of the current port

CONTAINER_BLOCK = 2 * N_SLOTS
CONTEXT_BLOCK = CONTAINER_BLOCK + 6
PORT_BLOCK = CONTEXT_BLOCK + 5
OBS_LEN = PORT_BLOCK + len(CONFIG['ports'])

MAX_TARIFF = 30_000_000        # SBY->MKS REEFER, the largest cell in TARIFF_TABLE
MAX_QUANTITY = 3
MAX_ORDERS_PER_CALL = 12       # a normalisation constant, not a cap

# Raw rewards are rupiah (~1e7) and no value function fits that range. A fixed,
# documented divisor is preferred over VecNormalize, whose running statistics
# would depend on training order and make a reported number harder to reproduce.
REWARD_SCALE = 1e7

RESTOW_COST = CONFIG['restowCostPerMove']
HORIZON_WEEKS = CONFIG['horizonWeeks']


def clone_grid(grid):
    """A grid whose stacks can be written without touching the original.

    Container dicts are shared rather than copied: nothing in the harness mutates
    a container after it is created, and no code compares them by identity.
    """
    out = {}
    for bay in js_object_keys(grid):
        out[bay] = {row: dict(stack) for row, stack in grid[bay].items()}
    return out


class PortCall:
    """One port-call, walked one decision at a time.

    Mutates the `grid` it is given, so hand it a clone when the caller's grid
    must survive untouched (which is what `select()` requires).
    """

    def __init__(self, grid, orders, port, ports, week, horizon=HORIZON_WEEKS):
        self.grid = grid
        self.port = port
        self.ports = ports
        self.week = week
        self.horizon = horizon
        self.max_hops = len(ports) - 1

        self.orders = sorted(orders, key=lambda o: (
            -hops_between(ports, port, o['destination']), -o['tariff']))
        self.order_i = 0
        self.containers = None
        self.container_i = 0

        self.decision = None
        self.mask = np.ones(N_ACTIONS, dtype=bool)
        self.pending_reward = 0.0

        # What the caller reads once the port-call is done.
        self.plan = []                 # (container id, slot), in decision order
        self.accepted_order_ids = set()
        self.declined_order_ids = set()
        self.rolled = []
        self.placed = 0

    # --- walking ------------------------------------------------------------

    def advance(self):
        """True when a decision is waiting, False when the port-call is done."""
        while True:
            if self.order_i >= len(self.orders):
                self.decision = None
                return False

            if self.containers is None:
                self.containers = unpack(self.orders[self.order_i])
                self.container_i = 0

            if self.container_i >= len(self.containers):
                self._next_order()
                continue

            container = self.containers[self.container_i]
            slot_mask = self.slot_mask(container)

            if slot_mask.any():
                mask = np.zeros(N_ACTIONS, dtype=bool)
                mask[:N_SLOTS] = slot_mask
                mask[DECLINE_ACTION] = (
                    self.container_i == 0
                    and container['customerType'] != 'Committed')
                self.mask = mask
                self.decision = container
                return True

            # Nothing legal, so there is nothing to decide.
            if self.container_i == 0 and container['customerType'] != 'Committed':
                self.declined_order_ids.add(self.orders[self.order_i]['id'])
            else:
                self._roll_remaining()
            self._next_order()

    def apply(self, action):
        """Applies one action and returns its shaped reward."""
        container = self.decision
        if container is None:
            raise RuntimeError('apply() with no decision pending; call advance() first')
        if not self.mask[action]:
            raise ValueError(
                'illegal action %d - the policy ignored the action mask. A masked '
                'algorithm producing this is a bug worth surfacing, not something '
                'to absorb into the reward.' % action)

        if action == DECLINE_ACTION:
            self.declined_order_ids.add(self.orders[self.order_i]['id'])
            self._next_order()
            return 0.0

        bay, row, tier = SLOTS[action]
        cfg = get_bay_config(bay)
        tiers = tiers_bottom_up(cfg)
        cells = hops_cells(self.grid, bay, row, tiers, self.ports, self.port)
        hops = hops_between(self.ports, self.port, container['destination'])
        delta = overstow_delta(cells, tiers.index(tier), hops)

        self.grid[bay][row][tier] = container
        self.accepted_order_ids.add(self.orders[self.order_i]['id'])
        self.plan.append((container['id'], (bay, row, tier)))
        self.placed += 1
        self.container_i += 1

        # The same terms A4 minimises, handed out one placement at a time.
        return (container['tariff'] - 2 * RESTOW_COST * delta) / REWARD_SCALE

    def drain_pending(self):
        r = self.pending_reward
        self.pending_reward = 0.0
        return r

    def _next_order(self):
        self.order_i += 1
        self.containers = None

    def _roll_remaining(self):
        for c in self.containers[self.container_i:]:
            self.pending_reward -= roll_penalty(
                c['customerType'] == 'Committed', c['containerType']) / REWARD_SCALE
            self.rolled.append(c)

    def slot_mask(self, container):
        """Built from valid_slots() rather than a reimplementation of the three
        constraints, so the mask and the legality check cannot drift apart -
        research/README.md is explicit about using it for exactly this."""
        mask = np.zeros(N_SLOTS, dtype=bool)
        for s in valid_slots(self.grid, container):
            mask[SLOT_INDEX[(s['bay'], s['row'], s['tier'])]] = True
        return mask

    # --- observation --------------------------------------------------------

    def observation(self):
        obs = np.zeros(OBS_LEN, dtype=np.float32)
        ports = self.ports
        port = self.port

        for i, (bay, row, tier) in enumerate(SLOTS):
            c = self.grid[bay][row][tier]
            obs[i] = (-1.0 if c is None else
                      hops_between(ports, port, c['destination']) / self.max_hops)

        obs[N_SLOTS:CONTAINER_BLOCK] = self.mask[:N_SLOTS]

        container = self.decision
        if container is not None:
            remaining = len(self.containers) - self.container_i
            obs[CONTAINER_BLOCK + 0] = 1.0 if container['containerType'] == 'REEFER' else 0.0
            obs[CONTAINER_BLOCK + 1] = 1.0 if container['customerType'] == 'Committed' else 0.0
            obs[CONTAINER_BLOCK + 2] = container['tariff'] / MAX_TARIFF
            obs[CONTAINER_BLOCK + 3] = hops_between(
                ports, port, container['destination']) / self.max_hops
            obs[CONTAINER_BLOCK + 4] = 1.0 if self.container_i == 0 else 0.0
            obs[CONTAINER_BLOCK + 5] = min(1.0, remaining / MAX_QUANTITY)

        obs[CONTEXT_BLOCK + 0] = min(1.0, self.week / self.horizon)
        obs[CONTEXT_BLOCK + 1] = max(0.0, (self.horizon - self.week) / self.horizon)
        obs[CONTEXT_BLOCK + 2] = free_slot_count(self.grid, 'DRY') / DRY_SLOTS
        obs[CONTEXT_BLOCK + 3] = free_slot_count(self.grid, 'REEFER') / REEFER_SLOTS
        obs[CONTEXT_BLOCK + 4] = min(
            1.0, max(0, len(self.orders) - self.order_i) / MAX_ORDERS_PER_CALL)

        obs[PORT_BLOCK + ports.index(port)] = 1.0
        return obs
