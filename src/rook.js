// MeekLee four-seat partnership trick game, inspired by traditional Rook.
// Kentucky Discard/41-card rules: 5–14 in four colors, a bird trump,
// 9 cards per player, five-card nest, bid 70–120, first partnership to 300.
// Original text/card art. Not affiliated with Hasbro.
import {rngFrom} from "./core.js";
export const ROOK_SUITS=Object.freeze([
  {id:"red",label:"Red",color:"#c54456",mark:"●"},
  {id:"green",label:"Green",color:"#288b60",mark:"◆"},
  {id:"yellow",label:"Yellow",color:"#b07d23",mark:"★"},
  {id:"black",label:"Black",color:"#35465b",mark:"♠"}
]);
export const ROOK_NAMES=["Mom","Willow (bot)","Pip (partner bot)","Fern (bot)"];
export const ROOK_TARGET=300;
export const ROOK_BIRD="bird";
export const rookSuit=card=>card===ROOK_BIRD?"bird":card?.split("-")[0];
export const rookRank=card=>card===ROOK_BIRD?15:Number(card?.split("-")[1]);
export const rookCardPoints=card=>card===ROOK_BIRD?20:
  rookRank(card)===5?5:(rookRank(card)===10||rookRank(card)===14)?10:0;
export const rookTeam=seat=>seat%2===0?0:1;
const deck=()=>[...ROOK_SUITS.flatMap(s=>Array.from({length:10},(_,i)=>s.id+"-"+(i+5))),ROOK_BIRD];
const seedNumber=n=>(Math.floor(Number(n)||1)>>>0)||1;
function shuffle(cards,seed){
  const rng=rngFrom(seed),result=[...cards];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
function deal(seed,scores=[0,0],round=1,dealer=3){
  const cards=shuffle(deck(),seedNumber(seed)),hands=[[],[],[],[]],nest=[];
  let p=0;
  // Deal one card to each player, then one into the nest for five passes.
  for(let i=0;i<5;i++){for(let k=1;k<=4;k++)hands[(dealer+k)%4].push(cards[p++]);nest.push(cards[p++]);}
  for(let i=0;i<4;i++)for(let k=1;k<=4;k++)hands[(dealer+k)%4].push(cards[p++]);
  return {
    kind:"rook",seed:seedNumber(seed),round,dealer,phase:"bid",
    hands,nest,bid:0,bidder:null,passed:[false,false,false,false],turn:(dealer+1)%4,
    trump:null,trick:[],trickWinner:null,points:[0,0],scores:[...scores],
    lastWinner:null,leader:null,winner:null,lastResult:null
  };
}
export function newRook(seed=Date.now()){return deal(seed);}
export function validRook(g){
  if(g?.kind!=="rook"||!Array.isArray(g.hands)||g.hands.length!==4||
    !Array.isArray(g.nest)||!Array.isArray(g.trick)||!Array.isArray(g.points)||
    !Array.isArray(g.scores)||typeof g.phase!=="string")return false;
  const cards=[...g.hands.flat(),...g.nest,...g.trick.map(c=>c.card)];
  return cards.every(c=>c===ROOK_BIRD||ROOK_SUITS.some(s=>s.id===rookSuit(c))&&
    Number.isInteger(rookRank(c))&&rookRank(c)>=5&&rookRank(c)<=14)&&
    new Set(cards).size===cards.length&&cards.length<=41;
}
function finalizeAuction(g) {
  let bidder=g.bidder,bid=g.bid;
  if(bidder===null){bidder=g.dealer;bid=70;}
  return {...g,phase:"nest",bid,bidder,turn:bidder,
    hands:g.hands.map((hand,seat)=>seat===bidder?[...hand,...g.nest]:[...hand]),
    nest:[],passed:[...g.passed]};
}
export function rookBid(g,seat,value){
  if(g?.phase!=="bid"||seat!==g.turn||g.passed[seat])return {valid:false,game:g};
  if(value!=="pass"&&(!Number.isInteger(value)||value<70||value>120||
    value%5!==0||value<=g.bid))return {valid:false,game:g};
  const next={...g,passed:[...g.passed]};
  if(value==="pass")next.passed[seat]=true;
  else{next.bid=value;next.bidder=seat;}
  const active=next.passed.reduce((count,v)=>count+(v?0:1),0);
  if((next.bidder!==null&&active===1)||active===0)
    return {valid:true,game:finalizeAuction(next)};
  let turn=(seat+1)%4;
  while(next.passed[turn])turn=(turn+1)%4;
  next.turn=turn;
  return {valid:true,game:next};
}
export function rookDiscard(g,seat,indices){
  if(g?.phase!=="nest"||seat!==g.bidder||!Array.isArray(indices)||
    indices.length!==5||new Set(indices).size!==5||
    !indices.every(i=>Number.isInteger(i)&&i>=0&&i<g.hands[seat].length)||
    g.hands[seat].length!==14)return {valid:false,game:g};
  const picked=new Set(indices);
  const nest=g.hands[seat].filter((_,i)=>picked.has(i));
  const hands=g.hands.map((hand,i)=>i===seat?hand.filter((_,j)=>!picked.has(j)):[...hand]);
  return {valid:true,game:{...g,hands,nest,phase:"trump",turn:seat}};
}
export function rookTrump(g,seat,color){
  if(g?.phase!=="trump"||g.bidder!==seat||
    !ROOK_SUITS.some(s=>s.id===color))return {valid:false,game:g};
  return {valid:true,game:{...g,trump:color,phase:"play",turn:(g.dealer+1)%4,
    leader:(g.dealer+1)%4,trick:[]}};
}
export function effectiveRookSuit(card,trump){
  return card===ROOK_BIRD?trump:rookSuit(card);
}
export function rookLegalCards(g,seat) {
  if(g?.phase!=="play"||g.turn!==seat||!g.trump)return [];
  const hand=g.hands[seat],led=g.trick[0]?.card;
  if(!led)return hand.map((_,i)=>i);
  const suit=effectiveRookSuit(led,g.trump);
  const matching=hand.map((c,i)=>effectiveRookSuit(c,g.trump)===suit?i:-1).filter(i=>i>=0);
  return matching.length?matching:hand.map((_,i)=>i);
}
function power(card,lead,trump){
  if(card===ROOK_BIRD)return 1000;
  if(rookSuit(card)===trump)return 100+rookRank(card);
  if(rookSuit(card)===lead)return rookRank(card);
  return -1;
}
export function rookTrickWinner(trick,trump){
  if(!trick?.length)return null;
  const lead=effectiveRookSuit(trick[0].card,trump);
  return trick.reduce((best,now)=>power(now.card,lead,trump)>power(best.card,lead,trump)?now:best).seat;
}
export function rookPlay(g,seat,index){
  if(!rookLegalCards(g,seat).includes(index))return {valid:false,game:g};
  const hands=g.hands.map(h=>[...h]),card=hands[seat].splice(index,1)[0];
  const trick=[...g.trick,{seat,card}],done=trick.length===4;
  const winner=done?rookTrickWinner(trick,g.trump):null;
  return {valid:true,game:{...g,hands,trick,
    turn:done?winner:(seat+1)%4,
    trickWinner:winner,phase:done?"trick-done":"play"}};
}
export function rookCollect(g){
  if(g?.phase!=="trick-done"||g.trick.length!==4)return {valid:false,game:g};
  const points=[...g.points],winner=g.trickWinner;
  let score=g.trick.reduce((total,x)=>total+rookCardPoints(x.card),0);
  const over=g.hands.every(hand=>hand.length===0);
  if(over)score+=g.nest.reduce((total,c)=>total+rookCardPoints(c),0);
  points[rookTeam(winner)]+=score;
  if(!over)return {valid:true,game:{
    ...g,points,phase:"play",turn:winner,leader:winner,
    lastWinner:winner,trick:[],trickWinner:null
  }};
  const bidderTeam=rookTeam(g.bidder),scores=[...g.scores],made=points[bidderTeam]>=g.bid;
  scores[bidderTeam]+=made?points[bidderTeam]:-g.bid;
  scores[1-bidderTeam]+=points[1-bidderTeam];
  let gameWinner=null;
  if(Math.max(...scores)>=ROOK_TARGET&&scores[0]!==scores[1])
    gameWinner=scores[0]>scores[1]?0:1;
  return {valid:true,game:{
    ...g,points,scores,phase:gameWinner!==null?"game-over":"round-over",
    winner:gameWinner,turn:null,trick:[],lastWinner:winner,
    lastResult:{bid:g.bid,bidder:g.bidder,teamPoints:points,bidMade:made,
      scored:scores,round:g.round,rookInNest:g.nest.includes(ROOK_BIRD)}
  }};
}
export function nextRookRound(g){
  if(g?.phase!=="round-over")return {valid:false,game:g};
  const dealer=(g.dealer+1)%4,seed=seedNumber(g.seed+0x9e3779b9+g.round*31);
  return {valid:true,game:deal(seed,g.scores,g.round+1,dealer)};
}
function chooseSuit(cards){
  return ROOK_SUITS.map(s=>({
    suit:s.id,
    strength:cards.reduce((total,c)=>total+(rookSuit(c)===s.id?
      3+(rookRank(c)>=11?rookRank(c)-9:0):0),0)
  })).sort((a,b)=>b.strength-a.strength)[0].suit;
}
// Bot logic uses only its own hand and public trick, never hidden opponent cards.
export function rookBotAction(g) {
  if(!validRook(g))return null;
  if(g.phase==="trick-done")return {type:"collect"};
  if(g.phase==="round-over")return {type:"next"};
  const seat=g.turn;if(seat===0||seat===null)return null;
  const hand=g.hands[seat];
  if(g.phase==="bid"){
    const strongestSuit=chooseSuit(hand);
    const high=hand.filter(c=>rookSuit(c)===strongestSuit&&rookRank(c)>=11).length;
    const counters=hand.reduce((sum,c)=>sum+rookCardPoints(c),0);
    const desire=Math.min(105,70+Math.floor((high*4+counters/4)/5)*5);
    const bid=Math.max(70,g.bid+5);
    return bid<=desire?{type:"bid",value:bid}:{type:"bid",value:"pass"};
  }
  if(g.phase==="nest"){
    const suit=chooseSuit(hand);
    const priority=(card)=>card===ROOK_BIRD?1000:
      (rookSuit(card)===suit?100:0)+(rookRank(card)>=12?50:0)+rookCardPoints(card)*6+rookRank(card);
    const indices=hand.map((card,i)=>({i,score:priority(card)}))
      .sort((a,b)=>a.score-b.score).slice(0,5).map(x=>x.i);
    return {type:"discard",indices};
  }
  if(g.phase==="trump")return {type:"trump",color:chooseSuit(hand)};
  if(g.phase==="play"){
    const legal=rookLegalCards(g,seat);
    if(!legal.length)return null;
    const lead=g.trick[0]?.card,leadSuit=effectiveRookSuit(lead,g.trump);
    const teamHolding=g.trick.length>0&&rookTeam(rookTrickWinner(g.trick,g.trump))===rookTeam(seat);
    const candidates=legal.map(index=>{
      const card=hand[index];
      const trickWinner=rookTrickWinner([...g.trick,{seat,card}],g.trump);
      const wins=trickWinner===seat;
      const worth=g.trick.reduce((sum,x)=>sum+rookCardPoints(x.card),0);
      const strength=power(card,leadSuit||rookSuit(card),g.trump);
      return {index,card,wins,
        rating: teamHolding ? -rookCardPoints(card)*1.5-strength*.005 :
          wins ? 30+worth*2-strength*.02 :
          -rookCardPoints(card)*1.3+strength*.001 };
    });
    candidates.sort((a,b)=>b.rating-a.rating||a.index-b.index);
    return {type:"play",index:candidates[0].index};
  }
  return null;
}
export function rookAction(g,action){
  if(!action)return {valid:false,game:g};
  if(action.type==="bid")return rookBid(g,g.turn,action.value);
  if(action.type==="discard")return rookDiscard(g,g.turn,action.indices);
  if(action.type==="trump")return rookTrump(g,g.turn,action.color);
  if(action.type==="play")return rookPlay(g,g.turn,action.index);
  if(action.type==="collect")return rookCollect(g);
  if(action.type==="next")return nextRookRound(g);
  return {valid:false,game:g};
}
