import { test, expect } from "@playwright/test";
import { makeLevel, playTurn, EASY_SIZE } from "../../src/core.js";

function findUpwardGame() {
  for (let level = 1; level < 100; level++) {
    const game = makeLevel("harvest", level, EASY_SIZE);
    for (let from = EASY_SIZE; from < game.board.length; from++) {
      const to = from - EASY_SIZE;
      if (playTurn(game, from, to).valid) return { game, from, to };
    }
  }
  throw new Error("Could not find an upward match");
}

async function openWithGame(browser, game, motion = true) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 780 },
    isMobile: true, deviceScaleFactor: 2, hasTouch: true
  });
  const page = await context.newPage();
  await page.addInitScript(({ game, motion }) => {
    const save = {
      mode: game.mode,
      settings: { easy: true, highContrast: true, motion },
      easyGames: { [game.mode]: game },
      easyProgress: { [game.mode]: game.level }
    };
    window.localStorage.setItem("meeklee-adventures-save-v1", JSON.stringify(save));
  }, { game, motion });
  await page.goto("./");
  await expect(page.locator(".tile")).toHaveCount(36);
  return { context, page };
}

async function tileCenter(page, index) {
  const rect = await page.locator(".tile").nth(index).boundingBox();
  if (!rect) throw Error("Missing puzzle tile " + index);
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

async function beginTouch(context, page, index) {
  const session = await context.newCDPSession(page);
  const source = await tileCenter(page, index);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart", touchPoints: [{ x: source.x, y: source.y }]
  });
  return { session, source };
}

async function moveTouch(session, x, y) {
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove", touchPoints: [{ x, y }]
  });
}

async function finishTouch(session, type = "touchEnd") {
  await session.send("Input.dispatchTouchEvent", { type, touchPoints: [] });
}

test("finger follows an upward swipe, only swaps on release and spends exactly one move", async ({ browser }) => {
  const { game, from, to } = findUpwardGame();
  const { context, page } = await openWithGame(browser, game);
  const before = await page.locator(".tile").nth(from).boundingBox();
  const { session, source } = await beginTouch(context, page, from);
  const destination = await tileCenter(page, to);
  await moveTouch(session, source.x, source.y - 12);
  await moveTouch(session, destination.x, destination.y + 5);
  await expect(page.locator(".tile.finger-dragging")).toHaveCount(1);
  await expect(page.locator(".tile.finger-drop-target")).toHaveCount(1);
  const during = await page.locator(".tile").nth(from).boundingBox();
  expect(during.y).toBeLessThan(before.y - 15);
  await expect(page.locator(".game-bottom")).toContainText("0 moves played");
  // Releasing is the moment the actual turn begins.
  await finishTouch(session);
  await expect(page.locator(".game-bottom")).toContainText("1 moves played", { timeout: 10000 });
  await expect(page.locator(".tile.finger-dragging")).toHaveCount(0);
  await expect(page.locator(".tile")).toHaveCount(36);
  await page.reload();
  await expect(page.locator(".game-bottom")).toContainText("1 moves played");
  await context.close();
});

test("short or canceled drags snap back without consuming moves", async ({ browser }) => {
  const { game, from } = findUpwardGame();
  const { context, page } = await openWithGame(browser, game, false);
  const { session, source } = await beginTouch(context, page, from);
  await moveTouch(session, source.x, source.y - 10);
  await expect(page.locator(".tile.finger-dragging")).toHaveCount(1);
  await finishTouch(session);
  await expect(page.locator(".tile.finger-dragging")).toHaveCount(0);
  await expect(page.locator(".game-bottom")).toContainText("0 moves played");
  const second = await beginTouch(context, page, from);
  await moveTouch(second.session, second.source.x, second.source.y - 40);
  await expect(page.locator(".tile.finger-dragging")).toHaveCount(1);
  await finishTouch(second.session, "touchCancel");
  await expect(page.locator(".tile.finger-dragging")).toHaveCount(0);
  await expect(page.locator(".game-bottom")).toContainText("0 moves played");
  await context.close();
});

test("dragging beyond top or side edges cannot wrap into another row", async ({ browser }) => {
  const { game } = findUpwardGame();
  const { context, page } = await openWithGame(browser, game, false);
  const { session, source } = await beginTouch(context, page, 0);
  await moveTouch(session, source.x - 58, source.y);
  await expect(page.locator(".tile.finger-drop-target")).toHaveCount(0);
  await finishTouch(session);
  await expect(page.locator(".game-bottom")).toContainText("0 moves played");
  await context.close();
});

test("tapping two matching neighbors still works after finger-drag support", async ({ browser }) => {
  const { game, from, to } = findUpwardGame();
  const { context, page } = await openWithGame(browser, game, false);
  await page.locator(".tile").nth(from).click();
  await expect(page.locator(".tile.selected")).toHaveCount(1);
  await page.locator(".tile").nth(to).click();
  await expect(page.locator(".game-bottom")).toContainText("1 moves played");
  await context.close();
});
