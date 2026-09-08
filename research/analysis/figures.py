"""Figures for Bab 4.

    python research/analysis/figures.py

Writes 300 dpi PNG (for pasting into Word) and SVG (vector, for print) into
research/figures/, one pair per figure, prefixed `bab4-`.

Every figure is generated from the same tables `stats.py` analyses - it imports
`load_results` and `nemenyi_cd` from there rather than re-deriving them, so a
figure can never disagree with the number printed next to it in the text.

Figures that need data which is not present yet are skipped with a message
rather than drawn from partial data.
"""

import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.patches import Patch
from scipy import stats as sstats

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats import START_CASH, load_results, nemenyi_cd  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RESULTS = ROOT / "results"
FIGURES = ROOT / "figures"
RL = RESULTS / "rl"

JT = 1e6  # rupiah -> juta

LABELS = {
    "random": "A1 Acak",
    "ruleSmart": "A2 Berbasis aturan",
    "greedy": "A3 Greedy",
    "annealing": "A4 Metaheuristik",
    "a5Ppo": "A5 DRL (MaskablePPO)",
    "a5Dqn": "DQN (masked)",
    "a5A2c": "A2C (masked)",
    "committedOnly": "Ref: hanya Committed",
    "greedyAcceptAll": "Ref: bot GREEDY",
    "balanced": "Ref: bot BALANCED",
}

PALETTE = {
    "random": "#9e9e9e",
    "ruleSmart": "#e07b39",
    "greedy": "#2e86ab",
    "annealing": "#7b4fa8",
    "a5Ppo": "#2a9d5c",
    "a5Dqn": "#c0392b",
    "a5A2c": "#d4a017",
    "committedOnly": "#b0bec5",
    "greedyAcceptAll": "#bcaaa4",
    "balanced": "#a1887f",
}

ALGO_STYLE = {
    "ppo": ("#2a9d5c", "MaskablePPO"),
    "dqn": ("#c0392b", "DQN (masked)"),
    "a2c": ("#d4a017", "A2C (masked)"),
}

RANKED = ["random", "ruleSmart", "greedy", "annealing", "a5Ppo", "a5Dqn", "a5A2c"]


def label(agent):
    return LABELS.get(agent, agent)


def colour(agent):
    return PALETTE.get(agent, "#607d8b")


def style_axes(ax, grid_axis="y"):
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(True, axis=grid_axis, color="#e0e0e0", linewidth=0.7, zorder=0)
    ax.set_axisbelow(True)


def save(fig, name):
    FIGURES.mkdir(parents=True, exist_ok=True)
    png, svg = FIGURES / (name + ".png"), FIGURES / (name + ".svg")
    fig.savefig(png, dpi=300, facecolor="white", bbox_inches="tight", pad_inches=0.04)
    fig.savefig(svg, facecolor="white", bbox_inches="tight", pad_inches=0.04)
    plt.close(fig)
    print("  wrote %s (.png + .svg)" % name)


# ---------------------------------------------------------------------------
# 1. training history
# ---------------------------------------------------------------------------

def select_budget(steps, curve, tol=0.01):
    """The A-16 rule, applied to a learning curve instead of an iteration sweep.

    A4's budget was chosen as "the smallest budget within 1% of the best observed
    median" over a 50 -> 3200 iteration sweep, because a constant in the source
    is not a controlled variable while a curve with a stated selection rule is.
    The same reasoning applies to a timestep budget, and the evaluation history
    of a single long run already IS the sweep - one point every eval_freq steps.

    Returns (selected_steps, best_value, converged). When `converged` is False
    the rule is selecting a truncation rather than a plateau, and the budget has
    to be reported as a lower bound rather than as a choice.

    Convergence is judged by whether the last quarter of training still improved
    on the first three quarters by more than `tol` - NOT by whether the curve
    peaks at its final point. Averaging over seeds smooths the noise enough that
    the mean's argmax lands just short of the end by luck, which would certify a
    still-climbing curve as converged.
    """
    curve = np.asarray(curve, dtype=float)
    steps = np.asarray(steps)
    best = curve.max()
    threshold = best * (1.0 - tol)
    reached = np.flatnonzero(curve >= threshold)
    selected = int(steps[reached[0]]) if len(reached) else int(steps[-1])

    q3 = max(1, int(len(curve) * 0.75))
    early = curve[:q3].max()
    late_gain = (curve[q3:].max() - early) / abs(early) if q3 < len(curve) else 0.0
    return selected, float(best), late_gain <= tol


def _algo_curves():
    """Mean learning curve per algorithm, averaged over training seeds."""
    runs = {}
    for d in sorted(RL.glob("*_seed*")):
        f = d / "run.json"
        if not f.exists():
            continue
        hist = json.loads(f.read_text()).get("eval_history") or []
        if hist:
            runs.setdefault(d.name.split("_")[0], []).append(hist)

    out = {}
    for algo, histories in runs.items():
        length = min(len(h) for h in histories)
        steps = np.array([h["timesteps"] for h in histories[0][:length]])
        curves = np.array([[h["mean_profit"] for h in hist[:length]]
                           for hist in histories])
        out[algo] = (steps, curves)
    return out


def fig_learning_curves():
    """VAL profit against training budget, per algorithm, band over seeds.

    This is the figure that justifies - or refuses to justify - the timestep
    budget. A curve still climbing at the right edge means the run was stopped
    early, and a comparison against a converged competitor is then partly a
    comparison of budgets.
    """
    curves_by_algo = _algo_curves()
    if not curves_by_algo:
        print("  skip kurva-belajar: no run.json under results/rl/")
        return

    fig, ax = plt.subplots(figsize=(7.6, 4.6))
    for algo, (steps, curves) in sorted(curves_by_algo.items()):
        col, name = ALGO_STYLE.get(algo, ("#607d8b", algo))
        mean = curves.mean(axis=0) / JT
        ax.fill_between(steps / 1e6, curves.min(axis=0) / JT, curves.max(axis=0) / JT,
                        color=col, alpha=0.16, linewidth=0, zorder=2)
        ax.plot(steps / 1e6, mean, color=col, linewidth=2.0, zorder=3,
                label="%s  (%d seed)" % (name, curves.shape[0]))

        chosen, best, converged = select_budget(steps, mean)
        ax.axvline(chosen / 1e6, color=col, linestyle="--", linewidth=1.2,
                   alpha=0.75, zorder=2)
        ax.plot(chosen / 1e6, best * (0.99), "v", color=col, markersize=7,
                markeredgecolor="white", markeredgewidth=0.9, zorder=5)
        if not converged:
            ax.annotate("belum konvergen", (steps[-1] / 1e6, mean[-1]),
                        textcoords="offset points", xytext=(-6, 8),
                        ha="right", fontsize=8, color=col)

    style_axes(ax)
    ax.set_xlabel("Langkah pelatihan (juta)")
    ax.set_ylabel("Pendapatan bersih pada VAL (juta rupiah)")
    ax.set_title("Riwayat pelatihan dan pemilihan anggaran langkah\n"
                 "garis = rerata antar-seed, pita = rentang min-maks;\n"
                 "garis putus = anggaran terpilih (terkecil yang berada dalam 1% "
                 "dari median terbaik, aturan A-16)",
                 fontsize=10, loc="left")
    ax.legend(frameon=False, fontsize=9, loc="lower right")
    save(fig, "bab4-kurva-belajar")


def fig_budget_table():
    """The A-16 selection, as a table to quote in Bab 3 next to A4's 800 iterations."""
    curves_by_algo = _algo_curves()
    if not curves_by_algo:
        return

    print("\n  PEMILIHAN ANGGARAN LANGKAH (aturan A-16: anggaran terkecil yang")
    print("  berada dalam 1% dari median terbaik yang teramati)\n")
    print("  %-10s %5s %14s %16s %12s   %s"
          % ("algoritma", "seed", "dilatih s/d", "anggaran dipilih", "puncak (jt)",
             "status"))
    for algo, (steps, curves) in sorted(curves_by_algo.items()):
        mean = curves.mean(axis=0) / JT
        chosen, best, converged = select_budget(steps, mean)
        status = ("plateau tercapai" if converged
                  else "BELUM konvergen - batas bawah, bukan pilihan")
        print("  %-10s %5d %14s %16s %12.1f   %s"
              % (algo, curves.shape[0], f"{int(steps[-1]):,d}", f"{chosen:,d}",
                 best, status))

    print("\n  per seed:")
    print("  %-14s%16s%14s%16s" % ("run", "puncak@langkah", "puncak (jt)",
                                   "gain 25% akhir"))
    for d in sorted(RL.glob("*_seed*")):
        f = d / "run.json"
        if not f.exists():
            continue
        hist = json.loads(f.read_text()).get("eval_history") or []
        if not hist:
            continue
        prof = np.array([h["mean_profit"] for h in hist])
        steps = np.array([h["timesteps"] for h in hist])
        q3 = int(len(prof) * 0.75)
        gain = (prof[q3:].max() - prof[:q3].max()) / prof[:q3].max() * 100
        flag = "  <- masih naik" if gain > 1.0 else ""
        print(f"  {d.name:<14}{int(steps[int(prof.argmax())]):>16,d}"
              f"{prof.max() / JT:>14.1f}{gain:>15.2f}%{flag}")


# ---------------------------------------------------------------------------
# 2. critical difference diagram
# ---------------------------------------------------------------------------

def _ranks(df, metric, higher_is_better=True):
    wide = df.pivot(index="seed", columns="agent", values=metric)
    agents = list(wide.columns)
    data = wide.values
    n, k = data.shape
    sign = -1 if higher_is_better else 1
    ranks = np.apply_along_axis(lambda r: sstats.rankdata(sign * r), 1, data)
    return agents, ranks.mean(axis=0), n, k


def fig_cd_diagram(df, metric="profit", higher=True,
                   title="Pendapatan bersih", name="bab4-diagram-cd"):
    """Demsar's critical difference diagram.

    Agents joined by a bar are NOT distinguishable at alpha = 0.05. That bar is
    the whole point of the figure: it shows where the ranking stops being a
    ranking and becomes a tie.
    """
    agents, mean_ranks, n, k = _ranks(df, metric, higher)
    if k not in range(2, 11):
        print("  skip %s: k=%d outside the tabulated range" % (name, k))
        return
    cd = nemenyi_cd(k, n)

    order = np.argsort(mean_ranks)
    agents = [agents[i] for i in order]
    ranks = mean_ranks[order]

    fig, ax = plt.subplots(figsize=(7.6, 2.6 + 0.34 * k))
    lo, hi = 0.7, k + 0.3
    axis_y = 0.0
    ax.plot([lo, hi], [axis_y, axis_y], color="#37474f", linewidth=1.4, zorder=3)
    for tick in range(1, k + 1):
        ax.plot([tick, tick], [axis_y, axis_y + 0.09], color="#37474f",
                linewidth=1.1, zorder=3)
        ax.text(tick, axis_y + 0.15, str(tick), ha="center", va="bottom", fontsize=9)

    # Cliques first: they sit just under the axis, so the agent stems have to
    # start below them or the two collide.
    cliques = []
    for i in range(k):
        j = i
        while j + 1 < k and ranks[j + 1] - ranks[i] <= cd:
            j += 1
        if j > i and not any(a <= i and j <= b for a, b in cliques):
            cliques = [(a, b) for a, b in cliques if not (i <= a and b <= j)]
            cliques.append((i, j))

    for idx, (a, b) in enumerate(cliques):
        y = axis_y - 0.10 - 0.10 * idx
        # A tie can be 0.03 rank units wide; without padding the bar would be
        # invisible at exactly the moment it matters most.
        ax.plot([ranks[a] - 0.07, ranks[b] + 0.07], [y, y],
                color="#212121", linewidth=3.6, solid_capstyle="round", zorder=4)

    stem_top = axis_y - 0.10 - 0.10 * max(0, len(cliques) - 1) - 0.12
    half = (k + 1) / 2
    depths = []
    for i, (agent, r) in enumerate(zip(agents, ranks)):
        left = r <= half
        depth = stem_top - 0.30 * (i if left else (k - 1 - i))
        depths.append(depth)
        edge = lo - 0.02 if left else hi + 0.02
        ax.plot([r, r], [axis_y, depth], color=colour(agent), linewidth=1.6, zorder=3)
        ax.plot([r, edge], [depth, depth], color=colour(agent), linewidth=1.6, zorder=3)
        ax.text(edge + (-0.06 if left else 0.06), depth,
                "%s   (%.2f)" % (label(agent), r),
                ha="right" if left else "left", va="center", fontsize=9.5,
                color="#212121")

    cd_y = axis_y + 0.42
    ax.plot([lo + 0.05, lo + 0.05 + cd], [cd_y, cd_y], color="#c62828", linewidth=2.0)
    for x in (lo + 0.05, lo + 0.05 + cd):
        ax.plot([x, x], [cd_y - 0.05, cd_y + 0.05], color="#c62828", linewidth=2.0)
    ax.text(lo + 0.05 + cd / 2, cd_y + 0.08, "CD = %.3f" % cd,
            ha="center", va="bottom", fontsize=9.5, color="#c62828")

    ax.set_xlim(lo - 2.9, hi + 2.9)
    ax.set_ylim(min(depths) - 0.22, cd_y + 0.34)
    ax.axis("off")
    ax.set_title("%s - peringkat rerata Friedman dan uji lanjut Nemenyi\n"
                 "n = %d blok, k = %d agen; agen yang terhubung garis tebal "
                 "TIDAK terpisah pada alpha = 0,05" % (title, n, k),
                 fontsize=10.5, loc="left")
    save(fig, name)


# ---------------------------------------------------------------------------
# 3. distribution of the primary endpoint
# ---------------------------------------------------------------------------

def fig_profit_distribution(df):
    agents = [a for a in RANKED if a in set(df["agent"])]
    agents += [a for a in sorted(set(df["agent"])) if a not in agents]
    data = [df.loc[df["agent"] == a, "profit"].values / JT for a in agents]
    med = [np.median(d) for d in data]
    order = np.argsort(med)[::-1]
    agents = [agents[i] for i in order]
    data = [data[i] for i in order]

    fig, ax = plt.subplots(figsize=(7.6, 0.52 * len(agents) + 2.0))
    bp = ax.boxplot(data, vert=False, widths=0.62, patch_artist=True,
                    medianprops=dict(color="#212121", linewidth=1.6),
                    flierprops=dict(marker="o", markersize=2.6,
                                    markerfacecolor="#90a4ae",
                                    markeredgecolor="none", alpha=0.55),
                    whiskerprops=dict(color="#607d8b", linewidth=1.0),
                    capprops=dict(color="#607d8b", linewidth=1.0))
    for patch, agent in zip(bp["boxes"], agents):
        patch.set_facecolor(colour(agent))
        patch.set_alpha(0.55)
        patch.set_edgecolor(colour(agent))
    ax.set_yticklabels([label(a) for a in agents], fontsize=9.5)
    style_axes(ax, grid_axis="x")
    ax.set_xlabel("Pendapatan bersih (juta rupiah)")
    ax.set_title("Sebaran pendapatan bersih pada %d seed TEST, skenario nominal"
                 % df["seed"].nunique(), fontsize=10.5, loc="left")
    save(fig, "bab4-sebaran-pendapatan")


# ---------------------------------------------------------------------------
# 4. accuracy against compute
# ---------------------------------------------------------------------------

def fig_tradeoff(df):
    if "mean_decision_ms" not in df.columns:
        print("  skip tradeoff: no mean_decision_ms column")
        return
    fig, ax = plt.subplots(figsize=(7.2, 4.4))
    for agent, g in df.groupby("agent"):
        ms = g["mean_decision_ms"].mean()
        prof = g["profit"].median() / JT
        if ms <= 0:
            continue
        ax.scatter(ms, prof, s=95, color=colour(agent), zorder=3,
                   edgecolor="white", linewidth=1.2)
        ax.annotate(label(agent), (ms, prof), textcoords="offset points",
                    xytext=(9, 4), fontsize=9, color="#37474f")
    ax.set_xscale("log")
    style_axes(ax, grid_axis="both")
    ax.set_xlabel("Waktu keputusan rerata per port-call (ms, skala log)")
    ax.set_ylabel("Median pendapatan bersih (juta rupiah)")
    ax.set_title("Pertukaran akurasi terhadap komputasi\n"
                 "A5 berjalan di Python, A1-A4 di Node (ASUMSI A-13): "
                 "bandingkan ordenya, bukan rasionya",
                 fontsize=10.5, loc="left")
    save(fig, "bab4-tradeoff-waktu")


# ---------------------------------------------------------------------------
# 5. paired differences against the strongest baseline
# ---------------------------------------------------------------------------

def fig_paired_differences(df, focus="a5Ppo", against=("annealing", "greedy")):
    if focus not in set(df["agent"]):
        print("  skip selisih-berpasangan: %s not in results" % focus)
        return
    others = [a for a in against if a in set(df["agent"])]
    if not others:
        return

    fig, axes = plt.subplots(1, len(others), figsize=(4.1 * len(others), 3.9),
                             squeeze=False)
    wide = df.pivot(index="seed", columns="agent", values="profit")
    for ax, other in zip(axes[0], others):
        d = (wide[focus] - wide[other]).values / JT
        ax.hist(d, bins=34, color=colour(focus), alpha=0.72, zorder=3)
        ax.axvline(0, color="#37474f", linewidth=1.2, zorder=4)
        ax.axvline(np.median(d), color="#c62828", linewidth=1.8, zorder=5,
                   label="median %+.1f jt" % np.median(d))
        wins = (d > 0).mean() * 100
        style_axes(ax)
        ax.set_xlabel("selisih pendapatan bersih (juta)")
        ax.set_title("%s  -  %s\nmenang %.0f%% blok"
                     % (label(focus), label(other), wins), fontsize=10, loc="left")
        ax.legend(frameon=False, fontsize=8.5)
    axes[0][0].set_ylabel("jumlah seed")
    fig.suptitle("Selisih berpasangan per seed - nol berarti seri",
                 fontsize=10.5, x=0.005, ha="left")
    fig.tight_layout()
    save(fig, "bab4-selisih-berpasangan")


# ---------------------------------------------------------------------------
# 6. the secondary family
# ---------------------------------------------------------------------------

def fig_secondary(df):
    metrics = [("restow", "Jumlah restow", False),
               ("rolled", "Rolled container", False),
               ("utilisation", "Utilisasi slot", True)]
    metrics = [m for m in metrics if m[0] in df.columns]
    agents = [a for a in RANKED if a in set(df["agent"])]
    if not agents:
        return

    fig, axes = plt.subplots(1, len(metrics), figsize=(3.9 * len(metrics), 4.0))
    axes = np.atleast_1d(axes)
    for ax, (col, name, higher) in zip(axes, metrics):
        vals = [df.loc[df["agent"] == a, col].mean() for a in agents]
        ax.bar(range(len(agents)), vals,
               color=[colour(a) for a in agents], alpha=0.85, zorder=3)
        ax.set_xticks(range(len(agents)))
        ax.set_xticklabels([label(a).split(" ")[0] for a in agents], fontsize=9)
        style_axes(ax)
        ax.set_title("%s\n(%s makin baik)" % (name, "tinggi" if higher else "rendah"),
                     fontsize=10, loc="left")
    fig.suptitle("Keluarga metrik sekunder - rerata pada %d seed TEST"
                 % df["seed"].nunique(), fontsize=10.5, x=0.005, ha="left")
    fig.tight_layout()
    save(fig, "bab4-metrik-sekunder")


# ---------------------------------------------------------------------------
# 7. V5 regime sensitivity
# ---------------------------------------------------------------------------

def fig_sensitivity():
    path = RESULTS / "sensitivity_results.csv"
    if not path.exists():
        print("  skip sensitivitas: no sensitivity_results.csv")
        return
    sens = pd.read_csv(path)
    sens["profit"] = sens["cash"] - START_CASH

    cell = sens.groupby(["stratum", "seed", "agent"])["profit"].mean().reset_index()
    ranks = (cell.pivot_table(index=["stratum", "seed"], columns="agent",
                              values="profit")
             .rank(axis=1, ascending=False))
    mean_rank = ranks.groupby("stratum").mean()

    order = [a for a in RANKED if a in mean_rank.columns]
    mean_rank = mean_rank[order]

    fig, ax = plt.subplots(figsize=(1.35 * len(order) + 3.4,
                                    0.28 * len(mean_rank) + 2.2))
    im = ax.imshow(mean_rank.values, cmap="RdYlGn_r", aspect="auto",
                   vmin=1, vmax=len(order))
    ax.set_xticks(range(len(order)))
    ax.set_xticklabels([label(a) for a in order], rotation=28, ha="right", fontsize=9)
    ax.set_yticks(range(len(mean_rank)))
    ax.set_yticklabels(mean_rank.index, fontsize=7.4)
    for i in range(mean_rank.shape[0]):
        for j in range(mean_rank.shape[1]):
            ax.text(j, i, "%.1f" % mean_rank.values[i, j], ha="center", va="center",
                    fontsize=7.0, color="#212121")
    fig.colorbar(im, ax=ax, label="peringkat rerata (1 = terbaik)", shrink=0.82)
    ax.set_title("V5 - peringkat tiap agen di 24 strata\n"
                 "agen yang peringkatnya berubah antar strata bersifat "
                 "bergantung-rezim", fontsize=10.5, loc="left")
    fig.tight_layout()
    save(fig, "bab4-sensitivitas-strata")


def main():
    print("membaca hasil ...")
    df = load_results(RESULTS, verbose=True)
    ranked = df[df["plan"].astype(str).str.startswith("A")]

    print("\nmenulis gambar ke %s" % FIGURES)
    fig_learning_curves()
    fig_cd_diagram(ranked)
    fig_cd_diagram(ranked, metric="restow", higher=False,
                   title="Jumlah restow", name="bab4-diagram-cd-restow")
    fig_profit_distribution(df)
    fig_tradeoff(ranked)
    fig_paired_differences(ranked)
    fig_secondary(df)
    fig_sensitivity()
    fig_budget_table()
    print("\nselesai.")


if __name__ == "__main__":
    main()
