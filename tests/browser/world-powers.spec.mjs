import { test, expect } from "@playwright/test";
import { EASY_SIZE, adjacent, makeLevel, playTurn } from "../../src/core.js";
import { awardWorldTurn } from "../../src/world-powers.js";

async function withWorld(browser, mode, game, extra = {}) {
  const context = await browser.newContext({
    viewport: {width:390,height:780},isMobile:true,hasTouch:true,
    deviceScaleFactor:2,reducedMotion:"reduce"
  });
  const page = await context.newPage();
  await page.addInitScript(({mode,game,extra}) => {
    if (!localStorage.getItem("meeklee-adventures-save-v1"))
      localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify({
        mode, settings:{easy:true,highContrast:true,motion:false},
        easyGames:{[mode]:game},easyProgress:{[mode]:game.level},
        ...extra
      }));
  }, {mode,game,extra});
  await page.goto("./");
  return {context,page};
}
async function savedGame(page,mode) {
  return page.evaluate(mode => JSON.parse(localStorage.getItem("meeklee-adventures-save-v1")).easyGames[mode],mode);
}
function findEarnedMove(mode) {
  for(let level=1;level<=60;level++) {
    const game=makeLevel(mode,level,EASY_SIZE);
    for(let i=0;i<game.board.length;i++) {
      for(const j of [i+1,i+EASY_SIZE]) {
        if(!adjacent(i,j,EASY_SIZE))continue;
        const result=awardWorldTurn(game,playTurn(game,i,j));
        if(result.valid && (result.earned.small || result.earned.big))
          return {game,from:i,to:j};
      }
    }
  }
  throw Error("No earnable move");
}

test("Harvest Valley earns a real power from a match and retains it after reload",async({browser})=>{
  const {game,from,to}=findEarnedMove("harvest");
  const {context,page}=await withWorld(browser,"harvest",game);
  await expect(page.getByRole("button",{name:/Use Seed Sprout, 0 saved/})).toBeDisabled();
  await page.locator(".tile").nth(from).click();
  await page.locator(".tile").nth(to).click();
  await expect.poll(async()=>(await savedGame(page,"harvest")).moves).toBe(1);
  const earned=(await savedGame(page,"harvest")).powers;
  expect(earned.small+earned.big).toBeGreaterThan(0);
  await page.reload();
  const powers=(await savedGame(page,"harvest")).powers;
  expect(powers).toEqual(earned);
  await context.close();
});

test("Sugar Mountain stripe clears a row without consuming a move",async({browser})=>{
  const game=makeLevel("sweets",5,EASY_SIZE);
  game.powers={small:1,big:1};
  const {context,page}=await withWorld(browser,"sweets",game);
  await expect(page.getByRole("button",{name:/Use Candy Stripe, 1 saved/})).toBeEnabled();
  await page.getByRole("button",{name:/Use Candy Stripe/}).click();
  await expect.poll(async()=>(await savedGame(page,"sweets")).powers.big).toBe(0);
  const played=await savedGame(page,"sweets");
  expect(played.cleared).toBeGreaterThanOrEqual(6);
  expect(played.moves).toBe(0);
  await expect(page.locator(".game-board .tile")).toHaveCount(36);
  await context.close();
});

test("Critter Rescue helper can finish a level and display a medal on its journey",async({browser})=>{
  const game=makeLevel("rescue",10,EASY_SIZE);
  game.cleared=game.target-1;
  game.powers={small:1,big:0};
  const {context,page}=await withWorld(browser,"rescue",game);
  await page.getByRole("button",{name:/Use Helping Paw, 1 saved/}).click();
  await expect(page.getByRole("heading",{name:"Level 10 Complete!"})).toBeVisible();
  await page.getByRole("button",{name:/See My Adventure Path/}).click();
  await expect(page.getByRole("button",{name:/Level 11, current/})).toBeEnabled();
  await page.getByRole("button",{name:/Previous 10/}).click();
  await expect(page.locator(".trail-node.completed .trail-medals").last()).toContainText("★★★");
  await page.reload();
  await page.getByRole("button",{name:"Open Adventure Path"}).click();
  await page.getByRole("button",{name:/Play Level 11/}).click();
  await expect(page.locator(".game-board")).toBeVisible();
  await expect(page.getByRole("button",{name:/Use Helping Paw/})).toBeDisabled();
  await context.close();
});

test("Harvest and Sugar booster buttons stay readable with the compact phone menu",async({browser})=>{
  for(const mode of ["harvest","sweets"]){
    const game=makeLevel(mode,3,EASY_SIZE);
    game.powers={small:2,big:1};
    const {context,page}=await withWorld(browser,mode,game);
    const buttons=page.locator(".world-power");
    await expect(buttons).toHaveCount(2);
    for(const button of await buttons.all()){
      const rect=await button.boundingBox();
      expect(rect.height).toBeGreaterThanOrEqual(48);
      expect(rect.width).toBeGreaterThan(120);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
    await expect(page.getByRole("button",{name:"Open game menu"})).toBeVisible();
    await context.close();
  }
});
