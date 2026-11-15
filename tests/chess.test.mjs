import test from "node:test";
import assert from "node:assert/strict";
import {newChess,validChess,chessSquare,chessLegalMoves,chessMove,chessInCheck,
  chessHint,chessBotTurn,undoChess} from "../src/chess.js";
import {createSaveState} from "../src/save.js";
const has=(moves,from,to,promotion)=>moves.some(m=>m.from===from&&m.to===to&&
  (promotion===undefined||m.promotion===promotion));
function custom(pieces,turn="w",castle=""){
  const g=newChess(21);g.board=Array(64).fill(null);
  for(const [i,p] of pieces)g.board[i]=p;
  g.turn=turn;g.castle=castle;return g;
}
function go(game,from,to,promotion){
  const result=chessMove(game,from,to,promotion);
  assert.equal(result.valid,true,"Expected legal "+chessSquare(from)+"-"+chessSquare(to));
  return result.game;
}
test("opening chess has all 32 pieces, 20 legal moves and independent settings",()=>{
  const g=newChess(7);
  assert(validChess(g));
  assert.equal(g.board.filter(Boolean).length,32);
  assert.equal(g.board[60],"K");assert.equal(g.board[4],"k");
  assert.equal(g.turn,"w");
  assert.equal(chessLegalMoves(g).length,20);
  assert(has(chessLegalMoves(g),52,36));
  assert(!has(chessLegalMoves(g),60,62));
  assert.equal(chessMove(g,52,20).valid,false);
  assert.equal(chessMove(g,12,28).valid,false);
  assert.equal(g.board[52],"P");
  assert.equal(validChess({...g,board:g.board.slice(1)}),false);
  assert.equal(validChess({...g,board:[...g.board.slice(0,4),null,...g.board.slice(5)]}),false);
});
test("Fool's Mate ends in real checkmate with no legal moves",()=>{
  let g=newChess(13);
  g=go(g,53,45); // f3
  g=go(g,12,28); // ...e5
  g=go(g,54,38); // g4
  g=go(g,3,39); // ...Qh4#
  assert.equal(g.winner,"b");assert.equal(g.reason,"checkmate");
  assert(chessInCheck(g,"w"));
  assert.equal(chessLegalMoves(g).length,0);
  assert.equal(chessMove(g,52,44).valid,false);
});
test("en passant works only right after a double pawn push",()=>{
  let g=newChess(9);
  g=go(g,52,36);g=go(g,8,16);g=go(g,36,28);g=go(g,11,27);
  assert.equal(g.enPassant,19);
  assert(has(chessLegalMoves(g),28,19));
  g=go(g,28,19);
  assert.equal(g.board[19],"P");assert.equal(g.board[27],null);
  assert.equal(g.halfmove,0);
  assert.equal(g.board[28],null);
});
test("castling moves rook correctly and cannot cross attacked squares",()=>{
  let g=custom([[60,"K"],[63,"R"],[4,"k"]],"w","K");
  assert(has(chessLegalMoves(g),60,62));
  const done=go(g,60,62);
  assert.equal(done.board[62],"K");assert.equal(done.board[61],"R");
  assert.equal(done.board[63],null);assert.equal(done.castle,"");
  g=custom([[60,"K"],[63,"R"],[4,"k"],[5,"r"]],"w","K");
  assert(!has(chessLegalMoves(g),60,62));
  assert.equal(chessMove(g,60,62).valid,false);
  g=custom([[60,"K"],[56,"R"],[4,"k"]],"w","Q");
  assert(has(chessLegalMoves(g),60,58));
  assert.equal(go(g,60,58).board[59],"R");
});
test("legal moves respect pins, attack and never capture kings",()=>{
  const g=custom([[60,"K"],[52,"R"],[0,"k"],[4,"r"]],"w","");
  assert(!has(chessLegalMoves(g),52,51));
  assert.equal(chessMove(g,52,51).valid,false);
  assert(!has(chessLegalMoves(g),52,0));
  const after=go(g,52,4);
  assert.equal(after.board[4],"R");
  assert.equal(after.board[52],null);
});
test("all four pawn promotions are legal and user choice is honored",()=>{
  const g=custom([[60,"K"],[4,"k"],[8,"P"]],"w","");
  for(const choice of ["Q","R","B","N"])assert(has(chessLegalMoves(g),8,0,choice));
  const done=go(g,8,0,"N");
  assert.equal(done.board[0],"N");
  assert.equal(done.board[8],null);
  assert.equal(done.winner,"draw");
  assert.equal(done.reason,"insufficient material");
});
test("stalemate is not falsely treated as checkmate",()=>{
  const g=custom([[7,"k"],[13,"K"],[22,"Q"]],"b","");
  assert.equal(chessInCheck(g,"b"),false);
  assert.deepEqual(chessLegalMoves(g),[]);
});
test("Pip plays only legal moves and undo restores the full pre-Mom turn",()=>{
  const first=newChess(314,"confident");
  const moved=go(first,52,36);
  const bot=chessBotTurn(moved);
  assert(bot.valid);assert.equal(bot.game.turn,"w");
  assert.equal(bot.game.history.length,1);
  const reset=undoChess(bot.game);
  assert(reset.valid);assert.deepEqual(reset.game.board,first.board);
  assert.equal(reset.game.moves,0);
  assert.equal(undoChess(reset.game).valid,false);
  assert(chessHint(reset.game));
  assert.equal(chessBotTurn(reset.game).valid,false);
});
test("fifty-move rule draws, and castling rights disappear after rook moves",()=>{
  const g=custom([[60,"K"],[63,"R"],[4,"k"]],"w","K");
  g.halfmove=99;
  const d=go(g,63,55);
  assert.equal(d.winner,"draw");assert.equal(d.reason,"fifty-move rule");
  assert.equal(d.castle,"");
});
test("save migration retains old levels, garden, other cards and new chess",()=>{
  const chess=newChess(100);
  const raw={progress:{harvest:6001},collection:{claimed:{"harvest:1":true},
    companion:"bunny"},cards:{chess,checkers:null,backgammon:null}};
  const saved=createSaveState(raw);
  assert.equal(saved.progress.harvest,6001);
  assert.deepEqual(saved.cards.chess,chess);
  assert.equal(saved.collection.companion,"bunny");
  assert.equal(saved.cards.checkers,null);
  assert.equal(saved.cards.backgammon,null);
  assert.equal(createSaveState({...raw,cards:{chess:{kind:"chess"}}}).cards.chess,null);
});
