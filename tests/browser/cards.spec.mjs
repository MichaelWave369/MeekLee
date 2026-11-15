import {test,expect} from "@playwright/test";
import {newRook} from "../../src/rook.js";
import {newColorParade} from "../../src/color-parade.js";

async function phone(browser,width=390,raw=null){
  const context=await browser.newContext({
    viewport:{width,height:780},isMobile:true,hasTouch:true,deviceScaleFactor:2,
    reducedMotion:"reduce"
  });
  const page=await context.newPage();
  if(raw)await page.addInitScript(payload=>{
    if(!localStorage.getItem("meeklee-adventures-save-v1"))
      localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify(payload));
  },raw);
  await page.goto("./");
  return {context,page};
}
async function cardCorner(page){
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await expect(page.getByRole("heading",{name:"Mom's Card Corner"})).toBeVisible();
}
const saved=page=>page.evaluate(()=>
  JSON.parse(localStorage.getItem("meeklee-adventures-save-v1")));

test("Card Corner opens from small phone menu without replacing puzzle worlds",async({browser})=>{
  const {context,page}=await phone(browser);
  await cardCorner(page);
  await expect(page.getByRole("button",{name:/Play Klondike Solitaire/})).toBeVisible();
  await expect(page.getByRole("button",{name:/Play Rook Card Table/})).toBeVisible();
  await expect(page.getByRole("button",{name:/Play Color Parade/})).toBeVisible();
  await page.getByRole("button",{name:/Back to Puzzles/}).click();
  await expect(page.locator(".game-board")).toBeVisible();
  const state=await saved(page);
  expect(state.progress.harvest).toBe(1);
  expect(state.collection).toBeDefined();
  await context.close();
});

test("Solitaire draws a card, supports undo, and persists a game across refresh",async({browser})=>{
  const {context,page}=await phone(browser);
  await cardCorner(page);
  await page.getByRole("button",{name:/Play Klondike Solitaire/}).click();
  await expect(page.getByRole("heading",{name:"Klondike Solitaire"})).toBeVisible();
  await expect(page.locator(".solitaire-column")).toHaveCount(7);
  await expect(page.getByRole("button",{name:/Draw one card from stock/})).toBeEnabled();
  await page.getByRole("button",{name:/Draw one card from stock/}).click();
  await expect.poll(async()=>(await saved(page)).cards.solitaire.stock.length).toBe(23);
  await page.getByRole("button",{name:/Undo/}).click();
  await expect.poll(async()=>(await saved(page)).cards.solitaire.stock.length).toBe(24);
  await page.getByRole("button",{name:/Draw one card from stock/}).click();
  await page.reload();
  await cardCorner(page);
  await page.getByRole("button",{name:/Play Klondike Solitaire/}).click();
  await expect.poll(async()=>(await saved(page)).cards.solitaire.stock.length).toBe(23);
  await expect(page.locator(".solitaire-foundation")).toHaveCount(4);
  await expect(page.getByRole("button",{name:/Hint/})).toBeEnabled();
  await context.close();
});

test("Rook partner game permits human nest, trump, legal trick and bot responses",async({browser})=>{
  const game=newRook(17);
  game.phase="nest";game.bid=100;game.bidder=0;game.turn=0;
  game.hands[0]=[...game.hands[0],...game.nest];game.nest=[];
  const raw={cards:{rook:game},mode:"harvest"};
  const {context,page}=await phone(browser,390,raw);
  await cardCorner(page);
  await page.getByRole("button",{name:/Play Rook Card Table/}).click();
  await expect(page.getByRole("heading",{name:"Rook Card Table"})).toBeVisible();
  await expect(page.locator(".rook-hand-cards .rook-card")).toHaveCount(14);
  for(let i=0;i<5;i++)await page.locator(".rook-hand-cards .rook-card").nth(i).click();
  await page.getByRole("button",{name:/Set Aside Five Cards/}).click();
  await expect(page.getByRole("heading",{name:/Choose trump/})).toBeVisible();
  await page.locator(".rook-suit-row").getByRole("button",{name:/Green/}).click();
  await expect(page.getByText(/Trump: green/)).toBeVisible();
  await expect(page.locator(".rook-your-hand .rook-card")).toHaveCount(9);
  await page.locator(".rook-your-hand .rook-card.legal").first().click();
  await expect.poll(async()=>(await saved(page)).cards.rook.hands[0].length).toBe(8);
  await expect.poll(async()=>{
    const g=(await saved(page)).cards.rook;
    return g.trick.length || g.hands.slice(1).some(h=>h.length<9);
  },{timeout:8000}).toBeTruthy();
  await page.reload();
  await cardCorner(page);
  await page.getByRole("button",{name:/Play Rook Card Table/}).click();
  await expect(page.getByRole("heading",{name:"Rook Card Table"})).toBeVisible();
  await context.close();
});

test("Color Parade wilds choose a color, next bot acts and progress is saved",async({browser})=>{
  let game;
  for(let seed=1;seed<100;seed++){
    const candidate=newColorParade(seed);
    if(candidate.hands[0].some(c=>c.type==="wild")){game=candidate;break;}
  }
  expect(game).toBeTruthy();
  const {context,page}=await phone(browser,390,{cards:{parade:game},mode:"harvest"});
  await cardCorner(page);
  await page.getByRole("button",{name:/Play Color Parade/}).click();
  await expect(page.getByRole("heading",{name:"Color Parade"})).toBeVisible();
  await expect(page.locator(".parade-opponent")).toHaveCount(3);
  await page.getByRole("button",{name:"Wild color card"}).first().click();
  await expect(page.getByRole("group",{name:"Choose a new color"})).toBeVisible();
  await page.locator(".parade-wild-picker").getByRole("button",{name:/Leaf/}).click();
  await expect.poll(async()=>(await saved(page)).cards.parade.hands[0].length).toBe(6);
  await expect.poll(async()=>(await saved(page)).cards.parade.discard.at(-1).type).toBe("wild");
  await page.reload();
  await cardCorner(page);
  await page.getByRole("button",{name:/Play Color Parade/}).click();
  await expect(page.getByRole("heading",{name:"Color Parade"})).toBeVisible();
  await context.close();
});

test("new cards remain large on narrow phone and the page doesn't overflow sideways",async({browser})=>{
  const {context,page}=await phone(browser,320);
  await cardCorner(page);
  for(const label of ["Klondike Solitaire","Rook Card Table","Color Parade"]){
    await page.getByRole("button",{name:new RegExp("Play "+label)}).click();
    await expect(page.locator(".cardgame")).toBeVisible();
    expect(await page.evaluate(()=>
      document.documentElement.scrollWidth <= window.innerWidth+1)).toBe(true);
    const card=page.locator(".playing-card").first();
    if(await card.count()){
      const rect=await card.boundingBox();
      expect(rect.height).toBeGreaterThanOrEqual(70);
    }
    await page.getByRole("button",{name:/Card Corner/}).first().click();
  }
  await context.close();
});
