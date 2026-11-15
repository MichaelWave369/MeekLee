// MeekLee Adventures: deterministic, dependency-free puzzle rules.
// Original games and assets only. No paywall, timers, telemetry, or network logic.
export const SIZE = 8;
export const MODES = Object.freeze({
  harvest: { name: "Harvest Valley", mechanic: "swap", gravity: "down", pieces: ["🍓","🥕","🌽","🍇","🍋","🍎"], color: "#6da74d" },
  sweets: { name: "Sugar Mountain", mechanic: "swap", gravity: "down", pieces: ["🍬","🍭","🍒","🧁","🍫","🍪"], color: "#d56c9e" },
  rescue: { name: "Critter Rescue", mechanic: "tap", gravity: "down", pieces: ["🐶","🐱","🐰","🦊","🐼","🐻"], color: "#df9b53" },
  bubbles: { name: "Bubble Lagoon", mechanic: "swap", gravity: "up", pieces: ["🫧","💜","🩵","💛","💚","🩷"], color: "#62a5c6" }
});

export function seedFor(mode, level) {
  const input = String(mode) + ":" + String(level);
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}

export function rngFrom(seed, state) {
  let x = (state ?? seed) >>> 0 || 1;
  const next = () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
  next.getState = () => x;
  return next;
}

export function neighbors(index) {
  const row = Math.floor(index / SIZE), col = index % SIZE;
  const result = [];
  if (row > 0) result.push(index - SIZE);
  if (row < SIZE - 1) result.push(index + SIZE);
  if (col > 0) result.push(index - 1);
  if (col < SIZE - 1) result.push(index + 1);
  return result;
}

export function adjacent(a, b) {
  return Number.isInteger(a) && Number.isInteger(b) &&
    a >= 0 && b >= 0 && a < SIZE * SIZE && b < SIZE * SIZE &&
    neighbors(a).includes(b);
}

export function findMatches(board) {
  const matches = new Set();
  for (let row = 0; row < SIZE; row++) {
    let start = 0;
    while (start < SIZE) {
      let end = start + 1;
      const v = board[row * SIZE + start];
      while (v !== null && end < SIZE && board[row * SIZE + end] === v) end++;
      if (v !== null && end - start >= 3) {
        for (let col = start; col < end; col++) matches.add(row * SIZE + col);
      }
      start = end;
    }
  }
  for (let col = 0; col < SIZE; col++) {
    let start = 0;
    while (start < SIZE) {
      let end = start + 1;
      const v = board[start * SIZE + col];
      while (v !== null && end < SIZE && board[end * SIZE + col] === v) end++;
      if (v !== null && end - start >= 3) {
        for (let row = start; row < end; row++) matches.add(row * SIZE + col);
      }
      start = end;
    }
  }
  return matches;
}

export function hasSwap(board) {
  for (let i = 0; i < board.length; i++) {
    for (const j of neighbors(i)) {
      if (j < i || board[i] === board[j]) continue;
      [board[i], board[j]] = [board[j], board[i]];
      const good = findMatches(board).size > 0;
      [board[i], board[j]] = [board[j], board[i]];
      if (good) return true;
    }
  }
  return false;
}

export function connectedGroup(board, index) {
  if (!Number.isInteger(index) || index < 0 || index >= SIZE * SIZE || board[index] == null) return [];
  const value = board[index], seen = new Set([index]), queue = [index];
  for (let at = 0; at < queue.length; at++) {
    for (const next of neighbors(queue[at])) {
      if (!seen.has(next) && board[next] === value) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return queue;
}

export function hasGroup(board) {
  for (let i = 0; i < board.length; i++) {
    if (connectedGroup(board, i).length >= 2) return true;
  }
  return false;
}

export function makeBoard(rng, mechanic = "swap") {
  for (let attempt = 0; attempt < 250; attempt++) {
    const board = Array(SIZE * SIZE).fill(null);
    for (let i = 0; i < board.length; i++) {
      const banned = new Set();
      const row = Math.floor(i / SIZE), col = i % SIZE;
      if (col >= 2 && board[i - 1] === board[i - 2]) banned.add(board[i - 1]);
      if (row >= 2 && board[i - SIZE] === board[i - SIZE * 2]) banned.add(board[i - SIZE]);
      const options = [0,1,2,3,4,5].filter(p => !banned.has(p));
      board[i] = options[Math.floor(rng() * options.length)];
    }
    if (mechanic === "tap" ? hasGroup(board) : hasSwap(board)) return board;
  }
  throw new Error("Could not generate a playable board");
}

export function collapse(board, rng, gravity = "down") {
  for (let col = 0; col < SIZE; col++) {
    const values = [];
    if (gravity === "up") {
      for (let row = 0; row < SIZE; row++) {
        const item = board[row * SIZE + col];
        if (item !== null) values.push(item);
      }
      for (let row = 0; row < SIZE; row++)
        board[row * SIZE + col] = row < values.length ? values[row] : Math.floor(rng() * 6);
    } else {
      for (let row = SIZE - 1; row >= 0; row--) {
        const item = board[row * SIZE + col];
        if (item !== null) values.push(item);
      }
      for (let row = SIZE - 1, i = 0; row >= 0; row--, i++)
        board[row * SIZE + col] = i < values.length ? values[i] : Math.floor(rng() * 6);
    }
  }
  return board;
}

export function makeLevel(mode, level) {
  if (!(mode in MODES)) throw new Error("Unknown world");
  if (!Number.isSafeInteger(level) || level < 1) throw new Error("Invalid level");
  const seed = seedFor(mode, level), rng = rngFrom(seed), rules = MODES[mode];
  const board = makeBoard(rng, rules.mechanic);
  // A gentle repeating difficulty wave, rather than difficulty growing forever.
  const wave = (level - 1) % 9;
  const target = (rules.mechanic === "tap" ? 36 : 30) + wave * 3;
  return { mode, level, seed, rngState: rng.getState(), board, target, cleared: 0, score: 0, moves: 0, won: false };
}

export function playTurn(game, first, second) {
  const rules = MODES[game?.mode];
  if (!rules || game.won || !Array.isArray(game.board) || game.board.length !== SIZE * SIZE) {
    return { valid: false, game };
  }
  const board = [...game.board], rng = rngFrom(game.seed, game.rngState);
  let cleared = 0, bonus = 0, cascades = 0;
  if (rules.mechanic === "tap") {
    const group = connectedGroup(board, first);
    if (group.length < 2) return { valid: false, game };
    for (const i of group) board[i] = null;
    cleared = group.length;
    bonus = group.length * (group.length + 2) * 10;
    collapse(board, rng, rules.gravity);
  } else {
    if (!adjacent(first, second) || board[first] === board[second]) return { valid: false, game };
    [board[first], board[second]] = [board[second], board[first]];
    let matches = findMatches(board);
    if (!matches.size) return { valid: false, game };
    while (matches.size && cascades < 100) {
      cascades++;
      cleared += matches.size;
      bonus += matches.size * (10 + cascades * 5);
      for (const i of matches) board[i] = null;
      collapse(board, rng, rules.gravity);
      matches = findMatches(board);
    }
    // Rare pathological cascade loops should not trap a player.
    if (matches.size) {
      const fresh = makeBoard(rng, rules.mechanic);
      board.splice(0, board.length, ...fresh);
    }
  }
  if (rules.mechanic === "tap" ? !hasGroup(board) : !hasSwap(board)) {
    const fresh = makeBoard(rng, rules.mechanic);
    board.splice(0, board.length, ...fresh);
  }
  const total = game.cleared + cleared;
  return {
    valid: true,
    game: {
      ...game, board, rngState: rng.getState(), cleared: total,
      moves: game.moves + 1, score: game.score + bonus, won: total >= game.target
    },
    cleared, cascades
  };
}
