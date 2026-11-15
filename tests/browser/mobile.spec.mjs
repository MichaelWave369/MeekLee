import { test, expect } from "@playwright/test";

test("320px phones default to a readable 6x6 board without sideways scrolling", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 740 }, isMobile: true,
    deviceScaleFactor: 2, hasTouch: true
  });
  const page = await context.newPage();
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /MeekLee Adventures/i })).toBeVisible();
  await expect(page.locator(".tile")).toHaveCount(36);
  const boardBeforeSettings = await page.locator(".board-wrap").boundingBox();
  expect(boardBeforeSettings.y).toBeLessThan(280);
  await page.getByRole("button", { name: /Display/ }).click();
  await expect(page.getByRole("button", { name: /Big pieces/i })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /High contrast/i })).toHaveAttribute("aria-pressed", "true");
  const tiles = await page.locator(".tile").all();
  for (const tile of tiles) {
    const rect = await tile.boundingBox();
    expect(rect, "Tile is present").not.toBeNull();
    expect(rect.width, "Tile must be wide enough for a finger").toBeGreaterThanOrEqual(44);
    expect(rect.height, "Tile must be tall enough for a finger").toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    .toBe(true);
  await expect(page.getByRole("button", { name: /Worlds/ })).toBeVisible();
  await context.close();
});

test("390px phones have larger easy tiles and retain saved puzzles on reload", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 780 }, isMobile: true,
    deviceScaleFactor: 3, hasTouch: true
  });
  const page = await context.newPage();
  await page.goto("./");
  await expect(page.locator(".tile")).toHaveCount(36);
  const firstTile = await page.locator(".tile").first().boundingBox();
  expect(firstTile.width).toBeGreaterThanOrEqual(48);
  await page.getByRole("button", { name: /Worlds/ }).click();
  await page.getByRole("button", { name: /Critter Rescue/ }).click();
  await expect(page.locator(".tile")).toHaveCount(36);
  await page.getByRole("button", { name: /Free hint/ }).click();
  const suggestedTile = page.locator(".tile.hint").first();
  await expect(suggestedTile).toBeVisible();
  await suggestedTile.click();
  await expect(page.locator(".game-bottom")).toContainText("1 moves played");
  await page.reload();
  await expect(page.getByText("Critter Rescue", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".game-bottom")).toContainText("1 moves played");
  await page.getByRole("button", { name: /Display/ }).click();
  await page.getByRole("button", { name: /Big pieces/i }).click();
  await expect(page.locator(".tile")).toHaveCount(64);
  await page.getByRole("button", { name: /Big pieces/i }).click();
  await expect(page.locator(".tile")).toHaveCount(36);
  await expect(page.locator(".game-bottom")).toContainText("1 moves played");
  await context.close();
});

test("desktop starts in original classic mode and can enable larger pieces", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await context.newPage();
  await page.goto("./");
  await expect(page.locator(".tile")).toHaveCount(64);
  await expect(page.getByRole("button", { name: /Big pieces/i })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: /Big pieces/i }).click();
  await expect(page.locator(".tile")).toHaveCount(36);
  await context.close();
});


test("rotated phone still defaults to big tiles and keeps its change-world button", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 }, isMobile: true,
    deviceScaleFactor: 2, hasTouch: true
  });
  const page = await context.newPage();
  await page.goto("./");
  await expect(page.locator(".tile")).toHaveCount(36);
  await page.getByRole("button", { name: /Display/ }).click();
  await expect(page.getByRole("button", { name: /Big pieces/i })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Worlds/ }).click();
  await expect(page.getByRole("button", { name: /Sugar Mountain/ })).toBeVisible();
  await page.getByRole("button", { name: /Sugar Mountain/ }).click();
  await expect(page.getByText("Sugar Mountain", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".tile")).toHaveCount(36);
  await context.close();
});


test("an animated match visibly pops, drops and completes before accepting new input", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 780 }, isMobile: true,
    deviceScaleFactor: 2, hasTouch: true
  });
  const page = await context.newPage();
  await page.goto("./");
  await page.getByRole("button", { name: /Free hint/ }).click();
  const indexes = await page.locator(".tile.hint").evaluateAll(tiles => tiles.map(tile =>
    Array.from(tile.parentElement.children).indexOf(tile)));
  expect(indexes).toHaveLength(2);
  await page.locator(".tile").nth(indexes[0]).click();
  await page.locator(".tile").nth(indexes[1]).click();
  await expect(page.locator(".tile.fx-swap")).toHaveCount(2);
  await expect(page.locator(".tile.fx-pop").first()).toBeVisible();
  await expect(page.locator(".combo-toast")).toBeVisible();
  await expect(page.locator(".tile.fx-fall").first()).toBeVisible();
  await expect(page.locator(".game-bottom")).toContainText("1 moves played");
  await expect(page.locator(".tile.fx-fall")).toHaveCount(0);
  await context.close();
});

test("Mom can turn animations off and reduced-motion devices default to off", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 780 }, isMobile: true,
    deviceScaleFactor: 2, hasTouch: true, reducedMotion: "reduce"
  });
  const page = await context.newPage();
  await page.goto("./");
  await page.getByRole("button", { name: /Display/ }).click();
  await expect(page.getByRole("button", { name: /Match animations/i })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: /Worlds/ }).click();
  await page.getByRole("button", { name: /Critter Rescue/ }).click();
  await page.getByRole("button", { name: /Free hint/ }).click();
  await page.locator(".tile.hint").first().click();
  await expect(page.locator(".game-bottom")).toContainText("1 moves played");
  await expect(page.locator(".tile.fx-pop")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: /Display/ }).click();
  await expect(page.getByRole("button", { name: /Match animations/i })).toHaveAttribute("aria-pressed", "false");
  await context.close();
});
