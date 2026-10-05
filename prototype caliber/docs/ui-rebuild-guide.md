# PlantPulse UI rebuild guide (control-room glass)

Working brief for rebuilding each workspace page on the new design system. Read it fully before editing a page.

## The world

Dark navy ground lit from the top left. Panels are thin smoked-glass plates: hairline edge, a faint lit top lip,
soft drop shadow. One interactive blue. A strict status vocabulary. Violet means "a model wrote this".
Geist for every UI word; Geist Mono only for equipment tags, source IDs, row locations, code.
References the user chose: IndustryOS analytics dashboard (navy glass, KPI tiles, area + ghost-track bars, donut),
a "Molds" ops board (status pills DOWN/RUNNING, OEE donut, downtime timeline strip), Syntrix FactoryCore.

**Mode: Operate.** Plant staff (reliability engineers, planners, managers, data owners) completing a task.
Scanability and obvious next steps beat decoration. Motion only conveys state (150–250 ms).

## Non-negotiable product truths (do not break)

- Every figure is a **recorded value from the organiser's register**, not live plant status, and never a
  failure prediction. Keep every "recorded", "source estimate", "simulated", "not verified" qualifier.
- Every claim stays **clickable to its source** (`useDrawer()` → `{kind:"evidence"|"source"|"incident"|"info"}`),
  `<Cite id=…/>` chips stay.
- Simulated things are hatched (`.b-simulated`, `.note.sim`, `--hatch`). Hypotheses are dashed violet (`.b-proposed`).
- Keep every behaviour, state, handler, prop, data computation, and **all user-visible copy that e2e tests
  match**: the button names "Audit this RCA"/"Run the audit again", "Ask PlantPulse", "Ask", "Close",
  "Create action"/"Create as simulated action", "Mark complete now", the `role="alert"` with "Missing required
  evidence", text "US$61.89M", "bundled snapshot", placeholder starting "Ask about". You may improve other
  copy for clarity, but never invent numbers or claims.
- Do not change files in `src/domain`, `src/lib`, `server`, `api`.

## Colour semantics (every page, no exceptions)

| Meaning | Token | Use |
|---|---|---|
| Interactive / selected / current | `accent` (#5b8cff), `accent-ink`, `accent-soft` | links, primary buttons, active tab, selected row |
| Trip, overdue, conflict, blocked | `danger` / `danger-ink` / `danger-soft` | past-due RCA, conflicts, trip zone |
| Alarm, needs attention, due soon | `caution` / `caution-ink` / `caution-soft` | alarm zone, warnings |
| Verified effective, closed with evidence, normal | `ok` / `ok-ink` / `ok-soft` | verified, normal zone |
| Observed sensor fact / info | `info` / `info-ink` / `info-soft` | observed evidence |
| Model output (AI brief, copilot, draft) | `ai` / `ai-ink` / `ai-soft` | anything generated |
| Categorical series | `var(--series-1..6)` fixed order: blue, amber, cyan, violet, pink, lime | charts only |

Text never wears a series colour; a dot/line/swatch beside the text carries identity. Status always ships with
an icon or label, never colour alone.

## Building blocks (import with `@/components/ui/...`)

- `card.tsx`: `Card` (`.panel`), `CardHeader action={…}`, `CardTitle icon={LucideIcon}`, `CardDescription`, `CardContent`, `CardFooter`.
- `page-header.tsx`: `PageHeader title badges description actions`, `SectionLabel` (uppercase run label with rule).
- `stat-tile.tsx`: `StatTile label value context icon tone visual onClick footer` — use for headline figures; `onClick` opens the definition drawer.
- `badge.tsx`: `Badge tone="ok|warn|danger|info|ai|accent|sim|neutral" dot pulse`; `toneText`, `toneDot`, `toneColor` maps.
- `button.tsx`: `Button variant="default|primary|ghost|danger|ai" size="sm|default|lg|icon|icon-sm" asChild`.
  One `primary` per view. AI-triggering actions use `variant="ai"`.
- `tabs.tsx`: Radix `Tabs, TabsList, TabsTrigger, TabsContent` (segmented, animated).
- `chart.tsx`: `Sparkline values color`, `Donut data center onPick activeKey`, `RadialMeter value max color label sub`,
  `TrackColumns data color onPick` (columns on a ghost track), `MeterRow label value max color display onClick`,
  `Legend items`, `TipCard`, `rechartsTip`, `SERIES`, `SERIES_HEX`, `STATUS_HEX`.
- `../Charts.tsx`: `LineChart` (Recharts; refs = alarm/trip lines, marks = vertical events, bands = hatched/anomaly windows),
  `PairedBars`, `Figure` — same API as before.
- `gauge.tsx`: `Gauge value alarm trip direction ghost`, `gaugeZone()`.
- `border-beam.tsx`: `BorderBeam` — at most ONE per page, on the single most important live/AI surface.
- `shell/Shell.tsx`: `TagChip tag size` — the equipment tag mark; use it wherever a tag number is shown prominently.
- Recharts is installed for anything else (stacked bars, scatter, area). Follow the chart rules below.

The legacy vocabulary classes still exist and are already restyled: `.btn .primary .ghost .sm`, `.badge .b-*`,
`.cite`, `.table`, `.kv`, `.note .warn .danger .ok .sim .ai`, `.input`, `.field`, `.seg`, `.chip .on`, `.tag*`,
`.excerpt`, `.list-plain`, `.step-strip`, `.skeleton-block`. Prefer the React components for new structure,
Tailwind for layout. Every element using Tailwind utilities must be inside an element with class `tw`
(Card and PageHeader add it) so the scoped reset applies.

Tailwind theme colours available: `ground ground-2 panel panel-2 panel-3 line line-strong line-hot ink ink-2 ink-3 ink-4
accent accent-ink accent-soft danger(-ink|-soft) caution(-ink|-soft) ok(-ink|-soft) info(-ink|-soft) ai(-ink|-soft)`.
Fonts: `font-sans` (Geist), `font-mono` (Geist Mono). Easing: `ease-out-soft`. Animation: `animate-rise`.

## Page anatomy

1. `PageHeader` (title + one-line purpose + page controls). Remove old `.page-head` markup.
2. A headline row when the page has figures: 3–5 `StatTile`s in a grid (`grid gap-3 sm:grid-cols-2 xl:grid-cols-4`).
3. The working area: master/detail or main + side column (`grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]`).
4. Secondary detail behind `Tabs` or `<details>` instead of a long scroll.
Spacing rhythm: 16px between panels, 24–32px between runs, more space above a heading than below.

## Visual cues that make it intuitive

- Status at a glance: lit dots (`Badge dot pulse` for overdue/attention), coloured left-to-right meters, zone colours on gauges.
- Every list row has a hover state and a clear selected state (`accent-soft` + `line-hot` ring).
- Next step is always visible: a primary button or "Next:" link at the end of each flow.
- Empty states teach (what will appear here and how to get it).
- Numbers: tabular, units always shown, big figures `text-[28px] font-semibold tracking-[-0.035em]`.

## Chart rules (dataviz skill, validated palette)

2px lines, 10% area wash, bars ≤24px with 4px rounded ends on a ghost track, hairline solid grid, one y-axis only
(two units → two charts), legend for ≥2 series, tooltips on every chart, direct labels sparingly,
categorical colours in fixed order and following the entity (never re-coloured by rank/filter).

## Refuse

Gradient text; glass/blur as decoration (the panel glass is the system, don't add more); coloured `border-left`
stripes thicker than 1px; eyebrow/kicker labels above headings; nested cards; emoji; monospace as decoration;
icon-tile-plus-heading card grids as page structure; more than one `BorderBeam` per page; modals where inline works.

## Accessibility

Contrast ≥4.5:1 for text (ink-3 #8293ad is the dimmest allowed for text on panel; ink-4 only for non-essential
hints ≥ 12px or decorative). Focus rings visible. Buttons are `<button>`, navigation is `<a>`. Keep `aria-*` that exist.
Respect reduced motion (global CSS already clamps animations).

## Done means

`npx tsc --noEmit` passes, `npx vitest run` passes, the page renders at 1440px and 390px wide without horizontal
page scroll, and nothing in "product truths" regressed.
