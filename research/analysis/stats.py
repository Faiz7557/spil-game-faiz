"""Statistical pipeline for the agent comparison.

Randomized complete block design: scenario seeds are blocks, agents are
treatments, every agent faces byte-identical demand within a block.

  Friedman  -> is there any difference at all?
  Kendall W -> how consistent is the ordering across blocks?
  Nemenyi   -> which specific pairs are separated?

Follows Demsar (2006), JMLR 7:1-30. Nemenyi is implemented directly because
scikit-posthocs is not a dependency; the critical difference is

    CD = q_alpha * sqrt( k(k+1) / 6N )

with q_alpha the studentised range statistic divided by sqrt(2).

Usage:  python stats.py [path/to/pilot_results.csv]
"""
import sys
import io
import math
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# q_alpha for alpha = 0.05, infinite degrees of freedom, k treatments
Q05 = {2: 1.960, 3: 2.343, 4: 2.569, 5: 2.728,
       6: 2.850, 7: 2.949, 8: 3.031, 9: 3.102, 10: 3.164}

METRICS = [
    ("cash", True, "final cash"),
    ("restow", False, "restowed containers"),
    ("rolled", False, "rolled containers"),
    ("utilisation", True, "mean slot utilisation"),
]


def analyse(df, metric, higher_is_better, label):
    wide = df.pivot(index="seed", columns="agent", values=metric)
    agents = list(wide.columns)
    data = wide.values
    n, k = data.shape

    if k < 2:
        print(f"skipping {metric}: need at least 2 agents")
        return
    if k not in Q05:
        print(f"skipping {metric}: no tabulated q_alpha for k={k}")
        return

    chi2, p = stats.friedmanchisquare(*[data[:, i] for i in range(k)])
    kendall_w = chi2 / (n * (k - 1))

    sign = -1 if higher_is_better else 1
    ranks = np.apply_along_axis(lambda r: stats.rankdata(sign * r), 1, data)
    mean_ranks = ranks.mean(axis=0)
    cd = Q05[k] * math.sqrt(k * (k + 1) / (6.0 * n))

    concordance = "strong" if kendall_w > .5 else "moderate" if kendall_w > .3 else "weak"
    fmt_p = f"{p:.3e}" if p < 1e-4 else f"{p:.5f}"

    print("\n" + "=" * 92)
    print(f"{label.upper()}  ({'higher' if higher_is_better else 'lower'} is better)"
          f"   n={n} blocks, k={k} agents")
    print("=" * 92)
    print(f"Friedman chi2 = {chi2:.2f}, df = {k - 1}, p = {fmt_p}")
    print(f"Kendall's W   = {kendall_w:.3f} ({concordance} concordance)")
    print(f"Nemenyi CD    = {cd:.3f} at alpha = 0.05\n")

    order = np.argsort(mean_ranks)
    scale = 1e6 if metric in ("cash", "revenue") else 1
    unit = " (jt)" if scale > 1 else ""
    print(f"  {'agent':<20}{'mean rank':>11}{'median' + unit:>14}{'mean' + unit:>14}")
    for i in order:
        print(f"  {agents[i]:<20}{mean_ranks[i]:>11.3f}"
              f"{np.median(data[:, i]) / scale:>14.2f}{data[:, i].mean() / scale:>14.2f}")

    print("\n  pairwise rank differences ('*' = significant at alpha = 0.05)")
    print(f"  {'':<20}" + "".join(agents[j][:10].rjust(11) for j in order))
    for i in order:
        cells = []
        for j in order:
            if i == j:
                cells.append("-".rjust(11))
            else:
                d = abs(mean_ranks[i] - mean_ranks[j])
                cells.append(f"{d:.2f}{'*' if d > cd else ' '}".rjust(11))
        print(f"  {agents[i][:20]:<20}" + "".join(cells))

    tied = [(agents[i], agents[j])
            for i in range(k) for j in range(i + 1, k)
            if abs(mean_ranks[i] - mean_ranks[j]) <= cd]
    print("\n  not separated: " +
          (", ".join(f"{a} ~ {b}" for a, b in tied) if tied else "none, all pairs separated"))


def sample_size_check(df, metric="cash"):
    wide = df.pivot(index="seed", columns="agent", values=metric)
    print("\n" + "=" * 92)
    print(f"SAMPLE-SIZE CHECK on '{metric}' — how many blocks are actually needed?")
    print("=" * 92)
    for n in [10, 20, 30, 50, 100, 200, 300, 500]:
        if n > len(wide):
            break
        sub = wide.iloc[:n]
        _, p = stats.friedmanchisquare(*[sub[c].values for c in sub.columns])
        print(f"  n={n:>4}   Friedman p = {f'{p:.3e}' if p < 1e-4 else f'{p:.5f}'}")


def main():
    default = Path(__file__).resolve().parent.parent / "results" / "pilot_results.csv"
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else default
    if not path.exists():
        sys.exit(f"no results at {path}\nrun:  node research/run-pilot.mjs")

    df = pd.read_csv(path)
    print(f"loaded {len(df)} rows from {path.name}: "
          f"{df['agent'].nunique()} agents x {df['seed'].nunique()} seeds")

    for metric, higher, label in METRICS:
        if metric in df.columns:
            analyse(df, metric, higher, label)

    sample_size_check(df)
    print()


if __name__ == "__main__":
    main()
