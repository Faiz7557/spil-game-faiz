# Research harness

Experiment code for the thesis *"Perbandingan Agen Deep Reinforcement Learning dan
Algoritma Heuristik-Metaheuristik untuk Perencanaan Muatan Kapal Petikemas pada
Game Edukasi"*.

This directory is **separate from the game**. It imports the game's engine but never
modifies it, so `client/` and `server/` behave exactly as before. Nothing here is
reachable from the running application.

## Why a separate harness

The game is a 4-player shared-grid competition. That formulation cannot support a
controlled comparison of algorithms, for three reasons:

1. **Shared grid.** All players stow into one vessel, so restow penalties cannot be
   attributed to a single agent's decisions.
2. **Two decision epochs.** `activePlayerIndex = currentPortIndex % players.length`
   means a player only acts when the vessel is berthed at its own branch — 2 of 8
   weeks. Too short to be a useful sequential decision process.
3. **Entangled outcomes.** An agent's measured performance depends on what the other
   three did.

The harness therefore uses a different formulation: **one carrier operates the vessel
across the whole circuit**, alone, on its own grid. Eight full decision epochs, no
interference. The economics are unchanged — tariffs, penalties, restow costs and bay
physics are all imported from `server/utils/gameEngine.js`, so the harness and the
game cannot silently drift apart.

## Layout

```
research/
  src/
    circuit.mjs        the MDP: episode loop, action mask, metrics
    agents.mjs         agent registry (A1..A5 + diagnostic references)
  run-pilot.mjs        runs V3 + V4 checks, writes results CSV
  analysis/
    stats.py           Friedman -> Kendall W -> Nemenyi
    verify_refs.py     cross-checks every DOI against Crossref + OpenAlex
    requirements.txt
  results/             CSV output (gitignored — reproducible from seeds)
```

## Running

```bash
node research/run-pilot.mjs 300
cd research/analysis && pip install -r requirements.txt && python stats.py
```

The pilot takes a few seconds. No database and no server are needed — the harness
calls the engine functions directly.

## Seed splits

Reproducibility is enforced by seeding, not by storing scenarios. `rngForPortCall(seed,
week, port)` derives a stable sub-seed per port-call via FNV-1a, so any single
port-call can be regenerated without replaying the episode before it.

| Split | Seed range          | Who may use it |
|-------|---------------------|----------------|
| TRAIN | `[0, 200_000)`      | agent A5 only, during training |
| VAL   | `[200_000, 300_000)`| hyperparameter tuning, early stopping |
| TEST  | `[300_000, ...)`    | final evaluation of **all** agents |

The ranges are disjoint by construction, which is easier to defend than a random
split. **A5 must never be evaluated on seeds it trained on** — four of the five agents
do not learn, so reusing training seeds would make the comparison invalid and invite
an overfitting objection.

Agent randomness is seeded separately from scenario randomness (`seed, week,
agentName@port`), so one agent's draws cannot shift another agent's stream. Within a
block, every agent sees byte-identical demand. That is what makes the blocked design
valid.

## Agent status

| Plan | Key in `agents.mjs` | Status |
|------|---------------------|--------|
| A1 Random | `random` | done |
| A2 Rule-based | `ruleSmart` | done — reuses the shipped SMART bot |
| A3 Greedy | — | **TODO** multi-criteria slot scoring |
| A4 Metaheuristic | — | **TODO** simulated annealing over the bay plan |
| A5 Deep RL | — | **TODO** MaskablePPO, trained in Python |

`committedOnly`, `greedyAcceptAll` and `balanced` are diagnostic references, not part
of A1..A5. `committedOnly` is the conservative floor; the other two are the shipped
bots kept so the thesis can report how the game behaves as built.

To add an agent, implement `select(orders, ctx)` and `stow(containers, grid, ctx)` and
register it. `validSlots(grid, container)` in `circuit.mjs` is both the legality check
and the RL action mask — use it rather than reimplementing the constraints.

## Decided — REEFER demand share

`generateOrders` in `server/utils/gameEngine.js` used to draw REEFER at 50%. At that
share, measured demand exceeded REEFER capacity by 34% (ρ_REEFER = 1.34, infeasible —
see the "Pilot findings" table below for the pre-rebalance numbers). **Decided: 30%.**
This is a single-parameter change (the DRY/REEFER coin-flip threshold) that leaves order
count, quantities, and total container volume untouched — so overall utilisation
(ρ_overall ≈ 0.89) is unaffected, only the DRY/REEFER split moves. Re-measured at 30%:
ρ_REEFER ≈ 0.80, feasible while still the binding resource (see table below).

## Pilot findings (300 seeds, TEST split)

Re-measured after rebalancing REEFER demand share to 30% (see "Decided — REEFER demand
share" above) and switching revenue recognition to 'discharge' (see "Decided — revenue
recognition" below). Matches the analytical estimates almost exactly:

| Quantity | Predicted | Measured |
|---|---|---|
| containers per port-call (λ) | 16.0 | 16.01 |
| mean dwell (W) | 2.00 | 1.99 |
| ρ overall — 31.9 of 36 slots | 0.89 | 0.887 |
| ρ REEFER — 9.6 of 12 slots | 0.80 | **0.801 — feasible** |
| ρ committed-only — 12.5 of 36 | 0.36 | 0.347 |

REEFER utilisation moved from infeasible (1.34×) to a tight but workable 0.80 without
changing overall demand — only the DRY/REEFER split moved, so `rho_overall` is
unaffected. REEFER stays the scarcer resource (0.80 vs. 0.93 for DRY, derived from the
same λ split), so it is still a real constraint, just not one that guarantees rolled
cargo regardless of skill.

Discriminative validity (V4) passes decisively: Friedman χ² = 962.6, p ≈ 4.5e-207,
Kendall's W = 0.802. Median cash spans 421–1348 (jt), a 3.2× range. **n = 30 blocks
already gives p ≈ 3.3e-19**, so 300 is generous rather than marginal.

Two findings that matter for the thesis narrative — both survived the rebalancing:

- **"Accept everything" is still a trap**, even with REEFER no longer structurally
  oversubscribed. The GREEDY bot accepts 100% of demand yet remains *not statistically
  separated* from carrying only committed cargo (cash rank diff 0.28, n.s.). 29% of its
  REEFER cargo still rolls — DRY congestion (ρ_DRY ≈ 0.93) and restow penalties from
  indiscriminate acceptance now explain the trap, not raw REEFER infeasibility alone.
- **The "restow-aware" heuristic does not work.** The SMART bot ranks *worst* on restows
  tied with GREEDY (mean rank 3.89 vs. 3.90 of 5, not separated). Its cash advantage
  comes entirely from cargo selection, not placement. The stowage sub-problem is
  unexploited by every heuristic currently in the game — that is the headroom A5 can
  attack.

Across 12,000 port-calls: zero physics violations.

## Decided — revenue recognition

The game used to contain **two different conventions** that disagreed at the horizon edge:

- multiplayer (`executeSailingTransition`) credited revenue when a container was **loaded**
- offline (`depart-offline`) credited it when a container was **discharged** at destination

**Decided: discharge.** Both paths now call `calculateDischargeRevenue` (in
`server/utils/gameEngine.js`) and `CONFIG.revenueRecognition` in `circuit.mjs` defaults
to `'discharge'` to match. State this in Bab 3 as an assumption, and make the Python
port match — the cross-implementation check (V2) will fail on this alone if the two
sides disagree. `revenue_load` is still written to the CSV alongside `revenue_discharge`
for reference, since nothing about computing both is expensive.

## Porting to Python

`circuit.mjs` is written to be translated line by line. It is pure: no I/O, no globals,
no mutation outside the grid passed in. The port must reproduce, for identical seeds:
revenue, restow counts, rolled counts and final cash — bit for bit. That equality *is*
structural validity (V2) in the method chapter, so build it first and keep it green.

`analysis/verify_refs.py` is unrelated to the simulation. It cross-checks every DOI in
the bibliography against Crossref and OpenAlex and flags year disagreements, which are
usually online-first vs issue-date discrepancies. Re-run it whenever references are
added.
