// MeekLee Color Parade: an original matching-color shedding card game.
// Familiar color/number matching, original art/UI, no UNO branding or assets.
// Mom plays against three local, offline computer players.
import {rngFrom} from "./core.js";
export const PARADE_COLORS=Object.freeze([
 {id:"coral",label:"Coral",hex:"#cb4253",symbol:"♥"},
 {id:"ocean",label:"Ocean",hex:"#337bad",symbol:"◆"},
 {id:"leaf",label:"Leaf",hex:"#318a65",symbol:"♣"},
 {id:"sun",label:"Sun",hex:"#a47816",symbol:"★"}
]);
export const PARADE_NAMES=["Mom","Willow (bot)","Pip (bot)","Fern (bot)"];
export const PARADE_TARGET=200;
function paradeDeck(){
  const cards=[];let id=0;
  for(const color of PARADE_COLORS){
    cards.push({id:"p"+id++,color:color.id,type:"number",value:0});
    for(let value=1;value<=9;value++)for(let x=0;x<2;x++)
      cards.push({id:"p"+id++,color:color.id,type:"number",value});
    for(const type of ["skip","reverse","draw2"])for(let x=0;x<2;x++)
      cards.push({id:"p"+id++,color:color.id,type,value:null});
  }
  for(let i=0;i<8;i++)cards.push({id:"p"+id++,color:null,type:"wild",value:null});
  return cards;
}
function shuffle(cards,seed){
  const arr=[...cards],rng=rngFrom(seed);
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(rng()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}
export function newColorParade(seed=Date.now(),scores=[0,0,0,0],round=1){
  const deck=shuffle(paradeDeck(),(seed>>>0)||1);
  const hands=[[],[],[],[]];
  for(let j=0;j<7;j++)for(let p=0;p<4;p++)hands[p].push(deck.pop());
  const start=deck.findIndex(c=>c.type==="number");
  const [top]=deck.splice(start,1);
  return {kind:"parade",seed:(seed>>>0)||1,round,phase:"play",hands,
    deck,discard:[top],activeColor:top.color,turn:0,direction:1,
    drawn:false,passes:0,lastPlay:"Match a color or number to begin.",
    scores:[...scores],winner:null,roundWinner:null};
}
export function validColorParade(g){
  if(g?.kind!=="parade"||!Array.isArray(g.hands)||g.hands.length!==4||
     !Array.isArray(g.deck)||!Array.isArray(g.discard)||!g.discard.length||
     !Array.isArray(g.scores)||g.scores.length!==4)return false;
  const cards=[...g.hands.flat(),...g.deck,...g.discard];
  return cards.length===108 && new Set(cards.map(c=>c.id)).size===108 &&
    cards.every(c=>c&&typeof c.id==="string"&&
      (c.type==="wild"||PARADE_COLORS.some(col=>col.id===c.color)));
}
export function paradePlayable(g,card) {
  if(!card||g?.phase!=="play")return false;
  const top=g.discard.at(-1);
  if(card.type==="wild")return true;
  return card.color===g.activeColor ||
    (card.type==="number"&&top.type==="number"&&card.value===top.value) ||
    (card.type!=="number"&&card.type===top.type);
}
function step(seat,n,direction) {return (seat+n*direction+8*4)%4;}
function scoreOf(card) {return card.type==="wild"?50:
  card.type==="number"?card.value:20;}
function endRound(g,winner){
  const gain=g.hands.reduce((sum,hand,seat)=>seat===winner?sum:
    sum+hand.reduce((total,c)=>total+scoreOf(c),0),0);
  const scores=[...g.scores];scores[winner]+=gain;
  return {...g,phase:scores[winner]>=PARADE_TARGET?"game-over":"round-over",
    winner:scores[winner]>=PARADE_TARGET?winner:null,
    roundWinner:winner,scores,lastPlay:PARADE_NAMES[winner]+" cleared their hand and earned "+gain+" points!"};
}
export function paradePlay(g,seat,index,color=null) {
  if(!validColorParade(g)||g.phase!=="play"||g.turn!==seat ||
    !Number.isInteger(index)||index<0||index>=g.hands[seat].length)return {valid:false,game:g};
  const card=g.hands[seat][index];
  if(!paradePlayable(g,card))return {valid:false,game:g};
  if(card.type==="wild"&&!PARADE_COLORS.some(c=>c.id===color))return {valid:false,game:g};
  const hands=g.hands.map(hand=>[...hand]);
  hands[seat].splice(index,1);
  const next={...g,hands,deck:[...g.deck],discard:[...g.discard,card],
    activeColor:card.type==="wild"?color:card.color,
    direction:card.type==="reverse"?g.direction*-1:g.direction,
    drawn:false,passes:0,
    lastPlay:PARADE_NAMES[seat]+" played "+(card.type==="number"?card.value:card.type)+"."};
  if(!hands[seat].length)return {valid:true,game:endRound(next,seat)};
  if(card.type==="draw2"){
    next.turn=step(seat,2,next.direction);
    const penalized=step(seat,1,next.direction);
    next.hands[penalized]=drawTo(next,2,penalized);
    next.lastPlay=PARADE_NAMES[seat]+" played +2! "+PARADE_NAMES[penalized]+" draws two and misses a turn.";
  }else if(card.type==="skip"){
    next.turn=step(seat,2,next.direction);
    next.lastPlay=PARADE_NAMES[seat]+" skipped the next player.";
  }else{
    next.turn=step(seat,1,next.direction);
    if(card.type==="reverse")next.lastPlay=PARADE_NAMES[seat]+" reversed the direction!";
    if(card.type==="wild")next.lastPlay=PARADE_NAMES[seat]+" changed color to "+color+".";
  }
  return {valid:true,game:next};
}
function replenish(g){
  if(g.deck.length||g.discard.length<=1)return;
  const top=g.discard.pop();
  g.deck=shuffle(g.discard,(g.seed+g.round*7919+g.scores.reduce((a,b)=>a+b,0)+g.hands.flat().length*239)>>>0);
  g.discard=[top];
}
function drawTo(g,count,seat){
  const hand=[...g.hands[seat]];
  for(let i=0;i<count;i++){
    replenish(g);
    if(!g.deck.length)break;
    hand.push(g.deck.pop());
  }
  return hand;
}
export function paradeDraw(g,seat){
  if(!validColorParade(g)||g.phase!=="play"||g.turn!==seat||g.drawn)return {valid:false,game:g};
  const next={...g,hands:g.hands.map(h=>[...h]),deck:[...g.deck],discard:[...g.discard]};
  const before=next.hands[seat].length;
  next.hands[seat]=drawTo(next,1,seat);
  next.drawn=true;
  if(next.hands[seat].length===before){
    // Empty draw pile and no cards to recycle: pass without locking up.
    const stepResult=paradePass(next,seat);
    return {valid:true,game:stepResult.game};
  }
  next.lastPlay=PARADE_NAMES[seat]+" drew a card. Play it if it matches, or pass.";
  return {valid:true,game:next};
}
export function paradePass(g,seat){
  if(!validColorParade(g)||g.phase!=="play"||g.turn!==seat||!g.drawn)return {valid:false,game:g};
  const next={...g,drawn:false,turn:step(seat,1,g.direction),
    passes:g.passes+1,lastPlay:PARADE_NAMES[seat]+" passed."};
  if(next.passes>=4 && g.deck.length===0 && g.discard.length<=1){
    const least=next.hands.map((h,i)=>({i,len:h.length})).sort((a,b)=>a.len-b.len)[0];
    return {valid:true,game:endRound(next,least.i)};
  }
  return {valid:true,game:next};
}
export function paradeBotAction(g){
  if(g?.phase!=="play"||g.turn===0)return null;
  const hand=g.hands[g.turn],legal=hand.map((card,index)=>({card,index}))
    .filter(({card})=>paradePlayable(g,card));
  if(legal.length){
    const counts=Object.fromEntries(PARADE_COLORS.map(c=>
      [c.id,hand.filter(x=>x.color===c.id).length]));
    const bestColor=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
    legal.sort((a,b)=>{
      const score=c=>c.type==="draw2"?45:c.type==="skip"?37:
        c.type==="reverse"?29:c.type==="wild"?12:c.value||0;
      return score(b.card)-score(a.card) || a.index-b.index;
    });
    const chosen=legal[0];
    return {type:"play",index:chosen.index,color:chosen.card.type==="wild"?bestColor:null};
  }
  return g.drawn?{type:"pass"}:{type:"draw"};
}
export function paradeAction(g,action){
  if(!action)return {valid:false,game:g};
  if(action.type==="play")return paradePlay(g,g.turn,action.index,action.color);
  if(action.type==="draw")return paradeDraw(g,g.turn);
  if(action.type==="pass")return paradePass(g,g.turn);
  if(action.type==="next"&&g.phase==="round-over")
    return {valid:true,game:newColorParade(g.seed+g.round*127,g.scores,g.round+1)};
  return {valid:false,game:g};
}
