import { test, expect } from "@playwright/test";
test("landing and navigation remain usable without infrastructure", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Find your frequency." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Explore ECHO" }).click();
  await expect(
    page.getByRole("heading", { name: "Good music. Better moments." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Search", exact: true }).click();
  await page.getByRole("textbox", { name: "Search music" }).fill("Ambient");
  await expect(page).toHaveURL(/q=Ambient/);
});
test("main listener journey with live seeded infrastructure", async ({
  page,
}) => {
  test.skip(
    !process.env.ECHO_E2E_LIVE,
    "Requires API, MongoDB, Redis and seeded object storage",
  );
  await page.goto("/register");
  await page.getByLabel("Your name").fill("E2E Listener");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`listener-${Date.now()}@echo.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("e2e-long-secure-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("button", { name: "Play Emerald morning" }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open full-screen player" }).click();
  await expect(
    page.getByRole("dialog", { name: "Full-screen music player" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close full-screen player" }).click();
  await page.getByRole("link", { name: "Your library" }).click();
  await page.getByLabel("New playlist name").fill("Evening Flow");
  await page.getByRole("button", { name: "Create playlist" }).click();
  await expect(page.getByRole("link", { name: /Evening Flow/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
});
