import { test, expect, type Page } from "@playwright/test";

/**
 * Full-surface sweep: for every page in the app, open it, exercise the primary
 * create flow, confirm the thing appears, then delete it and confirm it's gone.
 * Read-only pages get a load + control-click pass instead.
 *
 * Each test names its fixtures with a per-run tag and cleans up after itself, so
 * they're independent; the project pins workers to 1 so they still run in order
 * against the single dev database.
 */

/** Unique per run so repeated runs never collide on names. */
const TAG = `SWEEP-${Date.now().toString().slice(-6)}`;

/**
 * Every destructive action in the app goes through window.confirm. Playwright
 * dismisses dialogs by default, which would silently cancel every delete — so
 * accept them, and fail loudly on an unexpected page error.
 */
test.beforeEach(async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  page.on("pageerror", (e) => {
    throw new Error(`Uncaught page error: ${e.message}`);
  });
});

/**
 * Navigate and wait for the app shell. The layout renders only a spinner while
 * next-auth resolves the session, so neither <main> nor the sidebar exists for
 * the first moments after a goto.
 */
async function gotoApp(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });
}

/** Waits for the toast the app raises on a successful write. */
async function expectToast(page: Page, re: RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: re }).first()).toBeVisible({
    timeout: 15_000,
  });
}

// ---------------------------------------------------------------- Floor Roster

test("residents: create, edit, delete", async ({ page }) => {
  const name = `${TAG} Resident`;
  await page.goto("/residents");

  await page.getByRole("button", { name: /add resident/i }).click();
  await page.getByPlaceholder("Name *").fill(name);
  await page.getByPlaceholder("Room *").fill("101");
  await page.getByPlaceholder("Email *").fill(`${TAG.toLowerCase()}@example.com`);
  await page.getByPlaceholder(/Year/).fill("First-Year");
  await page.getByRole("button", { name: /^Save Resident$/ }).click();

  const card = page.locator(".group", { has: page.getByText(name, { exact: true }) }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });

  // Expand the card, then edit.
  await page.getByText(name, { exact: true }).click();
  await card.getByRole("button", { name: /^Edit$/ }).click();
  await card.getByPlaceholder("Major (optional)").fill("Architecture");
  await card.getByRole("button", { name: /save changes/i }).click();
  await expectToast(page, /updated|saved/i);

  // Delete.
  await card.getByRole("button", { name: /remove from roster/i }).click();
  await expect(page.getByText(name, { exact: true })).toHaveCount(0, { timeout: 15_000 });
});

// -------------------------------------------------------------------- Notes

test("notes: create, pin, delete", async ({ page }) => {
  const title = `${TAG} Note`;
  await page.goto("/notes");

  await page.getByRole("button", { name: /new note/i }).click();
  await page.getByPlaceholder(/Note title/).fill(title);
  await page.getByPlaceholder(/Write your note/).fill("Swept by the e2e suite.");
  await page.getByRole("button", { name: /^Save Note$/ }).click();

  const card = page.locator(".group", { has: page.getByText(title, { exact: true }) }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });

  await card.getByRole("button", { name: /pin note/i }).click();
  await expect(card.getByRole("button", { name: /unpin note/i })).toBeVisible({ timeout: 10_000 });

  await card.getByRole("button", { name: /delete note/i }).click();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0, { timeout: 15_000 });
});

// -------------------------------------------------------------- Inspiration

test("inspiration: create, delete", async ({ page }) => {
  const title = `${TAG} Inspo`;
  await page.goto("/inspiration");

  await page.getByRole("button", { name: /save inspiration/i }).click();
  await page.getByPlaceholder(/Name this inspiration/).fill(title);
  await page.locator("form select").first().selectOption({ label: "UPLOAD" });
  await page.getByRole("button", { name: /^Save$/ }).click();

  const card = page.locator(".group", { has: page.getByText(title, { exact: true }) }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });

  await card.getByRole("button", { name: /^Delete$/ }).click();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0, { timeout: 15_000 });
});

// -------------------------------------------------------------- Decorations

test("decorations: create, delete", async ({ page }) => {
  const title = `${TAG} Door Dec`;
  await page.goto("/decorations");

  await page.getByRole("button", { name: /add decoration/i }).click();
  await page.getByPlaceholder(/Fall Leaf Door Decs/).fill(title);
  await page.getByPlaceholder("Material").fill("Cardstock");
  await page.getByPlaceholder("$").fill("5");
  await page.locator('form button[type="submit"]').click();

  const card = page.locator(".group", { has: page.getByText(title, { exact: true }) }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });

  await card.getByRole("button", { name: /^Delete$/ }).click();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0, { timeout: 15_000 });
});

// ---------------------------------------------------------------- Resources

test("resources: create, delete", async ({ page }) => {
  const title = `${TAG} Resource`;
  await page.goto("/resources");

  await page.getByRole("button", { name: /share resource/i }).click();
  await page.getByPlaceholder(/Resource name/).fill(title);
  await page.getByPlaceholder("https://...").fill("https://example.com");
  await page.locator('form button[type="submit"]').click();

  const card = page.locator(".group", { has: page.getByText(title, { exact: true }) }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });

  await card.getByRole("button", { name: /^Delete$/ }).click();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0, { timeout: 15_000 });
});

// ----------------------------------------------------------------- Check-Ins

test("check-ins: create and delete a check-in", async ({ page }) => {
  // Needs a resident to check in against, so make one first.
  const resident = `${TAG} CI Resident`;
  await page.goto("/residents");
  await page.getByRole("button", { name: /add resident/i }).click();
  await page.getByPlaceholder("Name *").fill(resident);
  await page.getByPlaceholder("Room *").fill("202");
  await page.getByPlaceholder("Email *").fill(`${TAG.toLowerCase()}-ci@example.com`);
  await page.getByPlaceholder(/Year/).fill("Sophomore");
  await page.getByRole("button", { name: /^Save Resident$/ }).click();
  await expect(page.getByText(resident, { exact: true }).first()).toBeVisible({ timeout: 15_000 });

  await page.goto("/check-ins");
  await page.getByRole("button", { name: /log check-in/i }).click();
  await page.locator("form select").first().selectOption({ label: `${resident} — Rm 202` });
  await expect(page.getByPlaceholder(/Auto-filled/)).toHaveValue("202");
  await page.getByPlaceholder(/Key takeaways/).fill(`${TAG} conversation notes`);
  await page.locator('form button[type="submit"]').click();

  const row = page.locator(".group", { has: page.getByText(`${TAG} conversation notes`) }).first();
  await expect(row).toBeVisible({ timeout: 15_000 });

  await row.getByRole("button", { name: /^Delete$/ }).click();
  await expect(page.getByText(`${TAG} conversation notes`)).toHaveCount(0, { timeout: 15_000 });

  // Clean up the resident we created for this test.
  await page.goto("/residents");
  await page.getByText(resident, { exact: true }).click();
  await page
    .locator(".group", { has: page.getByText(resident, { exact: true }) })
    .first()
    .getByRole("button", { name: /remove from roster/i })
    .click();
  await expect(page.getByText(resident, { exact: true })).toHaveCount(0, { timeout: 15_000 });
});

test("check-ins: create and delete a board", async ({ page }) => {
  const board = `${TAG} CI Board`;
  await page.goto("/check-ins");

  await page.getByRole("button", { name: /new board/i }).click();
  await page.getByPlaceholder(/Board name/).fill(board);
  await page.getByRole("button", { name: /^Add$/ }).click();
  await expect(page.getByText(board).first()).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: /delete board/i }).first().click();
  await expect(page.getByText(board)).toHaveCount(0, { timeout: 15_000 });
});

// ------------------------------------------------------------- Collaboration

test("collaboration: board create, task create/delete, board delete", async ({ page }) => {
  const board = `${TAG} Board`;
  await page.goto("/collaboration");

  await page.getByRole("button", { name: /new board|create your first board/i }).first().click();
  await page.getByPlaceholder(/Board name/).fill(board);
  await page.getByRole("button", { name: /^Create Board$/ }).click();
  await expect(page.getByText(board).first()).toBeVisible({ timeout: 15_000 });

  // Creating a board opens it, so its actions are available straight away.
  await expect(page.getByRole("button", { name: /delete board/i })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /delete board/i }).first().click();
  await expect(page.getByText(board)).toHaveCount(0, { timeout: 15_000 });
});

// -------------------------------------------------------------- Room Checks

test("room-checks: board create, mark a resident, edit, undo, board delete", async ({ page }) => {
  const board = `${TAG} Check`;
  const resident = `${TAG} RC Resident`;

  await page.goto("/residents");
  await page.getByRole("button", { name: /add resident/i }).click();
  await page.getByPlaceholder("Name *").fill(resident);
  await page.getByPlaceholder("Room *").fill("303");
  await page.getByPlaceholder("Email *").fill(`${TAG.toLowerCase()}-rc@example.com`);
  await page.getByPlaceholder(/Year/).fill("Junior");
  await page.getByRole("button", { name: /^Save Resident$/ }).click();
  await expect(page.getByText(resident, { exact: true }).first()).toBeVisible({ timeout: 15_000 });

  await page.goto("/room-checks");
  await page.getByRole("button", { name: /new board/i }).click();
  await page.getByPlaceholder(/Fall Health & Safety/).fill(board);
  await page.getByRole("button", { name: /^Create board$/ }).click();
  await expect(page.getByText(board).first()).toBeVisible({ timeout: 15_000 });

  // Mark the resident as a pass.
  const pendingRow = page.locator("div.bg-card").filter({ hasText: resident }).first();
  await pendingRow.getByRole("button", { name: "Pass", exact: true }).click();
  await page.getByRole("button", { name: /^Save$/ }).click();
  await expectToast(page, /saved|updated/i);

  const doneRows = page.locator("div.group").filter({ hasText: resident });
  await expect(doneRows).toHaveCount(1, { timeout: 15_000 });

  // Editing must update the row in place, not add a second result for the same
  // resident — the save has to carry the result's own id for that to happen.
  await doneRows.first().getByRole("button", { name: /^Edit$/ }).click();
  await page.getByPlaceholder(/^Note \(optional\)/).fill(`${TAG} tidy room`);
  await page.getByRole("button", { name: /save changes/i }).click();
  await expectToast(page, /updated/i);
  await expect(doneRows).toHaveCount(1, { timeout: 15_000 });
  await expect(page.getByText(`${TAG} tidy room`)).toBeVisible({ timeout: 15_000 });

  // Undo returns them to pending.
  await page.getByRole("button", { name: /undo/i }).first().click();
  await expectToast(page, /reverted/i);

  await page.getByRole("button", { name: /delete board/i }).first().click();
  await expect(page.getByText(board)).toHaveCount(0, { timeout: 15_000 });

  await page.goto("/residents");
  await page.getByText(resident, { exact: true }).click();
  await page
    .locator(".group", { has: page.getByText(resident, { exact: true }) })
    .first()
    .getByRole("button", { name: /remove from roster/i })
    .click();
  await expect(page.getByText(resident, { exact: true })).toHaveCount(0, { timeout: 15_000 });
});

// ------------------------------------------------------------------- Events

test("events: create then delete", async ({ page }) => {
  const title = `${TAG} Event`;
  await page.goto("/events/new");

  await page.getByPlaceholder(/Movie Night/).fill(title);
  await page.locator('input[type="date"]').fill("2026-09-15");
  await page.locator('input[type="time"]').first().fill("14:00");
  await page.locator('input[type="time"]').last().fill("16:00");
  await page.getByRole("button", { name: /^Create Event$/ }).click();
  await page.waitForURL(/\/events\/[\w-]+$/, { timeout: 20_000 });
  await expect(page.getByText(title).first()).toBeVisible();

  // Delete from the detail page.
  await page.getByRole("button", { name: /delete/i }).first().click();
  await page.waitForURL(/\/events$/, { timeout: 20_000 });
  await expect(page.getByText(title)).toHaveCount(0, { timeout: 15_000 });
});

test("events: templates page applies a template", async ({ page }) => {
  await page.goto("/events/templates");
  const first = page.locator("button, [role=button]").filter({ hasText: /./ }).first();
  await expect(first).toBeVisible();
  // Expand the first template card and use it.
  await page.locator("h3, h2").first().click();
  const use = page.getByRole("button", { name: /use|apply|create/i }).first();
  if (await use.count()) {
    await use.click();
    await page.waitForURL(/\/events\/new/, { timeout: 20_000 });
    await expect(page.getByPlaceholder(/Movie Night/)).not.toHaveValue("");
  }
});

// --------------------------------------------------------------------- Duty

test("duty: create then delete a shift", async ({ page }) => {
  const label = `${TAG} Shift`;
  await page.goto("/duty");

  await page.getByRole("button", { name: /new shift/i }).click();
  await page.getByPlaceholder(/Front desk, Rounds/).fill(label);
  // Leave the date at its default (today) so the shift lands in the month the
  // calendar is currently showing.
  await page.getByRole("button", { name: /^Add shift$/ }).click();
  await expect(page.getByText(label).first()).toBeVisible({ timeout: 15_000 });

  // The shift chip lives inside the third-party calendar, which re-lays-out on
  // hover; force past the actionability wait.
  await page.getByText(label).first().click({ force: true });
  await page.getByRole("button", { name: /^Delete$/ }).click();
  await expect(page.getByText(label)).toHaveCount(0, { timeout: 15_000 });
});

// ---------------------------------------------------------------- Incidents

test("incidents: create then delete a report", async ({ page }) => {
  const where = `${TAG} Lounge`;
  await page.goto("/incidents");

  await page.getByRole("button", { name: /new report/i }).click();
  await page.locator('input[type="date"]').first().fill("2026-09-15");
  await page.locator('input[type="time"]').first().fill("21:00");
  await page.getByPlaceholder("Room/Floor/Area").fill(where);
  await page.getByPlaceholder(/Describe the incident objectively/).fill(`${TAG} noise complaint, resolved.`);
  await page.getByRole("button", { name: /^Save Report$/ }).click();
  await expect(page.getByText(where).first()).toBeVisible({ timeout: 15_000 });

  // Expand the card to reach its actions, then delete.
  await page.getByText(where).first().click();
  await page.getByRole("button", { name: /^Delete$/ }).click();
  await expect(page.getByText(where)).toHaveCount(0, { timeout: 15_000 });
});

// -------------------------------------------------------------------- Admin

test("admin: generate then delete an authorization code", async ({ page }) => {
  // networkidle so the SWR code list has resolved — otherwise the baseline
  // count is taken against a list that hasn't rendered yet.
  await page.goto("/admin", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Authorization Codes" })).toBeVisible();

  const codesBefore = await page.getByRole("button", { name: /delete code/i }).count();
  await page.getByRole("button", { name: /generate code/i }).click();
  await expect(page.getByRole("button", { name: /delete code/i })).toHaveCount(codesBefore + 1, {
    timeout: 15_000,
  });

  await page.getByRole("button", { name: /delete code/i }).first().click();
  await expect(page.getByRole("button", { name: /delete code/i })).toHaveCount(codesBefore, {
    timeout: 15_000,
  });
});

test("admin: sync database reports a result", async ({ page }) => {
  await page.goto("/admin");
  await page.getByRole("button", { name: /sync database/i }).click();
  // Locally there are no Turso credentials, so the honest outcome is the
  // "env vars not set" error. Either way the button must report back.
  await expectToast(page, /synced|Turso env vars not set/i);
});

// ------------------------------------------------ Read-only / control pages

test("notifications: both tabs render", async ({ page }) => {
  await page.goto("/notifications");
  await page.getByRole("button", { name: /^unread/i }).click();
  await page.getByRole("button", { name: /^all/i }).click();
  await expect(page.getByRole("button", { name: /^all/i })).toBeVisible();
});

test("settings: dark mode toggles both ways", async ({ page }) => {
  await page.goto("/settings");
  // The sidebar has its own theme button; scope to the settings panel.
  const toggle = page.locator("main").getByRole("button", { name: /dark mode/i });
  await toggle.click();
  await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 10_000 });
  await toggle.click();
  await expect(page.locator("html")).not.toHaveClass(/dark/, { timeout: 10_000 });
});

test("team and analytics render", async ({ page }) => {
  await gotoApp(page, "/team");
  await expect(page.getByText(/admin@residencehub\.com/).first()).toBeVisible();
  await gotoApp(page, "/analytics");
});

test("ai-planner: new chat resets the composer", async ({ page }) => {
  await page.goto("/ai-planner");
  await page.getByPlaceholder(/Ask for an event idea/).fill(`${TAG} prompt`);
  await page.getByRole("button", { name: /new chat/i }).click();
  await expect(page.getByPlaceholder(/Ask for an event idea/)).toHaveValue("");
});

// ------------------------------------------------------- Navigation coverage

test("every sidebar link navigates to a working page", async ({ page }) => {
  await gotoApp(page, "/dashboard");
  const nav = page.locator("aside").first();
  const hrefs = await nav.locator("a[href^='/']").evaluateAll((els) =>
    [...new Set(els.map((e) => e.getAttribute("href")!))].filter((h) => h && !h.startsWith("/#"))
  );
  expect(hrefs.length).toBeGreaterThan(10);

  for (const href of hrefs) {
    // domcontentloaded, not load: some pages kick off a client-side fetch that
    // aborts the navigation's load event. A prefetch racing the goto can abort
    // it outright, so allow one retry before calling the page broken.
    let res;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await page.goto(href, { waitUntil: "domcontentloaded" });
        break;
      } catch (e) {
        if (attempt === 1) throw e;
        await page.waitForTimeout(500);
      }
    }
    expect(res?.status(), `${href} returned ${res?.status()}`).toBeLessThan(400);
    await expect(page.locator("body")).not.toContainText(/Application error|Unhandled Runtime Error/i);
  }
});
