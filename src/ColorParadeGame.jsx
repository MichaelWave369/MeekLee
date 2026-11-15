import React, {useEffect,useState} from "react";
import {ParadeTile} from "./CardTiles.jsx";
import {
  PARADE_COLORS,PARADE_NAMES,PARADE_TARGET,paradePlayable,
  paradeAction,paradeBotAction,newColorParade
} from "./color-parade.js";

export default function ColorParadeGame({game,onChange,onLeave}){
  const [chooseWild,setChooseWild]=useState(null);
  const [confirmNew,setConfirmNew]=useState(false);
  const [notice,setNotice]=useState("Match the color, number, or symbol. Empty your hand to win!");
  const doAction=action=>{
    const result=paradeAction(game,action);
    if(!result.valid){setNotice("That card doesn't match. Try another one!");return false;}
    onChange(result.game);setChooseWild(null);
    setNotice(result.game.lastPlay);
    return true;
  };
  useEffect(()=>{
    if(game.phase!=="play"||game.turn===0)return;
    const action=paradeBotAction(game);
    if(!action)return;
    const timer=window.setTimeout(()=>{
      const result=paradeAction(game,action);
      if(result.valid)onChange(result.game);
    },430);
    return ()=>window.clearTimeout(timer);
  },[game,onChange]);
  const human=game.phase==="play"&&game.turn===0;
  const top=game.discard.at(-1);
  const active=PARADE_COLORS.find(c=>c.id===game.activeColor);
  const playable=game.hands[0].filter(card=>paradePlayable(game,card)).length;
  const winningName=PARADE_NAMES[game.winner??game.roundWinner];
  return <section className="cardgame parade-game" aria-label="Color Parade four-player matching card game">
    <div className="cardgame-top">
      <div><p className="trail-eyebrow">🌈 Four-player color matching</p><h2>Color Parade</h2></div>
      <button type="button" className="trail-back" onClick={onLeave}>‹ Card Corner</button>
    </div>
    <p className="cardgame-help">Mom versus three friendly computer players. Match color,
      number, or action. Play Skip, Reverse, Take Two, or Wild. First to an empty hand wins the round.</p>
    <div className="parade-score-strip">
      <span>🌼 Mom {game.scores[0]}</span>
      <span>🌷 Willow {game.scores[1]}</span>
      <span>🐰 Pip {game.scores[2]}</span>
      <span>🦊 Fern {game.scores[3]}</span>
    </div>
    <div className="parade-opponents">
      {[1,2,3].map(seat=><div key={seat}
        className={"parade-opponent"+(game.turn===seat?" active":"")}>
        <span aria-hidden="true">{seat===1?"🌷":seat===2?"🐰":"🦊"}</span>
        <strong>{PARADE_NAMES[seat].split(" ")[0]}</strong><small>{game.hands[seat].length} cards</small>
      </div>)}
    </div>
    <div className="parade-table">
      <div className="parade-table-status">
        <span>Round {game.round} · {game.direction===1?"↻ Clockwise":"↺ Reverse"}</span>
        <strong>{game.phase==="play"?(human?"🌼 Your turn!":PARADE_NAMES[game.turn]+" is playing…"):
          "Round complete"}</strong>
      </div>
      <div className="parade-center-cards">
        <div className="parade-card-pile">
          <strong>Draw deck</strong>
          <button className="parade-draw-pile" type="button" disabled={!human||game.drawn}
            onClick={()=>doAction({type:"draw"})}
            aria-label={game.drawn?"Already drew one card":"Draw one color card"}>
            🌼<small>{game.deck.length} cards</small>
          </button>
        </div>
        <div className="parade-card-pile">
          <strong>Top card</strong><ParadeTile card={top}/>
        </div>
        <div className="parade-active-color" style={{"--parade-color":active?.hex}}>
          <span aria-hidden="true">{active?.symbol}</span>
          <strong>{active?.label||"Any"} color</strong>
        </div>
      </div>
      <p className="parade-last-action" role="status">{game.lastPlay}</p>
    </div>
    {game.phase==="round-over"&&<div className="rook-score-summary" role="status">
      <h3>🎉 {winningName} won the round!</h3>
      <p>Cards left by other players added to the winner's score. First to {PARADE_TARGET} wins.</p>
      <button className="rook-confirm" type="button" onClick={()=>doAction({type:"next"})}>Deal Next Round →</button>
    </div>}
    {game.phase==="game-over"&&<div className="cardgame-win" role="status">
      <h3>🎉 {winningName} wins Color Parade!</h3>
      <p>Every game is free, forever.</p>
      <button type="button" onClick={()=>onChange(newColorParade(Date.now()))}>New Game</button>
    </div>}
    {game.phase==="play"&&<>
      <div className="parade-instructions">
        <strong>Your hand: {game.hands[0].length} cards</strong>
        <span>{human?playable+" matching cards":"Bots are choosing cards…"}
          {game.hands[0].length===1?" • 🌼 One card left!":""}</span>
      </div>
      {chooseWild!==null&&human&&<div className="parade-wild-picker" role="group" aria-label="Choose a new color">
        <strong>🌈 Pick your wild color</strong>
        <div>
          {PARADE_COLORS.map(c=><button type="button" key={c.id}
            style={{"--parade-color":c.hex}}
            onClick={()=>doAction({type:"play",index:chooseWild,color:c.id})}>
            {c.symbol} {c.label}
          </button>)}
        </div>
        <button type="button" className="parade-cancel" onClick={()=>setChooseWild(null)}>Cancel</button>
      </div>}
      <div className="parade-hand" role="group" aria-label="Mom's colorful hand">
        {game.hands[0].map((card,index)=><ParadeTile key={card.id} card={card}
          selected={chooseWild===index}
          highlight={human&&paradePlayable(game,card)}
          disabled={!human||!paradePlayable(game,card)||chooseWild!==null}
          onClick={()=>card.type==="wild"?setChooseWild(index):
            doAction({type:"play",index})}/>)}
      </div>
      <div className="parade-bottom-actions">
        <button type="button" disabled={!human||game.drawn}
          onClick={()=>doAction({type:"draw"})}>🃏 Draw One</button>
        <button type="button" disabled={!human||!game.drawn}
          onClick={()=>doAction({type:"pass"})}>✓ End Turn</button>
      </div>
    </>}
    <p className="cardgame-notice" role="status">{notice}</p>
    <div className="rook-bottom-actions">
      <button type="button" onClick={()=>{
        if(!confirmNew){setConfirmNew(true);setNotice("Tap New Game again to confirm.");return;}
        setChooseWild(null);setConfirmNew(false);onChange(newColorParade(Date.now()));
      }}>{confirmNew?"✓ Confirm New Game":"↻ New Game"}</button>
      <small>Original cards and symbols. Three offline bots. No accounts, ads or purchases.</small>
    </div>
  </section>;
}
