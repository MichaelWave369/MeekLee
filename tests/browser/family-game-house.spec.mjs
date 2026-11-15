import {test,expect} from "@playwright/test";
import {newWar} from "../../src/war.js";
import {newStack,playableStacks} from "../../src/stack-race.js";
import {newJigsaw} from "../../src/jigsaw.js";
import {newSolitaire} from "../../src/solitaire.js";

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
async function shelf(page){
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await expect(page.getByRole("heading",{name:"Mom's Card Corner"})).toBeVisible();
}
async function saved(page){
  return page.evaluate(()=>JSON.parse(localStorage.getItem("meeklee-adventures-save-v1")));
}
test("MeekLee Game House expands the shelf on 320px phones without changing original games",async({browser})=>{
  const {context,page}=await phone(browser,320,{progress:{harvest:21}});
  await shelf(page);
  for(const label of [
    "Play Klondike Solitaire","Play Rook Card Table","Play Color Parade",
    "Play War · Mom vs. Pip","Play Stack & Bloom","Play Picture Puzzle Porch",
    "Open Family Porch notebook"
  ])await expect(page.getByRole("button",{name:label})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const s=await saved(page);
  expect(s.progress.harvest).toBe(21);
  await context.close();
});
test("Mom plays War against Pip, including persistence after phone refresh",async({browser})=>{
  const game=newWar(14);
  const {context,page}=await phone(browser,320,{cards:{war:game},progress:{harvest:21}});
  await shelf(page);
  await page.getByRole("button",{name:"Play War · Mom vs. Pip"}).click();
  await expect(page.getByRole("heading",{name:"War · Mom vs. Pip"})).toBeVisible();
  await page.getByRole("button",{name:"🃏 Flip Cards"}).click();
  await expect.poll(async()=>(await saved(page)).cards.war.round).toBe(1);
  await expect(page.locator(".family-war-table .playing-card")).toHaveCount(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.reload();await shelf(page);
  await page.getByRole("button",{name:"Play War · Mom vs. Pip"}).click();
  await expect.poll(async()=>(await saved(page)).cards.war.round).toBe(1);
  await context.close();
});
test("Mom plays a legal Stack & Bloom card and Pip finishes a computer turn",async({browser})=>{
  let g=null,source=null,dest=null;
  for(let seed=1;seed<100;seed++){
    const candidate=newStack(seed,10);
    const sources=[{zone:"stock"},...candidate.hand[0].map((_,index)=>({zone:"hand",index}))];
    for(const from of sources){
      const options=playableStacks(candidate,from);
      if(options.length){g=candidate;source=from;dest=options[0];break;}
    }
    if(g)break;
  }
  expect(g).toBeTruthy();
  const {context,page}=await phone(browser,390,{cards:{stack:g},progress:{harvest:21}});
  await shelf(page);
  await page.getByRole("button",{name:"Play Stack & Bloom"}).click();
  await expect(page.getByRole("heading",{name:"Stack & Bloom"})).toBeVisible();
  if(source.zone==="stock")await page.locator(".family-stack-stock .family-stack-card").click();
  else await page.locator(".family-stack-hand .family-stack-card").nth(source.index).click();
  await page.locator(".family-stack-build").nth(dest).click();
  await expect.poll(async()=>(await saved(page)).cards.stack.moves).toBe(1);
  const count=(await saved(page)).cards.stack.hand[0].length;
  if(count>0){
    await page.locator(".family-stack-hand .family-stack-card").first().click();
    await page.locator(".family-stack-empty").first().click();
    await expect.poll(async()=>(await saved(page)).cards.stack.turn).toBe(0);
    expect((await saved(page)).cards.stack.moves).toBeGreaterThan(1);
  }
  await page.reload();await shelf(page);
  await page.getByRole("button",{name:"Play Stack & Bloom"}).click();
  expect((await saved(page)).cards.stack.moves).toBeGreaterThan(0);
  await context.close();
});
test("completing a 9-piece picture awards a garden decoration without resetting level 21",async({browser})=>{
  const g=newJigsaw(25,"harvest",3);
  g.tiles=[1,0,2,3,4,5,6,7,8];g.moves=3;g.won=false;
  const {context,page}=await phone(browser,390,{
    cards:{jigsaw:g},progress:{harvest:21},
    collection:{claimed:{"harvest:1":true},companion:"bunny"}
  });
  await shelf(page);
  await page.getByRole("button",{name:"Play Picture Puzzle Porch"}).click();
  await expect(page.getByRole("heading",{name:"Picture Puzzle Porch"})).toBeVisible();
  await expect(page.locator(".family-jigsaw-tile")).toHaveCount(9);
  await page.locator(".family-jigsaw-tile").nth(0).click();
  await page.locator(".family-jigsaw-tile").nth(1).click();
  await expect(page.getByText("Beautiful! You completed this picture!")).toBeVisible();
  await expect.poll(async()=>{
    const s=await saved(page);
    return s.collection.jigsawPrizes?.includes("harvest:3")&&s.progress.harvest===21;
  }).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.reload();await shelf(page);
  await page.getByRole("button",{name:"Play Picture Puzzle Porch"}).click();
  await expect(page.getByText("Beautiful! You completed this picture!")).toBeVisible();
  await context.close();
});
test("Family Porch recipe, story and idea notebook is private and remembers a recipe",async({browser})=>{
  const {context,page}=await phone(browser,320,{progress:{harvest:21}});
  await shelf(page);
  await page.getByRole("button",{name:"Open Family Porch notebook"}).click();
  await expect(page.getByRole("heading",{name:"The Family Porch"})).toBeVisible();
  await expect(page.getByText("not posted publicly",{exact:false})).toBeVisible();
  await page.getByRole("radio",{name:/Family Recipe/}).check();
  await page.getByLabel("Title").fill("Grandma's biscuits");
  await page.getByLabel("From (optional)").fill("Mom");
  await page.getByLabel("Ingredients and steps").fill("Butter, flour, and a little love.");
  await page.getByRole("button",{name:/Save in My Notebook/}).click();
  await expect(page.getByRole("heading",{name:"Grandma's biscuits"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.reload();await shelf(page);
  await page.getByRole("button",{name:"Open Family Porch notebook"}).click();
  await expect(page.getByRole("heading",{name:"Grandma's biscuits"})).toBeVisible();
  await expect(page.getByText("Butter, flour, and a little love.")).toBeVisible();
  await context.close();
});
test("Solitaire can start a draw-three deal without damaging previous draw-one save",async({browser})=>{
  const {context,page}=await phone(browser,390);
  await shelf(page);
  await page.getByRole("button",{name:/Play Klondike Solitaire/}).click();
  await expect(page.getByRole("button",{name:"Draw 3"})).toBeVisible();
  await page.getByRole("button",{name:"Draw 3"}).click();
  await page.getByRole("button",{name:/New Deal/}).click();
  await page.getByRole("button",{name:/Confirm New Deal/}).click();
  await expect.poll(async()=>(await saved(page)).cards.solitaire.drawCount).toBe(3);
  await page.getByRole("button",{name:/Draw three cards from stock/}).click();
  await expect.poll(async()=>(await saved(page)).cards.solitaire.stock.length).toBe(21);
  await context.close();
});
test("Desktop Solitaire supports dragging a waste Ace onto its matching foundation",async({browser})=>{
  const g=newSolitaire(133);
  const index=g.stock.indexOf("S-1");
  if(index>=0){
    g.waste.push(g.stock.splice(index,1)[0]);
  }else{
    let found=false;
    for(const col of g.tableau){
      const i=col.down.indexOf("S-1");
      if(i>=0){col.down.splice(i,1);g.waste.push("S-1");found=true;break;}
      const j=col.up.indexOf("S-1");
      if(j>=0){col.up.splice(j,1);g.waste.push("S-1");found=true;break;}
    }
    if(!found)throw Error("No Ace in original complete deal");
  }
  const context=await browser.newContext({viewport:{width:1180,height:850}});
  const page=await context.newPage();
  await page.addInitScript(data=>localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify(data)),
    {cards:{solitaire:g}});
  await page.goto("./");
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:/Play Klondike Solitaire/}).click();
  const from=page.locator(".solitaire-waste .playing-card");
  const to=page.getByRole("button",{name:/Spades foundation/});
  const a=await from.boundingBox(),b=await to.boundingBox();
  expect(a).toBeTruthy();expect(b).toBeTruthy();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);
  await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});
  await page.mouse.up();
  await expect.poll(async()=>(await saved(page)).cards.solitaire.foundations.S.at(-1)).toBe("S-1");
  await context.close();
});
