import {test,expect} from "@playwright/test";
import {makeLevel,EASY_SIZE} from "../../src/core.js";
import {gardenInventory} from "../../src/collection.js";

async function phone(browser,raw=null,width=390){
  const context=await browser.newContext({
    viewport:{width,height:780},isMobile:true,hasTouch:true,
    deviceScaleFactor:2,reducedMotion:"reduce"
  });
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
async function openVillage(page){
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Garden/}).click();
  await page.getByRole("button",{name:"Explore Garden Village"}).click();
  await expect(page.getByRole("heading",{name:"Mom's Garden Village"})).toBeVisible();
}
async function district(page,id){
  await page.locator('[data-village-district="'+id+'"]').click();
  await expect(page.locator('[data-village-activity="'+id+'"]')).toBeVisible();
}
async function choose(page,i){
  await page.locator('[data-village-activity-choice="'+i+'"]').click();
}
test("fountain is a playable three-step activity at 320px, with no wrong-tap penalty",async({browser})=>{
  const {context,page}=await phone(browser,null,320);
  await openVillage(page);
  await expect(page.getByRole("heading",{name:/Fountain Ripples/})).toBeVisible();
  await expect(page.locator(".village-activity-choices button")).toHaveCount(3);
  await expect(page.getByText(/Find the Water Drop/)).toBeVisible();
  await choose(page,1);
  await expect(page.locator("[data-village-activity-feedback]")).toContainText("Try the Water Drop");
  let state=await saved(page);
  expect(state.collection.villageLife.square.step).toBe(0);
  expect(state.collection.villageLife.square.rounds).toBe(0);
  await choose(page,0);
  await expect.poll(async()=>(await saved(page)).collection.villageLife.square.step).toBe(1);
  await expect(page.getByText(/Find the Bubbly Ripple/)).toBeVisible();
  await choose(page,2);
  await expect.poll(async()=>(await saved(page)).collection.villageLife.square.step).toBe(2);
  await choose(page,1);
  await expect.poll(async()=>(await saved(page)).collection.villageLife.square.rounds).toBe(1);
  await expect(page.locator("[data-village-activity-feedback]")).toContainText("fountain dances");
  await expect(page.getByText(/Find the Bubbly Ripple/)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const button=await page.locator(".village-activity-choices button").first().boundingBox();
  expect(button.height).toBeGreaterThanOrEqual(70);
  expect(button.width).toBeGreaterThanOrEqual(65);
  await page.reload();
  await openVillage(page);
  await expect(page.getByText(/1 round finished/)).toBeVisible();
  await expect(page.getByText(/Find the Bubbly Ripple/)).toBeVisible();
  await context.close();
});
test("each neighborhood offers its own easy three-step mini-activity and remembers rounds separately",async({browser})=>{
  const {context,page}=await phone(browser,{
    collection:{villageLife:{square:{rounds:2,step:1}}}
  });
  await openVillage(page);
  const games=[
    {id:"meadow",name:"Butterfly Watch",choices:[0,1,2]},
    {id:"orchard",name:"Fruit Basket",choices:[0,2,1]},
    {id:"pond",name:"Duck Parade",choices:[1,0,2]}
  ];
  for(const g of games){
    await district(page,g.id);
    await expect(page.getByRole("heading",{name:new RegExp(g.name)})).toBeVisible();
    for(const option of g.choices)await choose(page,option);
    await expect.poll(async()=>(await saved(page)).collection.villageLife[g.id].rounds).toBe(1);
  }
  const state=await saved(page);
  expect(state.collection.villageLife.square).toEqual({rounds:2,step:1});
  expect(state.collection.villageLife.meadow).toEqual({rounds:1,step:0});
  expect(state.collection.villageLife.orchard).toEqual({rounds:1,step:0});
  expect(state.collection.villageLife.pond).toEqual({rounds:1,step:0});
  await page.reload();
  await openVillage(page);
  await district(page,"pond");
  await expect(page.getByText(/1 round finished/)).toBeVisible();
  await context.close();
});
test("only rescued pets can visit, waving has no effect on collections, chosen pet or saves",async({browser})=>{
  const claimed={"harvest:1":true,"sweets:1":true,"rescue:1":true,"bubbles:1":true};
  const {context,page}=await phone(browser,{
    mode:"harvest",
    collection:{claimed,companion:"bunny"}
  });
  await openVillage(page);
  const initial=await saved(page);
  const unlocked=gardenInventory(initial.collection).pets;
  expect(unlocked.length).toBeGreaterThanOrEqual(3);
  const visitors=page.locator("[data-village-visitor]");
  await expect(visitors).toHaveCount(2);
  const visitorIds=await visitors.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-village-visitor")));
  expect(visitorIds).not.toContain("bunny");
  expect(visitorIds.every(id=>unlocked.some(p=>p.id===id))).toBe(true);
  await visitors.first().click();
  await expect(page.getByText(/waves hello/)).toBeVisible();
  const state=await saved(page);
  expect(state.collection.claimed).toEqual(initial.collection.claimed);
  expect(state.collection.companion).toBe("bunny");
  expect(state.collection.villageLife).toEqual(initial.collection.villageLife);
  const previousVisitors=visitorIds;
  for(const i of [0,2,1])await choose(page,i);
  await expect.poll(async()=>(await saved(page)).collection.villageLife.square.rounds).toBe(1);
  const newerVisitors=await visitors.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-village-visitor")));
  expect(newerVisitors).not.toEqual(previousVisitors);
  await context.close();
});
test("new households do not receive invented rescue pets for visiting",async({browser})=>{
  const {context,page}=await phone(browser);
  await openVillage(page);
  await expect(page.locator("[data-village-visitor]")).toHaveCount(0);
  await expect(page.getByText(/birds are visiting/)).toBeVisible();
  await context.close();
});
test("village activities do not disturb Mom's old level 6001, planted ornaments or FreeCell",async({browser})=>{
  const original=makeLevel("harvest",6001,EASY_SIZE);
  const {context,page}=await phone(browser,{
    mode:"harvest",settings:{easy:true,motion:false},
    easyGames:{harvest:original},easyProgress:{harvest:6001},
    collection:{
      claimed:{"harvest:1":true},
      companion:"bunny",
      villagePlacements:{sunflower:"square:0"},
      villageLife:{pond:{rounds:5,step:1}},
      meadowPrizes:["meadow_daisy_wreath"]
    }
  },320);
  await openVillage(page);
  await district(page,"pond");
  await expect(page.getByText(/Step 2 of 3/)).toBeVisible();
  await expect(page.getByText(/Find the Duckling/)).toBeVisible();
  await choose(page,1);
  await expect.poll(async()=>(await saved(page)).collection.villageLife.pond.step).toBe(2);
  const state=await saved(page);
  expect(state.easyProgress.harvest).toBe(6001);
  expect(state.easyGames.harvest).toEqual(original);
  expect(state.collection.villagePlacements).toEqual({sunflower:"square:0"});
  expect(state.collection.claimed["harvest:1"]).toBe(true);
  expect(state.collection.meadowPrizes).toContain("meadow_daisy_wreath");
  expect(state.collection.companion).toBe("bunny");
  await page.reload();
  await openVillage(page);
  await district(page,"pond");
  await expect(page.getByText(/Step 3 of 3/)).toBeVisible();
  await context.close();
});
