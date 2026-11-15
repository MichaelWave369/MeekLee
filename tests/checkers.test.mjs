import test from "node:test";
import assert from "node:assert/strict";
import {
  newCheckers,validCheckers,checkersLegalMoves,moveCheckers,
  checkersBotTurn,checkersHint,undoCheckers
} from "../src/checkers.js";
import {createSaveState} from "../src/save.js";
import {newJigsaw} from "../src/jigsaw.js";
import {newWar} from "../src/war.js";
import {newSolitaire} from "../src/solitaire.js";
const custom=(entries,turn="r")=>{
  const board=Array(64).fill(null);
  for(const [sq,piece] of entries)board[sq]=piece;
  return {...newCheckers(31),board,turn,last:"A specially arranged puzzle board."};
};
const has=(moves,from,to)=>moves.some(m=>m.from===from&&m.to===to);

test("American Checkers opens with 12 men each, dark squares, opposite corners, and red to move",()=>{
  const g=newCheckers(12);
  assert(validCheckers(g));
  assert.equal(g.board.filter(p=>p==="r").length,12);
  assert.equal(g.board.filter(p=>p==="b").length,12);
  assert.equal(g.board.filter(Boolean).length,24);
  assert.equal(g.turn,"r");
  assert.equal(g.mustContinue,null);
  assert.equal(checkersLegalMoves(g).length,7);
  assert.equal(checkersLegalMoves(g).some(m=>m.jumped!==null),false);
  assert.deepEqual(newCheckers(12),g);
  assert.equal(validCheckers({...g,board:g.board.slice(1)}),false);
  assert.equal(validCheckers({...g,board:[...g.board.slice(0,1),"r",...g.board.slice(2)]}),false);
});
test("forward-only red men move diagonally and cannot move or capture backwards",()=>{
  const g=custom([[26,"r"],[35,"b"],[7,"b"]]);
  assert(validCheckers(g));
  const legal=checkersLegalMoves(g);
  assert(has(legal,26,17));assert(has(legal,26,19));
  assert(!has(legal,26,44));
  assert.equal(moveCheckers(g,26,44).valid,false);
  assert.equal(moveCheckers(g,26,18).valid,false);
  assert.equal(moveCheckers(g,26,35).valid,false);
  assert.equal(moveCheckers(g,35,44).valid,false);
});
test("mandatory capture overrides ordinary moves by all other pieces",()=>{
  const g=custom([[40,"r"],[46,"r"],[33,"b"],[7,"b"]]);
  const legal=checkersLegalMoves(g);
  assert(legal.length>0);
  assert(legal.every(m=>m.jumped!==null));
  assert(legal.every(m=>m.from===40));
  assert(has(legal,40,26));
  assert.equal(moveCheckers(g,46,37).valid,false);
  const res=moveCheckers(g,40,26);
  assert(res.valid);assert.equal(res.game.board[33],null);
  assert.equal(res.game.board[26],"r");
  assert.equal(res.game.moves,1);
  assert.equal(g.board[33],"b","original must be untouched");
});
test("chained jumps require the same piece, are not skippable, and add just one undo snapshot",()=>{
  const g=custom([[40,"r"],[33,"b"],[19,"b"],[7,"b"],[46,"r"]]);
  const first=moveCheckers(g,40,26);
  assert(first.valid);
  assert.equal(first.complete,false);
  assert.equal(first.game.turn,"r");
  assert.equal(first.game.mustContinue,26);
  assert.equal(first.game.history.length,1);
  assert.deepEqual(checkersLegalMoves(first.game),[{from:26,to:12,jumped:19}]);
  assert.equal(moveCheckers(first.game,46,37).valid,false);
  const second=moveCheckers(first.game,26,12);
  assert(second.valid);
  assert.equal(second.complete,true);
  assert.equal(second.game.turn,"b");
  assert.equal(second.game.mustContinue,null);
  assert.equal(second.game.history.length,1);
  assert.equal(second.game.board[33],null);
  assert.equal(second.game.board[19],null);
  const undo=undoCheckers(second.game);
  assert(undo.valid);
  assert.deepEqual(undo.game.board,g.board);
  assert.equal(undo.game.turn,"r");
  assert.equal(undo.game.moves,0);
});
test("American promotion during capture ends turn instead of starting a new backward king jump",()=>{
  const g=custom([[17,"r"],[10,"b"],[12,"b"]]);
  assert(has(checkersLegalMoves(g),17,3));
  const move=moveCheckers(g,17,3);
  assert(move.valid);
  assert.equal(move.game.board[3],"R");
  assert.equal(move.game.turn,"b");
  assert.equal(move.game.mustContinue,null);
  assert.equal(move.complete,true);
  assert(move.game.winner===null);
  assert.equal(move.game.board[12],"b");
});
test("kings can move and jump diagonally in both directions, but not fly across the board",()=>{
  const g=custom([[26,"R"],[35,"b"],[7,"b"]]);
  const m=checkersLegalMoves(g);
  assert(m.some(x=>x.from===26&&x.to===44&&x.jumped===35));
  assert(m.every(x=>x.jumped!==null));
  assert.equal(moveCheckers(g,26,44).valid,true);
  assert.equal(moveCheckers(g,26,53).valid,false);
  const noJump=custom([[26,"R"],[7,"b"]]);
  assert(has(checkersLegalMoves(noJump),26,17));
  assert(has(checkersLegalMoves(noJump),26,35));
});
test("no legal opponent moves means a real win, not a fake score",()=>{
  const g=custom([[44,"r"],[56,"b"]]);
  const result=moveCheckers(g,44,35);
  assert(result.valid);
  assert.equal(result.game.winner,"r");
  assert.equal(result.game.board[56],"b");
  assert.equal(result.game.turn,"b");
  assert.equal(checkersLegalMoves(result.game).length,0);
  assert.equal(moveCheckers(result.game,35,26).valid,false);
  const restored=undoCheckers(result.game);
  assert(restored.valid);
  assert.equal(restored.game.winner,null);
});
test("Pip makes only legal moves, completes all forced jumps, and returns the turn to Mom",()=>{
  for(let seed=0;seed<15;seed++){
    let g=newCheckers(seed);
    for(let turn=0;turn<45&&g.winner===null;turn++){
      if(g.turn==="r"){
        const legal=checkersLegalMoves(g);
        assert(legal.length);
        const move=legal[(turn+seed)%legal.length];
        const result=moveCheckers(g,move.from,move.to);
        assert(result.valid);
        g=result.game;
      }else{
        const before=g,original=JSON.stringify(g);
        const result=checkersBotTurn(g);
        assert(result.valid);
        assert.equal(JSON.stringify(before),original);
        g=result.game;
        assert(g.turn==="r"||g.winner!==null);
      }
      assert(validCheckers(g));
      assert(g.board.filter(p=>p?.toLowerCase()==="r").length<=12);
      assert(g.board.filter(p=>p?.toLowerCase()==="b").length<=12);
    }
  }
  assert.equal(checkersBotTurn(newCheckers(5)).valid,false);
});
test("a hint identifies a legal red move and full-turn undo survives a Pip reply",()=>{
  let g=newCheckers(81);
  const hint=checkersHint(g);
  assert(hint&&has(checkersLegalMoves(g),hint.from,hint.to));
  const moved=moveCheckers(g,hint.from,hint.to);
  assert(moved.valid);assert.equal(moved.game.turn,"b");
  const reply=checkersBotTurn(moved.game);
  assert(reply.valid);
  const undo=undoCheckers(reply.game);
  assert(undo.valid);
  assert.deepEqual(undo.game.board,g.board);
  assert.equal(undo.game.turn,"r");
  assert.equal(undo.game.moves,0);
  assert.equal(undo.game.history.length,0);
});
test("existing saved farm, garden, Rook, War, Solitaire and picture puzzles remain unchanged",()=>{
  const original={progress:{harvest:21},easyProgress:{harvest:22},
    collection:{claimed:{"harvest:1":true},companion:"bunny"},
    cards:{solitaire:newSolitaire(11),war:newWar(21),jigsaw:newJigsaw(9,"pip",4)}};
  const before=createSaveState(original);
  assert.equal(before.cards.checkers,null);
  const checkers=newCheckers(123);
  const after=createSaveState({...before,cards:{...before.cards,checkers}});
  assert.deepEqual(after.cards.solitaire,before.cards.solitaire);
  assert.deepEqual(after.cards.war,before.cards.war);
  assert.deepEqual(after.cards.jigsaw,before.cards.jigsaw);
  assert.deepEqual(after.collection,before.collection);
  assert.deepEqual(after.progress,before.progress);
  assert.deepEqual(after.easyProgress,before.easyProgress);
  assert.deepEqual(after.cards.checkers,checkers);
  assert.equal(createSaveState({...after,cards:{...after.cards,checkers:{kind:"bad"}}})
    .cards.checkers,null);
});
