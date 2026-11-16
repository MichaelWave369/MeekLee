import test from "node:test";
import assert from "node:assert/strict";
import {readFile,mkdtemp,writeFile,rm,stat} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {execFileSync} from "node:child_process";
import {BUNDLED_AUDIO_FILES,parseBundledSoundtrack} from "../src/bundled-soundtrack.js";
import {MEEKLEE_ORIGINAL_TRACKS} from "../src/soundtrack.js";

const expected=JSON.parse(await readFile("scripts/original-soundtrack.json","utf8"));
const manifest={version:1,tracks:expected.tracks.map(x=>({
  slot:x.slot,name:x.name,path:"audio/"+x.file,bytes:x.size,sha256:x.sha256
}))};
test("published songs are the same eight originals with pinned integrity digests",()=>{
  assert.equal(BUNDLED_AUDIO_FILES.length,8);
  assert.deepEqual(expected.tracks.map(t=>t.name),MEEKLEE_ORIGINAL_TRACKS);
  assert.deepEqual(expected.tracks.map(t=>t.file),BUNDLED_AUDIO_FILES);
  assert.equal(new Set(expected.tracks.map(t=>t.sha256)).size,8);
  assert(expected.tracks.every(t=>/^[0-9a-f]{64}$/.test(t.sha256)));
  assert(expected.tracks.every(t=>t.size>0&&t.size<60*1024*1024));
});
test("built-in manifest loads only if all eight trusted, correct same-origin entries exist",()=>{
  const tracks=parseBundledSoundtrack(manifest,"/MeekLee/");
  assert.equal(tracks.length,8);
  assert.equal(tracks[7].name,"Main Theme A · The Welcome.mp3");
  assert.equal(tracks[7].url,"/MeekLee/audio/08-main-theme.mp3");
  assert(tracks.every(t=>t.bundled));
  assert.deepEqual(parseBundledSoundtrack({version:1,tracks:[]}),[]);
  assert.deepEqual(parseBundledSoundtrack({...manifest,tracks:manifest.tracks.slice(0,7)}),[]);
  assert.deepEqual(parseBundledSoundtrack({...manifest,tracks:[
    {...manifest.tracks[0],path:"https://evil.example/audio.mp3"},...manifest.tracks.slice(1)
  ]}),[]);
  assert.deepEqual(parseBundledSoundtrack({...manifest,tracks:[
    {...manifest.tracks[0],name:"Pretend track.mp3"},...manifest.tracks.slice(1)
  ]}),[]);
  assert.deepEqual(parseBundledSoundtrack(manifest,"https://example.com/"),[]);
  assert.deepEqual(parseBundledSoundtrack(manifest,"/MeekLee"),[]);
  assert.deepEqual(parseBundledSoundtrack({version:2,tracks:manifest.tracks}),[]);
});
test("an unbundled checkout generates a truthful empty manifest; partial sets fail safely",async()=>{
  const temp=await mkdtemp(join(tmpdir(),"meeklee-audio-test-"));
  try{
    const result=execFileSync(process.execPath,["scripts/build-soundtrack-index.mjs"],{
      env:{...process.env,MEEKLEE_AUDIO_DIR:temp},encoding:"utf8"
    });
    assert.match(result,/no online audio yet/);
    const empty=JSON.parse(await readFile(join(temp,"manifest.json"),"utf8"));
    assert.deepEqual(empty,{version:1,tracks:[]});
    await writeFile(join(temp,BUNDLED_AUDIO_FILES[0]),"not audio");
    assert.throws(()=>execFileSync(process.execPath,["scripts/build-soundtrack-index.mjs"],{
      env:{...process.env,MEEKLEE_AUDIO_DIR:temp},encoding:"utf8",stdio:"pipe"
    }),/partial bundled soundtrack/);
  }finally{await rm(temp,{recursive:true,force:true});}
});
test("service worker explicitly does not precache or intercept large streamed music",async()=>{
  const text=await readFile("scripts/build-sw.mjs","utf8");
  assert.match(text,/url\.startsWith\("\.\/audio\/"\)/);
  assert.match(text,/endsWith\('\.mp3'\)/);
  assert.match(text,/Range requests/);
});
