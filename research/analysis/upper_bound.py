"""Provable upper bound on the cash any agent could possibly have earned.

WHY THIS EXISTS
---------------
Friedman + Nemenyi answer "is A better than B?". They cannot answer "is A any
good?". If every agent in the line-up is mediocre, the ranking still comes out
crisp and highly significant, and nothing in the statistics warns you. A bound
turns every ordinal result into a cardinal one: instead of "A3 beats A2", the
thesis can say "A3 realises 78% of what was attainable on these scenarios, A2
only 66%" - and if the eventual DRL agent lands at 95%, that is the sentence
worth writing a conclusion about.

THE RELAXATION
--------------
Solve, per seed, with perfect foresight over the whole horizon:

    maximise   sum_c (tariff_c + P_c * committed_c) * x_c   -  sum_c P_c * committed_c
    s.t.       for every week w and type t:
                   sum of x_c over containers of type t occupying week w  <=  cap_t
               x_c in {0, 1}

where P_c is the rolling penalty of container c and a container loaded in week
w_c occupies a slot in weeks w_c .. w_c + hops_c - 1.

Four things are relaxed away, and EVERY one of them can only help the solver,
which is what makes the result a true upper bound rather than a good heuristic:

  R1  stacking geometry is dropped - slots of the right type are fungible, so
      hatch-cover and support constraints disappear;
  R2  restow cost is set to zero - no bay plan is ever penalised;
  R3  demand for all 8 weeks is known in advance;
  R4  acceptance is per container rather than per order, so a 3-container order
      may be half-carried without the rolling penalty on the remainder.

The bound is therefore loose. That is fine and should be said plainly in Bab 4:
it brackets the problem from above, it is not a target anyone can reach.

Usage:  python upper_bound.py [path/to/scenarios_test.csv]
Needs:  research/results/scenarios_test.csv  (node research/dump-scenarios.mjs)
"""
import sys
import io
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.optimize import milp, LinearConstraint, Bounds

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Must match research/src/circuit.mjs CONFIG and shared/gameConstants.js
START_CASH = 150_000_000
HORIZON_WEEKS = 8
DRAIN_WEEKS = 3
CAPACITY = {"DRY": 24, "REEFER": 12}

# SPIL rolling penalty table, per container
ROLL_PENALTY = {
    (True, "DRY"): 16_000_000, (True, "REEFER"): 24_000_000,
    (False, "DRY"): 8_000_000, (False, "REEFER"): 16_000_000,
}


def bound_for_seed(orders):
    """Upper bound on final cash for one seed. `orders` is that seed's rows."""
    tariff, penalty, ctype, week, hops = [], [], [], [], []
    for r in orders.itertuples(index=False):
        committed = r.customer_type == "Committed"
        p = ROLL_PENALTY[(True, r.container_type)] if committed else 0
        for _ in range(int(r.quantity)):
            tariff.append(float(r.tariff))
            penalty.append(float(p))
            ctype.append(r.container_type)
            week.append(int(r.week))
            hops.append(int(r.hops))

    n = len(tariff)
    if n == 0:
        return START_CASH

    tariff = np.array(tariff)
    penalty = np.array(penalty)
    week = np.array(week)
    hops = np.array(hops)
    ctype = np.array(ctype)

    # Carrying container c is worth its freight PLUS the penalty it avoids.
    gain = tariff + penalty

    # One capacity row per (week, type). Occupancy runs into the drain weeks.
    rows, lo, hi = [], [], []
    for w in range(1, HORIZON_WEEKS + DRAIN_WEEKS + 1):
        for t, cap in CAPACITY.items():
            occupies = (ctype == t) & (week <= w) & (w < week + hops)
            if not occupies.any():
                continue
            rows.append(occupies.astype(float))
            lo.append(-np.inf)
            hi.append(float(cap))

    constraints = [LinearConstraint(np.array(rows), lo, hi)] if rows else []
    res = milp(
        c=-gain,                                   # milp minimises
        constraints=constraints,
        integrality=np.ones(n),
        bounds=Bounds(np.zeros(n), np.ones(n)),
    )
    if not res.success:
        raise RuntimeError("MILP failed: " + str(res.message))

    # Every committed container is charged up front; carrying it refunds P_c,
    # which is exactly how `gain` was built.
    return START_CASH + (-res.fun) - penalty.sum()


def main():
    default = Path(__file__).resolve().parent.parent / "results" / "scenarios_test.csv"
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else default
    if not path.exists():
        sys.exit("no scenarios at %s\nrun:  node research/dump-scenarios.mjs" % path)

    df = pd.read_csv(path)
    seeds = sorted(df["seed"].unique())
    print("solving %d seeds from %s" % (len(seeds), path.name))

    out = []
    for i, s in enumerate(seeds, 1):
        out.append((s, bound_for_seed(df[df["seed"] == s])))
        if i % 50 == 0 or i == len(seeds):
            print("  %d/%d" % (i, len(seeds)))

    res = pd.DataFrame(out, columns=["seed", "ub_cash"])
    dest = path.parent / "upper_bound.csv"
    res.to_csv(dest, index=False)

    jt = res["ub_cash"] / 1e6
    print("\nupper bound on final cash (jt):  median %.1f   mean %.1f   min %.1f   max %.1f"
          % (jt.median(), jt.mean(), jt.min(), jt.max()))
    print("wrote %s" % dest)
    print("stats.py picks this up automatically and reports the realisation ratio.")


if __name__ == "__main__":
    main()
