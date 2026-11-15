import {test,expect} from "@playwright/test";
import {newFreeCell} from "../../src/freecell.js";
import {STANDARD_SUITS} from "../../src/solitaire.js";

const deck=STANDARD_SUITS.flatMap(s=>Array.from({length:13},(_,i)=>s.id+"-"+(i+1)));
function rigged(seed,positions={}){
  const reserved=new Set(Object.values(positions));
  if(reserved.size!==Object.values(positions).length)throw Error("Duplicate fixture cards");
  const remaining=deck.filter(card=>!reserved.has(card));
  const tableau=[7,7,7,7,6,6,6,6].map((size,i)=>
    Array.from({length:size},(_,j)=>positions[i+":"+j]||remaining.shift()));
  return {...newFreeCell(seed),tableau};
}
async function openFreeCell(browser,width=390,raw=null){
  const context=await browser.newContext({viewport:{width,height:790},
    isMobile:true,hasTouch:true,deviceScaleFactor:2,reducedMotion:"reduce"});
  const page=await context.newPage();
  if(raw)await page.addInitScript(payload=>{
    if(!localStorage.getItem("meeklee-adventures-save-v1"))
      localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify(payload));
  },raw);
  await page.goto("./");
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:"Play FreeCell Solitaire"}).click();
  await expect(page.getByRole("heading",{name:"FreeCell Solitaire"})).toBeVisible();
  return {page,context};
}
const saved=page=>page.evaluate(()=>
  JSON.parse(localStorage.getItem("meeklee-adventures-save-v1")));

test("FreeCell on a 320px phone shows 52 cards, foundations, cells and saves farm",async({browser})=>{
  const {page,context}=await openFreeCell(browser,320,{
    progress:{harvest:6001},collection:{claimed:{"harvest:1":true},companion:"bunny"}});
  await expect(page.locator(".freecell-column")).toHaveCount(8);
  await expect(page.locator("[data-freecell-card]")).toHaveCount(52);
  await expect(page.locator("[data-freecell-empty-cell]")).toHaveCount(4);
  await expect(page.locator("[data-freecell-foundation]")).toHaveCount(4);
  expect(await page.evaluate(()=>
    document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  const state=await saved(page);
  expect(state.cards.freecell.tableau.map(c=>c.length)).toEqual([7,7,7,7,6,6,6,6]);
  expect(state.progress.harvest).toBe(6001);
  expect(state.collection.companion).toBe("bunny");
  await context.close();
});

test("large card-to-foundation buttons really move an Ace and undo restores it",async({browser})=>{
  const g=rigged(43,{"0:6":"S-1"});
  const {page,context}=await openFreeCell(browser,390,{cards:{freecell:g},progress:{harvest:51}});
  await page.locator('[data-freecell-run="t0:6"]').click();
  await expect(page.locator('[data-freecell-destination="fS"]')).toBeVisible();
  await page.locator('[data-freecell-destination="fS"]').click();
  await expect.poll(async()=>(await saved(page)).cards.freecell.foundations.S.length).toBe(1);
  await expect(page.locator('[data-freecell-foundation="S"]')).toContainText("A");
  expect((await saved(page)).progress.harvest).toBe(51);
  await page.getByRole("button",{name:/Undo/}).click();
  await expect.poll(async()=>(await saved(page)).cards.freecell.foundations.S.length).toBe(0);
  expect((await saved(page)).cards.freecell.tableau[0].at(-1)).toBe("S-1");
  await context.close();
});

test("a Free Cell holds one card, persists through reload and returns to the tableau",async({browser})=>{
  const g=rigged(45,{"0:6":"H-7","1:6":"C-8"});
  const {page,context}=await openFreeCell(browser,390,{
    progress:{harvest:244},cards:{freecell:g}});
  await page.locator('[data-freecell-run="t0:6"]').click();
  await expect(page.locator('[data-freecell-destination="c0"]')).toBeVisible();
  await page.locator('[data-freecell-destination="c0"]').click();
  await expect.poll(async()=>(await saved(page)).cards.freecell.cells[0]).toBe("H-7");
  await page.reload();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:"Play FreeCell Solitaire"}).click();
  await page.locator('[data-freecell-run="c0:0"]').click();
  await expect(page.locator('[data-freecell-destination="t1"]')).toBeVisible();
  await page.locator('[data-freecell-destination="t1"]').click();
  await expect.poll(async()=>(await saved(page)).cards.freecell.cells[0]).toBe(null);
  expect((await saved(page)).cards.freecell.tableau[1].at(-1)).toBe("H-7");
  expect((await saved(page)).progress.harvest).toBe(244);
  await context.close();
});

test("two-card alternating-color supermove and new-game confirmation preserve other saves",async({browser})=>{
  const g=rigged(42,{"0:5":"C-8","0:6":"H-7","1:6":"H-9"});
  const {page,context}=await openFreeCell(browser,390,{
    progress:{harvest:1002},cards:{freecell:g}});
  await page.locator('[data-freecell-run="t0:5"]').click();
  await expect(page.locator('[data-freecell-destination="t1"]')).toBeVisible();
  await page.locator('[data-freecell-destination="t1"]').click();
  await expect.poll(async()=>(await saved(page)).cards.freecell.tableau[1].length).toBe(9);
  expect((await saved(page)).cards.freecell.tableau[1].slice(-2)).toEqual(["C-8","H-7"]);
  await page.getByRole("button",{name:"New Deal"}).click();
  await expect(page.getByRole("button",{name:"Confirm New Deal"})).toBeVisible();
  expect((await saved(page)).cards.freecell.moves).toBe(1);
  await page.getByRole("button",{name:"Confirm New Deal"}).click();
  await expect.poll(async()=>(await saved(page)).cards.freecell.moves).toBe(0);
  expect((await saved(page)).progress.harvest).toBe(1002);
  await context.close();
});

test("hint highlights a currently legal move without modifying a saved game",async({browser})=>{
  const g=rigged(57,{"0:6":"S-1"});
  const {page,context}=await openFreeCell(browser,390,{cards:{freecell:g}});
  const old=await saved(page);
  await page.getByRole("button",{name:/Hint/}).click();
  await expect(page.locator(".freecell-target-buttons button.hinted")).toHaveCount(1);
  expect((await saved(page)).cards.freecell).toEqual(old.cards.freecell);
  await context.close();
});
