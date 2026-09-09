"""Post-training pipeline: budget selection, then scoring, in one command.

    python -m research.rl.finalize --dry-run     # show the plan, run nothing
    python -m research.rl.finalize               # TEST only
    python -m research.rl.finalize --sens        # TEST + the V5 sensitivity sweep

WHAT IT AUTOMATES, AND WHY IT IS WORTH AUTOMATING. Between "training finished"
and "numbers for Bab 4" sits a chain of fiddly steps that are easy to get subtly
wrong by hand:

  1. average each algorithm's learning curve over its training seeds
  2. apply the A-16 rule to pick that algorithm's budget from the curve
  3. find, for every seed, the checkpoint saved at that budget
  4. score those checkpoints through run_episode on TEST (and SENS)

Step 3 is the one that matters. Reporting `best_model.zip` instead would report
the maximum over ~100 noisy evaluations - a lucky draw as much as a good policy -
and it would contradict the budget the rule just selected. Picking the wrong
checkpoint by hand produces a number that looks entirely reasonable and is wrong.

WHAT IT REFUSES TO DO. If the runs do not share one budget, or an algorithm's
curve is still climbing at the end of training, it says so and stops rather than
quietly finalising a truncation. A budget that was not chosen is not a result.
"""

import argparse
import json
import re
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
RL_DIR = ROOT / "results" / "rl"

sys.path.insert(0, str(ROOT / "analysis"))
from figures import select_budget  # noqa: E402

from .evaluate import main as evaluate_main  # noqa: E402

AGENT_NAMES = {"ppo": "a5Ppo", "dqn": "a5Dqn", "a2c": "a5A2c"}

CHECKPOINT_RE = re.compile(r"step_(\d+)_steps\.zip$")


def discover_runs():
    """{algo: [(seed_dir, run_json)]}, sorted by seed."""
    runs = {}
    for d in sorted(RL_DIR.glob("*_seed*")):
        f = d / "run.json"
        if not f.exists():
            print("  ! %s has no run.json - still training or crashed" % d.name)
            continue
        runs.setdefault(d.name.split("_")[0], []).append((d, json.loads(f.read_text())))
    return runs


def find_checkpoint(run_dir, budget):
    """Smallest saved checkpoint at or beyond `budget`.

    Rounding up rather than to the nearest keeps the reported policy at least as
    trained as the budget claims it is.
    """
    available = []
    for f in (run_dir / "checkpoints").glob("step_*_steps.zip"):
        m = CHECKPOINT_RE.search(f.name)
        if m:
            available.append((int(m.group(1)), f))
    if not available:
        return None, None
    available.sort()
    for steps, path in available:
        if steps >= budget:
            return steps, path
    return available[-1]


def plan(runs, tolerance):
    """Decide, per algorithm, which checkpoints get scored."""
    decisions = {}
    for algo, entries in sorted(runs.items()):
        budgets = {d["timesteps"] for _, d in entries}
        lengths = [len(d.get("eval_history") or []) for _, d in entries]

        if len(budgets) > 1:
            decisions[algo] = {"error":
                               "seed dilatih pada anggaran berbeda: %s"
                               % sorted(budgets)}
            continue
        if min(lengths) == 0:
            decisions[algo] = {"error": "ada run tanpa eval_history"}
            continue

        n = min(lengths)
        steps = np.array([h["timesteps"]
                          for h in entries[0][1]["eval_history"][:n]])
        curves = np.array([[h["mean_profit"] for h in d["eval_history"][:n]]
                           for _, d in entries])
        mean = curves.mean(axis=0)

        chosen, best, converged = select_budget(steps, mean, tol=tolerance)

        picks = []
        for run_dir, _ in entries:
            got, path = find_checkpoint(run_dir, chosen)
            picks.append((run_dir.name, got, path))

        decisions[algo] = {
            "seeds": len(entries),
            "trained_to": int(steps[-1]),
            "rule_budget": chosen,
            "best_profit": best,
            "converged": converged,
            "picks": picks,
            "missing": [name for name, _, path in picks if path is None],
        }
    return decisions


def report(decisions, tolerance):
    print("\n" + "=" * 92)
    print("PEMILIHAN ANGGARAN (aturan A-16, toleransi %.0f%%)" % (tolerance * 100))
    print("=" * 92)
    blocking = []
    for algo, d in decisions.items():
        if "error" in d:
            print("  %-6s GAGAL: %s" % (algo, d["error"]))
            blocking.append(algo)
            continue

        reported = max((got for _, got, p in d["picks"] if p), default=None)
        print("\n  %s  (%d seed, dilatih s/d %s)"
              % (algo, d["seeds"], f'{d["trained_to"]:,d}'))
        print("    aturan memilih   : %s langkah" % f'{d["rule_budget"]:,d}')
        print("    puncak VAL       : %.1f jt" % (d["best_profit"] / 1e6))
        if not d["converged"]:
            print("    STATUS           : BELUM KONVERGEN - kurva masih menanjak di")
            print("                       ujung, jadi angka di atas adalah batas bawah")
            print("                       dan bukan anggaran terpilih. Perpanjang")
            print("                       training algoritma ini sebelum dilaporkan.")
            blocking.append(algo)
        elif d["missing"]:
            print("    STATUS           : checkpoint tidak ada untuk %s"
                  % ", ".join(d["missing"]))
            blocking.append(algo)
        else:
            print("    checkpoint dipakai:")
            for name, got, path in d["picks"]:
                note = "" if got == d["rule_budget"] else "  (dibulatkan ke atas)"
                print("      %-12s %s langkah%s" % (name, f"{got:,d}", note))
            if reported != d["rule_budget"]:
                print("    dilaporkan pada  : %s langkah (checkpoint terdekat)"
                      % f"{reported:,d}")
    return blocking


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true",
                        help="print the plan and stop, running no evaluation")
    parser.add_argument("--sens", action="store_true",
                        help="also run the V5 sweep (24 strata x 100 seeds per "
                             "training seed - roughly 100 minutes)")
    parser.add_argument("--test-seeds", type=int, default=300)
    parser.add_argument("--sens-seeds", type=int, default=100)
    parser.add_argument("--tolerance", type=float, default=0.01)
    parser.add_argument("--comparator-plan", default="REF",
                        help="lineup slot for DQN and A2C. REF reports them "
                             "alongside the ranking like the shipped-bot "
                             "references; A5 puts them inside it. PPO is always A5.")
    parser.add_argument("--force", action="store_true",
                        help="score even algorithms whose curve has not converged. "
                             "The budget is then a truncation, and Bab 4 has to say so.")
    args = parser.parse_args(argv)

    print("membaca %s" % RL_DIR)
    runs = discover_runs()
    if not runs:
        print("tidak ada run yang selesai.")
        return 2

    decisions = plan(runs, args.tolerance)
    blocking = report(decisions, args.tolerance)

    if blocking and not args.force:
        print("\n" + "=" * 92)
        print("BERHENTI: %s belum siap dilaporkan." % ", ".join(sorted(set(blocking))))
        print("Perpanjang trainingnya, atau jalankan ulang dengan --force dan")
        print("nyatakan di Bab 4 bahwa anggarannya adalah pemotongan.")
        return 1

    if args.dry_run:
        print("\n(dry run - tidak ada evaluasi yang dijalankan)")
        return 0

    for algo, d in decisions.items():
        if "error" in d or (algo in blocking and not args.force):
            continue
        models = [str(p) for _, _, p in d["picks"] if p]
        if not models:
            continue
        name = AGENT_NAMES.get(algo, "a5" + algo.capitalize())
        slot = "A5" if algo == "ppo" else args.comparator_plan

        for mode, seeds in ([("test", args.test_seeds)]
                            + ([("sens", args.sens_seeds)] if args.sens else [])):
            print("\n" + "-" * 92)
            print("evaluasi %s  mode=%s  %d seed  x %d checkpoint"
                  % (name, mode, seeds, len(models)))
            print("-" * 92)
            rc = evaluate_main(["--algo", algo, "--agent-name", name,
                                "--plan", slot, "--mode", mode,
                                "--seeds", str(seeds), "--model"] + models)
            if rc:
                print("evaluasi gagal untuk %s (%s)" % (name, mode))
                return rc

    print("\n" + "=" * 92)
    print("SELESAI. Langkah berikutnya:")
    print("  python research/analysis/stats.py")
    print("  python research/analysis/figures.py")
    print("=" * 92)
    return 0


if __name__ == "__main__":
    sys.exit(main())
