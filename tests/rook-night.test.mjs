import test from "node:test";
import assert from "node:assert/strict";
import {createSaveState} from "../src/save.js";
import {newRook} from "../src/rook.js";
import {
  emptyRookStats,normalizeRookStats,favoriteRookTrump,
  recordRookTransition,rookBotLine,ROOK_PERSONALITIES
} from "../src/rook-night.js";

test("older saves gain independent Rook records without losing any original card or puzzle data",()=>{
  const previous={mode:"harvest",easyProgress:{harvest:29},
    collection:{claimed:{"harvest:1":true}},
    cards:{rook:newRook(517),rookStats:undefined}};
  const migrated=createSaveState(previous,true);
  assert.deepEqual(migrated.cards.rook,previous.cards.rook);
  assert.equal(migrated.easyProgress.harvest,29);
  assert.equal(migrated.collection.claimed["harvest:1"],true);
  assert.deepEqual(migrated.cards.rookStats,emptyRookStats());
  const loaded=createSaveState(JSON.parse(JSON.stringify(migrated)),true);
  assert.deepEqual(loaded.cards.rookStats,migrated.cards.rookStats);
});

test("statistics reject negative or corrupt local values and never count bot trump as Mom's",()=>{
  const previous={...newRook(44),phase:"trump",bidder:1,trump:null};
  const next={...previous,phase:"play",trump:"red"};
  const old={played:8,wins:5,losses:3,currentStreak:2,bestStreak:4,
    handsPlayed:16,trumpCounts:{red:3,green:2,yellow:0,black:0}};
  const result=recordRookTransition(old,previous,next);
  assert.deepEqual(result.trumpCounts,old.trumpCounts);
  assert.equal(result.played,8);
  assert.deepEqual(normalizeRookStats({played:-50,wins:100,losses:-5,
    bestStreak:Infinity,trumpCounts:{red:-1,green:"thousands"}}),emptyRookStats());
});

test("Mom's own trump selections persist and favorite color reflects only her choices",()=>{
  const game=newRook(48);
  let record=emptyRookStats();
  const pre={...game,phase:"trump",bidder:0,turn:0};
  for(const color of ["green","red","green","yellow"]){
    record=recordRookTransition(record,pre,{...pre,phase:"play",trump:color});
  }
  assert.equal(record.trumpCounts.green,2);
  assert.equal(record.trumpCounts.red,1);
  assert.equal(record.trumpCounts.yellow,1);
  assert.deepEqual(favoriteRookTrump(record),{id:"green",label:"Green",count:2});
  assert.equal(favoriteRookTrump(emptyRookStats()),null);
  assert.equal(recordRookTransition(record,{...pre,bidder:2},
    {...pre,phase:"play",trump:"black"}).trumpCounts.black,0);
});

test("wins, losses, current streak and personal best are recorded once per completed game",()=>{
  const game=newRook(16);
  const previous={...game,phase:"trick-done"};
  const win={...previous,phase:"game-over",winner:0};
  const loss={...previous,phase:"game-over",winner:1};
  let stats=emptyRookStats();
  stats=recordRookTransition(stats,previous,win);
  assert.equal(stats.played,1);
  assert.equal(stats.wins,1);
  assert.equal(stats.currentStreak,1);
  assert.equal(stats.bestStreak,1);
  assert.equal(stats.handsPlayed,1);
  assert.deepEqual(recordRookTransition(stats,win,win),stats);
  stats=recordRookTransition(stats,previous,win);
  assert.equal(stats.currentStreak,2);
  stats=recordRookTransition(stats,previous,win);
  assert.equal(stats.bestStreak,3);
  stats=recordRookTransition(stats,previous,loss);
  assert.equal(stats.played,4);
  assert.equal(stats.wins,3);
  assert.equal(stats.losses,1);
  assert.equal(stats.currentStreak,0);
  assert.equal(stats.bestStreak,3);
  stats=recordRookTransition(stats,previous,win);
  assert.equal(stats.currentStreak,1);
  assert.equal(stats.bestStreak,3);
  assert.deepEqual(recordRookTransition(stats,win,newRook(999)),stats);
  const afterRound=recordRookTransition(stats,previous,{...previous,phase:"round-over"});
  assert.equal(afterRound.handsPlayed,stats.handsPlayed+1);
  assert.equal(afterRound.played,stats.played);
});

test("bot remarks react to public events and cannot reveal another seat's hidden cards",()=>{
  const game=newRook(21);
  assert.match(rookBotLine(game,2),/partner/i);
  assert.equal(ROOK_PERSONALITIES[2].name,"Pip");
  const trick={...game,phase:"trick-done",trickWinner:0};
  assert.match(rookBotLine(trick,2),/my partner/i);
  const pipWinner={...trick,trickWinner:2};
  assert.match(rookBotLine(pipWinner,2),/team/i);
  const win={...game,phase:"game-over",winner:0};
  assert.match(rookBotLine(win,2),/we did it/i);
  const loss={...game,phase:"game-over",winner:1};
  assert.match(rookBotLine(loss,2),/next one/i);
  const altered={...game,hands:game.hands.map((h,i)=>i===0?[...h].reverse():h)};
  for(const seat of [1,2,3])assert.equal(rookBotLine(game,seat),rookBotLine(altered,seat));
  assert.equal(rookBotLine(game,0),"");
});
