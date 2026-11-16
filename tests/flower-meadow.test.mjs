import test from "node:test";
import assert from "node:assert/strict";
import {
  SIZE,EASY_SIZE,MODES,flowerNeighbors,connectedBouquet,connectedGroup,
  hasBouquet,hasSwap,makeBoard,makeLevel,playTurn,rngFrom,seedFor
} from "../src/core.js";
import {createSaveState} from "../src/save.js";
import {
  CHEST_WORLDS,MEADOW_GARDEN_DECOR,meadowPrizeForLevel,
  normalizeCollection,gardenInventory,recordMeadowReward,
  toggleDecoration,chestReward,chapterKey
} from "../src/collection.js";

test("Flower Meadow is a real fifth world, distinct from swap or orthogonal Rescue taps",()=>{
  assert.equal(MODES.meadow.name,"Flower Meadow");
  assert.equal(MODES.meadow.mechanic,"bouquet");
  assert.equal(MODES.meadow.pieces.length,6);
  assert.deepEqual(Object.keys(MODES),["harvest","sweets","rescue","bubbles","meadow"]);
  assert.equal(CHEST_WORLDS.length,4,"historic chest worlds must remain unchanged");
  assert.equal(chapterKey("meadow",1),null);
  assert.deepEqual(chestReward("harvest",1).decor.id,"sunflower");
});

test("flower neighbors include diagonals but never wrap around board edges",()=>{
  assert.deepEqual(flowerNeighbors(0,EASY_SIZE).sort((a,b)=>a-b),[1,6,7]);
  assert.deepEqual(flowerNeighbors(5,EASY_SIZE).sort((a,b)=>a-b),[4,10,11]);
  assert.equal(flowerNeighbors(-1,EASY_SIZE).length,0);
  assert.equal(flowerNeighbors(36,EASY_SIZE).length,0);
  assert.equal(flowerNeighbors(14,EASY_SIZE).length,8);
});
test("a 3-flower diagonal bouquet counts even when no orthogonal group exists",()=>{
  const board=Array(EASY_SIZE*EASY_SIZE).fill(1);
  for(const index of [0,7,14])board[index]=0;
  assert.deepEqual(connectedGroup(board,0,EASY_SIZE),[0]);
  assert.deepEqual(connectedBouquet(board,0,EASY_SIZE),[0,7,14]);
  assert(hasBouquet(board,EASY_SIZE));
  const base=makeLevel("meadow",1,EASY_SIZE);
  const g={...base,board};
  const old=JSON.stringify(g),result=playTurn(g,0);
  assert(result.valid);
  assert.equal(result.cleared,3);
  assert.equal(result.trace[0].type,"pop");
  assert.deepEqual(result.trace[0].pollen,[]);
  assert.equal(result.game.moves,1);
  assert.equal(JSON.stringify(g),old);
  assert(hasBouquet(result.game.board,EASY_SIZE));
});
test("two flowers are not enough for a bouquet, and invalid taps never cost moves",()=>{
  const board=Array(36).fill(1);board[0]=0;board[7]=0;
  const g={...makeLevel("meadow",2,EASY_SIZE),board};
  const before=JSON.stringify(g);
  const r=playTurn(g,0);
  assert.equal(r.valid,false);
  assert.equal(JSON.stringify(g),before);
  assert.equal(playTurn(g,-1).valid,false);
});
test("five same-color flowers trigger pollen to adjacent DIFFERENT flowers",()=>{
  const board=Array(36).fill(1);
  for(const index of [0,7,14,21,28])board[index]=0;
  const g={...makeLevel("meadow",4,EASY_SIZE),board};
  const result=playTurn(g,14);
  assert(result.valid);
  assert.equal(result.trace[0].groupSize,5);
  assert(result.trace[0].pollen.length,6);
  assert.equal(result.cleared,11);
  assert.equal(result.trace[0].matched.length,11);
  assert(result.game.score>0);
  assert.equal(g.board[14],0);
  assert(hasBouquet(result.game.board,EASY_SIZE));
  assert.deepEqual(result.trace.at(-1).board,result.game.board);
});
test("meadow levels are deterministic and solvable on 6x6 and 8x8, including high levels",()=>{
  for(const size of [EASY_SIZE,SIZE]) {
    for(let level=1;level<=40;level++){
      let g=makeLevel("meadow",level,size),turns=0;
      assert.deepEqual(g,makeLevel("meadow",level,size));
      assert(hasBouquet(g.board,size));
      assert.equal(g.board.length,size*size);
      while(!g.won&&turns<250){
        const i=g.board.findIndex((_,j)=>connectedBouquet(g.board,j,size).length>=3);
        assert(i>=0,"no bouquet at "+size+"/"+level+"/"+turns);
        const r=playTurn(g,i);
        assert(r.valid);
        assert(r.cleared>=3);
        assert(hasBouquet(r.game.board,size));
        g=r.game;turns++;
      }
      assert(g.won,"unwinnable meadow "+size+"/"+level);
      assert.equal(playTurn(g,0).valid,false);
    }
    const high=makeLevel("meadow",1_000_000,size);
    assert.equal(high.level,1_000_000);
    assert(hasBouquet(high.board,size));
  }
});
test("flower milestones unlock six distinct decorations, never replay duplicates",()=>{
  assert.deepEqual(MEADOW_GARDEN_DECOR.map(x=>x.level),[3,6,9,12,15,18]);
  assert.equal(new Set(MEADOW_GARDEN_DECOR.map(x=>x.id)).size,6);
  assert.equal(meadowPrizeForLevel(2),null);
  let collection=normalizeCollection({claimed:{"harvest:1":true},companion:"bunny"});
  for(const reward of MEADOW_GARDEN_DECOR){
    const old={...makeLevel("meadow",reward.level,EASY_SIZE),won:false};
    const won={...old,won:true};
    const gained=recordMeadowReward(collection,old,won);
    assert(gained.meadowPrizes.includes(reward.id));
    const duplicate=recordMeadowReward(gained,old,won);
    assert.deepEqual(duplicate.meadowPrizes,gained.meadowPrizes);
    collection=duplicate;
  }
  assert.equal(collection.meadowPrizes.length,6);
  assert.equal(gardenInventory(collection).decor.length,7);
  assert.equal(gardenInventory(collection).pets.length,1);
  const toggled=toggleDecoration(collection,MEADOW_GARDEN_DECOR[0].id);
  assert(toggled.hiddenDecorations.includes(MEADOW_GARDEN_DECOR[0].id));
  assert(!toggleDecoration(toggled,MEADOW_GARDEN_DECOR[0].id).hiddenDecorations.length);
  const once=recordMeadowReward(collection,{won:true,mode:"meadow"},{won:true,mode:"meadow",level:18});
  assert.deepEqual(once.meadowPrizes,collection.meadowPrizes);
  assert.equal(recordMeadowReward(collection,null,{mode:"harvest",level:3,won:true}).meadowPrizes.length,6);
});
test("unearned meadow rewards are rejected when restoring edited or corrupt saves",()=>{
  const c=normalizeCollection({
    meadowPrizes:["meadow_daisy_wreath","fake","meadow_daisy_wreath"],
    hiddenDecorations:["fake","meadow_daisy_wreath","meadow_ribbon_arch"]
  });
  assert.deepEqual(c.meadowPrizes,["meadow_daisy_wreath"]);
  assert.deepEqual(c.hiddenDecorations,["meadow_daisy_wreath"]);
  assert.equal(c.companion,null);
});
test("legacy world, chest, garden, FreeCell and easy/classic saves stay unchanged",()=>{
  const old=makeLevel("harvest",6001,SIZE);
  const easy=makeLevel("sweets",30,EASY_SIZE);
  const initial={mode:"harvest",games:{harvest:old},progress:{harvest:6001},
    easyGames:{sweets:easy},easyProgress:{sweets:30},
    collection:{claimed:{"harvest:1":true},companion:"bunny"},
    cards:{freecell:null}};
  const save=createSaveState(initial,true);
  assert.deepEqual(save.games.harvest,old);
  assert.deepEqual(save.easyGames.sweets,easy);
  assert.equal(save.progress.harvest,6001);
  assert.equal(save.collection.companion,"bunny");
  assert.equal(save.collection.claimed["harvest:1"],true);
  assert.equal(save.progress.meadow,1);
  assert.equal(save.easyProgress.meadow,1);
  assert.equal(save.games.meadow.mode,"meadow");
  assert.equal(save.easyGames.meadow.size,6);
  const again=createSaveState(JSON.parse(JSON.stringify(save)),true);
  assert.deepEqual(again.games.harvest,old);
  assert.equal(again.progress.harvest,6001);
  assert.deepEqual(again.collection,save.collection);
});
