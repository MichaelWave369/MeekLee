import {test,expect} from "@playwright/test";
import {newCheckers,checkersLegalMoves} from "../../src/checkers.js";

async function phone(browser,width=390,raw=null){
  const context=await browser.newContext({
    viewport:{width,height:780},isMobile:true,hasTouch:true,deviceScaleFactor:2,
    reducedMotion:"reduce"
  });
  const page=await context.newPage();
  if(raw)await page.addInitScript(value=>{
    localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify(value));
  },raw);
  await page.goto("./");
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await expect(page.getByRole("heading",{name:"Mom's Card Corner"})).toBeVisible();
  await page.getByRole("button",{name:"Play Checkers with Pip"}).click();
  await expect(page.getByRole("heading",{name:"Checkers with Pip"})).toBeVisible();
  return {context,page};
}
const saved=page=>page.evaluate(()=>JSON.parse(
  localStorage.getItem("meeklee-adventures-save-v1")));
const square=(page,i)=>page.locator('[data-checkers-index="'+i+'"]');

test("Board Game Nook adds playable offline Checkers, 8×8 grid and honest future labels on a 320px phone",async({browser})=>{
  const g=newCheckers(7);
  const {context,page}=await phone(browser,320,{progress:{harvest:21},
    cards:{checkers:g},collection:{claimed:{"harvest:1":true},companion:"bunny"}});
  await expect(page.locator(".checkers-square")).toHaveCount(64);
  await expect(page.locator(".checkers-piece.red")).toHaveCount(12);
  await expect(page.locator(".checkers-piece.blue")).toHaveCount(12);
  await expect(page.getByText("Your turn")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  const box=await page.locator(".checkers-board").boundingBox();
  expect(box.width).toBeGreaterThan(270);
  await page.getByRole("button",{name:/Game Shelf/}).click();
  await expect(page.getByText("Chess",{exact:true})).toBeVisible();
  await expect(page.getByText("Backgammon",{exact:true})).toBeVisible();
  await expect(page.getByText("Coming later",{exact:true}).first()).toBeVisible();
  await expect(page.getByRole("button",{name:"Play Checkers with Pip"})).toBeVisible();
  const state=await saved(page);
  expect(state.progress.harvest).toBe(21);
  expect(state.collection.companion).toBe("bunny");
  await context.close();
});

test("real checkers round: red legal move, Pip bot replies, undo full turn and reload original saved farm",async({browser})=>{
  const game=newCheckers(17);
  const move=checkersLegalMoves(game)[0];
  const {context,page}=await phone(browser,390,{progress:{harvest:27},
    cards:{checkers:game},collection:{claimed:{"harvest:1":true},companion:"bunny"}});
  await square(page,move.from).click();
  await expect(square(page,move.to)).toHaveClass(/destination/);
  await square(page,move.to).click();
  await expect.poll(async()=>(await saved(page)).cards.checkers.moves).toBeGreaterThanOrEqual(2);
  const current=(await saved(page)).cards.checkers;
  expect(current.turn).toBe("r");
  expect(current.history.length).toBe(1);
  await page.getByRole("button",{name:/Undo Turn/}).click();
  await expect.poll(async()=>(await saved(page)).cards.checkers.moves).toBe(0);
  expect((await saved(page)).cards.checkers.board).toEqual(game.board);
  await page.reload();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:"Play Checkers with Pip"}).click();
  await expect(page.locator(".checkers-square")).toHaveCount(64);
  const state=await saved(page);
  expect(state.progress.harvest).toBe(27);
  expect(state.collection.companion).toBe("bunny");
  expect(state.cards.checkers.moves).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await context.close();
});

test("mandatory double jump keeps Mom on the same piece until the second capture",async({browser})=>{
  const g=newCheckers(21);
  g.board=Array(64).fill(null);
  g.board[40]="r";g.board[33]="b";g.board[19]="b";g.board[7]="b";
  const {context,page}=await phone(browser,390,{cards:{checkers:g}});
  await expect(page.getByText("A capture is required!",{exact:false})).toBeVisible();
  await square(page,40).click();
  await square(page,26).click();
  await expect.poll(async()=>(await saved(page)).cards.checkers.mustContinue).toBe(26);
  await expect(page.getByText("Keep jumping!",{exact:false})).toBeVisible();
  await expect(square(page,12)).toHaveClass(/destination/);
  await square(page,12).click();
  await expect.poll(async()=>((await saved(page)).cards.checkers.board[33])).toBe(null);
  await expect.poll(async()=>((await saved(page)).cards.checkers.board[19])).toBe(null);
  expect((await saved(page)).cards.checkers.moves).toBeGreaterThanOrEqual(2);
  await context.close();
});

test("checkers hints and New Game confirmation preserve all unrelated saves",async({browser})=>{
  const g=newCheckers(41);
  const {context,page}=await phone(browser,390,{cards:{checkers:g},
    progress:{harvest:6001}});
  await page.getByRole("button",{name:/Hint/}).click();
  await expect(page.locator(".checkers-square.suggested")).toHaveCount(1);
  await page.getByRole("button",{name:/New Game/}).click();
  await expect(page.getByText("Tap New Game again to confirm",{exact:false})).toBeVisible();
  await page.getByRole("button",{name:/Confirm New Game/}).click();
  await expect.poll(async()=>(await saved(page)).cards.checkers.moves).toBe(0);
  expect((await saved(page)).progress.harvest).toBe(6001);
  await context.close();
});
