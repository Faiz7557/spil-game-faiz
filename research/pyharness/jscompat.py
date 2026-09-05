"""JavaScript semantics that Python does not share.

Every helper here exists because the obvious Python translation of the harness
would silently disagree with `circuit.mjs`. V2 structural validity is a
bit-for-bit equality claim (see research/README.md, "Porting to Python"), so a
silent disagreement is not a cosmetic bug - it invalidates the claim.
"""

import math

UINT32 = 0xFFFFFFFF


def js_round(x):
    """JS `Math.round` rounds a half toward +Infinity; Python's `round` rounds a
    half to even. `Math.round(2.5)` is 3, `round(2.5)` is 2 - which changes the
    order count in `generate_orders` at any intensity that lands on a half.
    """
    return math.floor(x + 0.5)


def js_object_keys(obj):
    """Reproduce `Object.keys()` ordering: canonical array-index keys first in
    ascending numeric order, then the remaining string keys in insertion order.

    Bay ids look numeric but only some of them are canonical array indices:
    '10' is one because `String(10) === '10'`, while '06' and '02' are not
    because of the leading zero. So a 3-bay research grid iterates
    ['10', '06', '02'] - which happens to equal insertion order - but a full
    5-bay grid iterates ['10', '14', '18', '06', '02'], which does not.

    This matters because `valid_slots()` and `snapshot_stacks()` depend on the
    order: it decides which slot counts as "first" for every fallback placement,
    and which stack index A4's `stackChoice` draws actually refer to.
    """
    index_keys = []
    string_keys = []
    for k in obj:
        if type(k) is str and k.isdigit() and str(int(k)) == k and int(k) < UINT32:
            index_keys.append(k)
        else:
            string_keys.append(k)
    index_keys.sort(key=int)
    return index_keys + string_keys


def js_str(value):
    """`String(value)` for the value kinds the harness feeds into `hash_seed`.

    A non-integral float would need JS's shortest-round-trip float formatting,
    which Python's `repr` only approximates. The harness never hashes one, so
    this raises instead of guessing - a loud failure beats a silent seed shift.
    """
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if value.is_integer() and abs(value) < 1e21:
            return str(int(value))
        raise ValueError('non-integral float in a hashed seed part: %r' % (value,))
    return str(value)
