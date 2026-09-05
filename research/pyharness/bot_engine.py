"""Port of server/utils/botEngine.js - the shipped bots' own decision code.

A2 and the two diagnostic references are defined as "whatever the game's bot
actually does", so they delegate here rather than reimplementing a threshold.
Only the two functions agents.mjs imports are ported.

A bot is a plain dict with the keys the JS code touches: `personality`, `id`,
`cargoPool`, `pendingContainers`.
"""

import random

from .constants import get_bay_config
from .jscompat import js_object_keys


def execute_bot_cargo_selection(bot, current_port, active_ports, rng=None):
    """Acceptance. Mutates `bot`: accepted orders leave `cargoPool`.

    The BALANCED draw happens only on the non-committed branch, because the
    committed branch returns before reaching it. Hoisting the draw out of the
    branch would keep the same acceptance rule and still desynchronise the
    stream for every later port-call.
    """
    if rng is None:
        rng = random.random

    pool = bot.get('cargoPool') or []
    if len(pool) == 0:
        return

    accepted_containers = []
    remaining_pool = []

    for order in pool:
        if order['customerType'] == 'Committed':
            accept = True
        elif bot['personality'] == 'GREEDY':
            accept = True
        elif bot['personality'] == 'SMART':
            accept = order['tariff'] >= 11000000
        else:
            accept = rng() < 0.6

        if accept:
            for q in range(order['quantity']):
                accepted_containers.append({
                    'id': '%s_bot_%s_cont_%s' % (order['id'], bot.get('id'), q),
                    'orderId': order['id'],
                    'containerType': order['containerType'],
                    'origin': order['origin'],
                    'destination': order['destination'],
                    'tariff': order['tariff'],
                    'customerType': order['customerType'],
                    'customerName': order['customerName'],
                })
        else:
            remaining_pool.append(order)

    bot['pendingContainers'] = list(bot.get('pendingContainers') or []) + accepted_containers
    bot['cargoPool'] = remaining_pool


def execute_bot_stowage_placement(bot, grid, current_port, active_ports):
    """Stowage. Mutates `grid`, and leaves what did not fit in
    `bot['pendingContainers']`.

    SMART stows next-port cargo FIRST onto the upper tiers. That ordering seals
    tier 02 under the hatch cover and forces later-port cargo directly on top of
    cargo due off next - the mechanism behind A2's poor restow ranking, and the
    reason this is delegated rather than reimplemented.
    """
    pending = bot.get('pendingContainers') or []
    if len(pending) == 0:
        return grid

    current_index = active_ports.index(current_port)
    next_port = active_ports[(current_index + 1) % len(active_ports)]

    containers_to_stow = list(pending)
    if bot['personality'] == 'SMART':
        containers_to_stow.sort(key=lambda c: 0 if c['destination'] == next_port else 1)

    bays = sorted(js_object_keys(grid), key=int, reverse=True)

    remaining_pending = []
    for container in containers_to_stow:
        placed = False

        for bay in bays:
            if placed:
                break
            cfg = get_bay_config(bay)
            if cfg.container_type != container['containerType']:
                continue

            tier_order = list(cfg.tiers)
            if bot['personality'] == 'SMART':
                preferred = ['84', '82', '02'] if container['destination'] == next_port \
                    else ['02', '82', '84']
                tier_order = [t for t in preferred if t in cfg.tiers]

            for row in cfg.rows:
                if placed:
                    break
                for tier in tier_order:
                    stack = grid[bay][row]
                    if stack[tier] is not None:
                        continue
                    if tier == '84' and stack['82'] is None:
                        continue
                    if tier == '02' and (stack['82'] is not None or stack['84'] is not None):
                        continue
                    grid[bay][row][tier] = container
                    placed = True
                    break

        if not placed:
            remaining_pending.append(container)

    bot['pendingContainers'] = remaining_pending
    bot['ready'] = True
    return grid
