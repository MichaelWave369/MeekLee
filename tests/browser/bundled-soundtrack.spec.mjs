import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import {MEEKLEE_ORIGINAL_TRACKS} from "../../src/soundtrack.js";

const manifest=JSON.parse(readFileSync("scripts/original-soundtrack.json","utf8"));
function wav(seconds=5){
  const samples=8000*seconds,bytes=Buffer.alloc(44+samples,128);
  bytes.write("RIFF",0,4,"ascii");bytes.writeUInt32LE(36+samples,4);
  bytes.write("WAVE",8,4,"ascii");bytes.write("fmt ",12,4,"ascii");
  bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);
  bytes.writeUInt32LE(8000,24);bytes.writeUInt32LE(8000,28);
  bytes.writeUInt16LE(1,32);bytes.writeUInt16LE(8,34);
  bytes.write("data",36,4,"ascii");bytes.writeUInt32LE(samples,40);
  return bytes;
}
async function launch(browser,width=320,raw=null){
  const context=await browser.newContext({viewport:{width,height:780},
    isMobile:true,hasTouch:true,deviceScaleFactor:2,reducedMotion:"reduce"});
  const page=await context.newPage();
  const data={version:1,tracks:manifest.tracks.map(t=>({
    slot:t.slot,name:t.name,path:"audio/"+t.file,bytes:t.size,sha256:t.sha256
  }))};
  await page.route("**/audio/manifest.json*",route=>route.fulfill({
    status:200,contentType:"application/json",body:JSON.stringify(data)
  }));
  await page.route("**/audio/*.mp3",route=>route.fulfill({
    status:200,contentType:"audio/wav",body:wav()
  }));
  if(raw)await page.addInitScript(saved=>{
    if(!localStorage.getItem("meeklee-adventures-save-v1"))
      localStorage.setItem("meeklee-adventures-save-v1",JSON.stringify(saved));
  },raw);
  await page.goto("./");
  await expect(page.getByRole("button",{name:"Play soundtrack"})).toBeEnabled();
  return {context,page};
}
test("Mom gets eight online tracks and one big Play button, without file-import knowledge",async({browser})=>{
  const {context,page}=await launch(browser,320);
  await expect(page.locator("[data-soundtrack-player]")).toBeVisible();
  await expect(page.locator("[data-soundtrack-status]")).toContainText("songs included");
  await expect(page.locator("[data-soundtrack-audio]")).toHaveJSProperty("paused",true);
  await page.locator(".soundtrack-library summary").click();
  await expect(page.locator("[data-soundtrack-play]")).toHaveCount(8);
  await expect(page.getByText(/8\/8 loaded/)).toBeVisible();
  for(let i=0;i<8;i++){
    await expect(page.locator('[data-soundtrack-slot="'+i+'"]')).toContainText(
      MEEKLEE_ORIGINAL_TRACKS[i].replace(/\.mp3$/,"").replace(/_/g," "));
    await expect(page.locator('[data-soundtrack-slot="'+i+'"]')).toContainText("Included");
  }
  const bytes=await page.evaluate(()=>performance.getEntriesByType("resource").filter(
    r=>r.name.endsWith(".mp3")).length);
  expect(bytes).toBe(0,"loading the game must not fetch the music files");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await context.close();
});
test("press Play streams one MP3 on demand, can pause and survives switching to Garden",async({browser})=>{
  const {context,page}=await launch(browser,320);
  await page.getByRole("button",{name:"Play soundtrack"}).click();
  await expect.poll(async()=>page.locator("[data-soundtrack-audio]")
    .evaluate(a=>a.currentSrc.includes("08-main-theme.mp3"))).toBe(true);
  await expect(page.getByText(/Playing: Main Theme/)).toBeVisible();
  await page.getByRole("button",{name:"Pause soundtrack"}).click();
  expect(await page.locator("[data-soundtrack-audio]").evaluate(a=>a.paused)).toBe(true);
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Garden/}).click();
  await expect(page.getByRole("heading",{name:"Mom's Happy Garden"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Play soundtrack"})).toBeEnabled();
  await expect(page.locator("[data-soundtrack-audio]")).toHaveCount(1);
  await context.close();
});
test("online songs do not touch existing level 6001, garden collection or private storage",async({browser})=>{
  const {context,page}=await launch(browser,390,{
    mode:"harvest",easyProgress:{harvest:6001,moonlight:19},
    collection:{claimed:{"harvest:1":true},companion:"bunny",
      villagePlacements:{sunflower:"square:0"},villageSeason:"winter"}
  });
  await page.locator(".soundtrack-library summary").click();
  await expect(page.locator("[data-soundtrack-play]")).toHaveCount(8);
  await page.locator('[data-soundtrack-play="0"]').click();
  await expect.poll(async()=>page.locator("[data-soundtrack-audio]")
    .evaluate(a=>a.currentSrc.includes("01-harvest-valley.mp3"))).toBe(true);
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem("meeklee-adventures-save-v1")));
  expect(state.easyProgress.harvest).toBe(6001);
  expect(state.easyProgress.moonlight).toBe(19);
  expect(state.collection.companion).toBe("bunny");
  expect(state.collection.villagePlacements).toEqual({sunflower:"square:0"});
  expect(state.collection.villageSeason).toBe("winter");
  await context.close();
});
