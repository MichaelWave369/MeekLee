import test from "node:test";
import assert from "node:assert/strict";
import {zipAudioCrc32,MAX_SOUNDTRACK_ZIP_BYTES,extractSoundtrackZip} from "../src/soundtrack-zip.js";
import {MEEKLEE_ORIGINAL_TRACKS,assignMeekLeeSlots} from "../src/soundtrack.js";

test("local ZIP integrity checksum matches the standard CRC-32 test vector",()=>{
  assert.equal(zipAudioCrc32(new TextEncoder().encode("123456789")),0xcbf43926);
  assert.equal(zipAudioCrc32(new Uint8Array()),0);
  assert.equal(MAX_SOUNDTRACK_ZIP_BYTES,128*1024*1024);
});
test("invalid ZIP inputs are rejected before reading any archive data",async()=>{
  await assert.rejects(extractSoundtrackZip(null),/Choose a ZIP/);
  await assert.rejects(extractSoundtrackZip({name:"bad.txt",size:100}),/Choose a ZIP/);
  await assert.rejects(extractSoundtrackZip({name:"bad.zip",size:1}),/between 22 bytes/);
  await assert.rejects(extractSoundtrackZip({name:"huge.zip",size:MAX_SOUNDTRACK_ZIP_BYTES+1}),/between 22 bytes/);
});
test("all eight creator tracks retain their titles and can be placed in any archive order",()=>{
  const files=MEEKLEE_ORIGINAL_TRACKS.map(name=>({name})).reverse();
  const assignments=assignMeekLeeSlots(files);
  assert.deepEqual(assignments.map(x=>x.slot),[7,6,5,4,3,2,1,0]);
  assert.equal(assignments.at(0).file.name,"Main Theme A · The Welcome.mp3");
  assert.equal(assignments.at(-1).file.name,"Morning in Harvest Valley A.mp3");
});
