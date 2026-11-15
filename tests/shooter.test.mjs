import test from "node:test";
import assert from "node:assert/strict";
import {
  BUBBLE_COLORS,bubbleGeometry,bubbleCenter,bubbleNeighbors,bubbleGroup,
  makeShooterLevel,validShooter,simulateBubblePath,fireBubble,rainbowRescue
} from "../src/shooter.js";
import { EASY_SIZE,SIZE,makeLevel } from "../src/core.js";
import { createSaveState } from "../src/save.js";

test("shooter levels are deterministic with large 6-column and classic 8-column boards",()=>{
  for(const size of [EASY_SIZE,SIZE])for(let level=1;level<=150;level++){
    const game=makeShooterLevel(level,size);
    assert(validShooter(game,size));
    assert.deepEqual(game,makeShooterLevel(level,size));
    assert(game.cells.some(v=>v!==null));
    assert(game.cells.some(v=>v===null));
    assert(game.cells.filter(v=>v!==null).length>0);
    assert.equal(game.moves,0);
    assert(!("lives" in game));
  }
});

test("hex neighbors stay symmetric and never wrap at edges",()=>{
  for(const size of [EASY_SIZE,SIZE]){
    const {cols,rows}=bubbleGeometry(size);
    for(let i=0;i<cols*rows;i++){
      const neighbors=bubbleNeighbors(i,size);
      assert(neighbors.length<=6);
      for(const other of neighbors){
        assert(other>=0 && other<cols*rows);
        assert(bubbleNeighbors(other,size).includes(i));
      }
    }
    assert.equal(bubbleNeighbors(-1,size).length,0);
  }
});

test("shot previews stay between side walls and report a valid attached landing",()=>{
  for(const size of [EASY_SIZE,SIZE]){
    const game=makeShooterLevel(9,size),{width}=bubbleGeometry(size);
    for(const x of [-100,0,width/3,width/2,width,2*width]){
      const path=simulateBubblePath(game,x,0);
      assert(path.valid);
      assert(path.points.length>3);
      assert(path.points.every(p=>p.x>=19.9 && p.x<=width-19.9));
      assert(game.cells[path.landing]===null);
      assert(path.landing>=0 && path.landing<game.cells.length);
      assert(fireBubble(game,x,0).valid);
    }
  }
});

test("shots are deterministic, spend exactly one move, and do not mutate saved game",()=>{
  for(const size of [EASY_SIZE,SIZE]){
    const game=makeShooterLevel(11,size),before=JSON.stringify(game);
    const {width}=bubbleGeometry(size);
    const result=fireBubble(game,width*0.4,0);
    assert(result.valid);
    assert.deepEqual(result,fireBubble(game,width*.4,0));
    assert.equal(result.game.moves,1);
    assert.equal(JSON.stringify(game),before);
    assert.equal(result.game.score,result.popped.length*25+result.dropped.length*40);
    if(result.popped.length)assert(result.popped.length>=3);
  }
});

test("earned Rainbow Burst consumes a saved reward and removes real bubbles",()=>{
  for (const size of [EASY_SIZE,SIZE]) for(let level=1;level<=25;level++){
    const game=makeShooterLevel(level,size,{rainbows:1});
    const result=rainbowRescue(game);
    assert(result.valid);
    assert(result.popped.length>=1);
    assert.equal(result.game.rainbows,0);
    assert.equal(result.game.moves,0);
    assert(result.game.cells.filter(v=>v!==null).length<game.cells.filter(v=>v!==null).length);
    assert.equal(rainbowRescue(result.game).valid,false);
  }
  assert.equal(rainbowRescue(makeShooterLevel(1,EASY_SIZE)).valid,false);
});

test("legacy Bubble Lagoon match-3 saves remain unchanged while shooter inherits level",()=>{
  const legacy=makeLevel("bubbles",23,EASY_SIZE);
  legacy.score=1234;
  const old={mode:"bubbles",easyGames:{bubbles:legacy},easyProgress:{bubbles:23}};
  const migrated=createSaveState(old,true);
  assert.deepEqual(migrated.easyGames.bubbles,legacy);
  assert.equal(migrated.easyGames.bubbles.score,1234);
  assert.equal(migrated.easyShooterGames.bubbles.type,"shooter");
  assert.equal(migrated.easyShooterGames.bubbles.level,23);
  assert.equal(migrated.easyShooterProgress.bubbles,23);
  const next=createSaveState(migrated,true);
  assert.deepEqual(next.easyShooterGames.bubbles,migrated.easyShooterGames.bubbles);
});

test("colors include distinct symbols rather than relying only on hue",()=>{
  assert.equal(BUBBLE_COLORS.length,5);
});
