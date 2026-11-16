import test from "node:test";
import assert from "node:assert/strict";
import {
  SIZE,EASY_SIZE,MODES,moonPhase,MOON_PHASES,moonlightHarvest,
  hasMoonlightHarvest,connectedGroup,connectedBouquet,pumpkinHarvest,
  flowerNeighbors,makeLevel,playTurn
} from "../src/core.js";
import {createSaveState} from "../src/save.js";
import {newFreeCell} from "../src/freecell.js";
import {
  CHEST_WORLDS,MOONLIGHT_GARDEN_DECOR,moonlightPrizeForLevel,
  recordMoonlightReward,normalizeCollection,gardenInventory,
  toggleDecoration,chapterKey,chestReward,MEADOW_GARDEN_DECOR,PUMPKIN_GARDEN_DECOR
} from "../src/collection.js";

const six=EASY_SIZE;
test("Moonlight Orchard adds a seventh real world without rewriting earlier mechanics",()=>{
  assert.deepEqual(Object.keys(MODES).slice(0,7),["harvest","sweets","rescue","bubbles","meadow","pumpkin","moonlight"]);
  assert.equal(MODES.kitchen.mechanic,"recipe");
  assert.equal(MODES.moonlight.name,"Moonlight Orchard");
  assert.equal(MODES.moonlight.mechanic,"moon");
  assert.equal(MODES.moonlight.pieces.length,6);
  assert.equal(MODES.pumpkin.mechanic,"cross");
  assert.equal(MODES.meadow.mechanic,"bouquet");
  assert.equal(CHEST_WORLDS.length,4,"legacy chest chapters must stay unchanged");
  assert.equal(chapterKey("moonlight",1),null);
  assert.equal(chestReward("harvest",1).decor.id,"sunflower");
});
test("moon phases advance Crescent to Half Moon to Full Moon, then loop",()=>{
  assert.deepEqual(MOON_PHASES.map(p=>p.radius),[1,2,3]);
  assert.equal(moonPhase(0).name,"Crescent");
  assert.equal(moonPhase(1).name,"Half Moon");
  assert.equal(moonPhase(2).name,"Full Moon");
  assert.equal(moonPhase(3).name,"Crescent");
  assert.equal(moonPhase(1000000).radius,2);
  assert.equal(moonPhase(-1).radius,1);
});
test("Crescent halo collects same-kind fruit in a local 3x3 square",()=>{
  const board=Array(six*six).fill(1);
  for(const i of [7,14,21])board[i]=0;
  assert.deepEqual(moonlightHarvest(board,14,six,1),[7,14,21]);
  assert.equal(moonlightHarvest(board,0,six,0).length,0);
  assert.equal(moonlightHarvest(board,-1,six,1).length,0);
  assert.equal(moonlightHarvest(board,36,six,1).length,0);
  const g={...makeLevel("moonlight",1,six),board};
  const raw=JSON.stringify(g);
  const result=playTurn(g,14);
  assert(result.valid);
  assert.equal(result.cleared,3);
  assert.equal(result.trace[0].type,"pop");
  assert.equal(result.trace[0].moonPhase,"Crescent");
  assert.equal(result.game.moves,1);
  assert.equal(moonPhase(result.game.moves).name,"Half Moon");
  assert.deepEqual(result.trace.at(-1).board,result.game.board);
  assert.equal(JSON.stringify(g),raw);
  assert(hasMoonlightHarvest(result.game.board,six,1));
});
test("Half Moon reaches two cells through gaps that Flower Meadow cannot connect",()=>{
  const board=Array(six*six).fill(1);
  for(const i of [2,14,26])board[i]=0;
  assert.deepEqual(moonlightHarvest(board,14,six,1),[14]);
  assert.deepEqual(moonlightHarvest(board,14,six,2),[2,14,26]);
  assert.deepEqual(connectedGroup(board,14,six),[14]);
  assert.deepEqual(connectedBouquet(board,14,six),[14]);
  const crescent={...makeLevel("moonlight",1,six),board};
  assert.equal(playTurn(crescent,14).valid,false);
  const half={...crescent,moves:1};
  const result=playTurn(half,14);
  assert(result.valid);
  assert.equal(result.cleared,3);
  assert.equal(result.trace[0].moonPhase,"Half Moon");
  assert.equal(result.game.moves,2);
  assert.equal(moonPhase(result.game.moves).name,"Full Moon");
});
test("Full Moon reaches a three-square halo without board-edge wrapping",()=>{
  const board=Array(six*six).fill(1);
  for(const i of [5,14,29])board[i]=0;
  assert.deepEqual(moonlightHarvest(board,14,six,2),[14]);
  assert.deepEqual(moonlightHarvest(board,14,six,3),[5,14,29]);
  assert.deepEqual(moonlightHarvest(board,14,six,4),[]);
  const g={...makeLevel("moonlight",5,six),board,moves:2};
  const result=playTurn(g,14);
  assert(result.valid);
  assert.equal(result.cleared,3);
  assert.equal(result.trace[0].moonPhase,"Full Moon");
  assert.equal(result.game.moves,3);
  assert.equal(moonPhase(result.game.moves).name,"Crescent");
});
test("five matching moonlit fruit create a stardust bonus without double counting",()=>{
  const board=Array(six*six).fill(1);
  for(const i of [7,8,9,13,14])board[i]=0;
  const g={...makeLevel("moonlight",3,six),board};
  const r=playTurn(g,14);
  assert(r.valid);
  assert.equal(r.trace[0].groupSize,5);
  assert.deepEqual([...r.trace[0].stardust].sort((a,b)=>a-b),[15,19,20,21]);
  assert.equal(r.cleared,9);
  assert.equal(new Set(r.trace[0].matched).size,9);
  assert(r.game.score>0);
  assert.equal(g.board[14],0);
  assert(hasMoonlightHarvest(r.game.board,six,1));
});
test("6x6 and 8x8 Moonlight Orchard levels always offer moves in every phase and reach a win",()=>{
  for(const size of [EASY_SIZE,SIZE]){
    for(let level=1;level<=50;level++){
      let g=makeLevel("moonlight",level,size),steps=0;
      assert.deepEqual(g,makeLevel("moonlight",level,size));
      assert.equal(g.board.length,size*size);
      assert(hasMoonlightHarvest(g.board,size,1));
      while(!g.won&&steps<260){
        const radius=moonPhase(g.moves).radius;
        const index=g.board.findIndex((_,i)=>moonlightHarvest(g.board,i,size,radius).length>=3);
        assert(index>=0,"no legal moon harvest "+size+"/"+level+"/"+g.moves);
        const r=playTurn(g,index);
        assert(r.valid,"invalid moon harvest "+size+"/"+level+"/"+g.moves);
        assert(r.cleared>=3);
        assert(hasMoonlightHarvest(r.game.board,size,1));
        g=r.game;steps++;
      }
      assert(g.won,"no win "+size+"/"+level);
      assert.equal(playTurn(g,0).valid,false);
    }
    const high=makeLevel("moonlight",1_000_000,size);
    assert.equal(high.level,1_000_000);
    assert(hasMoonlightHarvest(high.board,size,1));
  }
});
test("six one-time garden ornaments unlock on separate moonlight milestones",()=>{
  assert.deepEqual(MOONLIGHT_GARDEN_DECOR.map(x=>x.level),[3,6,9,12,15,18]);
  assert.equal(new Set(MOONLIGHT_GARDEN_DECOR.map(x=>x.id)).size,6);
  assert.equal(moonlightPrizeForLevel(2),null);
  let c=normalizeCollection({claimed:{"harvest:1":true},companion:"bunny",
    meadowPrizes:[MEADOW_GARDEN_DECOR[0].id],
    pumpkinPrizes:[PUMPKIN_GARDEN_DECOR[0].id]});
  for(const prize of MOONLIGHT_GARDEN_DECOR){
    const old=makeLevel("moonlight",prize.level,six);
    const won={...old,won:true};
    const awarded=recordMoonlightReward(c,old,won);
    assert(awarded.moonlightPrizes.includes(prize.id));
    assert.deepEqual(recordMoonlightReward(awarded,old,won).moonlightPrizes,awarded.moonlightPrizes);
    c=awarded;
  }
  const inventory=gardenInventory(c);
  assert.equal(c.moonlightPrizes.length,6);
  assert.equal(inventory.decor.length,9);
  assert.equal(inventory.pets.length,1);
  assert.equal(c.claimed["harvest:1"],true);
  assert.equal(c.meadowPrizes.length,1);
  assert.equal(c.pumpkinPrizes.length,1);
  const hidden=toggleDecoration(c,MOONLIGHT_GARDEN_DECOR[0].id);
  assert(hidden.hiddenDecorations.includes(MOONLIGHT_GARDEN_DECOR[0].id));
  assert(!toggleDecoration(hidden,MOONLIGHT_GARDEN_DECOR[0].id)
    .hiddenDecorations.includes(MOONLIGHT_GARDEN_DECOR[0].id));
  assert.deepEqual(recordMoonlightReward(c,{won:true},{
    mode:"moonlight",level:18,won:true}).moonlightPrizes,c.moonlightPrizes);
  assert.equal(recordMoonlightReward(c,null,{
    mode:"pumpkin",level:9,won:true}).moonlightPrizes.length,6);
});
test("invalid moonlight decorations and unearned hiding are rejected on save load",()=>{
  const one=MOONLIGHT_GARDEN_DECOR[0].id;
  const last=MOONLIGHT_GARDEN_DECOR.at(-1).id;
  const c=normalizeCollection({moonlightPrizes:[one,one,"not-a-prize"],
    hiddenDecorations:[one,last,"not-a-prize"]});
  assert.deepEqual(c.moonlightPrizes,[one]);
  assert.deepEqual(c.hiddenDecorations,[one]);
  assert.equal(c.companion,null);
});
test("old levels 6001+, all existing garden rewards and FreeCell save survive migration",()=>{
  const old=makeLevel("harvest",6001,SIZE),meadow=makeLevel("meadow",24,six);
  const pumpkin=makeLevel("pumpkin",12,six),freecell=newFreeCell(369);
  const raw={mode:"harvest",games:{harvest:old},progress:{harvest:6001},
    easyGames:{meadow,pumpkin},easyProgress:{meadow:24,pumpkin:12},
    collection:{claimed:{"harvest:1":true},companion:"bunny",
      meadowPrizes:[MEADOW_GARDEN_DECOR[0].id],
      pumpkinPrizes:[PUMPKIN_GARDEN_DECOR[0].id]},
    cards:{freecell}};
  const state=createSaveState(raw,true);
  assert.deepEqual(state.games.harvest,old);
  assert.deepEqual(state.easyGames.meadow,meadow);
  assert.deepEqual(state.easyGames.pumpkin,pumpkin);
  assert.deepEqual(state.cards.freecell,freecell);
  assert.equal(state.progress.harvest,6001);
  assert.equal(state.easyProgress.pumpkin,12);
  assert.equal(state.collection.claimed["harvest:1"],true);
  assert.equal(state.collection.companion,"bunny");
  assert.deepEqual(state.collection.meadowPrizes,[MEADOW_GARDEN_DECOR[0].id]);
  assert.deepEqual(state.collection.pumpkinPrizes,[PUMPKIN_GARDEN_DECOR[0].id]);
  assert.equal(state.progress.moonlight,1);
  assert.equal(state.easyProgress.moonlight,1);
  assert.equal(state.games.moonlight.mode,"moonlight");
  assert.equal(state.easyGames.moonlight.size,6);
  const again=createSaveState(JSON.parse(JSON.stringify(state)),true);
  assert.deepEqual(again.games.harvest,old);
  assert.deepEqual(again.cards.freecell,freecell);
  assert.deepEqual(again.collection,state.collection);
});
