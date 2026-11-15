import test from "node:test";
import assert from "node:assert/strict";
import {newFiveDice,validFiveDice,FIVE_DICE_CATEGORIES,rollFiveDice,holdFiveDie,
  fiveDicePreview,fiveDiceTotals,availableFiveDiceCategories,
  scoreFiveDice,fiveDiceBotTurn,fiveDiceHint} from "../src/five-dice.js";
import {createSaveState} from "../src/save.js";
const arrange=(dice,changes={})=>{
  const g=newFiveDice(41,changes.mode||"solo");
  const scores=changes.scores||g.scores;
  return {...g,...changes,dice:[...dice],rolls:changes.rolls||1,
    scores,turns:scores.reduce((sum,score)=>sum+Object.keys(score).length,0)};
};
const sample=[2,2,2,3,3];
const preview=(dice,id)=>fiveDicePreview(arrange(dice),id);
test("new game is deterministic, five dice, 13 open scoring categories",()=>{
  const g=newFiveDice(13);
  assert(validFiveDice(g));assert.equal(g.turn,0);
  assert.equal(g.dice.length,5);assert(g.dice.every(x=>x===null));
  assert.equal(rollFiveDice(g).game.dice.join(","),
    rollFiveDice(newFiveDice(13)).game.dice.join(","));
  assert.equal(availableFiveDiceCategories(g).length,0);
  assert.equal(FIVE_DICE_CATEGORIES.length,13);
  assert.equal(scoreFiveDice(g,"chance").valid,false);
  assert.equal(g.scores[0].chance,undefined);
  assert.equal(validFiveDice({...g,dice:[9,2,3,4,5],rolls:1}),false);
  assert.equal(validFiveDice({...g,mode:"solo",turn:1}),false);
});
test("holding a die keeps it on reroll and three rolls are enforced",()=>{
  let g=newFiveDice(111,"solo");
  let result=rollFiveDice(g);assert(result.valid);
  g=result.game;const face=g.dice[0];
  assert.equal(holdFiveDie(g,5).valid,false);
  assert.equal(holdFiveDie(g,0).valid,true);
  g=holdFiveDie(g,0).game;
  const old=g.dice;
  assert.equal(g.held[0],true);
  assert.equal(rollFiveDice(g).game.dice[0],face);
  assert.deepEqual(g.dice,old);
  g=rollFiveDice(g).game;
  assert.equal(g.rolls,2);
  g=rollFiveDice(g).game;
  assert.equal(g.rolls,3);
  assert.equal(rollFiveDice(g).valid,false);
  assert.equal(holdFiveDie(g,0).valid,false);
  assert.equal(scoreFiveDice(g,"chance").valid,true);
});
test("upper scoring, sets, chance, full house and both straights match standard scores",()=>{
  assert.equal(preview([1,1,2,4,5],"ones"),2);
  assert.equal(preview([6,6,6,6,6],"sixes"),30);
  assert.equal(preview([2,2,2,3,3],"fullHouse"),25);
  assert.equal(preview([2,2,2,2,2],"fullHouse"),0);
  assert.equal(preview([2,2,2,4,5],"threeKind"),15);
  assert.equal(preview([2,2,2,4,5],"fourKind"),0);
  assert.equal(preview([5,5,5,5,3],"fourKind"),23);
  assert.equal(preview([1,2,3,4,4],"smallStraight"),30);
  assert.equal(preview([3,4,5,6,6],"smallStraight"),30);
  assert.equal(preview([1,2,3,4,5],"largeStraight"),40);
  assert.equal(preview([2,3,4,5,6],"largeStraight"),40);
  assert.equal(preview([1,2,3,4,6],"largeStraight"),0);
  assert.equal(preview([2,2,2,2,2],"fiveKind"),50);
  assert.equal(preview([1,1,2,3,4],"fiveKind"),0);
  assert.equal(preview(sample,"chance"),12);
});
test("upper 63 earns a 35-point bonus, and zero-scores are legitimate",()=>{
  const g=arrange([1,1,1,1,1],{scores:[{ones:3,twos:6,threes:9,
    fours:12,fives:15,sixes:18},{}]});
  assert(validFiveDice(g));
  const total=fiveDiceTotals(g,0);
  assert.equal(total.upper,63);assert.equal(total.upperBonus,35);
  assert.equal(total.total,98);
  const scratch=scoreFiveDice(g,"fullHouse");
  assert(scratch.valid);assert.equal(scratch.game.scores[0].fullHouse,0);
  assert.equal(scratch.game.dice.every(d=>d===null),true);
});
test("extra five-of-a-kind gives 100 bonus and forces its matching upper row",()=>{
  let g=arrange([4,4,4,4,4],{scores:[{fiveKind:50},{}]});
  assert.deepEqual(availableFiveDiceCategories(g),["fours"]);
  assert.equal(scoreFiveDice(g,"chance").valid,false);
  const result=scoreFiveDice(g,"fours");
  assert(result.valid);assert.equal(result.points,20);assert.equal(result.bonus,1);
  assert.equal(result.game.bonuses[0],1);
  assert.equal(fiveDiceTotals(result.game).extraBonus,100);
});
test("extra Five Dice rolls use joker full house / straights only after upper face is filled",()=>{
  let g=arrange([6,6,6,6,6],{scores:[{fiveKind:50,sixes:30},{}]});
  assert(availableFiveDiceCategories(g).includes("fullHouse"));
  assert.equal(fiveDicePreview(g,"fullHouse"),25);
  assert.equal(fiveDicePreview(g,"smallStraight"),30);
  assert.equal(fiveDicePreview(g,"largeStraight"),40);
  const result=scoreFiveDice(g,"largeStraight");
  assert(result.valid);assert.equal(result.points,40);assert.equal(result.bonus,1);
  assert.equal(result.game.bonuses[0],1);
});
test("with all lower rows filled, bonus rolls may scratch an open upper row",()=>{
  const lower=Object.fromEntries(FIVE_DICE_CATEGORIES.filter(c=>c.section==="lower")
    .map(c=>[c.id,c.id==="fiveKind"?50:0]));
  let g=arrange([3,3,3,3,3],{scores:[{...lower,threes:9},{}]});
  const open=availableFiveDiceCategories(g);
  assert.equal(open.includes("ones"),true);
  assert.equal(open.includes("twos"),true);
  assert.equal(open.includes("fours"),true);
  assert.equal(open.includes("chance"),false);
  const result=scoreFiveDice(g,"ones");
  assert(result.valid);assert.equal(result.points,0);
  assert.equal(result.bonus,1);
});
test("scratched Five Dice row gives no extra bonus or joker",()=>{
  const g=arrange([5,5,5,5,5],{scores:[{fiveKind:0},{}]});
  assert(availableFiveDiceCategories(g).includes("chance"));
  assert.equal(fiveDicePreview(g,"fullHouse"),0);
  assert.equal(scoreFiveDice(g,"chance").bonus,0);
});
test("Pip plays three-or-fewer legal rolls, scores a row and returns turn to Mom",()=>{
  let g=newFiveDice(19);
  g=rollFiveDice(g).game;
  g=scoreFiveDice(g,"ones").game;
  assert.equal(g.turn,1);
  assert(validFiveDice(g));
  const response=fiveDiceBotTurn(g);
  assert(response.valid);assert.equal(response.game.turn,0);
  assert.equal(response.game.turns,2);
  assert.equal(Object.keys(response.game.scores[1]).length,1);
  assert.equal(response.game.lastPip.dice.length,5);
  assert(validFiveDice(response.game));
  assert.equal(fiveDiceBotTurn(response.game).valid,false);
});
test("13 scorecard turns finish a solo match without altering prior scores",()=>{
  let g=newFiveDice(101,"solo");
  for(const c of FIVE_DICE_CATEGORIES){
    g=rollFiveDice(g).game;
    assert(validFiveDice(g));
    assert(fiveDiceHint(g));
    const result=scoreFiveDice(g,c.id);
    assert(result.valid,"Scoring "+c.id);g=result.game;
  }
  assert(g.finished);assert.equal(g.winner,0);
  assert.equal(g.turns,13);
  assert.equal(g.scores[0].fiveKind>=0,true);
  assert.equal(validFiveDice(g),true);
  assert.equal(rollFiveDice(g).valid,false);
  assert.equal(scoreFiveDice(g,"chance").valid,false);
});
test("save migration isolates dice games from existing Harvest, garden and chess",()=>{
  const raw={progress:{harvest:6001},collection:{claimed:{"harvest:1":true},
    companion:"bunny"},cards:{dice:newFiveDice(7,"solo")}};
  const saved=createSaveState(raw);
  assert.equal(saved.progress.harvest,6001);
  assert.deepEqual(saved.cards.dice,raw.cards.dice);
  assert.equal(saved.collection.companion,"bunny");
  assert.equal(saved.cards.chess,null);
  assert.equal(createSaveState({...raw,cards:{dice:{kind:"five-dice"}}}).cards.dice,null);
});
