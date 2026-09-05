"""Port of server/utils/gameEngine.js - PRNG, demand generator, restow
accounting and the sailing transition.

Only the functions `circuit.mjs` and `agents.mjs` actually import are ported.
The revenue helpers (`calculateGrossRevenue`, `calculateDischargeRevenue`) and
`calculateRollingPenalties` are left out on purpose: the harness does that
accounting itself, so porting them would add code no experiment reaches.

The PRNG is the part that has to be exactly right. Everything downstream -
which orders exist, what A1 draws, which move A4 tries - is a function of the
bit pattern this produces, so a one-bit disagreement produces two completely
different experiments rather than two slightly different numbers.
"""

import math
import random

from .constants import PORTS, get_bay_config
from .jscompat import UINT32, js_object_keys, js_round, js_str


def create_rng(seed):
    """mulberry32, bit-identical to the JS original.

    The JS version mixes signed int32 values (`| 0`, `Math.imul`) with unsigned
    shifts (`>>>`). Carrying everything as unsigned 32-bit here gives the same
    bit patterns throughout, because two's-complement XOR, OR and shifts do not
    care how the sign bit is interpreted, and `Math.imul` is defined as the low
    32 bits of the product.
    """
    a = seed & UINT32

    def rng():
        nonlocal a
        a = (a + 0x6D2B79F5) & UINT32
        t = ((a ^ (a >> 15)) * (1 | a)) & UINT32
        t = ((t + (((t ^ (t >> 7)) * (61 | t)) & UINT32)) & UINT32) ^ t
        return ((t ^ (t >> 14)) & UINT32) / 4294967296

    return rng


def hash_seed(*parts):
    """FNV-1a 32-bit over the parts joined with '|'.

    JS iterates UTF-16 code units via `charCodeAt`; every part the harness
    hashes is ASCII, so `ord` over the Python string agrees.
    """
    s = '|'.join(js_str(p) for p in parts)
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & UINT32
    return h & UINT32


def rng_for_port_call(seed, week, port):
    if seed is None or seed == '':
        return random.random
    return create_rng(hash_seed(seed, week, port))


# Informasi Tarif Muatan PT. SPIL.
TARIFF_TABLE = {
    'SBY': {
        'MKS': {'DRY': 18000000, 'REEFER': 30000000},
        'MDN': {'DRY': 6000000, 'REEFER': 11000000},
        'JYP': {'DRY': 16200000, 'REEFER': 24000000},
    },
    'MKS': {
        'SBY': {'DRY': 10000000, 'REEFER': 18000000},
        'MDN': {'DRY': 12000000, 'REEFER': 20000000},
        'JYP': {'DRY': 16000000, 'REEFER': 24000000},
    },
    'JYP': {
        'SBY': {'DRY': 13000000, 'REEFER': 19000000},
        'MKS': {'DRY': 13000000, 'REEFER': 23000000},
        'MDN': {'DRY': 11000000, 'REEFER': 17000000},
    },
    'MDN': {
        'SBY': {'DRY': 13000000, 'REEFER': 22000000},
        'MKS': {'DRY': 14000000, 'REEFER': 24000000},
        'JYP': {'DRY': 14000000, 'REEFER': 22000000},
    },
}

DEFAULT_SCENARIO = {
    'intensity': 1.0,
    'reeferShare': 0.30,
    'committedShare': 0.40,
}

CUSTOMER_NAMES = [
    'PT Pelayaran Harapan', 'CV Sinar Abadi', 'PT Borneo Logistics',
    'PT Papua Trans', 'PT Samudra Jaya', 'CV Maju Bersama',
    'PT Indo Cargo', 'PT Sumatra Express', 'CV Nusantara Carrier',
    'PT Khatulistiwa Ship',
]


def generate_orders(port, week, active_ports=None, rng=None, scenario=None):
    """Demand for one port-call.

    The draw sequence is load-bearing and must not be reordered or
    short-circuited: two strata that differ only in `intensity` are supposed to
    share the same underlying scenario, which only holds because the base order
    count is drawn unconditionally before `intensity` scales it.
    """
    if active_ports is None:
        active_ports = PORTS
    if rng is None:
        rng = random.random

    sc = dict(DEFAULT_SCENARIO)
    if scenario:
        sc.update(scenario)
    intensity = sc['intensity']
    reefer_share = sc['reeferShare']
    committed_share = sc['committedShare']

    destinations = [p for p in active_ports if p != port]

    base_orders = math.floor(rng() * 5) + 6
    num_orders = max(1, js_round(base_orders * intensity))

    orders = []
    for i in range(num_orders):
        customer_name = CUSTOMER_NAMES[math.floor(rng() * len(CUSTOMER_NAMES))]
        customer_type = 'Committed' if rng() < committed_share else 'Non-Committed'
        container_type = 'DRY' if rng() < (1 - reefer_share) else 'REEFER'
        destination = destinations[math.floor(rng() * len(destinations))]
        quantity = math.floor(rng() * 3) + 1

        row = TARIFF_TABLE.get(port, {}).get(destination, {})
        if container_type in row:
            tariff = row[container_type]
        elif container_type == 'DRY':
            # Unreachable on the 4-port circuit; kept because it consumes a draw.
            tariff = 10000000 + math.floor(rng() * 5) * 1000000
        else:
            tariff = 16000000 + math.floor(rng() * 7) * 1000000

        orders.append({
            'id': 'ord_%s_%s_%s' % (week, port, i),
            'customerName': customer_name,
            'customerType': customer_type,
            'containerType': container_type,
            'origin': port,
            'destination': destination,
            'quantity': quantity,
            'tariff': tariff,
            'accepted': False,
        })

    return orders


def calculate_restows(grid, current_port, active_ports=None):
    """Counts containers that must be shifted to reach next-port cargo below them.

    This is the BILLING rule and it only looks one port ahead, which is correct
    for what a berth charges. It is not what A3 and A4 plan against - see
    `stack_overstow` in agents.py for that distinction.
    """
    if active_ports is None:
        active_ports = PORTS
    current_index = active_ports.index(current_port)
    next_port = active_ports[(current_index + 1) % len(active_ports)]

    restow_containers_count = 0
    restowed_list = []

    for bay in js_object_keys(grid):
        cfg = get_bay_config(bay)
        for row in cfg.rows:
            stack = grid[bay][row]
            active_tiers = ['02', '82', '84'] if '02' in cfg.tiers else ['82', '84']

            next_port_found = False
            for tier in active_tiers:
                container = stack[tier]
                if not container:
                    continue
                if container['destination'] == next_port:
                    next_port_found = True
                elif next_port_found:
                    restow_containers_count += 1
                    restowed_list.append({'bay': bay, 'row': row, 'tier': tier})

    return {
        'restowContainersCount': restow_containers_count,
        'restowMovementsCount': restow_containers_count * 2,
        'restowedList': restowed_list,
    }


def process_sailing_transition(grid, next_port):
    """Discharges next-port cargo, then slides tier 84 down into an empty 82.

    JS deep-copies via JSON round-trip. Here the stack dicts are rebuilt but the
    container dicts are shared, which is safe because nothing in the harness
    mutates a container after it is created, and no code compares containers by
    identity.
    """
    new_grid = {}
    for bay in js_object_keys(grid):
        cfg = get_bay_config(bay)
        new_grid[bay] = {}
        for row in cfg.rows:
            stack = dict(grid[bay][row])

            for tier in cfg.tiers:
                container = stack[tier]
                if container and container['destination'] == next_port:
                    stack[tier] = None

            # Underdeck 02 does not slide: the hatch cover sits between them.
            if stack.get('84') and not stack.get('82'):
                stack['82'] = stack['84']
                stack['84'] = None

            new_grid[bay][row] = stack
    return new_grid
