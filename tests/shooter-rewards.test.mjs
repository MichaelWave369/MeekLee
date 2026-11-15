import test from "node:test";
import assert from "node:assert/strict";
import {
  bubbleGeometry, makeShooterLevel, fireBubble, normalizeShooter,
  retryShooter, nextShooterLevel, shotBudgetForLevel, shooterStars,
  usePearl, rainbowRescue, validShooter
} from "../src/shooter.js";
import { createSaveState } from "../src/save.js";
import { EASY_SIZE, SIZE } from "../src/core.js";

function findMatch(predicate) {
  for (const size of [EASY_SIZE, SIZE]) {
    const {width}=bubbleGeometry(size);
    for (let level=1;level<=30;level++) {
      const game=makeShooterLevel(level,size);
      for(let x=0;x<=width;x+=13) {
        const result=fireBubble(game,x,0);
        if(result.valid && predicate(result.popped.length))
          return {game,result,size,level};
      }
    }
  }
  throw new Error("Could not find a match that satisfies the reward condition");
}

test("three matching bubbles earn one Pearl but not a Rainbow",()=>{
  const {game,result}=findMatch(n=>n===3);
  assert.equal(result.earned.pearl,1);
  assert.equal(result.earned.rainbow,0);
  assert.equal(result.game.pearls,1);
  assert.equal(result.game.rainbows,0);
  assert.equal(result.game.moves,1);
  assert.equal(result.game.shotsLeft,game.maxShots-1);
  assert.equal(usePearl(game).valid,false);
  const redeemed=usePearl(result.game);
  assert(redeemed.valid);
  assert.equal(redeemed.game.pearls,0);
  assert.equal(redeemed.game.shotsLeft,result.game.shotsLeft+3);
  assert.equal(redeemed.game.moves,1);
  assert.equal(redeemed.game.score,result.game.score);
});

test("four or more matched bubbles earn a Rainbow Burst",()=>{
  const {game,result}=findMatch(n=>n>=4);
  assert.equal(result.earned.rainbow,1);
  assert.equal(result.game.rainbows,1);
  assert.equal(result.earned.pearl,result.popped.length>=5?1:0);
  assert.equal(rainbowRescue(game).valid,false);
  const redeemed=rainbowRescue(result.game);
  assert(redeemed.valid);
  assert.equal(redeemed.game.rainbows,0);
  assert.equal(redeemed.game.moves,result.game.moves);
  assert(redeemed.popped.length>0);
  assert(redeemed.game.cells.filter(v=>v!==null).length<result.game.cells.filter(v=>v!==null).length);
});

test("shot budgets are finite, deterministic and forgiving on free retries",()=>{
  for(const size of [EASY_SIZE,SIZE]){
    for(let level=1;level<=200;level++){
      const fresh=makeShooterLevel(level,size);
      assert(fresh.maxShots>0);
      assert.equal(fresh.shotsLeft,fresh.maxShots);
      assert.equal(fresh.maxShots,shotBudgetForLevel(level,size));
      assert.equal(shotBudgetForLevel(level,size,1)-fresh.maxShots,3);
      assert(shotBudgetForLevel(level,size,20)-fresh.maxShots<=15);
    }
  }
});

test("the last unsuccessful shot stops play and offers a cost-free restart",()=>{
  const game=makeShooterLevel(4,EASY_SIZE);
  game.cells.fill(null);
  game.cells[0]=0;game.currentColor=1;game.nextColor=1;
  game.maxShots=1;game.shotsLeft=1;
  const {origin}=bubbleGeometry(EASY_SIZE);
  const last=fireBubble(game,origin.x,0);
  assert(last.valid);
  assert.equal(last.popped.length,0);
  assert.equal(last.game.shotsLeft,0);
  assert.equal(last.game.failed,true);
  assert.equal(fireBubble(last.game,origin.x,0).valid,false);
  assert.equal(usePearl(last.game).valid,false);
  assert.equal(rainbowRescue(last.game).valid,false);
  const retry=retryShooter(last.game);
  assert(retry.valid);
  assert.equal(retry.game.level,4);
  assert.equal(retry.game.retries,1);
  assert.equal(retry.game.moves,0);
  assert.equal(retry.game.score,0);
  assert.equal(retry.game.failed,false);
  assert.equal(retry.game.shotsLeft,shotBudgetForLevel(4,EASY_SIZE,1));
  assert.equal(retryShooter(retry.game).valid,false);
});

test("on the last ball an earned Pearl or Rainbow stays redeemable before failure",()=>{
  const pearl=makeShooterLevel(2,EASY_SIZE,{pearls:1});
  pearl.shotsLeft=0;pearl.moves=pearl.maxShots;
  const normalized=normalizeShooter(pearl);
  assert(!normalized.failed);
  assert.equal(usePearl(normalized).game.shotsLeft,3);
  const rainbow=makeShooterLevel(2,EASY_SIZE,{rainbows:1});
  rainbow.shotsLeft=0;rainbow.moves=rainbow.maxShots;
  const boost=rainbowRescue(rainbow);
  assert(boost.valid);
  assert.equal(boost.game.rainbows,0);
});

test("stars reward efficient wins and survive chapter progression",()=>{
  const level=makeShooterLevel(10,EASY_SIZE,{pearls:3,rainbows:2});
  level.won=true;
  assert.equal(shooterStars({...level,shotsLeft:level.maxShots}),3);
  assert.equal(shooterStars({...level,shotsLeft:Math.ceil(level.maxShots*.3)}),2);
  assert.equal(shooterStars({...level,shotsLeft:0}),1);
  const next=nextShooterLevel(11,EASY_SIZE,level);
  assert.equal(next.level,11);
  assert.equal(next.pearls,5);
  assert.equal(next.rainbows,2);
  assert.equal(next.startPearls,5);
  assert.equal(next.startRainbows,2);
  assert.equal(next.moves,0);
  assert.equal(next.shotsLeft,next.maxShots);
  const replay=nextShooterLevel(5,EASY_SIZE,level);
  assert.equal(replay.pearls,3); // no chapter gift on replay
});

test("older phone shooter saves migrate without losing scores, shots or earned medal data",()=>{
  const original=makeShooterLevel(7,EASY_SIZE);
  original.score=950;original.moves=5;
  for(const key of ["maxShots","shotsLeft","retries","failed","pearls","rainbows","startPearls","startRainbows","bestMatch","stars"])
    delete original[key];
  assert(validShooter(original,EASY_SIZE));
  const migrated=createSaveState({
    mode:"bubbles",easyShooterGames:{bubbles:original},
    easyShooterProgress:{bubbles:7},
    easyShooterStars:{bubbles:{"2":3,"6":2}}
  },true);
  const current=migrated.easyShooterGames.bubbles;
  assert.equal(current.score,950);
  assert.equal(current.moves,5);
  assert.deepEqual(current.cells,original.cells);
  assert.equal(current.shotsLeft,current.maxShots-5);
  assert.equal(migrated.easyShooterProgress.bubbles,7);
  assert.equal(migrated.easyShooterStars.bubbles[2],3);
  assert.equal(migrated.easyShooterStars.bubbles[6],2);
});
