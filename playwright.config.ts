import { defineConfig, devices } from "@playwright/test";

// E2E config. `npx playwright test` will reuse a dev server if one is already
// running at the target port, otherwise it starts `npm run dev` for you.
// Set PORT if :3000 is taken by another project's dev server — reusing a
// foreign server silently tests the wrong app.
//
// Flows are a stateful journey (a resident created early is used by the
// check-in test), so the suite runs serially in a single worker.
const PORT = process.env.PORT || "3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
