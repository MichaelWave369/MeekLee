// Pyramid Solitaire: immutable 28-card pyramid, 24-card stock, pairs totaling 13.
// Relaxed family rules: three trips through the stock (two recycles), no timer.
// All decks use original MeekLee cards and deterministic local shuffling.
import {shuffleCards,cardRank,STANDARD_SUITS} from "./solitaire.js";

const ALL=STANDARD_SUITS.flatMap(s=>Array.from({length:13},(_,i)=>s.id+"-"+(i+1)));
const KEYS=Array.from({length:28},(_,i)=>"t:"+i);
const MAX_RECYCLES=2;
const SNAPSHOTS=14;
const has=Object.hasOwn;

function snapshot(g){
  const {history,...rest}=g;
  return rest;
}
function record(g,next,message){
  return {valid:true,game:{...next,moves:g.moves+1,
    history:[...(g.history||[]).slice(-(SNAPSHOTS-1)),snapshot(g)],
    last:message},message};
}
export function newPyramid(seed=Date.now()){
  const safeSeed=Number.isSafeInteger(seed)&&seed>=0?seed:1;
  const cards=shuffleCards(ALL,safeSeed);
  return {kind:"pyramid",seed:safeSeed,tableau:cards.slice(0,28),
    stock:cards.slice(28),waste:[],removed:[],recycles:0,
    moves:0,draws:0,won:false,last:"Remove pairs totaling thirteen.",history:[]};
}
export function validPyramid(g){
  if(g?.kind!=="pyramid"||!Number.isSafeInteger(g.seed)||g.seed<0||
    !Array.isArray(g.tableau)||g.tableau.length!==28||
    !Array.isArray(g.stock)||!Array.isArray(g.waste)||
    !Array.isArray(g.removed)||!Array.isArray(g.history)||g.history.length>SNAPSHOTS||
    !Number.isSafeInteger(g.moves)||g.moves<0||
    !Number.isSafeInteger(g.draws)||g.draws<0||
    !Number.isInteger(g.recycles)||g.recycles<0||g.recycles>MAX_RECYCLES||
    typeof g.won!=="boolean"||typeof g.last!=="string")return false;
  const ids=[...g.tableau.filter(Boolean),...g.stock,...g.waste,...g.removed];
  if(ids.length!==52||new Set(ids).size!==52||ids.some(x=>!ALL.includes(x)))return false;
  return g.won===g.tableau.every(x=>x===null);
}
export function pyramidExposed(g){
  if(!validPyramid(g))return [];
  const indices=[];
  for(let r=0;r<7;r++){
    const start=r*(r+1)/2;
    for(let c=0;c<=r;c++){
      const i=start+c;
      if(!g.tableau[i])continue;
      const childStart=(r+1)*(r+2)/2;
      if(r===6||(!g.tableau[childStart+c]&&!g.tableau[childStart+c+1]))indices.push(i);
    }
  }
  return indices;
}
export function pyramidAvailable(g){
  if(!validPyramid(g)||g.won)return [];
  const tableau=pyramidExposed(g).map(i=>"t:"+i);
  return g.waste.length?[...tableau,"w"]:tableau;
}
export function pyramidCard(g,key){
  if(!validPyramid(g)||!pyramidAvailable(g).includes(key))return null;
  return key==="w"?g.waste.at(-1):g.tableau[Number(key.slice(2))];
}
export function pyramidLegalMoves(g){
  if(!validPyramid(g)||g.won)return [];
  const keys=pyramidAvailable(g);
  const cards=keys.map(k=>pyramidCard(g,k));
  const moves=[];
  for(let i=0;i<keys.length;i++){
    if(cardRank(cards[i])===13)moves.push({cards:[keys[i]]});
    for(let j=i+1;j<keys.length;j++)
      if(cardRank(cards[i])+cardRank(cards[j])===13)
        moves.push({cards:[keys[i],keys[j]]});
  }
  return moves;
}
export function pyramidRemove(g,keys){
  if(!validPyramid(g)||g.won||!Array.isArray(keys)||keys.length<1||keys.length>2)
    return {valid:false,game:g};
  const allowed=pyramidLegalMoves(g).some(m=>
    m.cards.length===keys.length&&m.cards.every(k=>keys.includes(k))&&
    new Set(keys).size===keys.length);
  if(!allowed)return {valid:false,game:g,message:"Choose an exposed king or two exposed cards totaling 13."};
  const next={...g,tableau:[...g.tableau],waste:[...g.waste],removed:[...g.removed]};
  for(const key of keys){
    if(key==="w")next.removed.push(next.waste.pop());
    else{
      const index=Number(key.slice(2));
      next.removed.push(next.tableau[index]);
      next.tableau[index]=null;
    }
  }
  next.won=next.tableau.every(card=>card===null);
  return record(g,next,next.won?"Pyramid cleared! What a lovely game!":
    keys.length===1?"King collected!":"Lovely pair! Thirteen exactly.");
}
export function pyramidDraw(g){
  if(!validPyramid(g)||g.won)return {valid:false,game:g};
  if(g.stock.length){
    const stock=[...g.stock],waste=[...g.waste];
    waste.push(stock.pop());
    return record(g,{...g,stock,waste,draws:g.draws+1},"New card on the waste pile.");
  }
  if(g.waste.length&&g.recycles<MAX_RECYCLES){
    return record(g,{...g,stock:[...g.waste].reverse(),waste:[],
      recycles:g.recycles+1},"Waste recycled. Time for another look!");
  }
  return {valid:false,game:g,message:"No more draws. Find a pair or start a fresh game."};
}
export function pyramidBlocked(g){
  if(!validPyramid(g)||g.won)return false;
  return !pyramidLegalMoves(g).length&&!g.stock.length&&
    !(g.waste.length&&g.recycles<MAX_RECYCLES);
}
export function pyramidHint(g){
  if(!validPyramid(g)||g.won)return null;
  const moves=pyramidLegalMoves(g);
  // Prefer uncovering a card rather than consuming a king from the waste.
  const fromBoard=moves.find(m=>m.cards.some(k=>k.startsWith("t:")));
  if(fromBoard)return {type:"remove",cards:fromBoard.cards};
  if(moves.length)return {type:"remove",cards:moves[0].cards};
  if(g.stock.length)return {type:"draw"};
  if(g.waste.length&&g.recycles<MAX_RECYCLES)return {type:"recycle"};
  return null;
}
export function undoPyramid(g){
  if(!validPyramid(g)||!g.history.length)return {valid:false,game:g};
  const previous=g.history.at(-1);
  return {valid:true,game:{...previous,history:g.history.slice(0,-1)},
    message:"Your last step was undone."};
}
export {MAX_RECYCLES};
