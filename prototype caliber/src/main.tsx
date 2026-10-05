import React, { Suspense, lazy, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import SignIn from "./pages/SignIn";
import { LIVE, OPEN } from "./lib/supabase";
import { SessionProvider, useSession } from "./lib/session";
import { api } from "./lib/api";
import { applyServerSnapshot } from "./domain/data";
import type { Snapshot } from "./domain/types";
import "./tw.css";
import { ThemeBackdrop } from "./components/ThemeBackdrop";
import { MeshBackdrop } from "./components/MeshBackdrop";

// Both surfaces load on demand, so a landing visitor never downloads the workspace and vice versa.
const Landing = lazy(() => import("./landing/Landing"));
const App = lazy(() => import("./App"));

/** The bare URL (no hash route) is the landing page; any #/page route is the workspace. */
const onLanding = () => ["", "#", "#/"].includes(window.location.hash);

function Workspace() {
  const { session, ready } = useSession();
  const [loaded, setLoaded] = useState(!LIVE);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!LIVE || (!session && !OPEN)) return;
    setError(null);
    api<Snapshot & { snapshotId: string }>("/api/snapshot")
      .then((s) => { applyServerSnapshot(s); setLoaded(true); })
      .catch((e) => setError(e.message));
  }, [session]);
  if (!ready) return null;
  if (LIVE && !session && !OPEN) return <SignIn />;
  if (error) return (
    <div className="signin"><div className="panel panel-pad stack signin-card">
      <h2>Could not load the published snapshot</h2><p className="small">{error}</p>
      <div className="row"><button className="btn primary" onClick={() => window.location.reload()}>Try again</button><a className="btn" href="?offline=1#/overview">Open the offline demo</a></div>
    </div></div>
  );
  if (!loaded) return <Waiting label="Loading the published snapshot…" />;
  return <Suspense fallback={<Waiting label="Opening the workspace…" />}><App /></Suspense>;
}

/** Pipo keeps the user company while the snapshot or the workspace bundle loads. */
function Waiting({ label }: { label: string }) {
  return (
    <div className="signin">
      <div className="pipo-wait" role="status">
        <img src="/mascot.png" alt="" aria-hidden="true" draggable={false} />
        <p className="muted">{label}</p>
      </div>
    </div>
  );
}

function Root() {
  const [landing, setLanding] = useState(onLanding);
  useEffect(() => {
    // Only crossing between the landing and the workspace starts at the top. Inside the workspace, App decides:
    // a new page scrolls up, while switching the case on the same page leaves the reader where they are.
    let was = onLanding();
    const on = () => { const now = onLanding(); if (now !== was) window.scrollTo({ top: 0 }); was = now; setLanding(now); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("is-landing", landing);
    if (!landing) document.title = "PlantPulse · Reliability Workspace";
  }, [landing]);
  if (landing) return <Suspense fallback={<div className="min-h-screen" />}><Landing /></Suspense>;
  return <Workspace />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><MeshBackdrop /><ThemeBackdrop /><SessionProvider><Root /></SessionProvider></React.StrictMode>,
);
