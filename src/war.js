// MeekLee War: familiar two-player card battle, Mom versus Pip.
// Independently saved; no timing limits, subscriptions or external assets.
import {shuffleCards,STANDARD_SUITS,cardRank} from "./solitaire.js";
const deck=()=>STANDARD_SUITS.flatMap(s=>Array.from({length:13},(_,i)=>s.id+"-"+(i+1)));
export function newWar(seed=Date.now()) {
  const cards=shuffleCards(deck(),seed);
  return {kind:"war",seed,round:0,piles:[cards.slice(0,26),cards.slice(26)],
    pot:[],lastBattle:null,winner:null,finished:false};
}
export function validWar(g) {
  if(g?.kind!=="war"||!Array.isArray(g.piles)||g.piles.length!==2||
    !g.piles.every(Array.isArray)||!Array.isArray(g.pot)||
    !Number.isInteger(g.round)||g.round<0||g.round>1500)return false;
  const all=[...g.piles.flat(),...g.pot];
  return all.length===52 && new Set(all).size===52 && all.every(id=>
    STANDARD_SUITS.some(s=>id.startsWith(s.id+"-"))&&cardRank(id)>=1&&cardRank(id)<=13);
}
const value=c=>cardRank(c)===1?14:cardRank(c);
export function flipWar(g){
  if(!validWar(g)||g.finished)return {valid:false,game:g};
  const piles=g.piles.map(p=>[...p]),pot=[...g.pot];
  const battles=[],burned=[];
  let winner=null,warCount=0;
  // Each face-up comparison consumes cards. Tie: 3 facedown (or as many as
  // possible while retaining one face-up), then a new face-up card.
  while(true){
    if(!piles[0].length||!piles[1].length){
      winner=piles[0].length?0:piles[1].length?1:null;
      if(winner===null)winner=g.piles[0].length>=g.piles[1].length?0:1;
      break;
    }
    const a=piles[0].shift(),b=piles[1].shift();
    pot.push(a,b);battles.push([a,b]);
    if(value(a)!==value(b)){winner=value(a)>value(b)?0:1;break;}
    warCount++;
    for(let s=0;s<2;s++){
      const n=Math.min(3,Math.max(0,piles[s].length-1));
      for(let i=0;i<n;i++){
        const hidden=piles[s].shift();pot.push(hidden);burned.push(hidden);
      }
    }
    if(!piles[0].length||!piles[1].length){
      winner=piles[0].length?0:piles[1].length?1:
        g.piles[0].length>=g.piles[1].length?0:1;
      break;
    }
    if(warCount>=20){winner=(g.round+1)%2;break;}
  }
  const wonCards=shuffleCards(pot,(g.seed+g.round*911+73)>>>0);
  piles[winner].push(...wonCards);
  const round=g.round+1,finished=!piles[1-winner].length||round>=1500;
  const champion=finished?
    (piles[0].length===piles[1].length?null:(piles[0].length>piles[1].length?0:1)):null;
  return {valid:true,game:{...g,round,piles,pot:[],finished,winner:champion,
    lastBattle:{cards:battles.at(-1),winner,warCount,won:wonCards.length,battles,
      burnedCount:burned.length}},
    message:warCount?"WAR! "+(winner===0?"Mom":"Pip")+" took "+wonCards.length+" cards!":
      (winner===0?"Mom":"Pip")+" took the cards."};
}
