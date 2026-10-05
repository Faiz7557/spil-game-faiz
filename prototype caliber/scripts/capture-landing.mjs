// Recaptures the workspace screenshots the landing page shows (public/landing/*.jpg), in both themes, at
// 1440x900 @1.5x = 2160x1350. Needs the dev server running. Usage: node scripts/capture-landing.mjs [page ...]
// PP_URL picks the app (default http://localhost:5173/); PP_CHANNEL picks the browser (default msedge, or chrome).
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const BASE = process.env.PP_URL ?? "http://localhost:5173/";
const out = fileURLToPath(new URL("../public/landing/", import.meta.url));
const pages = {
  overview: "#/overview/KO-3201", queue: "#/queue/KO-3201", investigation: "#/investigation/KO-3201",
  actions: "#/actions/KO-3201", business: "#/business/KO-3201",
};
const want = process.argv.slice(2);

const browser = await chromium.launch({ channel: process.env.PP_CHANNEL ?? "msedge" });
for (const theme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, colorScheme: theme });
  await ctx.addInitScript((t) => { try { localStorage.setItem("plantpulse.theme", t); } catch {} }, theme);
  const page = await ctx.newPage();
  for (const [name, hash] of Object.entries(pages)) {
    if (want.length && !want.includes(name)) continue;
    await page.goto(BASE + hash, { waitUntil: "commit", timeout: 120000 });
    await page.waitForSelector(".content", { timeout: 120000 }).catch(() => {});
    await page.waitForTimeout(5000); // charts, 3D scenes and the backdrop settle
    const file = `${out}${name}${theme === "light" ? "-light" : ""}.jpg`;
    await page.screenshot({ path: file, type: "jpeg", quality: 82 });
    console.log("ok", file);
  }
  await ctx.close();
}
await browser.close();
