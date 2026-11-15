import test from "node:test";
import assert from "node:assert/strict";
import { MODES, EASY_SIZE, SIZE, adjacent, connectedGroup, findMatches, makeLevel, playTurn } from "../src/core.js";

function findMove(game) {
  const size = game.size ?? SIZE;
  if (MODES[game.mode].mechanic === "tap") {
    const i = game.board.findIndex((_, j) => connectedGroup(game.board, j).length >= 2);
    return i >= 0 ? playTurn(game, i) : null;
  }
  for (let i = 0; i < game.board.length; i++) {
    for (const j of [i + 1, i + size]) {
      if (!adjacent(i, j, size)) continue;
      const turn = playTurn(game, i, j);
      if (turn.valid) return turn;
    }
  }
  return null;
}

test("every successful move emits pop and gravity frames matching the final board", () => {
  for (const size of [SIZE, EASY_SIZE]) {
    for (const mode of Object.keys(MODES)) {
      for (let level = 1; level <= 75; level++) {
        const original = makeLevel(mode, level, size);
        const before = JSON.stringify(original);
        const turn = findMove(original);
        assert(turn?.valid, "No playable turn for " + mode + "/" + size + "/" + level);
        assert.equal(JSON.stringify(original), before, "trace must not mutate saved game");
        assert(turn.trace.length >= 2);
        assert(turn.trace.some(t => t.type === "pop"));
        assert(turn.trace.some(t => t.type === "fall"));
        assert.deepEqual(turn.trace.at(-1).board, turn.game.board);
        for (const frame of turn.trace) {
          assert.equal(frame.board.length, size * size);
          assert(frame.board.every(p => Number.isInteger(p) && p >= 0 && p < 6));
          if (frame.type === "pop") {
            assert(frame.matched.length >= 2);
            assert(frame.matched.every(i => Number.isInteger(i) && i >= 0 && i < size * size));
            assert(frame.gained > 0);
          }
          if (frame.type === "fall") {
            assert.equal(frame.movements.length, size * size);
            const targets = frame.movements.map(move => move.to);
            assert.equal(new Set(targets).size, size * size);
            for (const movement of frame.movements) {
              assert.equal(((movement.from % size) + size) % size, movement.to % size);
              assert.equal(typeof movement.fresh, "boolean");
              if (!movement.fresh) assert(movement.from >= 0 && movement.from < size * size);
              else assert(movement.from < 0 || movement.from >= size * size);
            }
          }
        }
        if (mode !== "rescue") {
          assert.equal(turn.trace[0].type, "swap");
          assert.equal(findMatches(turn.game.board).size, 0);
        }
      }
    }
  }
});

test("natural cascades increase combo numbers", () => {
  let found = null;
  for (let level = 1; level < 300 && !found; level++) {
    const game = makeLevel("sweets", level, EASY_SIZE);
    const turn = findMove(game);
    if (turn?.valid && turn.cascades > 1) found = turn;
  }
  assert(found, "At least one natural cascade should occur");
  const pops = found.trace.filter(frame => frame.type === "pop");
  assert.equal(pops.length, found.cascades);
  assert.deepEqual(pops.map(frame => frame.combo),
    Array.from({ length: found.cascades }, (_, i) => i + 1));
  assert.equal(found.game.cleared, found.cleared);
});
