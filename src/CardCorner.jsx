import React, {useState} from "react";
import SolitaireGame from "./SolitaireGame.jsx";
import RookGame from "./RookGame.jsx";
import ColorParadeGame from "./ColorParadeGame.jsx";
import {newSolitaire} from "./solitaire.js";
import {newRook} from "./rook.js";
import {newColorParade} from "./color-parade.js";

const GAMES=[
  {id:"solitaire",icon:"♠️",title:"Klondike Solitaire",
    description:"The relaxing classic with draw-one cards, seven columns and four foundations.",
    detail:"One player • Hints and undo"},
  {id:"rook",icon:"🐦",title:"Rook Card Table",
    description:"Four-player partnership bidding and tricks. Mom teams up with Pip against two computer players.",
    detail:"Mom + 3 bots • Team play"},
  {id:"parade",icon:"🌈",title:"Color Parade",
    description:"An original Uno-style color-and-number card game with fun action cards.",
    detail:"Mom + 3 bots • Color matching"}
];

export default function CardCorner({cards,onChange,onBack}){
  const [active,setActive]=useState(null);
  const chosen=GAMES.find(g=>g.id===active);
  function launch(id){
    if(!cards?.[id]){
      const fresh=id==="solitaire"?newSolitaire(Date.now()):
        id==="rook"?newRook(Date.now()):newColorParade(Date.now());
      onChange(id,fresh);
    }
    setActive(id);
  }
  function restart(){
    setActive(null);
    if(typeof window!=="undefined")window.scrollTo({top:0,behavior:"auto"});
  }
  if(chosen&&cards?.[chosen.id]){
    const shared={game:cards[chosen.id],onChange:game=>onChange(chosen.id,game),onLeave:restart};
    return chosen.id==="solitaire"?<SolitaireGame {...shared}/>:
      chosen.id==="rook"?<RookGame {...shared}/>:<ColorParadeGame {...shared}/>;
  }
  return <section className="card-corner" aria-label="Mom's Card Corner">
    <div className="cardgame-top">
      <div><p className="trail-eyebrow">🌼 A whole new set of adventures</p>
        <h2>Mom's Card Corner</h2></div>
      <button type="button" className="trail-back" onClick={onBack}>‹ Back to Puzzles</button>
    </div>
    <p className="cardgame-help">Pick a favorite! Every card game is completely free,
      saves on this phone, and can be played at your own pace.</p>
    <div className="card-corner-choices">
      {GAMES.map(game=><button type="button" className="card-corner-choice" key={game.id}
        onClick={()=>launch(game.id)} aria-label={"Play "+game.title}>
        <span className="corner-game-art" aria-hidden="true">{game.icon}</span>
        <span className="corner-game-text"><strong>{game.title}</strong>
          <small>{game.description}</small><em>{game.detail}</em>
          <span className="card-corner-launch">{cards?.[game.id]?"Continue Game →":"Play Now →"}</span>
        </span>
      </button>)}
    </div>
    <p className="cardgame-foot">No downloads, no paywalls, no accounts. Computer players play right here in the browser, even offline.</p>
  </section>;
}
