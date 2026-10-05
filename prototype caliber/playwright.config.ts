import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e", timeout: 180_000,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", viewport: { width: 1366, height: 800 } },
});
