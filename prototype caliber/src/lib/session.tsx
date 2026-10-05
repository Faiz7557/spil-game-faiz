import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { OPEN, supabase } from "./supabase";
import { api } from "./api";

export interface Profile { role: "viewer" | "engineer" | "reviewer" | "manager" | "data_owner"; is_demo: boolean; display_name: string }
interface Ctx {
  session: Session | null; profile: Profile | null; ready: boolean;
  guest: () => Promise<void>; signOut: () => Promise<void>; email: (e: string) => Promise<void>;
}
const noop = async () => {};
const SessionCtx = createContext<Ctx>({ session: null, profile: null, ready: true, guest: noop, signOut: noop, email: noop });
export const useSession = () => useContext(SessionCtx);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(!supabase);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!supabase || (!session && !OPEN)) { setProfile(null); return; }
    api<Profile>("/api/me").then(setProfile, () => setProfile(null));
  }, [session]);
  const value: Ctx = {
    session, profile, ready,
    guest: async () => { const { error } = await supabase!.auth.signInAnonymously(); if (error) throw error; },
    email: async (e) => {
      const { error } = await supabase!.auth.signInWithOtp({ email: e, options: { emailRedirectTo: window.location.origin } });
      if (error) throw error;
    },
    signOut: async () => { await supabase!.auth.signOut(); },
  };
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}
