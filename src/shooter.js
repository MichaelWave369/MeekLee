// Original MeekLee Bubble Lagoon: deterministic hex-grid bubble shooting.
// Original mechanics, earned boosts, free retries, and no paywalls or lives.
import { EASY_SIZE, SIZE, rngFrom, seedFor } from "./core.js";

export const BUBBLE_RADIUS = 20;
export const BUBBLE_ROW_STEP = Math.sqrt(3) * BUBBLE_RADIUS;
export const BUBBLE_COLORS = ["#4b9fe9", "#e27ba2", "#f3b94c", "#49aa89", "#a28de1"];
export const BUBBLE_SYMBOLS = ["★", "♥", "✿", "◆", "☀"];

export function bubbleGeometry(size) {
  if (size !== EASY_SIZE && size !== SIZE) throw new Error("Invalid shooter size");
  const cols = size, rows = size === EASY_SIZE ? 9 : 11;
  const width = 2 * BUBBLE_RADIUS * cols + BUBBLE_RADIUS;
  const height = BUBBLE_RADIUS + (rows - 1) * BUBBLE_ROW_STEP + 125;
  return { cols, rows, width, height, origin: { x: width / 2, y: height - 35 } };
}
export function bubbleCenter(index, size) {
  const { cols } = bubbleGeometry(size);
  const row = Math.floor(index / cols), col = index % cols;
  return {
    x: BUBBLE_RADIUS + col * 2 * BUBBLE_RADIUS + (row % 2) * BUBBLE_RADIUS,
    y: BUBBLE_RADIUS + row * BUBBLE_ROW_STEP
  };
}
export function bubbleNeighbors(index, size) {
  const { cols, rows } = bubbleGeometry(size);
  if (!Number.isInteger(index) || index < 0 || index >= cols * rows) return [];
  const base = bubbleCenter(index, size), row = Math.floor(index / cols), col = index % cols, out = [];
  for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
    for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
      const other = r * cols + c;
      if (other === index) continue;
      const pos = bubbleCenter(other, size);
      if ((pos.x - base.x) ** 2 + (pos.y - base.y) ** 2 <= (2 * BUBBLE_RADIUS + 1) ** 2) out.push(other);
    }
  }
  return out;
}
export function bubbleGroup(cells, start, size, sameColor = true) {
  if (!Number.isInteger(start) || start < 0 || start >= cells.length || cells[start] == null) return [];
  const result = [start], seen = new Set(result), color = cells[start];
  for (let p = 0; p < result.length; p++) {
    for (const next of bubbleNeighbors(result[p], size)) {
      if (!seen.has(next) && cells[next] != null && (!sameColor || cells[next] === color)) {
        result.push(next); seen.add(next);
      }
    }
  }
  return result;
}
function anchored(cells, size) {
  const { cols } = bubbleGeometry(size), seen = new Set(), queue = [];
  for (let i = 0; i < cols; i++) if (cells[i] != null) {
    seen.add(i); queue.push(i);
  }
  for (let j = 0; j < queue.length; j++) {
    for (const next of bubbleNeighbors(queue[j], size)) if (cells[next] != null && !seen.has(next)) {
      seen.add(next); queue.push(next);
    }
  }
  return seen;
}
export function presentColors(cells) { return [...new Set(cells.filter(v => v !== null))].sort((a,b)=>a-b); }
function pickColor(colors, rng) {
  return colors[Math.floor(rng() * colors.length)] ?? 0;
}


export const MAX_EARNED_POWERUPS = 9;
export function shotBudgetForLevel(level, size = EASY_SIZE, retries = 0) {
  const filledRows = 3 + ((level - 1) % 3);
  const target = filledRows * size;
  // Generous opening budget; three additional shots after each failed attempt.
  // A ceiling prevents runaway numbers after many retries.
  return 14 + Math.ceil(target / 2) + Math.min(15, Math.max(0, retries) * 3);
}
function clampPower(value) {
  return Number.isInteger(value) ? Math.max(0, Math.min(MAX_EARNED_POWERUPS, value)) : 0;
}
export function shooterStars(game) {
  if (!game?.won) return 0;
  if (game.shotsLeft >= Math.ceil(game.maxShots * .45)) return 3;
  if (game.shotsLeft >= Math.ceil(game.maxShots * .2)) return 2;
  return 1;
}
export function normalizeShooter(game) {
  // Existing phones already have a shooter save without a shot counter.
  // Preserve its board, score, moves and seed rather than restarting Mom's level.
  if (!validShooter(game, game?.size)) return null;
  const retries = Number.isInteger(game.retries) && game.retries >= 0 ? Math.min(100,game.retries) : 0;
  const maxShots = Number.isInteger(game.maxShots) && game.maxShots > 0 ?
    game.maxShots : shotBudgetForLevel(game.level, game.size, retries);
  const shotsLeft = Number.isInteger(game.shotsLeft) && game.shotsLeft >= 0 ?
    game.shotsLeft : Math.max(0,maxShots-game.moves);
  const pearls = clampPower(game.pearls), rainbows = clampPower(game.rainbows);
  return {
    ...game, retries, maxShots, shotsLeft, pearls, rainbows,
    startPearls: clampPower(game.startPearls),
    startRainbows: clampPower(game.startRainbows),
    bestMatch: Number.isInteger(game.bestMatch) && game.bestMatch >= 0 ? game.bestMatch : 0,
    stars: game.won ? (game.stars || shooterStars({...game,maxShots,shotsLeft})) : 0,
    failed: !game.won && shotsLeft === 0 && pearls === 0 && rainbows === 0
  };
}
export function retryShooter(game) {
  const previous = normalizeShooter(game);
  if (!previous || !previous.failed) return { valid: false, game };
  const next = makeShooterLevel(previous.level, previous.size, {
    retries: previous.retries + 1,
    pearls: previous.startPearls,
    rainbows: previous.startRainbows
  });
  return { valid: true, game: next };
}
export function nextShooterLevel(level, size, previous) {
  const old = previous ? normalizeShooter(previous) : null;
  const milestone = level > 1 && level % 10 === 1 && old?.won && old.level === level - 1;
  return makeShooterLevel(level,size,{
    pearls: (old?.pearls || 0) + (milestone ? 2 : 0),
    rainbows: old?.rainbows || 0
  });
}

export function makeShooterLevel(level, size = EASY_SIZE, options = {}) {
  if (!Number.isSafeInteger(level) || level < 1) throw new Error("Invalid shooter level");
  const { cols, rows } = bubbleGeometry(size);
  const seed = seedFor(size === EASY_SIZE ? "lagoon:easy:shooter" : "lagoon:classic:shooter", level);
  const rng = rngFrom(seed), cells = Array(cols * rows).fill(null);
  const filledRows = 3 + ((level - 1) % 3);
  const palette = 4 + ((level - 1) % 2);
  for (let row = 0; row < filledRows; row++) {
    for (let col = 0; col < cols; col++) {
      const group = Math.floor(col / 2) + Math.floor(row / 2);
      cells[row * cols + col] = (group + Math.floor(rng() * 2)) % palette;
    }
  }
  const colors = presentColors(cells);
  const currentColor = pickColor(colors, rng), nextColor = pickColor(colors, rng);
  const retries = Number.isInteger(options.retries) ? Math.max(0,Math.min(100,options.retries)) : 0;
  const maxShots = shotBudgetForLevel(level, size, retries);
  const pearls = clampPower(options.pearls), rainbows = clampPower(options.rainbows);
  return {
    type: "shooter", mode: "bubbles", size, level, seed, rngState: rng.getState(),
    cells, currentColor, nextColor,
    target: filledRows * cols, cleared: 0, moves: 0, score: 0, won: false,
    maxShots, shotsLeft: maxShots, retries, failed: false,
    pearls, rainbows, startPearls: pearls, startRainbows: rainbows,
    bestMatch: 0, stars: 0
  };
}
export function validShooter(game, size) {
  if (!game || game.type !== "shooter" || game.mode !== "bubbles" || game.size !== size ||
    !Number.isSafeInteger(game.level) || game.level < 1 ||
    !Number.isInteger(game.rngState) || !Number.isInteger(game.seed) ||
    !Array.isArray(game.cells) || game.cells.length !== bubbleGeometry(size).cols * bubbleGeometry(size).rows ||
    !game.cells.every(v => v === null || (Number.isInteger(v) && v >= 0 && v < BUBBLE_COLORS.length)) ||
    !Number.isInteger(game.currentColor) || game.currentColor < 0 || game.currentColor >= BUBBLE_COLORS.length ||
    !Number.isInteger(game.nextColor) || game.nextColor < 0 || game.nextColor >= BUBBLE_COLORS.length ||
    !Number.isFinite(game.score) || !Number.isFinite(game.cleared) || !Number.isFinite(game.moves) ||
    typeof game.won !== "boolean") return false;
  return true;
}

export function simulateBubblePath(game, aimX, aimY) {
  const { cols, rows, width, origin } = bubbleGeometry(game.size);
  if (!Number.isFinite(aimX) || !Number.isFinite(aimY)) return { valid: false, points: [] };
  const xDiff = aimX - origin.x, up = Math.max(22, origin.y - aimY);
  const slope = Math.max(-2.5, Math.min(2.5, xDiff / up));
  const normal = Math.hypot(slope, 1);
  let vx = (slope / normal) * 3, vy = -3 / normal;
  let { x, y } = origin;
  const points = [{x,y}];
  let hit = null, ceiling = false;
  const occupied = [];
  for (let i = 0; i < game.cells.length; i++) if (game.cells[i] != null) occupied.push([i, bubbleCenter(i, game.size)]);
  for (let step = 0; step < 3000; step++) {
    x += vx; y += vy;
    if (x < BUBBLE_RADIUS) {x = 2*BUBBLE_RADIUS-x;vx = Math.abs(vx);}
    if (x > width-BUBBLE_RADIUS) {x = 2*(width-BUBBLE_RADIUS)-x;vx = -Math.abs(vx);}
    if (step % 3 === 0) points.push({x,y});
    if (y <= BUBBLE_RADIUS) {y = BUBBLE_RADIUS;ceiling = true;break;}
    for (const [index, pos] of occupied) {
      if ((x-pos.x)**2+(y-pos.y)**2 <= (2*BUBBLE_RADIUS-3)**2) {
        hit = index;break;
      }
    }
    if (hit !== null) break;
  }
  points.push({x,y});
  let candidates = [];
  if (hit !== null) {
    candidates = bubbleNeighbors(hit, game.size).filter(i => game.cells[i] === null);
  } else if (ceiling) {
    candidates = Array.from({length:cols},(_,i)=>i).filter(i=>game.cells[i]===null);
  }
  if (!candidates.length) {
    // Nearest attached open cell: never teleport an orb to a disconnected island.
    for(let i=0;i<cols*rows;i++) {
      if(game.cells[i]===null &&
        (i<cols || bubbleNeighbors(i,game.size).some(n=>game.cells[n]!==null))) candidates.push(i);
    }
  }
  candidates.sort((a,b)=>{
    const p=bubbleCenter(a,game.size),q=bubbleCenter(b,game.size);
    return ((p.x-x)**2+(p.y-y)**2)-((q.x-x)**2+(q.y-y)**2);
  });
  const landing=candidates[0];
  return {valid:landing!==undefined,points,landing,hit,ceiling};
}

function resolveClears(cells, size, landing) {
  const popped = landing===null ? [] : bubbleGroup(cells, landing, size, true);
  const removed = popped.length >= 3 ? popped : [];
  for (const i of removed) cells[i] = null;
  const linked = anchored(cells,size);
  const dropped = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] !== null && !linked.has(i)) {dropped.push(i);cells[i] = null;}
  }
  return { popped: removed, dropped };
}

export function fireBubble(game, aimX, aimY) {
  const current = normalizeShooter(game);
  if (!current || current.won || current.failed || current.shotsLeft <= 0)
    return {valid:false,game};
  const path = simulateBubblePath(current,aimX,aimY);
  if (!path.valid) return {valid:false,game,path};
  const cells = [...game.cells];
  cells[path.landing] = game.currentColor;
  const {popped,dropped} = resolveClears(cells,game.size,path.landing);
  const rng = rngFrom(current.seed,current.rngState), colors=presentColors(cells);
  const nextColor=colors.includes(current.nextColor) ? current.nextColor : pickColor(colors,rng);
  const following=pickColor(colors,rng);
  const scoreGain=popped.length*25+dropped.length*40;
  // Exactly three: a Pearl (redeem for +3 balls).
  // Four or more: a Rainbow Burst (removes a whole cluster).
  // Five or more: add a Pearl too, to celebrate a truly big combination.
  const earned = {
    pearl: popped.length === 3 || popped.length >= 5 ? 1 : 0,
    rainbow: popped.length >= 4 ? 1 : 0
  };
  const shotsLeft = current.shotsLeft - 1, pearls = clampPower(current.pearls + earned.pearl),
    rainbows = clampPower(current.rainbows + earned.rainbow), won = colors.length===0;
  const next = {
    ...current,cells,rngState:rng.getState(),currentColor:nextColor,nextColor:following,
    moves:current.moves+1,cleared:current.cleared+popped.length+dropped.length,
    score:current.score+scoreGain,won,shotsLeft,pearls,rainbows,
    bestMatch:Math.max(current.bestMatch,popped.length),
    failed:!won && shotsLeft===0 && pearls===0 && rainbows===0
  };
  next.stars = shooterStars(next);
  return { valid:true,path,popped,dropped,earned,landedColor:current.currentColor,game:next };
}

/** Redeem one earned Pearl for three shots. No money, no lives, no timers. */
export function usePearl(game) {
  const current = normalizeShooter(game);
  if (!current || current.won || current.failed || current.pearls < 1)
    return {valid:false,game};
  return {
    valid:true,
    game:{...current,pearls:current.pearls-1,shotsLeft:current.shotsLeft+3,failed:false}
  };
}

/** Consume an earned Rainbow Burst to pop the largest connected color group. */
export function rainbowRescue(game) {
  const current = normalizeShooter(game);
  if (!current || current.won || current.failed || current.rainbows < 1)
    return {valid:false,game};
  let longest=[];
  for (let i=0;i<current.cells.length;i++) {
    const group=bubbleGroup(current.cells,i,current.size,true);
    if(group.length>longest.length)longest=group;
  }
  if(!longest.length)return {valid:false,game};
  const cells=[...current.cells];for(const i of longest)cells[i]=null;
  const keep=anchored(cells,current.size),dropped=[];
  for(let i=0;i<cells.length;i++)if(cells[i]!==null&&!keep.has(i)){cells[i]=null;dropped.push(i);}
  const rng=rngFrom(current.seed,current.rngState),colors=presentColors(cells);
  const rainbows = current.rainbows-1, won=colors.length===0;
  const next={
    ...current,cells,rngState:rng.getState(),cleared:current.cleared+longest.length+dropped.length,
    score:current.score+longest.length*25+dropped.length*40,
    currentColor:pickColor(colors,rng),nextColor:pickColor(colors,rng),
    rainbows,won,failed:!won && current.shotsLeft===0 && current.pearls===0 && rainbows===0
  };
  next.stars=shooterStars(next);
  return {valid:true,popped:longest,dropped,earned:{pearl:0,rainbow:0},game:next};
}
