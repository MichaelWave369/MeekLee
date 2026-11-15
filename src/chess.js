// Offline chess for Mom and Pip. Coordinates: a8=0, h1=63.
// Pure, immutable rules: no timers, accounts, paid dependencies, or hidden network calls.
const PIECES="PNBRQKpnbrqk";
export const CHESS_GLYPHS={K:"♔",Q:"♕",R:"♖",B:"♗",N:"♘",P:"♙",
  k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"};
export const CHESS_NAMES={K:"king",Q:"queen",R:"rook",B:"bishop",N:"knight",P:"pawn"};
const val={p:1,n:3,b:3,r:5,q:9,k:100};
const other=s=>s==="w"?"b":"w";
const side=p=>p?(p===p.toUpperCase()?"w":"b"):null;
const row=i=>Math.floor(i/8),col=i=>i%8;
const inBounds=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const idx=(r,c)=>r*8+c;
export const chessSquare=i=>"ABCDEFGH"[col(i)]+(8-row(i));
export function newChess(seed=Date.now(),difficulty="gentle"){
  const back="rnbqkbnr";
  return {kind:"chess",seed,board:[...back,...Array(8).fill("p"),
    ...Array(32).fill(null),...Array(8).fill("P"),...back.toUpperCase()],
    turn:"w",castle:"KQkq",enPassant:null,halfmove:0,fullmove:1,moves:0,
    winner:null,reason:null,last:"Mom moves first.",difficulty:
    ["gentle","confident"].includes(difficulty)?difficulty:"gentle",
    positions:[],history:[]};
}
export function validChess(g){
  if(g?.kind!=="chess"||!Array.isArray(g.board)||g.board.length!==64||
    g.board.some(p=>p!==null&&!PIECES.includes(p))||
    g.board.filter(p=>p==="K").length!==1||
    g.board.filter(p=>p==="k").length!==1||
    !["w","b"].includes(g.turn)||typeof g.castle!=="string"||
    /[^KQkq]/.test(g.castle)||new Set(g.castle).size!==g.castle.length||
    !(g.enPassant===null||Number.isInteger(g.enPassant)&&g.enPassant>=0&&g.enPassant<64)||
    !Number.isSafeInteger(g.moves)||g.moves<0||
    !Number.isSafeInteger(g.halfmove)||g.halfmove<0||
    !Number.isSafeInteger(g.fullmove)||g.fullmove<1||
    ![null,"w","b","draw"].includes(g.winner)||
    !["gentle","confident"].includes(g.difficulty)||
    !Array.isArray(g.history)||g.history.length>24||
    !Array.isArray(g.positions)||g.positions.length>300)return false;
  return true;
}
function attacked(b,square,by){
  const r=row(square),c=col(square);
  const pawnOrigin=r+(by==="w"?1:-1);
  for(const dc of [-1,1])if(inBounds(pawnOrigin,c+dc)&&
    b[idx(pawnOrigin,c+dc)]===(by==="w"?"P":"p"))return true;
  for(const [dr,dc] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]]){
    if(inBounds(r+dr,c+dc)&&b[idx(r+dr,c+dc)]===(by==="w"?"N":"n"))return true;
  }
  for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
    const nr=r+dr,nc=c+dc;
    if(inBounds(nr,nc)&&b[idx(nr,nc)]===(by==="w"?"K":"k"))return true;
    for(let step=1;step<8;step++){
      const rr=r+dr*step,cc=c+dc*step;
      if(!inBounds(rr,cc))break;
      const p=b[idx(rr,cc)];
      if(!p)continue;
      if(side(p)===by){
        const type=p.toLowerCase(),diagonal=dr!==0&&dc!==0;
        if(type==="q"||type===(diagonal?"b":"r"))return true;
      }
      break;
    }
  }
  return false;
}
export function chessInCheck(g,player=g.turn){
  const king=g.board.indexOf(player==="w"?"K":"k");
  return king<0||attacked(g.board,king,other(player));
}
function pseudo(g,from){
  const b=g.board,p=b[from],s=side(p);
  if(!p||!s)return [];
  const r=row(from),c=col(from),type=p.toLowerCase(),out=[];
  const push=(to,castle=false)=>{
    const target=b[to];
    if(side(target)===s||target?.toLowerCase()==="k")return;
    if(type==="p"&&row(to)===(s==="w"?0:7)){
      for(const promotion of ["Q","R","B","N"])out.push({from,to,promotion});
    }else out.push({from,to,...(castle?{castle:true}:{})});
  };
  if(type==="p"){
    const dir=s==="w"?-1:1,next=r+dir;
    if(inBounds(next,c)&&!b[idx(next,c)]){
      push(idx(next,c));
      const two=r+dir*2;
      if(r===(s==="w"?6:1)&&!b[idx(two,c)])push(idx(two,c));
    }
    for(const dc of [-1,1]){
      if(!inBounds(next,c+dc))continue;
      const to=idx(next,c+dc);
      if(side(b[to])===other(s))push(to);
      else if(to===g.enPassant&&b[idx(r,c+dc)]===(s==="w"?"p":"P"))
        out.push({from,to,enPassant:true});
    }
  }else if(type==="n"){
    for(const [dr,dc] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]]){
      if(inBounds(r+dr,c+dc))push(idx(r+dr,c+dc));
    }
  }else if(type==="k"){
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      if((dr||dc)&&inBounds(r+dr,c+dc))push(idx(r+dr,c+dc));
    }
    const home=s==="w"?60:4,rook=s==="w"?"R":"r";
    if(from===home&&!attacked(b,home,other(s))){
      const kRight=s==="w"?"K":"k",qRight=s==="w"?"Q":"q";
      if(g.castle.includes(kRight)&&b[home+3]===rook&&
        !b[home+1]&&!b[home+2]&&!attacked(b,home+1,other(s))&&
        !attacked(b,home+2,other(s)))push(home+2,true);
      if(g.castle.includes(qRight)&&b[home-4]===rook&&
        !b[home-1]&&!b[home-2]&&!b[home-3]&&
        !attacked(b,home-1,other(s))&&!attacked(b,home-2,other(s)))
        push(home-2,true);
    }
  }else{
    const directions=[];
    if(["b","q"].includes(type))directions.push([1,1],[1,-1],[-1,1],[-1,-1]);
    if(["r","q"].includes(type))directions.push([1,0],[-1,0],[0,1],[0,-1]);
    for(const [dr,dc] of directions){
      for(let n=1;n<8;n++){
        const nr=r+dr*n,nc=c+dc*n;
        if(!inBounds(nr,nc))break;
        const to=idx(nr,nc);
        if(side(b[to])===s)break;
        if(b[to]?.toLowerCase()==="k")break;
        push(to);
        if(b[to])break;
      }
    }
  }
  return out;
}
function applyRaw(g,m){
  const b=[...g.board],piece=b[m.from],s=side(piece),captured=b[m.to];
  const from=m.from,to=m.to;
  b[from]=null;
  if(m.enPassant)b[idx(row(from),col(to))]=null;
  b[to]=m.promotion?(s==="w"?m.promotion:m.promotion.toLowerCase()):piece;
  if(piece.toLowerCase()==="k"&&Math.abs(to-from)===2){
    const rookFrom=to>from?from+3:from-4,rookTo=to>from?from+1:from-1;
    b[rookTo]=b[rookFrom];b[rookFrom]=null;
  }
  let castle=g.castle;
  if(piece==="K")castle=castle.replace(/[KQ]/g,"");
  if(piece==="k")castle=castle.replace(/[kq]/g,"");
  for(const [square,right] of [[63,"K"],[56,"Q"],[7,"k"],[0,"q"]]){
    if(from===square||to===square)castle=castle.replace(right,"");
  }
  const pawn=piece.toLowerCase()==="p";
  const enPassant=pawn&&Math.abs(to-from)===16?(to+from)/2:null;
  return {...g,board:b,turn:other(g.turn),castle,enPassant,
    halfmove:pawn||captured||m.enPassant?0:g.halfmove+1,
    fullmove:g.fullmove+(s==="b"?1:0),moves:g.moves+1,
    last:chessSquare(from)+" to "+chessSquare(to)+(captured||m.enPassant?" captures":"")+
      (m.promotion?" promotes to "+m.promotion:"")+
      (m.castle?" (castles)":"")};
}
export function chessLegalMoves(g,player=g.turn){
  if(g.winner!==null)return [];
  const position=player===g.turn?g:{...g,turn:player,enPassant:null};
  const all=[];
  position.board.forEach((p,from)=>{
    if(side(p)!==player)return;
    for(const move of pseudo(position,from)){
      if(!chessInCheck(applyRaw(position,move),player))all.push(move);
    }
  });
  return all;
}
function signature(g){
  return g.board.map(p=>p||".").join("")+"|"+g.turn+"|"+g.castle+"|"+g.enPassant;
}
function insufficient(board){
  const material=board.map((p,i)=>({p,i})).filter(x=>x.p&&x.p.toLowerCase()!=="k");
  if(!material.length)return true;
  if(material.length===1)return ["b","n"].includes(material[0].p.toLowerCase());
  return material.length===2&&material.every(x=>x.p.toLowerCase()==="b")&&
    material.every(x=>(row(x.i)+col(x.i))%2===(row(material[0].i)+col(material[0].i))%2);
}
function finish(g,previous){
  const pos=previous.positions.length ? [...previous.positions.slice(-299),signature(g)] :
    [signature(previous),signature(g)];
  const next={...g,positions:pos};
  const legal=chessLegalMoves(next);
  if(!legal.length){
    if(chessInCheck(next))return {...next,winner:other(next.turn),reason:"checkmate"};
    return {...next,winner:"draw",reason:"stalemate"};
  }
  if(insufficient(next.board))return {...next,winner:"draw",reason:"insufficient material"};
  if(next.halfmove>=100)return {...next,winner:"draw",reason:"fifty-move rule"};
  if(pos.filter(x=>x===signature(next)).length>=3)
    return {...next,winner:"draw",reason:"threefold repetition"};
  return next;
}
function sameMove(a,b){return a.from===b.from&&a.to===b.to&&a.promotion===b.promotion;}
export function chessMove(g,from,to,promotion="Q"){
  if(!validChess(g)||g.winner!==null)return {valid:false,game:g,message:"The board is finished."};
  const legal=chessLegalMoves(g),move=legal.find(m=>sameMove(m,{from,to,
    ...(m.promotion?{promotion}:{} )}));
  if(!move)return {valid:false,game:g,message:"That move is not legal. Keep your king safe."};
  const next=finish(applyRaw(g,move),g);
  const history=g.turn==="w"?[...g.history.slice(-22),{
    board:g.board,turn:g.turn,castle:g.castle,enPassant:g.enPassant,
    halfmove:g.halfmove,fullmove:g.fullmove,moves:g.moves,winner:g.winner,
    reason:g.reason,last:g.last,positions:g.positions
  }]:g.history;
  return {valid:true,game:{...next,history},message:next.last};
}
function scoreMove(g,m){
  const enemy=g.board[m.to]||(m.enPassant?"p":null);
  const piece=g.board[m.from],value=val[piece.toLowerCase()]||0;
  const after=applyRaw(g,m),center=3.5-Math.abs(col(m.to)-3.5);
  let score=(enemy?(val[enemy.toLowerCase()]||0)*10:0)+
    (m.promotion?val[m.promotion.toLowerCase()]*9:0)+center*.25+
    (chessInCheck(after,after.turn)?1.5:0)+(m.castle?1.5:0);
  if(attacked(after.board,m.to,after.turn))score-=value*(g.difficulty==="confident"?6:2);
  if(g.difficulty==="confident"){
    // Prefer positions with fewer simple one-move tactical losses.
    const replies=chessLegalMoves(after);
    let enemyBest=0;
    for(const reply of replies){
      const target=after.board[reply.to];
      if(target)enemyBest=Math.max(enemyBest,val[target.toLowerCase()]||0);
    }
    score-=enemyBest*2.5;
  }
  const noise=(((g.seed|0)+(g.moves+1)*67+m.from*37+m.to*13+
    (m.promotion?m.promotion.charCodeAt(0):0))%97+97)%97/97;
  return score+noise*(g.difficulty==="gentle"?6:0.3);
}
export function chessHint(g){
  if(!validChess(g)||g.turn!=="w"||g.winner!==null)return null;
  const moves=chessLegalMoves(g);
  return moves.sort((a,b)=>scoreMove(g,b)-scoreMove(g,a))[0]||null;
}
export function chessBotTurn(g){
  if(!validChess(g)||g.turn!=="b"||g.winner!==null)
    return {valid:false,game:g};
  const moves=chessLegalMoves(g);
  if(!moves.length)return {valid:false,game:g};
  const chosen=moves.sort((a,b)=>scoreMove(g,b)-scoreMove(g,a))[0];
  return chessMove(g,chosen.from,chosen.to,chosen.promotion||"Q");
}
export function undoChess(g){
  if(!validChess(g)||!g.history.length)return {valid:false,game:g};
  const previous=g.history.at(-1);
  return {valid:true,game:{...g,...previous,history:g.history.slice(0,-1)}};
}
