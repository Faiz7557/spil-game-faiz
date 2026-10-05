// Every number on the landing page comes from here, computed from the same bundled snapshot the workspace
// opens on. Nothing is typed in by hand except the evaluation results, which quote evaluation/results.md.
import { EMAP, REVIEW_DATE, SNAP } from "../domain/data";
import { fmtDate, groupSum, kpis, usdM, usd } from "../domain/kpis";
import { fleetReadings } from "../domain/fleet";
import { buildQueue } from "../domain/queue";
import { plainName, plantName, shortName } from "../domain/names";

const k = kpis(SNAP.incidents, SNAP.meta.open_statuses, REVIEW_DATE);
const queue = buildQueue(SNAP.equipment, SNAP.rca, SNAP.incidents, REVIEW_DATE, new Set(),
  { "KO-3201": EMAP.conflicts.filter((c) => c.state === "unresolved").length });
const first = queue[0];
const fullIds = new Set(SNAP.equipment.map((e) => e.linked_incident));

export const FACTS = {
  records: k.n,
  plants: k.plants,
  actual: usdM(k.actual),
  open: k.open,
  openActual: usdM(k.openActual),
  rcaDuePassed: k.rcaDuePassed,
  downtime: Math.round(k.downtime).toLocaleString("en-US"),
  from: fmtDate(k.firstDate),
  to: fmtDate(k.lastDate),
  review: fmtDate(REVIEW_DATE),
  packages: queue.length,
  first: {
    tag: first.tag,
    label: plainName(first.tag),
    short: shortName(first.tag),
    plantLabel: plantName(first.tag),
    name: first.equipment.name.replace(` ${first.tag}`, ""),
    plant: first.equipment.plant_unit,
    actual: usd(first.incident.actual_usd),
    downtime: first.incident.downtime_h,
    occurred: fmtDate(first.incident.occurred),
    reasons: first.reasons,
  },
  /** Queue order, used to lay out the five tags in the triage scene. */
  queue: queue.map((q) => ({ tag: q.tag, category: q.category, plant: plantName(q.tag), name: plainName(q.tag), short: shortName(q.tag) })),
};

/** One dot per register record, with the attributes the triage scene filters on. */
export const DOTS = SNAP.incidents.map((i) => {
  const open = SNAP.meta.open_statuses.includes(i.status);
  return { id: i.id, tag: i.tag, open, pastDue: open && !!i.rca_due && i.rca_due < REVIEW_DATE, full: fullIds.has(i.id) };
});

/** KO-3201 as the snapshot records it: the four completion states the workspace keeps apart. */
export const KO_STATES = (() => {
  const rca = SNAP.rca.find((r) => r.tag === "KO-3201")!;
  const find = (re: RegExp) => [...rca.actions, ...rca.preventive].find((a) => re.test(a.text))!;
  return {
    repair: find(/Repair leaking/),
    sensor: find(/Install online water-in-oil/),
    retube: find(/Retube/),
    alert: find(/Tighten KO-3201 vibration/),
    rollout: find(/KO-3202\/3203/),
  };
})();

/** Recorded actual loss per plant, largest first, for the hero's loss card. */
export const PLANT_LOSS = groupSum(SNAP.incidents, "plant").map((g) => ({ plant: g.key, actual: g.actual }));

/** Lead condition parameter of each fully documented asset, last route vs worst week. */
export const FLEET = fleetReadings(SNAP.equipment);

/** Recorded actual loss per calendar month of occurrence, zero-filled, for the hero's sparkline. */
export const MONTHLY = (() => {
  const m = new Map<string, number>();
  for (const i of SNAP.incidents) m.set(i.occurred.slice(0, 7), (m.get(i.occurred.slice(0, 7)) ?? 0) + i.actual_usd);
  const keys = [...m.keys()].sort();
  const out: number[] = [];
  let [y, mo] = keys[0].split("-").map(Number);
  const [ly, lm] = keys[keys.length - 1].split("-").map(Number);
  while (y < ly || (y === ly && mo <= lm)) { out.push(m.get(`${y}-${String(mo).padStart(2, "0")}`) ?? 0); mo += 1; if (mo > 12) { mo = 1; y += 1; } }
  return out;
})();

/** Register status split, in the source's own workflow order. */
export const STATUS_SPLIT = SNAP.meta.open_statuses.concat(["RISK CLOSED", "RISK CANCELED"])
  .map((s) => ({ s, n: SNAP.incidents.filter((i) => i.status === s).length, open: SNAP.meta.open_statuses.includes(s) }));

/**
 * Real citations for the evidence wall: source conflicts, the register rows behind the five full cases, the
 * first TRIP reading of each asset, and RCA slide openers. Every card is an ID the workspace can open.
 */
export const WALL = (() => {
  const cards: { id: string; kind: "conflict" | "register" | "reading" | "rca"; title: string; text: string }[] = [];
  for (const c of EMAP.conflicts) cards.push({ id: c.id, kind: "conflict", title: c.topic, text: `${c.a.says} · vs · ${c.b.says}` });
  for (const e of SNAP.equipment) {
    const inc = SNAP.incidents.find((i) => i.id === e.linked_incident);
    if (inc) cards.push({ id: `L3:row${inc.src.row}`, kind: "register", title: `${plainName(e.tag)} · register entry`, text: `${inc.title} · ${inc.plant} · ${inc.status.toLowerCase()} · ${usd(inc.actual_usd)} actual` });
    const trip = e.history.find((h) => h.status === "TRIP");
    if (trip) cards.push({ id: `${e.source}:hist:${trip.date}`, kind: "reading", title: `${plainName(e.tag)} · weekly route ${fmtDate(trip.date)}`, text: `${e.params[0].name} ${trip.values[0]} ${e.params[0].unit} · trip limit ${e.params[0].trip} · TRIP` });
  }
  for (const r of SNAP.rca) if (r.slides[1]) cards.push({ id: `${r.source}:slide2`, kind: "rca", title: `${plainName(r.tag)} · RCA slide 2`, text: r.slides[1].slice(0, 2).join(" · ").slice(0, 120) });
  return cards;
})();
