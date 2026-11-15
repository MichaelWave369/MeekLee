import React,{useState} from "react";
import {
  CHECKERS_PIECES,newCheckers,checkersLegalMoves,moveCheckers,
  checkersBotTurn,checkersHint,undoCheckers
} from "./checkers.js";
import "./checkers.css";

const letters="ABCDEFGH";
function position(index){return letters[index%8]+(8-Math.floor(index/8));}
export default function CheckersGame({game,onChange,onLeave}){
  const [selected,setSelected]=useState(null);
  const [highlight,setHighlight]=useState(null);
  const [confirmNew,setConfirmNew]=useState(false);
  const [notice,setNotice]=useState("Your red pieces move toward Pip. Tap a piece and then a glowing square.");
  const legal=checkersLegalMoves(game);
  const forced=legal.some(m=>m.jumped!==null);
  const legalSources=new Set(legal.map(m=>m.from));
  const destinations=new Set(selected===null?[]:legal.filter(m=>m.from===selected).map(m=>m.to));
  const red=game.board.filter(p=>p==="r"||p==="R").length;
  const blue=game.board.filter(p=>p==="b"||p==="B").length;
  function selectSquare(index){
    if(game.winner!==null||game.turn!=="r")return;
    const continuance=game.mustContinue!==null;
    if(selected!==null&&destinations.has(index)){
      const result=moveCheckers(game,selected,index);
      if(!result.valid){setNotice(result.message||"Try a highlighted square.");return;}
      let next=result.game;
      if(result.complete&&next.turn==="b"&&next.winner===null){
        const bot=checkersBotTurn(next);
        if(bot.valid)next=bot.game;
      }
      onChange(next);
      setSelected(next.mustContinue);
      setHighlight(null);
      setNotice(next.last);
      return;
    }
    if(legalSources.has(index)){
      setSelected(index);setHighlight(null);
      setNotice(continuance?"Keep jumping with this same piece.":
        "Now tap a glowing destination square.");
      return;
    }
    if(!continuance)setSelected(null);
    setNotice(continuance?"You must finish the jumping sequence with that piece.":
      forced?"A capture is required. Tap a glowing red piece.":"Choose a red piece with a glowing dot.");
  }
  function hint(){
    const move=checkersHint(game);
    if(!move){setNotice("No move is available just now.");return;}
    setSelected(move.from);setHighlight(move.to);
    setNotice("Try moving "+position(move.from)+" to "+position(move.to)+".");
  }
  function undo(){
    const previous=undoCheckers(game);
    if(!previous.valid){setNotice("No earlier turn to undo yet.");return;}
    onChange(previous.game);setSelected(previous.game.mustContinue);setHighlight(null);
    setNotice("Turn undone. Have another try!");
  }
  function newGame(){
    if(!confirmNew){
      setConfirmNew(true);setNotice("Tap New Game again to confirm. All your other games stay saved.");
      return;
    }
    onChange(newCheckers(Date.now()));
    setSelected(null);setHighlight(null);setConfirmNew(false);
    setNotice("A fresh checkers board! Red goes first.");
  }
  return <section className="family-mini-game checkers-page" aria-label="Checkers against Pip">
    <div className="cardgame-top">
      <div><p className="trail-eyebrow">♟️ The Board Game Nook</p>
        <h2>Checkers with Pip</h2></div>
      <button type="button" className="trail-back" onClick={onLeave}>‹ Game Shelf</button>
    </div>
    <p className="cardgame-help">Classic American Checkers. You're red, Pip is blue.
      Move diagonally, jump to capture, and reach the far edge to crown a king.
      Jumps are required when available, and a double jump must be finished.
      Play at your own pace.</p>
    <div className="checkers-score" aria-label="Checkers pieces remaining">
      <strong>🌼 Mom · Red: {red} pieces</strong>
      <strong>🐰 Pip · Blue: {blue} pieces</strong>
    </div>
    {game.winner!==null&&<div className="cardgame-win" role="status">
      {game.winner==="r"?"🏆 Mom wins! Pip says beautiful game!":
        "🐰 Pip wins this time! How about another round?"}
    </div>}
    <div className="checkers-layout">
      <div className="checkers-center">
        <p className="checkers-turn" role="status">
          {game.winner!==null?"Game finished":game.mustContinue!==null?"✨ Keep jumping!":
            forced?"⚡ A capture is required!":game.turn==="r"?"🌼 Your turn":
              "🐰 Pip's turn"}
        </p>
        <div className="checkers-board" role="group" aria-label="Eight by eight Checkers board">
          {game.board.map((piece,index)=>{
            const row=Math.floor(index/8),col=index%8;
            const dark=(row+col)%2===1;
            const source=legalSources.has(index)&&game.turn==="r";
            const dest=destinations.has(index);
            const isHint=highlight===index;
            const king=piece==="R"||piece==="B";
            const redPiece=piece==="r"||piece==="R";
            return <button type="button" key={index}
              data-checkers-index={index}
              onClick={()=>selectSquare(index)}
              disabled={!dark||game.winner!==null||game.turn!=="r"}
              aria-pressed={selected===index}
              className={"checkers-square"+(dark?" dark":" light")+
                (source?" source":"")+(dest?" destination":"")+
                (selected===index?" selected":"")+(isHint?" suggested":"")}
              aria-label={position(index)+(piece?", "+CHECKERS_PIECES[piece]:" empty")+
                (source?", selectable":"")+(dest?", legal destination":"")+
                (isHint?", hint":"")}>
              {piece&&<span className={"checkers-piece"+(redPiece?" red":" blue")+
                (king?" king":"")} aria-hidden="true">
                {king?<span className="checkers-crown">♛</span>:
                  <span className="checkers-piece-mark">{redPiece?"🌼":"🐰"}</span>}
              </span>}
              {dest&&<span className="checkers-target" aria-hidden="true"/>}
            </button>;
          })}
        </div>
        <p className="checkers-board-help" role="status">{notice}</p>
        <div className="checkers-controls">
          <button type="button" onClick={hint}
            disabled={game.turn!=="r"||game.winner!==null}>💡 Hint</button>
          <button type="button" onClick={undo} disabled={!game.history.length}>↶ Undo Turn</button>
          <button type="button" onClick={newGame} className={confirmNew?"confirm-new":""}>
            {confirmNew?"✓ Confirm New Game":"↻ New Game"}
          </button>
        </div>
      </div>
      <aside className="checkers-rules">
        <h3>🌼 How to Play</h3>
        <p><strong>1.</strong> Tap a red piece that has a glowing dot, then tap a glowing destination.</p>
        <p><strong>2.</strong> If you can jump a blue piece, you must take that jump. Several jumps may follow.</p>
        <p><strong>3.</strong> Reach the far side and your piece becomes a king. Kings move diagonally both ways.</p>
        <p><strong>4.</strong> Win by capturing Pip's pieces or leaving him without a legal move.</p>
        <div className="checkers-cozy-note">
          <strong>🐰 Pip's promise</strong>
          <p>No timers. No purchases. No pressure. Your board saves automatically.</p>
        </div>
      </aside>
    </div>
    <p className="cardgame-foot">Original offline Checkers. The family Rook table,
      garden, puzzles and other cards keep their own separate saves.</p>
  </section>;
}
