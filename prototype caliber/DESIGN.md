# PlantPulse design system: control room and Pipo

Recorded from the built app (October 2026). The working rules for building pages live in
`docs/ui-rebuild-guide.md`; this file records what the system is.

## World

Two themes over one token set, switched by `html[data-theme]` (sun/moon toggle in the landing nav and the workspace
header; every first visit opens in light whatever the OS prefers, dark comes only from the toggle and is remembered, and `index.html` applies it before first paint).

- **Dark, "Prado mesh"**: the 21st.dev Prado Almeida shadcn theme (pure black `--ground`, graphite cards
  `--panel rgba(22,22,22,.9)`, warm off-white ink, radius 1rem, Google Sans Flex and Google Sans Code) laid over the
  "Mesh drift" WebGL shader (`components/MeshBackdrop.tsx`: #03120E, #0E7C5A, #7CE577, #F4FFC7, grain 0.09, cursor
  off) under a black scrim (50% in the workspace, 28% on the landing). Interactive colour comes from the shader.
- **Light, "Pipo"**: a paper ground under the 21st.dev Pipo mesh (apricot `#E6B093`, sky blue `#A3CEFF`, paper
  `#FAF9EF`, fine grain), drifting slowly from an elapsed-seconds clock (`components/ThemeBackdrop.tsx`). Panels are
  frosted white plates (`rgba(255,255,255,.74)`), ink is navy.

The equipment tag (mono tag number in a plate with a punched hole and a lit status band) is the one brand object.

## Colour

Every colour is a token in `src/styles.css`; colours that need alpha are channel triples used as
`rgb(var(--accent-rgb) / 0.2)`. Tailwind names map onto the same tokens (`text-ink-hi`, `bg-fg/5`, `border-accent/30`).

| Role | Token | Dark | Light |
|---|---|---|---|
| Interactive, selected, current | `--accent` / `--accent-ink` | #14a374 (fill #0e7c5a) / #7ce577 | #2f62e0 / #2450bf |
| Trip, overdue, conflict | `--danger` | #ef4444 | #d63c43 |
| Alarm, attention | `--caution` | #f5a524 | #d48a06 |
| Verified, normal | `--ok` | #2dd4bf (teal, so it never reads as the interactive green) | #1d9a63 |
| Observed fact | `--info` | #60a5fa | #0a8cc4 |
| Model output | `--ai` | #a98bff | #7656ec |
| Ink ramp | `--ink-hi`, `--ink` … `--ink-4` | #f7f4ee, #e8e3da … #7a766f | #0b1426, #15213a … #6b778e |
| Categorical series (fixed order) | `--series-1..6` | #6fd685, #d08a1e, #5fa3a5, #9273f0, #d9579a, #cdbfa9 | deepened one step |

Status colours never stand in for series and always ship with a label or icon. Canvas and three.js cannot read CSS
variables: the triage canvas resolves tokens at draw time, the 3D views take `components/three/palette.ts`.

## Type

Dark: Google Sans Flex for every UI and display word, Google Sans Code for tags and figures (from the Prado theme).
Light: IBM Plex Sans (UI, 14px body, tabular figures), IBM Plex Mono (equipment tags, source IDs, row locations, limits),
Archivo at 118% width and 800 weight for landing display only. Plex replaced Geist: an engineering face with real
industrial lineage instead of the default AI-product sans. Group labels are sentence case, not tracked capitals.

## 3D

`components/three/`, react-three-fiber + drei, lazy-loaded and mounted only near the viewport.

- `PlantSite`: the Overview's "site at a glance". Twelve plants from the register on one schematic site, a column of
  light per plant sized by recorded actual loss, pins on the five machines with a full evidence package. Selecting a
  plant filters the page; the selected plot lights its wireframe. Labelled "Schematic layout, not a plot plan".
- `MachineView`: the Investigation's machine. A procedural model per equipment type (compressor train with lube
  console, end-suction pumps, shell-and-tube exchanger, centrifugal blower) with each recorded parameter pinned to
  the part it is measured at, coloured by the review week against its own limits; "Replay weeks" steps through the
  routes in snapshot review only. Labelled "Schematic model, not to scale".

## Patterns

- **KPI card** (`stat-tile`): a 2px coloured rule, label with a tinted icon chip, the value, one chip (a computed change, last 3 months vs the 3 before, or a share for snapshot counts) with a short context line, then mini bars or a share bar at the foot. No side rings: they repeated the number.
- **Machine checkup** (Investigation): a status strip, then checklist | 3D machine | checks passed. Every check is a recorded fact (`domain/checkup.ts`): each parameter against its limits for the review week, each RCA action against its plan date, the reviewer sign-off. The headline is a count of checks passed, never a score.
- **Sub-pages** (`section-tabs`): long pages split into a sticky tab bar with a sliding indicator; the panel slides in from the side you move towards. The open tab is in the hash query (`?tab=`, `?view=` on the Problem Tank) and written with replaceState, so tab switches never scroll the page. `openSectionTab(id)` opens one from anywhere (teasers, checklist rows, chart segments).
- **Card collections** (`coverflow`): RCA claims and conflicts sit in a coverflow that sizes itself to its tallest card, so nothing scrolls inside a card (21st.dev coverflow-carousel, adapted for content). The centre card is flat and interactive, drag starts only after 6px so buttons inside still click, side cards come to the centre when clicked.
- **Tracked actions**: a list beside one full action card (`actions/ActionList`), not a carousel: actions are long-lived records several roles return to, and the card keeps every control at its natural height. Plan dates are month calendars (`actions/PlanCalendar`).
- **Names before tags**: the landing uses plain equipment names only (`domain/names`); the workspace leads with the name and keeps the tag as a small mono label, since engineers cite by tag.
- **Everything routes**: checklist rows, warnings, chart segments, reminders and manager rows open the tab or page they describe.
- **Copy**: a page intro is one sentence; a card description says what to do or the one caveat that matters, once.

## Components

`src/components/ui/`: card, page-header, stat-tile, badge, button, tabs, chart (Recharts kit), sparkline,
widget-grid (@dnd-kit), gauge (thick filled arc, zone band, alarm/trip ticks, worst-week marker), border-beam,
marquee, bento-grid (instrument on top in normal flow, copy and link below; nothing absolutely positioned),
dashboard-sidebar, command-palette, ribbon-text (theme-aware bands).

Background utilities that combine a gradient with a colour must use `[background:…]`, never `bg-[gradient,var(--x)]`
(Tailwind emits that as an invalid `background-image`, which is what left the case-switcher menu transparent).

## Motion

150–250 ms state transitions on `cubic-bezier(0.16,1,0.3,1)`; a 0.5 s rise on page change; charts draw in once;
loss columns grow in once; the machine's scan ring sweeps every 4.5 s; the Pipo mesh drifts at ~30 fps and stops in
the dark theme. Everything clamps under `prefers-reduced-motion` (no orbit, no drift, no replay timer).

## Layout

Glass sidebar (256px, collapsible to 64px, Ctrl+[), 60px header with breadcrumb, case tag, search (Ctrl K), the
snapshot chip and the theme toggle, a workflow stepper on per-case pages, then `PageHeader` → headline tiles →
working area. A grid with no column utility defaults to one shrinkable column, and the content area clips
horizontal overflow.
