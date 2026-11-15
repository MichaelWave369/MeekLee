import { test, expect } from "@playwright/test";
import { makeLevel, EASY_SIZE } from "../../src/core.js";

test("Mom can open a ten-level path and choose her current puzzle", async ({ browser }) => {
  const context=await browser.newContext({viewport:{width:390,height:780},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  await page.goto("./");
  await page.getByRole("button",{name:"Open Adventure Path"}).click();
  await expect(page.getByRole("heading",{name:"Adventure Path"})).toBeVisible();
  await expect(page.locator(".trail-node")).toHaveCount(10);
  await expect(page.getByRole("button",{name:/Level 1, current/})).toBeEnabled();
  await expect(page.getByRole("button",{name:/Level 2, locked/})).toBeDisabled();
  await page.getByRole("button",{name:/Play Level 1/}).click();
  await expect(page.locator(".game-board")).toBeVisible();
  await context.close();
});

test("victory stops the board, celebrates and advances the flower to the next page", async ({ browser }) => {
  const context=await browser.newContext({viewport:{width:390,height:780},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const game=makeLevel("harvest",10,EASY_SIZE);
  game.cleared=game.target - 1;
  await page.addInitScript(({game}) => {
    if(!localStorage.getItem("meeklee-adventures-save-v1"))localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify({
      mode:"harvest",settings:{easy:true,highContrast:true,motion:false},
      easyGames:{harvest:game},easyProgress:{harvest:10},progress:{harvest:1}
    }));
  },{game});
  await page.goto("./");
  await page.getByRole("button",{name:/Free hint/}).click();
  const moves=await page.locator(".tile.hint").evaluateAll(nodes=>nodes.map(x=>Array.from(x.parentElement.children).indexOf(x)));
  expect(moves).toHaveLength(2);
  await page.locator(".tile").nth(moves[0]).click();
  await page.locator(".tile").nth(moves[1]).click();
  await expect(page.getByRole("heading",{name:"Level 10 Complete!"})).toBeVisible();
  await expect(page.locator(".game-board")).toHaveCount(0);
  await page.getByRole("button",{name:/See My Adventure Path/}).click();
  await expect(page.getByText("Page 2")).toBeVisible();
  await expect(page.getByRole("button",{name:/Level 11, current/})).toBeEnabled();
  await expect(page.getByRole("button",{name:/Level 12, locked/})).toBeDisabled();
  await page.getByRole("button",{name:/Previous 10/}).click();
  await expect(page.getByRole("button",{name:/Level 10, completed/})).toBeEnabled();
  await page.reload();
  await page.getByRole("button",{name:"Open Adventure Path"}).click();
  await expect(page.getByRole("button",{name:/Level 11, current/})).toBeEnabled();
  await context.close();
});
