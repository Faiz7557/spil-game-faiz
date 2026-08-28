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

SAMPLE SIZE IS FIXED A PRIORI. N = 300 was chosen before any agent was run, from
the rule "CD < 0.5 rank units" - half a rank position - for the full agent
table. The retrospective curve at the bottom is a robustness display, not the
justification; do not present it as one.

MULTIPLICITY. Final cash is the PRIMARY endpoint and is tested at alpha = 0.05
uncorrected. Restow, rolled and utilisation form a SECONDARY family: their
Friedman p-values are adjusted by Holm-Bonferroni, so that running four tests
does not inflate the chance of finding something somewhere. This split is
declared in Bab 3 before the results are seen, not chosen afterwards.

Four things are reported beyond the significance test, because a rank on its own
does not tell a reader whether an agent is any GOOD, nor whether the gap matters:

  realisation ratio  how much of the provable upper bound the agent captured
                     (needs results/upper_bound.csv - see upper_bound.py)
  paired effect size median per-block difference with a bootstrap CI
  stability          spread across seeds, and how often the agent collapses
  decision time      wall-clock per port-call, the price of the ranking

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

START_CASH = 150_000_000

# q_alpha for alpha = 0.05, infinite degrees of freedom, k treatments
Q05 = {2: 1.960, 3: 2.343, 4: 2.569, 5: 2.728,
       6: 2.850, 7: 2.949, 8: 3.031, 9: 3.102, 10: 3.164}

PRIMARY = ("cash", True, "final cash")
SECONDARY = [
    ("restow", False, "restowed containers"),
    ("rolled", False, "rolled containers"),
    ("utilisation", True, "mean slot utilisation"),
]


def nemenyi_cd(k, n):
    return Q05[k] * math.sqrt(k * (k + 1) / (6.0 * n))


def holm(pvalues):
    """Holm-Bonferroni step-down adjusted p-values, returned in input order."""
    m = len(pvalues)
    order = sorted(range(m), key=lambda i: pvalues[i])
    adj = [0.0] * m
    running = 0.0
    for rank, i in enumerate(order):
        running = max(running, (m - rank) * pvalues[i])
        adj[i] = min(1.0, running)
    return adj


def bootstrap_ci(values, stat=np.median, B=5000, alpha=0.05, seed=20260828):
    """Percentile bootstrap CI. Blocks are the resampling unit throughout."""
    rng = np.random.default_rng(seed)
    values = np.asarray(values, dtype=float)
    n = len(values)
    if n < 2:
        return (float("nan"), float("nan"))
    draws = rng.integers(0, n, size=(B, n))
    reps = np.array([stat(values[d]) for d in draws])
    return (float(np.percentile(reps, 100 * alpha / 2)),
            float(np.percentile(reps, 100 * (1 - alpha / 2))))


def fmt_p(p):
    return "%.3e" % p if p < 1e-4 else "%.5f" % p


def analyse(df, metric, higher_is_better, label, role=""):
    """Friedman + Kendall W + Nemenyi for one dependent variable.

    Returns the raw Friedman p-value so the caller can apply Holm across the
    secondary family, or None when the metric could not be tested.
    """
    wide = df.pivot(index="seed", columns="agent", values=metric)
    agents = list(wide.columns)
    data = wide.values
    n, k = data.shape

    if k < 2:
        print("skipping %s: need at least 2 agents" % metric)
        return None
    if k not in Q05:
        print("skipping %s: no tabulated q_alpha for k=%d" % (metric, k))
        return None

    chi2, p = stats.friedmanchisquare(*[data[:, i] for i in range(k)])
    kendall_w = chi2 / (n * (k - 1))

    sign = -1 if higher_is_better else 1
    ranks = np.apply_along_axis(lambda r: stats.rankdata(sign * r), 1, data)
    mean_ranks = ranks.mean(axis=0)
    sd_ranks = ranks.std(axis=0)
    cd = nemenyi_cd(k, n)

    concordance = "strong" if kendall_w > .5 else "moderate" if kendall_w > .3 else "weak"

    print("\n" + "=" * 96)
    print("%s  (%s is better)   n=%d blocks, k=%d agents%s"
          % (label.upper(), "higher" if higher_is_better else "lower", n, k,
             ("   [" + role + "]") if role else ""))
    print("=" * 96)
    print("Friedman chi2 = %.2f, df = %d, p = %s" % (chi2, k - 1, fmt_p(p)))
    print("Kendall's W   = %.3f (%s concordance)" % (kendall_w, concordance))
    print("Nemenyi CD    = %.3f at alpha = 0.05\n" % cd)

    order = np.argsort(mean_ranks)
    scale = 1e6 if metric in ("cash", "revenue") else 1
    unit = " (jt)" if scale > 1 else ""
    print("  %-20s%11s%9s%14s%14s" % ("agent", "mean rank", "sd rank",
                                      "median" + unit, "mean" + unit))
    for i in order:
        print("  %-20s%11.3f%9.3f%14.2f%14.2f"
              % (agents[i], mean_ranks[i], sd_ranks[i],
                 np.median(data[:, i]) / scale, data[:, i].mean() / scale))

    print("\n  pairwise rank differences ('*' = significant at alpha = 0.05)")
    print("  %-20s" % "" + "".join(agents[j][:10].rjust(11) for j in order))
    for i in order:
        cells = []
        for j in order:
            if i == j:
                cells.append("-".rjust(11))
            else:
                d = abs(mean_ranks[i] - mean_ranks[j])
                cells.append(("%.2f%s" % (d, "*" if d > cd else " ")).rjust(11))
        print("  %-20s" % agents[i][:20] + "".join(cells))

    tied = [(agents[i], agents[j])
            for i in range(k) for j in range(i + 1, k)
            if abs(mean_ranks[i] - mean_ranks[j]) <= cd]
    print("\n  not separated: " +
          (", ".join("%s ~ %s" % (a, b) for a, b in tied) if tied else "none, all pairs separated"))
    return p


def pairwise_effect(df, metric="cash", scale=1e6):
    """Practical significance: per-block differences with a bootstrap CI.

    A Nemenyi star says two agents are distinguishable. It does not say the gap
    matters. Because the design is blocked, the two agents met the same
    scenarios, so their per-seed difference is a paired quantity and its median
    is the honest effect size.
    """
    wide = df.pivot(index="seed", columns="agent", values=metric)
    agents = list(wide.columns)
    print("\n" + "=" * 96)
    print("PAIRED EFFECT SIZE on '%s'   median per-block difference, 95%% bootstrap CI"
          % metric)
    print("=" * 96)
    print("  %-20s%-20s%12s%26s%8s" % ("agent A", "agent B", "median A-B", "95% CI", "A>B"))
    for i in range(len(agents)):
        for j in range(i + 1, len(agents)):
            d = (wide[agents[i]] - wide[agents[j]]).values
            lo, hi = bootstrap_ci(d)
            frac = float((d > 0).mean())
            note = "" if (lo > 0 or hi < 0) else "   (CI spans 0)"
            print("  %-20s%-20s%12.1f%13.1f ..%-11.1f%7.0f%%%s"
                  % (agents[i], agents[j], np.median(d) / scale,
                     lo / scale, hi / scale, frac * 100, note))
    print("\n  'A>B' is the share of blocks A won outright - a distribution-free read on")
    print("  how often the ranking actually holds, block by block.")


def realisation(df, results_dir):
    """How much of the provable upper bound did each agent actually capture?"""
    ub_path = results_dir / "upper_bound.csv"
    if not ub_path.exists():
        print("\n(no upper_bound.csv - run `node research/dump-scenarios.mjs` then "
              "`python upper_bound.py` to get realisation ratios)")
        return

    ub = pd.read_csv(ub_path)
    merged = df.merge(ub, on="seed", how="inner")
    if merged.empty:
        print("\n(upper_bound.csv covers no seed in this result set)")
        return

    # Ratios are computed on PROFIT, not on cash: starting capital is handed to
    # every agent for free and would flatter all of them equally.
    merged["ratio"] = ((merged["cash"] - START_CASH)
                       / (merged["ub_cash"] - START_CASH))

    print("\n" + "=" * 96)
    print("REALISATION RATIO vs the provable upper bound   (%d seeds covered)"
          % merged["seed"].nunique())
    print("=" * 96)
    print("  the bound relaxes stacking geometry, restow cost, order integrity and")
    print("  foresight, so it is deliberately loose - read it as a ceiling, not a target")
    print("\n  %-20s%10s%20s%10s%10s" % ("agent", "median", "95% CI on median", "mean", "p05"))
    grp = merged.groupby("agent")["ratio"]
    for agent, r in sorted(grp, key=lambda kv: -kv[1].median()):
        lo, hi = bootstrap_ci(r.values)
        ci = "%.1f%% .. %.1f%%" % (lo * 100, hi * 100)
        print("  %-20s%9.1f%%%20s%9.1f%%%9.1f%%"
              % (agent, r.median() * 100, ci,
                 r.mean() * 100, np.percentile(r, 5) * 100))


def stability_and_cost(df):
    """Spread across seeds and the compute each agent spent to get there."""
    print("\n" + "=" * 96)
    print("STABILITY ACROSS SEEDS AND DECISION COST")
    print("=" * 96)
    print("  CV  = sd/mean of final cash; p05 = 5th-percentile cash (the bad weeks)")
    print("  sd(algo) = the agent's own noise on a fixed scenario, 0 if deterministic")
    print("  ms/call is per port-call, single-threaded, same machine for every agent\n")
    print("  %-20s%11s%8s%11s%11s%11s%10s"
          % ("agent", "mean (jt)", "CV", "p05 (jt)", "IQR (jt)", "sd(algo)", "ms/call"))

    has_ms = "mean_decision_ms" in df.columns
    has_within = "cash_sd_within" in df.columns
    rows = []
    for agent, g in df.groupby("agent"):
        cash = g["cash"].values
        rows.append((
            agent, cash.mean() / 1e6, cash.std() / cash.mean(),
            np.percentile(cash, 5) / 1e6,
            (np.percentile(cash, 75) - np.percentile(cash, 25)) / 1e6,
            (g["cash_sd_within"].mean() / 1e6) if has_within else float("nan"),
            g["mean_decision_ms"].mean() if has_ms else float("nan")
        ))
    for r in sorted(rows, key=lambda x: -x[1]):
        print("  %-20s%11.1f%8.3f%11.1f%11.1f%11.1f%10.3f" % r)


def sample_size_curve(df, metric="cash"):
    wide = df.pivot(index="seed", columns="agent", values=metric)
    print("\n" + "=" * 96)
    print("ROBUSTNESS DISPLAY - Friedman p and Nemenyi CD as n grows")
    print("=" * 96)
    print("  (n was fixed at 300 a priori from the CD rule; this is not the justification)")
    k = wide.shape[1]
    for n in [10, 20, 30, 50, 100, 200, 300, 500]:
        if n > len(wide):
            break
        sub = wide.iloc[:n]
        _, p = stats.friedmanchisquare(*[sub[c].values for c in sub.columns])
        print("  n=%4d   Friedman p = %-12s CD = %.3f" % (n, fmt_p(p), nemenyi_cd(k, n)))


def run_family(df, results_dir, banner):
    """One complete analysis: primary endpoint, then the Holm-adjusted family."""
    print("\n\n" + banner)
    p_primary = analyse(df, *PRIMARY, role="PRIMARY endpoint, uncorrected")

    raw = []
    for metric, higher, label in SECONDARY:
        if metric in df.columns:
            p = analyse(df, metric, higher, label, role="secondary, Holm-adjusted")
            raw.append((metric, label, p))

    usable = [(m, l, p) for m, l, p in raw if p is not None]
    if usable:
        adj = holm([p for _, _, p in usable])
        print("\n" + "=" * 96)
        print("MULTIPLICITY CONTROL - Holm-Bonferroni over the secondary family")
        print("=" * 96)
        print("  primary endpoint 'final cash' is reported uncorrected: p = %s\n"
              % (fmt_p(p_primary) if p_primary is not None else "n/a"))
        print("  %-26s%16s%16s%10s" % ("secondary metric", "raw p", "Holm p", "sig."))
        for (metric, label, p), a in zip(usable, adj):
            print("  %-26s%16s%16s%10s"
                  % (label, fmt_p(p), fmt_p(a), "yes" if a < 0.05 else "no"))

    pairwise_effect(df)
    realisation(df, results_dir)
    stability_and_cost(df)


def main():
    results_dir = Path(__file__).resolve().parent.parent / "results"
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else results_dir / "pilot_results.csv"
    if not path.exists():
        sys.exit("no results at %s\nrun:  node research/run-pilot.mjs" % path)

    df = pd.read_csv(path)
    print("loaded %d rows from %s: %d agents x %d seeds"
          % (len(df), path.name, df["agent"].nunique(), df["seed"].nunique()))
    if "replicates" in df.columns:
        reps = df.groupby("agent")["replicates"].max()
        stoch = reps[reps > 1]
        if len(stoch):
            print("stochastic agents averaged over repetitions: "
                  + ", ".join("%s x%d" % (a, r) for a, r in stoch.items()))

    # PRIMARY ANALYSIS - only the agents that are actually being compared.
    # The shipped bots are diagnostics; leaving them in would shift every mean
    # rank and make the A1..A5 table answer a question nobody asked.
    ran_plan = False
    if "plan" in df.columns:
        plan_df = df[df["plan"].astype(str).str.startswith("A")]
        if plan_df["agent"].nunique() >= 2:
            run_family(plan_df, results_dir,
                       "##### PRIMARY: thesis line-up only (%s)"
                       % ", ".join(sorted(plan_df["agent"].unique())))
            ran_plan = True

    run_family(df, results_dir,
               "##### SECONDARY: full table including the shipped-bot references"
               if ran_plan else "##### FULL TABLE")
    sample_size_curve(df)
    print()


if __name__ == "__main__":
    main()
