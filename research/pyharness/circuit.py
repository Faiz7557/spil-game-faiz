"""Port of research/src/circuit.mjs - the MDP used by the thesis experiments.

One carrier operates the vessel across the whole circuit alone, making two
decisions at every port-call: which orders to accept, and where to stow the
containers it accepted. Eight decision epochs, then a three-week drain so no
cargo is stranded by the horizon.

This file is the Python half of the V2 structural-validity claim: for identical
seeds it must reproduce revenue, restow counts, rolled counts and final cash
bit for bit against `circuit.mjs`. `verify_parity.py` is what checks it.
"""

import time

from .constants import create_empty_grid, get_bay_config, validate_grid_physics
from .engine import (
    DEFAULT_SCENARIO, calculate_restows, generate_orders, process_sailing_transition,
    rng_for_port_call,
)
from .jscompat import js_object_keys, js_sum

CONFIG = {
    'ports': ['SBY', 'MKS', 'JYP', 'MDN'],
    'bays': ['10', '06', '02'],       # 36 slots: 12 REEFER (bay 10) + 24 DRY
    'horizonWeeks': 8,
    'drainWeeks': 3,
    'startCash': 150_000_000,
    'restowCostPerMove': 3_000_000,
    'revenueRecognition': 'discharge',
}


def _capacity(reefer_only=None):
    n = 0
    for bay in CONFIG['bays']:
        cfg = get_bay_config(bay)
        if reefer_only is not None and (cfg.container_type == 'REEFER') != reefer_only:
            continue
        n += len(cfg.rows) * len(cfg.tiers)
    return n


CAPACITY = _capacity()
REEFER_CAPACITY = _capacity(reefer_only=True)
DRY_CAPACITY = CAPACITY - REEFER_CAPACITY

# --- analytical demand model ------------------------------------------------

MEAN_ORDERS = 8
MEAN_QUANTITY = 2
MEAN_DWELL = len(CONFIG['ports']) / 2


def lambda_for(scenario=None):
    sc = scenario or DEFAULT_SCENARIO
    return MEAN_ORDERS * sc.get('intensity', 1) * MEAN_QUANTITY


def rho_for(scenario=None):
    return lambda_for(scenario) * MEAN_DWELL / CAPACITY


def rho_reefer_for(scenario=None):
    sc = scenario or DEFAULT_SCENARIO
    share = sc.get('reeferShare', DEFAULT_SCENARIO['reeferShare'])
    return lambda_for(scenario) * share * MEAN_DWELL / REEFER_CAPACITY


def intensity_for_rho(rho):
    return rho * CAPACITY / (MEAN_ORDERS * MEAN_QUANTITY * MEAN_DWELL)


NOMINAL_SCENARIO = dict(DEFAULT_SCENARIO)


def roll_penalty(is_committed, container_type):
    if is_committed:
        return 16_000_000 if container_type == 'DRY' else 24_000_000
    return 8_000_000 if container_type == 'DRY' else 16_000_000


def unpack(order):
    """Expands an order into its individual containers."""
    return [{
        'id': '%s_c%s' % (order['id'], q),
        'orderId': order['id'],
        'containerType': order['containerType'],
        'origin': order['origin'],
        'destination': order['destination'],
        'tariff': order['tariff'],
        'customerType': order['customerType'],
        'customerName': order['customerName'],
    } for q in range(order['quantity'])]


def occupied(grid):
    n = 0
    for bay in js_object_keys(grid):
        cfg = get_bay_config(bay)
        for row in cfg.rows:
            stack = grid[bay][row]
            n += sum(1 for t in cfg.tiers if stack[t])
    return n


def hops_between(ports, origin, destination):
    """Hops along the circuit. The `+ len(ports)` before the modulo keeps the
    dividend non-negative, so JS's remainder and Python's modulo agree."""
    return (ports.index(destination) - ports.index(origin) + len(ports)) % len(ports)


def valid_slots(grid, container):
    """Every slot this container may legally occupy right now.

    Three constraints, all from the game's bay plan: slot type must match, tier
    84 needs 82 filled, and tier 02 is unreachable once 82 or 84 is filled.

    That last one is an order-of-loading constraint rather than a state
    invariant, which is why `validate_grid_physics` does not check it.

    Doubles as the action mask for the RL agent.
    """
    out = []
    container_type = container['containerType']
    for bay in js_object_keys(grid):
        cfg = get_bay_config(bay)
        if cfg.container_type != container_type:
            continue
        for row in cfg.rows:
            stack = grid[bay][row]
            for tier in cfg.tiers:
                if stack[tier] is not None:
                    continue
                if tier == '84' and stack['82'] is None:
                    continue
                if tier == '02' and (stack['82'] is not None or stack['84'] is not None):
                    continue
                out.append({'bay': bay, 'row': row, 'tier': tier})
    return out


def free_slot_count(grid, container_type):
    return len(valid_slots(grid, {'containerType': container_type}))


def value_bound_for(grid, port):
    total = 0
    for bay in js_object_keys(grid):
        cfg = get_bay_config(bay)
        for row in cfg.rows:
            stack = grid[bay][row]
            for tier in cfg.tiers:
                c = stack[tier]
                if c and c['destination'] == port:
                    total += c['tariff']
    return total


class Ctx:
    """What an agent is handed at a port-call.

    Field names are snake_case here; they map one-to-one onto the JS ctx keys
    (`next_port` is `nextPort`, `weeks_left` is `weeksLeft`). `grid` is
    read-only inside select(); only stow() may write to it.
    """

    __slots__ = ('port', 'next_port', 'week', 'ports', 'grid', 'weeks_left', 'rng')

    def __init__(self, port, next_port, week, ports, grid, weeks_left, rng):
        self.port = port
        self.next_port = next_port
        self.week = week
        self.ports = ports
        self.grid = grid
        self.weeks_left = weeks_left
        self.rng = rng


def _now_ms():
    return time.perf_counter() * 1000.0


def run_episode(agent, seed, demand=None, scenario=None, replicate=0):
    """Runs one full episode.

    `replicate` changes only the agent's own random stream, never the scenario,
    so all replicates of all agents still face byte-identical demand. Replicate
    0 uses the original key so previously recorded runs stay reproducible.
    """
    if scenario is None:
        scenario = NOMINAL_SCENARIO

    ports = CONFIG['ports']
    horizon_weeks = CONFIG['horizonWeeks']
    drain_weeks = CONFIG['drainWeeks']
    restow_cost_per_move = CONFIG['restowCostPerMove']

    grid = create_empty_grid(CONFIG['bays'])

    m = {
        'revenueLoad': 0, 'revenueDischarge': 0, 'revenueDrain': 0,
        'restowContainers': 0, 'restowPenalty': 0, 'restowPenaltyDrain': 0,
        'rolled': 0, 'rollingPenalty': 0,
        'offered': 0, 'accepted': 0, 'loaded': 0,
        'reeferOffered': 0, 'reeferRolled': 0, 'committedOffered': 0,
        'aboardAtHorizon': 0, 'valueAboardAtHorizon': 0,
        'physicsViolations': 0, 'utilisation': [], 'weekly': [],
        'decisionMs': 0.0, 'decisionMsMax': 0.0, 'decisionCalls': 0,
    }

    total_weeks = horizon_weeks + drain_weeks

    for week in range(1, total_weeks + 1):
        port = ports[(week - 1) % len(ports)]
        next_port = ports[week % len(ports)]
        is_decision_week = week <= horizon_weeks

        week_revenue = 0
        week_rolling = 0

        if is_decision_week:
            orders = generate_orders(
                port, week, ports, rng_for_port_call(seed, week, port), scenario)

            agent_key = ('%s#%s@%s' % (agent.name, replicate, port) if replicate
                         else '%s@%s' % (agent.name, port))
            ctx = Ctx(
                port=port, next_port=next_port, week=week, ports=ports, grid=grid,
                weeks_left=horizon_weeks - week,
                rng=rng_for_port_call(seed, week, agent_key),
            )

            if demand is not None:
                demand['portCalls'] += 1
                demand['ordersPerCall'].append(len(orders))
                for o in orders:
                    demand['orders'] += 1
                    demand['containers'] += o['quantity']
                    if o['containerType'] == 'REEFER':
                        demand['reefer'] += o['quantity']
                    if o['customerType'] == 'Committed':
                        demand['committed'] += o['quantity']
                    hops = hops_between(ports, port, o['destination'])
                    for _ in range(o['quantity']):
                        demand['dwell'].append(hops)
                    demand['tariffs'].append(o['tariff'])

            for o in orders:
                m['offered'] += o['quantity']
                if o['containerType'] == 'REEFER':
                    m['reeferOffered'] += o['quantity']
                if o['customerType'] == 'Committed':
                    m['committedOffered'] += o['quantity']

            # Only the agent's own work is inside the clock.
            t0 = _now_ms()
            accepted = agent.select(orders, ctx)
            containers = [c for o in accepted for c in unpack(o)]
            leftover = agent.stow(containers, grid, ctx)
            elapsed = _now_ms() - t0

            m['decisionMs'] += elapsed
            m['decisionCalls'] += 1
            if elapsed > m['decisionMsMax']:
                m['decisionMsMax'] = elapsed

            accepted_ids = {o['id'] for o in accepted}
            declined = [o for o in orders if o['id'] not in accepted_ids]
            leftover_ids = {c['id'] for c in leftover}

            m['accepted'] += len(containers)
            for c in containers:
                if c['id'] not in leftover_ids:
                    week_revenue += c['tariff']
                    m['loaded'] += 1
            m['revenueLoad'] += week_revenue

            # Two ways to be penalised: accept an order then fail to load it, or
            # ignore a Committed order entirely. Declining a Non-Committed order
            # is free.
            for c in leftover:
                m['rolled'] += 1
                if c['containerType'] == 'REEFER':
                    m['reeferRolled'] += 1
                week_rolling += roll_penalty(
                    c['customerType'] == 'Committed', c['containerType'])
            for o in declined:
                if o['customerType'] != 'Committed':
                    continue
                m['rolled'] += o['quantity']
                if o['containerType'] == 'REEFER':
                    m['reeferRolled'] += o['quantity']
                week_rolling += o['quantity'] * roll_penalty(True, o['containerType'])
            m['rollingPenalty'] += week_rolling

        # Restow is charged at EVERY port-call, decision or drain: a container
        # that blocks discharge has to be shifted again each time the vessel
        # berths. See research/docs/ASUMSI.md, assumption A-4.
        if not validate_grid_physics(grid).valid:
            m['physicsViolations'] += 1
        if is_decision_week:
            m['utilisation'].append(occupied(grid) / CAPACITY)

        restow = calculate_restows(grid, port, ports)
        week_restow = restow['restowMovementsCount'] * restow_cost_per_move
        m['restowContainers'] += restow['restowContainersCount']
        m['restowPenalty'] += week_restow
        if not is_decision_week:
            m['restowPenaltyDrain'] += week_restow

        discharged = value_bound_for(grid, next_port)
        m['revenueDischarge'] += discharged
        if not is_decision_week:
            m['revenueDrain'] += discharged

        m['weekly'].append({
            'week': week, 'port': port,
            'phase': 'decision' if is_decision_week else 'drain',
            'revenue': week_revenue,
            'dischargeRevenue': discharged,
            'restowPenalty': week_restow,
            'rollingPenalty': week_rolling,
            'utilisation': occupied(grid) / CAPACITY,
        })

        if week == horizon_weeks:
            m['aboardAtHorizon'] = occupied(grid)
            m['valueAboardAtHorizon'] = sum(value_bound_for(grid, p) for p in ports)

        grid = process_sailing_transition(grid, next_port)

    revenue = m['revenueDischarge'] if CONFIG['revenueRecognition'] == 'discharge' \
        else m['revenueLoad']

    result = {
        'agent': agent.name,
        'seed': seed,
        'replicate': replicate,
        'scenario': scenario,
        'revenue': revenue,
        'cash': CONFIG['startCash'] + revenue - m['restowPenalty'] - m['rollingPenalty'],
        'meanUtilisation': js_sum(m['utilisation']) / len(m['utilisation']),
        'meanDecisionMs': m['decisionMs'] / max(1, m['decisionCalls']),
    }
    result.update(m)
    return result
