import {test, expect} from "@playwright/test";
import {makeShooterLevel} from "../../src/shooter.js";

async function withShooter(browser, initial, extra = {}) {
  const context = await browser.newContext({
    viewport: {width:390,height:780},isMobile:true,hasTouch:true,deviceScaleFactor:2,
    reducedMotion:"reduce"
  });
  const page=await context.newPage();
  await page.addInitScript(({game,extra})=>{
    if(!localStorage.getItem("meeklee-adventures-save-v1"))
      localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify({
        mode:"bubbles",
        settings:{easy:true,highContrast:true,motion:false},
        easyShooterGames:{bubbles:game},
        easyShooterProgress:{bubbles:game.level},
        ...extra
      }));
  },{game:initial,extra});
  await page.goto("./");
  return {context,page};
}
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem("meeklee-adventures-save-v1")).easyShooterGames.bubbles);

test("Pearl adds three balls immediately and remains redeemed after reload",async({browser})=>{
  const initial=makeShooterLevel(4,6,{pearls:1});
  initial.shotsLeft=3;
  const {context,page}=await withShooter(browser,initial);
  await expect(page.getByRole("button",{name:/Use Pearl Boost, 1 saved/})).toBeEnabled();
  await page.getByRole("button",{name:/Use Pearl Boost/}).click();
  await expect(page.getByRole("button",{name:/Use Pearl Boost, 0 saved/})).toBeDisabled();
  await expect.poll(async()=>(await saved(page)).shotsLeft).toBe(6);
  await page.reload();
  await expect.poll(async()=>(await saved(page)).pearls).toBe(0);
  await expect.poll(async()=>(await saved(page)).shotsLeft).toBe(6);
  await context.close();
});

test("zero shots freezes shooting and offers a free, more generous level retry",async({browser})=>{
  const initial=makeShooterLevel(4,6);
  initial.cells.fill(null);
  initial.cells[0]=0;initial.currentColor=1;initial.nextColor=1;
  initial.shotsLeft=1;initial.maxShots=1;
  const {context,page}=await withShooter(browser,initial);
  await page.getByRole("button",{name:"Shoot!"}).click();
  await expect(page.getByRole("heading",{name:"Out of Bubbles!"})).toBeVisible({timeout:8000});
  await expect.poll(async()=>(await saved(page)).failed).toBe(true);
  await expect(page.getByRole("button",{name:/Try Level 4 Again/})).toBeVisible();
  await page.getByRole("button",{name:/Try Level 4 Again/}).click();
  await expect(page.getByRole("button",{name:"Shoot!"})).toBeEnabled();
  await expect.poll(async()=>(await saved(page)).retries).toBe(1);
  const state=await saved(page);
  expect(state.shotsLeft).toBeGreaterThan(1);
  expect(state.level).toBe(4);
  expect(state.moves).toBe(0);
  await page.reload();
  await expect.poll(async()=>(await saved(page)).retries).toBe(1);
  await context.close();
});

test("Rainbow Burst wins a level, awards stars, and carries rewards across chapter 10",async({browser})=>{
  const initial=makeShooterLevel(10,6,{pearls:2,rainbows:1});
  initial.cells.fill(null);
  initial.cells[0]=0;initial.cells[1]=0;
  const {context,page}=await withShooter(browser,initial);
  await expect(page.getByRole("button",{name:/Use Rainbow Burst, 1 saved/})).toBeEnabled();
  await page.getByRole("button",{name:/Use Rainbow Burst/}).click();
  await expect(page.getByRole("heading",{name:"Level 10 Complete!"})).toBeVisible({timeout:7000});
  await expect(page.locator(".victory-stars")).toContainText("★★★");
  await expect.poll(async()=>(await saved(page)).rainbows).toBe(0);
  await page.getByRole("button",{name:/See My Adventure Path/}).click();
  await expect(page.getByRole("button",{name:/Level 11, current/})).toBeVisible();
  await page.getByRole("button",{name:/Previous 10/}).click();
  await expect(page.locator(".trail-node.completed .trail-medals").last()).toContainText("★★★");
  await page.reload();
  await page.getByRole("button",{name:/See My Adventure Path/}).click();
  await page.getByRole("button",{name:/Level 11, current/}).click();
  const next=await saved(page);
  expect(next.level).toBe(11);
  expect(next.pearls).toBe(4); // carried 2 + chapter gift 2
  expect(next.rainbows).toBe(0); // earned Rainbow consumed
  await context.close();
});

test("at zero balls an earned Rainbow can still be redeemed instead of being forced to retry",async({browser})=>{
  const initial=makeShooterLevel(3,6,{rainbows:1});
  initial.shotsLeft=0;initial.moves=initial.maxShots;
  const {context,page}=await withShooter(browser,initial);
  await expect(page.getByRole("button",{name:"Shoot!"})).toBeDisabled();
  await expect(page.getByRole("button",{name:/Use Rainbow Burst, 1 saved/})).toBeEnabled();
  await page.getByRole("button",{name:/Use Rainbow Burst/}).click();
  await expect.poll(async()=>(await saved(page)).rainbows).toBe(0);
  await context.close();
});
