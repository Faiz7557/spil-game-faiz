import { expect, test } from "@playwright/test";

// The judge path on a hosted build (E2E_BASE_URL). Makes real model calls: about US$0.10 per run.
test("a visitor can audit an RCA, ask the copilot, and is blocked from closing without evidence", async ({ page }) => {
  await page.goto("/");
  // Sign-in mode shows the guest button; open mode goes straight into the app.
  const guest = page.getByRole("button", { name: /continue as guest/i });
  if (await guest.isVisible({ timeout: 5_000 }).catch(() => false)) await guest.click();
  await expect(page.getByText("US$61.89M").first()).toBeVisible({ timeout: 30_000 });

  await page.goto("/#/audit/KO-3201");
  await page.getByRole("button", { name: /audit this rca|run the audit again/i }).click();
  await expect(page.getByText(/conflicts with the record/i).first()).toBeVisible({ timeout: 150_000 });

  await page.getByRole("button", { name: /ask plantpulse/i }).click();
  await page.getByPlaceholder(/ask about/i).fill("What is still open on KO-3201?");
  await page.getByRole("button", { name: /^ask$/i }).click();
  await expect(page.getByText("Supported").first()).toBeVisible({ timeout: 150_000 });
  await page.getByRole("button", { name: "Close" }).click();

  await page.goto("/#/actions/KO-3201");
  await page.getByRole("button", { name: /create (as simulated )?action/i }).click();
  await page.getByRole("button", { name: /mark complete now/i }).first().click();
  await expect(page.getByRole("alert")).toContainText(/Missing required evidence/);
});

test("the landing page opens the workspace", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/repair is not a fix/i);
  await page.getByRole("link", { name: "Open the workspace" }).first().click();
  await expect(page.getByText("US$61.89M").first()).toBeVisible({ timeout: 30_000 });
});

test("offline demo still loads without a backend", async ({ page }) => {
  await page.goto("/?offline=1#/overview");
  await expect(page.getByText(/bundled snapshot/i)).toBeVisible();
  await expect(page.getByText("US$61.89M").first()).toBeVisible();
});
