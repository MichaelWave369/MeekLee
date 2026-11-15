import test from "node:test";
import assert from "node:assert/strict";
import {newSpider,validSpider,spiderCanDeal,spiderLegalMoves,
  spiderMove,spiderDeal,spiderHint,spiderBlocked,undoSpider,
  SPIDER_COLUMNS,SPIDER_RUNS,SPIDER_DEALS} from "../src/spider.js";
import {createSaveState} from "../src/save.js";

function deck(){
  return Array.from({length:8},(_,copy)=>
    Array.from({length:13},(_,i)=>"S-"+(i+1)+"-"+copy)).flat();
}
function rigTop(g,assignments){
  const next={...g,stock:[...g.stock],columns:g.columns.map(c=>({
    up:[...c.up],down:[...c.down]})),completed:g.completed.map(r=>[...r])};
  function locate(card){
    for(const col of next.columns){
      const down=col.down.indexOf(card);if(down>=0)return [col.down,down];
      const up=col.up.indexOf(card);if(up>=0)return [col.up,up];
    }
    const stock=next.stock.indexOf(card);
    if(stock>=0)return [next.stock,stock];
    throw Error("Missing card "+card);
  }
  for(const [rawCol,card] of Object.entries(assignments)){
    const col=next.columns[Number(rawCol)],last=col.up.length-1;
    const previous=col.up[last],found=locate(card);
    col.up[last]=card;found[0][found[1]]=previous;
  }
  assert(validSpider(next));
  return next;
}
function almostFinished(){
  const cards=deck(),done=Array.from({length:7},(_,i)=>
    Array.from({length:13},(_,j)=>"S-"+(13-j)+"-"+i));
  const final=Array.from({length:13},(_,j)=>"S-"+(13-j)+"-7");
  const columns=Array.from({length:10},()=>({down:[],up:[]}));
  columns[0].up=final.slice(0,12);
  columns[1].up=[final[12]];
  return {...newSpider(1),columns,stock:[],completed:done,moves:0,deals:5,history:[],won:false};
}
test("one-suit Spider deals 104 distinct cards: first four six, remaining six five",()=>{
  const g=newSpider(19);
  assert.deepEqual(g,newSpider(19));
  assert(validSpider(g));
  assert.equal(g.columns.length,SPIDER_COLUMNS);
  assert.equal(g.stock.length,50);
  assert.equal(g.completed.length,0);
  assert.equal(g.deals,0);
  assert.equal(SPIDER_RUNS,8);
  assert.equal(SPIDER_DEALS,5);
  assert.deepEqual(g.columns.map(c=>c.down.length),[5,5,5,5,4,4,4,4,4,4]);
  assert(g.columns.every(c=>c.up.length===1));
  assert.equal(validSpider({...g,stock:[...g.stock,g.stock[0]]}),false);
  assert.equal(validSpider({...g,won:true}),false);
  assert.equal(validSpider({...g,deals:1}),false);
});
test("a face-up card and descending run can move only onto its predecessor",()=>{
  const g=rigTop(newSpider(120),{0:"S-7-0",1:"S-8-0",2:"S-10-0"});
  const move=spiderLegalMoves(g).find(m=>m.from===0&&m.start===0&&m.to===1);
  assert(move);assert.equal(move.length,1);
  assert.equal(spiderMove(g,0,0,0).valid,false);
  assert.equal(spiderMove(g,0,-1,1).valid,false);
  const result=spiderMove(g,0,0,1);
  assert(result.valid);assert.equal(result.game.columns[1].up.length,2);
  assert.equal(result.game.columns[1].up.at(-1),"S-7-0");
  assert.equal(result.game.columns[0].down.length,4);
  assert.equal(result.game.columns[0].up.length,1);
  assert.equal(g.columns[0].down.length,5);
  assert.equal(g.moves,0);
  assert(validSpider(result.game));
});
test("unbroken 13-card King-to-Ace run automatically clears as eighth win",()=>{
  const g=almostFinished();
  assert(validSpider(g));
  assert.equal(spiderMove(g,1,0,0).valid,true);
  const r=spiderMove(g,1,0,0);
  assert.equal(r.cleared,1);
  assert.equal(r.game.completed.length,8);
  assert(r.game.won);
  assert.equal(r.game.columns[0].up.length,0);
  assert.equal(r.game.columns[1].up.length,0);
  assert.equal(r.game.stock.length,0);
  assert(validSpider(r.game));
  assert.equal(spiderDeal(r.game).valid,false);
  assert.equal(spiderLegalMoves(r.game).length,0);
  const undo=undoSpider(r.game);
  assert(undo.valid);assert.equal(undo.game.completed.length,7);
  assert.equal(undo.game.won,false);
  assert(validSpider(undo.game));
});
test("stock deals one card to each of ten columns, exactly five deals",()=>{
  let g=newSpider(8),lastStock=g.stock.at(-1);
  assert(spiderCanDeal(g));
  const first=spiderDeal(g);
  assert(first.valid);assert.equal(first.game.stock.length,40);
  assert.equal(first.game.deals,1);
  assert.equal(first.game.columns[0].up.at(-1),lastStock);
  assert.equal(first.game.moves,1);
  assert.equal(g.stock.length,50);
  const undone=undoSpider(first.game);
  assert(undone.valid);assert.deepEqual(undone.game.stock,g.stock);
  g=first.game;
  for(let i=1;i<5;i++){
    assert(spiderCanDeal(g));
    g=spiderDeal(g).game;assert(validSpider(g));
  }
  assert.equal(g.stock.length,0);
  assert.equal(g.deals,5);
  assert.equal(spiderCanDeal(g),false);
  assert.equal(spiderDeal(g).valid,false);
});
test("dealing is prohibited if any column is empty, without losing cards",()=>{
  const g=newSpider(33),next={...g,
    columns:g.columns.map(c=>({down:[...c.down],up:[...c.up]}))};
  const first=next.columns[0];
  next.columns[1].down.push(...first.down,...first.up);
  next.columns[0]={up:[],down:[]};
  assert(validSpider(next));
  assert.equal(spiderCanDeal(next),false);
  assert.equal(spiderDeal(next).valid,false);
  assert.equal(next.stock.length,50);
});
test("non-descending suffix cannot be dragged; a valid suffix can move",()=>{
  // Force two consecutive face-up cards in source with a hidden card below.
  const g=rigTop(newSpider(51),{0:"S-7-0",1:"S-9-0"});
  const next={...g,columns:g.columns.map(c=>({down:[...c.down],up:[...c.up]}))};
  const exposed=next.columns[0].up.pop();
  const underneath=next.columns[0].down.pop();
  next.columns[0].up.push(underneath,exposed);
  assert(validSpider(next));
  const moves=spiderLegalMoves(next).filter(m=>m.from===0);
  assert(moves.every(m=>m.start!==0||Math.abs(
    Number(next.columns[0].up[0].split("-")[1])-
    Number(next.columns[0].up[1].split("-")[1]))===1));
  assert.equal(spiderMove(next,0,0,1).valid,
    moves.some(m=>m.start===0&&m.to===1));
});
test("hint gives a legal move or deal, blocked status only when no legal action",()=>{
  for(let seed=1;seed<=40;seed++){
    const g=newSpider(seed),hint=spiderHint(g),moves=spiderLegalMoves(g);
    if(hint?.type==="move")assert(moves.some(m=>
      m.from===hint.from&&m.start===hint.start&&m.to===hint.to));
    else assert(hint?.type==="deal"||hint===null);
    if(spiderBlocked(g))assert.equal(spiderCanDeal(g),false);
    assert.equal(undoSpider(g).valid,false);
  }
});
test("100 seeded Spider games preserve every card through legal moves and deals",()=>{
  for(let seed=1;seed<=100;seed++){
    let g=newSpider(seed);
    for(let i=0;i<90&&!g.won&&!spiderBlocked(g);i++){
      const moves=spiderLegalMoves(g);
      const choice=moves.length?
        spiderMove(g,moves[(seed+i)%moves.length].from,
          moves[(seed+i)%moves.length].start,moves[(seed+i)%moves.length].to):
        spiderDeal(g);
      assert(choice.valid,"seed "+seed+" step "+i);
      g=choice.game;
      assert(validSpider(g),"invalid seed "+seed+" step "+i);
    }
  }
});
test("saved Spider never replaces garden, puzzles, Klondike, Pyramid or TriPeaks",()=>{
  const raw={progress:{harvest:6001},collection:{companion:"bunny",claimed:{"harvest:1":true}},
    cards:{spider:newSpider(42),solitaire:null,pyramid:null,tripeaks:null,dice:null}};
  const state=createSaveState(raw);
  assert.deepEqual(state.cards.spider,raw.cards.spider);
  assert.equal(state.progress.harvest,6001);
  assert.equal(state.collection.companion,"bunny");
  assert.equal(state.cards.solitaire,null);
  assert.equal(state.cards.pyramid,null);
  assert.equal(state.cards.tripeaks,null);
  assert.equal(state.cards.dice,null);
  const bad=createSaveState({...raw,cards:{spider:{kind:"spider"}}});
  assert.equal(bad.cards.spider,null);
  assert.equal(bad.progress.harvest,6001);
});
