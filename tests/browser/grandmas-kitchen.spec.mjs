import {test,expect} from "@playwright/test";
import {makeLevel,EASY_SIZE,kitchenNextIngredient,KITCHEN_RECIPES} from "../../src/core.js";

const MAIN_KEY="meeklee-adventures-save-v1";
const PORCH_KEY="meeklee-family-porch-notes-v1";
async function phone(browser,raw=null,width=390,porch=null){
  const context=await browser.newContext({viewport:{width,height:780},
    isMobile:true,hasTouch:true,deviceScaleFactor:2,reducedMotion:"reduce"});
  const page=await context.newPage();
  if(raw||porch)await page.addInitScript(({raw,porch})=>{
    if(raw&&!localStorage.getItem("meeklee-adventures-save-v1"))
      localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify(raw));
    if(porch&&!localStorage.getItem("meeklee-family-porch-notes-v1"))
      localStorage.setItem("meeklee-family-porch-notes-v1",JSON.stringify(porch));
  },{raw,porch});
  await page.goto("./");
  return {context,page};
}
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem("meeklee-adventures-save-v1")));
async function selectKitchen(page){
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Worlds/}).click();
  await page.getByRole("button",{name:/Grandma's Kitchen/}).click();
  await expect(page.getByText("Grandma's Kitchen",{exact:true}).first()).toBeVisible();
}
async function hintIngredient(page){
  await page.getByRole("button",{name:/Free hint/}).click();
  const hint=page.locator(".tile.hint");
  await expect(hint).toHaveCount(1);
  return hint;
}
test("Kitchen appears as eighth world, 320px-safe, and starts an ordered recipe",async({browser})=>{
  const old=makeLevel("harvest",6001,EASY_SIZE);
  const {context,page}=await phone(browser,{
    mode:"harvest",settings:{easy:true,highContrast:true,motion:false},
    easyGames:{harvest:old},easyProgress:{harvest:6001,moonlight:13,pumpkin:21},
    collection:{claimed:{"harvest:1":true},companion:"bunny",
      moonlightPrizes:["moonlight_glow_lantern"],pumpkinPrizes:["pumpkin_lantern"]}
  },320);
  await selectKitchen(page);
  await expect(page.locator(".tile")).toHaveCount(36);
  await expect(page.getByRole("region",{name:/Kitchen recipe:/})).toBeVisible();
  await expect(page.locator(".kitchen-step")).toHaveCount(3);
  await expect(page.locator(".kitchen-step.next")).toHaveCount(1);
  await expect(page.getByText(/Find the next recipe ingredient in order/)).toBeVisible();
  await (await hintIngredient(page)).click();
  await expect.poll(async()=>(await saved(page)).easyGames.kitchen.moves).toBe(1);
  await expect(page.locator(".kitchen-step.gathered")).toHaveCount(1);
  const state=await saved(page);
  expect(state.easyProgress.harvest).toBe(6001);
  expect(state.easyProgress.pumpkin).toBe(21);
  expect(state.easyProgress.moonlight).toBe(13);
  expect(state.collection.claimed["harvest:1"]).toBe(true);
  expect(state.collection.moonlightPrizes).toContain("moonlight_glow_lantern");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.reload();
  await expect(page.locator(".kitchen-step.gathered")).toHaveCount(1);
  expect((await saved(page)).easyGames.kitchen.moves).toBe(1);
  await context.close();
});
test("wrong ingredient does not count and three correct taps finish a dish",async({browser})=>{
  const g=makeLevel("kitchen",2,EASY_SIZE);
  const {context,page}=await phone(browser,{
    mode:"kitchen",settings:{easy:true,motion:false},
    easyGames:{kitchen:g},easyProgress:{kitchen:2}
  });
  const before=await saved(page);
  const needed=kitchenNextIngredient(before.easyGames.kitchen);
  const wrong=before.easyGames.kitchen.board.findIndex(x=>x!==needed);
  await page.locator(".tile").nth(wrong).click();
  expect((await saved(page)).easyGames.kitchen.moves).toBe(0);
  await expect(page.getByText(/Look at the next ingredient/)).toBeVisible();
  for(let i=1;i<=3;i++){
    await (await hintIngredient(page)).click();
    await expect.poll(async()=>(await saved(page)).easyGames.kitchen.moves).toBe(i);
  }
  const after=await saved(page);
  expect(after.easyGames.kitchen.dishes).toBe(1);
  expect(after.easyGames.kitchen.recipeStep).toBe(0);
  expect(after.easyGames.kitchen.score).toBe(260);
  await expect(page.locator(".kitchen-step.gathered")).toHaveCount(0);
  await context.close();
});
test("private notebook opens directly, with old recipes intact and no public sharing",async({browser})=>{
  const original=[{id:"recipe-mom",kind:"recipe",title:"Grandma's apple cake",
    body:"Family-only ingredient notes",by:"Mom",at:1700000000000}];
  const game=makeLevel("kitchen",7,EASY_SIZE);
  const {context,page}=await phone(browser,{
    mode:"kitchen",settings:{easy:true,motion:false},
    easyGames:{kitchen:game},easyProgress:{kitchen:7}
  },390,original);
  await page.getByRole("button",{name:/My Private Family Recipes/}).click();
  await expect(page.getByRole("heading",{name:"The Family Porch"})).toBeVisible();
  await expect(page.getByText("Grandma's apple cake")).toBeVisible();
  await expect(page.getByText("Family-only ingredient notes")).toBeVisible();
  await expect(page.getByText(/Private notebook for now/)).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("meeklee-family-porch-notes-v1")))).toEqual(original);
  expect((await saved(page)).easyGames.kitchen.recipeId).toBe(game.recipeId);
  await context.close();
});
test("Level 3 gives Herb Basket, can hide it, and preserves old prizes on reload",async({browser})=>{
  const game=makeLevel("kitchen",3,EASY_SIZE);
  game.cleared=game.target-1;
  const {context,page}=await phone(browser,{
    mode:"kitchen",settings:{easy:true,highContrast:true,motion:false},
    easyGames:{kitchen:game},easyProgress:{kitchen:3},
    collection:{claimed:{"harvest:1":true},companion:"bunny",
      meadowPrizes:["meadow_daisy_wreath"],pumpkinPrizes:["pumpkin_lantern"],
      moonlightPrizes:["moonlight_glow_lantern"]}
  });
  await (await hintIngredient(page)).click();
  await expect(page.getByRole("heading",{name:"Level 3 Complete!"})).toBeVisible();
  await expect(page.getByRole("button",{name:/Grandma's Herb Basket/})).toBeVisible();
  let state=await saved(page);
  expect(state.collection.kitchenPrizes).toContain("kitchen_herb_basket");
  expect(state.collection.pumpkinPrizes).toContain("pumpkin_lantern");
  expect(state.collection.claimed["harvest:1"]).toBe(true);
  expect(state.easyProgress.kitchen).toBe(4);
  await page.getByRole("button",{name:/Grandma's Herb Basket/}).click();
  await expect(page.getByRole("heading",{name:"Mom's Happy Garden"})).toBeVisible();
  await expect(page.getByRole("button",{name:/Grandma's Herb Basket, in garden/})).toBeVisible();
  await page.getByRole("button",{name:/Grandma's Herb Basket, in garden/}).click();
  expect((await saved(page)).collection.hiddenDecorations).toContain("kitchen_herb_basket");
  await page.reload();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.locator(".mobile-quickbar").getByRole("button",{name:/Garden/}).click();
  await expect(page.getByRole("button",{name:/Grandma's Herb Basket, put away/})).toBeVisible();
  await expect(page.getByText(/Moonlight Orchard Rewards/)).toBeVisible();
  await context.close();
});
test("Kitchen Adventure Path marks the six recipe reward milestones",async({browser})=>{
  const {context,page}=await phone(browser,{
    mode:"kitchen",settings:{easy:true,motion:false},easyProgress:{kitchen:11}
  });
  await page.getByRole("button",{name:"Open Adventure Path"}).click();
  await expect(page.locator(".trail-kitchen")).toBeVisible();
  await expect(page.getByText("Page 2",{exact:true})).toBeVisible();
  await expect(page.locator(".trail-node .trail-milestone")).toHaveCount(3);
  await page.getByRole("button",{name:/Previous 10/}).click();
  await expect(page.getByRole("button",{name:/Level 3, completed/})).toBeEnabled();
  await expect(page.locator(".trail-node .trail-milestone")).toHaveCount(3);
  await page.getByRole("button",{name:/Next 10/}).click();
  await expect(page.getByRole("button",{name:/Level 12, locked/})).toBeDisabled();
  await context.close();
});
test("switching Kitchen to Harvest does not reset older worlds' saved progress",async({browser})=>{
  const {context,page}=await phone(browser,{
    mode:"moonlight",settings:{easy:true,motion:false},
    easyProgress:{harvest:6001,sweets:82,rescue:33,meadow:19,
      pumpkin:15,moonlight:10,kitchen:7},
    collection:{moonlightPrizes:["moonlight_glow_lantern"]}
  });
  await selectKitchen(page);
  await expect(page.getByRole("heading",{name:"Level 7"})).toBeVisible();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Worlds/}).click();
  await page.getByRole("button",{name:/Harvest Valley/}).click();
  await expect(page.getByRole("heading",{name:"Level 6,001"})).toBeVisible();
  const state=await saved(page);
  expect(state.easyProgress.kitchen).toBe(7);
  expect(state.easyProgress.harvest).toBe(6001);
  expect(state.easyProgress.moonlight).toBe(10);
  expect(state.easyProgress.pumpkin).toBe(15);
  await context.close();
});
