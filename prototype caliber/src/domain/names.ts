// Plain names for equipment, for readers who do not know the plant's tag numbers. Derived from the equipment
// sheet's own name ("Cracked Gas Compressor KO-3201"), so nothing is invented: the tag is dropped, as is any
// parenthetical, and the words go to sentence case.
import { SNAP } from "./data";

const sentence = (s: string) => s.toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

/** "Cracked gas compressor" for KO-3201; the tag itself when the sheet has no name. */
export function plainName(tag: string): string {
  const e = SNAP.equipment.find((x) => x.tag === tag);
  if (!e) return tag;
  return sentence(e.name.replace(` ${tag}`, "").replace(/\s*\(.*?\)\s*/g, " ").trim());
}

/** The last two words, for tight spots: "Gas compressor", "Heat exchanger". */
export function shortName(tag: string): string {
  const w = plainName(tag).split(" ");
  return sentence(w.slice(-2).join(" "));
}

/** The plant unit without its code: "Cracker unit". */
export function plantName(tag: string): string {
  const e = SNAP.equipment.find((x) => x.tag === tag);
  return e ? sentence(e.plant_unit.replace(/\s*\(.*?\)\s*/g, "").trim()) : "";
}
