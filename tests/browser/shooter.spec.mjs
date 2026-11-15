import { test, expect } from "@playwright/test";
import { makeShooterLevel, bubbleGeometry } from "../../src/shooter.js";

test("Bubble Lagoon opens an original aim-and-shoot arena with large phone controls",async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:780},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  await page.goto("./");
  await page.getByRole("button",{name:/Worlds/}).click();
  await page.getByRole("button",{name:/Bubble Lagoon/}).click();
  await expect(page.getByRole("heading",{name:"Level 1"})).toBeVisible();
  await expect(page.locator(".shooter-svg")).toBeVisible();
  await expect(page.getByRole("button",{name:"Shoot!"})).toBeEnabled();
  const width=await page.locator(".shooter-svg").evaluate(el=>el.getBoundingClientRect().width);
  expect(width).toBeGreaterThan(300);
  await page.getByRole("button",{name:"Shoot!"}).click();
  await expect(page.getByText(/1 shots/)).toBeVisible({timeout:7000}).catch(async()=>{
    // The game does not display shots in a dedicated text label, so check the persisted state.
    await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("meeklee-adventures-save-v1")).easyShooterGames.bubbles.moves)).toBe(1);
  });
  await page.reload();
  await expect(page.locator(".shooter-svg")).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("meeklee-adventures-save-v1")).easyShooterGames.bubbles.moves)).toBe(1);
  await context.close();
});

test("bubble shooter finishes a level via the free rescue and returns to the next marker",async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:780},isMobile:true,hasTouch:true,reducedMotion:"reduce"});
  const page=await context.newPage();
  const game=makeShooterLevel(10,6);
  // Seed a small single cluster so free rescue safely clears the board.
  game.cells.fill(null);
  game.cells[0]=0; game.cells[1]=0;
  await page.addInitScript(({game})=>{
    if(!localStorage.getItem("meeklee-adventures-save-v1"))
      localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify({
        mode:"bubbles",settings:{easy:true,highContrast:true,motion:false},
        easyShooterGames:{bubbles:game},easyShooterProgress:{bubbles:10}
      }));
  },{game});
  await page.goto("./");
  await page.getByRole("button",{name:/Free Rainbow Rescue/}).click();
  await expect(page.getByRole("heading",{name:/Level 10 Complete!/})).toBeVisible({timeout:5000});
  await page.getByRole("button",{name:/See My Adventure Path/}).click();
  await expect(page.getByText("Page 2")).toBeVisible();
  await expect(page.getByRole("button",{name:/Level 11, current/})).toBeEnabled();
  await page.getByRole("button",{name:/Play Level 11/}).click();
  await expect(page.locator(".shooter-svg")).toBeVisible();
  await context.close();
});

test("touch aiming updates the dotted shot trajectory and release fires",async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:780},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  await page.goto("./");
  await page.getByRole("button",{name:/Worlds/}).click();
  await page.getByRole("button",{name:/Bubble Lagoon/}).click();
  const svg=page.locator(".shooter-svg"),rect=await svg.boundingBox();
  const session=await context.newCDPSession(page);
  const x=rect.x+rect.width*.75,y=rect.y+rect.height*.4;
  await session.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y}]});
  await session.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:x-18,y:y+8}]});
  await expect(page.locator(".shooter-svg polyline")).toBeVisible();
  await session.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("meeklee-adventures-save-v1"))?.easyShooterGames?.bubbles?.moves),{timeout:8000}).toBe(1);
  await context.close();
});
