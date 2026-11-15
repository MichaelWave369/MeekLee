import test from "node:test";
import assert from "node:assert/strict";
import { createSaveState } from "../src/save.js";
import {
  GARDEN_DECOR,GARDEN_PETS, BONUS_PIECES,
  chestReward, chapterKey, unlockedForMode, availableChests,
  normalizeCollection, claimChapterChest, gardenInventory, isChestClaimable, totalAvailableChests,
  selectCompanion, toggleDecoration, bonusBoard, completeBonus
} from "../src/collection.js";

function unlocked(raw,mode,level,board="easy") {
  const out=createSaveState(raw,true);
  const key=mode==="bubbles" ? (board==="easy"?"easyShooterProgress":"shooterProgress"):
    (board==="easy"?"easyProgress":"progress");
  return {...out,[key]:{...out[key],[mode]:level}};
}

test("ten completed levels are required for one chest, never nine",()=>{
  let saved=unlocked(null,"harvest",10);
  assert.equal(availableChests(saved).length,0);
  saved=unlocked(saved,"harvest",11);
  assert.deepEqual(availableChests(saved).map(r=>r.key),["harvest:1"]);
  assert.equal(unlockedForMode(saved,"harvest"),11);
  assert.equal(chapterKey("harvest",1),"harvest:1");
  assert.equal(chapterKey("wrong",1),null);
});

test("claiming is once per world chapter across easy/classic boards, and replay never duplicates",()=>{
  let saved=unlocked(null,"rescue",21);
  saved=unlocked(saved,"rescue",11,"classic");
  assert.deepEqual(availableChests(saved).map(r=>r.key),["rescue:1","rescue:2"]);
  const first=claimChapterChest(saved,"rescue",1);
  assert(first.valid);
  assert.equal(first.reward.level,10);
  assert(GARDEN_DECOR.some(d=>d.id===first.reward.decor.id));
  assert(GARDEN_PETS.some(p=>p.id===first.reward.pet.id));
  saved={...saved,collection:first.collection};
  assert.equal(claimChapterChest(saved,"rescue",1).valid,false);
  assert.deepEqual(availableChests(saved).map(r=>r.key),["rescue:2"]);
  // Old save still retains the original level; collection is a separate field.
  assert.equal(saved.easyProgress.rescue,21);
  assert.equal(saved.progress.rescue,11);
  const second=claimChapterChest(saved,"rescue",2);
  assert(second.valid);
  saved={...saved,collection:second.collection};
  assert.equal(availableChests(saved).length,0);
  assert.equal(claimChapterChest(saved,"rescue",3).valid,false);
});

test("bubble shooter milestones use shooter progression rather than obsolete legacy match-3 data",()=>{
  let saved=unlocked(null,"bubbles",12);
  saved={...saved,easyProgress:{...saved.easyProgress,bubbles:1234}};
  assert.equal(unlockedForMode(saved,"bubbles"),12);
  assert.deepEqual(availableChests(saved).map(r=>r.key),["bubbles:1"]);
  saved=unlocked(saved,"bubbles",22,"classic");
  assert.deepEqual(availableChests(saved).map(r=>r.key),["bubbles:1","bubbles:2"]);
});

test("collection migration preserves old saves and sanitizes unearned items",()=>{
  const legacy=createSaveState({mode:"harvest",easyProgress:{harvest:31},
    collection:{claimed:{"harvest:1":true,"harvest:2":true,"fake:1":true,"sweets:01":true},
      completedBonuses:{"harvest:1":13,"unearned:4":8},
      hiddenDecorations:["not-owned","sunflower","sunflower"],
      companion:"not-owned"}
  },true);
  assert.equal(legacy.easyProgress.harvest,31);
  assert.deepEqual(Object.keys(legacy.collection.claimed),["harvest:1","harvest:2"]);
  assert.deepEqual(legacy.collection.completedBonuses,{"harvest:1":13});
  assert.equal(legacy.collection.companion,null);
  assert(!legacy.collection.hiddenDecorations.includes("not-owned"));
});

test("collectibles unlock from chests, can be planted and pets selected, never purchased",()=>{
  let saved=unlocked(null,"harvest",11);
  const opened=claimChapterChest(saved,"harvest",1);
  assert(opened.valid);
  let collection=opened.collection;
  const inventory=gardenInventory(collection);
  assert.equal(inventory.decor.length,1);
  assert.equal(inventory.pets.length,1);
  assert.equal(collection.companion,opened.reward.pet.id);
  collection=toggleDecoration(collection,opened.reward.decor.id);
  assert(collection.hiddenDecorations.includes(opened.reward.decor.id));
  collection=toggleDecoration(collection,opened.reward.decor.id);
  assert(!collection.hiddenDecorations.includes(opened.reward.decor.id));
  assert.equal(selectCompanion(collection,"not-unlocked").companion,opened.reward.pet.id);
  assert.equal(selectCompanion(collection,null).companion,null);
  assert.equal(selectCompanion(collection,opened.reward.pet.id).companion,opened.reward.pet.id);
  assert.equal(toggleDecoration(collection,"not-unlocked").hiddenDecorations.length,0);
});

test("Treasure Match cards are deterministic, 16 squares with exactly eight pairs",()=>{
  for(const mode of ["harvest","sweets","rescue","bubbles"]) {
    for(let chapter=1;chapter<=30;chapter++){
      const key=chapterKey(mode,chapter), deck=bonusBoard(key);
      assert.equal(deck.length,16);
      assert.deepEqual(deck,bonusBoard(key));
      const counts=new Map();
      deck.forEach(icon=>counts.set(icon,(counts.get(icon)||0)+1));
      assert.equal(counts.size,8);
      assert([...counts.values()].every(n=>n===2));
      assert(deck.every(icon=>BONUS_PIECES.includes(icon)));
    }
  }
  assert.equal(bonusBoard("harvest:not-a-number"),null);
  assert.equal(bonusBoard("other:1"),null);
});

test("bonus victory saves the personal best and replay cannot duplicate chest prizes",()=>{
  const saved=unlocked(null,"sweets",11);
  let collection=claimChapterChest(saved,"sweets",1).collection;
  assert.equal(completeBonus(collection,"unearned:1",8).valid,false);
  assert.equal(completeBonus(collection,"sweets:1",5).valid,false);
  const first=completeBonus(collection,"sweets:1",14);
  assert(first.valid);
  collection=first.collection;
  assert.equal(collection.completedBonuses["sweets:1"],14);
  collection=completeBonus(collection,"sweets:1",18).collection;
  assert.equal(collection.completedBonuses["sweets:1"],14);
  collection=completeBonus(collection,"sweets:1",10).collection;
  assert.equal(collection.completedBonuses["sweets:1"],10);
  assert.deepEqual(Object.keys(collection.claimed),["sweets:1"]);
});

test("milestone rewards remain stable across save reloads and all four worlds",()=>{
  let saved=createSaveState(null,true);
  for(const mode of ["harvest","sweets","rescue","bubbles"]){
    saved=unlocked(saved,mode,11);
    const r=claimChapterChest(saved,mode,1);
    assert(r.valid);
    saved={...saved,collection:r.collection};
    assert.deepEqual(chestReward(mode,1),r.reward);
  }
  const again=createSaveState(JSON.parse(JSON.stringify(saved)),true);
  assert.deepEqual(again.collection,saved.collection);
  assert.equal(gardenInventory(again.collection).rewards.length,4);
  assert.equal(availableChests(again).length,0);
});


test("treasure milestones continue beyond level 2,000 without huge UI lists",()=>{
  const saved=unlocked(null,"harvest",2501);
  assert.equal(totalAvailableChests(saved),250);
  assert.equal(availableChests(saved).length,12);
  assert.equal(isChestClaimable(saved,"harvest",250),true);
  const opened=claimChapterChest(saved,"harvest",250);
  assert(opened.valid);
  const updated={...saved,collection:opened.collection};
  assert.equal(isChestClaimable(updated,"harvest",250),false);
  assert.equal(totalAvailableChests(updated),249);
  assert.equal(availableChests(updated).length,12);
});
