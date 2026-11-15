import { test, expect } from "@playwright/test";
import { makeLevel, EASY_SIZE } from "../../src/core.js";
import { makeShooterLevel } from "../../src/shooter.js";
import { bonusBoard } from "../../src/collection.js";

async function openPhone(browser, raw=null, width=390) {
  const context=await browser.newContext({
    viewport:{width,height:780},isMobile:true,hasTouch:true,
    deviceScaleFactor:2,reducedMotion:"reduce"
  });
  const page=await context.newPage();
  if(raw)await page.addInitScript(raw=>{
    if (!localStorage.getItem("meeklee-adventures-save-v1"))
      localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify(raw));
  },raw);
  await page.goto("./");
  return {context,page};
}
async function openGardenFromMenu(page) {
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Garden/}).click();
  await expect(page.getByRole("heading",{name:"Mom's Happy Garden"})).toBeVisible();
}
async function finishMatch(page) {
  await page.getByRole("button",{name:/Free hint/}).click();
  const picks=await page.locator(".tile.hint").evaluateAll(nodes=>nodes.map(n=>
    Array.from(n.parentElement.children).indexOf(n)));
  expect(picks).toHaveLength(2);
  await page.locator(".tile").nth(picks[0]).click();
  await page.locator(".tile").nth(picks[1]).click();
}

test("garden has no paywalls or mystery chests before ten completed levels",async({browser})=>{
  const {context,page}=await openPhone(browser);
  await openGardenFromMenu(page);
  await expect(page.locator(".chest-button")).toHaveCount(0);
  await expect(page.getByText(/first treasure chest/i).first()).toBeVisible();
  const bounds=await page.locator(".garden-landscape").boundingBox();
  expect(bounds.width).toBeGreaterThan(280);
  await page.getByRole("button",{name:/Back to Game/}).click();
  await expect(page.locator(".game-board")).toBeVisible();
  await context.close();
});

test("a Level 10 win reveals exactly one treasure chest, pet and collectible",async({browser})=>{
  const game=makeLevel("harvest",10,EASY_SIZE);
  game.cleared=game.target-1;
  const raw={
    mode:"harvest",settings:{easy:true,highContrast:true,motion:false},
    easyGames:{harvest:game},easyProgress:{harvest:10}
  };
  const {context,page}=await openPhone(browser,raw);
  await finishMatch(page);
  await expect(page.getByRole("heading",{name:"Level 10 Complete!"})).toBeVisible();
  await page.getByRole("button",{name:/Open Your Chapter Treasure Chest/}).click();
  await expect(page.getByRole("heading",{name:"Mom's Happy Garden"})).toBeVisible();
  await expect(page.locator(".chest-button")).toHaveCount(1);
  await page.getByRole("button",{name:/Open Harvest Valley Chest/}).click();
  await expect(page.getByText("🎉 Your treasure chest is open!")).toBeVisible();
  await expect(page.locator(".chest-button")).toHaveCount(0);
  await expect(page.getByRole("button",{name:/Golden Sunflower/})).toBeVisible();
  await expect(page.getByRole("button",{name:/Choose Pip the Bunny/})).toBeVisible();
  const save=await page.evaluate(()=>JSON.parse(localStorage.getItem("meeklee-adventures-save-v1")));
  expect(save.collection.claimed["harvest:1"]).toBe(true);
  expect(save.easyProgress.harvest).toBe(11);
  expect(save.collection.companion).toBe("bunny");
  await page.getByRole("button",{name:/Golden Sunflower/}).click();
  await expect(page.getByRole("button",{name:/Golden Sunflower, put away/})).toBeVisible();
  await page.getByRole("button",{name:/Golden Sunflower/}).click();
  await expect(page.getByRole("button",{name:/Golden Sunflower, in garden/})).toBeVisible();
  await page.getByRole("button",{name:/Choose Pip the Bunny/}).click();
  await expect(page.locator(".garden-visitor")).toContainText("Pip the Bunny");
  await page.reload();
  await openGardenFromMenu(page);
  await expect(page.locator(".chest-button")).toHaveCount(0);
  await expect(page.locator(".garden-visitor")).toContainText("Pip the Bunny");
  await context.close();
});

test("a claimed chest unlocks a real, replayable 16-card bonus board that saves its best",async({browser})=>{
  const raw={
    mode:"harvest",settings:{easy:true,highContrast:true,motion:false},
    easyProgress:{harvest:11},
    collection:{claimed:{"harvest:1":true},completedBonuses:{},hiddenDecorations:[],companion:"bunny"}
  };
  const {context,page}=await openPhone(browser,raw);
  await openGardenFromMenu(page);
  await page.getByRole("button",{name:/Harvest Valley · Chest 1/}).click();
  await expect(page.getByRole("heading",{name:"Treasure Match!"})).toBeVisible();
  await expect(page.locator(".bonus-card")).toHaveCount(16);
  const deck=bonusBoard("harvest:1"),groups=new Map();
  deck.forEach((icon,i)=>groups.set(icon,[...(groups.get(icon)||[]),i]));
  for(const pair of groups.values()){
    await page.locator(".bonus-card").nth(pair[0]).click();
    await page.locator(".bonus-card").nth(pair[1]).click();
  }
  await expect(page.getByText("🎉 Treasure Match Complete!")).toBeVisible();
  await expect(page.getByText(/8 \/ 8 pairs/)).toBeVisible();
  const original=await page.evaluate(()=>JSON.parse(localStorage.getItem("meeklee-adventures-save-v1")));
  expect(original.collection.completedBonuses["harvest:1"]).toBe(8);
  await page.getByRole("button",{name:/Back to My Garden/}).click();
  await expect(page.getByRole("button",{name:/Harvest Valley · Chest 1/})).toContainText("Best: 8 turns");
  await page.reload();
  await openGardenFromMenu(page);
  await expect(page.getByRole("button",{name:/Harvest Valley · Chest 1/})).toContainText("Best: 8 turns");
  await page.getByRole("button",{name:/Harvest Valley · Chest 1/}).click();
  await expect(page.locator(".bonus-card")).toHaveCount(16);
  await context.close();
});

test("bubble shooter chapter completion gives the same free chest without double counting",async({browser})=>{
  const game=makeShooterLevel(10,EASY_SIZE,{rainbows:1});
  game.cells.fill(null);game.cells[0]=0;game.cells[1]=0;
  const raw={
    mode:"bubbles",settings:{easy:true,highContrast:true,motion:false},
    easyShooterGames:{bubbles:game},easyShooterProgress:{bubbles:10},
    easyProgress:{bubbles:50}
  };
  const {context,page}=await openPhone(browser,raw);
  await page.getByRole("button",{name:/Use Rainbow Burst/}).click();
  await expect(page.getByRole("heading",{name:"Level 10 Complete!"})).toBeVisible({timeout:6000});
  await page.getByRole("button",{name:/Open Your Chapter Treasure Chest/}).click();
  await page.getByRole("button",{name:/Open Bubble Lagoon Chest/}).click();
  await expect(page.locator(".chest-button")).toHaveCount(0);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("meeklee-adventures-save-v1")));
  expect(saved.collection.claimed["bubbles:1"]).toBe(true);
  expect(saved.collection.claimed["bubbles:2"]).toBeUndefined();
  expect(saved.easyShooterProgress.bubbles).toBe(11);
  await context.close();
});

test("phone garden and bonus controls remain legible at 320px without sideways overflow",async({browser})=>{
  const raw={
    mode:"harvest",settings:{easy:true,highContrast:true,motion:false},
    easyProgress:{harvest:11},
    collection:{claimed:{"harvest:1":true},companion:"bunny"}
  };
  const {context,page}=await openPhone(browser,raw,320);
  await openGardenFromMenu(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  for(const node of await page.locator(".garden-collectible").all()){
    const box=await node.boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("button",{name:/Harvest Valley · Chest 1/}).click();
  const card=await page.locator(".bonus-card").first().boundingBox();
  expect(card.width).toBeGreaterThanOrEqual(56);
  expect(card.height).toBeGreaterThanOrEqual(56);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await context.close();
});
