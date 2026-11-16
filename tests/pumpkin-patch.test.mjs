import test from "node:test";
import assert from "node:assert/strict";
import {
  MODES,SIZE,EASY_SIZE,makeLevel,playTurn,hasPumpkinHarvest,
  pumpkinHarvest,connectedGroup,connectedBouquet,neighbors,hasBouquet
} from "../src/core.js";
import {createSaveState} from "../src/save.js";
import {newFreeCell} from "../src/freecell.js";
import {
  CHEST_WORLDS,PUMPKIN_GARDEN_DECOR,pumpkinPrizeForLevel,
  recordPumpkinReward,normalizeCollection,gardenInventory,
  toggleDecoration,chapterKey,chestReward,MEADOW_GARDEN_DECOR
} from "../src/collection.js";

test("Pumpkin Patch is a distinct sixth world with a row-column cross, not group or swap",()=>{
  assert.deepEqual(Object.keys(MODES).slice(0,6),["harvest","sweets","rescue","bubbles","meadow","pumpkin"]);
  assert.equal(MODES.moonlight.mechanic,"moon");
  assert.equal(MODES.pumpkin.name,"Pumpkin Patch");
  assert.equal(MODES.pumpkin.mechanic,"cross");
  assert.equal(MODES.pumpkin.pieces.length,6);
  assert.equal(MODES.meadow.mechanic,"bouquet");
  assert.equal(CHEST_WORLDS.length,4);
  assert.equal(chapterKey("pumpkin",1),null);
  assert.deepEqual(chestReward("harvest",1).decor.id,"sunflower");
});
test("cross harvest collects distant same-kind crops in row and column only",()=>{
  const size=EASY_SIZE,board=Array(size*size).fill(1);
  for(const index of [7,9,25])board[index]=0;
  assert.deepEqual(pumpkinHarvest(board,7,size),[7,9,25]);
  assert.deepEqual(connectedGroup(board,7,size),[7]);
  assert.deepEqual(connectedBouquet(board,7,size),[7]);
  const before={...makeLevel("pumpkin",1,size),board};
  const copy=JSON.stringify(before);
  const result=playTurn(before,7);
  assert(result.valid);
  assert.equal(result.cleared,3);
  assert.equal(result.game.moves,1);
  assert.deepEqual(result.trace[0].matched,[7,9,25]);
  assert.deepEqual(result.trace[0].gust,[]);
  assert.deepEqual(result.trace.at(-1).board,result.game.board);
  assert.equal(JSON.stringify(before),copy);
  assert(hasPumpkinHarvest(result.game.board,size));
});
test("cross harvest cannot wrap edges or treat only two crops as valid",()=>{
  const size=EASY_SIZE,board=Array(size*size).fill(1);
  for(const index of [5,6,11])board[index]=0;
  assert.deepEqual(pumpkinHarvest(board,5,size),[5,11]);
  const game={...makeLevel("pumpkin",5,size),board};
  const raw=JSON.stringify(game);
  assert.equal(playTurn(game,5).valid,false);
  assert.equal(playTurn(game,-1).valid,false);
  assert.equal(playTurn(game,36).valid,false);
  assert.equal(playTurn(game,6).valid,false);
  assert.equal(JSON.stringify(game),raw);
  assert.deepEqual(pumpkinHarvest(board,-1,size),[]);
});
test("harvest of five triggers leaf gust on four neighboring nonmatching crops",()=>{
  const size=EASY_SIZE,board=Array(size*size).fill(1);
  for(const index of [7,9,10,19,31])board[index]=0;
  assert.deepEqual(pumpkinHarvest(board,7,size),[7,9,10,19,31]);
  const old={...makeLevel("pumpkin",6,size),board};
  const r=playTurn(old,7);
  assert(r.valid);
  assert.equal(r.trace[0].groupSize,5);
  assert.deepEqual([...r.trace[0].gust].sort((a,b)=>a-b),
    [...neighbors(7,size)].sort((a,b)=>a-b));
  assert.equal(r.cleared,9);
  assert.equal(new Set(r.trace[0].matched).size,9);
  assert(r.game.score>0);
  assert(hasPumpkinHarvest(r.game.board,size));
  assert.equal(r.game.cleared,9);
});
test("100 seeded 6x6/8x8 levels always offer a legal harvest and reach victory",()=>{
  for(const size of [SIZE,EASY_SIZE]){
    for(let level=1;level<=50;level++){
      let game=makeLevel("pumpkin",level,size),moves=0;
      assert.deepEqual(game,makeLevel("pumpkin",level,size));
      assert(hasPumpkinHarvest(game.board,size));
      assert.equal(game.board.length,size*size);
      while(!game.won&&moves<250){
        const i=game.board.findIndex((_,index)=>
          pumpkinHarvest(game.board,index,size).length>=3);
        assert(i>=0,"stuck "+size+"/"+level);
        const result=playTurn(game,i);
        assert(result.valid,"invalid "+size+"/"+level+"/"+moves);
        assert(result.cleared>=3);
        assert(hasPumpkinHarvest(result.game.board,size));
        game=result.game;moves++;
      }
      assert(game.won,"no win "+size+"/"+level);
      assert.equal(playTurn(game,0).valid,false);
    }
    const huge=makeLevel("pumpkin",1_000_000,size);
    assert.equal(huge.level,1_000_000);
    assert(hasPumpkinHarvest(huge.board,size));
  }
});
test("six unique autumn rewards are earned on milestone wins only, never twice",()=>{
  assert.deepEqual(PUMPKIN_GARDEN_DECOR.map(x=>x.level),[3,6,9,12,15,18]);
  assert.equal(new Set(PUMPKIN_GARDEN_DECOR.map(x=>x.id)).size,6);
  assert.equal(pumpkinPrizeForLevel(2),null);
  let collection=normalizeCollection({claimed:{"harvest:1":true},
    meadowPrizes:[MEADOW_GARDEN_DECOR[0].id],companion:"bunny"});
  for(const prize of PUMPKIN_GARDEN_DECOR){
    const before=makeLevel("pumpkin",prize.level,EASY_SIZE);
    const won={...before,won:true};
    const awarded=recordPumpkinReward(collection,before,won);
    assert(awarded.pumpkinPrizes.includes(prize.id));
    assert.deepEqual(recordPumpkinReward(awarded,before,won).pumpkinPrizes,awarded.pumpkinPrizes);
    collection=awarded;
  }
  const inventory=gardenInventory(collection);
  assert.equal(collection.pumpkinPrizes.length,6);
  assert.equal(inventory.decor.length,8);
  assert.equal(inventory.pets.length,1);
  assert.equal(collection.claimed["harvest:1"],true);
  assert.equal(collection.meadowPrizes.length,1);
  const hidden=toggleDecoration(collection,PUMPKIN_GARDEN_DECOR[0].id);
  assert(hidden.hiddenDecorations.includes(PUMPKIN_GARDEN_DECOR[0].id));
  assert(!toggleDecoration(hidden,PUMPKIN_GARDEN_DECOR[0].id)
    .hiddenDecorations.includes(PUMPKIN_GARDEN_DECOR[0].id));
  assert.deepEqual(recordPumpkinReward(collection,{won:true},{
    mode:"pumpkin",level:18,won:true}).pumpkinPrizes,collection.pumpkinPrizes);
  assert.equal(recordPumpkinReward(collection,null,{
    mode:"meadow",level:9,won:true}).pumpkinPrizes.length,6);
});
test("invalid, duplicate or unearned Pumpkin rewards cannot unlock decorations",()=>{
  const one=PUMPKIN_GARDEN_DECOR[0].id,last=PUMPKIN_GARDEN_DECOR.at(-1).id;
  const c=normalizeCollection({pumpkinPrizes:[one,one,"fake"],
    hiddenDecorations:[one,last,"fake"]});
  assert.deepEqual(c.pumpkinPrizes,[one]);
  assert.deepEqual(c.hiddenDecorations,[one]);
  assert.equal(c.companion,null);
});
test("old progress, Flower Meadow prize, claimed chests, pets and FreeCell survive reload",()=>{
  const old=makeLevel("harvest",6001,SIZE),meadow=makeLevel("meadow",24,EASY_SIZE);
  const card=newFreeCell(99);
  const raw={mode:"harvest",games:{harvest:old},progress:{harvest:6001},
    easyGames:{meadow},easyProgress:{meadow:24},
    collection:{claimed:{"harvest:1":true},companion:"bunny",
      meadowPrizes:[MEADOW_GARDEN_DECOR[0].id]},
    cards:{freecell:card}};
  const saved=createSaveState(raw,true);
  assert.deepEqual(saved.games.harvest,old);
  assert.deepEqual(saved.easyGames.meadow,meadow);
  assert.deepEqual(saved.cards.freecell,card);
  assert.equal(saved.progress.harvest,6001);
  assert.equal(saved.easyProgress.meadow,24);
  assert.equal(saved.collection.claimed["harvest:1"],true);
  assert.deepEqual(saved.collection.meadowPrizes,[MEADOW_GARDEN_DECOR[0].id]);
  assert.equal(saved.progress.pumpkin,1);
  assert.equal(saved.easyProgress.pumpkin,1);
  assert.equal(saved.games.pumpkin.mode,"pumpkin");
  assert.equal(saved.easyGames.pumpkin.size,6);
  const loaded=createSaveState(JSON.parse(JSON.stringify(saved)),true);
  assert.deepEqual(loaded.games.harvest,old);
  assert.deepEqual(loaded.cards.freecell,card);
  assert.deepEqual(loaded.collection,saved.collection);
});
