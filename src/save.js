import { EASY_SIZE, MODES, SIZE, boardSize, makeLevel } from "./core.js";

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
      !(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
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
  return {
    mode: Object.hasOwn(MODES, previous.mode) ? previous.mode : "harvest",
    games, progress, easyGames, easyProgress, settings
  };
}
