// Spider Solitaire, classic 104-card one-suit beginner variant.
// Eight distinct sets of 13 spades keep the standard two-deck cardinality.
// Immutable, seeded and browser-independent for offline saves and regression tests.
import {shuffleCards,cardRank} from "./solitaire.js";

export const SPIDER_COLUMNS=10;
export const SPIDER_RUNS=8;
export const SPIDER_DEALS=5;
const HISTORY_LIMIT=20;
const ALL=Object.freeze(Array.from({length:8},(_,copy)=>
  Array.from({length:13},(_,i)=>"S-"+(i+1)+"-"+copy)).flat());
const VALID_IDS=new Set(ALL);
const runRanks=Array.from({length:13},(_,i)=>13-i);
const rank=cardRank;

function snapshot(game){
  const {history,...rest}=game;
  return rest;
}
function clone(game){
  return {...game,stock:[...game.stock],
    columns:game.columns.map(c=>({down:[...c.down],up:[...c.up]})),
    completed:game.completed.map(run=>[...run])};
}
function reveal(column){
  if(!column.up.length&&column.down.length)
    column.up.push(column.down.pop());
}
function clearRuns(next){
  let count=0;
  for(const col of next.columns){
    // Removing an exposed completed run may turn over a new hidden card.
    while(col.up.length>=13){
      const end=col.up.slice(-13);
      if(!end.every((card,i)=>rank(card)===runRanks[i]))break;
      col.up.splice(-13);
      next.completed.push(end);
      count++;
      reveal(col);
    }
  }
  return count;
}
function finish(previous,next,message,cleared=0){
  next.won=next.completed.length===SPIDER_RUNS;
  next.moves=previous.moves+1;
  next.history=[...(previous.history||[]).slice(-(HISTORY_LIMIT-1)),snapshot(previous)];
  next.last=next.won?"All eight runs cleared! Spider Solitaire complete!":
    message+(cleared?" "+cleared+" complete run"+(cleared>1?"s":"")+" cleared!":"");
  return {valid:true,game:next,cleared,message:next.last};
}
export function newSpider(seed=Date.now()){
  const safe=Number.isSafeInteger(seed)&&seed>=0?seed:1;
  const cards=shuffleCards(ALL,safe);
  let next=0;
  const columns=Array.from({length:10},(_,i)=>{
    const size=i<4?6:5,down=cards.slice(next,next+size-1);
    next+=size-1;
    const up=[cards[next++]];
    return {down,up};
  });
  return {kind:"spider",seed:safe,columns,stock:cards.slice(next),
    completed:[],moves:0,deals:0,won:false,
    last:"Build descending sequences of one suit, from King down to Ace.",
    history:[]};
}
export function validSpider(g){
  if(g?.kind!=="spider"||!Number.isSafeInteger(g.seed)||g.seed<0||
    !Array.isArray(g.columns)||g.columns.length!==SPIDER_COLUMNS||
    !Array.isArray(g.stock)||g.stock.length>50||
    !Array.isArray(g.completed)||g.completed.length>SPIDER_RUNS||
    !Array.isArray(g.history)||g.history.length>HISTORY_LIMIT||
    !Number.isSafeInteger(g.moves)||g.moves<0||
    !Number.isInteger(g.deals)||g.deals<0||g.deals>SPIDER_DEALS||
    typeof g.won!=="boolean"||typeof g.last!=="string")return false;
  const piles=[g.stock];
  for(const c of g.columns){
    if(!c||!Array.isArray(c.down)||!Array.isArray(c.up))return false;
    if(c.down.length&&!c.up.length)return false;
    piles.push(c.down,c.up);
  }
  for(const completed of g.completed){
    if(!Array.isArray(completed)||completed.length!==13||
      !completed.every((card,i)=>rank(card)===runRanks[i]))return false;
    piles.push(completed);
  }
  const ids=piles.flat();
  return ids.length===104&&new Set(ids).size===104&&
    ids.every(id=>VALID_IDS.has(id))&&
    g.stock.length===50-g.deals*10&&
    g.won===(g.completed.length===SPIDER_RUNS);
}
export function spiderCanDeal(g){
  return validSpider(g)&&!g.won&&g.stock.length>=10&&
    g.columns.every(c=>c.up.length>0);
}
export function spiderLegalMoves(g){
  if(!validSpider(g)||g.won)return [];
  const result=[];
  for(let from=0;from<SPIDER_COLUMNS;from++){
    const source=g.columns[from];
    for(let start=source.up.length-1;start>=0;start--){
      // Only full one-suit, descending sequences may move together.
      if(start<source.up.length-1&&
        rank(source.up[start])!==rank(source.up[start+1])+1)break;
      const top=source.up[start];
      for(let to=0;to<SPIDER_COLUMNS;to++){
        if(to===from)continue;
        const target=g.columns[to];
        if(target.up.length){
          if(rank(target.up.at(-1))===rank(top)+1)
            result.push({from,start,to,length:source.up.length-start});
        } else if(!target.down.length&&
          // Avoid a pure no-op relocation of a complete empty-backed column.
          (source.down.length>0||start>0)){
          result.push({from,start,to,length:source.up.length-start});
        }
      }
    }
  }
  return result;
}
export function spiderMove(g,from,start,to){
  if(!validSpider(g)||!Number.isInteger(from)||!Number.isInteger(to)||
    !Number.isInteger(start)||
    !spiderLegalMoves(g).some(m=>m.from===from&&m.start===start&&m.to===to))
    return {valid:false,game:g,message:"Move a descending run onto a card one rank higher, or into an empty column."};
  const next=clone(g);
  const source=next.columns[from],destination=next.columns[to];
  destination.up.push(...source.up.splice(start));
  reveal(source);
  const cleared=clearRuns(next);
  return finish(g,next,"Nice move!",cleared);
}
export function spiderDeal(g){
  if(!spiderCanDeal(g))return {valid:false,game:g,message:
    "You need a card in every column before dealing the next ten."};
  const next=clone(g);
  // One stock card goes face-up to every tableau column.
  for(let c=0;c<SPIDER_COLUMNS;c++)next.columns[c].up.push(next.stock.pop());
  next.deals++;
  const cleared=clearRuns(next);
  return finish(g,next,"Ten new cards dealt!",cleared);
}
export function spiderHint(g){
  if(!validSpider(g)||g.won)return null;
  const moves=spiderLegalMoves(g);
  if(moves.length){
    const ranked=moves.map(m=>{
      const source=g.columns[m.from],destination=g.columns[m.to];
      const reveals=source.down.length&&m.start===0?1:0;
      const makesRun=destination.up.length+
        m.length>=13&&destination.up.length?1:0;
      return {...m,priority:reveals*1000+makesRun*100+
        (destination.up.length?20:0)+m.length};
    });
    ranked.sort((a,b)=>b.priority-a.priority||
      a.from-b.from||a.to-b.to||a.start-b.start);
    const {priority,...best}=ranked[0];
    return {type:"move",...best};
  }
  return spiderCanDeal(g)?{type:"deal"}:null;
}
export function spiderBlocked(g){
  return validSpider(g)&&!g.won&&!spiderCanDeal(g)&&
    spiderLegalMoves(g).length===0;
}
export function undoSpider(g){
  if(!validSpider(g)||!g.history.length)return {valid:false,game:g};
  const previous=g.history.at(-1);
  return {valid:true,game:{...previous,history:g.history.slice(0,-1)},
    message:"Move undone."};
}
