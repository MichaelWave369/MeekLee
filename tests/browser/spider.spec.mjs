import {test,expect} from "@playwright/test";
import {newSpider} from "../../src/spider.js";

function rigTop(base,assignments){
  const g={...base,stock:[...base.stock],
    columns:base.columns.map(c=>({down:[...c.down],up:[...c.up]}))};
  function locate(card){
    for(const col of g.columns){
      const down=col.down.indexOf(card);if(down>=0)return [col.down,down];
      const up=col.up.indexOf(card);if(up>=0)return [col.up,up];
    }
    const pos=g.stock.indexOf(card);
    if(pos>=0)return [g.stock,pos];
    throw Error("Missing "+card);
  }
  for(const [index,card] of Object.entries(assignments)){
    const col=g.columns[Number(index)],old=col.up.at(-1),where=locate(card);
    col.up[col.up.length-1]=card;where[0][where[1]]=old;
  }
  return g;
}
async function openSpider(browser,width=390,raw=null){
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
  await page.getByRole("button",{name:"Play Spider Solitaire"}).click();
  await expect(page.getByRole("heading",{name:"Spider Solitaire"})).toBeVisible();
  return {context,page};
}
const saved=page=>page.evaluate(()=>JSON.parse(
  localStorage.getItem("meeklee-adventures-save-v1")));

test("Spider at 320px shows 10 columns, 54 cards and protected high-level garden save",async({browser})=>{
  const {context,page}=await openSpider(browser,320,{
    progress:{harvest:6001},collection:{companion:"bunny",claimed:{"harvest:1":true}}});
  await expect(page.locator(".spider-column")).toHaveCount(10);
  await expect(page.locator(".spider-card.up")).toHaveCount(10);
  await expect(page.locator(".spider-card.down")).toHaveCount(44);
  await expect(page.getByRole("button",{name:"Deal ten cards from stock"})).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  const state=await saved(page);
  expect(state.cards.spider.stock.length).toBe(50);
  expect(state.progress.harvest).toBe(6001);
  expect(state.collection.companion).toBe("bunny");
  await context.close();
});

test("big run and destination buttons move a card, reveal hidden card and support undo",async({browser})=>{
  const g=rigTop(newSpider(59),{0:"S-7-0",1:"S-8-0"});
  const {context,page}=await openSpider(browser,390,{progress:{harvest:76},cards:{spider:g}});
  await expect(page.locator('[data-spider-run="0:0"]')).toBeVisible();
  await page.locator('[data-spider-run="0:0"]').click();
  await expect(page.locator('[data-spider-destination="1"]')).toBeVisible();
  await page.locator('[data-spider-destination="1"]').click();
  await expect.poll(async()=>(await saved(page)).cards.spider.columns[1].up.length).toBe(2);
  const state=await saved(page);
  expect(state.cards.spider.columns[1].up.at(-1)).toBe("S-7-0");
  expect(state.cards.spider.columns[0].down.length).toBe(4);
  expect(state.progress.harvest).toBe(76);
  await page.getByRole("button",{name:/Undo/}).click();
  await expect.poll(async()=>(await saved(page)).cards.spider.columns[0].down.length).toBe(5);
  expect((await saved(page)).cards.spider.columns[1].up.length).toBe(1);
  await context.close();
});

test("stock deals 10 cards and save survives return to card shelf and refresh",async({browser})=>{
  const {context,page}=await openSpider(browser,390,{progress:{harvest:1002},
    cards:{spider:newSpider(77)}});
  await page.getByRole("button",{name:"Deal ten cards from stock"}).click();
  await expect.poll(async()=>(await saved(page)).cards.spider.stock.length).toBe(40);
  await expect(page.locator(".spider-card.up")).toHaveCount(20);
  await page.reload();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:"Play Spider Solitaire"}).click();
  expect((await saved(page)).cards.spider.stock.length).toBe(40);
  expect((await saved(page)).cards.spider.deals).toBe(1);
  expect((await saved(page)).progress.harvest).toBe(1002);
  await context.close();
});

test("empty column prevents dealing, and fresh deal requires a second confirmation",async({browser})=>{
  const g=newSpider(31),columns=g.columns.map(c=>({
    down:[...c.down],up:[...c.up]}));
  columns[1].down.push(...columns[0].down,...columns[0].up);
  columns[0]={down:[],up:[]};
  const {context,page}=await openSpider(browser,390,{
    progress:{harvest:452},cards:{spider:{...g,columns}}});
  await expect(page.getByRole("button",{name:"Deal ten cards from stock"})).toBeDisabled();
  await page.getByRole("button",{name:"New Deal"}).click();
  await expect(page.getByRole("button",{name:"Confirm New Deal"})).toBeVisible();
  await page.getByRole("button",{name:"Confirm New Deal"}).click();
  await expect.poll(async()=>(await saved(page)).cards.spider.columns[0].up.length).toBe(1);
  expect((await saved(page)).progress.harvest).toBe(452);
  await context.close();
});
