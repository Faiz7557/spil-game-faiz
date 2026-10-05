import { useEffect, useRef, useState } from "react";
import { SNAP } from "./domain/data";
import { DrawerProvider } from "./components/ui";
import CopilotPanel from "./components/CopilotPanel";
import Shell from "./components/shell/Shell";
import Foundation from "./pages/Foundation";
import Overview from "./pages/Overview";
import Issues from "./pages/Issues";
import Investigation from "./pages/Investigation";
import Actions from "./pages/Actions";
import Audit from "./pages/Audit";
import Backlog from "./pages/Backlog";
import Patterns from "./pages/Patterns";
import Ingest from "./pages/Ingest";
import BusinessCase from "./pages/BusinessCase";
import AiQuality from "./pages/AiQuality";

export type Page = "overview" | "queue" | "investigation" | "actions" | "foundation" | "audit"
  | "backlog" | "patterns" | "ingest" | "business" | "aiquality";
const PAGES: Page[] = ["overview", "queue", "investigation", "actions", "foundation", "audit", "backlog", "patterns", "ingest", "business", "aiquality"];
export interface Route { page: Page; tag: string }
export const DEFAULT_CASE = "KO-3201";

function parse(): Route {
  const [, page, rawTag] = window.location.hash.split("/");
  const tag = (rawTag ?? "").split("?")[0];
  const p = PAGES.includes(page as Page) ? (page as Page) : "overview";
  return { page: p, tag: SNAP.equipment.some((e) => e.tag === tag) ? tag : DEFAULT_CASE };
}

/** Query string carried inside the hash route, e.g. #/backlog/KO-3201?inc=L3-17 */
export const hashQuery = () => new URLSearchParams(window.location.hash.split("?")[1] ?? "");

export const go = (page: Page, tag?: string, query?: Record<string, string>) => {
  const q = query ? `?${new URLSearchParams(query)}` : "";
  window.location.hash = `/${page}/${tag ?? parse().tag}${q}`;
};

export default function App() {
  const [route, setRoute] = useState<Route>(parse);
  const page = useRef(route.page);
  useEffect(() => {
    // A new page starts at the top; switching the case on the same page keeps the reader where they are.
    const on = () => { const r = parse(); if (r.page !== page.current) window.scrollTo({ top: 0 }); page.current = r.page; setRoute(r); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  return (
    <DrawerProvider>
      <Shell route={route}>
        {route.page === "overview" && <Overview />}
        {route.page === "queue" && <Issues tag={route.tag} />}
        {route.page === "investigation" && <Investigation tag={route.tag} />}
        {route.page === "actions" && <Actions tag={route.tag} />}
        {route.page === "foundation" && <Foundation />}
        {route.page === "audit" && <Audit tag={route.tag} />}
        {route.page === "backlog" && <Backlog />}
        {route.page === "patterns" && <Patterns />}
        {route.page === "ingest" && <Ingest />}
        {route.page === "business" && <BusinessCase />}
        {route.page === "aiquality" && <AiQuality />}
      </Shell>
      <CopilotPanel tag={route.tag} page={route.page} />
    </DrawerProvider>
  );
}
