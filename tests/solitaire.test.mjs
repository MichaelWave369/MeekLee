import test from "node:test";
import assert from "node:assert/strict";
import {
  newSolitaire,validSolitaire,cardLabel,cardRed,shuffleCards,
  drawSolitaire,moveSolitaire,solitaireMoves,autoSolitaire,
  solitaireHint,undoSolitaire,STANDARD_SUITS
} from "../src/solitaire.js";

test("every Klondike deal has 52 unique cards, seven face-up tableau columns and 24 stock",()=>{
  for(let seed=1;seed<=75;seed++){
    const g=newSolitaire(seed);
    assert(validSolitaire(g));
    assert.equal(g.stock.length,24);
    assert.equal(g.waste.length,0);
    assert.equal(g.tableau.length,7);
    for(let i=0;i<7;i++){
      assert.equal(g.tableau[i].down.length,i);
      assert.equal(g.tableau[i].up.length,1);
    }
    assert.deepEqual(g,newSolitaire(seed));
  }
  assert.notDeepEqual(newSolitaire(1).stock,newSolitaire(2).stock);
  assert.equal(cardLabel("H-1"),"A♥");
  assert.equal(cardLabel("S-13"),"K♠");
  assert.equal(cardRed("D-8"),true);
  assert.equal(cardRed("C-8"),false);
});

test("draw-one Solitaire recycles a stock pile deterministically and undo restores a complete save",()=>{
  let g=newSolitaire(83),original=structuredClone(g);
  const turn=drawSolitaire(g);
  assert(turn.valid);
  assert.equal(turn.game.stock.length,23);
  assert.equal(turn.game.waste.length,1);
  assert.deepEqual(g,original);
  assert.deepEqual(undoSolitaire(turn.game).game,original);
  g=turn.game;
  for(let i=0;i<23;i++){const r=drawSolitaire(g);assert(r.valid);g=r.game;}
  assert.equal(g.stock.length,0);
  assert.equal(g.waste.length,24);
  const recycled=drawSolitaire(g);
  assert(recycled.valid);
  assert.equal(recycled.game.stock.length,24);
  assert.equal(recycled.game.waste.length,0);
  assert.equal(recycled.game.stock.at(-1),turn.game.waste.at(-1));
  assert(validSolitaire(recycled.game));
});

test("alternating colors, descending ranks and King-only empty columns are enforced",()=>{
  let g=newSolitaire(4);
  // Crafted fully valid arrangement to exercise tableau movement rules.
  const cards=STANDARD_SUITS.flatMap(s=>Array.from({length:13},(_,i)=>s.id+"-"+(i+1)));
  const used=new Set(["H-12","C-13","D-7","S-8"]);
  g={...g,stock:cards.filter(c=>!used.has(c)),waste:[],
    foundations:{S:[],H:[],D:[],C:[]},
    tableau:[
      {down:[],up:["H-12"]},{down:[],up:["C-13"]},
      {down:[],up:["D-7"]},{down:[],up:["S-8"]},
      {down:[],up:[]},{down:[],up:[]},{down:[],up:[]}
    ]};
  assert(validSolitaire(g));
  assert.equal(moveSolitaire(g,{zone:"tableau",column:0},{zone:"tableau",column:1}).valid,true);
  assert.equal(moveSolitaire(g,{zone:"tableau",column:1},{zone:"tableau",column:4}).valid,true);
  assert.equal(moveSolitaire(g,{zone:"tableau",column:2},{zone:"tableau",column:1}).valid,false);
  assert.equal(moveSolitaire(g,{zone:"tableau",column:2},{zone:"tableau",column:4}).valid,false);
  assert(solitaireMoves(g,{zone:"tableau",column:1}).some(x=>x.column===4));
});

test("all four foundations from A through K are respected and last King wins",()=>{
  const foundations=Object.fromEntries(STANDARD_SUITS.map(s=>[
    s.id,Array.from({length:12},(_,i)=>s.id+"-"+(i+1))
  ]));
  let g={...newSolitaire(12),stock:[],waste:[],
    foundations,tableau:STANDARD_SUITS.map(s=>({down:[],up:[s.id+"-13"]}))
      .concat([{down:[],up:[]},{down:[],up:[]},{down:[],up:[]}])};
  assert(validSolitaire(g));
  for(const s of STANDARD_SUITS){
    const col=STANDARD_SUITS.findIndex(x=>x.id===s.id);
    const move=moveSolitaire(g,{zone:"tableau",column:col},{zone:"foundation",suit:s.id});
    assert(move.valid);
    g=move.game;
  }
  assert.equal(g.won,true);
  assert.equal(g.moves,4);
  assert.equal(g.foundations.H.length,13);
  assert.equal(drawSolitaire(g).valid,false);
});
