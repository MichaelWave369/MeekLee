import test from "node:test";
import assert from "node:assert/strict";
import {
  SIZE,EASY_SIZE,MODES,KITCHEN_RECIPES,kitchenNextIngredient,
  kitchenCanCook,validKitchenState,makeBoard,makeLevel,playTurn,rngFrom
} from "../src/core.js";
import {createSaveState,validGame} from "../src/save.js";
import {newFreeCell} from "../src/freecell.js";
import {worldStars} from "../src/world-powers.js";
import {
  CHEST_WORLDS,KITCHEN_GARDEN_DECOR,kitchenPrizeForLevel,
  recordKitchenReward,normalizeCollection,gardenInventory,
  toggleDecoration,chapterKey,chestReward,MEADOW_GARDEN_DECOR,
  PUMPKIN_GARDEN_DECOR,MOONLIGHT_GARDEN_DECOR
} from "../src/collection.js";

test("Grandma's Kitchen is the eighth fully distinct world and private notes are not part of game state",()=>{
  assert.deepEqual(Object.keys(MODES),
    ["harvest","sweets","rescue","bubbles","meadow","pumpkin","moonlight","kitchen"]);
  assert.equal(MODES.kitchen.mechanic,"recipe");
  assert.deepEqual(MODES.kitchen.pieces,["🍎","🍓","🥕","🥚","🥛","🌾"]);
  assert.equal(CHEST_WORLDS.length,4);
  assert.equal(chapterKey("kitchen",1),null);
  assert.equal(chestReward("harvest",1).decor.id,"sunflower");
  assert(KITCHEN_RECIPES.length>=6);
  for(const recipe of KITCHEN_RECIPES){
    assert.equal(recipe.ingredients.length,3);
    assert.equal(new Set(recipe.ingredients).size,3);
    assert(recipe.ingredients.every(i=>Number.isInteger(i)&&i>=0&&i<6));
  }
  assert.equal(Object.keys(makeLevel("kitchen",1)).some(k=>/recipeBody|note|story/i.test(k)),false);
});
test("ordered step 1 requires the first ingredient and rejects wrong taps immutably",()=>{
  const g=makeLevel("kitchen",1,EASY_SIZE),next=kitchenNextIngredient(g);
  const correct=g.board.indexOf(next),wrong=g.board.findIndex(x=>x!==next);
  assert(validKitchenState(g));
  const previous=JSON.stringify(g);
  assert.equal(playTurn(g,wrong).valid,false);
  assert.equal(playTurn(g,-1).valid,false);
  assert.equal(playTurn(g,36).valid,false);
  assert.equal(JSON.stringify(g),previous);
  const r=playTurn(g,correct);
  assert(r.valid);
  assert.equal(r.cleared,1);
  assert.equal(r.game.moves,1);
  assert.equal(r.game.recipeStep,1);
  assert.equal(r.game.dishes,0);
  assert.equal(r.game.recipeId,g.recipeId);
  assert.equal(r.trace[0].type,"pop");
  assert.deepEqual(r.trace[0].matched,[correct]);
  assert.equal(r.trace[0].kitchenDish,null);
  assert.deepEqual(r.trace.at(-1).board,r.game.board);
  assert(validKitchenState(r.game));
  assert.equal(JSON.stringify(g),previous);
});
test("third ordered ingredient serves a complete dish, awards bonus and selects next recipe",()=>{
  let g=makeLevel("kitchen",2,EASY_SIZE),initial=KITCHEN_RECIPES[g.recipeId].name;
  for(let step=0;step<3;step++){
    const needed=kitchenNextIngredient(g);
    const tile=g.board.indexOf(needed);
    assert(tile>=0);
    const r=playTurn(g,tile);
    assert(r.valid);
    assert.equal(r.trace[0].kitchenDish,step===2?initial:null);
    if(step===2){
      assert.equal(r.game.recipeStep,0);
      assert.equal(r.game.dishes,1);
      assert.equal(r.game.score,260);
    }else assert.equal(r.game.recipeStep,step+1);
    g=r.game;
  }
  assert.equal(g.moves,3);
  assert.equal(g.cleared,3);
  assert(validKitchenState(g));
  assert(kitchenCanCook(g));
});
test("kitchen board generates all six ingredients deterministically and remains valid if reshuffled mid-dish",()=>{
  for(const size of [SIZE,EASY_SIZE]){
    const g=makeLevel("kitchen",8,size);
    const rng=rngFrom(g.seed,g.rngState);
    const shuffled=makeBoard(rng,"recipe",size);
    assert.deepEqual(new Set(shuffled),new Set([0,1,2,3,4,5]));
    const manual={...g,board:shuffled,rngState:rng.getState()};
    assert(validKitchenState(manual));
    const r=playTurn(manual,shuffled.indexOf(kitchenNextIngredient(manual)));
    assert(r.valid);
    assert(validKitchenState(r.game));
    assert.equal(r.game.board.length,size*size);
  }
});
test("100 seeded easy and classic cooking levels complete with ordered, always-available ingredients",()=>{
  for(const size of [EASY_SIZE,SIZE]){
    for(let level=1;level<=50;level++){
      let g=makeLevel("kitchen",level,size),steps=0;
      assert.deepEqual(g,makeLevel("kitchen",level,size));
      assert.equal(g.board.length,size*size);
      assert(validKitchenState(g));
      while(!g.won&&steps<300){
        const needed=kitchenNextIngredient(g);
        const tile=g.board.indexOf(needed);
        assert(tile>=0,"missing ingredient "+size+"/"+level+"/"+steps);
        const r=playTurn(g,tile);
        assert(r.valid,"invalid "+size+"/"+level+"/"+steps);
        assert(r.cleared===1);
        assert(validKitchenState(r.game));
        g=r.game;steps++;
      }
      assert(g.won,"unwinnable recipe "+size+"/"+level);
      assert.equal(g.dishes,Math.floor(g.moves/3));
      assert.equal(worldStars(g),3,"quiet kitchen play has no speed penalty");
      assert.equal(playTurn(g,0).valid,false);
    }
    const high=makeLevel("kitchen",1_000_000,size);
    assert.equal(high.level,1_000_000);
    assert(validKitchenState(high));
  }
});
test("kitchen validation rejects damaged recipe state while preserving original high-level saves",()=>{
  const g=makeLevel("kitchen",5,EASY_SIZE);
  assert(validGame(g,"kitchen",EASY_SIZE));
  for(const broken of [
    {...g,recipeId:-1},{...g,recipeStep:3},{...g,recipeStep:-1},
    {...g,dishes:-1},{...g,dishes:5},{...g,recipeStep:2,moves:0},
    {...g,board:Array(36).fill(0)}
  ]){
    assert(!validGame(broken,"kitchen",EASY_SIZE));
  }
  const old=makeLevel("harvest",6001,SIZE);
  const restored=createSaveState({
    mode:"harvest",games:{harvest:old},progress:{harvest:6001},
    easyGames:{kitchen:{...g,recipeId:1000}},easyProgress:{kitchen:5}
  },true);
  assert.deepEqual(restored.games.harvest,old);
  assert.equal(restored.progress.harvest,6001);
  assert.equal(restored.easyGames.kitchen.level,5);
  assert(validKitchenState(restored.easyGames.kitchen));
});
test("six unique free homestead treasures unlock exactly once per milestone",()=>{
  assert.deepEqual(KITCHEN_GARDEN_DECOR.map(x=>x.level),[3,6,9,12,15,18]);
  assert.equal(new Set(KITCHEN_GARDEN_DECOR.map(x=>x.id)).size,6);
  assert.equal(kitchenPrizeForLevel(4),null);
  let collection=normalizeCollection({
    claimed:{"harvest:1":true},companion:"bunny",
    meadowPrizes:[MEADOW_GARDEN_DECOR[0].id],
    pumpkinPrizes:[PUMPKIN_GARDEN_DECOR[0].id],
    moonlightPrizes:[MOONLIGHT_GARDEN_DECOR[0].id]
  });
  for(const prize of KITCHEN_GARDEN_DECOR){
    const previous=makeLevel("kitchen",prize.level,EASY_SIZE);
    const won={...previous,won:true};
    const next=recordKitchenReward(collection,previous,won);
    assert(next.kitchenPrizes.includes(prize.id));
    assert.deepEqual(recordKitchenReward(next,previous,won).kitchenPrizes,next.kitchenPrizes);
    collection=next;
  }
  assert.equal(collection.kitchenPrizes.length,6);
  assert.equal(gardenInventory(collection).decor.length,10);
  assert.equal(gardenInventory(collection).pets.length,1);
  const hidden=toggleDecoration(collection,KITCHEN_GARDEN_DECOR[0].id);
  assert(hidden.hiddenDecorations.includes(KITCHEN_GARDEN_DECOR[0].id));
  assert(!toggleDecoration(hidden,KITCHEN_GARDEN_DECOR[0].id)
    .hiddenDecorations.includes(KITCHEN_GARDEN_DECOR[0].id));
  assert.deepEqual(recordKitchenReward(collection,{won:true},{
    mode:"kitchen",level:18,won:true}).kitchenPrizes,collection.kitchenPrizes);
  assert.equal(recordKitchenReward(collection,null,{mode:"moonlight",level:3,won:true}).kitchenPrizes.length,6);
});
test("invalid, duplicate and hidden-but-unearned kitchen rewards are discarded on load",()=>{
  const first=KITCHEN_GARDEN_DECOR[0].id,final=KITCHEN_GARDEN_DECOR.at(-1).id;
  const c=normalizeCollection({kitchenPrizes:[first,first,"fake"],
    hiddenDecorations:[first,final,"fake"]});
  assert.deepEqual(c.kitchenPrizes,[first]);
  assert.deepEqual(c.hiddenDecorations,[first]);
});
test("old four worlds, Moonlight, Meadow, Pumpkin, FreeCell, pets and chest claims survive",()=>{
  const harvest=makeLevel("harvest",6001,SIZE),meadow=makeLevel("meadow",24,EASY_SIZE);
  const pumpkin=makeLevel("pumpkin",12,EASY_SIZE),moon=makeLevel("moonlight",9,EASY_SIZE);
  const freecell=newFreeCell(42);
  const raw={mode:"harvest",games:{harvest},progress:{harvest:6001},
    easyGames:{meadow,pumpkin,moonlight:moon},
    easyProgress:{meadow:24,pumpkin:12,moonlight:9},
    cards:{freecell},
    collection:{claimed:{"harvest:1":true},companion:"bunny",
      meadowPrizes:[MEADOW_GARDEN_DECOR[0].id],
      pumpkinPrizes:[PUMPKIN_GARDEN_DECOR[0].id],
      moonlightPrizes:[MOONLIGHT_GARDEN_DECOR[0].id]}
  };
  const state=createSaveState(raw,true);
  assert.deepEqual(state.games.harvest,harvest);
  assert.deepEqual(state.easyGames.meadow,meadow);
  assert.deepEqual(state.easyGames.pumpkin,pumpkin);
  assert.deepEqual(state.easyGames.moonlight,moon);
  assert.deepEqual(state.cards.freecell,freecell);
  assert.equal(state.progress.harvest,6001);
  assert.equal(state.collection.claimed["harvest:1"],true);
  assert.equal(state.collection.companion,"bunny");
  assert.equal(state.progress.kitchen,1);
  assert.equal(state.easyProgress.kitchen,1);
  assert(validKitchenState(state.games.kitchen));
  assert(validKitchenState(state.easyGames.kitchen));
  const reread=createSaveState(JSON.parse(JSON.stringify(state)),true);
  assert.deepEqual(reread.games.harvest,harvest);
  assert.deepEqual(reread.cards.freecell,freecell);
  assert.deepEqual(reread.collection,state.collection);
});
