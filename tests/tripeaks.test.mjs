import test from "node:test";
import assert from "node:assert/strict";
import {newTriPeaks,validTriPeaks,TRIPEAKS_ROWS,TRIPEAKS_POSITIONS,
  tripeaksChildren,tripeaksExposed,tripeaksAdjacent,tripeaksPlayable,
  tripeaksTake,tripeaksDraw,tripeaksHint,tripeaksBlocked,undoTriPeaks}
  from "../src/tripeaks.js";
import {createSaveState} from "../src/save.js";

function rig(seed=11,tableauPositions={},starter=null){
  const base=newTriPeaks(seed),cards=[...base.tableau,...base.stock,...base.waste];
  const target={...tableauPositions,...(starter?{51:starter}:{})};
  for(const [rawIndex,card] of Object.entries(target)){
    const index=Number(rawIndex),found=cards.indexOf(card);
    assert.notEqual(found,-1);
    [cards[index],cards[found]]=[cards[found],cards[index]];
  }
  return {...base,tableau:cards.slice(0,28),stock:cards.slice(28,51),waste:[cards[51]]};
}

test("deterministic 3-peak deal: 28 tableau + 23 stock + 1 waste with exactly 52 cards",()=>{
  const g=newTriPeaks(41);
  assert.deepEqual(g,newTriPeaks(41));
  assert(validTriPeaks(g));
  assert.equal(g.tableau.length,28);
  assert.equal(g.stock.length,23);
  assert.equal(g.waste.length,1);
  assert.equal(TRIPEAKS_ROWS.flat().length,28);
  assert.equal(TRIPEAKS_POSITIONS.length,28);
  assert.equal(tripeaksExposed(g).length,10);
  assert.deepEqual(tripeaksExposed(g),[18,19,20,21,22,23,24,25,26,27]);
  assert.equal(g.score,0);
  assert.equal(g.won,false);
  assert.equal(g.streak,0);
  assert.equal(validTriPeaks({...g,tableau:g.tableau.slice(1)}),false);
  assert.equal(validTriPeaks({...g,won:true}),false);
  assert.equal(validTriPeaks({...g,stock:[...g.stock,g.stock[0]]}),false);
  assert.equal(validTriPeaks({...g,score:-1}),false);
});

test("three peaks depend on six middle cards and the 10-card shared base",()=>{
  assert.deepEqual(tripeaksChildren(0),[3,4]);
  assert.deepEqual(tripeaksChildren(1),[5,6]);
  assert.deepEqual(tripeaksChildren(2),[7,8]);
  assert.deepEqual(tripeaksChildren(3),[9,10]);
  assert.deepEqual(tripeaksChildren(4),[10,11]);
  assert.deepEqual(tripeaksChildren(9),[18,19]);
  assert.deepEqual(tripeaksChildren(17),[26,27]);
  assert.deepEqual(tripeaksChildren(18),[]);
  assert.deepEqual(tripeaksChildren(28),[]);
});

test("adjacency disregards suit, wraps A-K and never permits same or distant ranks",()=>{
  assert.equal(tripeaksAdjacent("S-1","H-13"),true);
  assert.equal(tripeaksAdjacent("H-13","C-1"),true);
  assert.equal(tripeaksAdjacent("D-8","S-9"),true);
  assert.equal(tripeaksAdjacent("C-12","D-13"),true);
  assert.equal(tripeaksAdjacent("H-5","C-5"),false);
  assert.equal(tripeaksAdjacent("H-5","C-7"),false);
  assert.equal(tripeaksAdjacent("S-1","S-2"),true);
  assert.equal(tripeaksAdjacent(null,"S-1"),false);
});

test("only exposed adjacent cards can be taken and become the next waste card",()=>{
  const g=rig(111,{0:"C-5",18:"S-7",19:"H-10"}, "D-6");
  assert(validTriPeaks(g));
  assert(!tripeaksPlayable(g).includes(0));
  assert(tripeaksPlayable(g).includes(18));
  assert.equal(tripeaksTake(g,0).valid,false);
  assert.equal(tripeaksTake(g,19).valid,false);
  const move=tripeaksTake(g,18);
  assert(move.valid);
  assert.equal(move.game.tableau[18],null);
  assert.equal(move.game.waste.at(-1),"S-7");
  assert.equal(move.game.score,100);
  assert.equal(move.game.streak,1);
  assert.equal(move.game.moves,1);
  assert.equal(move.game.removed.length,0);
  assert.equal(g.tableau[18],"S-7");
  assert(validTriPeaks(move.game));
});

test("clearing both bottom children turns over the covered upper card",()=>{
  const g=rig(103,{9:"D-9",18:"S-7",19:"C-8"},"H-6");
  assert(!tripeaksExposed(g).includes(9));
  const a=tripeaksTake(g,18);
  assert(a.valid);assert(!tripeaksExposed(a.game).includes(9));
  const b=tripeaksTake(a.game,19);
  assert(b.valid);assert(tripeaksExposed(b.game).includes(9));
  assert(tripeaksPlayable(b.game).includes(9));
  assert.equal(b.game.streak,2);
  assert.equal(b.game.score,300);
  const c=tripeaksTake(b.game,9);
  assert(c.valid);assert.equal(c.game.streak,3);
  assert.equal(c.game.score,600);
  const undo=undoTriPeaks(c.game);
  assert(undo.valid);assert(undo.game.tableau[9]==="D-9");
  assert.equal(undo.game.score,300);
  assert(validTriPeaks(undo.game));
});

test("stock draw changes waste, resets streak and can be undone",()=>{
  let g=newTriPeaks(25);
  const initial=g.waste.at(-1),stockTop=g.stock.at(-1);
  assert.equal(undoTriPeaks(g).valid,false);
  const result=tripeaksDraw(g);
  assert(result.valid);
  g=result.game;
  assert.equal(g.waste.at(-1),stockTop);
  assert.equal(g.waste.length,2);
  assert.equal(g.stock.length,22);
  assert.equal(g.draws,1);
  assert.equal(g.moves,1);
  const undone=undoTriPeaks(g);
  assert(undone.valid);
  assert.deepEqual(undone.game.waste,[initial]);
  assert.equal(undone.game.stock.length,23);
  assert(validTriPeaks(undone.game));
  for(let i=0;i<22;i++){
    const next=tripeaksDraw(g);
    assert(next.valid);
    g=next.game;
  }
  assert.equal(g.stock.length,0);
  assert.equal(g.draws,23);
  assert.equal(tripeaksDraw(g).valid,false);
  assert(validTriPeaks(g));
});

test("hint suggests a playable card or stock draw, with no invalid state mutation",()=>{
  const g=rig(51,{18:"S-7",19:"D-9"},"H-6");
  const before=JSON.stringify(g),hint=tripeaksHint(g);
  assert.deepEqual(hint,{type:"take",index:18});
  assert.equal(JSON.stringify(g),before);
  const noMatch=rig(51,{18:"S-7",19:"D-9",20:"H-11",21:"C-3",
    22:"C-6",23:"D-12",24:"H-5",25:"C-1",26:"H-8",27:"D-10"},"H-4");
  // Even if the random base happens to contain an adjacent card, every
  // returned hint must be a currently legal move.
  const next=tripeaksHint(noMatch);
  assert(next?.type==="draw"||
    next?.type==="take"&&tripeaksPlayable(noMatch).includes(next.index));
});

test("last exposed card wins even with stock left; blocked game stays distinct",()=>{
  const template=rig(62,{18:"S-5"}, "D-4");
  const removedExceptLast=template.tableau.filter((_,i)=>i!==18);
  const last={
    ...template,tableau:template.tableau.map((x,i)=>i===18?x:null),
    stock:[],waste:[...template.stock,...removedExceptLast,...template.waste]
  };
  assert(validTriPeaks(last));
  assert.equal(tripeaksPlayable(last).includes(18),true);
  const win=tripeaksTake(last,18);
  assert(win.valid);assert(win.game.won);
  assert.equal(tripeaksPlayable(win.game).length,0);
  assert.equal(tripeaksDraw(win.game).valid,false);
  assert(validTriPeaks(win.game));

  const stuckTemplate=rig(63,{18:"S-5"},"D-9");
  const stuck={...stuckTemplate,tableau:stuckTemplate.tableau.map((x,i)=>i===18?x:null),
    stock:[],waste:[...stuckTemplate.stock,
      ...stuckTemplate.tableau.filter((_,i)=>i!==18),...stuckTemplate.waste]};
  assert(validTriPeaks(stuck));
  assert(tripeaksBlocked(stuck));
  assert.equal(tripeaksHint(stuck),null);
  assert.equal(tripeaksTake(stuck,18).valid,false);
});

test("hundreds of shuffled games never lose card uniqueness or violate turn state",()=>{
  for(let seed=1;seed<=100;seed++){
    let g=newTriPeaks(seed),steps=0;
    while(!g.won&&!tripeaksBlocked(g)&&steps<100){
      const play=tripeaksPlayable(g),move=play.length?
        tripeaksTake(g,play[0]):tripeaksDraw(g);
      assert(move.valid,"seed "+seed+" move "+steps);
      g=move.game;steps++;
      assert(validTriPeaks(g),"seed "+seed+" move "+steps);
    }
    assert(g.won||tripeaksBlocked(g),"seed "+seed);
  }
});

test("old Klondike, Pyramid, dice, high levels and garden ornaments survive migration",()=>{
  const state={progress:{harvest:6001},collection:{
    claimed:{"harvest:1":true},companion:"bunny"
  },cards:{tripeaks:newTriPeaks(18),pyramid:null,solitaire:null,dice:null}};
  const saved=createSaveState(state);
  assert.deepEqual(saved.cards.tripeaks,state.cards.tripeaks);
  assert.equal(saved.progress.harvest,6001);
  assert.equal(saved.collection.companion,"bunny");
  assert.equal(saved.cards.pyramid,null);
  assert.equal(saved.cards.solitaire,null);
  assert.equal(saved.cards.dice,null);
  const corrupt=createSaveState({...state,cards:{tripeaks:{kind:"tripeaks"}}});
  assert.equal(corrupt.cards.tripeaks,null);
  assert.equal(corrupt.progress.harvest,6001);
});
