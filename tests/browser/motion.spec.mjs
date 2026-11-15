import { test, expect } from "@playwright/test";
import { makeLevel, EASY_SIZE } from "../../src/core.js";

async function prepare(browser, { reducedMotion = "no-preference", speed = "relaxed", width = 390 } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: 780 },
    isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    reducedMotion
  });
  const page = await context.newPage();
  const initial = makeLevel("harvest", 1, EASY_SIZE);
  await page.addInitScript(({ game, speed }) => {
    if (!localStorage.getItem("meeklee-adventures-save-v1")) {
      localStorage.setItem("meeklee-adventures-save-v1", JSON.stringify({
        mode: "harvest",
        settings: { easy: true, highContrast: true, motion: true, motionSpeed: speed },
        easyGames: { harvest: game },
        easyProgress: { harvest: 1 }
      }));
    }
  }, { game: initial, speed });
  await page.goto("./");
  await expect(page.locator(".tile")).toHaveCount(36);
  return { page, context };
}

async function playFirstSuggestedSwap(page) {
  await page.getByRole("button", { name: /Free hint/ }).click();
  const choices = await page.locator(".tile.hint").evaluateAll(elements =>
    elements.map(element => Array.from(element.parentElement.children).indexOf(element)));
  expect(choices).toHaveLength(2);
  await page.locator(".tile").nth(choices[0]).click();
  await page.locator(".tile").nth(choices[1]).click();
}

function durationMs(text) {
  return Number.parseFloat(text) * (text.includes("ms") ? 1 : 1000);
}

test("phone visibly spends time swapping, popping and falling instead of flashing to final board", async ({ browser }) => {
  const { page, context } = await prepare(browser);
  await page.getByRole("button", { name: /Display/ }).click();
  await expect(page.getByRole("button", { name: /Animation pace/i })).toContainText("Relaxed");
  await page.getByRole("button", { name: /Display/ }).click();
  await playFirstSuggestedSwap(page);
  const swapping = page.locator(".tile.fx-swap").first();
  await expect(swapping).toBeVisible();
  const swapData = await swapping.evaluate(el => ({
    name: getComputedStyle(el).animationName,
    duration: getComputedStyle(el).animationDuration,
    shiftX: el.style.getPropertyValue("--shift-x"),
    shiftY: el.style.getPropertyValue("--shift-y")
  }));
  expect(swapData.name).toContain("meeklee-swap");
  expect(durationMs(swapData.duration)).toBeGreaterThanOrEqual(450);
  expect(Number.parseFloat(swapData.shiftX) !== 0 || Number.parseFloat(swapData.shiftY) !== 0).toBe(true);
  const popping = page.locator(".tile.fx-pop").first();
  await expect(popping).toBeVisible();
  const popData = await popping.evaluate(el => ({
    animation: getComputedStyle(el).animationName,
    duration: getComputedStyle(el).animationDuration
  }));
  expect(popData.animation).toContain("meeklee-pop");
  expect(durationMs(popData.duration)).toBeGreaterThanOrEqual(620);
  const falling = page.locator(".tile.fx-fall").first();
  await expect(falling).toBeVisible();
  expect(durationMs(await falling.evaluate(el => getComputedStyle(el).animationDuration)))
    .toBeGreaterThanOrEqual(740);
  await expect(page.locator(".game-bottom")).toContainText("1 moves played", { timeout: 15000 });
  await context.close();
});

test("explicit Animations ON wins over an Android reduced-motion preference", async ({ browser }) => {
  const { page, context } = await prepare(browser, { reducedMotion: "reduce" });
  await page.getByRole("button", { name: /Display/ }).click();
  await expect(page.getByRole("button", { name: /Match animations/i })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Display/ }).click();
  await playFirstSuggestedSwap(page);
  const swapping = page.locator(".tile.fx-swap").first();
  await expect(swapping).toBeVisible();
  const css = await swapping.evaluate(el => getComputedStyle(el).animationName);
  expect(css).toContain("meeklee-swap");
  await expect(page.locator(".tile.fx-pop").first()).toBeVisible();
  await expect(page.locator(".game-bottom")).toContainText("1 moves played", { timeout: 15000 });
  await context.close();
});

test("phone can choose Quick pace and saves the preference without wiping progress", async ({ browser }) => {
  const { page, context } = await prepare(browser);
  await page.getByRole("button", { name: /Display/ }).click();
  await page.getByRole("button", { name: /Animation pace/i }).click();
  await expect(page.getByRole("button", { name: /Animation pace/i })).toContainText("Quick");
  await page.reload();
  await page.getByRole("button", { name: /Display/ }).click();
  await expect(page.getByRole("button", { name: /Animation pace/i })).toContainText("Quick");
  await page.getByRole("button", { name: /Display/ }).click();
  await playFirstSuggestedSwap(page);
  const swapping = page.locator(".tile.fx-swap").first();
  await expect(swapping).toBeVisible();
  expect(durationMs(await swapping.evaluate(el => getComputedStyle(el).animationDuration)))
    .toBeLessThanOrEqual(310);
  await expect(page.locator(".game-bottom")).toContainText("1 moves played", { timeout: 15000 });
  await context.close();
});
