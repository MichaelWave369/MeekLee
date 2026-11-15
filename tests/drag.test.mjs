import test from "node:test";
import assert from "node:assert/strict";
import { dragPreview } from "../src/drag.js";

const gesture = (index, dx, dy, size = 6) =>
  dragPreview({ index, dx, dy, size, cellWidth: 58, cellHeight: 58 });

test("swiping up previews exactly the piece above, and waits until release distance", () => {
  assert.deepEqual(gesture(14, 0, -4), {
    active: false, target: null, ready: false, x: 0, y: 0
  });
  const short = gesture(14, 1, -12);
  assert.equal(short.active, true);
  assert.equal(short.target, 8);
  assert.equal(short.ready, false);
  const full = gesture(14, 2, -40);
  assert.equal(full.target, 8);
  assert.equal(full.ready, true);
  assert.equal(full.x, 0);
  assert.equal(full.y, -40);
});

test("horizontal and downward drags preview their true neighbor and clamp movement", () => {
  assert.equal(gesture(14, -40, 0).target, 13);
  assert.equal(gesture(14, 40, 0).target, 15);
  assert.equal(gesture(14, 0, 40).target, 20);
  assert.equal(gesture(14, 0, 400).y, 58);
  assert.equal(gesture(14, 0, -400).y, -58);
});

test("row edges, upper and lower edges do not wrap or spend a move", () => {
  for (const [i, dx, dy] of [[0, -70, 0],[0, 0, -70],[5, 70, 0],[30, 0, 70],[35, 0, 70]]) {
    const p = gesture(i, dx, dy);
    assert.equal(p.target, null);
    assert.equal(p.ready, false);
    assert(Math.abs(p.x) <= 12 && Math.abs(p.y) <= 12);
  }
});

test("ambiguous diagonals cannot trigger accidental swaps", () => {
  const diag = gesture(14, 40, 40);
  assert.equal(diag.active, true);
  assert.equal(diag.target, null);
  assert.equal(diag.ready, false);
});

test("dragging works with classic boards too", () => {
  assert.equal(gesture(9, 0, -30, 8).target, 1);
  assert.equal(gesture(7, 45, 0, 8).target, null);
  assert.equal(gesture(56, 0, 40, 8).target, null);
});

test("invalid indices and nonfinite gestures are ignored safely", () => {
  for(const a of [
    {index:-1,dx:45,dy:0,size:6,cellWidth:50,cellHeight:50},
    {index:64,dx:45,dy:0,size:8,cellWidth:50,cellHeight:50},
    {index:2,dx:NaN,dy:0,size:6,cellWidth:50,cellHeight:50},
    {index:2,dx:0,dy:40,size:6,cellWidth:0,cellHeight:50}
  ]) assert.deepEqual(dragPreview(a), {
    active:false,target:null,ready:false,x:0,y:0
  });
});
