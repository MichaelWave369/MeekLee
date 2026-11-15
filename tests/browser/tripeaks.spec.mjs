import {test,expect} from "@playwright/test";
import {newTriPeaks} from "../../src/tripeaks.js";

const KEY="meeklee-adventures-save-v1";
function rigged(seed,at,starter){
  const base=newTriPeaks(seed),all=[...base.tableau,...base.stock,...base.waste];
  const targets={...at,...(starter?{51:starter}:{})};
  for(const [key,card] of Object.entries(targets)){
    const index=Number(key),from=all.indexOf(card);
    [all[index],all[from]]=[all[from],all[index]];
  }
  return {...base,tableau:all.slice(0,28),stock:all.slice(28,51),waste:[all[51]]};
}
async function openTriPeaks(browser,width=390,raw=null){
  const context=await browser.newContext({viewport:{width,height:790},isMobile:true,
    hasTouch:true,deviceScaleFactor:2,reducedMotion:"reduce"});
  const page=await context.newPage();
  if(raw)await page.addInitScript(payload=>{
    if(!localStorage.getItem("meeklee-adventures-save-v1"))
      localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify(payload));
  },raw);
  await page.goto("./");
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:"Play TriPeaks Solitaire"}).click();
  await expect(page.getByRole("heading",{name:"TriPeaks Solitaire"})).toBeVisible();
  return {context,page};
}
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem(KEY)));
test("TriPeaks keeps 28 face-down/exposed cards and 320px device stays usable",async({browser})=>{
  const {context,page}=await openTriPeaks(browser,320,{progress:{harvest:6001},
    collection:{claimed:{"harvest:1":true},companion:"bunny"}});
  await expect(page.locator(".tripeaks-playing-card")).toHaveCount(28);
  await expect(page.locator(".tripeaks-playing-card.face-up")).toHaveCount(10);
  await expect(page.locator(".tripeaks-playing-card.face-down")).toHaveCount(18);
  await expect(page.getByRole("button",{name:"Draw one new waste card"})).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  const state=await saved(page);
  expect(state.cards.tripeaks.stock.length).toBe(23);
  expect(state.cards.tripeaks.waste.length).toBe(1);
  expect(state.progress.harvest).toBe(6001);
  expect(state.collection.companion).toBe("bunny");
  await context.close();
});
test("play two matching cards through large touch buttons and reveal the card above",async({browser})=>{
  const g=rigged(72,{9:"D-9",18:"S-7",19:"C-8"},"H-6");
  const {context,page}=await openTriPeaks(browser,390,{progress:{harvest:71},
    cards:{tripeaks:g}});
  await expect(page.locator('[data-tripeaks-card="9"]')).toBeDisabled();
  await expect(page.locator('[data-tripeaks-choice="18"]')).toBeVisible();
  await page.locator('[data-tripeaks-choice="18"]').click();
  await expect.poll(async()=>(await saved(page)).cards.tripeaks.tableau[18]).toBe(null);
  await page.locator('[data-tripeaks-choice="19"]').click();
  await expect.poll(async()=>(await saved(page)).cards.tripeaks.tableau[19]).toBe(null);
  await expect(page.locator('[data-tripeaks-card="9"]')).toBeEnabled();
  await expect(page.locator('[data-tripeaks-choice="9"]')).toBeVisible();
  const state=await saved(page);
  expect(state.cards.tripeaks.score).toBe(300);
  expect(state.cards.tripeaks.streak).toBe(2);
  expect(state.progress.harvest).toBe(71);
  await page.getByRole("button",{name:/Undo/}).click();
  await expect.poll(async()=>(await saved(page)).cards.tripeaks.tableau[19]).not.toBe(null);
  expect((await saved(page)).cards.tripeaks.score).toBe(100);
  await context.close();
});
test("stock draw and live waste survive a reload, preserving sibling games",async({browser})=>{
  const g=rigged(9,{18:"S-7"},"H-6");
  const {context,page}=await openTriPeaks(browser,390,{progress:{harvest:204},
    cards:{tripeaks:g}});
  await page.getByRole("button",{name:"Draw one new waste card"}).click();
  await expect.poll(async()=>(await saved(page)).cards.tripeaks.stock.length).toBe(22);
  const waste=(await saved(page)).cards.tripeaks.waste.at(-1);
  await page.reload();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:"Play TriPeaks Solitaire"}).click();
  expect((await saved(page)).cards.tripeaks.waste.at(-1)).toBe(waste);
  expect((await saved(page)).progress.harvest).toBe(204);
  await context.close();
});
test("hint highlights a legal play, new deal requires second confirmation",async({browser})=>{
  const g=rigged(17,{18:"S-7"},"H-6");
  const {context,page}=await openTriPeaks(browser,390,{progress:{harvest:1002},
    cards:{tripeaks:g}});
  await page.getByRole("button",{name:/Hint/}).click();
  const hinted=page.locator(".tripeaks-playing-card.hinted");
  await expect(hinted).toHaveCount(1);
  await expect(hinted).toBeEnabled();
  await page.getByRole("button",{name:"New Deal"}).click();
  await expect(page.getByRole("button",{name:"Confirm New Deal"})).toBeVisible();
  await page.getByRole("button",{name:"Confirm New Deal"}).click();
  await expect.poll(async()=>(await saved(page)).cards.tripeaks.moves).toBe(0);
  expect((await saved(page)).progress.harvest).toBe(1002);
  await context.close();
});
