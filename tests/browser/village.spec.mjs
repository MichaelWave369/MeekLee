import {test,expect} from "@playwright/test";
import {makeLevel,EASY_SIZE} from "../../src/core.js";

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
  await expect(page.getByRole("heading",{name:"Mom's Happy Garden"})).toBeVisible();
  await page.getByRole("button",{name:"Explore Garden Village"}).click();
  await expect(page.getByRole("heading",{name:"Mom's Garden Village"})).toBeVisible();
}
test("320px village is free, fully navigable and preserves the original garden",async({browser})=>{
  const {context,page}=await phone(browser,null,320);
  await openVillage(page);
  await expect(page.locator("[data-village-district]")).toHaveCount(4);
  await expect(page.locator("[data-village-plot]")).toHaveCount(20);
  await expect(page.locator("[data-village-world]")).toHaveCount(8);
  await expect(page.locator("[data-village-porch]")).toHaveCount(1);
  await expect(page.getByText(/Every village begins with a seed/)).toBeVisible();
  const target=await page.locator('[data-village-plot="square:0"]').boundingBox();
  expect(target.width).toBeGreaterThanOrEqual(43);
  expect(target.height).toBeGreaterThanOrEqual(48);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.getByRole("button",{name:"Back to My Garden"}).click();
  await expect(page.getByRole("heading",{name:"Mom's Happy Garden"})).toBeVisible();
  await expect(page.locator(".garden-landscape")).toBeVisible();
  await context.close();
});
test("tap-to-place, move, store and reload treasure without losing ownership or high levels",async({browser})=>{
  const old=makeLevel("harvest",6001,EASY_SIZE);
  const {context,page}=await phone(browser,{
    mode:"harvest",settings:{easy:true,motion:false},
    easyGames:{harvest:old},easyProgress:{harvest:6001},
    collection:{claimed:{"harvest:1":true},companion:"bunny",
      meadowPrizes:["meadow_daisy_wreath"]}
  },320);
  await openVillage(page);
  await expect(page.locator('[data-village-item="sunflower"]')).toBeVisible();
  await page.locator('[data-village-item="sunflower"]').click();
  await page.locator('[data-village-plot="square:0"]').click();
  await expect.poll(async()=>(await saved(page)).collection.villagePlacements.sunflower).toBe("square:0");
  await expect(page.locator('[data-village-plot="square:0"]')).toContainText("Golden Sunflower");
  await page.locator('[data-village-district="meadow"]').click();
  await page.locator('[data-village-plot="meadow:7"]').click();
  await expect.poll(async()=>(await saved(page)).collection.villagePlacements.sunflower).toBe("meadow:7");
  await expect(page.locator('[data-village-plot="meadow:7"]')).toContainText("Golden Sunflower");
  await page.reload();
  await openVillage(page);
  await page.locator('[data-village-district="meadow"]').click();
  await expect(page.locator('[data-village-plot="meadow:7"]')).toContainText("Golden Sunflower");
  await page.locator('[data-village-item="sunflower"]').click();
  await page.locator("[data-village-store]").click();
  await expect.poll(async()=>Object.keys((await saved(page)).collection.villagePlacements).length).toBe(0);
  await expect(page.locator('[data-village-item="sunflower"]')).toBeVisible();
  const state=await saved(page);
  expect(state.easyProgress.harvest).toBe(6001);
  expect(state.collection.claimed["harvest:1"]).toBe(true);
  expect(state.collection.meadowPrizes).toContain("meadow_daisy_wreath");
  expect(state.collection.companion).toBe("bunny");
  await context.close();
});
test("village cannot replace another decoration in an occupied plot",async({browser})=>{
  const {context,page}=await phone(browser,{
    collection:{claimed:{"harvest:1":true},meadowPrizes:["meadow_daisy_wreath"]}
  });
  await openVillage(page);
  await page.locator('[data-village-item="sunflower"]').click();
  await page.locator('[data-village-plot="square:0"]').click();
  await page.locator('[data-village-item="meadow_daisy_wreath"]').click();
  await page.locator('[data-village-plot="square:0"]').click();
  const state=await saved(page);
  expect(state.collection.villagePlacements.sunflower).toBe("square:0");
  expect(state.collection.villagePlacements.meadow_daisy_wreath).toBeUndefined();
  await expect(page.locator('[data-village-plot="square:0"]')).toContainText("Golden Sunflower");
  await page.locator('[data-village-plot="square:1"]').click();
  await expect.poll(async()=>Object.keys((await saved(page)).collection.villagePlacements).length).toBe(2);
  await context.close();
});
test("hidden original garden decoration keeps its location but renders as stored",async({browser})=>{
  const {context,page}=await phone(browser,{
    collection:{claimed:{"harvest:1":true},hiddenDecorations:["sunflower"],
      villagePlacements:{sunflower:"square:0"}}
  });
  await openVillage(page);
  await expect(page.locator('[data-village-item="sunflower"]')).toHaveCount(0);
  const spot=page.locator('[data-village-plot="square:0"]');
  await expect(spot).toContainText("Stored");
  await expect(spot).not.toContainText("Golden Sunflower");
  await spot.click();
  await page.locator("[data-village-store]").click();
  await expect.poll(async()=>Object.keys((await saved(page)).collection.villagePlacements).length).toBe(0);
  expect((await saved(page)).collection.hiddenDecorations).toContain("sunflower");
  await page.getByRole("button",{name:"Back to My Garden"}).click();
  await expect(page.getByRole("button",{name:/Golden Sunflower, put away/})).toBeVisible();
  await context.close();
});
test("village routes to an existing world with its own independent saved progression",async({browser})=>{
  const {context,page}=await phone(browser,{
    mode:"harvest",settings:{easy:true,motion:false},
    easyProgress:{harvest:6001,moonlight:17,kitchen:8},
    collection:{claimed:{"harvest:1":true}}
  });
  await openVillage(page);
  await page.locator('[data-village-world="moonlight"]').click();
  await expect(page.locator(".game-board")).toBeVisible();
  const state=await saved(page);
  expect(state.mode).toBe("moonlight");
  expect(state.easyProgress.harvest).toBe(6001);
  expect(state.easyProgress.moonlight).toBe(17);
  expect(state.easyProgress.kitchen).toBe(8);
  await context.close();
});
test("Family Porch village path opens stored private recipes without publishing anything",async({browser})=>{
  const notes=[{id:"my-recipe",kind:"recipe",title:"Mom's plum jelly",
    body:"Family-only measurements",at:1700000000000,by:"Mom"}];
  const {context,page}=await phone(browser,null,390,notes);
  await openVillage(page);
  await page.locator("[data-village-porch]").click();
  await expect(page.getByRole("heading",{name:"The Family Porch"})).toBeVisible();
  await expect(page.getByText("Mom's plum jelly")).toBeVisible();
  await expect(page.getByText("Family-only measurements")).toBeVisible();
  await expect(page.getByText(/Private notebook for now/)).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("meeklee-family-porch-notes-v1")))).toEqual(notes);
  await context.close();
});
