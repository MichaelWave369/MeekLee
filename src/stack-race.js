// Original numbered-card race inspired by the familiar 1–12 stockpile game.
// Distinct artwork/name; no Skip-Bo brand or assets used.
import {shuffleCards} from "./solitaire.js";
const deck=()=>[
  ...Array.from({length:12},(_,rank)=>Array.from({length:12},(_,copy)=>"n"+(rank+1)+"-"+copy)).flat(),
  ...Array.from({length:18},(_,i)=>"wild-"+i)
];
export const stackNumber=card=>card?.startsWith("wild-")?0:Number(card?.match(/^n(\d+)-/)?.[1]);
export const stackIsWild=card=>stackNumber(card)===0;
export function newStack(seed=Date.now(),stockSize=10){
  const pile=shuffleCards(deck(),seed);
  const stock=[[],[]],hand=[[],[]];
  for(let i=0;i<stockSize;i++)for(let player=0;player<2;player++)stock[player].push(pile.pop());
  for(let player=0;player<2;player++)while(hand[player].length<5)hand[player].push(pile.pop());
  return {kind:"stack",seed,stockSize,draw:pile,completed:[],
    stock,hand,discard:[[[],[],[],[]],[[],[],[],[]]],
    build:[[],[],[],[]],turn:0,turns:1,moves:0,winner:null,last:"Your turn! Build from 1 to 12."};
}
export function validStack(g){
  if(g?.kind!=="stack"||![10,30].includes(g.stockSize)||g.turn!==0&&g.turn!==1||
    !Array.isArray(g.stock)||g.stock.length!==2||
    !Array.isArray(g.hand)||g.hand.length!==2||
    !Array.isArray(g.discard)||g.discard.length!==2||
    !Array.isArray(g.build)||g.build.length!==4||
    !Array.isArray(g.draw)||!Array.isArray(g.completed))return false;
  if(g.stock.some(p=>!Array.isArray(p))||g.hand.some(p=>!Array.isArray(p)||p.length>5)||
    g.discard.some(p=>!Array.isArray(p)||p.length!==4||p.some(q=>!Array.isArray(q)))||
    g.build.some(p=>!Array.isArray(p)||p.length>=12||p.some((c,i)=>
      !c||typeof c.id!=="string"||c.value!==i+1)))return false;
  const cards=[...g.stock.flat(),...g.hand.flat(),...g.discard.flat(2),
    ...g.build.flat().map(c=>c.id),...g.draw,...g.completed];
  return cards.length===162&&new Set(cards).size===162 &&
    cards.every(c=>typeof c==="string"&&(c.startsWith("wild-")||stackNumber(c)>=1&&stackNumber(c)<=12));
}
function clone(g){return {...g,draw:[...g.draw],completed:[...g.completed],
  stock:g.stock.map(a=>[...a]),hand:g.hand.map(a=>[...a]),
  discard:g.discard.map(p=>p.map(a=>[...a])),build:g.build.map(a=>a.map(c=>({...c})))};
}
function replenish(g,player){
  while(g.hand[player].length<5){
    if(!g.draw.length&&g.completed.length){
      g.draw=shuffleCards(g.completed,(g.seed+g.moves*71+g.turns*13+3)>>>0);
      g.completed=[];
    }
    if(!g.draw.length)break;
    g.hand[player].push(g.draw.pop());
  }
}
function cardAt(g,source,player){
  if(source?.zone==="stock")return g.stock[player].at(-1);
  if(source?.zone==="hand"&&Number.isInteger(source.index))
    return g.hand[player][source.index];
  if(source?.zone==="discard"&&Number.isInteger(source.index))
    return g.discard[player][source.index]?.at(-1);
  return null;
}
export function playableStacks(g,source){
  if(!validStack(g)||g.winner!==null)return [];
  const card=cardAt(g,source,g.turn);
  if(!card)return [];
  return g.build.flatMap((pile,index)=>{
    const expected=pile.length+1;
    return expected<=12&&(stackIsWild(card)||stackNumber(card)===expected)?[index]:[];
  });
}
function removeCard(g,source,player){
  if(source.zone==="stock")return g.stock[player].pop();
  if(source.zone==="hand")return g.hand[player].splice(source.index,1)[0];
  if(source.zone==="discard")return g.discard[player][source.index].pop();
}
export function playStack(g,source,pileIndex){
  if(!validStack(g)||g.winner!==null||!Number.isInteger(pileIndex)||
    !playableStacks(g,source).includes(pileIndex))return {valid:false,game:g};
  const next=clone(g),player=g.turn;
  const card=removeCard(next,source,player);
  const value=next.build[pileIndex].length+1;
  next.build[pileIndex].push({id:card,value});
  next.moves++;
  next.last=(player===0?"Mom":"Pip")+" placed "+value+" on pile "+(pileIndex+1)+".";
  if(next.build[pileIndex].length===12){
    next.completed.push(...next.build[pileIndex].map(c=>c.id));
    next.build[pileIndex]=[];
    next.last+=" Twelve complete! Pile cleared.";
  }
  if(!next.stock[player].length){
    next.winner=player;
    next.last=(player===0?"You win!":"Pip wins this time!")+" Stockpile cleared!";
  }else if(!next.hand[player].length)replenish(next,player);
  return {valid:true,game:next};
}
export function discardStack(g,handIndex,pileIndex){
  if(!validStack(g)||g.winner!==null||!Number.isInteger(handIndex)||
    !Number.isInteger(pileIndex)||pileIndex<0||pileIndex>=4||
    handIndex<0||handIndex>=g.hand[g.turn].length)return {valid:false,game:g};
  const next=clone(g),player=g.turn;
  next.discard[player][pileIndex].push(next.hand[player].splice(handIndex,1)[0]);
  next.turn=1-player;next.turns++;next.moves++;
  replenish(next,next.turn);
  next.last=(player===0?"Mom":"Pip")+" finished their turn.";
  return {valid:true,game:next};
}
export function stackBotTurn(g){
  if(!validStack(g)||g.turn!==1||g.winner!==null)return {valid:false,game:g};
  let next=g,safety=0;
  while(safety++<120){
    const sources=[
      {zone:"stock"},
      ...next.discard[1].map((_,index)=>({zone:"discard",index})),
      ...next.hand[1].map((_,index)=>({zone:"hand",index}))
    ];
    let chosen=null;
    for(const source of sources){
      const targets=playableStacks(next,source);
      if(targets.length){chosen={source,pile:targets[0]};break;}
    }
    if(!chosen)break;
    const result=playStack(next,chosen.source,chosen.pile);
    if(!result.valid)break;
    next=result.game;
    if(next.winner!==null)return {valid:true,game:next};
  }
  const hand=next.hand[1];
  if(!hand.length)return {valid:false,game:next};
  // Prefer putting a low numeral on an empty discard pile (easy to replay).
  const low=hand.map((c,index)=>({index,n:stackIsWild(c)?99:stackNumber(c)}))
    .sort((a,b)=>a.n-b.n)[0].index;
  const empty=next.discard[1].findIndex(p=>!p.length);
  const pile=empty>=0?empty:next.discard[1].map((p,index)=>({index,n:stackNumber(p.at(-1))||99}))
    .sort((a,b)=>b.n-a.n)[0].index;
  return discardStack(next,low,pile);
}
