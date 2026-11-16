import {test,expect} from "@playwright/test";
import {makeLevel,EASY_SIZE} from "../../src/core.js";

function wav(name="Gentle Garden.wav",seconds=4){
  const samples=8000*seconds;
  const bytes=Buffer.alloc(44+samples,128);
  bytes.write("RIFF",0,4,"ascii");
  bytes.writeUInt32LE(36+samples,4);
  bytes.write("WAVE",8,4,"ascii");
  bytes.write("fmt ",12,4,"ascii");
  bytes.writeUInt32LE(16,16);
  bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);
  bytes.writeUInt32LE(8000,24);bytes.writeUInt32LE(8000,28);
  bytes.writeUInt16LE(1,32);bytes.writeUInt16LE(8,34);
  bytes.write("data",36,4,"ascii");
  bytes.writeUInt32LE(samples,40);
  return {name,mimeType:"audio/wav",buffer:bytes};
}
async function phone(browser,raw=null,width=390,notes=null){
  const context=await browser.newContext({
    viewport:{width,height:780},isMobile:true,hasTouch:true,
    deviceScaleFactor:2,reducedMotion:"reduce"
  });
  const page=await context.newPage();
  if(raw||notes)await page.addInitScript(({raw,notes})=>{
    if(raw&&!localStorage.getItem("meeklee-adventures-save-v1"))
      localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify(raw));
    if(notes&&!localStorage.getItem("meeklee-family-porch-notes-v1"))
      localStorage.setItem("meeklee-family-porch-notes-v1",JSON.stringify(notes));
  },{raw,notes});
  // These older tests explicitly exercise the local-import fallback, even once
  // all eight original songs are publicly included with the game.
  await page.route("**/audio/manifest.json*",route=>route.fulfill({
    status:200,contentType:"application/json",
    body:JSON.stringify({version:1,tracks:[]})
  }));
  await page.goto("./");
  await expect(page.locator("[data-soundtrack-player]")).toBeVisible();
  return {context,page};
}
async function openShelf(page){
  await page.locator(".soundtrack-library summary").click();
  await expect(page.locator(".soundtrack-slots")).toBeVisible();
}
const saved=page=>page.evaluate(()=>
  JSON.parse(localStorage.getItem("meeklee-adventures-save-v1")));
test("320px eight-slot jukebox is initially silent and never needs a Suno login",async({browser})=>{
  const {context,page}=await phone(browser,null,320);
  await expect(page.getByRole("button",{name:"Play soundtrack"})).toBeDisabled();
  await openShelf(page);
  await expect(page.locator("[data-soundtrack-slot]")).toHaveCount(8);
  await expect(page.locator("[data-soundtrack-play]")).toHaveCount(0);
  await expect(page.getByText(/0\/8 loaded/)).toBeVisible();
  await expect(page.getByText(/Files are stored in this browser/)).toBeVisible();
  const audio=page.locator("[data-soundtrack-audio]");
  expect(await audio.evaluate(el=>el.paused)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await context.close();
});
test("import eight WAV recordings locally into all eight world slots and restore on reload",async({browser})=>{
  const {context,page}=await phone(browser);
  await openShelf(page);
  await page.locator("[data-soundtrack-import]").setInputFiles(
    Array.from({length:8},(_,i)=>wav("Mom_Original_"+(i+1)+".wav")));
  await expect.poll(async()=>page.locator("[data-soundtrack-play]").count()).toBe(8);
  await expect(page.getByText(/8\/8 loaded/)).toBeVisible();
  await expect(page.locator('[data-soundtrack-slot="0"]')).toContainText("Mom Original 1");
  await expect(page.locator('[data-soundtrack-slot="7"]')).toContainText("Mom Original 8");
  await expect.poll(async()=>page.evaluate(()=>new Promise((resolve,reject)=>{
    const request=indexedDB.open("meeklee-local-soundtrack-v1");
    request.onsuccess=()=>{
      const db=request.result;
      const transaction=db.transaction("tracks","readonly");
      const all=transaction.objectStore("tracks").getAll();
      all.onsuccess=()=>{resolve(all.result.length);db.close();};
      all.onerror=()=>{reject(all.error);db.close();};
    };
    request.onerror=()=>reject(request.error);
  }))).toBe(8);
  await page.reload();
  await expect(page.getByRole("button",{name:"Play soundtrack"})).toBeEnabled();
  await openShelf(page);
  await expect(page.locator("[data-soundtrack-play]")).toHaveCount(8);
  await expect(page.locator('[data-soundtrack-slot="4"]')).toContainText("Mom Original 5");
  await context.close();
});
test("one WAV recording really loads into the audio element and player persists across world navigation",async({browser})=>{
  const {context,page}=await phone(browser,null,320);
  await openShelf(page);
  await page.locator("[data-soundtrack-import]").setInputFiles(wav("Village_Dream.wav",8));
  await expect(page.locator("[data-soundtrack-play]")).toHaveCount(1);
  await page.locator('[data-soundtrack-play="0"]').click();
  await expect.poll(async()=>page.locator("[data-soundtrack-audio]")
    .evaluate(el=>el.currentSrc.startsWith("blob:"))).toBe(true);
  await expect(page.getByText(/Playing: Village Dream/)).toBeVisible();
  await page.getByRole("button",{name:"Pause soundtrack"}).click();
  expect(await page.locator("[data-soundtrack-audio]").evaluate(el=>el.paused)).toBe(true);
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Garden/}).click();
  await expect(page.getByRole("heading",{name:"Mom's Happy Garden"})).toBeVisible();
  await expect(page.locator("[data-soundtrack-player]")).toHaveCount(1);
  expect(await page.locator("[data-soundtrack-audio]")
    .evaluate(el=>el.currentSrc.startsWith("blob:"))).toBe(true);
  await context.close();
});
test("individual slot replacement, remove and reload never alter other songs",async({browser})=>{
  const {context,page}=await phone(browser);
  await openShelf(page);
  await page.locator("[data-soundtrack-import]").setInputFiles([
    wav("Original_One.wav"),wav("Original_Two.wav")
  ]);
  await expect(page.locator("[data-soundtrack-play]")).toHaveCount(2);
  await page.locator('[data-soundtrack-replace="1"]').click();
  await page.locator("[data-soundtrack-single]").setInputFiles(wav("New_Second.wav"));
  await expect(page.locator('[data-soundtrack-slot="1"]')).toContainText("New Second");
  await expect(page.locator('[data-soundtrack-slot="0"]')).toContainText("Original One");
  await page.locator('[data-soundtrack-remove="0"]').click();
  await expect(page.locator('[data-soundtrack-slot="0"]')).toContainText("Empty slot");
  await expect(page.locator('[data-soundtrack-slot="1"]')).toContainText("New Second");
  await page.reload();
  await openShelf(page);
  await expect(page.locator("[data-soundtrack-play]")).toHaveCount(1);
  await expect(page.locator('[data-soundtrack-slot="1"]')).toContainText("New Second");
  await context.close();
});
test("invalid audio is rejected and separate local family notes and high-level saves remain untouched",async({browser})=>{
  const harvest=makeLevel("harvest",6001,EASY_SIZE);
  const notes=[{id:"family-only",kind:"recipe",title:"Grandma's Jelly",
    body:"Keep for family only",by:"Mom",at:1700000000000}];
  const {context,page}=await phone(browser,{
    mode:"harvest",settings:{easy:true,motion:false},
    easyGames:{harvest},easyProgress:{harvest:6001,kitchen:18},
    collection:{claimed:{"harvest:1":true},villageSeason:"winter",
      villageAtmosphere:{timeOfDay:"night",lanterns:true,fireflies:false}}
  },320,notes);
  await openShelf(page);
  await page.locator("[data-soundtrack-import]").setInputFiles({
    name:"not-a-song.txt",mimeType:"text/plain",buffer:Buffer.from("no audio")
  });
  await expect(page.locator("[data-soundtrack-play]")).toHaveCount(0);
  await expect(page.locator("[data-soundtrack-status]")).toContainText("Choose MP3");
  await page.locator('[data-soundtrack-replace="3"]').click();
  await page.locator("[data-soundtrack-single]").setInputFiles(wav("Mom_Track_4.wav"));
  await expect(page.locator('[data-soundtrack-slot="3"]')).toContainText("Mom Track 4");
  const state=await saved(page);
  expect(state.easyGames.harvest).toEqual(harvest);
  expect(state.easyProgress.harvest).toBe(6001);
  expect(state.easyProgress.kitchen).toBe(18);
  expect(state.collection.villageSeason).toBe("winter");
  expect(state.collection.villageAtmosphere.timeOfDay).toBe("night");
  expect(state.collection.claimed["harvest:1"]).toBe(true);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("meeklee-family-porch-notes-v1"))))
    .toEqual(notes);
  await context.close();
});
