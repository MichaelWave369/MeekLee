// MeekLee Card Corner: original Klondike Solitaire engine, draw-one.
// Seven tableau columns, four suit foundations, unlimited stock recycling.
// All actions are immutable and deterministic for saved games and testing.
import {rngFrom} from "./core.js";

export const STANDARD_SUITS = Object.freeze([
  {id:"S",mark:"♠",name:"Spades",red:false},
  {id:"H",mark:"♥",name:"Hearts",red:true},
  {id:"D",mark:"♦",name:"Diamonds",red:true},
  {id:"C",mark:"♣",name:"Clubs",red:false}
]);
export function cardSuit(id){return String(id).split("-")[0];}
export function cardRank(id){return Number(String(id).split("-")[1]);}
export function cardRed(id){return cardSuit(id)==="H"||cardSuit(id)==="D";}
export function cardLabel(id){
  if (!id)return "";
  const rank=cardRank(id);
  return (rank===1?"A":rank===11?"J":rank===12?"Q":rank===13?"K":String(rank)) +
    (STANDARD_SUITS.find(s=>s.id===cardSuit(id))?.mark||"");
}
export function shuffleCards(cards,seed) {
  const rng=rngFrom(seed), next=[...cards];
  for(let i=next.length-1;i>0;i--){
    const j=Math.floor(rng()*(i+1));
    [next[i],next[j]]=[next[j],next[i]];
  }
  return next;
}
const allCards=()=>STANDARD_SUITS.flatMap(s=>Array.from({length:13},(_,i)=>s.id+"-"+(i+1)));
export function newSolitaire(seed=Date.now()){
  const cards=shuffleCards(allCards(),seed),tableau=[];
  let p=0;
  for(let column=0;column<7;column++){
    const down=cards.slice(p,p+column);p+=column;
    tableau.push({down,up:[cards[p++]]});
  }
  return {
    kind:"solitaire",seed,tableau,stock:cards.slice(p),waste:[],
    foundations:Object.fromEntries(STANDARD_SUITS.map(s=>[s.id,[]])),
    moves:0,draws:0,won:false,history:[]
  };
}
function snapshot(g){
  const {history,...state}=g;
  return state;
}
function finish(previous,next,label){
  next.moves=previous.moves+1;
  next.won=STANDARD_SUITS.every(s=>next.foundations[s.id].length===13);
  next.history=[...(previous.history||[]).slice(-14),snapshot(previous)];
  return {valid:true,game:next,message:label};
}
function clone(g){
  return {...g,stock:[...g.stock],waste:[...g.waste],
    tableau:g.tableau.map(c=>({down:[...c.down],up:[...c.up]})),
    foundations: Object.fromEntries(STANDARD_SUITS.map(s => [s.id, [...(g.foundations[s.id] || [])]]))};
}
export function validSolitaire(g){
  if(g?.kind!=="solitaire"||!Array.isArray(g.tableau)||g.tableau.length!==7||
    !Array.isArray(g.stock)||!Array.isArray(g.waste)||!g.foundations)return false;
  const piles=[g.stock,g.waste,...g.tableau.flatMap(c=>[c.down,c.up]),
    ...STANDARD_SUITS.map(s=>g.foundations[s.id])];
  if(piles.some(p=>!Array.isArray(p)))return false;
  const ids=piles.flat();
  return ids.length===52 && new Set(ids).size===52 &&
    ids.every(id=>STANDARD_SUITS.some(s=>s.id===cardSuit(id)) &&
      Number.isInteger(cardRank(id))&&cardRank(id)>=1&&cardRank(id)<=13);
}
export function drawSolitaire(g){
  if(!validSolitaire(g)||g.won)return {valid:false,game:g};
  const next=clone(g);
  let label="Drew a card";
  if(next.stock.length){
    next.waste.push(next.stock.pop());next.draws=(g.draws||0)+1;
  }else if(next.waste.length){
    next.stock=next.waste.reverse();next.waste=[];
    label="Turned over the draw pile";
  }else return {valid:false,game:g};
  return finish(g,next,label);
}
function sourceCards(g,from){
  if(!from)return null;
  if(from.zone==="waste"){
    return g.waste.length ? [g.waste.at(-1)] : null;
  }
  if(from.zone==="foundation"){
    const pile=g.foundations[from.suit];
    return pile?.length ? [pile.at(-1)] : null;
  }
  if(from.zone==="tableau"&&Number.isInteger(from.column)&&
     from.column>=0&&from.column<7){
    const up=g.tableau[from.column].up;
    const index=from.index??up.length-1;
    if(!Number.isInteger(index)||index<0||index>=up.length)return null;
    const tail=up.slice(index);
    for(let i=0;i<tail.length-1;i++){
      if(cardRank(tail[i])!==cardRank(tail[i+1])+1 ||
        cardRed(tail[i])===cardRed(tail[i+1]))return null;
    }
    return tail;
  }
  return null;
}
function removeSource(next,from,count){
  if(from.zone==="waste")next.waste.pop();
  if(from.zone==="foundation")next.foundations[from.suit].pop();
  if(from.zone==="tableau"){
    const pile=next.tableau[from.column];
    pile.up.splice(pile.up.length-count,count);
    if(!pile.up.length&&pile.down.length)pile.up.push(pile.down.pop());
  }
}
export function solitaireMoves(g,from){
  const cards=sourceCards(g,from);
  if(!cards||!cards.length)return [];
  const destinations=[];
  if(cards.length===1){
    const suit=cardSuit(cards[0]);
    const foundation=g.foundations[suit];
    if(cardRank(cards[0])===foundation.length+1 && !(from.zone==="foundation"&&from.suit===suit))
      destinations.push({zone:"foundation",suit});
  }
  g.tableau.forEach((pile,column)=>{
    if(from.zone==="tableau"&&from.column===column)return;
    const target=pile.up.at(-1);
    if(!target ? cardRank(cards[0])===13 :
      cardRank(target)===cardRank(cards[0])+1&&cardRed(target)!==cardRed(cards[0]))
      destinations.push({zone:"tableau",column});
  });
  return destinations;
}
export function moveSolitaire(g,from,to){
  if(!validSolitaire(g)||g.won)return {valid:false,game:g};
  const cards=sourceCards(g,from);
  if(!cards?.length)return {valid:false,game:g};
  const allowed=solitaireMoves(g,from);
  if(!allowed.some(d=>d.zone===to?.zone &&
    (d.zone==="tableau"?d.column===to.column:d.suit===to.suit)))return {valid:false,game:g};
  const next=clone(g);
  removeSource(next,from,cards.length);
  if(to.zone==="foundation")next.foundations[to.suit].push(cards[0]);
  else next.tableau[to.column].up.push(...cards);
  return finish(g,next,to.zone==="foundation"?"Beautiful! A card went home.":"Lovely card move!");
}
export function autoSolitaire(g,from=null){
  if(!validSolitaire(g))return {valid:false,game:g};
  const sources=from?[from]:[
    {zone:"waste"},...g.tableau.map((_,column)=>({zone:"tableau",column}))
  ];
  for(const source of sources){
    const dest=solitaireMoves(g,source).find(x=>x.zone==="foundation");
    if(dest)return moveSolitaire(g,source,dest);
  }
  return {valid:false,game:g,message:"No card can go home yet."};
}
export function solitaireHint(g){
  for(const source of [{zone:"waste"},...g.tableau.flatMap((pile,column)=>
    pile.up.map((_,index)=>({zone:"tableau",column,index})))]){
    const moves=solitaireMoves(g,source);
    if(moves.length)return {from:source,to:moves[0]};
  }
  return g.stock.length||g.waste.length?{type:"draw"}:null;
}
export function undoSolitaire(g){
  if(!validSolitaire(g)||!g.history?.length)return {valid:false,game:g};
  const previous=g.history.at(-1);
  return {valid:true,game:{...previous,history:g.history.slice(0,-1)},message:"Last move undone."};
}
