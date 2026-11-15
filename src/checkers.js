// MeekLee Checkers: offline American 8x8 checkers (English draughts).
// Mom plays red from the bottom, Pip plays black from the top.
// Men move and capture forward; kings move/capture one diagonal step in
// either direction; captures are compulsory, chained jumps are compulsory;
// reaching the king row ends that turn. No game timers or paid dependencies.
export const CHECKERS_PIECES=Object.freeze({r:"Mom's red piece",R:"Mom's red king",b:"Pip's blue piece",B:"Pip's blue king"});
const BOARD=64;
const row=i=>Math.floor(i/8), col=i=>i%8;
const playable=i=>Number.isInteger(i)&&i>=0&&i<BOARD&&(row(i)+col(i))%2===1;
const own=(piece,player)=>Boolean(piece&&piece.toLowerCase()===player);
const opposite=player=>player==="r"?"b":"r";
const directions=piece=>(piece==="R"||piece==="B")?[-1,1]:piece==="r"?[-1]:[1];
const copyBoard=board=>[...board];
function snapshots(state) {
  const {history,...game}=state;
  return {...game,board:copyBoard(game.board)};
}
export function newCheckers(seed=Date.now()){
  const board=Array(64).fill(null);
  for(let i=0;i<64;i++)if(playable(i)){
    if(row(i)<3)board[i]="b";
    if(row(i)>4)board[i]="r";
  }
  return {kind:"checkers",seed,board,turn:"r",mustContinue:null,
    moves:0,winner:null,last:"Mom plays red first. Tap a red piece.",
    history:[]};
}
export function validCheckers(g){
  if(g?.kind!=="checkers"||!Array.isArray(g.board)||g.board.length!==BOARD||
    (g.turn!=="r"&&g.turn!=="b")||
    (g.winner!==null&&g.winner!=="r"&&g.winner!=="b")||
    !Number.isSafeInteger(g.moves)||g.moves<0||
    !Array.isArray(g.history)||g.history.length>18||typeof g.last!=="string")return false;
  let red=0,black=0;
  for(let i=0;i<64;i++){
    const p=g.board[i];
    if(p===null)continue;
    if(!playable(i)||!Object.hasOwn(CHECKERS_PIECES,p))return false;
    if(own(p,"r"))red++;else black++;
  }
  if(red>12||black>12)return false;
  if(g.mustContinue!==null&&
    (!playable(g.mustContinue)||!own(g.board[g.mustContinue],g.turn)||g.winner!==null))
    return false;
  return true;
}
function candidateMoves(board,player,capturesOnly=false,fromOnly=null){
  const out=[];
  for(let from=0;from<64;from++){
    if(fromOnly!==null&&from!==fromOnly)continue;
    const piece=board[from];
    if(!own(piece,player))continue;
    for(const dy of directions(piece))for(const dx of [-1,1]){
      const r=row(from)+dy,c=col(from)+dx;
      if(r<0||r>7||c<0||c>7)continue;
      const step=r*8+c;
      if(!board[step]&&!capturesOnly){
        out.push({from,to:step,jumped:null});
      }else if(board[step]&&!own(board[step],player)){
        const landingR=r+dy,landingC=c+dx;
        if(landingR>=0&&landingR<8&&landingC>=0&&landingC<8){
          const landing=landingR*8+landingC;
          if(!board[landing])out.push({from,to:landing,jumped:step});
        }
      }
    }
  }
  return out;
}
export function checkersLegalMoves(g){
  if(!validCheckers(g)||g.winner!==null)return [];
  if(g.mustContinue!==null){
    return candidateMoves(g.board,g.turn,true,g.mustContinue).filter(x=>x.jumped!==null);
  }
  const all=candidateMoves(g.board,g.turn);
  const captures=all.filter(x=>x.jumped!==null);
  return captures.length?captures:all;
}
function crown(piece,to){
  return piece==="r"&&row(to)===0?"R":
    piece==="b"&&row(to)===7?"B":piece;
}
export function moveCheckers(g,from,to){
  if(!validCheckers(g)||g.winner!==null)return {valid:false,game:g};
  const chosen=checkersLegalMoves(g).find(x=>x.from===from&&x.to===to);
  if(!chosen)return {valid:false,game:g,
    message:"That move isn't allowed. Jumps must be taken when available."};
  const board=copyBoard(g.board),piece=board[from],newPiece=crown(piece,to);
  board[from]=null;board[to]=newPiece;
  if(chosen.jumped!==null)board[chosen.jumped]=null;
  const player=g.turn;
  const next={...g,board,moves:g.moves+1,mustContinue:null,
    last:(player==="r"?"Mom":"Pip")+(chosen.jumped!==null?" jumped a piece.":" moved a piece.")};
  if(player==="r"&&g.mustContinue===null){
    next.history=[...g.history.slice(-17),snapshots(g)];
  }
  // An American checkers man crowned during a capture does NOT continue jumping
  // as a king on the same turn.
  const crowned=newPiece!==piece;
  if(chosen.jumped!==null&&!crowned){
    const followups=candidateMoves(board,player,true,to).filter(x=>x.jumped!==null);
    if(followups.length){
      next.mustContinue=to;
      next.last=(player==="r"?"Mom":"Pip")+" must jump again with the same piece!";
      return {valid:true,game:next,complete:false};
    }
  }
  next.turn=opposite(player);
  if(crowned)next.last=(player==="r"?"Mom":"Pip")+" crowned a king!";
  const otherMoves=checkersLegalMoves(next);
  if(!otherMoves.length){
    next.winner=player;
    next.last=player==="r"?"Mom wins! What a lovely game!":"Pip wins this round!";
  }
  return {valid:true,game:next,complete:true};
}
function scoreBotMove(g,move){
  const piece=g.board[move.from];
  let value=move.jumped!==null?80:0;
  if(crown(piece,move.to)!==piece)value+=105;
  // Reward safer moves and progress; deterministic tie-breaking.
  const r=row(move.to),c=col(move.to);
  value+=piece==="b"?r*3:0;
  value+=(3.5-Math.abs(c-3.5))*2;
  const moved=moveCheckers(g,move.from,move.to);
  if(!moved.valid)return -Infinity;
  if(moved.game.winner==="b")value+=10000;
  if(moved.game.turn==="r"&&moved.game.winner===null){
    const danger=checkersLegalMoves(moved.game).filter(m=>m.jumped===move.to);
    if(danger.length)value-=35;
  }
  value+=((g.seed>>>0)+g.moves*43+move.from*13+move.to*19)%7/10;
  return value;
}
export function checkersBotTurn(g){
  if(!validCheckers(g)||g.turn!=="b"||g.winner!==null)
    return {valid:false,game:g};
  let next=g,safety=0;
  do {
    const legal=checkersLegalMoves(next);
    if(!legal.length)break;
    const move=[...legal].sort((a,b)=>scoreBotMove(next,b)-scoreBotMove(next,a))[0];
    const outcome=moveCheckers(next,move.from,move.to);
    if(!outcome.valid)return {valid:false,game:g};
    next=outcome.game;
  }while(next.turn==="b"&&next.winner===null&&++safety<24);
  if(next.turn==="b"&&next.winner===null)return {valid:false,game:g};
  return {valid:true,game:next};
}
export function checkersHint(g){
  if(!validCheckers(g)||g.turn!=="r"||g.winner!==null)return null;
  const legal=checkersLegalMoves(g);
  return legal.length?[...legal].sort((a,b)=>scoreHint(g,b)-scoreHint(g,a))[0]:null;
}
function scoreHint(g,move){
  const p=g.board[move.from];
  return (move.jumped!==null?100:0)+(crown(p,move.to)!==p?40:0)+
    (7-row(move.to))*2;
}
export function undoCheckers(g){
  if(!validCheckers(g)||!g.history.length)return {valid:false,game:g};
  const previous=g.history.at(-1);
  return {valid:true,game:{...previous,history:g.history.slice(0,-1),
    last:"Last turn undone. Take your time!"}};
}
