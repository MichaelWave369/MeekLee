import React, {useEffect,useState} from "react";
import {RookTile} from "./CardTiles.jsx";
import {
  ROOK_SUITS,ROOK_NAMES,ROOK_TARGET,rookLegalCards,rookBotAction,
  rookAction,newRook
} from "./rook.js";
import {normalizeRookStats, favoriteRookTrump, rookBotLine, ROOK_PERSONALITIES} from "./rook-night.js";

export default function RookGame({game,onChange,onLeave,stats,settings}){
  const [nestPicks,setNestPicks]=useState([]);
  const [confirmFresh,setConfirmFresh]=useState(false);
  const [notice,setNotice]=useState("You and Pip are teammates. Willow and Fern are your opponents.");
  const act=action=>{
    const result=rookAction(game,action);
    if(!result.valid){setNotice("That's not a legal move. Try another card.");return;}
    onChange(result.game);
    if(action.type==="discard")setNestPicks([]);
  };
  useEffect(()=>{
    const action=game.phase==="trick-done"?{type:"collect"}:
      game.phase==="bid"||game.phase==="nest"||
      game.phase==="trump"||game.phase==="play" ?
        game.turn!==0?rookBotAction(game):null:null;
    if(!action)return;
    const timer=window.setTimeout(()=>{
      const result=rookAction(game,action);
      if(result.valid)onChange(result.game);
    },game.phase==="trick-done"?850:420);
    return ()=>window.clearTimeout(timer);
  },[game,onChange]);
  const humanTurn=game.turn===0, legal=rookLegalCards(game,0);
  function chooseNest(index){
    if(game.phase!=="nest"||!humanTurn)return;
    setNestPicks(old=>old.includes(index)?old.filter(i=>i!==index):
      old.length<5?[...old,index]:old);
  }
  const bidMinimum=Math.max(70,game.bid+5);
  const winningTeam=game.winner===0?"Mom and Pip":"Willow and Fern";
  const records=normalizeRookStats(stats);
  const favorite=favoriteRookTrump(records);
  const momWon=game.phase==="game-over"&&game.winner===0;
  const confetti=Array.from({length:24},(_,i)=>({
    left:(3+i*19%95)+"%",
    delay:(i%12*-.13)+"s",
    duration:(2.1+(i%5)*.24)+"s",
    color:["#edb954","#e67e9d","#7fc1b1","#9d87ce","#ffffff"][i%5],
    drift:((i*13)%70-35)+"px"
  }));
  return <section className="cardgame rook-game" aria-label="Four-player Rook-style partnership cards">
    <div className="cardgame-top">
      <div><p className="trail-eyebrow">🐦 Four-player partnership</p>
        <h2>Rook Card Table</h2></div>
      <button type="button" className="trail-back" onClick={onLeave}>‹ Card Corner</button>
    </div>
    <div className="rook-kitchen-welcome" aria-label="Cozy family game night">
      <span aria-hidden="true">🫖</span>
      <div><strong>Welcome to Family Game Night</strong>
        <small>Pull up a chair. Pip's saving your seat!</small></div>
      <span aria-hidden="true">🕯️</span>
    </div>
    <p className="cardgame-help">Mom + Pip versus Willow + Fern. Bid, pick a trump color,
      take tricks and reach {ROOK_TARGET} team points. Classic 41-card partnership rules.</p>
    <section className="rook-records" aria-label="Mom's saved Rook statistics">
      <h3>🏆 Mom's Rook Record</h3>
      <div className="rook-record-grid">
        <div><strong>{records.played}</strong><small>Games played</small></div>
        <div><strong>{records.wins}</strong><small>Team wins</small></div>
        <div><strong>{records.bestStreak}</strong><small>Best win streak</small></div>
        <div><strong>{favorite?.label || "—"}</strong><small>Favorite trump</small></div>
      </div>
      <p className="rook-current-streak">Current winning streak: <strong>{records.currentStreak}</strong>
        <span> · {records.handsPlayed} completed hands</span>
      </p>
    </section>
    <div className="rook-team-scores" aria-label="Team scores">
      <div><strong>🌼 Mom + Pip</strong><span>{game.scores[0]} / {ROOK_TARGET}</span></div>
      <div><strong>🦊 Willow + Fern</strong><span>{game.scores[1]} / {ROOK_TARGET}</span></div>
    </div>
    <div className="rook-round-info">
      <span>Hand {game.round}</span>
      <span>{game.bid?"Bid: "+game.bid+" by "+ROOK_NAMES[game.bidder]:"Bidding starts at 70"}</span>
      <span>{game.trump?"Trump: "+game.trump:"No trump chosen"}</span>
    </div>
    <div className="rook-opponents rook-family-cast" aria-label="Three computer players">
      {[1,2,3].map(seat=><div key={seat} className={"rook-opponent"+(game.turn===seat?" active":"")+(seat===2?" partner":"")}>
        <span aria-hidden="true">{ROOK_PERSONALITIES[seat].avatar}</span>
        <strong>{ROOK_NAMES[seat]}</strong><small>{game.hands[seat].length} cards</small>
        <small>{seat===2?"Your partner":"Computer"}</small>
        <p className="rook-bot-line" aria-label={ROOK_PERSONALITIES[seat].name+" says: "+rookBotLine(game,seat)}>
          “{rookBotLine(game,seat)}”
        </p>
      </div>)}
    </div>
    <div className="rook-table-area">
      <div className="rook-trick-label">{
        game.phase==="trick-done"?"Trick won by "+ROOK_NAMES[game.trickWinner]+"!":
        game.phase==="bid"?"Place your bid, or pass.":
        game.phase==="nest"?"Winner takes the five-card nest.":
        game.phase==="trump"?"Highest bidder picks trump.":
        game.phase==="round-over"?"Hand finished!":
        game.phase==="game-over"?"Game finished!":
        "Turn: "+ROOK_NAMES[game.turn]+(humanTurn?" • your move":" • thinking…")}</div>
      <div className="rook-trick-cards" aria-label="Cards played to the current trick">
        {game.trick.length?game.trick.map(({seat,card})=>
          <div key={seat} className="rook-trick-entry">
            <RookTile card={card}/><small>{seat===0?"Mom":ROOK_NAMES[seat].split(" ")[0]}</small>
          </div>):<div className="rook-nest-closed">🐦 {game.phase==="play"?"Waiting for the next card":"The five-card nest awaits"} 🐦</div>}
      </div>
      <div className="rook-round-points"><span>🌼 Captured: {game.points[0]} pts</span>
        <span>🦊 Captured: {game.points[1]} pts</span></div>
    </div>
    {game.phase==="bid"&&humanTurn&&<div className="rook-prompt">
      <h3>Your bid</h3><p>Bid for the right to name trump. Each bid raises the last by five.</p>
      <div className="rook-action-row">
        <button type="button" onClick={()=>act({type:"bid",value:"pass"})}>Pass</button>
        <button type="button" disabled={bidMinimum>120}
          onClick={()=>act({type:"bid",value:bidMinimum})}>
          Bid {bidMinimum<=120?bidMinimum:"max"}
        </button>
        {bidMinimum+10<=120&&<button type="button"
          onClick={()=>act({type:"bid",value:bidMinimum+10})}>Bid {bidMinimum+10}</button>}
      </div>
    </div>}
    {game.phase==="nest"&&humanTurn&&<div className="rook-prompt" aria-label="Choose five cards for the nest">
      <h3>Choose five cards for the nest</h3>
      <p>Select exactly five cards to set aside. The winner of the last trick will collect their points.</p>
      <strong>{nestPicks.length} of 5 selected</strong>
      <button className="rook-confirm" type="button" disabled={nestPicks.length!==5}
        onClick={()=>act({type:"discard",indices:nestPicks})}>
        Set Aside Five Cards
      </button>
    </div>}
    {game.phase==="trump"&&humanTurn&&<div className="rook-prompt">
      <h3>Choose trump</h3><p>Any trump beats a non-trump card. The Bird is highest trump.</p>
      <div className="rook-suit-row">
        {ROOK_SUITS.map(s=><button type="button" key={s.id}
          style={{"--card-color":s.color}} onClick={()=>act({type:"trump",color:s.id})}>
          {s.mark} {s.label}
        </button>)}
      </div>
    </div>}
    {game.phase==="play"&&humanTurn&&<p className="rook-turn-tip">
      Your turn! {game.trick.length?"Follow the led color if you can.":"Lead any card."}
      <strong> {legal.length} playable cards highlighted.</strong>
    </p>}
    {game.phase==="round-over"&&<div className="rook-score-summary" role="status">
      <h3>Hand {game.round} complete!</h3>
      <p>{ROOK_NAMES[game.bidder]} bid {game.bid} and
        {game.lastResult.bidMade?" made the bid.":" went set."}</p>
      <p>🌼 Mom + Pip: {game.lastResult.teamPoints[0]} captured.
        🦊 Opponents: {game.lastResult.teamPoints[1]} captured.</p>
      <button type="button" className="rook-confirm" onClick={()=>act({type:"next"})}>Deal Next Hand →</button>
    </div>}
    {game.phase==="game-over"&&<div className={"cardgame-win rook-game-result"+(momWon?" rook-mom-victory":"")} role="status">
      {momWon&&settings?.motion&&<div className="rook-confetti" aria-hidden="true">
        {confetti.map((c,i)=><span key={i} style={{
          left:c.left,animationDelay:c.delay,animationDuration:c.duration,
          backgroundColor:c.color,"--confetti-drift":c.drift
        }}/>)}
      </div>}
      <div className="rook-victory-trophy" aria-hidden="true">{momWon?"🏆 🌼 🐰":"🌷 🦊 🃏"}</div>
      <h3>🎉 {winningTeam} win the game!</h3>
      <p>Final score: {game.scores[0]} to {game.scores[1]}.</p>
      <p className="rook-victory-quote">{momWon?"Pip: We did it, partner! That was a wonderful game!":
        "Pip: We'll get the next one, Mom. I'm always on your team!"}</p>
      <button type="button" onClick={()=>onChange(newRook(Date.now()))}>Play Again (Free)</button>
    </div>}
    {(game.phase==="bid"||game.phase==="nest"||game.phase==="trump"||game.phase==="play")&&
      <section className="rook-your-hand" aria-label="Mom's hand">
        <h3>🌼 Your Cards {humanTurn?"• Your move":"• Bots playing"}</h3>
        <div className="rook-hand-cards">
          {game.hands[0].map((card,index)=><RookTile key={card} card={card}
            selected={nestPicks.includes(index)}
            highlight={game.phase==="play"&&humanTurn&&legal.includes(index)}
            disabled={!humanTurn || game.phase==="trick-done"}
            onClick={game.phase==="nest"&&humanTurn?()=>chooseNest(index):
              game.phase==="play"&&humanTurn&&legal.includes(index)?
                ()=>act({type:"play",index}):undefined}/>)}
        </div>
      </section>}
    <p className="cardgame-notice" role="status">{notice}</p>
    <div className="rook-bottom-actions">
      <button type="button" onClick={()=>{
        if(!confirmFresh){setConfirmFresh(true);setNotice("Tap New Match again to confirm.");return;}
        setConfirmFresh(false);setNestPicks([]);onChange(newRook(Date.now()));
      }}>{confirmFresh?"Confirm New Match":"↻ New Match"}</button>
      <small>Three offline bots, real team play, no waiting for other humans.</small>
    </div>
  </section>;
}
