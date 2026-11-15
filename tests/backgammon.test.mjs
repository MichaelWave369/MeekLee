import test from "node:test";
import assert from "node:assert/strict";
import {
  BACKGAMMON_TARGET,initialBackgammonBoard,newBackgammon,validBackgammon,
  backgammonLegalMoves,backgammonMove,backgammonRoll,
  backgammonOfferDouble,backgammonRespondDouble,backgammonNextGame,
  backgammonBotTurn,backgammonHint,backgammonUndo
} from "../src/backgammon.js";
import {createSaveState} from "../src/save.js";
import {newCheckers} from "../src/checkers.js";
import {newWar} from "../src/war.js";
import {newJigsaw} from "../src/jigsaw.js";
const game=(mom=[],pip=[],extras={})=>{
  const board=Array(24).fill(0);
  for(const [index,count] of mom)board[index]=count;
  for(const [index,count] of pip)board[index]=-count;
  const bar=extras.bar||[0,0],off=extras.off||[
    15-mom.reduce((a,v)=>a+v[1],0)-bar[0],
    15-pip.reduce((a,v)=>a+v[1],0)-bar[1]
  ];
  const state={...newBackgammon(7),board,bar,off,
    turn:extras.turn??0,dice:extras.dice||[2,3],
    winner:null,matchWinner:null,doubleOfferedBy:null,
    history:[],turnRecorded:false,...extras};
  assert(validBackgammon(state),"fixture must conserve fifteen checkers per side");
  return state;
};
const contains=(moves,from,to,die)=>moves.some(m=>
  m.from===from&&m.to===to&&m.die===die);
test("initial 24-point board has the standard 2/5/3/5 arrangement and 15 checkers each",()=>{
  const board=initialBackgammonBoard();
  assert.equal(board.length,24);
  assert.equal(board[23],2);assert.equal(board[12],5);
  assert.equal(board[7],3);assert.equal(board[5],5);
  assert.equal(board[0],-2);assert.equal(board[11],-5);
  assert.equal(board[16],-3);assert.equal(board[18],-5);
  for(let seed=1;seed<80;seed++){
    const g=newBackgammon(seed);
    assert(validBackgammon(g));
    assert.equal(g.off[0],0);assert.equal(g.off[1],0);
    assert.equal(g.matchScore[0],0);
    assert.equal(g.matchScore[1],0);
    assert.notEqual(g.dice[0],g.dice[1],"Opening roll rerolls ties");
    assert.equal(g.turn,g.dice[0]>g.dice[1]?0:1);
    assert.deepEqual(newBackgammon(seed),g,"Opening roll is reproducible for tests");
  }
});
test("normal legal dice moves are separate steps and cannot land on a blocked point",()=>{
  const g=game([[12,1]],[[9,2]],{off:[14,13],dice:[2,3]});
  const moves=backgammonLegalMoves(g);
  assert(contains(moves,12,10,2));
  assert(!contains(moves,12,9,3));
  assert.equal(backgammonMove(g,12,9,3).valid,false);
  const saved=structuredClone(g);
  const done=backgammonMove(g,12,10,2);
  assert(done.valid);
  assert.deepEqual(g,saved,"Input state must stay unchanged");
  assert.equal(done.game.board[10],1);
  assert.equal(done.game.board[12],0);
  assert.equal(done.game.moves,1);
});
test("highest legal die wins when either die could play but no two-die sequence exists",()=>{
  const g=game([[0,14]],[[17,15]],{bar:[1,0],dice:[2,5]});
  const moves=backgammonLegalMoves(g);
  assert(moves.length>0);
  assert(moves.every(x=>x.from==="bar"&&x.die===5));
  assert(contains(moves,"bar",19,5));
  assert.equal(backgammonMove(g,"bar",22,2).valid,false);
  const entered=backgammonMove(g,"bar",19,5);
  assert(entered.valid);
  assert.equal(entered.game.bar[0],0);
  assert.equal(entered.game.turn,1);
});
test("all possible dice must be used when a full sequence exists, including low-first choices",()=>{
  const g=game([[12,1]],[[23,15]],{off:[14,0],dice:[2,3]});
  const moves=backgammonLegalMoves(g);
  assert(contains(moves,12,10,2));
  assert(contains(moves,12,9,3));
  const result=backgammonMove(g,12,10,2);
  assert(result.valid);
  assert.equal(result.game.dice.length,1);
  assert.equal(result.game.turn,0);
  assert(backgammonLegalMoves(result.game).length>0);
});
test("bar entry has priority; blocked bar entries cause a forfeited roll",()=>{
  const g=game([[5,14]],[[23,2],[22,2],[21,2],[20,2],[19,2],[18,2],[17,3]],
    {bar:[1,0],dice:[1,2]});
  assert.equal(backgammonLegalMoves(g).length,0);
  assert.equal(backgammonMove(g,5,4,1).valid,false);
  const canEnter=game([[5,14]],[[22,1],[23,14]],{bar:[1,0],dice:[2,1]});
  const moves=backgammonLegalMoves(canEnter);
  assert(moves.every(m=>m.from==="bar"));
  assert(contains(moves,"bar",22,2));
  const entered=backgammonMove(canEnter,"bar",22,2);
  assert(entered.valid);
  assert.equal(entered.game.bar[0],0);
  assert.equal(entered.game.bar[1],1,"Landing on a single enemy checker hits it");
  assert.equal(entered.game.board[22],1);
});
test("bearing off requires all checkers at home; overshoot applies only to farthest checker",()=>{
  const outside=game([[6,1],[0,14]],[[23,15]],{dice:[6,1]});
  assert(!backgammonLegalMoves(outside).some(m=>m.to==="off"));
  const home=game([[5,1],[3,1]],[[23,15]],{off:[13,0],dice:[6,5]});
  const moves=backgammonLegalMoves(home);
  assert(contains(moves,5,"off",6));
  assert(!contains(moves,3,"off",6),
    "Point four cannot overshoot while point six remains occupied");
  const only4=game([[3,1]],[[23,15]],{off:[14,0],dice:[6]});
  assert(contains(backgammonLegalMoves(only4),3,"off",6));
  const useBoth=game([[3,1]],[[23,15]],{off:[14,0],dice:[6,2]});
  assert(contains(backgammonLegalMoves(useBoth),3,1,2),
    "Use the smaller die first when doing so makes both dice playable");
});
test("doubles provide up to four legal moves and use the maximum playable number",()=>{
  const g=game([[13,1]],[[23,15]],{off:[14,0],dice:[3,3,3,3]});
  let current=g,count=0;
  while(current.turn===0&&current.dice.length&&count<4){
    const moves=backgammonLegalMoves(current);
    assert(moves.length);
    const next=backgammonMove(current,moves[0].from,moves[0].to,moves[0].die);
    assert(next.valid);
    current=next.game;
    count++;
  }
  assert.equal(count,4);
  assert.equal(current.turn,1);
});
test("single, gammon and backgammon scoring awards 1x, 2x, 3x cube and match points",()=>{
  for(const [label,pip,bar,off,expected] of [
    ["single",[[23,14]],[0,0],[14,1],1],
    ["gammon",[[23,15]],[0,0],[14,0],2],
    ["backgammon",[[23,14]],[0,1],[14,0],3]
  ]){
    const g=game([[0,1]],pip,{bar,off,dice:[1]});
    const legal=backgammonLegalMoves(g);
    const won=backgammonMove(g,0,"off",1);
    assert(won.valid,label);
    assert.equal(won.game.winner,0);
    assert.equal(won.game.result.points,expected,label);
    assert.equal(won.game.result.type,label);
    assert.deepEqual(won.game.matchScore,[expected,0]);
    assert.equal(backgammonLegalMoves(won.game).length,0);
    if(expected<5){
      const next=backgammonNextGame(won.game);
      assert(next.valid);
      assert.deepEqual(next.game.matchScore,[expected,0]);
      assert.equal(next.game.round,2);
      assert.equal(next.game.cube,1);
    }
  }
  assert.equal(BACKGAMMON_TARGET,5);
});
test("doubling cube can be offered only before rolling, accepted or passed, and has owner",()=>{
  const g=game([[6,15]],[[23,15]],{dice:[]});
  const offer=backgammonOfferDouble(g);
  assert(offer.valid);
  assert.equal(offer.game.doubleOfferedBy,0);
  assert.equal(backgammonRoll(offer.game).valid,false);
  const yes=backgammonRespondDouble(offer.game,true);
  assert(yes.valid);
  assert.equal(yes.game.cube,2);
  assert.equal(yes.game.cubeOwner,1);
  assert.equal(backgammonOfferDouble(yes.game).valid,false);
  assert(backgammonRoll(yes.game).valid);
  const no=backgammonRespondDouble(offer.game,false);
  assert(no.valid);
  assert.equal(no.game.winner,0);
  assert.equal(no.game.result.points,1);
  assert.equal(no.game.result.type,"declined double");
  assert.equal(backgammonNextGame(no.game).valid,true);
});
test("match ends at 5 points and cannot deal extra games after final victory",()=>{
  const g=game([[0,1]],[[23,15]],
    {off:[14,0],matchScore:[4,1],dice:[1]});
  const result=backgammonMove(g,0,"off",1);
  assert(result.valid);
  assert.equal(result.game.matchWinner,0);
  assert.equal(result.game.matchScore[0],6);
  assert.equal(backgammonNextGame(result.game).valid,false);
});
test("Pip completes full legal turns across opening rolls and multiple random games",()=>{
  let totalBotTurns=0,totalMoves=0;
  for(let seed=2;seed<12;seed++){
    let g=newBackgammon(seed);
    for(let i=0;i<35&&!g.winner;i++){
      assert(validBackgammon(g));
      if(g.turn===1){
        const before=JSON.stringify(g),bot=backgammonBotTurn(g);
        assert(bot.valid,"bot should complete a legal turn");
        assert.equal(JSON.stringify(g),before);
        g=bot.game;
        assert(g.turn===0||g.winner!==null||g.doubleOfferedBy===1);
        if(g.doubleOfferedBy===1)g=backgammonRespondDouble(g,true).game;
        totalBotTurns++;
      }else{
        if(g.doubleOfferedBy===1)g=backgammonRespondDouble(g,true).game;
        else if(!g.dice.length){
          const roll=backgammonRoll(g);assert(roll.valid);g=roll.game;
        }else{
          const legal=backgammonLegalMoves(g);
          assert(legal.length>0);
          const moved=backgammonMove(g,legal[0].from,legal[0].to,legal[0].die);
          assert(moved.valid);g=moved.game;totalMoves++;
        }
      }
    }
    assert(validBackgammon(g));
  }
  assert(totalBotTurns>8);
  assert(totalMoves>15);
});
test("hint returns a legal Mom move; undo restores an earlier turn after Pip replies",()=>{
  let g;
  for(let seed=1;seed<60;seed++){
    const candidate=newBackgammon(seed);
    if(candidate.turn===0){g=candidate;break;}
  }
  assert(g);
  const original=structuredClone(g);
  let safety=0;
  while(g.turn===0&&g.dice.length&&safety++<5){
    const hint=backgammonHint(g);
    assert(hint);
    assert(contains(backgammonLegalMoves(g),hint.from,hint.to,hint.die));
    const result=backgammonMove(g,hint.from,hint.to,hint.die);
    assert(result.valid);g=result.game;
  }
  assert.equal(g.turn,1);
  const bot=backgammonBotTurn(g);
  assert(bot.valid);
  const undone=backgammonUndo(bot.game);
  assert(undone.valid);
  assert.deepEqual(undone.game.board,original.board);
  assert.deepEqual(undone.game.bar,original.bar);
  assert.deepEqual(undone.game.off,original.off);
  assert.deepEqual(undone.game.dice,original.dice);
  assert.equal(undone.game.turn,0);
  assert.equal(undone.game.history.length,0);
});
test("Backgammon saves remain isolated from Mom's level 6001, garden, Checkers, War and jigsaws",()=>{
  const base=createSaveState({progress:{harvest:6001},easyProgress:{harvest:6002},
    collection:{claimed:{"harvest:1":true},companion:"bunny"},
    cards:{checkers:newCheckers(10),war:newWar(12),jigsaw:newJigsaw(20,"pip",4)}});
  assert.equal(base.cards.backgammon,null);
  const g=newBackgammon(111);
  const roundTrip=createSaveState({...base,cards:{...base.cards,backgammon:g}});
  assert.deepEqual(roundTrip.cards.backgammon,g);
  assert.deepEqual(roundTrip.cards.checkers,base.cards.checkers);
  assert.deepEqual(roundTrip.cards.war,base.cards.war);
  assert.deepEqual(roundTrip.cards.jigsaw,base.cards.jigsaw);
  assert.deepEqual(roundTrip.collection,base.collection);
  assert.equal(roundTrip.progress.harvest,6001);
  assert.equal(roundTrip.easyProgress.harvest,6002);
  assert.equal(createSaveState({...roundTrip,cards:{...roundTrip.cards,backgammon:{bad:true}}})
    .cards.backgammon,null);
});
