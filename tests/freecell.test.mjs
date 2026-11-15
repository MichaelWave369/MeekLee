import test from "node:test";
import assert from "node:assert/strict";
import {newFreeCell,validFreeCell,freeCellMoves,freeCellMove,freeCellHint,
  freeCellCapacity,freeCellBlocked,freeCellAlternating,undoFreeCell}
  from "../src/freecell.js";
import {STANDARD_SUITS} from "../src/solitaire.js";
import {createSaveState} from "../src/save.js";

const deck=STANDARD_SUITS.flatMap(s=>
  Array.from({length:13},(_,i)=>s.id+"-"+(i+1)));
function rig(set={}){
  const used=new Set(Object.values(set));
  assert.equal(used.size,Object.values(set).length);
  const rest=deck.filter(x=>!used.has(x));
  const lengths=[7,7,7,7,6,6,6,6];
  const tableau=lengths.map((size,i)=>Array.from({length:size},(_,j)=>
    set[i+":"+j]||rest.shift()));
  assert.equal(rest.length,0);
  const g={...newFreeCell(42),tableau};
  assert(validFreeCell(g));
  return g;
}
function packCells(game,n){
  const g={...game,tableau:game.tableau.map(c=>[...c]),
    cells:[null,null,null,null]};
  for(let i=0;i<n;i++){
    g.cells[i]=g.tableau[2+i].pop();
  }
  assert(validFreeCell(g));
  return g;
}
test("seeded FreeCell starts with 52 unique face-up cards in 8 columns",()=>{
  const g=newFreeCell(69);
  assert.deepEqual(g,newFreeCell(69));
  assert(validFreeCell(g));
  assert.deepEqual(g.tableau.map(c=>c.length),[7,7,7,7,6,6,6,6]);
  assert.deepEqual(g.cells,[null,null,null,null]);
  assert(STANDARD_SUITS.every(s=>g.foundations[s.id].length===0));
  assert.equal(g.moves,0);
  assert.equal(g.won,false);
  assert.equal(validFreeCell({...g,tableau:g.tableau.slice(1)}),false);
  assert.equal(validFreeCell({...g,cells:[null,null,null]}),false);
  assert.equal(validFreeCell({...g,tableau:g.tableau.map((c,i)=>i===0?[...c,c[0]]:c)}),false);
  assert.equal(validFreeCell({...g,won:true}),false);
});
test("card sequences must alternate color and descend exactly one rank",()=>{
  assert(freeCellAlternating("S-9","H-8"));
  assert(freeCellAlternating("D-7","C-6"));
  assert(!freeCellAlternating("S-9","C-8"));
  assert(!freeCellAlternating("S-9","H-7"));
  assert(!freeCellAlternating("H-8","S-9"));
  assert(!freeCellAlternating("C-1","H-13"));
});
test("move top card to a free cell, undo, then back to a legal tableau",()=>{
  const g=rig({"0:6":"H-7","1:6":"C-8"});
  const toCell=freeCellMove(g,"t0",6,"c0");
  assert(toCell.valid);
  assert.equal(toCell.game.cells[0],"H-7");
  assert.equal(toCell.game.tableau[0].length,6);
  assert.equal(g.cells[0],null);
  assert(validFreeCell(toCell.game));
  assert.equal(freeCellMove(g,"t0",5,"c0").valid,false);
  assert.equal(freeCellMove(toCell.game,"t1",6,"c0").valid,false);
  const back=freeCellMove(toCell.game,"c0",0,"t1");
  assert(back.valid);
  assert.equal(back.game.tableau[1].at(-1),"H-7");
  assert.equal(back.game.cells[0],null);
  assert.equal(back.game.tableau[1].length,8);
  assert(validFreeCell(back.game));
  const undone=undoFreeCell(back.game);
  assert(undone.valid);
  assert.deepEqual(undone.game.cells,toCell.game.cells);
  assert.equal(undone.game.tableau[1].length,7);
});
test("only the next rank of the same suit may go to its foundation",()=>{
  const g=rig({"0:6":"S-1","1:6":"S-3","2:6":"S-2"});
  assert(freeCellMoves(g).some(m=>m.from==="t0"&&m.to==="fS"));
  assert(!freeCellMoves(g).some(m=>m.from==="t1"&&m.to==="fS"));
  const a=freeCellMove(g,"t0",6,"fS");
  assert(a.valid);assert.deepEqual(a.game.foundations.S,["S-1"]);
  const b=freeCellMove(a.game,"t2",6,"fS");
  assert(b.valid);assert.deepEqual(b.game.foundations.S,["S-1","S-2"]);
  const c=freeCellMove(b.game,"t1",6,"fS");
  assert(c.valid);assert.deepEqual(c.game.foundations.S,["S-1","S-2","S-3"]);
  assert(validFreeCell(c.game));
  assert.equal(freeCellMove(g,"t0",6,"fH").valid,false);
});
test("supermove capacity varies with empty cells and empty tableau destinations",()=>{
  const g=rig({"0:5":"C-8","0:6":"H-7","1:6":"H-9"});
  assert.equal(freeCellCapacity(g,"t1"),5);
  assert(freeCellMoves(g).some(m=>m.from==="t0"&&m.start===5&&m.to==="t1"&&m.length===2));
  const threeFilled=packCells(g,3);
  assert.equal(freeCellCapacity(threeFilled,"t1"),2);
  assert(freeCellMoves(threeFilled).some(m=>m.from==="t0"&&m.start===5&&m.to==="t1"));
  const fourFilled=packCells(g,4);
  assert.equal(freeCellCapacity(fourFilled,"t1"),1);
  assert(!freeCellMoves(fourFilled).some(m=>m.from==="t0"&&m.start===5&&m.to==="t1"));
  assert.equal(freeCellMove(fourFilled,"t0",5,"t1").valid,false);
  assert.equal(freeCellMove(threeFilled,"t0",5,"t1").valid,true);
});
test("an empty tableau accepts any card and raises run capacity when used as workspace",()=>{
  const g=rig({"0:5":"C-8","0:6":"H-7","1:6":"H-9"});
  const columns=g.tableau.map(c=>[...c]);
  columns[7-1].push(...columns[7]);
  columns[7]=[];
  const arranged={...g,tableau:columns};
  assert(validFreeCell(arranged));
  assert.equal(freeCellCapacity(arranged,"t1"),10);
  assert.equal(freeCellCapacity(arranged,"t7"),5);
  assert(!freeCellMoves(arranged).some(m=>m.from==="t0"&&m.start===0&&m.to==="t7"));
  assert(freeCellMoves(arranged).some(m=>m.from==="t0"&&m.start===5&&m.to==="t7"));
  assert(freeCellMove(arranged,"t0",5,"t7").valid);
});
test("a full foundation state wins after the four kings are moved",()=>{
  const foundations=Object.fromEntries(STANDARD_SUITS.map(s=>
    [s.id,Array.from({length:12},(_,i)=>s.id+"-"+(i+1))]));
  let g={...newFreeCell(1),tableau:[
    ["S-13"],["H-13"],["D-13"],["C-13"],[],[],[],[]],
  foundations,cells:[null,null,null,null]};
  assert(validFreeCell(g));
  for(const s of STANDARD_SUITS){
    const from="t"+STANDARD_SUITS.findIndex(x=>x.id===s.id);
    const r=freeCellMove(g,from,0,"f"+s.id);
    assert(r.valid);
    g=r.game;
    assert(validFreeCell(g));
  }
  assert(g.won);
  assert.equal(g.tableau.flat().length,0);
  assert.equal(freeCellMoves(g).length,0);
  assert.equal(freeCellHint(g),null);
  assert.equal(freeCellMove(g,"t0",0,"t1").valid,false);
  const undo=undoFreeCell(g);
  assert(undo.valid);assert.equal(undo.game.won,false);
});
test("hints always recommend a legal action and blocked games have no legal moves",()=>{
  for(let seed=1;seed<=90;seed++){
    const g=newFreeCell(seed);
    const hint=freeCellHint(g),legal=freeCellMoves(g);
    if(hint)assert(legal.some(m=>m.from===hint.from&&
      m.start===hint.start&&m.to===hint.to));
    if(freeCellBlocked(g))assert.equal(legal.length,0);
    assert.equal(undoFreeCell(g).valid,false);
  }
});
test("random legal gameplay preserves 52 distinct cards and all foundation order",()=>{
  for(let seed=1;seed<=45;seed++){
    let g=newFreeCell(seed);
    for(let i=0;i<55&&!g.won&&!freeCellBlocked(g);i++){
      const moves=freeCellMoves(g);
      const m=moves[(seed+i*3)%moves.length];
      const r=freeCellMove(g,m.from,m.start,m.to);
      assert(r.valid,"seed "+seed+" step "+i);
      g=r.game;
      assert(validFreeCell(g),"seed "+seed+" step "+i);
    }
  }
});
test("FreeCell save migration protects older Solitaire games, garden and 6001+ levels",()=>{
  const raw={progress:{harvest:6001},
    collection:{companion:"bunny",claimed:{"harvest:1":true}},
    cards:{freecell:newFreeCell(117),solitaire:null,pyramid:null,
      tripeaks:null,spider:null,dice:null}};
  const restored=createSaveState(raw);
  assert.deepEqual(restored.cards.freecell,raw.cards.freecell);
  assert.equal(restored.progress.harvest,6001);
  assert.equal(restored.collection.companion,"bunny");
  assert.equal(restored.cards.solitaire,null);
  assert.equal(restored.cards.pyramid,null);
  assert.equal(restored.cards.tripeaks,null);
  assert.equal(restored.cards.spider,null);
  assert.equal(restored.cards.dice,null);
  const corrupt=createSaveState({...raw,cards:{freecell:{kind:"freecell"}}});
  assert.equal(corrupt.cards.freecell,null);
  assert.equal(corrupt.progress.harvest,6001);
});
