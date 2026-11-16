import test from "node:test";
import assert from "node:assert/strict";
import {
  MODES, SIZE, EASY_SIZE, adjacent, connectedGroup, findMatches,
  hasGroup, hasBouquet, connectedBouquet, pumpkinHarvest, hasPumpkinHarvest, moonlightHarvest, hasMoonlightHarvest, moonPhase, kitchenNextIngredient, kitchenCanCook, hasSwap, makeLevel, neighbors, playTurn
} from "../src/core.js";
import { createSaveState, validGame } from "../src/save.js";

test("6x6 Easy-to-See boards generate reproducibly and always have a move", () => {
  for (const mode of Object.keys(MODES)) {
    for (let level = 1; level <= 250; level++) {
      const game = makeLevel(mode, level, EASY_SIZE);
      assert.equal(game.board.length, 36);
      assert.equal(game.size, EASY_SIZE);
      assert.deepEqual(game, makeLevel(mode, level, EASY_SIZE));
      assert.equal(findMatches(game.board).size, 0);
      assert(MODES[mode].mechanic === "recipe" ? kitchenCanCook(game) :
        MODES[mode].mechanic === "moon" ? hasMoonlightHarvest(game.board) :
        MODES[mode].mechanic === "cross" ? hasPumpkinHarvest(game.board) :
        MODES[mode].mechanic === "bouquet" ? hasBouquet(game.board) :
        MODES[mode].mechanic === "tap" ? hasGroup(game.board) : hasSwap(game.board));
    }
  }
});

test("6x6 board edges never wrap horizontally or diagonally", () => {
  assert(adjacent(0, 1, EASY_SIZE));
  assert(adjacent(0, 6, EASY_SIZE));
  assert.equal(adjacent(5, 6, EASY_SIZE), false);
  assert.equal(adjacent(0, 7, EASY_SIZE), false);
  assert.equal(adjacent(35, 0, EASY_SIZE), false);
  assert.deepEqual(neighbors(0, EASY_SIZE).sort((a,b) => a-b), [1, 6]);
});

test("each accessible world completes levels through legal turns", () => {
  for (const mode of Object.keys(MODES)) {
    for (let level = 1; level <= 30; level++) {
      let game = makeLevel(mode, level, EASY_SIZE);
      let turns = 0;
      while (!game.won && turns < 300) {
        let turn = null;
        if (["tap","bouquet","cross","moon","recipe"].includes(MODES[mode].mechanic)) {
          const mechanic=MODES[mode].mechanic;
          const first=game.board.findIndex((item,i)=>
            mechanic==="recipe"?item===kitchenNextIngredient(game):
            mechanic==="moon"?moonlightHarvest(game.board,i,EASY_SIZE,moonPhase(game.moves).radius).length>=3:
            mechanic==="cross"?pumpkinHarvest(game.board,i,EASY_SIZE).length>=3:
            mechanic==="bouquet"?connectedBouquet(game.board,i,EASY_SIZE).length>=3:
              connectedGroup(game.board,i,EASY_SIZE).length>=2);
          assert(first>=0,"no matching group "+mode+"/"+level);
          turn=playTurn(game,first);
        } else {
          for (let i = 0; i < game.board.length && !turn; i++) {
            for (const j of [i + 1, i + EASY_SIZE]) {
              if (!adjacent(i, j, EASY_SIZE)) continue;
              const candidate = playTurn(game, i, j);
              if (candidate.valid) { turn = candidate; break; }
            }
          }
        }
        assert(turn?.valid, "no legal turn " + mode + "/" + level);
        assert.equal(turn.game.board.length, 36);
        if (MODES[mode].mechanic === "swap") assert.equal(findMatches(turn.game.board).size, 0);
        assert.equal(MODES[mode].mechanic === "recipe" ?
          kitchenCanCook(turn.game) :
          MODES[mode].mechanic === "moon" ? hasMoonlightHarvest(turn.game.board) :
          MODES[mode].mechanic === "cross" ? hasPumpkinHarvest(turn.game.board) :
          MODES[mode].mechanic === "bouquet" ? hasBouquet(turn.game.board) :
          MODES[mode].mechanic === "tap" ?
            hasGroup(turn.game.board) : hasSwap(turn.game.board), true);
        game = turn.game;
        turns++;
      }
      assert(game.won, "level not won " + mode + "/" + level);
      assert.equal(game.size, EASY_SIZE);
    }
  }
});

test("old 8x8 save objects load without a size field and retain progress", () => {
  const oldGame = makeLevel("harvest", 27, SIZE);
  delete oldGame.size; // existing v1 browser save
  oldGame.cleared = 14;
  oldGame.score = 250;
  const saved = createSaveState({
    mode: "harvest",
    games: { harvest: oldGame },
    progress: { harvest: 27 }
  }, true);
  assert.equal(saved.settings.easy, true);
  assert.equal(saved.settings.highContrast, true);
  assert.equal(saved.games.harvest, oldGame);
  assert.equal(saved.games.harvest.score, 250);
  assert.equal(saved.games.harvest.cleared, 14);
  assert.equal(saved.easyGames.harvest.size, 6);
  assert.equal(saved.easyGames.harvest.level, 27);
  assert.equal(saved.easyProgress.harvest, 27);
  assert.equal(saved.progress.harvest, 27);
  assert(validGame(saved.games.harvest, "harvest", SIZE));
  assert(validGame(saved.easyGames.harvest, "harvest", EASY_SIZE));
  const next = playTurn(oldGame, 0, 63);
  assert.equal(next.valid, false); // old board still handles illegal moves
});

test("saved comfort preference and 6x6 game are independent of 8x8 game", () => {
  const classic = makeLevel("sweets", 5, SIZE);
  const easy = makeLevel("sweets", 7, EASY_SIZE);
  easy.cleared = 11;
  const raw = {
    mode: "sweets",
    games: { sweets: classic }, progress: { sweets: 5 },
    easyGames: { sweets: easy }, easyProgress: { sweets: 7 },
    settings: { easy: false, highContrast: true }
  };
  const migrated = createSaveState(raw, true);
  assert.equal(migrated.settings.easy, false);
  assert.equal(migrated.settings.highContrast, true);
  assert.equal(migrated.games.sweets, classic);
  assert.equal(migrated.easyGames.sweets, easy);
  assert.equal(migrated.easyGames.sweets.cleared, 11);
  assert.equal(migrated.progress.sweets, 5);
  assert.equal(migrated.easyProgress.sweets, 7);
});

test("bad or mismatched saves regenerate safely without losing other worlds", () => {
  const validClassic = makeLevel("harvest", 9, SIZE);
  const corrupted = makeLevel("rescue", 3, EASY_SIZE);
  corrupted.board.pop();
  const saved = createSaveState({
    games: { harvest: validClassic },
    progress: { harvest: 9 },
    easyGames: { rescue: corrupted },
    easyProgress: { rescue: 3 }
  }, true);
  assert.equal(saved.games.harvest, validClassic);
  assert(validGame(saved.easyGames.rescue, "rescue", EASY_SIZE));
  assert.equal(saved.easyGames.rescue.level, 3);
});

test("invalid dimensions cannot be used to create a puzzle", () => {
  assert.throws(() => makeLevel("harvest", 1, 5), /Invalid board size/);
  assert.throws(() => makeLevel("harvest", 1, 9), /Invalid board size/);
});
