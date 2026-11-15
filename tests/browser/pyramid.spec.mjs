import {test,expect} from "@playwright/test";
import {newPyramid} from "../../src/pyramid.js";
const KEY="meeklee-adventures-save-v1";
function rigged(seed,targets){
  const g=newPyramid(seed),cards=[...g.tableau,...g.stock];
  for(const [rawIndex,target] of Object.entries(targets)){
    const index=Number(rawIndex),position=cards.indexOf(target);
    [cards[index],cards[position]]=[cards[position],cards[index]];
  }
  return {...g,tableau:cards.slice(0,28),stock:cards.slice(28)};
}
async function openPyramid(browser,width=390,raw=null){
  const context=await browser.newContext({viewport:{width,height:780},
    isMobile:true,hasTouch:true,deviceScaleFactor:2,reducedMotion:"reduce"});
  const page=await context.newPage();
  if(raw)await page.addInitScript(payload=>{
    if(!localStorage.getItem("meeklee-adventures-save-v1"))
      localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify(payload));
  },raw);
  await page.goto("./");
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:"Play Pyramid Solitaire"}).click();
  await expect(page.getByRole("heading",{name:"Pyramid Solitaire"})).toBeVisible();
  return {context,page};
}
const saved=page=>page.evaluate(()=>JSON.parse(
  localStorage.getItem("meeklee-adventures-save-v1")));
const choice=(page,i)=>page.locator('[data-pyramid-choice="t:'+i+'"]');
test("new Pyramid is playable on 320px phone with independent farm and garden saves",async({browser})=>{
  const {context,page}=await openPyramid(browser,320,{progress:{harvest:6001},
    collection:{claimed:{"harvest:1":true},companion:"bunny"}});
  await expect(page.locator(".pyramid-row")).toHaveCount(7);
  await expect(page.locator(".pyramid-card")).toHaveCount(28);
  await expect(page.locator(".pyramid-choice")).toHaveCount(7);
  await expect(page.getByRole("button",{name:"Draw one card from stock"})).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  const state=await saved(page);
  expect(state.progress.harvest).toBe(6001);
  expect(state.collection.companion).toBe("bunny");
  expect(state.cards.pyramid.tableau.length).toBe(28);
  await context.close();
});
test("tap two exposed large cards totaling 13; undo restores the cards",async({browser})=>{
  const g=rigged(73,{21:"S-1",22:"H-12"});
  const {context,page}=await openPyramid(browser,390,{
    progress:{harvest:51},cards:{pyramid:g}});
  await expect(choice(page,21)).toBeVisible();
  await choice(page,21).click();
  await expect(choice(page,21)).toHaveAttribute("aria-pressed","true");
  await choice(page,22).click();
  await expect.poll(async()=>((await saved(page)).cards.pyramid.removed.length)).toBe(2);
  let state=await saved(page);
  expect(state.cards.pyramid.tableau[21]).toBe(null);
  expect(state.cards.pyramid.tableau[22]).toBe(null);
  expect(state.progress.harvest).toBe(51);
  await page.getByRole("button",{name:/Undo/}).click();
  await expect.poll(async()=>((await saved(page)).cards.pyramid.removed.length)).toBe(0);
  expect((await saved(page)).cards.pyramid.tableau).toEqual(g.tableau);
  await context.close();
});
test("single exposed king, a stock draw, waste save and reload all work",async({browser})=>{
  const g=rigged(25,{21:"C-13"});
  const {context,page}=await openPyramid(browser,390,{cards:{pyramid:g},
    progress:{harvest:27}});
  await choice(page,21).click();
  await expect.poll(async()=>((await saved(page)).cards.pyramid.removed.length)).toBe(1);
  await page.getByRole("button",{name:"Draw one card from stock"}).click();
  await expect.poll(async()=>((await saved(page)).cards.pyramid.stock.length)).toBe(23);
  const top=(await saved(page)).cards.pyramid.waste.at(-1);
  await page.reload();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:"Play Pyramid Solitaire"}).click();
  expect((await saved(page)).cards.pyramid.waste.at(-1)).toEqual(top);
  expect((await saved(page)).cards.pyramid.tableau[21]).toBe(null);
  expect((await saved(page)).progress.harvest).toBe(27);
  await context.close();
});
test("hints, new-deal confirmation and undo do not restart original solitaire",async({browser})=>{
  const g=rigged(26,{21:"D-1",22:"S-12"});
  const {context,page}=await openPyramid(browser,390,{cards:{pyramid:g},
    progress:{harvest:1002}});
  await page.getByRole("button",{name:/Hint/}).click();
  await expect(page.locator(".pyramid-choice.suggested")).toHaveCount(2);
  await page.getByRole("button",{name:"New Deal"}).click();
  await expect(page.getByRole("button",{name:"Confirm New Deal"})).toBeVisible();
  await page.getByRole("button",{name:"Confirm New Deal"}).click();
  await expect.poll(async()=>((await saved(page)).cards.pyramid.moves)).toBe(0);
  expect((await saved(page)).progress.harvest).toBe(1002);
  await context.close();
});
