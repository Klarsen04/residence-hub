import { test, expect } from "@playwright/test";

// Happy-path smoke suite for the core create flows that were reported broken
// (residents/check-ins/boards/inspiration/decorations/resources/notes/events/duty).
// Serial: the resident created first is reused by the check-in test. Auth comes
// from the `setup` project's saved storageState (see playwright.config.ts).
test.describe.configure({ mode: "serial" });

// Unique-ish suffix so re-runs don't collide.
const TAG = `E2E-${Date.now().toString().slice(-6)}`;

test("residents: create", async ({ page }) => {
  await page.goto("/residents");
  await page.getByRole("button", { name: /add resident/i }).click();
  await page.getByPlaceholder("Name *").fill(`${TAG} Resident`);
  await page.getByPlaceholder("Room *").fill("101");
  await page.getByPlaceholder("Email *").fill("e2e@example.com");
  await page.getByPlaceholder(/Year/).fill("First-Year");
  await page.getByRole("button", { name: /^Save Resident$/ }).click();
  await expect(page.getByText(`${TAG} Resident`)).toBeVisible();
});

test("residents: edit (admin can edit)", async ({ page }) => {
  await page.goto("/residents");
  await page.getByText(`${TAG} Resident`).first().click();
  await page.getByRole("button", { name: /^Edit$/ }).click();
  await page.getByPlaceholder(/Year/).fill("Sophomore");
  await page.getByRole("button", { name: /save changes/i }).click();
  // Scope to this resident's card so we verify *this* edit, not a leftover one.
  const card = page.locator(".group", { has: page.getByText(`${TAG} Resident`) }).first();
  await expect(card.getByText(/Sophomore/)).toBeVisible();
});

test("check-ins: log via resident select", async ({ page }) => {
  await page.goto("/check-ins");
  await page.getByRole("button", { name: /log check-in/i }).first().click();
  const select = page.locator("form select").first();
  await expect(select).toBeVisible();
  await select.selectOption({ label: `${TAG} Resident — Rm 101` });
  await expect(page.getByPlaceholder(/Auto-filled/)).toHaveValue("101");
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByText(`${TAG} Resident`).first()).toBeVisible();
});

test("boards: create", async ({ page }) => {
  await page.goto("/collaboration");
  await page.getByRole("button", { name: /new board|create your first board/i }).first().click();
  await page.getByPlaceholder(/Board name/).fill(`${TAG} Board`);
  await page.getByRole("button", { name: /^Create Board$/ }).click();
  // Creating a board opens it, so assert on its heading — plain text would also
  // match the success toast, which quotes the title back.
  await expect(page.getByRole("heading", { name: `${TAG} Board` })).toBeVisible();
});

test("inspiration: save upload pin", async ({ page }) => {
  await page.goto("/inspiration");
  await page.getByRole("button", { name: /save inspiration/i }).click();
  await page.getByPlaceholder(/Name this inspiration/).fill(`${TAG} Pin`);
  await page.locator("form select").first().selectOption("UPLOAD");
  await page.getByRole("button", { name: /^Save$/ }).click();
  await expect(page.getByText(`${TAG} Pin`)).toBeVisible();
});

test("decorations: post with a photo link", async ({ page }) => {
  await page.goto("/decorations");
  await page.getByRole("button", { name: /post decoration/i }).first().click();
  await page.getByPlaceholder(/Fall Leaf Door Decs/).fill(`${TAG} Craft`);
  // Pasting a link is the alternative to the file picker, which Playwright
  // can't drive without a real file on disk.
  await page.getByPlaceholder(/paste image link/).fill("https://example.com/dec.jpg");
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByText(`${TAG} Craft`)).toBeVisible();
});

test("resources: share a resource", async ({ page }) => {
  await page.goto("/resources");
  await page.getByRole("button", { name: /share resource/i }).click();
  await page.getByPlaceholder(/Resource name/).fill(`${TAG} Resource`);
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByText(`${TAG} Resource`)).toBeVisible();
});

test("notes: create a note", async ({ page }) => {
  await page.goto("/notes");
  await page.getByRole("button", { name: /new note/i }).click();
  await page.getByPlaceholder(/Note title/).fill(`${TAG} Note`);
  await page.getByRole("button", { name: /^Save Note$/ }).click();
  await expect(page.getByText(`${TAG} Note`)).toBeVisible();
});

test("events: create via new-event page", async ({ page }) => {
  await page.goto("/events/new");
  await page.getByPlaceholder(/Movie Night/).fill(`${TAG} Event`);
  await page.locator('input[type="date"]').fill("2026-08-20");
  await page.locator('input[type="time"]').first().fill("14:00");
  await page.locator('input[type="time"]').nth(1).fill("15:00");
  await page.getByRole("button", { name: /^Create Event$/ }).click();
  await page.waitForURL(/\/events\/[\w-]+$/, { timeout: 20_000 });
  await expect(page.getByText(`${TAG} Event`)).toBeVisible();
});

test("duty: no built-in modal; panel creates a shift", async ({ page }) => {
  await page.goto("/duty");
  await expect(page.getByText(/Overnight/).first()).toBeVisible();
  // Click a mid-month day cell → our custom panel opens (not Ilamy's form).
  const cell = page.locator(".droppable-cell", { has: page.getByText("15", { exact: true }) }).first();
  await cell.click();
  await expect(page.getByText(/Add shift/).first()).toBeVisible();
  // Ilamy's built-in event form must NOT be present.
  await expect(page.getByText(/Add a new event to your calendar|Event description/i)).toHaveCount(0);
  // Submit with the default shift type — panel closes on success.
  await page.getByPlaceholder(/Front desk, Rounds/).fill(`${TAG} Shift`);
  await page.getByRole("button", { name: /^Add shift/ }).click();
  await expect(page.getByText(/Add shift/).first()).toBeHidden({ timeout: 10_000 });

  // Remove it again: shifts left behind stack up in the day cell until they
  // cover it, and then this test's own cell click can't land.
  page.once("dialog", (d) => d.accept());
  await page.getByText(`${TAG} Shift`).first().click({ force: true });
  await page.getByRole("button", { name: /^Delete$/ }).click();
  await expect(page.getByText(`${TAG} Shift`)).toHaveCount(0, { timeout: 10_000 });
});
