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
  meadow: { name: "Flower Meadow", mechanic: "bouquet", gravity: "down", pieces: ["🌷","🌼","🌸","🪻","🌺","💐"], color: "#88b98b" },
  pumpkin: { name: "Pumpkin Patch", mechanic: "cross", gravity: "down", pieces: ["🎃","🍎","🌽","🍁","🍐","🌰"], color: "#bf874a" },
  moonlight: { name: "Moonlight Orchard", mechanic: "moon", gravity: "down", pieces: ["🍎","🍐","🍑","🍒","🫐","🍇"], color: "#6676b0" },
  kitchen: { name: "Grandma's Kitchen", mechanic: "recipe", gravity: "down", pieces: ["🍎","🍓","🥕","🥚","🥛","🌾"], color: "#c7895f" }
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

// Pumpkin Patch: tap one harvest crop to gather its matching variety from
// the entire ROW and COLUMN. Crops need not touch. Unlike Flower Meadow,
// this is a line-of-sight cross harvest, not a connected group or a swap.
export function pumpkinHarvest(board,index,size=boardSize(board)) {
  if(!Array.isArray(board)||!size||!Number.isInteger(index)||
      index<0||index>=board.length||board[index]===null||
      !Number.isInteger(board[index]))return [];
  const kind=board[index],row=Math.floor(index/size),col=index%size;
  const harvest=[];
  for(let i=0;i<board.length;i++){
    if((Math.floor(i/size)===row||i%size===col)&&board[i]===kind)
      harvest.push(i);
  }
  return harvest;
}

export function hasPumpkinHarvest(board,size=boardSize(board)) {
  if(!size)return false;
  for(let i=0;i<board.length;i++)
    if(pumpkinHarvest(board,i,size).length>=3)return true;
  return false;
}

// Moonlight Orchard: gather all matching fruit in a moonlit SQUARE halo
// centered on the tapped piece. Crops do not need to touch. The moon cycles
// through three radii as moves are made, unlike Pumpkin Patch's long cross.
export const MOON_PHASES=Object.freeze([
  Object.freeze({name:"Crescent",icon:"🌒",radius:1}),
  Object.freeze({name:"Half Moon",icon:"🌓",radius:2}),
  Object.freeze({name:"Full Moon",icon:"🌕",radius:3})
]);
export function moonPhase(moves=0){
  return MOON_PHASES[Number.isSafeInteger(moves)&&moves>=0?moves%3:0];
}
export function moonlightHarvest(board,index,size=boardSize(board),radius=1){
  if(!Array.isArray(board)||!size||!Number.isInteger(index)||
      index<0||index>=size*size||!Number.isInteger(radius)||
      radius<1||radius>3||!Number.isInteger(board[index]))return [];
  const kind=board[index],row=Math.floor(index/size),col=index%size;
  const found=[];
  for(let r=Math.max(0,row-radius);r<=Math.min(size-1,row+radius);r++){
    for(let c=Math.max(0,col-radius);c<=Math.min(size-1,col+radius);c++){
      const i=r*size+c;
      if(board[i]===kind)found.push(i);
    }
  }
  return found;
}
export function hasMoonlightHarvest(board,size=boardSize(board),radius=1){
  if(!size)return false;
  return board.some((_,i)=>moonlightHarvest(board,i,size,radius).length>=3);
}

// Grandma's Kitchen is an ordered, three-ingredient cooking puzzle.
// Unlike matching groups, cross-harvests or halo taps, a player must find the
 // NEXT requested ingredient anywhere on the board, in the proper order.
 // These are playful mini recipes, never cooking instructions or private notes.
export const KITCHEN_RECIPES=Object.freeze([
  Object.freeze({name:"Apple Crumble",ingredients:Object.freeze([0,5,4])}),
  Object.freeze({name:"Berry Tart",ingredients:Object.freeze([1,5,4])}),
  Object.freeze({name:"Garden Soup",ingredients:Object.freeze([2,4,5])}),
  Object.freeze({name:"Breakfast Bake",ingredients:Object.freeze([3,4,5])}),
  Object.freeze({name:"Fruit Custard",ingredients:Object.freeze([0,3,4])}),
  Object.freeze({name:"Berry Pancakes",ingredients:Object.freeze([3,1,5])}),
  Object.freeze({name:"Farmhouse Pie",ingredients:Object.freeze([2,5,3])}),
  Object.freeze({name:"Berry Milkshake",ingredients:Object.freeze([1,4,0])}),
  Object.freeze({name:"Apple Breakfast",ingredients:Object.freeze([0,3,5])})
]);
export function kitchenNextIngredient(game){
  if(game?.mode!=="kitchen"||!Number.isInteger(game.recipeId)||
    game.recipeId<0||game.recipeId>=KITCHEN_RECIPES.length||
    !Number.isInteger(game.recipeStep)||game.recipeStep<0||game.recipeStep>2)return null;
  return KITCHEN_RECIPES[game.recipeId].ingredients[game.recipeStep];
}
export function kitchenCanCook(game){
  const next=kitchenNextIngredient(game);
  return next!==null&&Array.isArray(game.board)&&game.board.includes(next);
}
export function validKitchenState(game){
  return game?.mode==="kitchen"&&Number.isSafeInteger(game.recipeId)&&
    game.recipeId>=0&&game.recipeId<KITCHEN_RECIPES.length&&
    Number.isSafeInteger(game.recipeStep)&&game.recipeStep>=0&&game.recipeStep<3&&
    Number.isSafeInteger(game.dishes)&&game.dishes>=0&&
    Number.isSafeInteger(game.moves)&&game.moves>=0&&
    game.dishes*3+game.recipeStep===game.moves&&
    kitchenCanCook(game);
}
function kitchenBoardReady(board){
  return [0,1,2,3,4,5].every(x=>board.includes(x));
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
    if (mechanic === "recipe" ? kitchenBoardReady(board) :
      mechanic === "moon" ? hasMoonlightHarvest(board,size,1) :
      mechanic === "cross" ? hasPumpkinHarvest(board,size) :
      mechanic === "bouquet" ? hasBouquet(board,size) :
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
    (rules.mechanic==="recipe"?12:rules.mechanic==="moon"?28:rules.mechanic==="bouquet"?26:rules.mechanic==="cross"?25:rules.mechanic==="tap"?24:22) :
    (rules.mechanic==="recipe"?18:rules.mechanic==="moon"?46:rules.mechanic==="bouquet"?42:rules.mechanic==="cross"?39:rules.mechanic==="tap"?36:30);
  const target=base+wave*(size===EASY_SIZE?(rules.mechanic==="recipe"?3:2):3);
  const kitchen=rules.mechanic==="recipe"?
    {recipeId:Math.floor(rng()*KITCHEN_RECIPES.length),recipeStep:0,dishes:0}:null;
  return { mode, level, size, seed, rngState:rng.getState(), board, target, cleared:0,
    score:0,moves:0,won:false,...(kitchen||{}) };
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
  if(rules.mechanic==="recipe"){
    const next=kitchenNextIngredient(game);
    if(next===null||!validKitchenState(game)||!Number.isInteger(first)||
      first<0||first>=board.length||board[first]!==next)
      return {valid:false,game};
    const completing=game.recipeStep===2;
    const gained=completing?180:40;
    trace.push({type:"pop",board:[...board],matched:[first],
      kitchenDish:completing?KITCHEN_RECIPES[game.recipeId].name:null,
      kitchenStep:game.recipeStep,gained,combo:1});
    board[first]=null;cleared=1;bonus=gained;
    const movements=[];
    collapse(board,rng,rules.gravity,size,movements);
    trace.push({type:"fall",board:[...board],movements,combo:1});
    if(!kitchenBoardReady(board)){
      const fresh=makeBoard(rng,rules.mechanic,size);
      board.splice(0,board.length,...fresh);
      trace.push({type:"shuffle",board:[...board]});
    }
  } else if(rules.mechanic==="moon"){
    const phase=moonPhase(game.moves),group=moonlightHarvest(board,first,size,phase.radius);
    if(group.length<3)return {valid:false,game};
    const chosen=new Set(group);
    // Five matching fruit awaken starlight around the tapped fruit. A stardust
    // bonus never double-counts the fruit already collected by the moon halo.
    const stardust=group.length>=5?
      flowerNeighbors(first,size).filter(i=>!chosen.has(i)):[];
    const collected=[...group,...stardust];
    const gained=group.length*(group.length+3)*10+stardust.length*40;
    trace.push({type:"pop",board:[...board],matched:collected,
      moonPhase:phase.name,stardust,groupSize:group.length,combo:1,gained});
    for(const i of collected)board[i]=null;
    cleared=collected.length;
    bonus=gained;
    const movements=[];
    collapse(board,rng,rules.gravity,size,movements);
    trace.push({type:"fall",board:[...board],movements,combo:1});
  } else if (rules.mechanic === "cross") {
    const group=pumpkinHarvest(board,first,size);
    if(group.length<3)return {valid:false,game};
    const groupSet=new Set(group);
    // Large cross harvests stir up a gentle leaf gust, gathering crops
    // immediately next to the tapped piece, even if they are other kinds.
    const gust=group.length>=5?
      neighbors(first,size).filter(i=>!groupSet.has(i)):[];
    const collected=[...group,...gust];
    const gained=group.length*(group.length+2)*10+gust.length*35;
    trace.push({type:"pop",board:[...board],matched:collected,
      gust,groupSize:group.length,combo:1,gained});
    for(const i of collected)board[i]=null;
    cleared=collected.length;
    bonus=gained;
    const movements=[];
    collapse(board,rng,rules.gravity,size,movements);
    trace.push({type:"fall",board:[...board],movements,combo:1});
  } else if (rules.mechanic === "tap" || rules.mechanic === "bouquet") {
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
  if (rules.mechanic === "recipe" ? !kitchenBoardReady(board) :
    rules.mechanic === "moon" ? !hasMoonlightHarvest(board,size,1) :
    rules.mechanic === "cross" ? !hasPumpkinHarvest(board,size) :
    rules.mechanic === "bouquet" ? !hasBouquet(board,size) :
    rules.mechanic === "tap" ? !hasGroup(board,size) : !hasSwap(board,size)) {
    const fresh = makeBoard(rng, rules.mechanic, size);
    board.splice(0, board.length, ...fresh);
    trace.push({ type: "shuffle", board: [...board] });
  }
  const total = game.cleared + cleared;
  const kitchen=rules.mechanic==="recipe"?
    (game.recipeStep===2?
      {recipeId:Math.floor(rng()*KITCHEN_RECIPES.length),
        recipeStep:0,dishes:game.dishes+1}:
      {recipeId:game.recipeId,recipeStep:game.recipeStep+1,dishes:game.dishes}):null;
  return {
    valid: true,
    game: {
      ...game, board, rngState:rng.getState(), cleared:total,
      moves:game.moves+1, score:game.score+bonus, won:total>=game.target,
      ...(kitchen||{})
    },
    cleared, cascades, trace
  };
}
