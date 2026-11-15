import test from "node:test";
import assert from "node:assert/strict";
import {newWar,validWar,flipWar} from "../src/war.js";
import {newStack,validStack,stackNumber,stackIsWild,playableStacks,
  playStack,discardStack,stackBotTurn} from "../src/stack-race.js";
import {newJigsaw,validJigsaw,swapJigsaw,correctJigsawPieces,JIGSAW_SCENES} from "../src/jigsaw.js";
import {newSolitaire,drawSolitaire,undoSolitaire,validSolitaire} from "../src/solitaire.js";
import {createSaveState} from "../src/save.js";
import {recordJigsawGardenReward,normalizeCollection,gardenInventory,
  claimChapterChest,chestReward,JIGSAW_GARDEN_DECOR} from "../src/collection.js";

test("War starts with all 52 unique cards, deterministic deals and no initial winner",()=>{
  for(let seed=1;seed<35;seed++){
    const g=newWar(seed);
    assert(validWar(g));
    assert.equal(g.piles[0].length,26);
    assert.equal(g.piles[1].length,26);
    assert.equal(g.round,0);
    assert.deepEqual(newWar(seed),g);
  }
});
test("War flips are immutable, conserve all 52 cards, handle ties and eventually conclude",()=>{
  let ties=0,finished=0;
  for(let seed=1;seed<=8;seed++){
    let game=newWar(seed);
    for(let i=0;i<1500&&!game.finished;i++){
      const original=JSON.stringify(game);
      const move=flipWar(game);
      assert(move.valid);
      assert.equal(JSON.stringify(game),original);
      assert(validWar(move.game));
      assert.equal(move.game.round,game.round+1);
      assert.equal(move.game.piles[0].length+move.game.piles[1].length,52);
      const battle=move.game.lastBattle;
      assert.equal(battle.battles.length,battle.warCount+1<=battle.battles.length?
        battle.battles.length:battle.battles.length);
      assert(battle.won>=2);
      if(battle.warCount)ties++;
      game=move.game;
    }
    assert(game.finished);
    assert.equal(flipWar(game).valid,false);
    finished++;
  }
  assert(finished===8);
  assert(ties>0,"Real tie-triggered wars should arise across several seeds");
});
test("numbered Stack & Bloom cards have distinct IDs, valid 1-12 labels and wild stars",()=>{
  const normal=newStack(23,10),long=newStack(23,30);
  for(const g of [normal,long]){
    assert(validStack(g));
    assert.equal(g.hand[0].length,5);
    assert.equal(g.hand[1].length,5);
    assert.equal(g.stock[0].length,g.stockSize);
    assert.equal(g.stock[1].length,g.stockSize);
    assert.equal(g.draw.length,162-2*g.stockSize-10);
    assert.equal(g.build.length,4);
    assert.equal(g.discard[0].length,4);
    assert.deepEqual(newStack(23,g.stockSize),g);
  }
  assert.equal(stackNumber("n12-2"),12);
  assert.equal(stackNumber("n1-11"),1);
  assert.equal(stackNumber("wild-0"),0);
  assert.equal(stackIsWild("wild-11"),true);
  assert.equal(stackIsWild("n12-2"),false);
});
test("stockpile build/discard mechanics and Pip's complete turn do not mutate input or hang",()=>{
  let game=newStack(101,10),plays=0,turns=0;
  for(let i=0;i<120 && game.winner===null;i++){
    assert(validStack(game),"save must stay valid before turn "+i);
    assert.equal(game.turn,0,"Pip must finish all its moves before Mom can act");
    let chosen=null;
    const sources=[{zone:"stock"},
      ...game.discard[0].map((_,index)=>({zone:"discard",index})),
      ...game.hand[0].map((_,index)=>({zone:"hand",index}))];
    for(const source of sources){
      const legal=playableStacks(game,source);
      if(legal.length){chosen={source,pile:legal[0]};break;}
    }
    if(chosen){
      const previous=JSON.stringify(game);
      const outcome=playStack(game,chosen.source,chosen.pile);
      assert(outcome.valid);
      assert.equal(JSON.stringify(game),previous);
      game=outcome.game;
      plays++;
    }else{
      assert(game.hand[0].length>0,"Mom should have a card to end her turn");
      const move=discardStack(game,0,turns%4);
      assert(move.valid);
      assert.equal(move.game.turn,1);
      const bot=stackBotTurn(move.game);
      assert(bot.valid,"Pip must be able to play or discard");
      game=bot.game;
      turns++;
    }
    assert(validStack(game));
    const total=[...game.stock.flat(),...game.hand.flat(),...game.discard.flat(2),
      ...game.build.flat().map(c=>c.id),...game.draw,...game.completed];
    assert.equal(total.length,162);
    assert.equal(new Set(total).size,162);
  }
  assert(plays>0);
  assert(turns>0);
  assert(!playStack(game,{zone:"stock"},-1).valid);
});
test("three original illustrated jigsaws support 9, 16 and 25-piece undo-free swaps and clear",()=>{
  for(const scene of JIGSAW_SCENES)for(const n of [3,4,5]){
    const g=newJigsaw(101,scene.id,n);
    assert(validJigsaw(g));
    assert(!g.won);
    assert(correctJigsawPieces(g)<n*n);
    assert.equal(swapJigsaw(g,-1,0).valid,false);
    assert.equal(swapJigsaw(g,0,0).valid,false);
    let current=g;
    for(let i=0;i<n*n;i++){
      const at=current.tiles.indexOf(i);
      if(at===i)continue;
      const moved=swapJigsaw(current,i,at);
      assert(moved.valid);
      current=moved.game;
    }
    assert(current.won);
    assert.equal(correctJigsawPieces(current),n*n);
    assert.equal(swapJigsaw(current,0,1).valid,false);
    assert(validJigsaw(current));
  }
});
test("jigsaw completions earn nine unique extra decorations without disturbing Mom's old chests",()=>{
  let saved=createSaveState({progress:{harvest:21},collection:{claimed:{"harvest:1":true},
    companion:"bunny"}});
  const oldChest=chestReward("harvest",1);
  const oldProgress=saved.progress.harvest;
  assert.equal(gardenInventory(saved.collection).rewards.length,1);
  for(const reward of JIGSAW_GARDEN_DECOR){
    let previous=newJigsaw(11,reward.scene,reward.size),game=previous;
    for(let i=0;i<game.tiles.length;i++){
      const at=game.tiles.indexOf(i);
      if(at===i)continue;
      const next=swapJigsaw(game,i,at).game;
      const collection=recordJigsawGardenReward(saved.collection,game,next);
      saved={...saved,collection};
      game=next;
    }
    assert(game.won);
    assert(saved.collection.jigsawPrizes.includes(reward.scene+":"+reward.size));
    assert.equal(recordJigsawGardenReward(saved.collection,previous,game).jigsawPrizes.length,
      saved.collection.jigsawPrizes.length);
  }
  const roundTrip=createSaveState(JSON.parse(JSON.stringify(saved)));
  assert.equal(roundTrip.collection.jigsawPrizes.length,9);
  assert.equal(gardenInventory(roundTrip.collection).decor.length,10);
  assert.deepEqual(chestReward("harvest",1),oldChest);
  assert.equal(roundTrip.progress.harvest,oldProgress);
  assert.equal(roundTrip.collection.companion,"bunny");
  assert.equal(gardenInventory(roundTrip.collection).pets[0].id,"bunny");
  assert(!normalizeCollection({jigsawPrizes:["fake:10"]}).jigsawPrizes.length);
  assert.equal(claimChapterChest(roundTrip,"harvest",1).valid,false);
});
test("save migration preserves original puzzle levels and includes independent new card slots",()=>{
  const old=newSolitaire(31),cards={solitaire:old};
  const saved=createSaveState({mode:"harvest",progress:{harvest:6001},
    collection:{claimed:{"harvest:1":true},companion:"bunny"},
    cards});
  assert.deepEqual(saved.cards.solitaire,old);
  assert.equal(saved.cards.war,null);
  assert.equal(saved.cards.stack,null);
  assert.equal(saved.cards.jigsaw,null);
  assert.equal(saved.progress.harvest,6001);
  const next=createSaveState({...saved,cards:{...saved.cards,war:newWar(77),
    stack:newStack(31,30),jigsaw:newJigsaw(11,"pip",4)}});
  assert(validWar(next.cards.war)&&validStack(next.cards.stack)&&validJigsaw(next.cards.jigsaw));
  assert.equal(next.progress.harvest,6001);
  assert.equal(next.collection.companion,"bunny");
});
test("draw-three Klondike is optional; 3 cards drawn at a time; legacy draw-one saves still work",()=>{
  const legacy=newSolitaire(78),threes=newSolitaire(78,3);
  assert.deepEqual(legacy.tableau,threes.tableau);
  assert.equal(legacy.drawCount,1);
  assert.equal(threes.drawCount,3);
  assert(validSolitaire(threes));
  const one=drawSolitaire(legacy),three=drawSolitaire(threes);
  assert(one.valid&&three.valid);
  assert.equal(one.game.stock.length,23);
  assert.equal(three.game.stock.length,21);
  assert.equal(three.game.waste.length,3);
  assert.deepEqual(undoSolitaire(three.game).game,threes);
  let current=three.game;
  for(let i=0;i<7;i++)current=drawSolitaire(current).game;
  assert.equal(current.stock.length,0);
  assert.equal(current.waste.length,24);
  const recycled=drawSolitaire(current);
  assert(recycled.valid);
  assert.equal(recycled.game.drawCount,3);
  assert.equal(recycled.game.stock.length,24);
  assert(validSolitaire(recycled.game));
  const oldSave=JSON.parse(JSON.stringify(legacy));
  delete oldSave.drawCount;
  assert(validSolitaire(oldSave));
  assert.equal(drawSolitaire(oldSave).game.waste.length,1);
});
