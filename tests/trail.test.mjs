import test from "node:test";
import assert from "node:assert/strict";
import { PAGE_SIZE, pageForLevel, levelStatus, maxPage, levelsForPage } from "../src/trail.js";

test("every numbered page contains exactly ten original levels", () => {
  assert.equal(PAGE_SIZE, 10);
  for (const page of [0,1,2,9,99,999]) {
    const levels=levelsForPage(page);
    assert.equal(levels.length,10);
    assert.equal(levels[0],page*10+1);
    assert.equal(levels.at(-1),page*10+10);
    assert.equal(pageForLevel(levels[0]),page);
    assert.equal(pageForLevel(levels.at(-1)),page);
  }
  assert.deepEqual(levelsForPage(-1),[]);
});

test("trail markers distinguish completed, current and locked levels", () => {
  for(const unlocked of [1,2,10,11,20,101,10_000]){
    assert.equal(levelStatus(unlocked, unlocked),"current");
    assert.equal(levelStatus(unlocked+1,unlocked),"locked");
    if(unlocked>1)assert.equal(levelStatus(unlocked-1,unlocked),"completed");
    assert.equal(maxPage(unlocked),Math.floor((unlocked-1)/10));
  }
});
test("ten-level boundaries open page two only after completing level ten", () => {
  assert.equal(maxPage(10),0);
  assert.equal(maxPage(11),1);
  assert.equal(levelStatus(10,11),"completed");
  assert.equal(levelStatus(11,11),"current");
  assert.equal(levelStatus(12,11),"locked");
});
