import { test, expect } from "@playwright/test";

/**
 * The whole password-recovery path, end to end: someone asks from the sign-in
 * page, an admin issues them a link, they set a new password with it, sign in,
 * and the link refuses to work a second time.
 *
 * The account used is the seeded admin, and the "new" password is the one it
 * already has — so the run leaves the database exactly as it found it and
 * e2e/auth.setup.ts keeps working.
 */

const EMAIL = "admin@residencehub.com";
const PASSWORD = "admin123";

test("password reset: ask, get a link from an admin, set it, sign in, link burns", async ({
  page,
  browser,
  baseURL,
}) => {
  page.on("dialog", (d) => d.accept());

  // ── Asking for it, from the sign-in page ────────────────────────────────────
  await page.goto("/login");
  await page.getByRole("link", { name: /forgot your password/i }).click();
  await expect(page).toHaveURL(/\/forgot-password/);

  await page.fill("#email", EMAIL);
  await page.getByRole("button", { name: /send reset link/i }).click();
  // Either promise holds: emailed if a provider is configured, otherwise an admin
  // is told to hand the link over.
  await expect(page.getByText(/reset link is on its way|administrator can now issue/i)).toBeVisible({
    timeout: 15_000,
  });

  // ── The admin sees the request and issues a link ────────────────────────────
  await page.goto("/admin");
  // "They asked" only ever appears in the reset queue, so no scoping is needed.
  await expect(page.getByText("They asked").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(`${EMAIL} · asked`).first()).toBeVisible();

  await page.fill("#reset-email", EMAIL);
  await page.getByRole("button", { name: /create reset link/i }).click();

  const linkText = page.locator("code", { hasText: "/reset-password?token=" }).first();
  await expect(linkText).toBeVisible({ timeout: 15_000 });
  const issued = (await linkText.innerText()).trim();
  const token = new URL(issued).searchParams.get("token");
  expect(token).toBeTruthy();

  // Issuing retires the self-service request, so the queue now shows one ticket
  // and credits the admin for it.
  await expect(page.getByText("Admin issued").first()).toBeVisible({ timeout: 15_000 });

  // ── The locked-out person uses it, signed out ───────────────────────────────
  // A fresh context: no saved session, exactly what a real recipient has. The
  // link's own origin comes from NEXTAUTH_URL, which needn't match the test
  // server's port, so only the token travels.
  // baseURL has to be passed through: a context made straight off the browser
  // doesn't inherit the project's use options.
  const guest = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  const guestPage = await guest.newPage();
  try {
    await guestPage.goto(`/reset-password?token=${token}`);
    await expect(guestPage.getByRole("button", { name: /set new password/i })).toBeVisible({
      timeout: 20_000,
    });

    // A mismatch is caught before anything is sent.
    await guestPage.fill("#password", PASSWORD);
    await guestPage.fill("#confirm", `${PASSWORD}-typo`);
    await guestPage.getByRole("button", { name: /set new password/i }).click();
    await expect(guestPage.getByText(/don't match/i)).toBeVisible();

    await guestPage.fill("#confirm", PASSWORD);
    await guestPage.getByRole("button", { name: /set new password/i }).click();
    await expect(guestPage.getByText(/your password is set/i)).toBeVisible({ timeout: 20_000 });

    // ── It actually signs in ─────────────────────────────────────────────────
    await guestPage.getByRole("link", { name: /go to sign in/i }).click();
    await guestPage.fill("#email", EMAIL);
    await guestPage.fill("#password", PASSWORD);
    await guestPage.click('button[type="submit"]');
    await guestPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });
    await expect(guestPage).not.toHaveURL(/\/login/);

    // ── And the link is spent ─────────────────────────────────────────────────
    await guestPage.goto(`/reset-password?token=${token}`);
    await expect(guestPage.getByText(/already been used/i)).toBeVisible({ timeout: 20_000 });
  } finally {
    await guest.close();
  }

  // Nothing is left waiting: spending the ticket clears the queue.
  await page.goto("/admin");
  await expect(page.getByText(/nobody is waiting on a password reset/i)).toBeVisible({
    timeout: 20_000,
  });
});
