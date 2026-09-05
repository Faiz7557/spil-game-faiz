"""Wraps a trained policy as an ordinary harness agent.

This is what makes the learning agents comparable to A1-A4. Training happens in
`env.py`, but the numbers that reach the results table must come from
`run_episode` - the same episode loop, the same restow and rolling accounting,
the same drain weeks, the same final-cash definition. A policy scored by its own
training loop would be scored by a different rule than its competitors, and the
Friedman/Nemenyi comparison would be over two incommensurable quantities.

The pattern is A4's: do the work in `select()` and have `stow()` apply the plan
it produced. A4 needs it because acceptance and stowage are one joint decision
for a search; the same is true for a sequential policy, which decides where a
container goes at the moment it decides to take it.

Unlike A4, the plan here can never be refused at replay time. A4 searches over
placements without regard to loading order, so `validSlots` may reject one and it
falls back. This adapter builds its plan by walking the identical protocol on a
clone of the same grid, so replaying the placements in decision order reproduces
them exactly - the assertion in `stow()` guards that claim rather than papering
over a fallback.

No torch or stable-baselines3 import: a policy is just `f(obs, mask) -> action`.
"""

import numpy as np

from .portcall import PortCall, clone_grid


class PolicyAgent:
    """A learned policy, presented to the harness as select()/stow().

    `policy_fn(observation, mask) -> action` must respect the mask; an action it
    marks illegal raises rather than being silently corrected, because a masked
    algorithm emitting one is a bug that would otherwise be scored as if the
    policy had chosen something reasonable.
    """

    def __init__(self, policy_fn, name='a5', plan='A5', label=None, stochastic=False):
        self.policy_fn = policy_fn
        self.name = name
        self.plan = plan
        self.label = label or 'A5 Deep RL (%s)' % name
        self.stochastic = stochastic
        self._placement = None
        self._placement_order = None

    def select(self, orders, ctx):
        """Walks the port-call protocol on a clone, and records the plan.

        `ctx.grid` is read-only inside select(), hence the clone; only stow() may
        write to the real grid.
        """
        pc = PortCall(clone_grid(ctx.grid), orders, ctx.port, ctx.ports, ctx.week)

        while pc.advance():
            action = self.policy_fn(pc.observation(), pc.mask)
            pc.apply(int(action))

        self._placement = dict(pc.plan)
        self._placement_order = [container_id for container_id, _ in pc.plan]
        return [o for o in orders if o['id'] in pc.accepted_order_ids]

    def stow(self, containers, grid, ctx):
        """Replays the plan in decision order, which is a valid loading order by
        construction: tier 02 was chosen while the stack above it was still
        empty, so it is still reachable now."""
        if self._placement is None:
            raise RuntimeError('stow() called before select(); the plan is built there')

        by_id = {c['id']: c for c in containers}

        for container_id in self._placement_order:
            bay, row, tier = self._placement[container_id]
            if grid[bay][row][tier] is not None:
                raise RuntimeError(
                    'planned slot %s/%s/%s was already occupied at replay. The plan '
                    'and the real grid have diverged, which means the scored '
                    'behaviour is not the behaviour the policy chose.'
                    % (bay, row, tier))
            grid[bay][row][tier] = by_id[container_id]

        leftover = [c for c in containers if c['id'] not in self._placement]

        self._placement = None
        self._placement_order = None
        return leftover


def maskable_policy(model, deterministic=True):
    """Policy function for any model whose `predict` accepts `action_masks`.

    That covers MaskablePPO, MaskableA2C (which inherits its predict) and
    MaskableDQN, so all three comparators are scored through one code path.
    """
    def policy_fn(obs, mask):
        action, _state = model.predict(
            obs, action_masks=mask, deterministic=deterministic)
        return int(np.asarray(action).reshape(-1)[0])
    return policy_fn
