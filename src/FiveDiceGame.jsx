import React,{useState} from "react";
import {FIVE_DICE_CATEGORIES,newFiveDice,validFiveDice,rollFiveDice,holdFiveDie,
  fiveDicePreview,fiveDiceTotals,availableFiveDiceCategories,
  scoreFiveDice,fiveDiceBotTurn,fiveDiceHint} from "./five-dice.js";
import "./five-dice.css";
const PIPS={
  1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],
  6:[1,3,4,6,7,9]
};
export default function FiveDiceGame({game,onChange,onLeave}){
  const [notice,setNotice]=useState("Roll all five dice, then choose what to keep!");
  const [nextMode,setNextMode]=useState(game.mode);
  const [confirmNew,setConfirmNew]=useState(false);
  const [hint,setHint]=useState(null);
  if(!validFiveDice(game))return <section className="family-mini-game five-dice-game">
    <h2>Five Dice</h2><p>That saved dice game could not be read.</p>
    <button type="button" onClick={()=>onChange(newFiveDice(Date.now()))}>Start a fresh game</button>
  </section>;
  const mom=fiveDiceTotals(game,0),pip=fiveDiceTotals(game,1);
  const allowed=availableFiveDiceCategories(game);
  const blocked=game.rolls>0&&allowed.length>0&&allowed.length<
    FIVE_DICE_CATEGORIES.filter(c=>!Object.hasOwn(game.scores[game.turn],c.id)).length;
  const gameResult=game.finished?(game.mode==="solo"?
    "Lovely game, Mom! You scored "+mom.total+" points!":
    game.winner==="tie"?"It's a tie! Both scored "+mom.total+".":
    game.winner===0?"Mom wins! "+mom.total+" to "+pip.total+"!":
      "Pip wins this round, "+pip.total+" to "+mom.total+"."):"";
  function roll(){
    const result=rollFiveDice(game);
    if(!result.valid)return;
    onChange(result.game);setHint(null);setNotice(result.game.last);
  }
  function hold(index){
    const result=holdFiveDie(game,index);
    if(!result.valid)return;
    onChange(result.game);setHint(null);
    setNotice(result.game.held[index]?"That die is held for your next roll.":
      "That die will roll again next time.");
  }
  function score(id){
    const result=scoreFiveDice(game,id);
    if(!result.valid){setNotice("That row isn't available. Choose a highlighted row.");return;}
    let next=result.game;
    if(!next.finished&&next.mode==="pip"&&next.turn===1){
      const bot=fiveDiceBotTurn(next);
      if(!bot.valid){setNotice("Pip couldn't finish this turn. Your scores are safe.");return;}
      next=bot.game;
    }
    onChange(next);setHint(null);setConfirmNew(false);
    setNotice("You scored "+result.points+" in "+
      FIVE_DICE_CATEGORIES.find(c=>c.id===id).label+
      (result.bonus?" plus 100 bonus points!":"!")+
      (next.lastPip&&next.mode==="pip"?" Pip just played too.":""));
  }
  function showHint(){
    const id=fiveDiceHint(game);
    setHint(id);
    setNotice(!id?"Roll the dice first.":("Pip suggests "+FIVE_DICE_CATEGORIES.find(c=>c.id===id).label+
      ". You can choose any available row."));
  }
  function restart(){
    if(!confirmNew){setConfirmNew(true);
      setNotice("Tap Confirm New Game to start a fresh scorecard. Other games remain saved.");
      return;
    }
    onChange(newFiveDice(Date.now(),nextMode));setHint(null);setConfirmNew(false);
    setNotice("A fresh scorecard! Roll away.");
  }
  const lastPip=game.mode==="pip"&&game.lastPip;
  return <section className="family-mini-game five-dice-game" aria-label="Five Dice game against Pip">
    <div className="cardgame-top">
      <div><p className="trail-eyebrow">🎲 Family Game House</p>
        <h2>Five Dice with Pip</h2></div>
      <button type="button" className="trail-back" onClick={onLeave}>‹ Game Shelf</button>
    </div>
    <p className="cardgame-help">The familiar five-dice scoring game: roll up to three times,
      tap dice to hold them, then pick one of thirteen scorecard rows. Earn a
      35-point upper bonus with 63 or more. Extra Five Dice rolls can earn 100!
      No timers, ads or purchases.</p>
    <div className="five-dice-totals" aria-label="Score totals">
      <strong>🌼 Mom <span>{mom.total} points</span></strong>
      {game.mode==="pip"&&<strong>🐰 Pip <span>{pip.total} points</span></strong>}
      <strong>Round <span>{mom.filled+1>13?13:mom.filled+1} / 13</span></strong>
    </div>
    {game.finished&&<div className="cardgame-win five-dice-win" role="status">{gameResult}</div>}
    <div className="five-dice-layout">
      <div className="five-dice-play">
        <h3>🌷 Mom's Dice</h3>
        <p className="five-dice-roll-status" role="status">{game.finished?"Game completed":
          game.rolls===0?"Roll to begin your turn":
          (3-game.rolls)+" rolls left. "+
          (game.rolls===3?"Choose a score!":"Hold any dice you like.")}</p>
        <div className="five-dice-tray" aria-label="Your five dice">
          {game.dice.map((face,index)=><button key={index} type="button"
            data-die-index={index}
            className={"five-die"+(game.held[index]?" is-held":"")}
            disabled={game.rolls===0||game.rolls===3||game.finished}
            aria-pressed={game.held[index]}
            aria-label={game.rolls===0?"Die "+(index+1)+" not rolled":
              (game.held[index]?"Release":"Hold")+" die "+(index+1)+
              " showing "+face} onClick={()=>hold(index)}>
            {face===null?<span className="five-die-blank" aria-hidden="true">🌼</span>:
              <span className="five-die-grid" aria-hidden="true">
                {Array.from({length:9},(_,pos)=><span key={pos}
                  className={PIPS[face].includes(pos+1)?"pip visible":"pip"}/>)}
              </span>}
            <span className="five-die-word">{game.rolls===0?"Ready":
              game.held[index]?"Held":String(face)}</span>
          </button>)}
        </div>
        <div className="five-dice-actions">
          <button type="button" className="five-dice-primary" onClick={roll}
            disabled={game.rolls===3||game.finished||
              (game.rolls>0&&game.held.every(Boolean))}>
            🎲 {game.rolls===0?"Roll Five Dice":"Roll Again"}
          </button>
          <button type="button" onClick={showHint}
            disabled={game.rolls===0||game.finished}>💡 Score Hint</button>
        </div>
        <p className="five-dice-message" role="status">{notice}</p>
        {lastPip&&<div className="five-dice-pip-result" aria-label="Pip's last turn">
          <strong>🐰 Pip's last roll</strong>
          <p>{lastPip.dice.join(" · ")} → {FIVE_DICE_CATEGORIES.find(c=>c.id===lastPip.category)?.label}:
            {" "+lastPip.points} points{lastPip.bonus?" plus 100 bonus!":""}</p>
        </div>}
        <div className="five-dice-rules">
          <h3>How to play</h3>
          <p>Roll once to get started. Tap a die to <strong>hold</strong> it;
            the other dice reroll when you press Roll Again. You may stop
            after your first or second roll and score immediately.</p>
          <p>Choose one unused row per turn, even if it scores zero.
            When you fill all 13 rows, the highest score wins.</p>
          <p><strong>Five Dice bonus:</strong> After scoring 50 in the Five Dice row,
            another set of five matching dice earns 100 points. You must use
            the matching upper row if it is empty; otherwise choose an open
            lower row first. Bonus straights and full houses use Joker scoring.</p>
        </div>
      </div>
      <div className="five-dice-card">
        <h3>📝 Scorecard</h3>
        {blocked&&<p className="five-dice-forced" role="status">
          Five matching dice! Bonus rules restrict which row you can choose.</p>}
        <div className={"five-dice-sheet"+(game.mode==="solo"?" solo":"")}
          aria-label="Choose a scorecard row">
          <div className="five-dice-score-head">
            <strong>Category</strong><strong>Mom</strong>
            {game.mode==="pip"&&<strong>Pip</strong>}
          </div>
          {FIVE_DICE_CATEGORIES.map((category,index)=>{
            const used=Object.hasOwn(game.scores[0],category.id);
            const value=used?game.scores[0][category.id]:null;
            const available=allowed.includes(category.id)&&!used&&game.turn===0;
            return <button type="button" key={category.id} data-dice-category={category.id}
              className={"five-dice-row"+(available?" can-score":"")+
                (hint===category.id?" hinted":"")+
                (category.section==="lower"&&index===6?" lower-start":"")}
              disabled={!available||game.finished}
              onClick={()=>score(category.id)}
              aria-label={category.label+(used?", scored "+value:
                available?", score "+fiveDicePreview(game,category.id):", unavailable")}>
              <span className="five-dice-row-name">{category.label}</span>
              <span className={"five-dice-score-cell"+(available?" available":"")}>
                {used?value:available?"+"+fiveDicePreview(game,category.id):"—"}
              </span>
              {game.mode==="pip"&&<span className="five-dice-score-cell">
                {Object.hasOwn(game.scores[1],category.id)?game.scores[1][category.id]:"—"}
              </span>}
            </button>;
          })}
          <div className="five-dice-summary"><strong>Upper section</strong>
            <strong>{mom.upper}</strong>{game.mode==="pip"&&<strong>{pip.upper}</strong>}</div>
          <div className="five-dice-summary"><strong>Upper bonus (63+)</strong>
            <strong>{mom.upperBonus}</strong>{game.mode==="pip"&&<strong>{pip.upperBonus}</strong>}</div>
          <div className="five-dice-summary"><strong>Extra Five Dice bonuses</strong>
            <strong>{mom.extraBonus}</strong>{game.mode==="pip"&&<strong>{pip.extraBonus}</strong>}</div>
          <div className="five-dice-summary total"><strong>Total</strong>
            <strong>{mom.total}</strong>{game.mode==="pip"&&<strong>{pip.total}</strong>}</div>
        </div>
      </div>
    </div>
    <div className="five-dice-new-game">
      <label htmlFor="five-dice-opponent">Next game's players</label>
      <select id="five-dice-opponent" value={nextMode}
        onChange={e=>{setNextMode(e.target.value);setConfirmNew(false);}}>
        <option value="pip">Mom vs. Pip</option><option value="solo">Mom plays solo</option>
      </select>
      <button type="button" className={confirmNew?"confirm-new":""} onClick={restart}
        aria-label={confirmNew?"Confirm New Game":"New Game"}>
        {confirmNew?"✓ Confirm New Game":"↻ New Game"}
      </button>
      <small>{nextMode!==game.mode?"Player choice applies to your next game.":""}</small>
    </div>
    <p className="cardgame-foot">Everything saves locally, separately from your puzzle levels,
      garden, pets and other board games. Five Dice is an original MeekLee game inspired by
      the classic five-dice scorecard rules.</p>
  </section>;
}
