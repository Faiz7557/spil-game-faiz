"""Port of research/src/agents.mjs - the agent registry.

Every agent exposes the same two methods so the harness never needs to know
which class of algorithm it is driving:

    select(orders, ctx) -> orders to accept
    stow(containers, grid, ctx) -> containers it could NOT place (mutates grid)

Draw all randomness from `ctx.rng`, never Python's `random`, or the episode
stops being reproducible.

THE THESIS LINE-UP:
    A1 Random         `random`      coin-flip acceptance, random legal slot
    A2 Rule-based     `ruleSmart`   the shipped SMART bot, selection AND stowage
    A3 Greedy         `greedy`      value-density acceptance + overstow-delta stowage
    A4 Metaheuristic  `annealing`   simulated annealing over (accept-set, bay plan)
    A5 Deep RL        - see research/rl/, trained separately

A3 and A4 deliberately optimise THE SAME objective, so any difference between
them is attributable to optimisation power and not to one of them being handed
a better cost function. A2 keeps the game's own objective because A2 *is* the
game's own bot.
"""

import math

from .bot_engine import execute_bot_cargo_selection, execute_bot_stowage_placement
from .circuit import free_slot_count, hops_between, roll_penalty, unpack, valid_slots
from .constants import get_bay_config
from .jscompat import js_object_keys

# get_bay_config lists tiers top-down ('84','82','02'); stowage logic needs
# bottom-up.
BOTTOM_UP = ('02', '82', '84')


def tiers_bottom_up(cfg):
    return [t for t in BOTTOM_UP if t in cfg.tiers]


def stack_overstow(cells):
    """THE STOWAGE OBJECTIVE.

    `cells` is one stack, bottom to top, holding each container's remaining hops
    to its discharge port (None = empty). A shift is forced whenever a container
    that leaves LATER sits above one that leaves EARLIER, so the number of future
    shifts the stack has already committed to is the number of such pairs.

    The engine's `calculate_restows` only looks one port ahead. That is right for
    BILLING - you are only charged for shifts actually performed at this berth -
    but wrong to PLAN against, because it is blind to a bay plan that is fine
    this week and disastrous next week. Counting pairs over the whole rotation
    is the standard overstow criterion, and it is what A3 and A4 minimise.
    """
    n = 0
    length = len(cells)
    for i in range(length):
        if cells[i] is None:
            continue
        for j in range(i + 1, length):
            if cells[j] is None:
                continue
            if cells[i] < cells[j]:
                n += 1
    return n


def hops_cells(grid, bay, row, tiers, ports, port):
    """Remaining hops of every container in one grid stack, bottom-up."""
    out = []
    for t in tiers:
        c = grid[bay][row][t]
        out.append(hops_between(ports, port, c['destination']) if c else None)
    return out


def overstow_delta(cells, idx, hops):
    """Extra overstow pairs created by putting `hops` at tier index `idx`."""
    before = stack_overstow(cells)
    after = list(cells)
    after[idx] = hops
    return stack_overstow(after) - before


def legal_at(cells, tiers, i):
    """Is tier index `i` legal for a new container right now?

    This MIRRORS valid_slots() on the lightweight stack representation. The two
    must never disagree: if they do, A4 plans placements the grid will refuse and
    silently falls back, so its measured behaviour stops being the behaviour the
    search paid for.
    """
    if i < 0 or i >= len(tiers) or cells[i] is not None:
        return False
    tier = tiers[i]
    if tier == '84':
        i82 = tiers.index('82') if '82' in tiers else -1
        if i82 < 0 or cells[i82] is None:
            return False
    if tier == '02':
        i82 = tiers.index('82') if '82' in tiers else -1
        i84 = tiers.index('84') if '84' in tiers else -1
        if (i82 >= 0 and cells[i82] is not None) or (i84 >= 0 and cells[i84] is not None):
            return False
    return True


def lowest_legal_idx(cells, tiers):
    for i in range(len(tiers)):
        if legal_at(cells, tiers, i):
            return i
    return -1


class Stack:
    """Lightweight mirror of one grid stack: an array of remaining hops.

    The real grid stores whole container dicts, which is far too slow to copy
    thousands of times inside A4.
    """

    __slots__ = ('bay', 'row', 'tiers', 'type', 'base')

    def __init__(self, bay, row, tiers, type_, base):
        self.bay = bay
        self.row = row
        self.tiers = tiers
        self.type = type_
        self.base = base


def snapshot_stacks(grid, ports, port):
    stacks = []
    for bay in js_object_keys(grid):
        cfg = get_bay_config(bay)
        tiers = tiers_bottom_up(cfg)
        for row in cfg.rows:
            stacks.append(Stack(
                bay, row, tiers, cfg.container_type,
                hops_cells(grid, bay, row, tiers, ports, port)))
    return stacks


# ---------------------------------------------------------------------------
# generic stowage strategies
# ---------------------------------------------------------------------------

def stow_first_fit(containers, grid):
    leftover = []
    for c in containers:
        slots = valid_slots(grid, c)
        if len(slots) == 0:
            leftover.append(c)
            continue
        s = slots[0]
        grid[s['bay']][s['row']][s['tier']] = c
    return leftover


def stow_random(containers, grid, rng):
    leftover = []
    for c in containers:
        slots = valid_slots(grid, c)
        if len(slots) == 0:
            leftover.append(c)
            continue
        s = slots[math.floor(rng() * len(slots))]
        grid[s['bay']][s['row']][s['tier']] = c
    return leftover


def stow_via_game_bot(containers, grid, port, ports, personality):
    """Delegates STOWAGE to the game's own code, so the shipped bots are measured
    as they actually behave rather than as a reimplementation of them."""
    bot = {'isBot': True, 'personality': personality,
           'pendingContainers': containers, 'cargoPool': []}
    execute_bot_stowage_placement(bot, grid, port, ports)
    return bot['pendingContainers']


def select_via_game_bot(orders, ctx, personality):
    """Delegates ACCEPTANCE to the game's own code too, so a change in
    botEngine cannot silently invalidate the claim that A2 is "the shipped bot"."""
    bot = {'id': 0, 'isBot': True, 'personality': personality,
           'cargoPool': list(orders), 'pendingContainers': []}
    execute_bot_cargo_selection(bot, ctx.port, ctx.ports, ctx.rng)
    declined = {o['id'] for o in bot['cargoPool']}
    return [o for o in orders if o['id'] not in declined]


# ---------------------------------------------------------------------------
# A3 - greedy, multi-criteria
# ---------------------------------------------------------------------------

def greedy_select(orders, ctx):
    """Acceptance by value density under a capacity budget.

    1. Committed orders are taken unconditionally - declining one costs the full
       rolling penalty, so refusing is never cheaper than trying.
    2. The rest are ranked by tariff per slot-week, i.e. tariff / hops. A
       container to a far port earns once but blocks a slot for up to three
       port-calls; ranking on raw tariff (what A2 does) ignores that.
    3. The accept-set is truncated at the free-slot budget FOR ITS OWN TYPE,
       because REEFER and DRY slots are not interchangeable. This is what stops
       A3 from repeating the shipped GREEDY bot's mistake of accepting cargo it
       demonstrably cannot load.
    """
    budget = {
        'DRY': free_slot_count(ctx.grid, 'DRY'),
        'REEFER': free_slot_count(ctx.grid, 'REEFER'),
    }

    accepted = []
    optional = []
    for o in orders:
        if o['customerType'] == 'Committed':
            accepted.append(o)
            budget[o['containerType']] -= o['quantity']
        else:
            optional.append(o)

    optional.sort(key=lambda o: -(o['tariff'] / hops_between(
        ctx.ports, ctx.port, o['destination'])))

    for o in optional:
        if budget[o['containerType']] >= o['quantity']:
            accepted.append(o)
            budget[o['containerType']] -= o['quantity']
    return accepted


def greedy_stow(containers, grid, ctx):
    """One constructive pass: load far cargo first and place each container in
    the slot that adds the fewest overstow pairs, breaking ties towards the tier
    its dwell suggests (far = deep, near = on top).

    This is the exact opposite of the shipped SMART bot, which stows next-port
    cargo FIRST onto the top tiers - sealing tier 02 under the hatch cover and
    forcing every later-port container onto tier 84, directly above cargo that
    has to come off next.
    """
    max_hops = len(ctx.ports) - 1

    def hops_of(c):
        return hops_between(ctx.ports, ctx.port, c['destination'])

    ordered = sorted(containers, key=lambda c: (-hops_of(c), -c['tariff']))

    leftover = []
    for c in ordered:
        slots = valid_slots(grid, c)
        if len(slots) == 0:
            leftover.append(c)
            continue

        hops = hops_of(c)
        # nearness 0 = farthest destination (wants the bottom), 1 = next port
        # (wants the top).
        nearness = (max_hops - hops) / (max_hops - 1) if max_hops > 1 else 1

        best = None
        best_score = math.inf
        for s in slots:
            tiers = tiers_bottom_up(get_bay_config(s['bay']))
            cells = hops_cells(grid, s['bay'], s['row'], tiers, ctx.ports, ctx.port)
            idx = tiers.index(s['tier'])
            delta = overstow_delta(cells, idx, hops)
            mismatch = abs(idx - nearness * (len(tiers) - 1))
            score = delta * 100 + mismatch
            if score < best_score:
                best_score = score
                best = s
        grid[best['bay']][best['row']][best['tier']] = c
    return leftover


# ---------------------------------------------------------------------------
# A4 - simulated annealing over the joint (accept-set, bay plan)
# ---------------------------------------------------------------------------

class _Solution:
    __slots__ = ('accept', 'sequence', 'stackChoice', 'tierPref')

    def __init__(self, accept, sequence, stack_choice, tier_pref):
        self.accept = accept
        self.sequence = sequence
        self.stackChoice = stack_choice
        self.tierPref = tier_pref


def _decode(sol, containers, stacks, econ):
    """Decodes a solution into a placement and scores it.

    cost = -(freight loaded)
         + (rolling penalty of everything accepted-but-unplaced and of every
            declined Committed container)
         + 2 * restowCostPerMove * overstow pairs in the resulting bay plan

    This is still ONE port-call of lookahead on the demand side: A4 optimises the
    bay plan it can see, it does not reason about cargo not yet offered.
    """
    cells = [list(s.base) for s in stacks]
    placement = [None] * len(containers)
    value = 0
    penalty = 0

    for i in sol.sequence:
        if not sol.accept[i]:
            continue
        c = containers[i]

        target = -1
        idx = -1
        preferred = sol.stackChoice[i]
        if stacks[preferred].type == c['containerType']:
            tiers = stacks[preferred].tiers
            # The solution names a tier, not just a stack. Without this the
            # decoder would always bury cargo at the lowest legal tier and the
            # search could not express "keep this next-port box on top" - the
            # single decision that drives the shifting bill.
            wanted = sol.tierPref[i]
            idx = wanted if legal_at(cells[preferred], tiers, wanted) \
                else lowest_legal_idx(cells[preferred], tiers)
            if idx >= 0:
                target = preferred
        if target < 0:
            for s in range(len(stacks)):
                if stacks[s].type != c['containerType']:
                    continue
                j = lowest_legal_idx(cells[s], stacks[s].tiers)
                if j >= 0:
                    target = s
                    idx = j
                    break

        if target < 0:
            penalty += econ['roll'](c['customerType'] == 'Committed', c['containerType'])
            continue
        cells[target][idx] = c['hops']
        placement[i] = (target, idx)
        value += c['tariff']

    # Declined Committed cargo is charged too: refusing it is not free.
    for i in range(len(containers)):
        if sol.accept[i]:
            continue
        if containers[i]['customerType'] == 'Committed':
            penalty += econ['roll'](True, containers[i]['containerType'])

    overstow = 0
    for s in range(len(stacks)):
        overstow += stack_overstow(cells[s])

    cost = -value + penalty + overstow * 2 * econ['restowCostPerMove']
    return cost, placement


def _constructive_start(containers, stacks, max_hops):
    """Builds A4's starting solution by running A3's constructive rule on the
    snapshot. Seeding a metaheuristic with a constructive heuristic is standard
    practice, and it makes the experiment cleanly interpretable: A4 starts from
    A3's plan, so whatever it gains is attributable to the search alone.
    """
    cells = [list(s.base) for s in stacks]
    sol = _Solution(
        accept=[True] * len(containers),
        sequence=list(range(len(containers))),
        stack_choice=[0] * len(containers),
        tier_pref=[0] * len(containers),
    )

    sol.sequence.sort(key=lambda i: (-containers[i]['hops'], -containers[i]['tariff']))

    for i in sol.sequence:
        c = containers[i]
        nearness = (max_hops - c['hops']) / (max_hops - 1) if max_hops > 1 else 1
        best_s = -1
        best_idx = -1
        best_score = math.inf

        for s in range(len(stacks)):
            if stacks[s].type != c['containerType']:
                continue
            tiers = stacks[s].tiers
            for t in range(len(tiers)):
                if not legal_at(cells[s], tiers, t):
                    continue
                score = overstow_delta(cells[s], t, c['hops']) * 100 \
                    + abs(t - nearness * (len(tiers) - 1))
                if score < best_score:
                    best_score = score
                    best_s = s
                    best_idx = t
        if best_s < 0:
            continue                  # no room; the decoder will price it
        cells[best_s][best_idx] = c['hops']
        sol.stackChoice[i] = best_s
        sol.tierPref[i] = best_idx
    return sol


def _anneal(containers, ctx, econ, params):
    """Simulated annealing over four move types:
      - flip the accept bit of one non-committed container
      - move one container to a different tier of its stack
      - swap two positions in the loading sequence (who gets the deep slots)
      - reassign one container to a different stack

    Geometric cooling. The iteration budget is a REPORTED hyperparameter, not a
    hidden constant: A4's role in the comparison is the accuracy/compute
    trade-off, so the budget belongs in the results table next to its wall-clock
    time.

    Every branch below draws from `ctx.rng` in the same order as the JS original,
    including the draws that end up unused - a rejected accept-flip on a
    Committed container still consumes its index draw. Skipping one would
    desynchronise every later port-call.
    """
    stacks = snapshot_stacks(ctx.grid, ctx.ports, ctx.port)
    n = len(containers)
    max_hops = len(ctx.ports) - 1
    rng = ctx.rng

    sol = _constructive_start(containers, stacks, max_hops)
    cur_cost, cur_placement = _decode(sol, containers, stacks, econ)
    best_cost, best_placement = cur_cost, cur_placement
    if n == 0:
        return stacks, best_cost, best_placement

    T = params['T0']
    for _ in range(params['iterations']):
        move = rng()
        undo = None

        if move < 0.20:
            i = math.floor(rng() * n)
            if containers[i]['customerType'] != 'Committed':
                sol.accept[i] = not sol.accept[i]

                def undo(i=i):
                    sol.accept[i] = not sol.accept[i]
        elif move < 0.50:
            i = math.floor(rng() * n)
            prev = sol.tierPref[i]
            sol.tierPref[i] = math.floor(rng() * 3)

            def undo(i=i, prev=prev):
                sol.tierPref[i] = prev
        elif move < 0.75:
            a = math.floor(rng() * n)
            b = math.floor(rng() * n)
            sol.sequence[a], sol.sequence[b] = sol.sequence[b], sol.sequence[a]

            def undo(a=a, b=b):
                sol.sequence[a], sol.sequence[b] = sol.sequence[b], sol.sequence[a]
        else:
            i = math.floor(rng() * n)
            prev = sol.stackChoice[i]
            sol.stackChoice[i] = math.floor(rng() * len(stacks))

            def undo(i=i, prev=prev):
                sol.stackChoice[i] = prev

        cand_cost, cand_placement = _decode(sol, containers, stacks, econ)
        delta = cand_cost - cur_cost
        # The acceptance draw is taken ONLY when delta > 0, matching JS's
        # short-circuiting ||.
        if delta <= 0 or rng() < math.exp(-delta / max(T, 1)):
            cur_cost, cur_placement = cand_cost, cand_placement
            if cand_cost < best_cost:
                best_cost, best_placement = cand_cost, cand_placement
        elif undo is not None:
            undo()

        T *= params['alpha']

    return stacks, best_cost, best_placement


# ---------------------------------------------------------------------------
# agent classes
# ---------------------------------------------------------------------------

class Agent:
    name = ''
    plan = ''
    label = ''
    stochastic = False

    def select(self, orders, ctx):
        raise NotImplementedError

    def stow(self, containers, grid, ctx):
        raise NotImplementedError


class RandomAgent(Agent):
    """A1 - lower bound. Coin-flip acceptance, random legal slot."""
    name = 'random'
    plan = 'A1'
    label = 'A1 Random'
    stochastic = True

    def select(self, orders, ctx):
        return [o for o in orders if ctx.rng() < 0.5]

    def stow(self, containers, grid, ctx):
        return stow_random(containers, grid, ctx.rng)


class RuleSmartAgent(Agent):
    """A2 - the shipped SMART bot, both decisions taken from botEngine."""
    name = 'ruleSmart'
    plan = 'A2'
    label = 'A2 Rule-based (SMART)'

    def select(self, orders, ctx):
        return select_via_game_bot(orders, ctx, 'SMART')

    def stow(self, containers, grid, ctx):
        return stow_via_game_bot(containers, grid, ctx.port, ctx.ports, 'SMART')


class GreedyAgent(Agent):
    """A3 - value density under a capacity budget, overstow-aware stowage."""
    name = 'greedy'
    plan = 'A3'
    label = 'A3 Greedy (multi-criteria)'

    def select(self, orders, ctx):
        return greedy_select(orders, ctx)

    def stow(self, containers, grid, ctx):
        return greedy_stow(containers, grid, ctx)


class AnnealingAgent(Agent):
    """A4 - simulated annealing over the joint accept/stow decision.

    Acceptance and stowage are one decision here, so the search runs inside
    select() and stow() just applies the plan it produced. Both calls happen back
    to back inside the same timed block, so the reported decision time is the
    true cost of the metaheuristic.
    """
    plan = 'A4'
    stochastic = True

    def __init__(self, iterations=800, T0=20_000_000, alpha=0.995,
                 restow_cost_per_move=3_000_000, name='annealing'):
        self.name = name
        self.iterations = iterations
        self.T0 = T0
        self.alpha = alpha
        self.label = 'A4 Metaheuristic (Simulated Annealing, %d iter)' % iterations
        self.hyperparameters = {'iterations': iterations, 'T0': T0, 'alpha': alpha}
        self._econ = {'restowCostPerMove': restow_cost_per_move, 'roll': roll_penalty}
        self._plan = None      # handed from select() to stow() within one port-call

    def select(self, orders, ctx):
        containers = []
        for o in orders:
            for c in unpack(o):
                c['hops'] = hops_between(ctx.ports, ctx.port, c['destination'])
                containers.append(c)

        stacks, _cost, placement = _anneal(
            containers, ctx, self._econ,
            {'iterations': self.iterations, 'T0': self.T0, 'alpha': self.alpha})

        slot_for = {}
        for i in range(len(containers)):
            p = placement[i]
            if p is None:
                continue
            stack_idx, tier_idx = p
            st = stacks[stack_idx]
            slot_for[containers[i]['id']] = {
                'bay': st.bay, 'row': st.row, 'tier': st.tiers[tier_idx]}
        self._plan = slot_for

        # An order is accepted only if ALL of its containers found a slot: taking
        # an order and then rolling part of it is strictly worse than declining
        # it outright, for non-committed cargo.
        out = []
        for o in orders:
            if all('%s_c%s' % (o['id'], q) in slot_for for q in range(o['quantity'])):
                out.append(o)
        return out

    def stow(self, containers, grid, ctx):
        # Replay in planned loading order: tier 02 is only reachable while the
        # stack above it is still empty, so applying the plan out of order would
        # silently invalidate the deep placements the search paid for.
        plan = self._plan

        def rank(c):
            s = plan.get(c['id']) if plan else None
            return BOTTOM_UP.index(s['tier']) if s else 99

        ordered = sorted(containers, key=rank)

        leftover = []
        for c in ordered:
            s = plan.get(c['id']) if plan else None
            slots = valid_slots(grid, c)
            if s is not None and any(v['bay'] == s['bay'] and v['row'] == s['row']
                                     and v['tier'] == s['tier'] for v in slots):
                grid[s['bay']][s['row']][s['tier']] = c
                continue
            if len(slots) == 0:
                leftover.append(c)
                continue
            f = slots[0]
            grid[f['bay']][f['row']][f['tier']] = c
        self._plan = None
        return leftover


class CommittedOnlyAgent(Agent):
    """Conservative floor: carry only what is contractually mandatory."""
    name = 'committedOnly'
    plan = 'REF'
    label = 'Ref: committed only'

    def select(self, orders, ctx):
        return [o for o in orders if o['customerType'] == 'Committed']

    def stow(self, containers, grid, ctx):
        return stow_first_fit(containers, grid)


class GreedyAcceptAllAgent(Agent):
    """Shipped GREEDY bot, exactly as built."""
    name = 'greedyAcceptAll'
    plan = 'REF'
    label = 'Ref: shipped GREEDY bot'

    def select(self, orders, ctx):
        return select_via_game_bot(orders, ctx, 'GREEDY')

    def stow(self, containers, grid, ctx):
        return stow_via_game_bot(containers, grid, ctx.port, ctx.ports, 'GREEDY')


class BalancedAgent(Agent):
    """Shipped BALANCED bot, exactly as built."""
    name = 'balanced'
    plan = 'REF'
    label = 'Ref: shipped BALANCED bot'
    stochastic = True

    def select(self, orders, ctx):
        return select_via_game_bot(orders, ctx, 'BALANCED')

    def stow(self, containers, grid, ctx):
        return stow_via_game_bot(containers, grid, ctx.port, ctx.ports, 'BALANCED')


_FACTORIES = {
    'random': RandomAgent,
    'ruleSmart': RuleSmartAgent,
    'greedy': GreedyAgent,
    'annealing': AnnealingAgent,
    'committedOnly': CommittedOnlyAgent,
    'greedyAcceptAll': GreedyAcceptAllAgent,
    'balanced': BalancedAgent,
}


def make_agent(name, **kwargs):
    """A fresh instance per call. A4 carries a plan between select() and stow(),
    so sharing one instance across concurrent episodes would cross the wires."""
    return _FACTORIES[name](**kwargs)


PLAN_LINEUP = ['random', 'ruleSmart', 'greedy', 'annealing']

REFERENCE_LINEUP = ['committedOnly', 'greedyAcceptAll', 'balanced']

DEFAULT_LINEUP = PLAN_LINEUP + REFERENCE_LINEUP

STOCHASTIC = {'random', 'annealing', 'balanced'}


def is_stochastic(name):
    return name in STOCHASTIC
