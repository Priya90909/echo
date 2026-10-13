import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
await mkdir("docs/screenshots", { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  await page.goto("http://127.0.0.1:5173/");
  await page.getByRole("heading", { name: "Find your frequency." }).waitFor();
  await page.screenshot({
    path: "docs/screenshots/landing-desktop.png",
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:5173/home");
  await page
    .getByRole("heading", { name: "Good music. Better moments." })
    .waitFor();
  await page.screenshot({
    path: "docs/screenshots/discover-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:5173/");
  await page.getByRole("heading", { name: "Find your frequency." }).waitFor();
  await page.screenshot({
    path: "docs/screenshots/landing-mobile.png",
    fullPage: true,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  if (overflow) throw new Error("Mobile page overflows horizontally");
} finally {
  await browser.close();
}
