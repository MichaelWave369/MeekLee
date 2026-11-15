import { test, expect } from "@playwright/test";

async function phone(browser, width=390, height=780) {
  const context = await browser.newContext({
    viewport: { width, height }, isMobile: true,
    hasTouch: true, deviceScaleFactor: 2
  });
  const page = await context.newPage();
  await page.goto("./");
  return {context, page};
}

test("phone menu starts collapsed, toggles from its big top button and keeps the game visible", async ({browser})=>{
  const {context,page}=await phone(browser);
  const trigger=page.getByRole("button",{name:"Open game menu"});
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded","false");
  const box=await trigger.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator(".mobile-quickbar")).toBeHidden();
  await expect(page.locator(".game-board")).toBeVisible();
  await trigger.click();
  await expect(page.getByRole("button",{name:"Close game menu"})).toHaveAttribute("aria-expanded","true");
  await expect(page.getByRole("button",{name:/Worlds/})).toBeVisible();
  await expect(page.getByRole("button",{name:/Display/})).toBeVisible();
  await page.getByRole("button",{name:/Display/}).click();
  await expect(page.getByRole("button",{name:/Big pieces/})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button",{name:"Close game menu"}).click();
  await expect(page.locator(".comfort-bar")).toBeHidden();
  await expect(page.locator(".mobile-quickbar")).toBeHidden();
  await expect(page.locator(".game-board")).toBeVisible();
  await context.close();
});

test("bubble launcher and Shoot action fit on a 390px phone before scrolling", async ({browser})=>{
  const {context,page}=await phone(browser);
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Worlds/}).click();
  await page.getByRole("button",{name:/Bubble Lagoon/}).click();
  await expect(page.getByRole("button",{name:"Open game menu"})).toBeVisible();
  await expect(page.locator(".mobile-quickbar")).toBeHidden();
  const arena=await page.locator(".shooter-arena").boundingBox();
  const shoot=await page.getByRole("button",{name:"Shoot!"}).boundingBox();
  const rescue=await page.getByRole("button",{name:/Free Rainbow Rescue/}).boundingBox();
  expect(arena.width).toBeGreaterThanOrEqual(260);
  expect(arena.height/arena.width).toBeGreaterThan(1.5);
  expect(shoot.y + shoot.height).toBeLessThanOrEqual(780);
  expect(rescue.y + rescue.height).toBeLessThanOrEqual(780);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await page.getByRole("button",{name:"Shoot!"}).click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("meeklee-adventures-save-v1"))?.easyShooterGames?.bubbles?.moves),{timeout:8000}).toBe(1);
  await context.close();
});

test("the illustrated map keeps Play Level visible while menu remains collapsed", async ({browser})=>{
  const {context,page}=await phone(browser);
  await page.getByRole("button",{name:"Open Adventure Path"}).click();
  await expect(page.getByRole("button",{name:"Open game menu"})).toBeVisible();
  await expect(page.locator(".trail-node")).toHaveCount(10);
  const play=await page.getByRole("button",{name:/Play Level 1/}).boundingBox();
  expect(play.y + play.height).toBeLessThanOrEqual(780);
  await page.getByRole("button",{name:/Play Level 1/}).click();
  await expect(page.locator(".game-board")).toBeVisible();
  await context.close();
});

test("portrait and landscape can reopen Worlds and Display without losing game mode", async ({browser})=>{
  const {context,page}=await phone(browser,844,390);
  await expect(page.getByRole("button",{name:"Open game menu"})).toBeVisible();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Worlds/}).click();
  await page.getByRole("button",{name:/Critter Rescue/}).click();
  await expect(page.locator(".tile")).toHaveCount(36);
  await expect(page.getByRole("button",{name:"Open game menu"})).toBeVisible();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Display/}).click();
  await expect(page.getByRole("button",{name:/Big pieces/})).toHaveAttribute("aria-pressed","true");
  await context.close();
});
