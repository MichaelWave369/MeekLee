import {test,expect} from "@playwright/test";
import {makeLevel,EASY_SIZE} from "../../src/core.js";
import {gardenInventory} from "../../src/collection.js";

const MAIN_KEY="meeklee-adventures-save-v1";
const PORCH_KEY="meeklee-family-porch-notes-v1";
async function phone(browser,raw=null,width=390,notes=null){
  const context=await browser.newContext({
    viewport:{width,height:780},isMobile:true,hasTouch:true,
    deviceScaleFactor:2,reducedMotion:"reduce"
  });
  const page=await context.newPage();
  if(raw||notes)await page.addInitScript(({raw,notes})=>{
    if(raw&&!localStorage.getItem("meeklee-adventures-save-v1"))
      localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify(raw));
    if(notes&&!localStorage.getItem("meeklee-family-porch-notes-v1"))
      localStorage.setItem("meeklee-family-porch-notes-v1",JSON.stringify(notes));
  },{raw,notes});
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
async function tapStroll(page){
  await page.locator("[data-village-stroll]").click();
}
test("320px: stroll route, no invented pets, fountain scenery and saved progress",async({browser})=>{
  const {context,page}=await phone(browser,{settings:{easy:true,motion:false}},320);
  await openVillage(page);
  await expect(page.locator("[data-village-walk-stop]")).toHaveCount(4);
  await expect(page.locator("[data-village-walk-stop].current")).toHaveCount(1);
  await expect(page.locator('[data-village-walk-stop="square"].current')).toBeVisible();
  await expect(page.locator("[data-village-stroll]")).toContainText("Flower Lane");
  await expect(page.locator("[data-village-walk-status]")).toContainText("wild birds");
  await expect(page.locator("[data-village-visitor]")).toHaveCount(0);
  await page.locator('[data-village-landmark="square"]').click();
  await expect(page.locator("[data-village-landmark-feedback]")).toContainText("fountain splash");
  await expect.poll(async()=>(await saved(page)).collection.villageWander.scenery.square).toBe(1);
  await tapStroll(page);
  await expect(page.locator('[data-village-walk-stop="meadow"].current')).toBeVisible();
  await expect(page.locator(".village-scene-meadow")).toBeVisible();
  await expect.poll(async()=>(await saved(page)).collection.villageWander.step).toBe(1);
  await expect(page.locator("[data-village-stroll]")).toContainText("Orchard Hill");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const button=await page.locator("[data-village-stroll]").boundingBox();
  expect(button.height).toBeGreaterThanOrEqual(44);
  await page.reload();
  await openVillage(page);
  await expect(page.locator('[data-village-walk-stop="meadow"].current')).toBeVisible();
  await expect(page.locator("[data-village-walk-status]")).toContainText("Flower Lane");
  await page.locator('[data-village-district="square"]').click();
  await expect(page.locator("[data-village-landmark-feedback]")).toContainText("fountain splash");
  expect((await saved(page)).collection.villageWander.scenery.square).toBe(1);
  await context.close();
});
test("only real rescued pets walk, they rotate after a lap without altering companion ownership",async({browser})=>{
  const claimed={"harvest:1":true,"sweets:1":true,"rescue:1":true,"bubbles:1":true};
  const {context,page}=await phone(browser,{
    settings:{easy:true,motion:false},
    collection:{claimed,companion:"bunny",villagePlacements:{sunflower:"square:0"}}
  });
  await openVillage(page);
  const initial=await saved(page);
  const owned=gardenInventory(initial.collection).pets;
  const crew=page.locator(".village-walking-crew span");
  await expect(crew).toHaveCount(2);
  const names=await crew.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("aria-label")));
  expect(names.every(name=>owned.some(p=>p.name===name&&p.id!=="bunny"))).toBe(true);
  for(const nextArea of ["meadow","orchard","pond","square"]){
    await tapStroll(page);
    await expect(page.locator('[data-village-walk-stop="'+nextArea+'"].current')).toBeVisible();
  }
  await expect.poll(async()=>(await saved(page)).collection.villageWander.step).toBe(4);
  const nextNames=await crew.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("aria-label")));
  expect(nextNames).not.toEqual(names);
  expect(nextNames.every(name=>owned.some(p=>p.name===name&&p.id!=="bunny"))).toBe(true);
  const after=await saved(page);
  expect(after.collection.claimed).toEqual(initial.collection.claimed);
  expect(after.collection.companion).toBe("bunny");
  expect(after.collection.villagePlacements).toEqual(initial.collection.villagePlacements);
  expect(after.collection.villageLife).toEqual(initial.collection.villageLife);
  await context.close();
});
test("each neighborhood landmark cycles through three stories, with separate saved counters",async({browser})=>{
  const {context,page}=await phone(browser);
  await openVillage(page);
  const activities=[
    ["square","fountain splash","handful of stars","Soft ripples"],
    ["meadow","butterfly drifts","Fresh blossoms","friendly bee"],
    ["orchard","leaves rustle","An apple","trees sway"],
    ["pond","pond shimmers","duck paddles","lily opens"]
  ];
  for(const [district,first,second,third] of activities){
    await page.locator('[data-village-district="'+district+'"]').click();
    const landmark=page.locator('[data-village-landmark="'+district+'"]');
    await landmark.click();
    await expect(page.locator("[data-village-landmark-feedback]")).toContainText(first);
    await landmark.click();
    await expect(page.locator("[data-village-landmark-feedback]")).toContainText(second);
    await landmark.click();
    await expect(page.locator("[data-village-landmark-feedback]")).toContainText(third);
    await expect.poll(async()=>(await saved(page)).collection.villageWander.scenery[district]).toBe(3);
  }
  await page.reload();
  await openVillage(page);
  for(const [district] of activities){
    await page.locator('[data-village-district="'+district+'"]').click();
    await expect(page.locator("[data-village-landmark-feedback]")).toBeVisible();
    expect((await saved(page)).collection.villageWander.scenery[district]).toBe(3);
  }
  await context.close();
});
test("tapping a walking stop visits the area but never moves the saved visitors",async({browser})=>{
  const {context,page}=await phone(browser,{collection:{villageWander:{step:2}}},320);
  await openVillage(page);
  await expect(page.locator('[data-village-walk-stop="orchard"].current')).toBeVisible();
  await page.locator('[data-village-walk-stop="pond"]').click();
  await expect(page.locator(".village-scene-pond")).toBeVisible();
  expect((await saved(page)).collection.villageWander.step).toBe(2);
  await page.locator('[data-village-landmark="pond"]').click();
  await expect(page.locator("[data-village-landmark-feedback]")).toContainText("pond shimmers");
  expect((await saved(page)).collection.villageWander.step).toBe(2);
  await context.close();
});
test("strolls preserve old level 6001, ornament plots, kitchen and private Family Porch notes",async({browser})=>{
  const harvest=makeLevel("harvest",6001,EASY_SIZE);
  const notes=[{id:"grandmas-story",kind:"story",title:"The Old Farmhouse",
    body:"A memory kept only on this device",at:1700000000000,by:"Mom"}];
  const {context,page}=await phone(browser,{
    mode:"harvest",settings:{easy:true,motion:false},
    easyGames:{harvest},easyProgress:{harvest:6001,kitchen:18},
    collection:{
      claimed:{"harvest:1":true},companion:"bunny",
      hiddenDecorations:["sunflower"],villagePlacements:{sunflower:"square:0"},
      villageLife:{pond:{rounds:11,step:1}},
      villageWander:{step:3,scenery:{square:2,orchard:4}},
      kitchenPrizes:["kitchen_herb_basket"]
    }
  },320,notes);
  await openVillage(page);
  await tapStroll(page);
  await page.locator('[data-village-landmark="square"]').click();
  const state=await saved(page);
  expect(state.easyProgress.harvest).toBe(6001);
  expect(state.easyProgress.kitchen).toBe(18);
  expect(state.easyGames.harvest).toEqual(harvest);
  expect(state.collection.villagePlacements).toEqual({sunflower:"square:0"});
  expect(state.collection.hiddenDecorations).toContain("sunflower");
  expect(state.collection.kitchenPrizes).toContain("kitchen_herb_basket");
  expect(state.collection.villageLife.pond).toEqual({rounds:11,step:1});
  expect(state.collection.villageWander.step).toBe(4);
  expect(state.collection.villageWander.scenery.square).toBe(3);
  await page.locator("[data-village-porch]").click();
  await expect(page.getByRole("heading",{name:"The Family Porch"})).toBeVisible();
  await expect(page.getByText("The Old Farmhouse")).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("meeklee-family-porch-notes-v1")))).toEqual(notes);
  await context.close();
});
