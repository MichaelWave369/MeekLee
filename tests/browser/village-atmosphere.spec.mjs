import {test,expect} from "@playwright/test";
import {makeLevel,EASY_SIZE} from "../../src/core.js";
import {newFreeCell} from "../../src/freecell.js";

async function phone(browser,raw=null,width=390,notes=null,motion="reduce"){
  const context=await browser.newContext({
    viewport:{width,height:780},isMobile:true,hasTouch:true,
    deviceScaleFactor:2,reducedMotion:motion
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
const sky=(page,when)=>page.locator('[data-village-sky="'+when+'"]');
const scene=page=>page.locator("[data-village-scene-time]");
test("320px Day is the safe default with no lights, big controls and no unexpected glow",async({browser})=>{
  const {context,page}=await phone(browser,null,320);
  await openVillage(page);
  await expect(page.locator("[data-village-sky]")).toHaveCount(3);
  await expect(sky(page,"day")).toHaveAttribute("aria-pressed","true");
  await expect(scene(page)).toHaveAttribute("data-village-scene-time","day");
  await expect(page.locator("[data-village-lanterns]")).toHaveCount(0);
  await expect(page.locator("[data-village-fireflies]")).toHaveCount(0);
  await expect(page.locator("[data-village-moon-pond]")).toHaveCount(0);
  await expect(page.locator('[data-village-glow="lanterns"]')).toHaveAttribute("aria-pressed","true");
  await expect(page.locator('[data-village-glow="fireflies"]')).toHaveAttribute("aria-pressed","true");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const selected=await sky(page,"day").boundingBox();
  expect(selected.width).toBeGreaterThanOrEqual(65);
  expect(selected.height).toBeGreaterThanOrEqual(65);
  await context.close();
});
test("manual Sunset reveals free lanterns and fireflies, switches independently, survives reload",async({browser})=>{
  const {context,page}=await phone(browser);
  await openVillage(page);
  await sky(page,"sunset").click();
  await expect(scene(page)).toHaveAttribute("data-village-scene-time","sunset");
  await expect(sky(page,"sunset")).toHaveAttribute("aria-pressed","true");
  await expect(page.locator("[data-village-lanterns]")).toHaveCount(1);
  await expect(page.locator("[data-village-fireflies]")).toHaveCount(1);
  await expect(page.locator(".village-firefly")).toHaveCount(7);
  await expect(page.locator("[data-village-moon-pond]")).toHaveCount(0);
  await page.locator('[data-village-glow="lanterns"]').click();
  await expect(page.locator("[data-village-lanterns]")).toHaveCount(0);
  await expect(page.locator("[data-village-fireflies]")).toHaveCount(1);
  await expect.poll(async()=>(await saved(page)).collection.villageAtmosphere)
    .toEqual({timeOfDay:"sunset",lanterns:false,fireflies:true});
  await page.locator('[data-village-glow="fireflies"]').click();
  await expect(page.locator("[data-village-fireflies]")).toHaveCount(0);
  await expect(page.locator('[data-village-glow="fireflies"]')).toHaveAttribute("aria-pressed","false");
  await page.reload();
  await openVillage(page);
  await expect(scene(page)).toHaveAttribute("data-village-scene-time","sunset");
  await expect(page.locator("[data-village-lanterns]")).toHaveCount(0);
  await expect(page.locator("[data-village-fireflies]")).toHaveCount(0);
  const state=await saved(page);
  expect(state.collection.villageAtmosphere).toEqual({
    timeOfDay:"sunset",lanterns:false,fireflies:false
  });
  await context.close();
});
test("Night illuminates quiet pond reflection even when optional lights are off",async({browser})=>{
  const {context,page}=await phone(browser,{
    collection:{villageAtmosphere:{timeOfDay:"night",lanterns:false,fireflies:false}}
  });
  await openVillage(page);
  await expect(sky(page,"night")).toHaveAttribute("aria-pressed","true");
  await page.locator('[data-village-district="pond"]').click();
  await expect(scene(page)).toHaveAttribute("data-village-scene-time","night");
  await expect(page.locator("[data-village-moon-pond]")).toHaveCount(1);
  await expect(page.getByRole("img",{name:"Moonlight reflecting on the quiet duck pond"})).toBeVisible();
  await expect(page.locator("[data-village-lanterns]")).toHaveCount(0);
  await expect(page.locator("[data-village-fireflies]")).toHaveCount(0);
  await sky(page,"day").click();
  await expect(page.locator("[data-village-moon-pond]")).toHaveCount(0);
  await sky(page,"night").click();
  await expect(page.locator("[data-village-moon-pond]")).toHaveCount(1);
  await page.locator('[data-village-glow="lanterns"]').click();
  await expect(page.locator("[data-village-lanterns]")).toHaveCount(1);
  await page.locator('[data-village-district="orchard"]').click();
  await expect(scene(page)).toHaveAttribute("data-village-scene-time","night");
  await expect(page.locator("[data-village-moon-pond]")).toHaveCount(0);
  await expect(page.locator("[data-village-lanterns]")).toHaveCount(1);
  expect((await saved(page)).collection.villageAtmosphere).toEqual({
    timeOfDay:"night",lanterns:true,fireflies:false
  });
  await context.close();
});
test("reduced motion and high contrast keep fireflies stationary and readable",async({browser})=>{
  const {context,page}=await phone(browser,{
    settings:{easy:true,motion:true,highContrast:true},
    collection:{villageAtmosphere:{timeOfDay:"night",lanterns:true,fireflies:true}}
  },320,null,"reduce");
  await openVillage(page);
  await expect(page.locator("[data-village-fireflies].moving")).toHaveCount(1);
  const animation=await page.locator(".village-firefly").first()
    .evaluate(el=>getComputedStyle(el).animationName);
  expect(animation).toBe("none");
  await expect(page.locator("[data-village-lanterns]")).toHaveCount(1);
  await expect(scene(page)).toHaveAttribute("data-village-scene-time","night");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await context.close();
});
test("switching ambience cannot reset old level 6001, rescue pet, ornaments, village walks, cards or private notes",async({browser})=>{
  const harvest=makeLevel("harvest",6001,EASY_SIZE),cards=newFreeCell(369);
  const notes=[{id:"orchard-memory",kind:"recipe",title:"Family orchard pie",
    body:"Private family ingredients",by:"Mom",at:1700000000000}];
  const {context,page}=await phone(browser,{
    mode:"harvest",settings:{easy:true,motion:false},
    easyGames:{harvest},easyProgress:{harvest:6001,kitchen:18,moonlight:25},
    cards:{freecell:cards},
    collection:{
      claimed:{"harvest:1":true},companion:"bunny",
      meadowPrizes:["meadow_daisy_wreath"],pumpkinPrizes:["pumpkin_lantern"],
      kitchenPrizes:["kitchen_herb_basket"],
      hiddenDecorations:["sunflower"],villagePlacements:{sunflower:"square:0"},
      villageLife:{pond:{rounds:9,step:2}},
      villageWander:{step:7,scenery:{pond:4}}
    }
  },320,notes);
  await openVillage(page);
  await sky(page,"night").click();
  await page.locator('[data-village-glow="fireflies"]').click();
  await page.locator('[data-village-district="pond"]').click();
  await expect(page.locator("[data-village-moon-pond]")).toHaveCount(1);
  const state=await saved(page);
  expect(state.easyGames.harvest).toEqual(harvest);
  expect(state.easyProgress.harvest).toBe(6001);
  expect(state.easyProgress.kitchen).toBe(18);
  expect(state.easyProgress.moonlight).toBe(25);
  expect(state.cards.freecell).toEqual(cards);
  expect(state.collection.claimed["harvest:1"]).toBe(true);
  expect(state.collection.companion).toBe("bunny");
  expect(state.collection.meadowPrizes).toContain("meadow_daisy_wreath");
  expect(state.collection.pumpkinPrizes).toContain("pumpkin_lantern");
  expect(state.collection.kitchenPrizes).toContain("kitchen_herb_basket");
  expect(state.collection.hiddenDecorations).toContain("sunflower");
  expect(state.collection.villagePlacements).toEqual({sunflower:"square:0"});
  expect(state.collection.villageLife.pond).toEqual({rounds:9,step:2});
  expect(state.collection.villageWander.step).toBe(7);
  expect(state.collection.villageWander.scenery.pond).toBe(4);
  await page.reload();
  await openVillage(page);
  await expect(sky(page,"night")).toHaveAttribute("aria-pressed","true");
  await page.locator('[data-village-district="pond"]').click();
  await expect(page.locator("[data-village-moon-pond]")).toHaveCount(1);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("meeklee-family-porch-notes-v1"))))
    .toEqual(notes);
  await context.close();
});
