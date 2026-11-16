import {test,expect} from "@playwright/test";
import {makeLevel,EASY_SIZE,moonlightHarvest} from "../../src/core.js";

async function phone(browser,raw=null,width=390){
  const context=await browser.newContext({viewport:{width,height:780},
    isMobile:true,hasTouch:true,deviceScaleFactor:2,reducedMotion:"reduce"});
  const page=await context.newPage();
  if(raw)await page.addInitScript(value=>{
    if(!localStorage.getItem("meeklee-adventures-save-v1"))
      localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify(value));
  },raw);
  await page.goto("./");
  return {context,page};
}
const saved=page=>page.evaluate(()=>
  JSON.parse(localStorage.getItem("meeklee-adventures-save-v1")));
async function selectMoonlight(page){
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Worlds/}).click();
  await page.getByRole("button",{name:/Moonlight Orchard/}).click();
  await expect(page.getByText("Moonlight Orchard",{exact:true}).first()).toBeVisible();
}
async function moonHint(page){
  await page.getByRole("button",{name:/Free hint/}).click();
  const hint=page.locator(".tile.hint");
  await expect(hint).toHaveCount(1);
  return hint;
}
test("Moonlight Orchard is seventh world, 320px-safe, and saves phase 2 with old-world data",async({browser})=>{
  const old=makeLevel("harvest",6001,EASY_SIZE);
  const {context,page}=await phone(browser,{
    mode:"harvest",settings:{easy:true,highContrast:true,motion:false},
    easyGames:{harvest:old},easyProgress:{harvest:6001,meadow:25,pumpkin:16},
    collection:{claimed:{"harvest:1":true},companion:"bunny",
      meadowPrizes:["meadow_daisy_wreath"],
      pumpkinPrizes:["pumpkin_lantern"]}
  },320);
  await selectMoonlight(page);
  await expect(page.locator(".tile")).toHaveCount(36);
  await expect(page.getByRole("status",{name:"Moon phase: Crescent"})).toBeVisible();
  await expect(page.getByText(/Tap 3\+ matching fruit in the moon's glowing halo/)).toBeVisible();
  await (await moonHint(page)).click();
  await expect.poll(async()=>(await saved(page)).easyGames.moonlight.moves).toBe(1);
  await expect(page.getByRole("status",{name:"Moon phase: Half Moon"})).toBeVisible();
  const state=await saved(page);
  expect(state.easyProgress.harvest).toBe(6001);
  expect(state.easyProgress.meadow).toBe(25);
  expect(state.easyProgress.pumpkin).toBe(16);
  expect(state.collection.pumpkinPrizes).toContain("pumpkin_lantern");
  expect(state.collection.meadowPrizes).toContain("meadow_daisy_wreath");
  expect(state.collection.claimed["harvest:1"]).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.reload();
  await expect(page.getByRole("status",{name:"Moon phase: Half Moon"})).toBeVisible();
  expect((await saved(page)).easyGames.moonlight.moves).toBe(1);
  await context.close();
});
test("Half Moon reaches non-touching fruit two spaces away; Full Moon follows",async({browser})=>{
  const board=Array(EASY_SIZE*EASY_SIZE).fill(1);
  for(const i of [2,14,26])board[i]=0;
  expect(moonlightHarvest(board,14,EASY_SIZE,1)).toEqual([14]);
  expect(moonlightHarvest(board,14,EASY_SIZE,2)).toEqual([2,14,26]);
  const game={...makeLevel("moonlight",2,EASY_SIZE),board,moves:1};
  const {context,page}=await phone(browser,{
    mode:"moonlight",settings:{easy:true,motion:false},
    easyGames:{moonlight:game},easyProgress:{moonlight:2}
  });
  await expect(page.getByRole("status",{name:"Moon phase: Half Moon"})).toBeVisible();
  await page.locator(".tile").nth(14).click();
  await expect.poll(async()=>(await saved(page)).easyGames.moonlight.cleared).toBe(3);
  await expect(page.getByRole("status",{name:"Moon phase: Full Moon"})).toBeVisible();
  expect((await saved(page)).easyGames.moonlight.moves).toBe(2);
  await context.close();
});
test("five moonlit fruit activate stardust without double-counting",async({browser})=>{
  const board=Array(EASY_SIZE*EASY_SIZE).fill(1);
  for(const i of [7,8,9,13,14])board[i]=0;
  const game={...makeLevel("moonlight",5,EASY_SIZE),board};
  const {context,page}=await phone(browser,{
    mode:"moonlight",settings:{easy:true,motion:false},
    easyGames:{moonlight:game},easyProgress:{moonlight:5}
  });
  await page.locator(".tile").nth(14).click();
  await expect.poll(async()=>(await saved(page)).easyGames.moonlight.cleared).toBe(9);
  expect((await saved(page)).easyGames.moonlight.moves).toBe(1);
  expect((await saved(page)).easyProgress.moonlight).toBe(5);
  await context.close();
});
test("Moonlight Level 3 earns Glow Lantern, hides/reloads without disturbing garden",async({browser})=>{
  const game=makeLevel("moonlight",3,EASY_SIZE);
  game.cleared=game.target-1;
  const {context,page}=await phone(browser,{
    mode:"moonlight",settings:{easy:true,highContrast:true,motion:false},
    easyGames:{moonlight:game},easyProgress:{moonlight:3},
    collection:{claimed:{"harvest:1":true},companion:"bunny",
      meadowPrizes:["meadow_daisy_wreath"],pumpkinPrizes:["pumpkin_lantern"]}
  });
  await (await moonHint(page)).click();
  await expect(page.getByRole("heading",{name:"Level 3 Complete!"})).toBeVisible();
  await expect(page.getByRole("button",{name:/Moonlit Glow Lantern/})).toBeVisible();
  const state=await saved(page);
  expect(state.collection.moonlightPrizes).toContain("moonlight_glow_lantern");
  expect(state.collection.pumpkinPrizes).toContain("pumpkin_lantern");
  expect(state.collection.meadowPrizes).toContain("meadow_daisy_wreath");
  expect(state.collection.claimed["harvest:1"]).toBe(true);
  expect(state.easyProgress.moonlight).toBe(4);
  await page.getByRole("button",{name:/Moonlit Glow Lantern/}).click();
  await expect(page.getByRole("heading",{name:"Mom's Happy Garden"})).toBeVisible();
  await expect(page.getByRole("button",{name:/Moonlit Glow Lantern, in garden/})).toBeVisible();
  await page.getByRole("button",{name:/Moonlit Glow Lantern, in garden/}).click();
  expect((await saved(page)).collection.hiddenDecorations).toContain("moonlight_glow_lantern");
  await page.reload();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.locator(".mobile-quickbar").getByRole("button",{name:/Garden/}).click();
  await expect(page.getByRole("button",{name:/Moonlit Glow Lantern, put away/})).toBeVisible();
  await expect(page.getByText(/Pumpkin Patch Rewards/)).toBeVisible();
  await context.close();
});
test("Moonlight Orchard Path marks 3, 6, 9, 12, 15 and 18 as moon rewards",async({browser})=>{
  const {context,page}=await phone(browser,{
    mode:"moonlight",settings:{easy:true,motion:false},
    easyProgress:{moonlight:11}
  });
  await page.getByRole("button",{name:"Open Adventure Path"}).click();
  await expect(page.locator(".trail-moonlight")).toBeVisible();
  await expect(page.getByText("Page 2",{exact:true})).toBeVisible();
  await expect(page.locator(".trail-node .trail-milestone")).toHaveCount(3);
  await page.getByRole("button",{name:/Previous 10/}).click();
  await expect(page.getByRole("button",{name:/Level 3, completed/})).toBeEnabled();
  await expect(page.locator(".trail-node .trail-milestone")).toHaveCount(3);
  await page.getByRole("button",{name:/Next 10/}).click();
  await expect(page.getByRole("button",{name:/Level 12, locked/})).toBeDisabled();
  await context.close();
});
test("switching Orchard and old worlds protects all high-water marks",async({browser})=>{
  const {context,page}=await phone(browser,{
    mode:"meadow",settings:{easy:true,motion:false},
    easyProgress:{harvest:6001,sweets:82,rescue:33,meadow:19,pumpkin:9,moonlight:7},
    collection:{meadowPrizes:["meadow_daisy_wreath"],pumpkinPrizes:["pumpkin_lantern"]}
  });
  await selectMoonlight(page);
  await expect(page.getByRole("heading",{name:"Level 7"})).toBeVisible();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Worlds/}).click();
  await page.getByRole("button",{name:/Harvest Valley/}).click();
  await expect(page.getByRole("heading",{name:"Level 6,001"})).toBeVisible();
  const state=await saved(page);
  expect(state.easyProgress.moonlight).toBe(7);
  expect(state.easyProgress.harvest).toBe(6001);
  expect(state.easyProgress.pumpkin).toBe(9);
  expect(state.easyProgress.meadow).toBe(19);
  expect(state.collection.meadowPrizes).toContain("meadow_daisy_wreath");
  expect(state.collection.pumpkinPrizes).toContain("pumpkin_lantern");
  await context.close();
});
