// MeekLee Backgammon: offline, rules-complete movement engine for Mom + Pip.
// Point indexes 0..23: Mom (0, cream) moves DOWN toward 0, Pip (1, blue)
// moves UP toward 23. Positive checkers are Mom's; negative are Pip's.
// Board geometry is independent of how the phone displays the points.
const LENGTH=24,HOME=15,TARGET=5;
const ints=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
export const BACKGAMMON_TARGET=TARGET;
export const initialBackgammonBoard=()=>{
  const board=Array(LENGTH).fill(0);
  for(const [point,count] of [[23,2],[12,5],[7,3],[5,5]])board[point]=count;
  for(const [point,count] of [[0,2],[11,5],[16,3],[18,5]])board[point]=-count;
  return board;
};
const own=(n,p)=>p===0?n>0:n<0;
const enemy=(n,p)=>own(n,1-p);
const sign=p=>p===0?1:-1;
const dieRoll=s=>{const next=(Math.imul(s,1664525)+1013904223)>>>0;
  return {state:next,die:1+(next%6)};};
function rollTwo(s){
  let r=dieRoll(s),t=dieRoll(r.state);
  return {rngState:t.state,dice:[r.die,t.die]};
}
const reverse=p=>1-p;
const distance=(p,index)=>p===0?index+1:24-index;
const isHome=(p,index)=>p===0?index<=5:index>=18;
const advance=(p,from,die)=>p===0?from-die:from+die;
function allHome(g,p){
  if(g.bar[p])return false;
  return g.board.every((n,i)=>!own(n,p)||isHome(p,i));
}
const countPieces=(g,p)=>g.board.reduce((sum,n)=>sum+(own(n,p)?Math.abs(n):0),0)+
  g.bar[p]+g.off[p];
function nextRoll(s){
  let r=dieRoll(s);return r;
}
export function newBackgammon(seed=Date.now(),scores=[0,0],round=1){
  const rng=(seed>>>0)||1;
  let a,b,s=rng,limit=0;
  do{
    const one=nextRoll(s),two=nextRoll(one.state);
    a=one.die;b=two.die;s=two.state;
  }while(a===b&&++limit<60);
  if(a===b)b=a===6?1:a+1; // unreachable except pathological fake seeds
  const turn=a>b?0:1;
  return {kind:"backgammon",seed:rng,rngState:s,
    board:initialBackgammonBoard(),bar:[0,0],off:[0,0],
    turn,dice:[a,b],moves:0,round,matchScore:[...scores],matchWinner:null,
    winner:null,result:null,cube:1,cubeOwner:null,doubleOfferedBy:null,
    last:"Opening roll: Mom "+a+" and Pip "+b+". "+(turn===0?"Mom":"Pip")+" goes first!",
    history:[],turnRecorded:false};
}
export function validBackgammon(g){
  if(g?.kind!=="backgammon"||!Array.isArray(g.board)||g.board.length!==LENGTH||
    !g.board.every(n=>ints(n,-15,15))||!Array.isArray(g.bar)||!Array.isArray(g.off)||
    g.bar.length!==2||g.off.length!==2||!g.bar.every(n=>ints(n,0,15))||
    !g.off.every(n=>ints(n,0,15))||
    !Array.isArray(g.dice)||g.dice.length>4||!g.dice.every(n=>ints(n,1,6))||
    !ints(g.turn,0,1)||!ints(g.round,1,10000)||!ints(g.moves,0,100000)||
    !ints(g.cube,1,64)||(g.cube&(g.cube-1))!==0||
    ![null,0,1].includes(g.cubeOwner)||![null,0,1].includes(g.doubleOfferedBy)||
    ![null,0,1].includes(g.winner)||![null,0,1].includes(g.matchWinner)||
    !Array.isArray(g.matchScore)||g.matchScore.length!==2||
    !g.matchScore.every(n=>ints(n,0,10000))||
    !ints(g.rngState,0,0xffffffff)||!ints(g.seed,0,0xffffffff)||
    !Array.isArray(g.history)||g.history.length>8||
    typeof g.turnRecorded!=="boolean"||typeof g.last!=="string"||g.last.length>300)
    return false;
  if(g.doubleOfferedBy!==null&&(g.dice.length>0||g.doubleOfferedBy!==g.turn||
    g.winner!==null))return false;
  if(g.winner!==null&&g.off[g.winner]!==15&&g.result?.reason!=="double declined")
    return false;
  return countPieces(g,0)===15&&countPieces(g,1)===15;
}
function allMovesForDie(g,die){
  const p=g.turn,result=[];
  if(g.bar[p]){
    const to=p===0?24-die:die-1;
    if(Math.abs(g.board[to])<2||!enemy(g.board[to],p))
      result.push({from:"bar",to,die,hit:enemy(g.board[to],p)});
    return result;
  }
  const home=allHome(g,p);
  for(let from=0;from<LENGTH;from++){
    if(!own(g.board[from],p))continue;
    const to=advance(p,from,die);
    if(to>=0&&to<24){
      if(enemy(g.board[to],p)&&Math.abs(g.board[to])>=2)continue;
      result.push({from,to,die,hit:enemy(g.board[to],p)});
    }else if(home){
      const d=distance(p,from);
      // If the die overshoots, only the farthest checker from home can bear off.
      const higher=g.board.some((n,i)=>own(n,p)&&distance(p,i)>d);
      if(die===d||(die>d&&!higher)){
        result.push({from,to:"off",die,hit:false});
      }
    }
  }
  return result;
}
function applyRaw(g,move){
  const board=[...g.board],bar=[...g.bar],off=[...g.off],p=g.turn,s=sign(p);
  if(move.from==="bar")bar[p]--;
  else board[move.from]-=s;
  if(move.to==="off")off[p]++;
  else{
    if(enemy(board[move.to],p)&&Math.abs(board[move.to])===1){
      board[move.to]=0;bar[1-p]++;
    }
    board[move.to]+=s;
  }
  return {...g,board,bar,off};
}
const stateKey=(g,dice)=>g.board.join(",")+"|"+g.bar.join(",")+"|"+
  g.off.join(",")+"|"+dice.slice().sort((a,b)=>a-b).join("");
function maxUsable(g,dice,memo){
  if(!dice.length)return 0;
  const key=stateKey(g,dice);
  if(memo.has(key))return memo.get(key);
  let max=0;
  for(const die of new Set(dice)){
    const rest=[...dice],index=rest.indexOf(die);
    rest.splice(index,1);
    for(const move of allMovesForDie(g,die)){
      const next=applyRaw(g,move);
      max=Math.max(max,1+maxUsable(next,rest,memo));
      if(max===dice.length)break;
    }
    if(max===dice.length)break;
  }
  memo.set(key,max);
  return max;
}
function candidateMoves(g,memo){
  const best=maxUsable(g,g.dice,memo);
  if(!best)return [];
  const options=[];
  for(const die of new Set(g.dice)){
    const remaining=[...g.dice];remaining.splice(remaining.indexOf(die),1);
    for(const move of allMovesForDie(g,die))
      if(1+maxUsable(applyRaw(g,move),remaining,memo)===best)
        options.push(move);
  }
  if(best===1&&g.dice.length===2&&g.dice[0]!==g.dice[1]){
    const high=Math.max(...g.dice);
    if(options.some(m=>m.die===high))return options.filter(m=>m.die===high);
  }
  return options;
}
export function backgammonLegalMoves(g){
  if(!validBackgammon(g)||g.winner!==null||g.matchWinner!==null||
    g.doubleOfferedBy!==null||!g.dice.length)return [];
  return candidateMoves(g,new Map());
}
function snapshot(g){
  const {history,...pure}=g;
  return {...pure,board:[...g.board],bar:[...g.bar],off:[...g.off],
    dice:[...g.dice],matchScore:[...g.matchScore]};
}
function withUndo(g){
  if(g.turn!==0||g.turnRecorded)return g;
  return {...g,history:[...g.history.slice(-7),snapshot(g)],turnRecorded:true};
}
function winnerResult(g,p,reason){
  const loser=1-p;
  const loserInWinningHome=g.board.some((n,i)=>enemy(n,p)&&isHome(p,i));
  const multiplier=reason==="double declined"?1:
    g.off[loser]>0?1:g.bar[loser]>0||loserInWinningHome?3:2;
  const type=reason==="double declined"?"declined double":
    multiplier===3?"backgammon":multiplier===2?"gammon":"single";
  const earned=g.cube*multiplier;
  const matchScore=[...g.matchScore];matchScore[p]+=earned;
  return {...g,winner:p,matchWinner:matchScore[p]>=TARGET?p:null,matchScore,
    dice:[],doubleOfferedBy:null,turnRecorded:false,
    result:{type,points:earned,cube:g.cube,reason},
    last:(p===0?"Mom":"Pip")+" wins "+earned+" "+(earned===1?"point":"points")+
      " ("+type+")."};
}
function endTurn(g){
  const opponent=reverse(g.turn);
  return {...g,turn:opponent,dice:[],turnRecorded:false,
    last:g.last+" "+(opponent===0?"Mom's":"Pip's")+" turn to roll."};
}
export function backgammonMove(g,from,to,die){
  if(!validBackgammon(g))return {valid:false,game:g};
  const legal=backgammonLegalMoves(g);
  const chosen=legal.find(m=>m.from===from&&m.to===to&&m.die===die);
  if(!chosen)return {valid:false,game:g,error:"Choose a highlighted legal move."};
  const player=g.turn;
  let next=applyRaw(withUndo(g),chosen);
  const remaining=[...g.dice];remaining.splice(remaining.indexOf(die),1);
  next={...next,dice:remaining,moves:g.moves+1,
    last:(player===0?"Mom":"Pip")+(from==="bar"?" re-entered from the bar":
      " moved from "+(from+1))+(to==="off"?" and bore off a checker":
      " to "+(to+1))+(chosen.hit?" and hit a blot!":".")};
  if(next.off[player]===HOME)return {valid:true,game:winnerResult(next,player,"borne off")};
  if(!remaining.length||!candidateMoves(next,new Map()).length)next=endTurn(next);
  return {valid:true,game:next};
}
export function backgammonRoll(g){
  if(!validBackgammon(g)||g.winner!==null||g.matchWinner!==null||
    g.doubleOfferedBy!==null||g.dice.length)return {valid:false,game:g};
  const base=withUndo(g);
  const roll=rollTwo(g.rngState),[a,b]=roll.dice;
  const dice=a===b?[a,a,a,a]:[a,b];
  let next={...base,rngState:roll.rngState,dice,last:
    (g.turn===0?"Mom":"Pip")+" rolled "+a+" and "+b+(a===b?"! Doubles give four moves.":".")};
  if(!candidateMoves(next,new Map()).length)
    next=endTurn({...next,last:next.last+" No legal move."});
  return {valid:true,game:next};
}
export function backgammonOfferDouble(g){
  if(!validBackgammon(g)||g.winner!==null||g.matchWinner!==null||
    g.doubleOfferedBy!==null||g.dice.length||g.cube>=64||
    g.cubeOwner!==null&&g.cubeOwner!==g.turn)return {valid:false,game:g};
  const next=withUndo(g);
  return {valid:true,game:{...next,doubleOfferedBy:g.turn,
    last:(g.turn===0?"Mom":"Pip")+" offers to double from "+g.cube+" to "+g.cube*2+"."}};
}
export function backgammonRespondDouble(g,accept){
  if(!validBackgammon(g)||g.doubleOfferedBy===null||
    typeof accept!=="boolean")return {valid:false,game:g};
  const offerer=g.doubleOfferedBy,receiver=reverse(offerer);
  if(!accept)return {valid:true,game:winnerResult({...g,doubleOfferedBy:null},offerer,"double declined")};
  return {valid:true,game:{...g,doubleOfferedBy:null,cube:g.cube*2,
    cubeOwner:receiver,last:(receiver===0?"Mom":"Pip")+
      " accepted the double! The cube is "+g.cube*2+"."}};
}
export function backgammonNextGame(g){
  if(!validBackgammon(g)||g.winner===null||g.matchWinner!==null)
    return {valid:false,game:g};
  const next=newBackgammon((g.rngState+g.round*11939+101)>>>0,g.matchScore,g.round+1);
  return {valid:true,game:next};
}
function pipCount(g,p){
  return g.board.reduce((sum,n,i)=>sum+(own(n,p)?
    Math.abs(n)*distance(p,i):0),0)+g.bar[p]*25;
}
function botScore(g,move){
  const next=applyRaw(g,move);
  const p=g.turn;
  const ownPips=pipCount(next,p);
  let value=0;
  if(move.to==="off")value+=70;
  if(move.hit)value+=42;
  if(move.to!=="off"){
    if(Math.abs(next.board[move.to])>=2)value+=8;
    if(Math.abs(next.board[move.to])===1){
      let danger=0;
      for(let i=0;i<24;i++)if(enemy(next.board[i],p)){
        const d=Math.abs(i-move.to);
        if(d>=1&&d<=6&&((p===0&&i<move.to)||(p===1&&i>move.to)))danger++;
      }
      value-=Math.min(danger,4)*10;
    }
  }
  value+=move.die*2-ownPips*.015;
  value+=(Math.imul(g.rngState,13)+g.moves*17+
    (move.from==="bar"?29:move.from)*7+(move.to==="off"?19:move.to))%11/20;
  return value;
}
export function backgammonBotTurn(g){
  if(!validBackgammon(g)||g.turn!==1||g.winner!==null)return {valid:false,game:g};
  let next=g,safety=0;
  while(next.turn===1&&next.winner===null&&safety++<36){
    if(next.doubleOfferedBy!==null){
      if(next.doubleOfferedBy===0){
        const accept=next.cube<4||pipCount(next,1)<pipCount(next,0)+55;
        const reply=backgammonRespondDouble(next,accept);
        if(!reply.valid)return {valid:false,game:g};
        next=reply.game;
      }else break; // Mom decides whether to accept Pip's offer.
    }else if(!next.dice.length){
      // Pip sometimes offers a double when significantly ahead after several turns.
      const lead=pipCount(next,0)-pipCount(next,1);
      if(next.moves>18&&lead>65&&next.cube<=4&&
        (next.cubeOwner===null||next.cubeOwner===1)){
        const offered=backgammonOfferDouble(next);
        if(!offered.valid)return {valid:false,game:g};
        next=offered.game;break;
      }
      const result=backgammonRoll(next);
      if(!result.valid)return {valid:false,game:g};
      next=result.game;
    }else{
      const legal=backgammonLegalMoves(next);
      if(!legal.length){
        next=endTurn(next);
        break;
      }
      const move=[...legal].sort((a,b)=>botScore(next,b)-botScore(next,a))[0];
      const applied=backgammonMove(next,move.from,move.to,move.die);
      if(!applied.valid)return {valid:false,game:g};
      next=applied.game;
    }
  }
  if(safety>=36&&next.turn===1&&next.winner===null&&
    next.doubleOfferedBy===null)return {valid:false,game:g};
  return {valid:true,game:next};
}
export function backgammonHint(g){
  if(!validBackgammon(g)||g.turn!==0)return null;
  const legal=backgammonLegalMoves(g);
  return legal.length?[...legal].sort((a,b)=>botScore(g,b)-botScore(g,a))[0]:null;
}
export function backgammonUndo(g){
  if(!validBackgammon(g)||!g.history.length)return {valid:false,game:g};
  const prev=g.history.at(-1);
  return {valid:true,game:{...prev,history:g.history.slice(0,-1),
    last:"Previous turn restored. No hurry!"}};
}
