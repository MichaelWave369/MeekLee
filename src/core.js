// MeekLee Adventures: deterministic, dependency-free puzzle rules.
// Original games and assets only. No paywall, timers, telemetry, or network logic.
export const SIZE = 8;
export const EASY_SIZE = 6;

// Keep legacy 8x8 saves compatible while enabling an accessible 6x6 board.
export function boardSize(board) {
  const size = Math.sqrt(board?.length ?? 0);
  return size === SIZE || size === EASY_SIZE ? size : null;
}

export const MODES = Object.freeze({
  harvest: { name: "Harvest Valley", mechanic: "swap", gravity: "down", pieces: ["🍓","🥕","🌽","🍇","🍋","🍎"], color: "#6da74d" },
  sweets: { name: "Sugar Mountain", mechanic: "swap", gravity: "down", pieces: ["🍬","🍭","🍒","🧁","🍫","🍪"], color: "#d56c9e" },
  rescue: { name: "Critter Rescue", mechanic: "tap", gravity: "down", pieces: ["🐶","🐱","🐰","🦊","🐼","🐻"], color: "#df9b53" },
  bubbles: { name: "Bubble Lagoon", mechanic: "swap", gravity: "up", pieces: ["🫧","⭐","🐚","🐠","🌸","🐙"], color: "#62a5c6" },
  meadow: { name: "Flower Meadow", mechanic: "bouquet", gravity: "down", pieces: ["🌷","🌼","🌸","🪻","🌺","💐"], color: "#88b98b" }
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

export function neighbors(index, size = SIZE) {
  const row = Math.floor(index / size), col = index % size;
  const result = [];
  if (row > 0) result.push(index - size);
  if (row < size - 1) result.push(index + size);
  if (col > 0) result.push(index - 1);
  if (col < size - 1) result.push(index + 1);
  return result;
}

export function adjacent(a, b, size = SIZE) {
  return Number.isInteger(a) && Number.isInteger(b) &&
    a >= 0 && b >= 0 && a < size * size && b < size * size &&
    neighbors(a, size).includes(b);
}

export function findMatches(board, size = boardSize(board)) {
  const matches = new Set();
  for (let row = 0; row < size; row++) {
    let start = 0;
    while (start < size) {
      let end = start + 1;
      const v = board[row * size + start];
      while (v !== null && end < size && board[row * size + end] === v) end++;
      if (v !== null && end - start >= 3) {
        for (let col = start; col < end; col++) matches.add(row * size + col);
      }
      start = end;
    }
  }
  for (let col = 0; col < size; col++) {
    let start = 0;
    while (start < size) {
      let end = start + 1;
      const v = board[start * size + col];
      while (v !== null && end < size && board[end * size + col] === v) end++;
      if (v !== null && end - start >= 3) {
        for (let row = start; row < end; row++) matches.add(row * size + col);
      }
      start = end;
    }
  }
  return matches;
}

export function hasSwap(board, size = boardSize(board)) {
  for (let i = 0; i < board.length; i++) {
    for (const j of neighbors(i, size)) {
      if (j < i || board[i] === board[j]) continue;
      [board[i], board[j]] = [board[j], board[i]];
      const good = findMatches(board, size).size > 0;
      [board[i], board[j]] = [board[j], board[i]];
      if (good) return true;
    }
  }
  return false;
}

export function connectedGroup(board, index, size = boardSize(board)) {
  if (!Number.isInteger(index) || index < 0 || index >= size * size || board[index] == null) return [];
  const value = board[index], seen = new Set([index]), queue = [index];
  for (let at = 0; at < queue.length; at++) {
    for (const next of neighbors(queue[at], size)) {
      if (!seen.has(next) && board[next] === value) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return queue;
}

// Flower Meadow's bouquet mechanic is NOT the Rescue tap mechanic.
// Blossoms connect through corners as well as edges; three or more make a
 // bouquet, and a five-flower bouquet releases a nearby pollen burst.
export function flowerNeighbors(index,size = SIZE) {
  if(!Number.isInteger(index)||!Number.isInteger(size)||
    index<0||index>=size*size)return [];
  const row=Math.floor(index/size),col=index%size,result=[];
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
    if(!dr&&!dc)continue;
    const r=row+dr,c=col+dc;
    if(r>=0&&r<size&&c>=0&&c<size)result.push(r*size+c);
  }
  return result;
}

export function connectedBouquet(board,index,size=boardSize(board)) {
  if(!Array.isArray(board)||!size||!Number.isInteger(index)||
    index<0||index>=size*size||board[index]==null)return [];
  const color=board[index],seen=new Set([index]),queue=[index];
  for(let at=0;at<queue.length;at++){
    for(const j of flowerNeighbors(queue[at],size)){
      if(!seen.has(j)&&board[j]===color){
        seen.add(j);queue.push(j);
      }
    }
  }
  return queue;
}

export function hasBouquet(board,size=boardSize(board)){
  if(!size)return false;
  for(let i=0;i<board.length;i++)
    if(connectedBouquet(board,i,size).length>=3)return true;
  return false;
}

export function hasGroup(board, size = boardSize(board)) {
  for (let i = 0; i < board.length; i++) {
    if (connectedGroup(board, i, size).length >= 2) return true;
  }
  return false;
}

export function makeBoard(rng, mechanic = "swap", size = SIZE) {
  if (size !== SIZE && size !== EASY_SIZE) throw new Error("Invalid board size");
  for (let attempt = 0; attempt < 250; attempt++) {
    const board = Array(size * size).fill(null);
    for (let i = 0; i < board.length; i++) {
      const banned = new Set();
      const row = Math.floor(i / size), col = i % size;
      if (col >= 2 && board[i - 1] === board[i - 2]) banned.add(board[i - 1]);
      if (row >= 2 && board[i - size] === board[i - size * 2]) banned.add(board[i - size]);
      const options = [0,1,2,3,4,5].filter(p => !banned.has(p));
      board[i] = options[Math.floor(rng() * options.length)];
    }
    if (mechanic === "bouquet" ? hasBouquet(board,size) :
      mechanic === "tap" ? hasGroup(board, size) : hasSwap(board, size)) return board;
  }
  throw new Error("Could not generate a playable board");
}

// Optional movement metadata is purely visual; game rules and randomness stay unchanged.
export function collapse(board, rng, gravity = "down", size = boardSize(board), movements = null) {
  for (let col = 0; col < size; col++) {
    const values = [];
    if (gravity === "up") {
      for (let row = 0; row < size; row++) {
        const item = board[row * size + col];
        if (item !== null) values.push({ piece: item, source: row * size + col });
      }
      for (let row = 0; row < size; row++) {
        const to = row * size + col, source = values[row];
        board[to] = source ? source.piece : Math.floor(rng() * 6);
        if (movements) movements.push({
          to, from: source ? source.source : to + size * size,
          fresh: !source
        });
      }
    } else {
      for (let row = size - 1; row >= 0; row--) {
        const item = board[row * size + col];
        if (item !== null) values.push({ piece: item, source: row * size + col });
      }
      for (let row = size - 1, i = 0; row >= 0; row--, i++) {
        const to = row * size + col, source = values[i];
        board[to] = source ? source.piece : Math.floor(rng() * 6);
        if (movements) movements.push({
          to, from: source ? source.source : to - size * size,
          fresh: !source
        });
      }
    }
  }
  return board;
}

export function makeLevel(mode, level, size = SIZE) {
  if (!(mode in MODES)) throw new Error("Unknown world");
  if (!Number.isSafeInteger(level) || level < 1) throw new Error("Invalid level");
  if (size !== SIZE && size !== EASY_SIZE) throw new Error("Invalid board size");
  const seed = seedFor(size === SIZE ? mode : `${mode}:easy`, level), rng = rngFrom(seed), rules = MODES[mode];
  const board = makeBoard(rng, rules.mechanic, size);
  // A gentle repeating difficulty wave, rather than difficulty growing forever.
  const wave = (level - 1) % 9;
  const base=size===EASY_SIZE ?
    (rules.mechanic==="bouquet"?26:rules.mechanic==="tap"?24:22) :
    (rules.mechanic==="bouquet"?42:rules.mechanic==="tap"?36:30);
  const target=base+wave*(size===EASY_SIZE?2:3);
  return { mode, level, size, seed, rngState: rng.getState(), board, target, cleared: 0, score: 0, moves: 0, won: false };
}

export function playTurn(game, first, second) {
  const rules = MODES[game?.mode];
  const size = boardSize(game?.board);
  if (!rules || game.won || !Array.isArray(game.board) || !size || (game.size !== undefined && game.size !== size)) {
    return { valid: false, game };
  }
  const board = [...game.board], rng = rngFrom(game.seed, game.rngState);
  let cleared = 0, bonus = 0, cascades = 0;
  const trace = [];
  if (rules.mechanic === "tap" || rules.mechanic === "bouquet") {
    const bouquet=rules.mechanic==="bouquet";
    const group=bouquet?connectedBouquet(board,first,size):connectedGroup(board,first,size);
    if(group.length<(bouquet?3:2))return {valid:false,game};
    const groupSet=new Set(group);
    // A bouquet of five or more flowers releases pollen into its immediate
    // neighborhood, gathering nearby flowers of other colors as a bonus.
    const pollen=bouquet&&group.length>=5?
      flowerNeighbors(first,size).filter(i=>!groupSet.has(i)):[];
    const collected=[...group,...pollen];
    const gained=collected.length*(group.length+2)*10;
    trace.push({type:"pop",board:[...board],matched:collected,
      pollen,groupSize:group.length,combo:1,gained});
    for(const i of collected)board[i]=null;
    cleared=collected.length;
    bonus=gained;
    const movements=[];
    collapse(board,rng,rules.gravity,size,movements);
    trace.push({type:"fall",board:[...board],movements,combo:1});
  } else {
    if (!adjacent(first, second, size) || board[first] === board[second]) return { valid: false, game };
    [board[first], board[second]] = [board[second], board[first]];
    let matches = findMatches(board, size);
    if (!matches.size) return { valid: false, game };
    trace.push({ type: "swap", board: [...board], indices: [first, second] });
    while (matches.size && cascades < 100) {
      cascades++;
      cleared += matches.size;
      const gained = matches.size * (10 + cascades * 5);
      bonus += gained;
      trace.push({ type: "pop", board: [...board], matched: [...matches], combo: cascades, gained });
      for (const i of matches) board[i] = null;
      const movements = [];
      collapse(board, rng, rules.gravity, size, movements);
      trace.push({ type: "fall", board: [...board], movements, combo: cascades });
      matches = findMatches(board, size);
    }
    // Rare pathological cascade loops should not trap a player.
    if (matches.size) {
      const fresh = makeBoard(rng, rules.mechanic, size);
      board.splice(0, board.length, ...fresh);
      trace.push({ type: "shuffle", board: [...board] });
    }
  }
  if (rules.mechanic === "bouquet" ? !hasBouquet(board,size) :
    rules.mechanic === "tap" ? !hasGroup(board,size) : !hasSwap(board,size)) {
    const fresh = makeBoard(rng, rules.mechanic, size);
    board.splice(0, board.length, ...fresh);
    trace.push({ type: "shuffle", board: [...board] });
  }
  const total = game.cleared + cleared;
  return {
    valid: true,
    game: {
      ...game, board, rngState: rng.getState(), cleared: total,
      moves: game.moves + 1, score: game.score + bonus, won: total >= game.target
    },
    cleared, cascades, trace
  };
}
