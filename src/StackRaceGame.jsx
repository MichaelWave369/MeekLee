import React,{useState} from "react";
import {
  newStack,stackNumber,stackIsWild,playStack,discardStack,
  playableStacks,stackBotTurn
} from "./stack-race.js";
import "./family-game-house.css";

function StackCard({card,hidden=false,selected=false,onClick,disabled=false}){
  const wild=card&&stackIsWild(card);
  const value=wild?"★":stackNumber(card);
  return <button type="button" className={"family-stack-card"+
    (selected?" selected":"")+(wild?" wild":"")} disabled={!onClick||disabled}
    onClick={onClick} aria-label={hidden?"Face-down stack card":wild?"Wild card":card?"Number "+value:"Empty card slot"}>
    {hidden?<span aria-hidden="true">🌼</span>:card?
      <><strong>{value}</strong><small>{wild?"WILD":"STACK"}</small></>:
      <span>+</span>}
  </button>;
}
export default function StackRaceGame({game,onChange,onLeave}){
  const [selected,setSelected]=useState(null);
  const [notice,setNotice]=useState("Pick a card, then tap a building pile (or a discard pile to end your turn).");
  const [confirm,setConfirm]=useState(false);
  const hand=game.hand[0],stock=game.stock[0],piles=game.discard[0];
  const allowed=selected?playableStacks(game,selected):[];
  function commit(result,bot=false){
    if(!result.valid){setNotice("That move doesn't fit. Try a different card or pile.");return;}
    let next=result.game;
    if(bot&&next.winner===null){
      const response=stackBotTurn(next);
      if(response.valid)next=response.game;
    }
    onChange(next);setSelected(null);setNotice(next.last||"Nice move!");
  }
  function choose(source){
    if(game.winner!==null)return;
    if(JSON.stringify(selected)===JSON.stringify(source)){setSelected(null);return;}
    setSelected(source);setNotice("Now tap one of the highlighted building piles, or a discard pile if selecting from your hand.");
  }
  function place(pileIndex){
    if(!selected){setNotice("Pick a card from your stock, hand, or discard pile first.");return;}
    commit(playStack(game,selected,pileIndex));
  }
  function endTurn(pileIndex){
    if(selected?.zone!=="hand"){setNotice("To end your turn, choose one card from your hand first.");return;}
    commit(discardStack(game,selected.index,pileIndex),true);
  }
  function fresh(stockSize){
    onChange(newStack(Date.now(),stockSize));setSelected(null);setConfirm(false);
    setNotice("A fresh set of cards. Build from 1 to 12!");
  }
  return <section className="family-mini-game" aria-label="Stack and Bloom numbered-card race">
    <div className="cardgame-top"><div><p className="trail-eyebrow">🌼 Family card classics</p>
      <h2>Stack & Bloom</h2></div>
      <button type="button" className="trail-back" onClick={onLeave}>‹ Card Corner</button></div>
    <p className="cardgame-help">A numbered-card race: clear your own stockpile first!
      Build four shared piles from 1 to 12. Stars are wild.
      Play from your stock, hand or top discard card; end your turn by placing one hand card in your discard area.</p>
    <div className="family-stack-info">
      <strong>🌼 Your stock: {stock.length}</strong><strong>🐰 Pip's stock: {game.stock[1].length}</strong>
      <span>Round {game.turns}</span><span>Draw: {game.draw.length}</span>
    </div>
    <div className="family-stack-opponent">
      <strong>🐰 Pip's top stock card</strong>
      {game.stock[1].length?<StackCard card={null} hidden/>:<span>Cleared!</span>}
      <small>{game.hand[1].length} cards in Pip's hand</small>
    </div>
    <h3>🏡 Shared building piles</h3>
    <p className="family-mini-tip">Place cards in order. Tap a highlighted pile after selecting a card.</p>
    <div className="family-stack-builds">
      {game.build.map((pile,index)=><button type="button" key={index}
        className={"family-stack-build"+(allowed.includes(index)?" family-stack-ready":"")}
        onClick={()=>place(index)} disabled={game.winner!==null}>
        <small>Pile {index+1}</small><strong>{pile.length?pile.at(-1).value:"1"}</strong>
        <small>{pile.length?"Next: "+(pile.length+1):"Start with 1"} / 12</small>
      </button>)}
    </div>
    {game.winner!==null?<div className="cardgame-win" role="status">
      {game.winner===0?"🏆 You cleared your stockpile! Beautiful game!":
        "🐰 Pip cleared his stockpile first! Play again?"}
    </div>:null}
    <h3>🌻 Your stockpile</h3>
    <div className="family-stack-stock">
      <StackCard card={stock.at(-1)} selected={selected?.zone==="stock"}
        onClick={stock.length?()=>choose({zone:"stock"}):null}/>
      <strong>{stock.length} left</strong><small>Clear these cards to win!</small>
    </div>
    <h3>🃏 Your hand ({hand.length}/5)</h3>
    <div className="family-stack-hand">
      {hand.map((card,index)=><StackCard key={card} card={card}
        selected={selected?.zone==="hand"&&selected.index===index}
        onClick={()=>choose({zone:"hand",index})}/>)}
    </div>
    <h3>🍃 Your four discard piles</h3>
    <p className="family-mini-tip">Tap one to **finish your turn** with a selected hand card. Later you can play its top card onto a building pile.</p>
    <div className="family-stack-discards">
      {piles.map((pile,index)=><div className="family-stack-discard" key={index}>
        <small>Discard {index+1}</small>
        {pile.length?<StackCard card={pile.at(-1)}
          selected={selected?.zone==="discard"&&selected.index===index}
          onClick={()=>selected?.zone==="hand"?endTurn(index):
            choose({zone:"discard",index})}/>:
          <button className="family-stack-empty" type="button"
            onClick={()=>endTurn(index)} aria-label={"Discard a hand card to empty pile "+(index+1)}>+</button>}
        <small>{pile.length} cards</small>
        {pile.length&&selected?.zone==="hand"?<button type="button"
          className="family-stack-discard-action" onClick={()=>endTurn(index)}>
          Place Here
        </button>:null}
      </div>)}
    </div>
    <p className="family-mini-notice" role="status">{notice}</p>
    <div className="family-mini-actions">
      {!confirm?<button type="button" onClick={()=>setConfirm(true)}>↻ New Game</button>:
        <div className="family-stack-new">
          <p>Start a fresh game? Your current match will be replaced.</p>
          <button type="button" onClick={()=>fresh(10)}>Quick game · 10 stock cards</button>
          <button type="button" onClick={()=>fresh(30)}>Classic length · 30 stock cards</button>
          <button type="button" onClick={()=>setConfirm(false)}>Keep Playing</button>
        </div>}
    </div>
    <p className="cardgame-foot">Offline against Pip. No timer, fees or accounts. Your game saves automatically.</p>
  </section>;
}
