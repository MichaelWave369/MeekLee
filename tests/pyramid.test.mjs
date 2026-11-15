import test from "node:test";
import assert from "node:assert/strict";
import {newPyramid,validPyramid,pyramidExposed,pyramidAvailable,
  pyramidCard,pyramidLegalMoves,pyramidRemove,pyramidDraw,pyramidHint,
  pyramidBlocked,undoPyramid,MAX_RECYCLES} from "../src/pyramid.js";
import {STANDARD_SUITS} from "../src/solitaire.js";
import {createSaveState} from "../src/save.js";

const deck=STANDARD_SUITS.flatMap(s=>Array.from({length:13},(_,i)=>s.id+"-"+(i+1)));
// Construct a 52-unique-card fixture, without creating duplicate or missing cards.
function rig(at={},removed=[],waste=[],opts={}){
  const forced=Object.values(at);
  assert.equal(new Set([...forced,...waste]).size,forced.length+waste.length);
  const unused=deck.filter(c=>!forced.includes(c)&&!waste.includes(c));
  const tableau=Array.from({length:28},(_,i)=>at[i]||unused.shift());
  const gone=removed.map(i=>{
    const card=tableau[i];tableau[i]=null;return card;
  });
  return {...newPyramid(42),tableau,stock:unused,waste:[...waste],removed:gone,
    won:tableau.every(x=>x===null),recycles:opts.recycles||0,
    draws:opts.draws||0,history:[]};
}

test("new deterministic 28/24 deal has seven exposed cards and complete deck",()=>{
  const g=newPyramid(40);
  assert(validPyramid(g));assert.deepEqual(g,newPyramid(40));
  assert.equal(g.tableau.filter(Boolean).length,28);
  assert.equal(g.stock.length,24);
  assert.deepEqual(pyramidExposed(g),[21,22,23,24,25,26,27]);
  assert.equal(pyramidAvailable(g).length,7);
  assert.equal(g.recycles,0);assert.equal(g.won,false);
  assert.equal(pyramidRemove(g,["t:0"]).valid,false);
  assert.equal(pyramidCard(g,"t:0"),null);
  assert.equal(validPyramid({...g,tableau:g.tableau.slice(1)}),false);
  assert.equal(validPyramid({...g,stock:[...g.stock,g.stock[0]]}),false);
  assert.equal(validPyramid({...g,won:true}),false);
});

test("an exposed king clears alone but a covered king cannot be removed",()=>{
  const g=rig({0:"S-13",21:"H-13"});
  assert(validPyramid(g));
  assert.equal(pyramidRemove(g,["t:0"]).valid,false);
  const legal=pyramidLegalMoves(g);
  assert(legal.some(m=>m.cards.length===1&&m.cards[0]==="t:21"));
  const result=pyramidRemove(g,["t:21"]);
  assert(result.valid);assert(result.game.removed.includes("H-13"));
  assert.equal(result.game.tableau[21],null);
  assert.equal(g.tableau[21],"H-13");
  assert(validPyramid(result.game));
});

test("two separately exposed cards totaling 13 are removed together",()=>{
  const g=rig({21:"S-1",22:"H-12",23:"C-4"});
  assert.equal(pyramidRemove(g,["t:21","t:23"]).valid,false);
  assert.equal(pyramidRemove(g,["t:21","t:21"]).valid,false);
  assert.equal(pyramidRemove(g,["w","t:21"]).valid,false);
  const result=pyramidRemove(g,["t:22","t:21"]);
  assert(result.valid);assert.equal(result.game.removed.length,2);
  assert.equal(result.game.tableau[21],null);
  assert.equal(result.game.tableau[22],null);
  assert.equal(result.game.moves,1);
  assert.equal(undoPyramid(result.game).valid,true);
  assert.deepEqual(undoPyramid(result.game).game.tableau,g.tableau);
  assert(validPyramid(result.game));
});

test("uncovering both children exposes the parent while one child still blocks it",()=>{
  const first=rig({15:"D-13"},[21]);
  assert(!pyramidExposed(first).includes(15));
  assert.equal(pyramidRemove(first,["t:15"]).valid,false);
  const second=rig({15:"D-13"},[21,22]);
  assert(pyramidExposed(second).includes(15));
  assert(pyramidAvailable(second).includes("t:15"));
  assert(pyramidRemove(second,["t:15"]).valid);
});

test("top waste card may pair with exposed tableau; buried waste is unavailable",()=>{
  const g=rig({21:"S-5"},[],["D-7","H-8"]);
  assert(validPyramid(g));
  assert.equal(pyramidCard(g,"w"),"H-8");
  assert.equal(pyramidRemove(g,["w","t:21"]).valid,true);
  const result=pyramidRemove(g,["t:21","w"]);
  assert.equal(result.game.waste.length,1);
  assert.equal(result.game.waste[0],"D-7");
  assert.equal(result.game.removed.length,2);
  assert.equal(g.waste.length,2);
  assert(validPyramid(result.game));
});

test("stock draws in exact order, survives undo and recycles at most twice",()=>{
  let g=newPyramid(9),top=g.stock.at(-1);
  assert.equal(undoPyramid(g).valid,false);
  const drawn=pyramidDraw(g);
  assert(drawn.valid);assert.equal(drawn.game.waste.at(-1),top);
  assert.equal(drawn.game.stock.length,23);
  assert.equal(drawn.game.draws,1);
  assert.deepEqual(undoPyramid(drawn.game).game.stock,g.stock);
  g=drawn.game;
  for(let i=0;i<23;i++)g=pyramidDraw(g).game;
  assert.equal(g.stock.length,0);assert.equal(g.waste.length,24);
  assert.equal(pyramidDraw(g).valid,true);
  g=pyramidDraw(g).game;
  assert.equal(g.recycles,1);assert.equal(g.stock.length,24);
  const replay=pyramidDraw(g);
  assert.equal(replay.game.waste.at(-1),top);
  g=replay.game;
  for(let i=0;i<23;i++)g=pyramidDraw(g).game;
  g=pyramidDraw(g).game;
  assert.equal(g.recycles,MAX_RECYCLES);
  for(let i=0;i<24;i++)g=pyramidDraw(g).game;
  assert.equal(g.stock.length,0);
  assert.equal(pyramidDraw(g).valid,false);
  assert.equal(pyramidHint(g)?.type==="recycle",false);
  assert(validPyramid(g));
});

test("hints prefer playable pairs, otherwise a draw or recycle",()=>{
  const g=rig({21:"S-1",22:"H-12"});
  const h=pyramidHint(g);
  assert.equal(h.type,"remove");
  assert(h.cards.includes("t:21"));assert(h.cards.includes("t:22"));
  const blocked=rig({21:"S-1",22:"H-1",23:"D-1",24:"C-1",25:"H-2",26:"S-2",27:"C-2"});
  assert.equal(pyramidHint(blocked).type,"draw");
  assert.equal(pyramidBlocked(blocked),false);
});

test("a blocked pyramid is detectable; clearing the final king wins",()=>{
  const only=rig({21:"S-13"},Array.from({length:28},(_,i)=>i).filter(i=>i!==21));
  // Move every unused stock card into the discard area to preserve 52 cards.
  only.removed.push(...only.stock);only.stock=[];
  assert(validPyramid(only));
  const won=pyramidRemove(only,["t:21"]);
  assert(won.valid);assert(won.game.won);
  assert.equal(pyramidAvailable(won.game).length,0);
  assert.equal(pyramidDraw(won.game).valid,false);
  const stuck=rig({21:"S-4"},Array.from({length:28},(_,i)=>i).filter(i=>i!==21),
    [],{recycles:MAX_RECYCLES});
  stuck.removed.push(...stuck.stock);stuck.stock=[];
  assert(validPyramid(stuck));
  assert.equal(pyramidBlocked(stuck),true);
  assert.equal(pyramidHint(stuck),null);
});

test("pyramid save is independent and corrupt pyramid state never replaces Klondike",()=>{
  const raw={progress:{harvest:6001},
    collection:{claimed:{"harvest:1":true},companion:"bunny"},
    cards:{pyramid:newPyramid(101)}};
  const saved=createSaveState(raw);
  assert.deepEqual(saved.cards.pyramid,raw.cards.pyramid);
  assert.equal(saved.progress.harvest,6001);
  assert.equal(saved.collection.companion,"bunny");
  assert.equal(saved.cards.solitaire,null);
  assert.equal(saved.cards.dice,null);
  const corrupt=createSaveState({...raw,cards:{pyramid:{kind:"pyramid"}}});
  assert.equal(corrupt.cards.pyramid,null);
  assert.equal(corrupt.progress.harvest,6001);
});
