import { Readable } from "node:stream";
import type { ReadableStream as WebStream } from "node:stream/web";
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL as NodeURL } from "node:url";

/**
 * Dev only: serves /api/* from the same route table as the production function (api/router.ts), so
 * `npm run dev` runs the live version locally without the Vercel CLI.
 */
function localApi(): Plugin {
  return {
    name: "plantpulse-local-api",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      Object.assign(process.env, loadEnv("development", process.cwd(), ""));
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        if (!url.pathname.startsWith("/api/")) return next();
        const name = url.pathname.slice(5).replace(/\/$/, "");
        try {
          const { ROUTES } = await server.ssrLoadModule("/server/routes/index.ts");
          const mod = ROUTES[name];
          if (!mod) { res.statusCode = 404; res.end(JSON.stringify({ error: "No such route." })); return; }
          const handler = mod[req.method ?? "GET"];
          if (!handler) { res.statusCode = 405; res.end(); return; }
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const body = ["GET", "HEAD"].includes(req.method ?? "GET") ? undefined : Buffer.concat(chunks);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
          const out: Response = await handler(new Request(url, { method: req.method, headers, body }));
          res.statusCode = out.status;
          out.headers.forEach((v, k) => res.setHeader(k, v));
          if (out.body) Readable.fromWeb(out.body as unknown as WebStream).pipe(res); else res.end();
        } catch (e) {
          console.error(e);
          res.statusCode = 500; res.end(JSON.stringify({ error: "Local API error." }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApi()],
  resolve: { alias: { "@": fileURLToPath(new NodeURL("./src", import.meta.url)) } },
  build: { chunkSizeWarningLimit: 1200 },
  test: { exclude: ["e2e/**", "node_modules/**", "dist/**"] },
});
