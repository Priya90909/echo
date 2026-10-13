import { test, expect } from "@playwright/test";
test("like and unlike the current song from the full-screen player", async ({
  page,
}) => {
  test.skip(
    !process.env.ECHO_E2E_LIVE,
    "Requires the running API and seeded catalog",
  );
  const tracks = await (await page.request.get("/api/tracks")).json();
  const title = tracks[0].title;
  await page.goto("/register");
  await page.getByLabel("Your name").fill("Player Likes");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`player-like-${Date.now()}@echo.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("player-like-secure-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/home/);
  await page.getByRole("link", { name: "Your library", exact: true }).click();
  await page.getByLabel("New playlist name").fill("Player Mix");
  await page.getByRole("button", { name: "Create playlist" }).click();
  await expect(page.getByRole("link", { name: /Player Mix/ })).toBeVisible();
  await page.getByRole("link", { name: "Discover", exact: true }).click();
  await page
    .getByRole("button", { name: `Play ${title}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Open full-screen player" }).click();
  await page
    .getByRole("button", { name: "Add to playlist", exact: true })
    .click();
  await page.getByRole("button", { name: "Player Mix", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Added to Player Mix.");
  const playlists = await (await page.request.get("/api/playlists")).json();
  const mix = playlists.find((p) => p.name === "Player Mix");
  const detail = await (
    await page.request.get(`/api/playlists/${mix._id}`)
  ).json();
  expect(detail.tracks.some((t) => t.title === title)).toBeTruthy();
  await page
    .getByRole("button", { name: `Like ${title}`, exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: `Unlike ${title}`, exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Close full-screen player" }).click();
  await page.getByRole("link", { name: "Liked songs", exact: true }).click();
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
  expect(
    (await (await page.request.get("/api/likes")).json()).some(
      (t) => t.title === title,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Open full-screen player" }).click();
  await page
    .getByRole("button", { name: `Unlike ${title}`, exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: `Like ${title}`, exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  expect(await (await page.request.get("/api/likes")).json()).toHaveLength(0);
});
