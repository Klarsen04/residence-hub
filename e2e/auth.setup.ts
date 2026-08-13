import { test as setup, expect } from "@playwright/test";

// Logs in once with the seeded admin and saves the session so every test in the
// "chromium" project starts authenticated (via storageState in the config).
const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "admin@residencehub.com");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });
  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: authFile });
});
