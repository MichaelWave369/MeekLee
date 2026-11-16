import {test,expect} from "@playwright/test";
import {makeLevel,EASY_SIZE,pumpkinHarvest} from "../../src/core.js";

async function openPhone(browser,raw=null,width=390){
  const context=await browser.newContext({viewport:{width,height:780},
    isMobile:true,hasTouch:true,deviceScaleFactor:2,reducedMotion:"reduce"});
  const page=await context.newPage();
  if(raw)await page.addInitScript(saved=>{
    if(!localStorage.getItem("meeklee-adventures-save-v1"))
      localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify(saved));
  },raw);
  await page.goto("./");
  return {context,page};
}
const saved=page=>page.evaluate(()=>
  JSON.parse(localStorage.getItem("meeklee-adventures-save-v1")));
async function selectPumpkin(page){
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Worlds/}).click();
  await page.getByRole("button",{name:/Pumpkin Patch/}).click();
  await expect(page.getByText("Pumpkin Patch",{exact:true}).first()).toBeVisible();
}
async function harvestHint(page){
  await page.getByRole("button",{name:/Free hint/}).click();
  const hinted=page.locator(".tile.hint");
  await expect(hinted).toHaveCount(1);
  return hinted;
}
test("Pumpkin Patch is sixth world and tap harvest works at 320px with saved high levels",async({browser})=>{
  const old=makeLevel("harvest",6001,EASY_SIZE);
  const {context,page}=await openPhone(browser,{
    mode:"harvest",settings:{easy:true,highContrast:true,motion:false},
    easyGames:{harvest:old},easyProgress:{harvest:6001,meadow:25},
    collection:{claimed:{"harvest:1":true},companion:"bunny",
      meadowPrizes:["meadow_daisy_wreath"]}
  },320);
  await selectPumpkin(page);
  await expect(page.locator(".tile")).toHaveCount(36);
  await expect(page.getByText(/Tap 3\+ matching crops in a row-and-column cross/)).toBeVisible();
  await (await harvestHint(page)).click();
  await expect.poll(async()=>(await saved(page)).easyGames.pumpkin.moves).toBe(1);
  const state=await saved(page);
  expect(state.easyProgress.harvest).toBe(6001);
  expect(state.easyProgress.meadow).toBe(25);
  expect(state.collection.claimed["harvest:1"]).toBe(true);
  expect(state.collection.meadowPrizes).toContain("meadow_daisy_wreath");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.reload();
  await expect(page.getByText("Pumpkin Patch",{exact:true}).first()).toBeVisible();
  expect((await saved(page)).easyGames.pumpkin.moves).toBe(1);
  await context.close();
});
test("five pumpkins in one cross trigger extra leaf gust and 9 collected crops",async({browser})=>{
  const board=Array(EASY_SIZE*EASY_SIZE).fill(1);
  for(const i of [7,9,10,19,31])board[i]=0;
  const fixture={...makeLevel("pumpkin",5,EASY_SIZE),board};
  expect(pumpkinHarvest(board,7,EASY_SIZE).length).toBe(5);
  const {context,page}=await openPhone(browser,{
    mode:"pumpkin",settings:{easy:true,motion:false},
    easyGames:{pumpkin:fixture},easyProgress:{pumpkin:5}
  });
  await page.locator(".tile").nth(7).click();
  await expect.poll(async()=>(await saved(page)).easyGames.pumpkin.cleared).toBe(9);
  expect((await saved(page)).easyGames.pumpkin.moves).toBe(1);
  expect((await saved(page)).easyProgress.pumpkin).toBe(5);
  await context.close();
});
test("Pumpkin Level 3 earns lantern, may be hidden and reloaded without losing old chests",async({browser})=>{
  const game=makeLevel("pumpkin",3,EASY_SIZE);
  game.cleared=game.target-1;
  const {context,page}=await openPhone(browser,{
    mode:"pumpkin",settings:{easy:true,highContrast:true,motion:false},
    easyGames:{pumpkin:game},easyProgress:{pumpkin:3},
    collection:{claimed:{"harvest:1":true},companion:"bunny",
      meadowPrizes:["meadow_daisy_wreath"]}
  });
  await (await harvestHint(page)).click();
  await expect(page.getByRole("heading",{name:"Level 3 Complete!"})).toBeVisible();
  await expect(page.getByRole("button",{name:/Autumn Pumpkin Lantern/})).toBeVisible();
  const before=await saved(page);
  expect(before.collection.pumpkinPrizes).toContain("pumpkin_lantern");
  expect(before.collection.meadowPrizes).toContain("meadow_daisy_wreath");
  expect(before.collection.claimed["harvest:1"]).toBe(true);
  expect(before.easyProgress.pumpkin).toBe(4);
  await page.getByRole("button",{name:/Autumn Pumpkin Lantern/}).click();
  await expect(page.getByRole("heading",{name:"Mom's Happy Garden"})).toBeVisible();
  await expect(page.getByRole("button",{name:/Autumn Pumpkin Lantern, in garden/})).toBeVisible();
  await page.getByRole("button",{name:/Autumn Pumpkin Lantern, in garden/}).click();
  expect((await saved(page)).collection.hiddenDecorations).toContain("pumpkin_lantern");
  await page.reload();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.locator(".mobile-quickbar").getByRole("button",{name:/Garden/}).click();
  await expect(page.getByRole("button",{name:/Autumn Pumpkin Lantern, put away/})).toBeVisible();
  await expect(page.getByText(/Flower Meadow Rewards/)).toBeVisible();
  expect((await saved(page)).collection.claimed["harvest:1"]).toBe(true);
  await context.close();
});
test("Pumpkin Adventure Path has six garden milestones on the first two pages",async({browser})=>{
  const {context,page}=await openPhone(browser,{
    mode:"pumpkin",settings:{easy:true,motion:false},easyProgress:{pumpkin:11}
  });
  await page.getByRole("button",{name:"Open Adventure Path"}).click();
  await expect(page.locator(".trail-pumpkin")).toBeVisible();
  await expect(page.getByText("Page 2",{exact:true})).toBeVisible();
  await expect(page.locator(".trail-node .trail-milestone")).toHaveCount(3);
  await page.getByRole("button",{name:/Previous 10/}).click();
  await expect(page.getByRole("button",{name:/Level 3, completed/})).toBeEnabled();
  await expect(page.locator(".trail-node .trail-milestone")).toHaveCount(3);
  await page.getByRole("button",{name:/Next 10/}).click();
  await expect(page.getByRole("button",{name:/Level 12, locked/})).toBeDisabled();
  await context.close();
});
test("switching worlds preserves Meadow, FreeCell and old Harvest high-water marks",async({browser})=>{
  const {context,page}=await openPhone(browser,{
    mode:"meadow",settings:{easy:true,motion:false},
    easyProgress:{harvest:6001,sweets:82,rescue:33,meadow:19,pumpkin:9},
    collection:{meadowPrizes:["meadow_daisy_wreath"]}
  });
  await selectPumpkin(page);
  await expect(page.getByRole("heading",{name:"Level 9"})).toBeVisible();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Worlds/}).click();
  await page.getByRole("button",{name:/Harvest Valley/}).click();
  await expect(page.getByRole("heading",{name:"Level 6,001"})).toBeVisible();
  const state=await saved(page);
  expect(state.easyProgress.pumpkin).toBe(9);
  expect(state.easyProgress.harvest).toBe(6001);
  expect(state.easyProgress.meadow).toBe(19);
  expect(state.easyProgress.sweets).toBe(82);
  expect(state.collection.meadowPrizes).toContain("meadow_daisy_wreath");
  await context.close();
});
