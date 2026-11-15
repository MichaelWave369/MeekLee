import { EASY_SIZE, MODES, SIZE, boardSize, makeLevel } from "./core.js";
import { motionSpeed } from "./motion.js";
import { makeShooterLevel, validShooter, normalizeShooter } from "./shooter.js";
import { normalizeCollection } from "./collection.js";
import {validSolitaire} from "./solitaire.js";
import {validRook} from "./rook.js";
import {normalizeRookStats} from "./rook-night.js";
import {validColorParade} from "./color-parade.js";
import {validWar} from "./war.js";
import {validStack} from "./stack-race.js";
import {validJigsaw} from "./jigsaw.js";
import {validCheckers} from "./checkers.js";
import {validBackgammon} from "./backgammon.js";
import {validChess} from "./chess.js";
import {validFiveDice} from "./five-dice.js";
import {validPyramid} from "./pyramid.js";
import {validTriPeaks} from "./tripeaks.js";
import {validSpider} from "./spider.js";

export const SAVE_KEY = "meeklee-adventures-save-v1";

export function validGame(game, mode, size) {
  return Boolean(game && game.mode === mode &&
    Number.isSafeInteger(game.level) && game.level >= 1 &&
    Number.isSafeInteger(game.seed) && Number.isInteger(game.rngState) &&
    Array.isArray(game.board) && boardSize(game.board) === size &&
    (game.size === undefined || game.size === size) &&
    game.board.every(p => Number.isInteger(p) && p >= 0 && p < 6) &&
    Number.isFinite(game.target) && game.target > 0 &&
    Number.isFinite(game.cleared) && game.cleared >= 0 &&
    Number.isFinite(game.score) && Number.isFinite(game.moves) &&
    typeof game.won === "boolean");
}

function positiveLevel(value, fallback = 1) {
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

/**
 * Upgrade v1 saves without deleting or overwriting their classic 8x8 boards.
 * Large-tile 6x6 boards have independent saves and start at the existing level
 * number if Mom is switching from a previously played classic game.
 */
export function createSaveState(raw = null, preferEasy = false) {
  const previous = raw && typeof raw === "object" ? raw : {};
  const settings = {
    easy: typeof previous.settings?.easy === "boolean" ?
      previous.settings.easy : Boolean(preferEasy),
    highContrast: typeof previous.settings?.highContrast === "boolean" ?
      previous.settings.highContrast : Boolean(preferEasy),
    // Respect the user's reduced-motion preference on first visit.
    motion: typeof previous.settings?.motion === "boolean" ?
      previous.settings.motion :
      !(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
    // New and returning phone players get clearly paced motion without losing saves.
    motionSpeed: previous.settings?.motionSpeed === "classic" || previous.settings?.motionSpeed === "relaxed" ?
      motionSpeed(previous.settings.motionSpeed) : (preferEasy ? "relaxed" : "classic")
  };
  const progress = {}, easyProgress = {}, games = {}, easyGames = {};
  for (const mode of Object.keys(MODES)) {
    progress[mode] = positiveLevel(previous.progress?.[mode]);
    easyProgress[mode] = positiveLevel(previous.easyProgress?.[mode], progress[mode]);
    games[mode] = validGame(previous.games?.[mode], mode, SIZE) ?
      previous.games[mode] : makeLevel(mode, progress[mode], SIZE);
    easyGames[mode] = validGame(previous.easyGames?.[mode], mode, EASY_SIZE) ?
      previous.easyGames[mode] : makeLevel(mode, easyProgress[mode], EASY_SIZE);
  }
  // Keep the old Bubble Lagoon swap boards intact. The new bubble shooter has
  // separate saves, and inherits each board size's unlocked level when first used.
  const shooterProgress = { bubbles: positiveLevel(previous.shooterProgress?.bubbles, progress.bubbles) };
  const easyShooterProgress = { bubbles: positiveLevel(previous.easyShooterProgress?.bubbles, easyProgress.bubbles) };
  const shooterGames = {
    bubbles: validShooter(previous.shooterGames?.bubbles, SIZE) ?
      normalizeShooter(previous.shooterGames.bubbles) : makeShooterLevel(shooterProgress.bubbles, SIZE)
  };
  const easyShooterGames = {
    bubbles: validShooter(previous.easyShooterGames?.bubbles, EASY_SIZE) ?
      normalizeShooter(previous.easyShooterGames.bubbles) : makeShooterLevel(easyShooterProgress.bubbles, EASY_SIZE)
  };
  return {
    mode: Object.hasOwn(MODES, previous.mode) ? previous.mode : "harvest",
    games, progress, easyGames, easyProgress, settings,
    shooterGames, easyShooterGames, shooterProgress, easyShooterProgress,
    shooterStars: { bubbles: previous.shooterStars?.bubbles && typeof previous.shooterStars.bubbles === "object" ?
      { ...previous.shooterStars.bubbles } : {} },
    easyShooterStars: { bubbles: previous.easyShooterStars?.bubbles && typeof previous.easyShooterStars.bubbles === "object" ?
      { ...previous.easyShooterStars.bubbles } : {} },
    // Add independent medal maps without touching legacy progress or the boards.
    worldStars: Object.fromEntries(Object.keys(MODES).map(mode =>
      [mode, previous.worldStars?.[mode] && typeof previous.worldStars[mode] === "object" ?
        { ...previous.worldStars[mode] } : {}])),
    easyWorldStars: Object.fromEntries(Object.keys(MODES).map(mode =>
      [mode, previous.easyWorldStars?.[mode] && typeof previous.easyWorldStars[mode] === "object" ?
        { ...previous.easyWorldStars[mode] } : {}])),
    // Global garden collectibles: shared across all worlds and board sizes.
    // The existing local save and original game states are untouched.
    collection: normalizeCollection(previous.collection),
    // Card Corner uses independent persistent games; older puzzle saves are unchanged.
    cards: {
      solitaire: validSolitaire(previous.cards?.solitaire) ? previous.cards.solitaire : null,
      rook: validRook(previous.cards?.rook) ? previous.cards.rook : null,
      rookStats: normalizeRookStats(previous.cards?.rookStats),
      parade: validColorParade(previous.cards?.parade) ? previous.cards.parade : null,
      war: validWar(previous.cards?.war) ? previous.cards.war : null,
      stack: validStack(previous.cards?.stack) ? previous.cards.stack : null,
      jigsaw: validJigsaw(previous.cards?.jigsaw) ? previous.cards.jigsaw : null,
      checkers: validCheckers(previous.cards?.checkers) ? previous.cards.checkers : null,
      backgammon: validBackgammon(previous.cards?.backgammon) ? previous.cards.backgammon : null,
      chess: validChess(previous.cards?.chess) ? previous.cards.chess : null,
      dice: validFiveDice(previous.cards?.dice) ? previous.cards.dice : null,
      pyramid: validPyramid(previous.cards?.pyramid) ? previous.cards.pyramid : null,
      tripeaks: validTriPeaks(previous.cards?.tripeaks) ? previous.cards.tripeaks : null,
      spider: validSpider(previous.cards?.spider) ? previous.cards.spider : null
    }
  };
}
