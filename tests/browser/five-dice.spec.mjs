import {test,expect} from "@playwright/test";
import {newFiveDice} from "../../src/five-dice.js";
async function openDice(browser,width=390,raw=null){
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
  await page.getByRole("button",{name:"Play Five Dice with Pip"}).click();
  await expect(page.getByRole("heading",{name:"Five Dice with Pip"})).toBeVisible();
  return {context,page};
}
const saved=page=>page.evaluate(()=>JSON.parse(
  localStorage.getItem("meeklee-adventures-save-v1")));
const category=(page,id)=>page.locator('[data-dice-category="'+id+'"]');
test("Five Dice fits a 320px phone and gives large hold/roll controls",async({browser})=>{
  const {context,page}=await openDice(browser,320,{progress:{harvest:6001},
    collection:{claimed:{"harvest:1":true},companion:"bunny"}});
  await expect(page.locator(".five-die")).toHaveCount(5);
  await expect(page.locator(".five-dice-row")).toHaveCount(13);
  await expect(page.getByRole("button",{name:/Roll Five Dice/})).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  const state=await saved(page);
  expect(state.progress.harvest).toBe(6001);
  expect(state.collection.companion).toBe("bunny");
  await context.close();
});
test("Mom holds a die across reroll, scores Chance, Pip scores and progress survives reload",async({browser})=>{
  const {context,page}=await openDice(browser,390,{cards:{dice:newFiveDice(117)},
    progress:{harvest:27}});
  await page.getByRole("button",{name:/Roll Five Dice/}).click();
  await expect.poll(async()=>(await saved(page)).cards.dice.rolls).toBe(1);
  const initial=(await saved(page)).cards.dice.dice[0];
  await page.locator('[data-die-index="0"]').click();
  await expect(page.locator('[data-die-index="0"]')).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button",{name:/Roll Again/}).click();
  await expect.poll(async()=>(await saved(page)).cards.dice.rolls).toBe(2);
  expect((await saved(page)).cards.dice.dice[0]).toBe(initial);
  await category(page,"chance").click();
  await expect.poll(async()=>(await saved(page)).cards.dice.turns).toBe(2);
  const g=(await saved(page)).cards.dice;
  expect(g.turn).toBe(0);
  expect(g.scores[0].chance).toBeGreaterThan(0);
  expect(Object.keys(g.scores[1])).toHaveLength(1);
  await expect(page.getByText("Pip's last roll")).toBeVisible();
  await page.reload();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:"Play Five Dice with Pip"}).click();
  expect((await saved(page)).cards.dice.turns).toBe(2);
  expect((await saved(page)).progress.harvest).toBe(27);
  await context.close();
});
test("solo mode starts after double-confirmation and old games keep their saves",async({browser})=>{
  const {context,page}=await openDice(browser,390,{progress:{harvest:63},
    cards:{dice:newFiveDice(33),war:null}});
  await page.getByLabel("Next game's players").selectOption("solo");
  await page.getByRole("button",{name:"New Game",exact:true}).click();
  await expect(page.getByRole("button",{name:/Confirm New Game/})).toBeVisible();
  await page.getByRole("button",{name:/Confirm New Game/}).click();
  await expect.poll(async()=>(await saved(page)).cards.dice.mode).toBe("solo");
  await page.getByRole("button",{name:/Roll Five Dice/}).click();
  await category(page,"ones").click();
  const state=await saved(page);
  expect(state.cards.dice.turns).toBe(1);
  expect(Object.keys(state.cards.dice.scores[1])).toHaveLength(0);
  expect(state.progress.harvest).toBe(63);
  await context.close();
});
test("repeat five of a kind forces upper row and awards +100",async({browser})=>{
  const g=newFiveDice(70,"solo");
  g.rolls=1;g.dice=[4,4,4,4,4];g.scores[0]={fiveKind:50};g.turns=1;
  const {context,page}=await openDice(browser,390,{cards:{dice:g}});
  await expect(category(page,"fours")).toBeEnabled();
  await expect(category(page,"chance")).toBeDisabled();
  await category(page,"fours").click();
  await expect.poll(async()=>(await saved(page)).cards.dice.bonuses[0]).toBe(1);
  expect((await saved(page)).cards.dice.scores[0].fours).toBe(20);
  await expect(page.getByText("100",{exact:true})).toBeVisible();
  await context.close();
});
