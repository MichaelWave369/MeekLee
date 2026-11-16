import {test,expect} from "@playwright/test";
import {makeLevel,EASY_SIZE,connectedBouquet} from "../../src/core.js";

const KEY="meeklee-adventures-save-v1";
async function phone(browser,raw=null,width=390){
  const context=await browser.newContext({viewport:{width,height:780},
    isMobile:true,hasTouch:true,deviceScaleFactor:2,reducedMotion:"reduce"});
  const page=await context.newPage();
  if(raw)await page.addInitScript(payload=>{
    if(!localStorage.getItem("meeklee-adventures-save-v1"))
      localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify(payload));
  },raw);
  await page.goto("./");
  return {context,page};
}
const saved=page=>page.evaluate(()=>
  JSON.parse(localStorage.getItem("meeklee-adventures-save-v1")));
async function selectMeadow(page){
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Worlds/}).click();
  await page.getByRole("button",{name:/Flower Meadow/}).click();
  await expect(page.getByText("Flower Meadow",{exact:true}).first()).toBeVisible();
}
async function flowerHint(page){
  await page.getByRole("button",{name:/Free hint/}).click();
  const hint=page.locator(".tile.hint");
  expect(await hint.count()).toBeGreaterThanOrEqual(3);
  return hint;
}
test("Flower Meadow appears as a fifth world on 320px phone with unique rules",async({browser})=>{
  const old=makeLevel("harvest",6001,EASY_SIZE);
  const {context,page}=await phone(browser,{
    mode:"harvest",settings:{easy:true,highContrast:true,motion:false},
    easyGames:{harvest:old},easyProgress:{harvest:6001},
    collection:{claimed:{"harvest:1":true},companion:"bunny"}
  },320);
  await selectMeadow(page);
  await expect(page.locator(".tile")).toHaveCount(36);
  await expect(page.getByText(/Tap bouquets of 3/)).toBeVisible();
  const hint=await flowerHint(page);
  await hint.first().click();
  await expect.poll(async()=>(await saved(page)).easyGames.meadow.moves).toBe(1);
  const state=await saved(page);
  expect(state.easyProgress.harvest).toBe(6001);
  expect(state.collection.companion).toBe("bunny");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.reload();
  await expect(page.getByText("Flower Meadow",{exact:true}).first()).toBeVisible();
  expect((await saved(page)).easyGames.meadow.moves).toBe(1);
  await context.close();
});

test("a completed Meadow Level 3 awards Daisy Wreath, plants it and persists reward",async({browser})=>{
  const game=makeLevel("meadow",3,EASY_SIZE);
  game.cleared=game.target-1;
  const raw={
    mode:"meadow",settings:{easy:true,highContrast:true,motion:false},
    easyGames:{meadow:game},easyProgress:{meadow:3},
    collection:{claimed:{"harvest:1":true},companion:"bunny"}
  };
  const {context,page}=await phone(browser,raw);
  await (await flowerHint(page)).first().click();
  await expect(page.getByRole("heading",{name:"Level 3 Complete!"})).toBeVisible();
  await expect(page.getByRole("button",{name:/Daisy Wreath/})).toBeVisible();
  let state=await saved(page);
  expect(state.collection.meadowPrizes).toContain("meadow_daisy_wreath");
  expect(state.easyProgress.meadow).toBe(4);
  expect(state.collection.claimed["harvest:1"]).toBe(true);
  await page.getByRole("button",{name:/Daisy Wreath/}).click();
  await expect(page.getByRole("heading",{name:"Mom's Happy Garden"})).toBeVisible();
  await expect(page.getByRole("button",{name:/Daisy Wreath, in garden/})).toBeVisible();
  await page.getByRole("button",{name:/Daisy Wreath, in garden/}).click();
  expect((await saved(page)).collection.hiddenDecorations).toContain("meadow_daisy_wreath");
  await page.reload();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Garden/}).click();
  await expect(page.getByRole("button",{name:/Daisy Wreath, put away/})).toBeVisible();
  await context.close();
});

test("Meadow Adventure Path marks six flower reward milestones",async({browser})=>{
  const {context,page}=await phone(browser,{
    mode:"meadow",settings:{easy:true,motion:false},
    easyProgress:{meadow:11}
  });
  await page.getByRole("button",{name:"Open Adventure Path"}).click();
  await expect(page.getByRole("heading",{name:"Adventure Path"})).toBeVisible();
  await expect(page.locator(".trail-meadow")).toBeVisible();
  await expect(page.locator(".trail-node .trail-milestone")).toHaveCount(3);
  await expect(page.getByRole("button",{name:/Level 3, completed/})).toBeEnabled();
  await page.getByRole("button",{name:/Next 10/}).click();
  await expect(page.locator(".trail-node .trail-milestone")).toHaveCount(3);
  await expect(page.getByRole("button",{name:/Level 12, locked/})).toBeDisabled();
  await context.close();
});

test("switching between Flower Meadow and the original worlds preserves independent progress",async({browser})=>{
  const {context,page}=await phone(browser,{
    mode:"harvest",settings:{easy:true,motion:false},
    easyProgress:{harvest:6001,sweets:82,rescue:33,meadow:7}
  },390);
  await selectMeadow(page);
  await expect(page.getByRole("heading",{name:"Level 7"})).toBeVisible();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Worlds/}).click();
  await page.getByRole("button",{name:/Harvest Valley/}).click();
  await expect(page.getByRole("heading",{name:"Level 6,001"})).toBeVisible();
  const state=await saved(page);
  expect(state.easyProgress.meadow).toBe(7);
  expect(state.easyProgress.harvest).toBe(6001);
  expect(state.easyProgress.sweets).toBe(82);
  expect(state.easyProgress.rescue).toBe(33);
  await context.close();
});
