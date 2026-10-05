import { ZodError } from "zod";
import { ConfigError } from "./env.js";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

/** Errors a route can show to the user as is (anything else becomes a generic 500). */
export class AiOutputError extends Error {}

export function route(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      if (e instanceof ConfigError) { console.error(e.message); return json({ error: e.message }, 500); }
      if (e instanceof ZodError) return json({ error: "Invalid input", issues: e.issues }, 400);
      if (e instanceof AiOutputError) return json({ error: e.message }, 502);
      console.error(e);
      return json({ error: "Internal error. The incident was logged." }, 500);
    }
  };
}

/** Server-sent events: each call to send() writes one frame. */
export function sse(run: (send: (event: string, data: unknown) => void) => Promise<void>) {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try { await run(send); } catch (e) {
        send("error", { message: e instanceof HttpError || e instanceof AiOutputError ? e.message : "The copilot failed. Try again." });
        console.error(e);
      } finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache" } });
}
