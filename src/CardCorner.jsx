import React, {useState} from "react";
import SolitaireGame from "./SolitaireGame.jsx";
import PyramidGame from "./PyramidGame.jsx";
import RookGame from "./RookGame.jsx";
import ColorParadeGame from "./ColorParadeGame.jsx";
import FamilyTable from "./FamilyTable.jsx";
import WarGame from "./WarGame.jsx";
import StackRaceGame from "./StackRaceGame.jsx";
import JigsawGame from "./JigsawGame.jsx";
import FamilyPorch from "./FamilyPorch.jsx";
import CheckersGame from "./CheckersGame.jsx";
import BackgammonGame from "./BackgammonGame.jsx";
import ChessGame from "./ChessGame.jsx";
import FiveDiceGame from "./FiveDiceGame.jsx";
import {newSolitaire} from "./solitaire.js";
import {newPyramid} from "./pyramid.js";
import {newRook} from "./rook.js";
import {newColorParade} from "./color-parade.js";
import {newWar} from "./war.js";
import {newStack} from "./stack-race.js";
import {newJigsaw} from "./jigsaw.js";
import {newCheckers} from "./checkers.js";
import {newBackgammon,backgammonBotTurn} from "./backgammon.js";
import {newChess} from "./chess.js";
import {newFiveDice} from "./five-dice.js";
function readyBackgammon(seed){
  const start=newBackgammon(seed);
  if(start.turn!==1)return start;
  const response=backgammonBotTurn(start);
  return response.valid?response.game:start;
}

const GAMES=[
  {id:"solitaire",icon:"♠️",title:"Klondike Solitaire",
    description:"The relaxing classic with draw-one cards, seven columns and four foundations.",
    detail:"One player • Hints and undo"},
  {id:"pyramid",icon:"🔺",title:"Pyramid Solitaire",
    description:"Pair exposed cards that add up to 13, or clear a king by itself. Three relaxing passes through the stock.",
    detail:"One player • Hints and undo • Offline"},
  {id:"rook",icon:"🐦",title:"Rook Card Table",
    description:"Four-player partnership bidding and tricks. Mom teams up with Pip against two computer players.",
    detail:"Mom + 3 bots • Team play"},
  {id:"parade",icon:"🌈",title:"Color Parade",
    description:"An original Uno-style color-and-number card game with fun action cards.",
    detail:"Mom + 3 bots • Color matching"},
  {id:"war",icon:"⚔️",title:"War · Mom vs. Pip",
    description:"Flip cards and battle for the whole deck. Ties trigger a real War!",
    detail:"Mom + Pip bot • No timers"},
  {id:"dice",icon:"🎲",title:"Five Dice with Pip",
    description:"The familiar five-dice scorecard game: hold dice, roll three times, and aim for a high score.",
    detail:"Mom vs. Pip or solo • 13 scoring rows"},
  {id:"stack",icon:"🌷",title:"Stack & Bloom",
    description:"Race Pip to clear your stockpile by building shared 1–12 numbered stacks, with wild cards.",
    detail:"Original family stack race • Two lengths"},
  {id:"family",icon:"🏡",title:"Family Rook Table",
    description:"A private family gathering place for online Rook, visitors and conversation.",
    detail:"4 seats + spectators • Online room setup"}
];

export default function CardCorner({cards,onChange,onBack,settings}){
  const [active,setActive]=useState(null);
  const chosen=GAMES.find(g=>g.id===active);
  function launch(id){
    if(id==="family"||id==="porch"){setActive(id);return;}
    if(!cards?.[id]){
      const fresh=id==="solitaire"?newSolitaire(Date.now()):
        id==="pyramid"?newPyramid(Date.now()):
        id==="rook"?newRook(Date.now()):
        id==="war"?newWar(Date.now()):
        id==="stack"?newStack(Date.now()):
        id==="jigsaw"?newJigsaw(Date.now()):
        id==="checkers"?newCheckers(Date.now()):
        id==="backgammon"?readyBackgammon(Date.now()):
        id==="chess"?newChess(Date.now()):
        id==="dice"?newFiveDice(Date.now()):
        newColorParade(Date.now());
      onChange(id,fresh);
    }
    setActive(id);
  }
  function restart(){
    setActive(null);
    if(typeof window!=="undefined")window.scrollTo({top:0,behavior:"auto"});
  }
  if(active==="porch")return <FamilyPorch onLeave={restart}/>;
  if(active==="pyramid"&&cards?.pyramid)return <PyramidGame
    game={cards.pyramid} onChange={game=>onChange("pyramid",game)} onLeave={restart}/>;
  if(active==="family")return <FamilyTable onLeave={restart}
    onPractice={()=>launch("rook")}/>;
  if(active==="jigsaw"&&cards?.jigsaw)return <JigsawGame game={cards.jigsaw}
    onChange={game=>onChange("jigsaw",game)} onLeave={restart}/>;
  if(active==="checkers"&&cards?.checkers)return <CheckersGame game={cards.checkers}
    onChange={game=>onChange("checkers",game)} onLeave={restart}/>;
  if(active==="backgammon"&&cards?.backgammon)return <BackgammonGame
    game={cards.backgammon} onChange={game=>onChange("backgammon",game)} onLeave={restart}/>;
  if(active==="chess"&&cards?.chess)return <ChessGame
    game={cards.chess} onChange={game=>onChange("chess",game)} onLeave={restart}/>;
  if(active==="dice"&&cards?.dice)return <FiveDiceGame
    game={cards.dice} onChange={game=>onChange("dice",game)} onLeave={restart}/>;
  if(chosen&&cards?.[chosen.id]){
    const shared={game:cards[chosen.id],onChange:game=>onChange(chosen.id,game),onLeave:restart};
    return chosen.id==="solitaire"?<SolitaireGame {...shared}/>:
      chosen.id==="rook"?<RookGame {...shared} stats={cards.rookStats} settings={settings}/>:
      chosen.id==="war"?<WarGame {...shared}/>:
      chosen.id==="stack"?<StackRaceGame {...shared}/>:
      <ColorParadeGame {...shared}/>;
  }
  return <section className="card-corner" aria-label="Mom's Card Corner">
    <div className="cardgame-top">
      <div><p className="trail-eyebrow">🌼 A whole new set of adventures</p>
        <h2>Mom's Card Corner</h2></div>
      <button type="button" className="trail-back" onClick={onBack}>‹ Back to Puzzles</button>
    </div>
    <p className="cardgame-help">Pick a favorite! Every card game is completely free,
      saves on this phone, and can be played at your own pace.</p>
    <div className="card-corner-choices card-corner-four">
      {GAMES.map(game=><button type="button" className="card-corner-choice" key={game.id}
        onClick={()=>launch(game.id)} aria-label={"Play "+game.title}>
        <span className="corner-game-art" aria-hidden="true">{game.icon}</span>
        <span className="corner-game-text"><strong>{game.title}</strong>
          <small>{game.description}</small><em>{game.detail}</em>
          <span className="card-corner-launch">{game.id==="family"?
            "See Family Table →":cards?.[game.id]?"Continue Game →":"Play Now →"}</span>
        </span>
      </button>)}
    </div>
    <section className="card-corner-jigsaw" aria-label="Picture Puzzle Porch">
      <h3>🧩 The Puzzle Porch</h3>
      <p>Rebuild lovely pictures, earn new garden treasures, and play at your own pace.</p>
      <button type="button" className="card-corner-choice"
        onClick={()=>launch("jigsaw")} aria-label="Play Picture Puzzle Porch">
        <span className="corner-game-art" aria-hidden="true">🧩</span>
        <span className="corner-game-text"><strong>Picture Puzzles</strong>
          <small>Sunny Harvest Valley, Pip's Garden, and the Bubble Lagoon.
          Choose 9, 16 or 25 pieces; finish a picture to earn garden decorations.</small>
          <em>Offline · Easy touch controls</em>
          <span className="card-corner-launch">{cards?.jigsaw?"Continue Puzzle →":"Start Puzzling →"}</span>
        </span>
      </button>
    </section>
    <section className="card-corner-jigsaw" aria-label="Family Porch ideas and memories">
      <h3>💌 The Family Porch</h3>
      <p>Share a new game idea, or save a family recipe or story. Keep your memories close.</p>
      <button type="button" className="card-corner-choice" onClick={()=>launch("porch")}
        aria-label="Open Family Porch notebook">
        <span className="corner-game-art" aria-hidden="true">📖</span>
        <span className="corner-game-text"><strong>Family Porch Notebook</strong>
          <small>A private notebook for recipes, family stories and game ideas.
          Share by text or your phone's sharing menu.</small>
          <em>Private on your device · No account</em>
          <span className="card-corner-launch">Open Family Porch →</span>
        </span>
      </button>
    </section>
    <section className="card-corner-jigsaw checkers-nook" aria-label="Board Game Nook">
      <h3>♟️ The Board Game Nook</h3>
      <p>Pull up a chair! Chess, Checkers and Backgammon are ready to play with Pip, completely offline.</p>
      <button type="button" className="card-corner-choice"
        onClick={()=>launch("checkers")} aria-label="Play Checkers with Pip">
        <span className="corner-game-art" aria-hidden="true">♟️</span>
        <span className="corner-game-text">
          <strong>Checkers with Pip</strong>
          <small>Classic 8×8 Checkers, forced jumps, double jumps, kings, hints, undo and a cozy bot opponent.</small>
          <em>Offline · Mom + Pip · No timer</em>
          <span className="card-corner-launch">
            {cards?.checkers?"Continue Checkers →":"Play Checkers →"}
          </span>
        </span>
      </button>
      <button type="button" className="card-corner-choice"
        onClick={()=>launch("backgammon")} aria-label="Play Backgammon with Pip">
        <span className="corner-game-art" aria-hidden="true">🎲</span>
        <span className="corner-game-text">
          <strong>Backgammon with Pip</strong>
          <small>Roll dice, move fifteen checkers, hit blots, enter from the bar,
            bear off and race to five friendly points.</small>
          <em>Offline · Mom + Pip · Save and resume</em>
          <span className="card-corner-launch">
            {cards?.backgammon?"Continue Backgammon →":"Play Backgammon →"}
          </span>
        </span>
      </button>
      <button type="button" className="card-corner-choice" onClick={()=>launch("chess")}
        aria-label="Play Chess with Pip">
        <span className="corner-game-art" aria-hidden="true">♔</span>
        <span className="corner-game-text"><strong>Chess</strong>
          <small>Play Chess with Pip: full legal rules, castling, promotion, checkmate, hints and undo.</small>
          <em>Offline · Mom + Pip · Two friendly skill levels</em>
          <span className="card-corner-launch">{cards?.chess?"Continue Chess →":"Play Chess →"}</span>
        </span>
      </button>
      <div className="checkers-nook-links" aria-label="Coming in future updates">
        <div><span aria-hidden="true">🃏</span><strong>TriPeaks, Spider & FreeCell</strong><small>Coming later</small></div>
        <div><span aria-hidden="true">🌷</span><strong>New Worlds</strong><small>Coming later</small></div>
      </div>
      <p>More puzzle worlds and garden treasures remain on the roadmap, too.</p>
    </section>
    <p className="cardgame-foot">Klondike, Pyramid, Color Parade, Offline Rook, War, Five Dice, Stack & Bloom and picture puzzles
      are free to play even offline. Family Rook requires a separate online room service.</p>
  </section>;
}
