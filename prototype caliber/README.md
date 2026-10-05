# PlantPulse

An evidence-backed reliability decision and follow-up workspace, built for CALIBER 2026 Case 2 by Team Heisenberg. Live at <https://caliber-2026-heisenberg.vercel.app/>. The v1 design is in `../docs/rancangan_solusi_plantpulse.md`, the v2 platform plan in `../docs/superpowers/plans/2026-10-02-plantpulse-v2-ai-platform.md`, and operations in `../docs/RUNBOOK.md`.

## Modes

| | Offline demo | Live, open (trial) | Live, sign-in |
|---|---|---|---|
| How | `VITE_SUPABASE_URL` unset, or `?offline=1` | `AUTH_MODE=open` + `VITE_AUTH_MODE=open` | both set to `required` |
| Data | Bundled `src/data/case2.json` | Published snapshot in Supabase | Published snapshot in Supabase |
| Who | Anyone | Anyone, as one shared sandbox account | Guest sandbox or email link, with roles |
| Actions | Simulated in `localStorage` | Server guards, hash-chained log | Server guards, hash-chained log |
| AI | Off (recorded brief, bundled analytics) | On | On |

Open mode needs no sign-in quota or email provider. Everyone shares one sandbox, and team data is never changed. The daily AI budget is the only spending limit, so keep `AI_DAILY_BUDGET_USD` modest while the link is public.

## Screens

**Workflow:** Executive overview · Problem Tank (220 open records, five with full evidence) · Root cause investigation · Actions & verification.

**AI reliability** (OpenAI: `gpt-6.1-sol` for reasoning, `gpt-6-luna` for short text):
1. **RCA auditor**: the model extracts every checkable claim from an RCA deck with its exact quote; code checks each claim against the condition record and files contradictions in the conflict registry.
2. **Ask PlantPulse** (panel on every page): a copilot with read-only tools over the snapshot. The **Evidence Guard** checks each sentence: refs must come from a tool in that run; numbers and dates must appear in the cited excerpt; a judge call rates support.
3. **Closure evidence reader**: upload a PDF or photo on an action and the model classifies it against the action's rule. The result is advisory only.
4. **RCA backlog**: RCA starters (4P and 4M+1E, every row "Not assessed") for the 183 open records past their RCA due date.
5. **Failure patterns**: 16 families across 12 plants, named by the model as hypotheses.
6. **Anomaly windows** on hourly PI data, with an AI explanation per window.

**Platform:** Business case (company inputs only) · AI quality (cost, latency, guard verdicts, evals) · Ingest snapshot (data owners) · Data foundation.

## Commands

```bash
npm install
npm run dev            # offline demo at http://localhost:5173 (no .env needed)
npm test               # unit and parity tests, no network
npm run build          # type-checks browser and server code, then builds
npm run check:ai       # is OPENAI_API_KEY valid, do the models answer
npm run check:db       # migrations, buckets, published snapshot, demo account
npm run check:live     # real handlers end to end (a few US cents); --no-ai for database only
npm run seed           # publish the snapshot and create the open-mode account (idempotent)
npm run eval:rca       # RCA auditor recall on the hand-found KO-3201 conflicts + prompt injection
npm run eval:copilot   # copilot reference questions with the Evidence Guard
npm run eval:evidence  # evidence reader on four synthetic fixtures
```

All scripts read `prototype/.env` (template: `.env.example`). Eval results land in `../evaluation/runs/<date>_<name>/result.json` and are reported as "x of n (internal)".

## Rebuild the data

From the repository root:

```bash
uv pip install --python .venv/Scripts/python.exe -r analytics/requirements.txt openpyxl python-pptx
.venv/Scripts/python.exe pipeline/extract_case2.py
.venv/Scripts/python.exe pipeline/validate_case2.py
.venv/Scripts/python.exe -m analytics.patterns --local
.venv/Scripts/python.exe -m analytics.anomaly --local
```

## Limits

PlantPulse is read-only towards the plant: nothing writes to DCS, SAP or a control system, and the SAP PM export is a CSV for a human to import. Every evaluation is internal until an independent reviewer scores it. No time saving, downtime reduction or savings figure has been measured.
