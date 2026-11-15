import test from "node:test";
import assert from "node:assert/strict";
import { MODES, SIZE, adjacent, connectedGroup, findMatches, hasGroup, hasSwap, makeLevel, playTurn, seedFor } from "../src/core.js";

test("every generated board has 64 legal pieces and no pre-existing matches", () => {
  for (const mode of Object.keys(MODES)) {
    for (let level = 1; level <= 200; level++) {
      const game = makeLevel(mode, level);
      assert.equal(game.board.length, SIZE * SIZE);
      assert(game.board.every(p => Number.isInteger(p) && p >= 0 && p < 6));
      assert.equal(findMatches(game.board).size, 0);
      assert.equal(MODES[mode].mechanic === "tap" ? hasGroup(game.board) : hasSwap(game.board), true);
      assert(game.target > 0);
    }
  }
});

test("level seeds and first boards are reproducible", () => {
  for (const mode of Object.keys(MODES)) {
    assert.deepEqual(makeLevel(mode, 369), makeLevel(mode, 369));
    assert.equal(seedFor(mode, 369), seedFor(mode, 369));
  }
});

test("diagonal and wrapped swaps are not adjacent", () => {
  assert.equal(adjacent(7, 8), false);
  assert.equal(adjacent(0, 9), false);
  assert.equal(adjacent(0, 1), true);
  assert.equal(adjacent(0, 8), true);
});

test("invalid swap does not spend a move or mutate the board", () => {
  const game = makeLevel("harvest", 1);
  const before = JSON.stringify(game);
  const result = playTurn(game, 0, 63);
  assert.equal(result.valid, false);
  assert.equal(JSON.stringify(game), before);
});

test("all match worlds accept a matching swap and remain playable", () => {
  for (const mode of ["harvest", "sweets", "bubbles"]) {
    const original = makeLevel(mode, 23);
    let found = false;
    for (let i = 0; i < 64 && !found; i++) {
      for (const j of [i + 1, i + SIZE]) {
        if (!adjacent(i, j)) continue;
        const next = playTurn(original, i, j);
        if (!next.valid) continue;
        assert(next.cleared >= 3);
        assert.equal(next.game.moves, 1);
        assert.equal(next.game.cleared, next.cleared);
        assert.equal(findMatches(next.game.board).size, 0);
        assert.equal(hasSwap(next.game.board), true);
        assert.equal(original.moves, 0);
        found = true;
        break;
      }
    }
    assert(found, "expected at least one valid swap in " + mode);
  }
});

test("critter groups pop and remain playable", () => {
  const game = makeLevel("rescue", 8);
  const index = game.board.findIndex((_, i) => connectedGroup(game.board, i).length >= 2);
  const result = playTurn(game, index);
  assert(result.valid);
  assert(result.cleared >= 2);
  assert(hasGroup(result.game.board));
});

test("endless integer levels and infinite turns require no payments", () => {
  for (const mode of Object.keys(MODES)) {
    const game = makeLevel(mode, 1_000_000);
    assert.equal(game.level, 1_000_000);
    assert(!("lives" in game));
    assert(!("purchases" in game));
    assert(!("energy" in game));
  }
});

test("win condition is cumulative and no time or turn limit exists", () => {
  const game = makeLevel("rescue", 4);
  game.cleared = game.target - 1;
  const index = game.board.findIndex((_, i) => connectedGroup(game.board, i).length >= 2);
  const next = playTurn(game, index);
  assert(next.valid);
  assert.equal(next.game.won, true);
  assert.equal(next.game.cleared >= next.game.target, true);
  assert.equal(next.game.moves, 1);
  assert.equal(playTurn(next.game, index).valid, false);
});


test("a player can complete generated levels without a purchase or a fixed move cap", () => {
  for (const mode of Object.keys(MODES)) {
    for (let level = 1; level <= 25; level++) {
      let game = makeLevel(mode, level), turns = 0;
      while (!game.won && turns < 300) {
        let turn = null;
        if (MODES[mode].mechanic === "tap") {
          const i = game.board.findIndex((_, index) => connectedGroup(game.board, index).length >= 2);
          assert(i >= 0, "no groups in " + mode + "/" + level);
          turn = playTurn(game, i);
        } else {
          for (let i = 0; i < 64 && !turn; i++) {
            for (const j of [i + 1, i + SIZE]) {
              if (!adjacent(i, j)) continue;
              const candidate = playTurn(game, i, j);
              if (candidate.valid) { turn = candidate; break; }
            }
          }
        }
        assert(turn?.valid, "no playable action in " + mode + "/" + level);
        game = turn.game;
        turns++;
      }
      assert(game.won, "level should complete: " + mode + "/" + level);
      assert(game.moves > 0 && game.moves <= 300);
    }
  }
});
