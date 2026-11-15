import React,{useState} from "react";
import {CHESS_GLYPHS,CHESS_NAMES,newChess,validChess,chessSquare,
  chessLegalMoves,chessInCheck,chessMove,chessBotTurn,chessHint,undoChess} from "./chess.js";
import "./chess.css";

export default function ChessGame({game,onChange,onLeave}){
  const [selected,setSelected]=useState(null);
  const [hinted,setHinted]=useState(null);
  const [promotion,setPromotion]=useState("Q");
  const [confirmNew,setConfirmNew]=useState(false);
  const [notice,setNotice]=useState("You play the cream pieces. Choose a glowing piece, then a destination.");
  const legal=chessLegalMoves(game);
  const playable=new Set(legal.map(m=>m.from));
  const destinations=new Set(selected===null?[]:legal.filter(m=>m.from===selected).map(m=>m.to));
  const checked=game.winner===null&&chessInCheck(game);
  const result=game.winner===null?null:game.winner==="draw"?
    "It's a draw ("+game.reason+"). Lovely game!":
    game.winner==="w"?"Mom wins by "+game.reason+"! Beautifully played!":
      "Pip wins by "+game.reason+". Fancy another game?";
  function choose(i){
    if(game.winner!==null||game.turn!=="w")return;
    if(selected!==null&&destinations.has(i)){
      const move=chessMove(game,selected,i,promotion);
      if(!move.valid){setNotice(move.message);return;}
      let next=move.game;
      if(next.winner===null&&next.turn==="b"){
        const response=chessBotTurn(next);
        if(response.valid)next=response.game;
      }
      onChange(next);setSelected(null);setHinted(null);
      setNotice(next.winner?next.winner==="draw"?"It's a draw!":
        next.winner==="w"?"Checkmate! You won!":"Pip found checkmate.":
        next.turn==="w"&&chessInCheck(next)?"You're in check. Protect your king!":
          "Lovely! "+move.message+". "+(next.last!==move.message?"Pip replied: "+next.last:""));
      return;
    }
    if(playable.has(i)){setSelected(i);setHinted(null);
      setNotice("Choose a highlighted destination for "+chessSquare(i)+".");
    }else{
      setSelected(null);
      setNotice(checked?"You're in check; move a piece that protects your king.":
        "Choose one of your cream pieces with a glowing dot.");
    }
  }
  function suggest(){
    const move=chessHint(game);
    if(!move){setNotice("No move is available.");return;}
    setSelected(move.from);setHinted(move.to);
    setNotice("Try "+chessSquare(move.from)+" to "+chessSquare(move.to)+".");
  }
  function undo(){
    const result=undoChess(game);
    if(!result.valid){setNotice("Nothing to undo yet.");return;}
    onChange(result.game);setSelected(null);setHinted(null);setConfirmNew(false);
    setNotice("Your last turn and Pip's reply were undone.");
  }
  function fresh(){
    if(!confirmNew){setConfirmNew(true);setNotice("Tap New Game once more to confirm.");return;}
    onChange(newChess(Date.now(),game.difficulty));setSelected(null);setHinted(null);
    setConfirmNew(false);setNotice("New chess game! You're first.");
  }
  function setDifficulty(next){
    if(next!=="gentle"&&next!=="confident")return;
    onChange({...game,difficulty:next});
    setNotice(next==="gentle"?"Pip is playing gently.":"Pip is playing more carefully.");
  }
  if(!validChess(game))return <p>This saved board needs a fresh game.</p>;
  return <section className="family-mini-game chess-page" aria-label="Chess with Pip">
    <div className="cardgame-top">
      <div><p className="trail-eyebrow">♔ The Board Game Nook</p><h2>Chess with Pip</h2></div>
      <button type="button" className="trail-back" onClick={onLeave}>‹ Game Shelf</button>
    </div>
    <p className="cardgame-help">Your cream pieces move first. Tap a highlighted piece,
      then a highlighted square. Full chess rules, including castling, en passant,
      all promotions, checkmate and draws. No clock and no purchases.</p>
    <div className="chess-options">
      <label htmlFor="chess-difficulty">Pip's challenge</label>
      <select id="chess-difficulty" aria-label="Pip challenge level"
        value={game.difficulty} onChange={e=>setDifficulty(e.target.value)}>
        <option value="gentle">Gentle</option>
        <option value="confident">Confident</option>
      </select>
      <label htmlFor="chess-promotion">When my pawn reaches the end</label>
      <select id="chess-promotion" value={promotion} onChange={e=>setPromotion(e.target.value)}>
        <option value="Q">Queen</option><option value="R">Rook</option>
        <option value="B">Bishop</option><option value="N">Knight</option>
      </select>
    </div>
    <div className="chess-layout">
      <div className="chess-center">
        <p className="chess-status" role="status">{result||
          (checked?"Your king is in CHECK!":game.turn==="w"?"Your turn":"Pip's turn")}</p>
        <div className="chess-board" role="group" aria-label="Eight by eight Chess board">
          {game.board.map((piece,i)=>{
            const isWhite=piece&&piece===piece.toUpperCase();
            const source=playable.has(i)&&game.turn==="w";
            const dest=destinations.has(i);
            const kingChecked=checked&&piece===(game.turn==="w"?"K":"k");
            return <button type="button" key={i} data-chess-index={i}
              className={"chess-square "+((Math.floor(i/8)+i%8)%2?"dark":"light")+
                (source?" source":"")+(dest?" destination":"")+
                (selected===i?" selected":"")+(hinted===i?" suggested":"")+
                (kingChecked?" checked":"")}
              aria-pressed={selected===i}
              aria-label={chessSquare(i)+(piece?", "+(isWhite?"cream ":"blue ")+
                CHESS_NAMES[piece.toUpperCase()]:" empty")+
                (source?", selectable":"")+(dest?", legal destination":"")}
              onClick={()=>choose(i)} disabled={game.winner!==null||game.turn!=="w"}>
              {piece&&<span className={"chess-piece "+(isWhite?"cream":"blue")}
                aria-hidden="true">{CHESS_GLYPHS[piece]}</span>}
              {dest&&<span className="chess-target" aria-hidden="true"/>}
            </button>;
          })}
        </div>
        <p className="chess-notice" role="status">{notice}</p>
        <div className="chess-controls">
          <button type="button" onClick={suggest} disabled={game.turn!=="w"||!!game.winner}>Hint</button>
          <button type="button" onClick={undo} disabled={!game.history.length}>Undo Turn</button>
          <button type="button" className={confirmNew?"confirm-new":""} onClick={fresh}>
            {confirmNew?"Confirm New Game":"New Game"}
          </button>
        </div>
      </div>
      <aside className="chess-rules">
        <h3>How to Play</h3>
        <p><strong>1.</strong> You are cream. Move one piece at a time; Pip plays blue.</p>
        <p><strong>2.</strong> Protect your king! You cannot move into check.
          Checkmate ends the game.</p>
        <p><strong>3.</strong> Castling is available when the king and rook have not moved
          and the king's path is safe. En passant and pawn promotion work too.</p>
        <p><strong>4.</strong> Stalemate, threefold repetition, the fifty-move rule
          and insufficient material end in a draw.</p>
        <div className="chess-cozy"><strong>Pip's promise</strong>
          <p>Take your time. Games save here on your device, without a timer or a bill.</p>
        </div>
      </aside>
    </div>
  </section>;
}
