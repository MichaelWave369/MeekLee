import {test,expect} from "@playwright/test";
import {newRook} from "../../src/rook.js";

async function phone(browser,raw=null,animation=false,width=390){
  const context=await browser.newContext({
    viewport:{width,height:780},isMobile:true,hasTouch:true,
    deviceScaleFactor:2,reducedMotion:animation?"no-preference":"reduce"
  });
  const page=await context.newPage();
  if(raw)await page.addInitScript((value)=>{
    if(!localStorage.getItem("meeklee-adventures-save-v1"))
      localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify(value));
  },raw);
  await page.goto("./");
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:/Play Rook Card Table/}).click();
  await expect(page.getByRole("heading",{name:"Rook Card Table"})).toBeVisible();
  return {context,page};
}
const state=page=>page.evaluate(()=>
  JSON.parse(localStorage.getItem("meeklee-adventures-save-v1")).cards);

test("cozy Rook kitchen table, distinct bot personalities and one-tap records fit Mom's phone",async({browser})=>{
  const {context,page}=await phone(browser);
  await expect(page.getByText("Welcome to Family Game Night")).toBeVisible();
  await expect(page.locator(".rook-table-area")).toBeVisible();
  await expect(page.locator(".rook-bot-line")).toHaveCount(3);
  await expect(page.locator(".rook-opponent.partner")).toContainText("Pip");
  await expect(page.locator(".rook-records>summary")).toContainText("0 Wins");
  await page.locator(".rook-records>summary").click();
  await expect(page.getByText("Games played")).toBeVisible();
  await expect(page.getByText("Favorite trump")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await context.close();
});

test("only Mom's trump choices update her favorite and remain saved on reload",async({browser})=>{
  const game={...newRook(61),phase:"trump",bidder:0,turn:0,bid:90};
  const raw={mode:"harvest",settings:{easy:true,motion:false},
    cards:{rook:game}};
  const {context,page}=await phone(browser,raw);
  await page.locator(".rook-suit-row").getByRole("button",{name:/Green/}).click();
  await expect.poll(async()=>(await state(page)).rookStats.trumpCounts.green).toBe(1);
  await expect(page.getByText("Trump: green")).toBeVisible();
  await page.locator(".rook-records>summary").click();
  await expect(page.locator(".rook-record-grid")).toContainText("Green");
  await page.reload();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:/Play Rook Card Table/}).click();
  await page.locator(".rook-records>summary").click();
  await expect(page.locator(".rook-record-grid")).toContainText("Green");
  await expect.poll(async()=>(await state(page)).rookStats.trumpCounts.green).toBe(1);
  await context.close();
});

test("winning trick records one team victory, offers confetti and cannot count again on reload",async({browser})=>{
  const deal=newRook(77);
  const trick=deal.hands.flat().slice(0,4).map((card,seat)=>({card,seat}));
  const game={...deal,phase:"trick-done",bidder:0,bid:70,trump:"red",
    hands:[[],[],[],[]],trick,trickWinner:0,points:[120,0],
    scores:[290,100],turn:0};
  const raw={mode:"harvest",settings:{easy:true,motion:true},
    cards:{rook:game}};
  const {context,page}=await phone(browser,raw,true);
  await expect(page.getByRole("heading",{name:/Mom and Pip win the game!/})).toBeVisible({timeout:7000});
  await expect.poll(async()=>(await state(page)).rookStats.played).toBe(1);
  await expect.poll(async()=>(await state(page)).rookStats.wins).toBe(1);
  await expect.poll(async()=>(await state(page)).rookStats.bestStreak).toBe(1);
  await expect(page.locator(".rook-confetti>span")).toHaveCount(24);
  await expect(page.getByText(/Pip: We did it, partner!/)).toBeVisible();
  await page.reload();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:/Play Rook Card Table/}).click();
  await expect(page.locator(".rook-records>summary")).toContainText("1 Wins");
  await expect.poll(async()=>(await state(page)).rookStats.played).toBe(1);
  await page.getByRole("button",{name:/Play Again \(Free\)/}).click();
  await expect.poll(async()=>(await state(page)).rook.phase).toBe("bid");
  await expect.poll(async()=>(await state(page)).rookStats.played).toBe(1);
  await context.close();
});

test("animations disabled suppress confetti and the table remains readable at 320px",async({browser})=>{
  const game={...newRook(81),phase:"game-over",winner:0,scores:[325,100]};
  const raw={mode:"harvest",settings:{easy:true,motion:false},
    cards:{rook:game}};
  const {context,page}=await phone(browser,raw,false,320);
  await expect(page.locator(".rook-confetti>span")).toHaveCount(0);
  await expect(page.getByRole("heading",{name:/Mom and Pip win/})).toBeVisible();
  await expect(page.getByText(/Pip: We did it, partner!/)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await expect.poll(async()=>(await state(page)).rookStats.played).toBe(0);
  await context.close();
});
