import test from "node:test";
import assert from "node:assert/strict";
import {
  EASY_SIZE, SIZE, MODES, adjacent, connectedGroup, findMatches,
  makeLevel, playTurn, hasSwap, hasGroup
} from "../src/core.js";
import {
  WORLD_POWER_LABELS, MAX_WORLD_POWERS, cleanPowers, rewardForGroup,
  awardWorldTurn, redeemWorldPower, nextWorldLevel, worldStars
} from "../src/world-powers.js";
import { createSaveState } from "../src/save.js";

function findMoveWithGroup(mode, predicate) {
  for (const size of [EASY_SIZE,SIZE]) {
    for (let level=1;level<=100;level++) {
      const game=makeLevel(mode,level,size);
      if (mode==="rescue") {
        for(let i=0;i<game.board.length;i++) {
          const group=connectedGroup(game.board,i,size);
          if(predicate(group.length)) return {game,turn:playTurn(game,i)};
        }
      } else {
        for(let i=0;i<game.board.length;i++)
          for(const j of [i+1,i+size]) {
            if(!adjacent(i,j,size))continue;
            const raw=playTurn(game,i,j);
            if(!raw.valid)continue;
            const result=awardWorldTurn(game,raw);
            if(result.trace.some(x=>x.type==="pop" && predicate(x.groupSize)))
              return {game,turn:raw};
          }
      }
    }
  }
  throw new Error("No matching group found: "+mode);
}

test("each classic world has two distinct, named and accessible earned powers",()=>{
  for(const mode of ["harvest","sweets","rescue"]) {
    assert(WORLD_POWER_LABELS[mode].small.name.length>2);
    assert(WORLD_POWER_LABELS[mode].big.name.length>2);
    assert.notEqual(WORLD_POWER_LABELS[mode].small.name,WORLD_POWER_LABELS[mode].big.name);
  }
  assert.equal(WORLD_POWER_LABELS.bubbles,undefined);
});

test("three matching pieces earn small reward and four earn large",()=>{
  assert.deepEqual(rewardForGroup(2),{small:0,big:0});
  assert.deepEqual(rewardForGroup(3),{small:1,big:0});
  assert.deepEqual(rewardForGroup(4),{small:0,big:1});
  assert.deepEqual(rewardForGroup(5),{small:1,big:1});
  assert.deepEqual(rewardForGroup(7),{small:1,big:1});
});

test("real swaps and rescue groups earn boosters from the actual pop groups",()=>{
  for(const mode of ["harvest","sweets","rescue"]) {
    const match3=findMoveWithGroup(mode,n=>n===3);
    const before=JSON.stringify(match3.game);
    const result=awardWorldTurn(match3.game,match3.turn);
    assert(result.valid);
    assert(result.earned.small>=1);
    assert(result.game.powers.small>=1);
    assert.equal(result.game.moves,1);
    assert.equal(JSON.stringify(match3.game),before,"old board must not mutate");
    assert.deepEqual(result.trace.at(-1).board,result.game.board);
    const match4=findMoveWithGroup(mode,n=>n>=4);
    const reward=awardWorldTurn(match4.game,match4.turn);
    assert(reward.earned.big>=1);
    assert(reward.game.powers.big>=1);
  }
});

test("using one small or large booster animates real cleared cells without spending a move",()=>{
  for(const size of [EASY_SIZE,SIZE])for(const mode of ["harvest","sweets","rescue"]) {
    const game=makeLevel(mode,8,size);
    game.powers={small:1,big:1};
    const before=JSON.stringify(game);
    const used=redeemWorldPower(game,"small");
    assert(used.valid);
    assert(used.cleared>=3);
    assert.equal(used.game.powers.small,0);
    assert.equal(used.game.powers.big,1);
    assert.equal(used.game.moves,game.moves);
    assert(used.trace.some(frame=>frame.type==="pop"));
    assert(used.trace.some(frame=>frame.type==="fall"));
    assert.deepEqual(used.trace.at(-1).board,used.game.board);
    assert.equal(JSON.stringify(game),before);
    const big=redeemWorldPower(used.game,"big");
    assert(big.valid);
    assert(big.cleared>=size || mode==="rescue");
    assert.equal(big.game.powers.big,0);
    assert.equal(big.game.moves,game.moves);
    assert.equal(MODES[mode].mechanic==="tap" ? hasGroup(big.game.board,size) : hasSwap(big.game.board,size),true);
    assert.equal(redeemWorldPower(big.game,"big").valid,false);
    assert.equal(redeemWorldPower(big.game,"nonsense").valid,false);
  }
});

test("earned boosters are capped and carried into the next world level",()=>{
  assert.deepEqual(cleanPowers({small:999,big:-12}),{small:MAX_WORLD_POWERS,big:0});
  for(const mode of ["harvest","sweets","rescue"]) {
    const current=makeLevel(mode,10,EASY_SIZE);
    current.powers={small:3,big:2};
    const next=nextWorldLevel(mode,11,EASY_SIZE,current);
    assert.deepEqual(next.powers,{small:3,big:2});
    assert.deepEqual(next.startPowers,{small:3,big:2});
    assert.equal(next.level,11);
    assert.equal(next.moves,0);
    assert(!("lives" in next));
  }
});

test("best stars track efficient play and old browser saves keep original boards",()=>{
  const game=makeLevel("sweets",9,EASY_SIZE);
  game.won=true;game.moves=6;
  assert.equal(worldStars(game),3);
  game.moves=Math.ceil(game.target * .42);assert.equal(worldStars(game),2);
  game.moves=100;assert.equal(worldStars(game),1);
  const legacy=makeLevel("rescue",26,SIZE);legacy.score=777;legacy.cleared=13;
  const previous={mode:"rescue",games:{rescue:legacy},progress:{rescue:26}};
  const migrated=createSaveState(previous,false);
  assert.equal(migrated.games.rescue,legacy);
  assert.equal(migrated.games.rescue.score,777);
  assert.equal(migrated.progress.rescue,26);
  assert.deepEqual(migrated.worldStars.rescue,{});
  const withMedals=createSaveState({...migrated,worldStars:{...migrated.worldStars,rescue:{"3":2,"10":3}}},false);
  assert.equal(withMedals.worldStars.rescue[3],2);
  assert.equal(withMedals.worldStars.rescue[10],3);
});
