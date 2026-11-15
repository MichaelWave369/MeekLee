import {test,expect} from "@playwright/test";
import {newBackgammon,backgammonLegalMoves} from "../../src/backgammon.js";

const rawSaved=page=>page.evaluate(()=>JSON.parse(
  localStorage.getItem("meeklee-adventures-save-v1")));
function momOpener(){
  for(let seed=1;seed<80;seed++){
    const g=newBackgammon(seed);
    if(g.turn===0)return g;
  }
  throw Error("No Mom opening roll found");
}
async function phone(browser,width=390,raw={}){
  const context=await browser.newContext({viewport:{width,height:780},
    hasTouch:true,isMobile:true,deviceScaleFactor:2,reducedMotion:"reduce"});
  const page=await context.newPage();
  await page.addInitScript(data=>{
    localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify(data));
  },raw);
  await page.goto("./");
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:"Play Backgammon with Pip"}).click();
  await expect(page.getByRole("heading",{name:"Backgammon with Pip"})).toBeVisible();
  return {context,page};
}
test("Backgammon is a playable Board Game Nook game, with large move buttons and safe 320px scrolling",async({browser})=>{
  const g=momOpener();
  const {context,page}=await phone(browser,320,{
    progress:{harvest:21},collection:{claimed:{"harvest:1":true},companion:"bunny"},
    cards:{backgammon:g}
  });
  await expect(page.locator(".backgammon-point")).toHaveCount(24);
  await expect(page.locator(".backgammon-pip")).toHaveCount(30);
  await expect(page.getByText("Your move!",{exact:false})).toBeVisible();
  await expect(page.locator(".backgammon-move-buttons button").first()).toBeVisible();
  const box=await page.locator(".backgammon-move-buttons button").first().boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  const sizing=await page.evaluate(()=>({
    doc:document.documentElement.scrollWidth,
    viewport:window.innerWidth,
    scroll:document.querySelector(".backgammon-scroll").scrollWidth,
    board:document.querySelector(".backgammon-scroll").clientWidth
  }));
  expect(sizing.doc).toBeLessThanOrEqual(sizing.viewport+1);
  expect(sizing.scroll).toBeGreaterThan(sizing.board);
  const saved=await rawSaved(page);
  expect(saved.progress.harvest).toBe(21);
  expect(saved.collection.companion).toBe("bunny");
  await context.close();
});
test("Mom uses legal dice moves, Pip replies, then Undo restores the entire turn and save resumes",async({browser})=>{
  const g=momOpener();
  const {context,page}=await phone(browser,390,{progress:{harvest:55},cards:{backgammon:g}});
  let sawPip=false;
  for(let i=0;i<4;i++){
    const old=await rawSaved(page),state=old.cards.backgammon;
    if(state.turn!==0||!state.dice.length){sawPip=true;break;}
    const moves=backgammonLegalMoves(state);
    expect(moves.length).toBeGreaterThan(0);
    await page.locator(".backgammon-move-buttons button").first().click();
    await expect.poll(async()=>(await rawSaved(page)).cards.backgammon.moves)
      .toBeGreaterThan(state.moves);
  }
  const after=(await rawSaved(page)).cards.backgammon;
  expect(sawPip||after.moves>1).toBe(true);
  expect(after.turn===0||after.winner!==null||after.doubleOfferedBy===1).toBe(true);
  await page.getByRole("button",{name:/Undo My Turn/}).click();
  await expect.poll(async()=>(await rawSaved(page)).cards.backgammon.moves).toBe(0);
  const restored=(await rawSaved(page)).cards.backgammon;
  expect(restored.board).toEqual(g.board);
  expect(restored.turn).toBe(g.turn);
  expect(restored.dice).toEqual(g.dice);
  await page.reload();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:"Play Backgammon with Pip"}).click();
  await expect(page.locator(".backgammon-point")).toHaveCount(24);
  expect((await rawSaved(page)).progress.harvest).toBe(55);
  await context.close();
});
test("Backgammon allows a friendly cube offer before rolling; keeps other game saves",async({browser})=>{
  const g=momOpener();
  g.dice=[];
  const {context,page}=await phone(browser,390,{
    progress:{harvest:6001},cards:{backgammon:g}
  });
  await expect(page.getByRole("button",{name:"🎲 Roll Dice"})).toBeVisible();
  await page.getByRole("button",{name:/Offer Double/}).click();
  await expect.poll(async()=>(await rawSaved(page)).cards.backgammon.cube).toBe(2);
  expect((await rawSaved(page)).cards.backgammon.cubeOwner).toBe(1);
  expect((await rawSaved(page)).progress.harvest).toBe(6001);
  await page.getByRole("button",{name:"🎲 Roll Dice"}).click();
  await expect.poll(async()=>(await rawSaved(page)).cards.backgammon.moves)
    .toBe(0);
  await expect(page.locator(".backgammon-move-buttons button").first()).toBeVisible();
  await context.close();
});
test("bar re-entry and bearing-off game point are accessible without tiny dragged pieces",async({browser})=>{
  const g=momOpener();
  g.board=Array(24).fill(0);g.board[5]=14;g.board[22]=-1;g.board[23]=-14;
  g.bar=[1,0];g.off=[0,0];g.turn=0;g.dice=[2,1];
  const {context,page}=await phone(browser,390,{cards:{backgammon:g}});
  await expect(page.getByText("re-enter them first.",{exact:false})).toBeVisible();
  const move=page.getByRole("button",{name:/Bar → 23 · Die 2 · Hit/});
  await expect(move).toBeVisible();
  await move.click();
  await expect.poll(async()=>(await rawSaved(page)).cards.backgammon.bar[1]).toBe(1);
  expect((await rawSaved(page)).cards.backgammon.board[22]).toBe(1);
  await context.close();
});
test("a completed Backgammon game awards a gammon, shows winner and offers next game",async({browser})=>{
  const g=momOpener();
  g.board=Array(24).fill(0);g.board[0]=1;g.board[23]=-15;
  g.off=[14,0];g.bar=[0,0];g.turn=0;g.dice=[1];
  const {context,page}=await phone(browser,390,{cards:{backgammon:g}});
  await page.getByRole("button",{name:/Point 1 → Home · Die 1/}).click();
  await expect(page.getByText("Mom wins this game!",{exact:false})).toBeVisible();
  await expect.poll(async()=>(await rawSaved(page)).cards.backgammon.matchScore[0]).toBe(2);
  await page.getByRole("button",{name:"Deal Next Game"}).click();
  await expect.poll(async()=>(await rawSaved(page)).cards.backgammon.round).toBe(2);
  await expect(page.locator(".backgammon-point")).toHaveCount(24);
  await context.close();
});
