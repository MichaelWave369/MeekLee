import React,{useState} from "react";
import {cardLabel,cardRed} from "./solitaire.js";
import {newTriPeaks,TRIPEAKS_POSITIONS,tripeaksExposed,tripeaksPlayable,
  tripeaksTake,tripeaksDraw,tripeaksHint,tripeaksBlocked,undoTriPeaks}
  from "./tripeaks.js";
import "./tripeaks.css";

function cardPlace(index){
  const p=TRIPEAKS_POSITIONS[index];
  return "peak "+(p.row===3?"base":Math.floor(p.column/(p.row===1?2:p.row===2?3:1))+1)+
    ", row "+(p.row+1)+", card "+(p.column+1);
}
export default function TriPeaksGame({game,onChange,onLeave}){
  const [tip,setTip]=useState("Clear all three peaks. Choose a card one rank higher or lower than the waste.");
  const [hint,setHint]=useState(null);
  const [confirm,setConfirm]=useState(false);
  const exposed=tripeaksExposed(game);
  const playable=tripeaksPlayable(game);
  const blocked=tripeaksBlocked(game);
  const left=game.tableau.filter(Boolean).length;
  const top=game.waste.at(-1);
  function apply(result){
    if(!result.valid){setTip(result.message||"That card is not available.");return;}
    onChange(result.game);setHint(null);setConfirm(false);
    setTip(result.message||"Lovely move!");
  }
  function take(index){apply(tripeaksTake(game,index));}
  function draw(){apply(tripeaksDraw(game));}
  function hintMove(){
    const next=tripeaksHint(game);
    setHint(next?.type==="take"?next.index:null);
    setTip(!next?"No moves left. Undo a move or deal fresh!":
      next.type==="draw"?"Hint: draw a new card from the stock.":
        "Hint: the highlighted card is one rank from the waste.");
  }
  function undo(){apply(undoTriPeaks(game));}
  function fresh(){
    if(!confirm){setConfirm(true);setTip("Confirm a fresh TriPeaks deal. All your other saves stay safe.");return;}
    onChange(newTriPeaks(Date.now()));setHint(null);setConfirm(false);
    setTip("A fresh set of three peaks is ready!");
  }
  function renderCard(index){
    const card=game.tableau[index];
    const p=TRIPEAKS_POSITIONS[index];
    const available=playable.includes(index);
    const shown=exposed.includes(index);
    return <div key={index} className="tripeaks-slot"
      style={{"--tri-x":p.x*10+"%","--tri-y":p.row*51+"px",zIndex:p.row+1}}>
      {card?<button type="button" data-tripeaks-card={index}
        className={"tripeaks-playing-card"+(shown?" face-up":" face-down")+
          (shown&&cardRed(card)?" red":"")+
          (available?" playable":"")+(hint===index?" hinted":"")}
        aria-label={shown?(cardPlace(index)+": "+cardLabel(card)+
          (available?", playable":", no match")):
          (cardPlace(index)+": face down, covered")}
        disabled={!available||game.won} onClick={()=>take(index)}>
          {shown?<><strong>{cardLabel(card)}</strong>
            <span aria-hidden="true">{cardRed(card)?"♥":"♠"}</span></>:
            <span className="tripeaks-back" aria-hidden="true">🌼</span>}
        </button>:<span className="tripeaks-cleared" aria-label="Empty card slot"/>}
    </div>;
  }
  return <section className="family-mini-game tripeaks-game" aria-label="TriPeaks Solitaire">
    <div className="cardgame-top">
      <div><p className="trail-eyebrow">🌷 Mom's Solitaire Garden</p>
        <h2>TriPeaks Solitaire</h2></div>
      <button type="button" className="trail-back" onClick={onLeave}>‹ Game Shelf</button>
    </div>
    <p className="cardgame-help">Three little peaks, one relaxing challenge!
      Take an uncovered card <strong>one rank higher or lower</strong> than the
      waste card, regardless of suit. Aces and Kings connect.
      Keep taking cards to build a scoring streak. Clear all 28 cards to win.
      No timers, no payments.</p>
    <div className="tripeaks-counters" aria-label="Game progress">
      <strong>🌷 Cleared <span>{28-left}/28</span></strong>
      <strong>✨ Score <span>{game.score.toLocaleString()}</span></strong>
      <strong>🃏 Stock <span>{game.stock.length}</span></strong>
      <strong>🔥 Streak <span>{game.streak}</span></strong>
    </div>
    {game.won&&<div className="cardgame-win" role="status">
      🌼 All three peaks cleared! Wonderful playing! 🌼
    </div>}
    {blocked&&<div className="tripeaks-blocked" role="status">
      No more matching cards or stock draws. Try Undo or a fresh deal.
      TriPeaks doesn't guarantee every shuffle is winnable.
    </div>}
    <div className="tripeaks-layout">
      <main className="tripeaks-main">
        <h3>⛰️ The Three Peaks</h3>
        <p className="tripeaks-instruction">Match the top waste card,
          one number above or below. Scroll the board sideways on smaller phones.</p>
        <div className="tripeaks-board-scroll" aria-label="Three Peaks card board">
          <div className="tripeaks-board">
            {game.tableau.map((_,i)=>renderCard(i))}
          </div>
        </div>
        <div className="tripeaks-decks" aria-label="Stock and waste piles">
          <button type="button" className="tripeaks-stock" onClick={draw}
            disabled={game.won||!game.stock.length}
            aria-label={game.stock.length?"Draw one new waste card":"No more stock cards"}>
            <span className="tripeaks-flower" aria-hidden="true">🌼</span>
            <strong>{game.stock.length?"Draw Card":"Stock Empty"}</strong>
            <small>{game.stock.length} left</small>
          </button>
          <div className="tripeaks-waste" aria-label={"Top waste card "+cardLabel(top)}>
            <span>Top Waste</span>
            <div className={"tripeaks-waste-face"+(cardRed(top)?" red":"")}>
              <strong>{cardLabel(top)}</strong>
              <span aria-hidden="true">{cardRed(top)?"♥":"♠"}</span>
            </div>
          </div>
        </div>
        <p className="tripeaks-notice" role="status">{tip}</p>
        <div className="tripeaks-actions">
          <button type="button" disabled={game.won} onClick={hintMove}>💡 Hint</button>
          <button type="button" disabled={!game.history.length} onClick={undo}>↶ Undo</button>
          <button type="button" aria-label={confirm?"Confirm New Deal":"New Deal"}
            className={confirm?"confirm":""} onClick={fresh}>
            {confirm?"✓ Confirm New Deal":"↻ New Deal"}
          </button>
        </div>
      </main>
      <aside className="tripeaks-side">
        <h3>🌼 Playable Cards</h3>
        <p>Big buttons for every card you can play. No tiny taps required.</p>
        {playable.length?<div className="tripeaks-choices">
          {playable.map(index=><button type="button" key={index}
            data-tripeaks-choice={index} onClick={()=>take(index)}
            className={"tripeaks-choice"+(hint===index?" hinted":"")}
            aria-label={"Play "+cardLabel(game.tableau[index])+" from "+cardPlace(index)}>
            <strong>{cardLabel(game.tableau[index])}</strong>
            <small>{cardPlace(index)}</small>
          </button>)}
        </div>:<p className="tripeaks-no-match">
          {game.stock.length?"No matching cards. Draw another to keep going.":
            "No matches or draws left. Try Undo or New Deal."}</p>}
        <div className="tripeaks-rules">
          <h3>How to Play</h3>
          <p><strong>1.</strong> Start with the face-up cards along the base.</p>
          <p><strong>2.</strong> Remove an exposed card one rank above or below the
            waste pile card. Suit doesn't matter; King and Ace wrap around.</p>
          <p><strong>3.</strong> Every card collected becomes the new waste card,
            letting you build a chain without drawing.</p>
          <p><strong>4.</strong> If stuck, draw from the stock. The stock cannot be
            recycled, but Hint and Undo are always free.</p>
          <p><strong>5.</strong> Clear all three peaks to win. Each consecutive
            card adds bonus points to your streak.</p>
        </div>
      </aside>
    </div>
    <p className="cardgame-foot">Saved automatically on this device, separately from Klondike,
      Pyramid, your garden, and every other game. All original MeekLee cards.
    </p>
  </section>;
}
