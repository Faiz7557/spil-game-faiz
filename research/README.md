# Research harness

Experiment code for the thesis *"Perbandingan Agen Deep Reinforcement Learning dan
Algoritma Heuristik-Metaheuristik untuk Perencanaan Muatan Kapal Petikemas"*.

This directory is **separate from the game**. It imports the game's engine but never
changes how the game behaves, so `client/` and `server/` run exactly as before.
Nothing here is reachable from the running application.

**Scope decision.** The thesis compares *agents*. The game is the source of the
domain and its parameters — tariffs, penalty table, bay plan, physics — not the
object of study. Nothing here claims anything about the game as a teaching tool.
See `docs/ASUMSI.md`, assumption A-1.

## Why a separate harness

The shipped game is a 4-player shared-grid competition. That formulation cannot
support a controlled comparison of algorithms, for three reasons:

1. **Shared grid.** All players stow into one vessel, so restow penalties cannot be
   attributed to a single agent's decisions.
2. **Two decision epochs.** `activePlayerIndex = currentPortIndex % players.length`
   means a player only acts when the vessel is berthed at its own branch — 2 of 8
   weeks. Too short to be a useful sequential decision process.
3. **Entangled outcomes.** An agent's measured performance depends on what the other
   three did.

The harness therefore uses a different formulation: **one carrier operates the vessel
across the whole circuit**, alone, on its own grid. Eight full decision epochs, no
interference, plus a three-week drain so no cargo is stranded by the horizon.

## Layout

```
research/
  src/
    circuit.mjs          the MDP: episode loop, drain phase, action mask, metrics
    agents.mjs           agent registry (A1..A4 + diagnostic references)
    strata.mjs           the 4 x 2 x 3 factorial design for V5
  verifyHarness.mjs      V2 invariants: action mask, objective, blocked design
  verify-provenance.mjs  V1: every parameter traced to its source, and checked
  run-pilot.mjs          V3 + V4 + V6 at the nominal operating point
  run-sensitivity.mjs    V5 across all 24 strata
  run-budget.mjs         A4 accuracy-vs-compute curve
  dump-scenarios.mjs     exports raw demand for the upper-bound solver
  analysis/
    stats.py             Friedman -> Kendall W -> Nemenyi, + Holm, + effect size,
                         + realisation ratio, + stability
    upper_bound.py       per-seed MILP upper bound on attainable cash
    verify_refs.py       cross-checks every DOI against Crossref + OpenAlex
    requirements.txt
  docs/
    ASUMSI.md            every modelling assumption, with its consequence (Bab 3)
    PROVENANCE.md        generated V1 table (do not edit by hand)
    POSISI-LITERATUR.md  gap statement and novelty claim (Bab 1 and Bab 2)
  results/               CSV output (gitignored, reproducible from seeds)
```

## Running

Checks first, because a result produced by an unverified harness is not a result:

```bash
node server/verifyEngine.js            # the game physics, 24 checks
node research/verifyHarness.mjs        # the harness itself, 40 checks
node research/verify-provenance.mjs    # V1, parameter values vs their sources
```

Then the experiments:

```bash
node research/run-pilot.mjs 300 --repeats 5
node research/dump-scenarios.mjs 300
pip install -r research/analysis/requirements.txt
python research/analysis/upper_bound.py
python research/analysis/stats.py
node research/run-sensitivity.mjs 100
node research/run-budget.mjs 100
```

No database and no server are needed, the harness calls the engine functions
directly. `stats.py` picks up `results/upper_bound.csv` automatically if it exists.

## Repetitions for stochastic agents

A1, A4 and the BALANCED reference draw from their own random stream. Running them
once per seed confounds ALGORITHM variance with SCENARIO variance, so each is run
R = 5 times per seed (identical demand, different agent stream) and the cell value
entering the blocked design is the mean over those runs. The within-seed spread is
reported separately as `sd(algo)`; on the pilot it is about a quarter of A4 total
spread, and it was invisible before. Deterministic agents are run once.
See `docs/ASUMSI.md` A-15.

## A4 iteration budget

800 iterations, chosen by the rule "smallest budget within 1% of the best observed
median" over a 50 -> 3200 sweep (`run-budget.mjs`). The curve is itself a finding:
below 800 iterations A4 is **worse** than A3 while costing 2-7x its decision time,
and it only overtakes A3 at 800 (~15x A3 time). A constant in the source is not a
controlled variable; a curve with a stated selection rule is.
See `docs/ASUMSI.md` A-16.


## Seed splits

Reproducibility is enforced by seeding, not by storing scenarios. `rngForPortCall(seed,
week, port)` derives a stable sub-seed per port-call via FNV-1a, so any single
port-call can be regenerated without replaying the episode before it.

| Split | Seed range          | Who may use it |
|-------|---------------------|----------------|
| TRAIN | `[0, 200_000)`      | agent A5 only, during training |
| VAL   | `[200_000, 300_000)`| hyperparameter tuning, early stopping |
| TEST  | `[300_000, 310_000)`| final evaluation of **all** agents |
| SENS  | `[310_000, ...)`    | V5 sensitivity experiment |

The ranges are disjoint by construction, which is easier to defend than a random
split. **A5 must never be evaluated on seeds it trained on** — four of the five agents
do not learn, so reusing training seeds would make the comparison invalid and invite
an overfitting objection.

Agent randomness is seeded separately from scenario randomness (`seed, week,
agentName@port`), so one agent's draws cannot shift another agent's stream. Within a
block, every agent sees byte-identical demand. That is what makes the blocked design
valid.

## Scenario parameters

`generateOrders` takes a scenario object; the defaults reproduce the shipped game's
draw sequence exactly, so passing nothing changes nothing.

| Knob | Symbol | Nominal | Meaning |
|---|---|---|---|
| `intensity` | ρ | 1.0 (ρ = 0.89) | scales orders per port-call, hence offered load |
| `reeferShare` | σ | 0.30 | probability a container is REEFER |
| `committedShare` | κ | 0.40 | probability a customer is Committed |

`strata.mjs` specifies the factorial design in units of ρ and converts to `intensity`
via `intensityForRho`, so a stratum label means the same thing in the results table
as in the method chapter. 4 × 2 × 3 = 24 cells; the nominal cell is inside the design.

## Agent status

| Plan | Key in `agents.mjs` | Status |
|------|---------------------|--------|
| A1 Random | `random` | done |
| A2 Rule-based | `ruleSmart` | done — the shipped SMART bot, **both** decisions |
| A3 Greedy | `greedy` | done — value-density acceptance + overstow-delta stowage |
| A4 Metaheuristic | `annealing` | done — SA over (accept-set, bay plan), 800 iter |
| A5 Deep RL | — | **TODO** MaskablePPO, trained in Python |

`committedOnly`, `greedyAcceptAll` and `balanced` are diagnostic references, not part
of the ranking. `stats.py` runs the A1..A5 table as the primary analysis and the full
table as a secondary one, so the references cannot silently shift the mean ranks.

A3 and A4 minimise **the same objective** (`stackOverstow`), so the difference
between them is attributable to optimisation power alone. A2 keeps the game's own
objective because A2 *is* the game's bot. See `docs/ASUMSI.md` A-5.

To add an agent, implement `select(orders, ctx)` and `stow(containers, grid, ctx)` and
register it. `validSlots(grid, container)` in `circuit.mjs` is both the legality check
and the RL action mask — use it rather than reimplementing the constraints.

## Environment checks

| Check | Where | Question it answers |
|---|---|---|
| V1 content | `verify-provenance.mjs` | is every parameter traced to a source, and does the code still hold that value? |
| V2 structural | `verifyHarness.mjs` (invariants); Python port *TODO* | do the accounting identities hold, and will the port reproduce JS bit for bit? |
| V3 distributional | `run-pilot.mjs` | does measured demand match the Little-law model? |
| V4 discriminative | `run-pilot.mjs` | can the scenario set separate agents at all? |
| V5 sensitivity | `run-sensitivity.mjs` | does the ranking survive a change of regime? |
| V6 horizon-edge | `run-pilot.mjs` | how much of the result is an artefact of the cut-off? |

Sample size is fixed **a priori** from the rule "Nemenyi CD < 0.5 rank units":
n = 300 for the main experiment, and n >= 88, hence 100, per stratum for V5 where
only the four ranked agents are run. The retrospective p-vs-n curve at the end of
`stats.py` is a robustness display, not the justification.

Final cash is the **primary** endpoint, tested uncorrected. Restow, rolled and
utilisation are a secondary family with Holm-Bonferroni adjustment. Every pair of
agents also gets a paired effect size (median per-block difference, bootstrap CI,
share of blocks won) because a Nemenyi star says two agents are distinguishable,
not that the gap matters. See `docs/ASUMSI.md` A-17.

**V1 status:** 20 parameters. 8 justified against the archived glossary, 7 declared
assumptions answered by V5, and **5 cited to documents that are not in the
repository**. The glossary in `Info/` defines the terminology but contains no
monetary values; the tariff sheet and the rules document that fix them are cited
everywhere and archived nowhere. Until they are added to `Info/`, V1 cannot be
closed, and `docs/PROVENANCE.md` says so on its face rather than rounding those
five up to "justified".


## Decided — REEFER demand share

`generateOrders` used to draw REEFER at 50%. At that share, measured demand exceeded
REEFER capacity by 34% (ρ_REEFER = 1.34, infeasible). **Decided: 30%.** This is a
single-parameter change that leaves order count, quantities and total container volume
untouched, so overall utilisation (ρ ≈ 0.89) is unaffected; only the DRY/REEFER split
moves. Re-measured at 30%: ρ_REEFER ≈ 0.80 — feasible while still the binding
resource. The value is now `DEFAULT_SCENARIO.reeferShare`, i.e. a swept parameter
rather than a magic constant.

## Decided — revenue recognition and the horizon edge

The game used to contain **two different conventions**: multiplayer credited revenue
when a container was loaded, offline credited it on discharge. **Decided: discharge**,
on both paths.

Discharge recognition on its own creates an end-game exploit — cargo still aboard at
week 8 earns nothing, so the optimal week-8 policy is to decline almost everything.
That is invisible to a hand-written heuristic and obvious to a learned policy, which
would contaminate the comparison. `CONFIG.drainWeeks = 3` removes it: the vessel keeps
sailing with no new cargo until everything loaded has been delivered. V6 measures how
big the distortion was — on the pilot, roughly 100–200 jt per agent, and **different
per agent**, which is exactly why it could not be left in.

Full reasoning: `docs/ASUMSI.md` A-2 and A-3.

## Pilot findings

Run `node research/run-pilot.mjs 300` for current numbers. Three results have held
across every revision of the harness and are worth carrying into the thesis narrative:

- **"Accept everything" is a trap.** The shipped GREEDY bot accepts 100% of demand and
  is still not statistically separated from carrying only committed cargo. Acceptance
  without a capacity budget buys nothing.
- **The shipped "restow-aware" heuristic is aimed the wrong way.** SMART stows
  next-port cargo *first* onto the upper tiers, which seals tier 02 under the hatch
  cover and forces later-port cargo directly on top of cargo that must come off next.
  Reversing the loading order (A3) cuts restows by roughly 60%.
- **More search is not automatically better.** At the nominal operating point A4 is
  **not separated** from A3 while costing ~20x the decision time; its advantage only
  appears in the low-load strata. That is the opening for A5: if stronger search on a
  single-port-call objective does not help, does a policy that looks further ahead?

Across every pilot run to date: zero physics violations.

## Porting to Python

`circuit.mjs` is written to be translated line by line. It is pure apart from the
clock reading used to time the agent: no I/O, no globals, no mutation outside the grid
passed in. The port must reproduce, for identical seeds: revenue, restow counts,
rolled counts and final cash — bit for bit. That equality *is* structural validity
(V2) in the method chapter, so build it first and keep it green.

`analysis/verify_refs.py` is unrelated to the simulation. It cross-checks every DOI in
the bibliography against Crossref and OpenAlex and flags year disagreements, which are
usually online-first vs issue-date discrepancies. Re-run it whenever references are
added. Two gaps are open: there is no K4 cluster (the numbering jumps K3 → K5), and
the statistical method reference (Demšar 2006, JMLR 7:1–30) is cited in code comments
but not yet in the bibliography.
