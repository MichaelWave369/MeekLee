import {test,expect} from "@playwright/test";
import {newChess,chessLegalMoves} from "../../src/chess.js";
async function openChess(browser,width=390,saved=null){
  const context=await browser.newContext({viewport:{width,height:780},
    isMobile:true,hasTouch:true,deviceScaleFactor:2,reducedMotion:"reduce"});
  const page=await context.newPage();
  if(saved)await page.addInitScript(value=>{
    // Init scripts also run on page.reload(): seed only once per test tab.
    if(!sessionStorage.getItem("meeklee-chess-fixture-seeded")){
      localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify(value));
      sessionStorage.setItem("meeklee-chess-fixture-seeded","1");
    }
  },saved);
  await page.goto("./");
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:"Play Chess with Pip"}).click();
  await expect(page.getByRole("heading",{name:"Chess with Pip"})).toBeVisible();
  return {context,page};
}
const state=page=>page.evaluate(()=>JSON.parse(
  localStorage.getItem("meeklee-adventures-save-v1")));
const square=(page,i)=>page.locator('[data-chess-index="'+i+'"]');
test("Chess is playable on 320px phone without sideways overflow or losing puzzle progress",async({browser})=>{
  const {context,page}=await openChess(browser,320,{
    progress:{harvest:6001},
    collection:{claimed:{"harvest:1":true},companion:"bunny"}});
  await expect(page.locator(".chess-square")).toHaveCount(64);
  await expect(page.locator(".chess-piece")).toHaveCount(32);
  await expect(page.getByText("Your turn",{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  const saved=await state(page);
  expect(saved.progress.harvest).toBe(6001);
  expect(saved.collection.companion).toBe("bunny");
  await context.close();
});
test("a full Mom + Pip turn, hint, undo, challenge selection and reload work",async({browser})=>{
  const g=newChess(22);
  const {context,page}=await openChess(browser,390,{cards:{chess:g},
    progress:{harvest:34}});
  await page.getByRole("button",{name:"Hint",exact:true}).click();
  await expect(page.locator(".chess-square.suggested")).toHaveCount(1);
  const chosen=chessLegalMoves(g).find(m=>m.from===52&&m.to===36);
  await square(page,chosen.from).click();
  await expect(square(page,chosen.to)).toHaveClass(/destination/);
  await square(page,chosen.to).click();
  await expect.poll(async()=>(await state(page)).cards.chess.moves).toBe(2);
  await page.getByRole("button",{name:"Undo Turn"}).click();
  await expect.poll(async()=>(await state(page)).cards.chess.moves).toBe(0);
  expect((await state(page)).cards.chess.board).toEqual(g.board);
  await page.getByLabel("Pip challenge level").selectOption("confident");
  expect((await state(page)).cards.chess.difficulty).toBe("confident");
  await page.reload();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:"Play Chess with Pip"}).click();
  await expect(page.locator(".chess-square")).toHaveCount(64);
  expect((await state(page)).progress.harvest).toBe(34);
  expect((await state(page)).cards.chess.difficulty).toBe("confident");
  await context.close();
});
test("promotion selection and new game confirmation",async({browser})=>{
  const g=newChess(41);
  g.board=Array(64).fill(null);g.board[60]="K";g.board[4]="k";g.board[8]="P";g.castle="";
  const {context,page}=await openChess(browser,390,{cards:{chess:g},progress:{harvest:44}});
  await page.getByLabel("When my pawn reaches the end").selectOption("N");
  await square(page,8).click();
  await square(page,0).click();
  await expect.poll(async()=>(await state(page)).cards.chess.board[0]).toBe("N");
  await expect(page.getByText(/draw \(insufficient material\)/i)).toBeVisible();
  await page.getByRole("button",{name:"New Game",exact:true}).click();
  await expect(page.getByRole("button",{name:"Confirm New Game"})).toBeVisible();
  await page.getByRole("button",{name:"Confirm New Game"}).click();
  await expect(page.locator(".chess-piece")).toHaveCount(32);
  expect((await state(page)).progress.harvest).toBe(44);
  await context.close();
});
