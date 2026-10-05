import { useSyncExternalStore } from "react";
import type { SimAction } from "./actionTransitions";
import { api } from "../lib/api";

// Demo interaction state. Lives only in this browser and is kept apart from the snapshot data.
const KEY = "plantpulse.demo.v1";

export interface Decision { decision: "approved" | "edited" | "rejected"; reason: string; at: string; edited?: string }
export interface ConflictDecision { state: "unresolved" | "resolved"; authority: string; reason: string; at: string }
export interface LogEvent { at: string; actor: string; subject: string; decision: string; reason: string }

export interface DemoState {
  actions: SimAction[];
  briefDecisions: Record<string, Decision>;
  conflictDecisions: Record<string, ConflictDecision>;
  events: LogEvent[];
}

const empty = (): DemoState => ({ actions: [], briefDecisions: {}, conflictDecisions: {}, events: [] });

function load(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}

let state: DemoState = load();
let storageOk = true;
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    storageOk = true;
  } catch {
    storageOk = false; // private mode or blocked storage: keep working in memory
  }
}

export function update(fn: (s: DemoState) => DemoState) {
  state = fn(state);
  persist();
  listeners.forEach((l) => l());
}

export function resetDemo() {
  state = empty();
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export const getState = () => state;
export const isStorageOk = () => storageOk;

export function useDemo(): DemoState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);
}

/** Live mode: the server is the source of truth for actions; replace this case's actions in the store. */
export async function refreshActions(caseTag: string) {
  const fresh = await api<SimAction[]>(`/api/actions?case=${encodeURIComponent(caseTag)}`);
  update((s) => ({ ...s, actions: [...s.actions.filter((a) => a.caseTag !== caseTag), ...fresh] }));
}

export const nowIso = () => new Date().toISOString();
export const DEMO_USER = "Demo reliability engineer";
