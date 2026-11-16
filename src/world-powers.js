// Earned, free powers for MeekLee's three classic puzzle worlds.
// All actions are deterministic, save-safe, and usable with one large tap.
import {
  MODES, SIZE, boardSize, connectedGroup, neighbors, findMatches, hasSwap,
  hasGroup, collapse, makeBoard, makeLevel, rngFrom
} from "./core.js";

export const MAX_WORLD_POWERS = 9;
export const WORLD_POWER_LABELS = Object.freeze({
  harvest: {
    small: { icon: "🌱", name: "Seed Sprout", action: "Collect 3 crops" },
    big: { icon: "🧺", name: "Harvest Basket", action: "Clear a whole column" }
  },
  sweets: {
    small: { icon: "✨", name: "Sweet Spark", action: "Collect 3 sweets" },
    big: { icon: "🍭", name: "Candy Stripe", action: "Clear a whole row" }
  },
  rescue: {
    small: { icon: "🐾", name: "Helping Paw", action: "Rescue 3 critters" },
    big: { icon: "🦊", name: "Forest Friend", action: "Rescue all of one critter" }
  }
});

export function cleanPowers(powers) {
  const safe = n => Number.isInteger(n) ? Math.min(MAX_WORLD_POWERS, Math.max(0,n)) : 0;
  return { small: safe(powers?.small), big: safe(powers?.big) };
}

export function nextWorldLevel(mode, level, size, previous = null) {
  const current = makeLevel(mode, level, size);
  if (!WORLD_POWER_LABELS[mode]) return current;
  const powers = cleanPowers(previous?.powers);
  return { ...current, powers, startPowers: { ...powers } };
}

export function worldStars(game) {
  if (!game?.won) return 0;
  // A careful three-step recipe has no wrong-turn penalty; award cozy stars
  // for completing dishes rather than comparing single taps to match-3 runs.
  if(game.mode==="kitchen")return 3;
  const moves = Math.max(0,game.moves);
  const target = Math.max(1,game.target);
  if (moves <= Math.ceil(target / 3)) return 3;
  if (moves <= Math.ceil(target / 2)) return 2;
  return 1;
}

function largestMatchedGroup(frame, size) {
  const matched = new Set(frame.matched || []);
  let best = 0;
  for (const i of matched) {
    if (!Number.isInteger(i) || i < 0 || i >= frame.board.length) continue;
    const group = connectedGroup(frame.board, i, size).filter(cell => matched.has(cell));
    best = Math.max(best, group.length);
  }
  return best;
}

export function rewardForGroup(count) {
  return {
    small: count === 3 || count >= 5 ? 1 : 0,
    big: count >= 4 ? 1 : 0
  };
}

/** Award only for ACTUAL connected match groups, never just a sum of cascades.
 * The frames remain unmodified except for a small visual reward annotation.
 */
export function awardWorldTurn(game, result) {
  if (!result?.valid || !WORLD_POWER_LABELS[game?.mode]) return result;
  const size = boardSize(game.board);
  const before = cleanPowers(game.powers);
  const earned = { small: 0, big: 0 };
  const trace = result.trace.map(frame => {
    if (frame.type !== "pop") return frame;
    const groupSize = largestMatchedGroup(frame, size);
    const reward = rewardForGroup(groupSize);
    earned.small += reward.small;
    earned.big += reward.big;
    return { ...frame, groupSize, reward };
  });
  return {
    ...result,
    earned,
    trace,
    game: {
      ...result.game,
      powers: {
        small: Math.min(MAX_WORLD_POWERS,before.small+earned.small),
        big: Math.min(MAX_WORLD_POWERS,before.big+earned.big)
      },
      startPowers: cleanPowers(game.startPowers)
    }
  };
}

function favoriteColor(board) {
  const counts = new Array(6).fill(0);
  for (const item of board) if (item !== null) counts[item]++;
  return counts.indexOf(Math.max(...counts));
}

function choosePowerCells(board, size, mode, kind) {
  if (kind === "small") {
    const color = favoriteColor(board);
    const choices = [];
    for (let i = 0; i < board.length && choices.length < 3; i++)
      if (board[i] === color) choices.push(i);
    return choices;
  }
  if (mode === "rescue") {
    const color = favoriteColor(board);
    return board.map((item,i) => item === color ? i : -1).filter(i => i >= 0);
  }
  const color = favoriteColor(board);
  const counts = new Array(size).fill(0);
  for (let i = 0; i < board.length; i++) {
    if (board[i] === color) counts[mode === "harvest" ? i % size : Math.floor(i / size)]++;
  }
  const lane = counts.indexOf(Math.max(...counts));
  return board.map((_,i) => mode === "harvest" ? (i % size === lane ? i : -1) :
    (Math.floor(i / size) === lane ? i : -1)).filter(i => i >= 0);
}

/** Redeeming is a free, deliberate action, not an additional turn.
 * It reuses the same pop/fall frames as normal matches and remains playable.
 */
export function redeemWorldPower(game, kind) {
  const rules = MODES[game?.mode];
  const size = boardSize(game?.board);
  if (!rules || !WORLD_POWER_LABELS[game.mode] || game.won || !size ||
    (kind !== "small" && kind !== "big") || cleanPowers(game.powers)[kind] < 1)
    return { valid: false, game };
  const powers = cleanPowers(game.powers);
  const board = [...game.board], rng = rngFrom(game.seed,game.rngState);
  const indices = choosePowerCells(board,size,game.mode,kind);
  if (!indices.length) return { valid: false, game };
  let cleared = 0, bonus = 0, cascades = 0;
  const trace = [];
  const pop = (cells, combo) => {
    const gained = cells.length * (15 + combo * 5);
    trace.push({
      type: "pop", board: [...board], matched: [...cells], combo,
      gained, powerUsed: combo === 1 ? kind : null
    });
    for (const i of cells) board[i] = null;
    cleared += cells.length; bonus += gained;
    const movements = [];
    collapse(board,rng,rules.gravity,size,movements);
    trace.push({ type: "fall", board: [...board], movements, combo });
  };
  pop(indices,1);
  if (rules.mechanic === "swap") {
    let matches = findMatches(board,size);
    while(matches.size && cascades < 40) {
      cascades++;
      pop([...matches],cascades+1);
      matches = findMatches(board,size);
    }
    if (matches.size) {
      const fresh = makeBoard(rng,rules.mechanic,size);
      board.splice(0,board.length,...fresh);
      trace.push({type:"shuffle",board:[...board]});
    }
  }
  if (rules.mechanic === "tap" ? !hasGroup(board,size) : !hasSwap(board,size)) {
    const fresh = makeBoard(rng,rules.mechanic,size);
    board.splice(0,board.length,...fresh);
    trace.push({type:"shuffle",board:[...board]});
  }
  powers[kind]--;
  const total = game.cleared+cleared;
  return {
    valid: true, cleared, cascades, trace, powerUsed: kind,
    game: {
      ...game, board, rngState:rng.getState(), powers,
      cleared:total, score:game.score+bonus, won:total>=game.target
    }
  };
}
