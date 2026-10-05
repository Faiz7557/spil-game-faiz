// Two themes: "light" (Pipo) and "dark" (Prado mesh). Every first visit opens in light, whatever the OS prefers;
// dark only comes from the toggle, and that choice is remembered. index.html applies the stored choice before first
// paint so the page never flashes the wrong theme.
import { useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "plantpulse.theme";
const EVENT = "plantpulse:theme";

export const currentTheme = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(KEY, t); } catch { /* storage blocked: the choice lasts this visit */ }
  window.dispatchEvent(new Event(EVENT));
}

export function useTheme(): [Theme, () => void] {
  const [theme, set] = useState<Theme>(currentTheme);
  useEffect(() => {
    const on = () => set(currentTheme());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return [theme, () => setTheme(theme === "dark" ? "light" : "dark")];
}
