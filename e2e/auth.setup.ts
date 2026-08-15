import { test as setup, expect } from "@playwright/test";

// Logs in once with the seeded admin and saves the session so every test in the
// "chromium" project starts authenticated (via storageState in the config).
const authFile = "e2e/.auth/user.json";

// Credentials come from env so no password lives in committed source. Set
// E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD in your local .env to match your seed.
const email = process.env.E2E_ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || "admin@residencehub.com";
const password = process.env.E2E_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || "";

setup("authenticate", async ({ page }) => {
  if (!password) {
    throw new Error(
      "E2E_ADMIN_PASSWORD (or SEED_ADMIN_PASSWORD) is not set — cannot log in. " +
        "Add it to your .env to match the password used when seeding."
    );
  }
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });
  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: authFile });
});
