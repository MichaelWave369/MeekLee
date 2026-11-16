import { test, expect } from "@playwright/test";

test("night mode changes the palette, remembers the choice, and switches back", async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() => localStorage.setItem("meeklee-appearance", "light"));
  await page.reload();

  const display = page.locator(".comfort-bar");
  await expect(page.locator("html")).toHaveAttribute("data-meeklee-theme", "light");
  await display.getByRole("button", { name: "Night mode, off" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-meeklee-theme", "dark");
  await expect(page.locator(".app-root")).toHaveClass(/dark-mode/);
  await expect(display.getByRole("button", { name: "Night mode, on" }))
    .toHaveAttribute("aria-pressed", "true");
  expect(await page.locator(".game-panel").evaluate(el =>
    getComputedStyle(el).backgroundColor)).toBe("rgb(33, 48, 56)");
  expect(await page.evaluate(() => localStorage.getItem("meeklee-appearance"))).toBe("dark");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-meeklee-theme", "dark");
  await display.getByRole("button", { name: "Night mode, on" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-meeklee-theme", "light");
  expect(await page.evaluate(() => localStorage.getItem("meeklee-appearance"))).toBe("light");
});

test("phone night-mode button is accessible from the menu and follows the player into cards", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true
  });
  const page = await context.newPage();
  await page.goto("./");
  await page.getByRole("button", { name: "Open game menu" }).click();
  await page.locator(".mobile-quickbar")
    .getByRole("button", { name: /Night mode/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-meeklee-theme", "dark");
  await page.locator(".mobile-quickbar").getByRole("button", { name: /Cards/ }).click();
  await expect(page.locator(".card-corner")).toBeVisible();
  await expect(page.locator(".app-root")).toHaveClass(/dark-mode/);
  await context.close();
});
