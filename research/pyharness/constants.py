"""Port of shared/gameConstants.js - vessel bay plan and physics validation.

Grids are nested dicts, exactly like the JS objects: grid[bay][row][tier] is a
container dict or None. Keeping the shape identical is what makes the two
implementations checkable line by line.
"""

from typing import NamedTuple

from .jscompat import js_object_keys

PORTS = ['SBY', 'MKS', 'JYP', 'MDN']

BAYS = ['18', '14', '10', '06', '02']

REEFER_BAYS = ['14', '10']


class BayConfig(NamedTuple):
    rows: tuple
    tiers: tuple
    container_type: str


# getBayConfig builds a fresh object per call in JS. Here it is cached and
# immutable instead: it sits in the hot path of valid_slots(), and nothing in
# the harness mutates a config.
_BAY_CONFIG_CACHE = {}


def get_bay_config(bay):
    cfg = _BAY_CONFIG_CACHE.get(bay)
    if cfg is None:
        is_bay18 = bay == '18'
        cfg = BayConfig(
            rows=('01', '00', '02') if is_bay18 else ('03', '01', '02', '04'),
            tiers=('84', '82') if is_bay18 else ('84', '82', '02'),
            container_type='REEFER' if bay in REEFER_BAYS else 'DRY',
        )
        _BAY_CONFIG_CACHE[bay] = cfg
    return cfg


def create_empty_grid(bays=None):
    if bays is None:
        bays = BAYS
    grid = {}
    for bay in bays:
        grid[bay] = {}
        cfg = get_bay_config(bay)
        for row in cfg.rows:
            grid[bay][row] = {tier: None for tier in cfg.tiers}
    return grid


class PhysicsResult(NamedTuple):
    valid: bool
    errors: list


def validate_grid_physics(grid):
    """Slot-type matching and the "84 needs 82" support rule.

    Note what is deliberately absent: the tier-02 hatch-cover rule. That one is
    an order-of-loading constraint, not a state invariant - a full 02+82+84
    stack is legal when it was loaded bottom-up - so checking it here would
    reject valid grids. See the comment on valid_slots().
    """
    errors = []
    for bay in js_object_keys(grid):
        cfg = get_bay_config(bay)
        for row in cfg.rows:
            stack = grid[bay][row]
            for tier in cfg.tiers:
                container = stack[tier]
                if container:
                    if cfg.container_type == 'REEFER' and container['containerType'] != 'REEFER':
                        errors.append(
                            'Slot Bay %s, Row %s, Tier %s hanya menerima kontainer '
                            'REEFER, tetapi berisi DRY.' % (bay, row, tier))
                    if cfg.container_type == 'DRY' and container['containerType'] != 'DRY':
                        errors.append(
                            'Slot Bay %s, Row %s, Tier %s hanya menerima kontainer '
                            'DRY, tetapi berisi REEFER.' % (bay, row, tier))
            if stack.get('84') and not stack.get('82'):
                errors.append(
                    'Kesalahan Fisika Kapal: Kontainer di Bay %s, Row %s, Tier 84 '
                    'melayang. Dibutuhkan Tier 82.' % (bay, row))
    return PhysicsResult(valid=len(errors) == 0, errors=errors)
