// Scene colours per theme. three.js cannot read CSS variables, so the 3D views take their palette from here and
// re-render when the theme changes. Status colours match the tokens in styles.css.
import { useTheme, type Theme } from "@/lib/theme";

export interface ScenePalette {
  theme: Theme;
  bg: string;
  ground: string;
  groundLine: string;
  pad: string;
  padEdge: string;
  road: string;
  steel: string;
  steelDark: string;
  paint: string;
  paintAlt: string;
  guard: string;
  pipe: string;
  glass: string;
  window: string;
  edge: string;
  accent: string;
  ok: string;
  alarm: string;
  trip: string;
  ink: string;
  keyLight: number;
  fillLight: number;
  ambient: number;
}

const DARK: ScenePalette = {
  theme: "dark", bg: "#050806", ground: "#0b0d0c", groundLine: "#1f2421", pad: "#141615", padEdge: "#2f3532", road: "#101211",
  steel: "#9a9890", steelDark: "#363632", paint: "#4a5a55", paintAlt: "#5c605b", guard: "#d9a028", pipe: "#b2afa6",
  glass: "#16302a", window: "#f4ffc7", edge: "#7ce577", accent: "#14a374", ok: "#2dd4bf", alarm: "#f5a524", trip: "#ef4444", ink: "#e8e3da",
  keyLight: 2.1, fillLight: 0.6, ambient: 0.4,
};
const LIGHT: ScenePalette = {
  theme: "light", bg: "#f6f3e8", ground: "#efece0", groundLine: "#d9d5c6", pad: "#fbfaf4", padEdge: "#c9cfdc", road: "#e4e0d2",
  steel: "#b3bccb", steelDark: "#8e98aa", paint: "#7088ac", paintAlt: "#9aa6b8", guard: "#e0a526", pipe: "#b4bccb",
  glass: "#dfe7f5", window: "#f2b25c", edge: "#2f62e0", accent: "#2f62e0", ok: "#1d9a63", alarm: "#d48a06", trip: "#d63c43", ink: "#15213a",
  keyLight: 2.6, fillLight: 0.9, ambient: 0.9,
};

export function useScenePalette(): ScenePalette {
  const [theme] = useTheme();
  return theme === "light" ? LIGHT : DARK;
}

export const zoneColor = (p: ScenePalette, z: "ok" | "alarm" | "trip") => (z === "trip" ? p.trip : z === "alarm" ? p.alarm : p.ok);
