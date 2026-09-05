"""Action masking for the DQN and A2C comparators.

MaskablePPO ships with sb3-contrib. DQN and A2C do not have a masked variant, and
that is a problem for the experiment rather than an inconvenience: running them
unmasked would let "how well does this algorithm learn" be confounded with "did
this algorithm get to see which actions are legal". The two comparators are
supposed to be handicapped by their algorithm, not by their access to the mask -
the same reasoning that makes A3 and A4 minimise one shared objective.

THE MASK IS RECOVERABLE FROM THE OBSERVATION. This is what makes masked DQN
tractable. The observation already carries slot legality, and the decline bit is
exactly `is_first_container AND NOT is_committed`, both of which are also in
there (see the layout in portcall.py). So the full 37-bit mask is a pure function
of the observation, and DQN needs no surgery on its replay buffer to compute the
mask of a stored next-state - it just reads it back out.

Two overrides are required for DQN, and neither is optional:

  - exploration must sample from LEGAL actions. The environment raises on an
    illegal action by design, so DQN's default `action_space.sample()` would
    crash on the first exploratory step.
  - the TD target must maximise over legal next actions only. Without this the
    bootstrap uses Q-values for placements the physics forbids, and the whole
    value function is trained toward a target that cannot happen.

These subclasses reach into stable-baselines3 internals (`_sample_action`,
`train`). They are the most likely thing here to need adjusting against the
installed SB3 version.
"""

import numpy as np

try:
    import torch as th
    from torch.nn import functional as F
    from gymnasium import spaces
    from stable_baselines3 import DQN
    from sb3_contrib import MaskablePPO
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        'stable-baselines3, sb3-contrib and torch are required to train.\n'
        '    pip install -r research/rl/requirements.txt') from exc

from .portcall import CONTAINER_BLOCK, N_SLOTS

_FIRST_CONTAINER = CONTAINER_BLOCK + 4
_IS_COMMITTED = CONTAINER_BLOCK + 1


def mask_from_obs(obs):
    """Recover the action mask from a batch of observations (numpy)."""
    obs = np.asarray(obs)
    slots = obs[..., N_SLOTS:CONTAINER_BLOCK] > 0.5
    first = obs[..., _FIRST_CONTAINER] > 0.5
    committed = obs[..., _IS_COMMITTED] > 0.5
    decline = np.expand_dims(first & ~committed, axis=-1)
    return np.concatenate([slots, decline], axis=-1)


def mask_from_obs_torch(obs):
    """Same, on a torch tensor, for use inside the TD target."""
    slots = obs[..., N_SLOTS:CONTAINER_BLOCK] > 0.5
    first = obs[..., _FIRST_CONTAINER] > 0.5
    committed = obs[..., _IS_COMMITTED] > 0.5
    decline = (first & ~committed).unsqueeze(-1)
    return th.cat([slots, decline], dim=-1)


class MaskableDQN(DQN):
    """DQN with the action mask applied to both action selection and the target."""

    def predict(self, observation, state=None, episode_start=None,
                deterministic=True, action_masks=None):
        obs = np.asarray(observation, dtype=np.float32)
        single = obs.ndim == 1
        batch = obs[None, ...] if single else obs

        if action_masks is None:
            masks = mask_from_obs(batch)
        else:
            masks = np.asarray(action_masks, dtype=bool).reshape(batch.shape[0], -1)

        with th.no_grad():
            q_values = self.q_net(th.as_tensor(batch, device=self.device)).cpu().numpy()

        q_values = np.where(masks, q_values, -np.inf)
        actions = q_values.argmax(axis=1).astype(np.int64)
        return (actions[:1] if single else actions), state

    def _sample_action(self, learning_starts, action_noise=None, n_envs=1):
        """Epsilon-greedy over LEGAL actions.

        The base implementation draws from `action_space.sample()`, which ignores
        the mask; the environment would raise on the first such step.
        """
        masks = mask_from_obs(np.asarray(self._last_obs, dtype=np.float32))

        if self.num_timesteps < learning_starts or np.random.rand() < self.exploration_rate:
            actions = np.array(
                [np.random.choice(np.flatnonzero(m)) for m in masks], dtype=np.int64)
        else:
            actions, _ = self.predict(self._last_obs, deterministic=True)
            actions = np.asarray(actions, dtype=np.int64).reshape(n_envs)

        return actions, actions

    def train(self, gradient_steps, batch_size=100):
        self.policy.set_training_mode(True)
        self._update_learning_rate(self.policy.optimizer)

        losses = []
        for _ in range(gradient_steps):
            replay_data = self.replay_buffer.sample(batch_size, env=self._vec_normalize_env)

            with th.no_grad():
                next_q = self.q_net_target(replay_data.next_observations)
                next_q = next_q.masked_fill(
                    ~mask_from_obs_torch(replay_data.next_observations), -th.inf)
                next_q = next_q.max(dim=1).values
                # A terminal next-state is multiplied by (1 - done) = 0, and
                # 0 * -inf is NaN, which would silently poison the whole run.
                next_q = th.nan_to_num(next_q, neginf=0.0).reshape(-1, 1)
                target_q = replay_data.rewards + (1 - replay_data.dones) * self.gamma * next_q

            current_q = self.q_net(replay_data.observations)
            current_q = th.gather(current_q, dim=1, index=replay_data.actions.long())

            loss = F.smooth_l1_loss(current_q, target_q)
            losses.append(loss.item())

            self.policy.optimizer.zero_grad()
            loss.backward()
            th.nn.utils.clip_grad_norm_(self.policy.parameters(), self.max_grad_norm)
            self.policy.optimizer.step()

        self._n_updates += gradient_steps
        self.logger.record('train/n_updates', self._n_updates, exclude='tensorboard')
        self.logger.record('train/loss', np.mean(losses))


class MaskableA2C(MaskablePPO):
    """A2C over MaskablePPO's masked rollout collection.

    Only `train()` is replaced. Collecting rollouts with masks, storing them in
    the buffer and evaluating a masked distribution is exactly what MaskablePPO
    already does, and reimplementing it would add risk without adding an idea.

    What changes is the update: one gradient step over the whole rollout with the
    plain policy-gradient loss, instead of several epochs of minibatches with a
    clipped ratio. Construct it with `n_epochs=1`; that argument and
    `clip_range` are inert here because this method never reads them.
    """

    def train(self):
        self.policy.set_training_mode(True)
        self._update_learning_rate(self.policy.optimizer)

        for rollout_data in self.rollout_buffer.get(batch_size=None):
            actions = rollout_data.actions
            if isinstance(self.action_space, spaces.Discrete):
                actions = actions.long().flatten()

            values, log_prob, entropy = self.policy.evaluate_actions(
                rollout_data.observations, actions,
                action_masks=rollout_data.action_masks)
            values = values.flatten()

            advantages = rollout_data.advantages
            if self.normalize_advantage and len(advantages) > 1:
                advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)

            policy_loss = -(advantages * log_prob).mean()
            value_loss = F.mse_loss(rollout_data.returns, values)
            entropy_loss = -th.mean(entropy) if entropy is not None else -th.mean(-log_prob)

            loss = policy_loss + self.ent_coef * entropy_loss + self.vf_coef * value_loss

            self.policy.optimizer.zero_grad()
            loss.backward()
            th.nn.utils.clip_grad_norm_(self.policy.parameters(), self.max_grad_norm)
            self.policy.optimizer.step()

            self.logger.record('train/policy_loss', policy_loss.item())
            self.logger.record('train/value_loss', value_loss.item())
            self.logger.record('train/entropy_loss', entropy_loss.item())

        self._n_updates += 1
        self.logger.record('train/n_updates', self._n_updates, exclude='tensorboard')
