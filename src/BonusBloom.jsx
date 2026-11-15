import React, { useEffect, useRef, useState } from "react";
import { bonusBoard } from "./collection.js";

export default function BonusBloom({bonusId, bestMoves, onComplete, onBack}) {
  const deck=bonusBoard(bonusId);
  const [visible,setVisible]=useState([]);
  const [matched,setMatched]=useState([]);
  const [moves,setMoves]=useState(0);
  const [finished,setFinished]=useState(false);
  const [locked,setLocked]=useState(false);
  const [message,setMessage]=useState("Find two matching pictures. Take your time!");
  const timer=useRef(null);
  useEffect(()=>()=>{if(timer.current)window.clearTimeout(timer.current);},[]);
  if (!deck) return <section className="bonus-screen"><p>That board isn't available.</p>
    <button className="trail-back" onClick={onBack}>Back to Garden</button></section>;

  function restart() {
    if(timer.current)window.clearTimeout(timer.current);
    timer.current=null;
    setVisible([]);setMatched([]);setMoves(0);
    setFinished(false);setLocked(false);
    setMessage("A fresh start! Find the matching pictures.");
  }
  function flip(index) {
    if (finished || locked || matched.includes(index) || visible.includes(index)) return;
    if (visible.length===0) {
      setVisible([index]);setMessage("Now choose the matching picture.");
      return;
    }
    const first=visible[0], nextMoves=moves+1;
    setMoves(nextMoves);setVisible([first,index]);
    if (deck[first]===deck[index]) {
      const nextMatched=[...matched,first,index];
      setMatched(nextMatched);setVisible([]);
      if(nextMatched.length===deck.length) {
        setFinished(true);setMessage("All eight pairs found! Your bonus garden is blooming.");
        onComplete(bonusId,nextMoves);
      } else {
        setMessage("Lovely match! "+(nextMatched.length/2)+" of 8 pairs found.");
      }
    } else {
      setLocked(true);setMessage("Those are different. Let's try another pair.");
      timer.current=window.setTimeout(()=>{
        timer.current=null;setVisible([]);setLocked(false);
      },900);
    }
  }
  const found=matched.length/2;
  return <section className="bonus-screen" aria-label="Treasure Match bonus board">
    <div className="bonus-heading">
      <button className="trail-back" type="button" onClick={onBack}>‹ My Garden</button>
      <div><p className="trail-eyebrow">🎁 Treasure Chest Bonus</p><h2>Treasure Match!</h2></div>
    </div>
    <p className="bonus-instructions">Flip two pictures to make a pair. No time limit or losing!</p>
    <div className="bonus-score" aria-label="Bonus board progress">
      <span>🌼 {found} / 8 pairs</span><span>🧩 {moves} turns</span>
      {Number.isInteger(bestMoves)&&<span>🏅 Best {bestMoves}</span>}
    </div>
    <div className="bonus-grid" role="group" aria-label="Sixteen treasure matching cards">
      {deck.map((picture,index)=>{
        const faceUp=visible.includes(index)||matched.includes(index);
        const collected=matched.includes(index);
        return <button type="button" key={index}
          className={"bonus-card"+(faceUp?" face-up":"")+(collected?" matched":"")}
          aria-label={"Card "+(index+1)+", "+(faceUp?picture:"face down")+(collected?", matched":"")}
          aria-pressed={faceUp} disabled={finished||locked||collected}
          onClick={()=>flip(index)}>
          <span aria-hidden="true">{faceUp?picture:"❔"}</span>
        </button>;
      })}
    </div>
    <p className="bonus-message" role="status" aria-live="polite">{message}</p>
    {finished?
      <div className="bonus-success" role="status">
        <strong>🎉 Treasure Match Complete!</strong>
        <p>You've earned a garden memory badge! Your best score is saved.</p>
        <button type="button" onClick={onBack}>🌼 Back to My Garden</button>
        <button type="button" onClick={restart}>↻ Play Again</button>
      </div>:
      <div className="bonus-actions">
        <button className="bonus-restart" type="button" onClick={restart}>↻ Start Over</button>
        <button className="bonus-exit" type="button" onClick={onBack}>🌷 My Garden</button>
      </div>}
  </section>;
}
