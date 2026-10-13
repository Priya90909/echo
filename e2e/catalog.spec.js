import { test, expect } from "@playwright/test";
test("licensed catalog shows artwork, filters, pages and plays full music", async ({
  page,
}) => {
  test.skip(
    !process.env.ECHO_E2E_CATALOG,
    "Requires imported licensed catalog",
  );
  const catalog = await (await page.request.get("/api/catalog")).json();
  const songs = catalog.tracks.filter((t) => t.sourceId);
  expect(songs).toHaveLength(48);
  expect(new Set(songs.map((t) => t.cover)).size).toBe(48);
  for (const song of songs) {
    expect(song.duration).toBeGreaterThan(60);
    const cover = await page.request.get(song.cover);
    expect(cover.ok()).toBeTruthy();
    expect(cover.headers()["content-type"]).toContain("image/webp");
  }
  await page.goto("/register");
  await page.getByLabel("Your name").fill("Catalog Listener");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`catalog-${Date.now()}@echo.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("catalog-secure-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/home/);
  await page
    .getByRole("button", { name: "Play Carefree", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      Number(
        await page
          .getByLabel("Playback position", { exact: true })
          .inputValue(),
      ),
    )
    .toBeGreaterThan(1);
  await page.goto("/search");
  await expect(page.locator(".music-card")).toHaveCount(24);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
  await expect(page.locator(".music-card")).toHaveCount(24);
  await page.getByLabel("Filter genre").selectOption("Jazz");
  await expect(page.locator(".music-card").first()).toBeVisible();
  await expect(page.getByText("Page 1", { exact: true })).toBeVisible();
  await page.getByLabel("Filter genre").selectOption("");
  await page
    .getByRole("textbox", { name: "Search music" })
    .fill("Sneaky Snitch");
  await expect(page.locator(".music-card")).toHaveCount(1);
  await expect(page.locator(".music-card img")).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/licensed-catalog.png",
    fullPage: true,
  });
  await page.goto("/home");
  await expect(
    page.getByRole("button", { name: "Play Carefree", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/licensed-discover.png",
    fullPage: true,
  });
});
