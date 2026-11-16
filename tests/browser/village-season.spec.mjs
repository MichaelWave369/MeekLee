import {test,expect} from "@playwright/test";
import {makeLevel,EASY_SIZE} from "../../src/core.js";

async function phone(browser,raw=null,width=390){
  const context=await browser.newContext({
    viewport:{width,height:780},isMobile:true,hasTouch:true,
    deviceScaleFactor:2,reducedMotion:"reduce"
  });
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
async function openVillage(page){
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Garden/}).click();
  await page.getByRole("button",{name:"Explore Garden Village"}).click();
  await expect(page.getByRole("heading",{name:"Mom's Garden Village"})).toBeVisible();
}
const season=(page,s)=>page.locator('[data-village-season="'+s+'"]');
test("320px old village defaults to familiar summer, then swaps four seasons by tap",async({browser})=>{
  const {context,page}=await phone(browser,null,320);
  await openVillage(page);
  await expect(page.locator("[data-village-season]")).toHaveCount(4);
  await expect(season(page,"summer")).toHaveAttribute("aria-pressed","true");
  await expect(page.locator("[data-village-scene-season]")).toHaveAttribute("data-village-scene-season","summer");
  for(const s of ["spring","autumn","winter","summer"]){
    await season(page,s).click();
    await expect(season(page,s)).toHaveAttribute("aria-pressed","true");
    await expect(page.locator("[data-village-scene-season]")).toHaveAttribute("data-village-scene-season",s);
    await expect(page.locator("[data-village-season-ornaments]")).toHaveAttribute("data-village-season-ornaments",s);
    await expect(page.locator(".village-season-ornaments span")).toHaveCount(5);
    await expect.poll(async()=>(await saved(page)).collection.villageSeason).toBe(s);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const box=await season(page,"winter").boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(48);
  expect(box.width).toBeGreaterThanOrEqual(50);
  await context.close();
});
test("winter moonlit pond, autumn orchard and spring butterfly garden keep independent sky",async({browser})=>{
  const {context,page}=await phone(browser);
  await openVillage(page);
  await season(page,"winter").click();
  await page.locator('[data-village-sky="night"]').click();
  await page.locator('[data-village-district="pond"]').click();
  await expect(page.locator("[data-village-moon-pond]")).toHaveCount(1);
  await expect(page.getByText(/frosty, with snowy reeds/)).toBeVisible();
  await season(page,"autumn").click();
  await page.locator('[data-village-district="orchard"]').click();
  await expect(page.getByText(/Golden autumn leaves gather/)).toBeVisible();
  await season(page,"spring").click();
  await page.locator('[data-village-district="meadow"]').click();
  await expect(page.getByText(/Fresh flowers bloom/)).toBeVisible();
  await expect(page.locator("[data-village-scene-time]")).toHaveAttribute("data-village-scene-time","night");
  await expect(page.locator("[data-village-sky=night]")).toHaveAttribute("aria-pressed","true");
  await expect(page.locator("[data-village-scene-season]")).toHaveAttribute("data-village-scene-season","spring");
  await context.close();
});
test("season saves across reload, no change to old level 6001, pets, claimed ornaments or walks",async({browser})=>{
  const old=makeLevel("harvest",6001,EASY_SIZE);
  const {context,page}=await phone(browser,{
    mode:"harvest",settings:{easy:true,motion:false},
    easyGames:{harvest:old},easyProgress:{harvest:6001,kitchen:25},
    collection:{
      claimed:{"harvest:1":true},companion:"bunny",
      meadowPrizes:["meadow_daisy_wreath"],pumpkinPrizes:["pumpkin_lantern"],
      hiddenDecorations:["sunflower"],villagePlacements:{sunflower:"square:0"},
      villageLife:{pond:{rounds:3,step:1}},villageWander:{step:7},
      villageAtmosphere:{timeOfDay:"sunset",lanterns:true,fireflies:false}
    }
  },320);
  await openVillage(page);
  await season(page,"winter").click();
  await page.locator('[data-village-district="pond"]').click();
  await expect(page.getByText(/frosty, with snowy reeds/)).toBeVisible();
  await expect(page.locator("[data-village-scene-time]")).toHaveAttribute("data-village-scene-time","sunset");
  const state=await saved(page);
  expect(state.collection.villageSeason).toBe("winter");
  expect(state.easyGames.harvest).toEqual(old);
  expect(state.easyProgress.harvest).toBe(6001);
  expect(state.easyProgress.kitchen).toBe(25);
  expect(state.collection.claimed["harvest:1"]).toBe(true);
  expect(state.collection.companion).toBe("bunny");
  expect(state.collection.meadowPrizes).toContain("meadow_daisy_wreath");
  expect(state.collection.pumpkinPrizes).toContain("pumpkin_lantern");
  expect(state.collection.villagePlacements).toEqual({sunflower:"square:0"});
  expect(state.collection.villageLife.pond).toEqual({rounds:3,step:1});
  expect(state.collection.villageWander.step).toBe(7);
  await page.reload();
  await openVillage(page);
  await expect(season(page,"winter")).toHaveAttribute("aria-pressed","true");
  await expect(page.locator("[data-village-scene-season]")).toHaveAttribute("data-village-scene-season","winter");
  await expect(page.locator("[data-village-scene-time]")).toHaveAttribute("data-village-scene-time","sunset");
  await context.close();
});
