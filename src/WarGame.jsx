import React,{useState} from "react";
import {ClassicCard} from "./CardTiles.jsx";
import {newWar,flipWar} from "./war.js";
import "./family-game-house.css";

export default function WarGame({game,onChange,onLeave}){
  const [confirm,setConfirm]=useState(false);
  const flip=()=>{const result=flipWar(game);if(result.valid)onChange(result.game);};
  const battle=game.lastBattle;
  return <section className="family-mini-game" aria-label="War card game">
    <div className="cardgame-top"><div>
      <p className="trail-eyebrow">🃏 Family card classics</p><h2>War · Mom vs. Pip</h2></div>
      <button type="button" className="trail-back" onClick={onLeave}>‹ Card Corner</button>
    </div>
    <p className="cardgame-help">Flip one card each! The higher card wins both.
      Ties start a War: three cards facedown, then another card faceup.
      Ace is high. No timer, no ads.</p>
    <div className="family-war-score" aria-label="Cards remaining">
      <strong>🌼 Your cards: {game.piles[0].length}</strong>
      <strong>🐰 Pip's cards: {game.piles[1].length}</strong>
      <span>Round {game.round.toLocaleString()}</span>
    </div>
    <div className="family-war-table">
      <div><strong>Mom</strong>
        {battle?<ClassicCard card={battle.cards.at(-1)[0]}/>:
          <div className="family-war-back">🌼</div>}</div>
      <div className="family-war-battle">
        {battle?.warCount?<strong>⚡ WAR! ×{battle.warCount}</strong>:<strong>VS</strong>}
        <small>{battle?battle.won+" cards won":"Ready to play"}</small>
      </div>
      <div><strong>Pip</strong>
        {battle?<ClassicCard card={battle.cards.at(-1)[1]}/>:
          <div className="family-war-back">🐰</div>}</div>
    </div>
    <p className="family-mini-notice" role="status">
      {game.finished?game.winner===0?"🏆 You won the game!":
        game.winner===1?"Pip wins! Another round?":"It's a tie!":
        !battle?"Ready, Mom? Pip's got his cards!":
        (battle.winner===0?"You won this battle! ":"Pip won this battle! ")+
        (battle.warCount?"War showdown! ":"")+"You took "+battle.won+" cards."}
    </p>
    {game.round>=1000&&!game.finished&&<p className="cardgame-help">
      A long and lovely game! War can take thousands of flips. Start a fresh game whenever you like.</p>}
    <div className="family-mini-actions">
      <button type="button" className="family-mini-primary" onClick={flip} disabled={game.finished}>🃏 Flip Cards</button>
      <button type="button" onClick={()=>{
        if(!confirm){setConfirm(true);return;}
        onChange(newWar(Date.now()));setConfirm(false);
      }}>{confirm?"✓ Confirm Fresh Game":"↻ New Game"}</button>
    </div>
    <p className="cardgame-foot">Saved automatically. Only your own game data stays on this device.</p>
  </section>;
}
