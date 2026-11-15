// TriPeaks Solitaire: three peaks, 28 tableau cards, 23-card stock and one starter waste.
// Cards one rank above/below the waste card may be removed; A and K wrap.
// Entirely deterministic and offline; all actions return new immutable states.
import {shuffleCards,cardRank,STANDARD_SUITS} from "./solitaire.js";

const ALL=STANDARD_SUITS.flatMap(s=>Array.from({length:13},(_,i)=>s.id+"-"+(i+1)));
const SNAPSHOTS=20;
const parents=Array.from({length:28},()=>[]);
const children=Array.from({length:28},()=>[]);
for(let p=0;p<3;p++){
  children[p]=[3+2*p,4+2*p];
}
for(let j=0;j<6;j++){
  const p=Math.floor(j/2),side=j%2;
  children[3+j]=[9+3*p+side,10+3*p+side];
}
for(let j=0;j<9;j++)children[9+j]=[18+j,19+j];
for(let p=0;p<28;p++)for(const c of children[p])parents[c].push(p);

export const TRIPEAKS_ROWS=Object.freeze([
  [0,1,2],
  [3,4,5,6,7,8],
  [9,10,11,12,13,14,15,16,17],
  [18,19,20,21,22,23,24,25,26,27]
]);
export const TRIPEAKS_POSITIONS=Object.freeze(
  Array.from({length:28},(_,i)=>{
    const row=i<3?0:i<9?1:i<18?2:3;
    const index=i-(row===0?0:row===1?3:row===2?9:18);
    const x=row===0?2+3*index:row===1?1.5+Math.floor(index/2)*3+index%2:
      row===2?1+index:0.5+index;
    return Object.freeze({row,column:index,x});
  })
);
export function tripeaksChildren(index){
  return Number.isInteger(index)&&index>=0&&index<28?[...children[index]]:[];
}
function snapshot(g){
  const {history,...rest}=g;return rest;
}
function record(g,next,message){
  const state={...next,moves:g.moves+1,
    history:[...(g.history||[]).slice(-(SNAPSHOTS-1)),snapshot(g)],last:message};
  return {valid:true,game:state,message};
}
export function newTriPeaks(seed=Date.now()){
  const safe=Number.isSafeInteger(seed)&&seed>=0?seed:1;
  const cards=shuffleCards(ALL,safe);
  return {kind:"tripeaks",seed:safe,tableau:cards.slice(0,28),stock:cards.slice(28,51),
    waste:[cards[51]],removed:[],draws:0,moves:0,streak:0,score:0,
    won:false,last:"Tap an uncovered card one rank higher or lower than the waste card.",
    history:[]};
}
export function validTriPeaks(g){
  if(g?.kind!=="tripeaks"||!Number.isSafeInteger(g.seed)||g.seed<0||
    !Array.isArray(g.tableau)||g.tableau.length!==28||
    !Array.isArray(g.stock)||!Array.isArray(g.waste)||g.waste.length<1||
    !Array.isArray(g.removed)||!Array.isArray(g.history)||g.history.length>SNAPSHOTS||
    !Number.isSafeInteger(g.moves)||g.moves<0||
    !Number.isSafeInteger(g.draws)||g.draws<0||g.draws>23||
    !Number.isSafeInteger(g.streak)||g.streak<0||g.streak>28||
    !Number.isSafeInteger(g.score)||g.score<0||g.score>500000||
    typeof g.won!=="boolean"||typeof g.last!=="string")return false;
  const ids=[...g.tableau.filter(Boolean),...g.stock,...g.waste,...g.removed];
  return ids.length===52&&new Set(ids).size===52&&ids.every(id=>ALL.includes(id))&&
    g.won===g.tableau.every(id=>id===null);
}
export function tripeaksExposed(g){
  if(!validTriPeaks(g))return [];
  return g.tableau.flatMap((card,i)=>
    card&&children[i].every(child=>g.tableau[child]===null)?[i]:[]);
}
export function tripeaksAdjacent(a,b){
  if(!a||!b)return false;
  const x=cardRank(a),y=cardRank(b);
  return Math.abs(x-y)===1||x===1&&y===13||x===13&&y===1;
}
export function tripeaksPlayable(g){
  if(!validTriPeaks(g)||g.won)return [];
  const top=g.waste.at(-1);
  return tripeaksExposed(g).filter(i=>tripeaksAdjacent(g.tableau[i],top));
}
export function tripeaksTake(g,index){
  if(!validTriPeaks(g)||!tripeaksPlayable(g).includes(index))
    return {valid:false,game:g,message:"Choose an uncovered card one rank away from the waste."};
  const tableau=[...g.tableau],removed=[...g.removed],waste=[...g.waste];
  waste.push(tableau[index]);
  // A removed tableau card is kept in the waste until the game ends. This matters
  // when all 28 tableau cards are gone and the 52-card uniqueness is checked.
  tableau[index]=null;
  const streak=g.streak+1,score=g.score+100*streak;
  const won=tableau.every(id=>id===null);
  return record(g,{...g,tableau,waste,removed,streak,score,won},won?
    "All three peaks cleared! What a lovely victory!":
    "Nice sequence! "+streak+" cards in a row.");
}
export function tripeaksDraw(g){
  if(!validTriPeaks(g)||g.won||!g.stock.length)
    return {valid:false,game:g,message:"The stock is empty."};
  const stock=[...g.stock],waste=[...g.waste];
  waste.push(stock.pop());
  return record(g,{...g,stock,waste,draws:g.draws+1,streak:0},
    "New waste card. Look for one rank above or below.");
}
export function tripeaksBlocked(g){
  return validTriPeaks(g)&&!g.won&&g.stock.length===0&&tripeaksPlayable(g).length===0;
}
export function tripeaksHint(g){
  if(!validTriPeaks(g)||g.won)return null;
  const playable=tripeaksPlayable(g);
  if(playable.length){
    // Prefer cards which uncover a new card, then improve choices for next move.
    const rankOf=i=>cardRank(g.tableau[i]);
    let best=playable[0],score=-1;
    for(const index of playable){
      const after=[...g.tableau];after[index]=null;
      const exposed=after.flatMap((card,i)=>
        card&&children[i].every(child=>after[child]===null)?[i]:[]);
      const newly=exposed.filter(i=>!tripeaksExposed(g).includes(i)).length;
      const future=exposed.filter(i=>i!==index&&tripeaksAdjacent(after[i],g.tableau[index])).length;
      const value=newly*100+future;
      if(value>score){score=value;best=index;}
    }
    return {type:"take",index:best};
  }
  return g.stock.length?{type:"draw"}:null;
}
export function undoTriPeaks(g){
  if(!validTriPeaks(g)||!g.history.length)return {valid:false,game:g};
  const previous=g.history.at(-1);
  return {valid:true,game:{...previous,history:g.history.slice(0,-1)},
    message:"Your last move was undone."};
}
