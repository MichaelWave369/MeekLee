import test from "node:test";
import assert from "node:assert/strict";
import {
  SOUNDTRACK_SLOTS,MAX_SOUNDTRACK_TRACKS,MAX_AUDIO_BYTES,
  audioFileCheck,soundtrackSlotIndex,soundtrackDisplayName
} from "../src/soundtrack.js";
import {SOUNDTRACK_DB,SOUNDTRACK_STORE} from "../src/soundtrack-storage.js";

test("eight independent world music slots match existing puzzle worlds",()=>{
  assert.deepEqual(SOUNDTRACK_SLOTS.map(item=>item.id),
    ["harvest","sweets","rescue","bubbles","meadow","pumpkin","moonlight","kitchen"]);
  assert.equal(MAX_SOUNDTRACK_TRACKS,8);
  assert.equal(new Set(SOUNDTRACK_SLOTS.map(x=>x.id)).size,8);
  assert(SOUNDTRACK_SLOTS.every(x=>x.icon&&x.name));
});
test("only valid slots 0-7 are accepted for saving/removing audio",()=>{
  for(let i=0;i<8;i++)assert.equal(soundtrackSlotIndex(i),i);
  for(const i of [-1,8,9,null,undefined,"2",1.1,Number.NaN])
    assert.equal(soundtrackSlotIndex(i),null);
});
test("local audio file type and size validation rejects unsupported content",()=>{
  for(const [name,type] of [
    ["Morning.mp3","audio/mpeg"],
    ["Evening.wav","audio/wav"],
    ["Café.ogg","audio/ogg"],
    ["Glow.m4a","audio/mp4"],
    ["Birds.aac","audio/aac"],
    ["Orchard.flac","audio/flac"],
    ["MUSIC.MP3",""],
    ["sample.wav","application/octet-stream"]
  ])assert.equal(audioFileCheck({name,size:4096,type}),null);
  for(const name of ["malware.exe","fake.html","song.mid","song.m3u",
    "video.mp4","soundtrack.json","notes.txt","self.svg"]){
    assert(audioFileCheck({name,size:100,type:""}),name);
  }
  assert(audioFileCheck({name:"huge.mp3",size:MAX_AUDIO_BYTES+1,type:"audio/mpeg"}));
  assert(audioFileCheck({name:"empty.mp3",size:0,type:"audio/mpeg"}));
  assert(audioFileCheck({name:"bad.mp3",size:200,type:"text/html"}));
  assert(audioFileCheck({name:"bad.wav",size:200,type:"application/javascript"}));
  assert(audioFileCheck(null));
  assert(audioFileCheck({}));
  assert.equal(MAX_AUDIO_BYTES,60*1024*1024);
});
test("track titles are short and friendly without exposing file paths",()=>{
  assert.equal(soundtrackDisplayName("Summer_Morning.mp3"),"Summer Morning");
  assert.equal(soundtrackDisplayName("Moonlight-Orchard.WAV"),"Moonlight Orchard");
  assert.equal(soundtrackDisplayName(""),"Untitled track");
  assert.equal(soundtrackDisplayName(null),"Untitled track");
  assert(soundtrackDisplayName("A".repeat(500)+".mp3").length<=110);
});
test("audio IndexedDB is entirely separate from legacy puzzle and private family keys",()=>{
  assert.equal(SOUNDTRACK_DB,"meeklee-local-soundtrack-v1");
  assert.equal(SOUNDTRACK_STORE,"tracks");
  assert.notEqual(SOUNDTRACK_DB,"meeklee-adventures-save-v1");
  assert.notEqual(SOUNDTRACK_DB,"meeklee-family-porch-notes-v1");
});
