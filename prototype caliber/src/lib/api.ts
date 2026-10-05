import { supabase } from "./supabase";

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  return data.session ? { authorization: `Bearer ${data.session.access_token}` } : {};
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { "content-type": "application/json", ...(await authHeaders()) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`);
  return body as T;
}

/** Downloads a GET endpoint as a file (for exports that need the auth header). */
export async function download(path: string, fallbackName: string) {
  const res = await fetch(path, { headers: await authHeaders() });
  if (!res.ok) throw new ApiError(res.status, (await res.json().catch(() => ({}))).error ?? "Download failed");
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

/** Reads an SSE response and calls onEvent per frame. */
export async function stream(path: string, body: unknown, onEvent: (event: string, data: any) => void) {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json", ...(await authHeaders()) }, body: JSON.stringify(body) });
  if (!res.ok || !res.body) throw new ApiError(res.status, (await res.json().catch(() => ({}))).error ?? "Stream failed");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, i); buf = buf.slice(i + 2);
      const ev = /^event: (.*)$/m.exec(frame)?.[1] ?? "message";
      const data = /^data: (.*)$/m.exec(frame)?.[1];
      if (data) onEvent(ev, JSON.parse(data));
    }
  }
}
