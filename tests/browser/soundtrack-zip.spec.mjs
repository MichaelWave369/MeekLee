import {test,expect} from "@playwright/test";
import {deflateRawSync} from "node:zlib";
import {zipAudioCrc32} from "../../src/soundtrack-zip.js";
import {MEEKLEE_ORIGINAL_TRACKS} from "../../src/soundtrack.js";
import {makeLevel,EASY_SIZE} from "../../src/core.js";

function makeZip(entries){
  let localOffset=0;
  const locals=[],central=[];
  for(const entry of entries){
    const name=Buffer.from(entry.name,"utf8");
    const raw=Buffer.from(entry.content??"ID3 valid local bytes");
    const method=entry.method??8;
    const packed=method===8?deflateRawSync(raw):raw;
    const crc=entry.badCrc?0:zipAudioCrc32(raw);
    const l=Buffer.alloc(30+name.length+packed.length);
    l.writeUInt32LE(0x04034b50,0);
    l.writeUInt16LE(20,4);l.writeUInt16LE(0x800,6);
    l.writeUInt16LE(method,8);
    l.writeUInt32LE(crc,14);
    l.writeUInt32LE(packed.length,18);
    l.writeUInt32LE(raw.length,22);
    l.writeUInt16LE(name.length,26);
    name.copy(l,30);packed.copy(l,30+name.length);
    const c=Buffer.alloc(46+name.length);
    c.writeUInt32LE(0x02014b50,0);
    c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);
    c.writeUInt16LE(0x800,8);c.writeUInt16LE(method,10);
    c.writeUInt32LE(crc,16);
    c.writeUInt32LE(packed.length,20);
    c.writeUInt32LE(raw.length,24);
    c.writeUInt16LE(name.length,28);
    c.writeUInt32LE(localOffset,42);
    name.copy(c,46);
    locals.push(l);central.push(c);localOffset+=l.length;
  }
  const cent=Buffer.concat(central);
  const end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0);
  end.writeUInt16LE(entries.length,8);
  end.writeUInt16LE(entries.length,10);
  end.writeUInt32LE(cent.length,12);
  end.writeUInt32LE(localOffset,16);
  return Buffer.concat([...locals,cent,end]);
}
function archive(entries,name="MeekLeeAdventures.zip"){
  return {name,mimeType:"application/zip",buffer:makeZip(entries)};
}
async function phone(browser,raw=null,notes=null,width=390){
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

test("a shuffled 8-MP3 MeekLee ZIP imports by exact original titles, stays silent and survives reload",async({browser})=>{
  const {context,page}=await phone(browser,null,null,320);
  await openShelf(page);
  await expect(page.locator("[data-soundtrack-zip]")).toHaveCount(1);
  await expect(page.getByText(/Import MeekLeeAdventures ZIP/)).toBeVisible();
  const tracks=MEEKLEE_ORIGINAL_TRACKS.map(name=>({name,content:"ID3 "+name})).reverse();
  await page.locator("[data-soundtrack-zip]").setInputFiles(archive(tracks));
  await expect.poll(async()=>page.locator("[data-soundtrack-play]").count()).toBe(8);
  await expect(page.locator("[data-soundtrack-status]")).toContainText("8 recordings ready");
  await expect(page.locator('[data-soundtrack-slot="0"]')).toContainText("Morning in Harvest Valley A");
  await expect(page.locator('[data-soundtrack-slot="1"]')).toContainText("Sugar Mountain Shuffle A");
  await expect(page.locator('[data-soundtrack-slot="2"]')).toContainText("Little Critter Parade A");
  await expect(page.locator('[data-soundtrack-slot="3"]')).toContainText("Bubbles in the Blue A");
  await expect(page.locator('[data-soundtrack-slot="4"]')).toContainText("Pip's Little Garden A");
  await expect(page.locator('[data-soundtrack-slot="5"]')).toContainText("The Family Rook Table A");
  await expect(page.locator('[data-soundtrack-slot="6"]')).toContainText("Solitaire Sunday A");
  await expect(page.locator('[data-soundtrack-slot="7"]')).toContainText("Main Theme A · The Welcome");
  await expect(page.getByRole("button",{name:"Play soundtrack"})).toBeEnabled();
  expect(await page.locator("[data-soundtrack-audio]").evaluate(audio=>audio.paused)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await page.reload();
  await expect(page.getByRole("button",{name:"Play soundtrack"})).toBeEnabled();
  await openShelf(page);
  await expect(page.locator("[data-soundtrack-play]")).toHaveCount(8);
  await expect(page.locator('[data-soundtrack-slot="7"]')).toContainText("Main Theme A · The Welcome");
  await context.close();
});

test("invalid CRC ZIP fails safely instead of saving a damaged song",async({browser})=>{
  const {context,page}=await phone(browser);
  await openShelf(page);
  await page.locator("[data-soundtrack-zip]").setInputFiles(archive([
    {name:MEEKLEE_ORIGINAL_TRACKS[0],content:"broken",badCrc:true}
  ]));
  await expect(page.locator("[data-soundtrack-status]")).toContainText("integrity check");
  await expect(page.locator("[data-soundtrack-play]")).toHaveCount(0);
  await context.close();
});

test("ZIP ignores unrelated text and traversal entries but imports legitimate MP3s",async({browser})=>{
  const {context,page}=await phone(browser);
  await openShelf(page);
  await page.locator("[data-soundtrack-zip]").setInputFiles(archive([
    {name:"../../escape.mp3",content:"fake"},
    {name:"README.txt",content:"Hi"},
    {name:MEEKLEE_ORIGINAL_TRACKS[7],content:"ID3 Welcome",method:0}
  ]));
  await expect(page.locator("[data-soundtrack-play]")).toHaveCount(1);
  await expect(page.locator('[data-soundtrack-slot="7"]')).toContainText("Main Theme A · The Welcome");
  await expect(page.locator('[data-soundtrack-slot="0"]')).toContainText("Empty slot");
  await context.close();
});

test("local ZIP import leaves level 6001, family recipes, village and saved card games untouched",async({browser})=>{
  const old=makeLevel("harvest",6001,EASY_SIZE);
  const notes=[{id:"recipe-for-mom",kind:"recipe",title:"Blackberry Cobbler",
    body:"Private family directions",by:"Mom",at:1700000000000}];
  const {context,page}=await phone(browser,{
    mode:"harvest",settings:{easy:true,motion:false},
    easyGames:{harvest:old},easyProgress:{harvest:6001,kitchen:25},
    collection:{
      claimed:{"harvest:1":true},companion:"bunny",
      meadowPrizes:["meadow_daisy_wreath"],
      hiddenDecorations:["sunflower"],villagePlacements:{sunflower:"square:0"},
      villageLife:{pond:{rounds:7,step:2}},
      villageWander:{step:7},villageSeason:"winter"
    }
  },notes,320);
  await openShelf(page);
  await page.locator("[data-soundtrack-zip]").setInputFiles(archive([
    {name:MEEKLEE_ORIGINAL_TRACKS[0],content:"ID3 Harvest"},
    {name:MEEKLEE_ORIGINAL_TRACKS[7],content:"ID3 Welcome"}
  ]));
  await expect(page.locator("[data-soundtrack-play]")).toHaveCount(2);
  const state=await saved(page);
  expect(state.easyGames.harvest).toEqual(old);
  expect(state.easyProgress.harvest).toBe(6001);
  expect(state.easyProgress.kitchen).toBe(25);
  expect(state.collection.claimed["harvest:1"]).toBe(true);
  expect(state.collection.companion).toBe("bunny");
  expect(state.collection.meadowPrizes).toContain("meadow_daisy_wreath");
  expect(state.collection.villagePlacements).toEqual({sunflower:"square:0"});
  expect(state.collection.villageLife.pond).toEqual({rounds:7,step:2});
  expect(state.collection.villageWander.step).toBe(7);
  expect(state.collection.villageSeason).toBe("winter");
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("meeklee-family-porch-notes-v1"))))
    .toEqual(notes);
  await context.close();
});
