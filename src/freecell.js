// FreeCell Solitaire: a full 52-card, four-cell, four-foundation game.
// All tableau cards start face up. Sequence transfers obey the real free-cell
// and empty-column supermove capacity; no paid hints, timers, or online services.
import {shuffleCards,cardRank,cardSuit,cardRed,STANDARD_SUITS} from "./solitaire.js";

const SUITS=STANDARD_SUITS.map(s=>s.id);
const ALL=STANDARD_SUITS.flatMap(s=>
  Array.from({length:13},(_,i)=>s.id+"-"+(i+1)));
const CARD_SET=new Set(ALL);
const HISTORY_LIMIT=20;
export const FREECELL_COLUMNS=8;
export const FREECELL_CELLS=4;

function snapshot(game){
  const {history,...state}=game;
  return state;
}
function copy(game){
  return {...game,tableau:game.tableau.map(c=>[...c]),
    cells:[...game.cells],
    foundations:Object.fromEntries(SUITS.map(s=>[s,[...game.foundations[s]]]))};
}
function complete(g){
  return SUITS.every(s=>g.foundations[s].length===13);
}
function finished(before,next,message){
  next.moves=before.moves+1;
  next.won=complete(next);
  next.history=[...(before.history||[]).slice(-(HISTORY_LIMIT-1)),snapshot(before)];
  next.last=next.won?"All four foundations complete. Beautifully played!":message;
  return {valid:true,game:next,message:next.last};
}
function alternatingDescending(upper,lower){
  return cardRank(upper)===cardRank(lower)+1 &&
    cardRed(upper)!==cardRed(lower);
}
export function newFreeCell(seed=Date.now()){
  const safe=Number.isSafeInteger(seed)&&seed>=0?seed:1;
  const deck=shuffleCards(ALL,safe);
  const tableau=Array.from({length:8},()=>[]);
  deck.forEach((card,i)=>tableau[i%8].push(card));
  return {kind:"freecell",seed:safe,tableau,cells:[null,null,null,null],
    foundations:Object.fromEntries(SUITS.map(s=>[s,[]])),
    moves:0,won:false,
    last:"Build alternating colors down in the columns and suits up on the foundations.",
    history:[]};
}
export function validFreeCell(g){
  if(g?.kind!=="freecell"||!Number.isSafeInteger(g.seed)||g.seed<0||
    !Array.isArray(g.tableau)||g.tableau.length!==8||
    !g.tableau.every(Array.isArray)||
    !Array.isArray(g.cells)||g.cells.length!==4||
    !g.foundations||typeof g.foundations!=="object"||
    !Array.isArray(g.history)||g.history.length>HISTORY_LIMIT||
    !Number.isSafeInteger(g.moves)||g.moves<0||
    typeof g.won!=="boolean"||typeof g.last!=="string")return false;
  const piles=[...g.tableau,g.cells.filter(Boolean)];
  for(const s of SUITS){
    const cards=g.foundations[s];
    if(!Array.isArray(cards)||cards.length>13||
      !cards.every((card,i)=>cardSuit(card)===s&&cardRank(card)===i+1))
      return false;
    piles.push(cards);
  }
  const cards=piles.flat();
  return cards.length===52&&new Set(cards).size===52&&
    cards.every(card=>CARD_SET.has(card))&&g.won===complete(g);
}
export function freeCellCapacity(g,to){
  if(!validFreeCell(g))return 0;
  const spare=g.cells.filter(x=>x===null).length;
  const empty=g.tableau.filter(c=>c.length===0).length;
  const target=typeof to==="string"&&/^t[0-7]$/.test(to)?
    Number(to.slice(1)):null;
  const reserve=target!==null&&g.tableau[target].length===0?1:0;
  return (spare+1)*(2**Math.max(0,empty-reserve));
}
function foundationAllowed(g,card){
  const s=cardSuit(card);
  return cardRank(card)===g.foundations[s].length+1;
}
function tableauAllowed(g,top,to){
  const stack=g.tableau[to];
  return stack.length===0||alternatingDescending(stack.at(-1),top);
}
export function freeCellMoves(g){
  if(!validFreeCell(g)||g.won)return [];
  const moves=[];
  for(let i=0;i<8;i++){
    const col=g.tableau[i];
    if(!col.length)continue;
    for(let start=col.length-1;start>=0;start--){
      if(start<col.length-1&&!alternatingDescending(col[start],col[start+1]))
        break;
      const size=col.length-start,top=col[start],single=size===1;
      if(single){
        if(foundationAllowed(g,top))
          moves.push({from:"t"+i,start,to:"f"+cardSuit(top),length:1});
        for(let cell=0;cell<4;cell++)
          if(g.cells[cell]===null)
            moves.push({from:"t"+i,start,to:"c"+cell,length:1});
      }
      for(let to=0;to<8;to++){
        if(to===i||!tableauAllowed(g,top,to)||size>freeCellCapacity(g,"t"+to))
          continue;
        // Moving an entire pile between two empty-backed columns is pointless.
        if(start===0&&g.tableau[to].length===0)continue;
        moves.push({from:"t"+i,start,to:"t"+to,length:size});
      }
    }
  }
  for(let i=0;i<4;i++){
    const card=g.cells[i];
    if(card===null)continue;
    if(foundationAllowed(g,card))
      moves.push({from:"c"+i,start:0,to:"f"+cardSuit(card),length:1});
    for(let to=0;to<8;to++)
      if(tableauAllowed(g,card,to))
        moves.push({from:"c"+i,start:0,to:"t"+to,length:1});
  }
  return moves;
}
export function freeCellMove(g,from,start,to){
  if(!validFreeCell(g)||!Number.isInteger(start)||typeof from!=="string"||
    typeof to!=="string"||
    !freeCellMoves(g).some(m=>m.from===from&&m.start===start&&m.to===to))
    return {valid:false,game:g,
      message:"That move doesn't fit. Build alternating colors or choose a free cell."};
  const next=copy(g),fromType=from[0],fromIndex=Number(from.slice(1));
  const moving=fromType==="c"?
    [next.cells[fromIndex]]:
    next.tableau[fromIndex].splice(start);
  if(fromType==="c")next.cells[fromIndex]=null;
  if(to[0]==="t")next.tableau[Number(to.slice(1))].push(...moving);
  else if(to[0]==="c")next.cells[Number(to.slice(1))]=moving[0];
  else next.foundations[to.slice(1)].push(moving[0]);
  return finished(g,next,
    moving.length>1?"Nice sequence! "+moving.length+" cards moved.":
    to[0]==="f"?"Another card home on the foundation!":"Lovely card move!");
}
export function freeCellHint(g){
  if(!validFreeCell(g)||g.won)return null;
  const moves=freeCellMoves(g);
  if(!moves.length)return null;
  const sorted=moves.map(m=>{
    const fromFoundation=m.to[0]==="f";
    const makesColumnEmpty=m.from[0]==="t"&&m.start===0;
    const usefulStack=m.to[0]==="t"&&g.tableau[Number(m.to.slice(1))].length>0;
    return {m,rank:(fromFoundation?10000:0)+(makesColumnEmpty?500:0)+
      (usefulStack?80:0)+(m.length>1?m.length*10:0)+
      (m.to[0]==="c"?-100:0)};
  }).sort((a,b)=>b.rank-a.rank);
  return sorted[0].m;
}
export function freeCellBlocked(g){
  return validFreeCell(g)&&!g.won&&freeCellMoves(g).length===0;
}
export function undoFreeCell(g){
  if(!validFreeCell(g)||!g.history.length)return {valid:false,game:g};
  const previous=g.history.at(-1);
  return {valid:true,game:{...previous,history:g.history.slice(0,-1)},
    message:"Your last move was undone."};
}
export {alternatingDescending as freeCellAlternating};
