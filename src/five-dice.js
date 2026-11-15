// MeekLee's original Five Dice game. Familiar 13-row yacht-dice rules, no paid assets.
// Pure state transitions allow offline play, save/resume and deterministic tests.
export const FIVE_DICE_CATEGORIES = Object.freeze([
  {id:"ones",label:"Ones",section:"upper",face:1},
  {id:"twos",label:"Twos",section:"upper",face:2},
  {id:"threes",label:"Threes",section:"upper",face:3},
  {id:"fours",label:"Fours",section:"upper",face:4},
  {id:"fives",label:"Fives",section:"upper",face:5},
  {id:"sixes",label:"Sixes",section:"upper",face:6},
  {id:"threeKind",label:"Three of a Kind",section:"lower"},
  {id:"fourKind",label:"Four of a Kind",section:"lower"},
  {id:"fullHouse",label:"Full House",section:"lower"},
  {id:"smallStraight",label:"Small Straight",section:"lower"},
  {id:"largeStraight",label:"Large Straight",section:"lower"},
  {id:"fiveKind",label:"Five Dice!",section:"lower"},
  {id:"chance",label:"Chance",section:"lower"}
]);
const UPPER=FIVE_DICE_CATEGORIES.filter(c=>c.section==="upper");
const LOWER=FIVE_DICE_CATEGORIES.filter(c=>c.section==="lower");
const IDS=FIVE_DICE_CATEGORIES.map(c=>c.id);
const numberId=face=>UPPER[face-1]?.id;
const blank=()=>[null,null,null,null,null];
const noHolds=()=>[false,false,false,false,false];
const seedValue=seed=>(Number.isFinite(seed)?(Math.trunc(seed)>>>0):1)||1;
export function newFiveDice(seed=Date.now(),mode="pip"){
  const random=seedValue(seed);
  return {kind:"five-dice",seed:random,rng:random,mode:mode==="solo"?"solo":"pip",
    scores:[{},{}],bonuses:[0,0],turn:0,rolls:0,dice:blank(),held:noHolds(),
    turns:0,finished:false,winner:null,last:"Your turn! Roll five dice.",
    lastPip:null};
}
export function validFiveDice(g){
  if(g?.kind!=="five-dice"||!["solo","pip"].includes(g.mode)||
    !Number.isInteger(g.seed)||g.seed<1||g.seed>0xffffffff||
    !Number.isInteger(g.rng)||g.rng<0||g.rng>0xffffffff||
    ![0,1].includes(g.turn)||(g.mode==="solo"&&g.turn!==0)||
    !Number.isInteger(g.rolls)||g.rolls<0||g.rolls>3||
    !Array.isArray(g.dice)||g.dice.length!==5||
    g.dice.some(d=>g.rolls===0?d!==null:!Number.isInteger(d)||d<1||d>6)||
    !Array.isArray(g.held)||g.held.length!==5||
    g.held.some(h=>typeof h!=="boolean")||
    (g.rolls===0&&g.held.some(Boolean))||
    !Array.isArray(g.scores)||g.scores.length!==2||
    !Array.isArray(g.bonuses)||g.bonuses.length!==2||
    g.bonuses.some(b=>!Number.isInteger(b)||b<0||b>13)||
    !Number.isInteger(g.turns)||g.turns<0||g.turns>(g.mode==="solo"?13:26)||
    typeof g.finished!=="boolean"||
    ![null,0,1,"tie"].includes(g.winner)||
    typeof g.last!=="string")return false;
  for(const score of g.scores){
    if(!score||typeof score!=="object"||Array.isArray(score))return false;
    if(Object.keys(score).some(k=>!IDS.includes(k)||
      !Number.isInteger(score[k])||score[k]<0||score[k]>50))return false;
  }
  if(g.mode==="solo"&&Object.keys(g.scores[1]).length)return false;
  if(Object.keys(g.scores[0]).length+Object.keys(g.scores[1]).length!==g.turns)return false;
  if(g.finished&&g.winner===null)return false;
  if(!g.finished&&g.winner!==null)return false;
  return true;
}
function nextRandom(rng){
  const state=(Math.imul(rng,1664525)+1013904223)>>>0;
  return {rng:state,face:Math.floor(state/4294967296*6)+1};
}
export function rollFiveDice(g){
  if(!validFiveDice(g)||g.finished||g.rolls>=3||
    (g.rolls>0&&g.held.every(Boolean)))return {valid:false,game:g};
  let rng=g.rng;
  const dice=g.dice.map((die,i)=>{
    if(g.rolls>0&&g.held[i])return die;
    const value=nextRandom(rng);rng=value.rng;return value.face;
  });
  const next={...g,dice,rng,rolls:g.rolls+1,
    last:g.rolls===2?"Last roll! Pick a scorecard row.":
      "Choose dice to hold, roll again, or score now."};
  return {valid:true,game:next};
}
export function holdFiveDie(g,index){
  if(!validFiveDice(g)||g.finished||g.rolls===0||g.rolls===3||
    !Number.isInteger(index)||index<0||index>=5)return {valid:false,game:g};
  return {valid:true,game:{...g,held:g.held.map((h,i)=>i===index?!h:h)}};
}
const tallies=dice=>Array.from({length:6},(_,i)=>dice.filter(x=>x===i+1).length);
const isFive=dice=>dice.length===5&&dice.every(x=>x===dice[0]);
function isRepeatBonus(g){
  return g.rolls>0&&isFive(g.dice)&&g.scores[g.turn].fiveKind===50;
}
export function availableFiveDiceCategories(g){
  if(!validFiveDice(g)||g.finished||g.rolls===0)return [];
  const sheet=g.scores[g.turn];
  const open=IDS.filter(id=>!Object.hasOwn(sheet,id));
  if(!isRepeatBonus(g))return open;
  const forced=numberId(g.dice[0]);
  if(open.includes(forced))return [forced];
  const lower=LOWER.map(c=>c.id).filter(id=>open.includes(id));
  return lower.length?lower:open;
}
export function fiveDicePreview(g,id){
  if(!validFiveDice(g)||g.rolls===0||!IDS.includes(id))return 0;
  const dice=g.dice,counts=tallies(dice),sum=dice.reduce((a,b)=>a+b,0);
  const upper=UPPER.find(c=>c.id===id);
  if(upper)return counts[upper.face-1]*upper.face;
  const repeated=Math.max(...counts);
  const joker=isRepeatBonus(g)&&
    Object.hasOwn(g.scores[g.turn],numberId(dice[0]));
  const distinct=[...new Set(dice)].sort((a,b)=>a-b);
  const straight=(length)=>[1,2,3].slice(0,7-length).some(start=>
    Array.from({length},(_,i)=>start+i).every(v=>distinct.includes(v)));
  if(id==="threeKind")return repeated>=3?sum:0;
  if(id==="fourKind")return repeated>=4?sum:0;
  if(id==="fullHouse")return joker?25:
    counts.includes(3)&&counts.includes(2)?25:0;
  if(id==="smallStraight")return joker||straight(4)?30:0;
  if(id==="largeStraight")return joker||straight(5)?40:0;
  if(id==="fiveKind")return isFive(dice)?50:0;
  if(id==="chance")return sum;
  return 0;
}
export function fiveDiceTotals(g,player=0){
  if(!validFiveDice(g)||![0,1].includes(player))return null;
  const sheet=g.scores[player];
  const upper=UPPER.reduce((sum,c)=>sum+(sheet[c.id]||0),0);
  const lower=LOWER.reduce((sum,c)=>sum+(sheet[c.id]||0),0);
  const upperBonus=upper>=63?35:0,extraBonus=g.bonuses[player]*100;
  return {upper,upperBonus,lower,extraBonus,
    total:upper+upperBonus+lower+extraBonus,
    filled:Object.keys(sheet).length};
}
export function scoreFiveDice(g,id){
  if(!validFiveDice(g)||g.finished||g.rolls===0||
    !availableFiveDiceCategories(g).includes(id))return {valid:false,game:g};
  const player=g.turn,points=fiveDicePreview(g,id);
  const bonus=isRepeatBonus(g)?1:0;
  const scores=g.scores.map((s,i)=>i===player?{...s,[id]:points}:{...s});
  const bonuses=g.bonuses.map((count,i)=>i===player?count+bonus:count);
  const turns=g.turns+1;
  const complete=scores.every((s,i)=>i===0||g.mode==="pip"?
    Object.keys(s).length===13:true);
  let winner=null;
  if(complete){
    const proxy={...g,scores,bonuses,turns};
    const mom=fiveDiceTotals(proxy,0).total;
    const pip=g.mode==="pip"?fiveDiceTotals(proxy,1).total:null;
    winner=g.mode==="solo"?0:mom===pip?"tie":mom>pip?0:1;
  }
  const next={...g,scores,bonuses,turns,finished:complete,winner,
    turn:complete?0:g.mode==="pip"?1-player:0,
    rolls:0,dice:blank(),held:noHolds(),
    last:(player===0?"Mom":"Pip")+" scored "+points+" in "+
      FIVE_DICE_CATEGORIES.find(c=>c.id===id).label+
      (bonus?" plus a 100-point Five Dice bonus!":".")};
  return {valid:true,game:next,category:id,points,bonus};
}
function holdForBot(g){
  const remaining=availableFiveDiceCategories(g);
  const counts=tallies(g.dice),best=Math.max(...counts);
  const straightOpen=remaining.includes("largeStraight")||remaining.includes("smallStraight");
  let keep=[];
  if(straightOpen&&best<=2){
    const candidates=[[1,2,3,4,5],[2,3,4,5,6]];
    const run=candidates.map(nums=>nums.filter(n=>g.dice.includes(n)));
    run.sort((a,b)=>b.length-a.length);
    if(run[0].length>=3){
      const seen=new Set();
      keep=g.dice.map(face=>run[0].includes(face)&&!seen.has(face)?
        (seen.add(face),true):false);
    }
  }
  if(!keep.length){
    const face=counts.indexOf(best)+1;
    keep=g.dice.map(x=>x===face);
  }
  return keep;
}
function chooseBotCategory(g){
  const choices=availableFiveDiceCategories(g);
  const weights={ones:2,twos:2,threes:2,fours:2,fives:2,sixes:2,
    threeKind:3,fourKind:6,fullHouse:8,smallStraight:7,
    largeStraight:9,fiveKind:12,chance:1};
  return choices.map(id=>{
    const points=fiveDicePreview(g,id);
    const upper=UPPER.find(c=>c.id===id);
    // The upper bonus makes pairs of 4/5/6 better than a random chance score.
    const n=upper?points/(upper.face*3)*15:points;
    return {id,rank:n+(points>0?(weights[id]||0):0)+
      (id==="fiveKind"&&points===50?40:0)};
  }).sort((a,b)=>b.rank-a.rank)[0]?.id;
}
export function fiveDiceBotTurn(g){
  if(!validFiveDice(g)||g.finished||g.mode!=="pip"||g.turn!==1)
    return {valid:false,game:g};
  let state=g;
  for(let attempt=0;attempt<3;attempt++){
    const rolled=rollFiveDice(state);
    if(!rolled.valid)return {valid:false,game:g};
    state=rolled.game;
    if(attempt<2){
      state={...state,held:holdForBot(state)};
      if(state.held.every(Boolean))break;
    }
  }
  const lastDice=[...state.dice],category=chooseBotCategory(state);
  const scored=scoreFiveDice(state,category);
  if(!scored.valid)return {valid:false,game:g};
  const summary={dice:lastDice,category,points:scored.points,bonus:scored.bonus};
  return {valid:true,game:{...scored.game,lastPip:summary,
    last:scored.game.last},summary};
}
export function fiveDiceHint(g){
  if(!validFiveDice(g)||g.finished||g.rolls===0)return null;
  return chooseBotCategory(g);
}
