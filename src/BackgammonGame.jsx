import React,{useMemo,useState} from "react";
import {
  BACKGAMMON_TARGET,newBackgammon,backgammonLegalMoves,backgammonMove,
  backgammonRoll,backgammonBotTurn,backgammonOfferDouble,
  backgammonRespondDouble,backgammonNextGame,backgammonUndo,backgammonHint
} from "./backgammon.js";
import "./backgammon.css";
const topPoints=[12,13,14,15,16,17,18,19,20,21,22,23];
const bottomPoints=[11,10,9,8,7,6,5,4,3,2,1,0];
function label(from){return from==="bar"?"Bar":from==="off"?"Home":String(from+1);}
function playLabel(move){return "Point "+label(move.from)+" → "+label(move.to)+
  " · Die "+move.die+(move.hit?" · Hit!":"");}
function Pips({count,pip=false}){
  const visible=Math.min(count,5);
  return <div className={"backgammon-pips"+(pip?" pip":" mom")} aria-hidden="true">
    {Array.from({length:visible},(_,i)=>
      <span className="backgammon-pip" key={i}>{pip?"🐰":"🌼"}</span>)}
    {count>5&&<span className="backgammon-extra">+{count-5}</span>}
  </div>;
}
export default function BackgammonGame({game,onChange,onLeave}){
  const [from,setFrom]=useState(null);
  const [confirm,setConfirm]=useState(false);
  const [notice,setNotice]=useState("Pick a point or tap a suggested move. Roll your dice when it is your turn.");
  const [hint,setHint]=useState(null);
  const legal=useMemo(()=>backgammonLegalMoves(game),[game]);
  const sources=new Set(legal.map(m=>m.from));
  const options=from===null?legal:legal.filter(m=>m.from===from);
  const canPlay=game.turn===0&&game.winner===null&&game.doubleOfferedBy===null;
  const canRoll=canPlay&&!game.dice.length;
  function update(next,message){
    onChange(next);setFrom(null);setHint(null);setNotice(message||next.last);
  }
  function afterMom(next){
    if(next.turn===1&&next.winner===null&&next.doubleOfferedBy===null){
      const response=backgammonBotTurn(next);
      if(response.valid)next=response.game;
    }
    return next;
  }
  function playMove(move){
    if(!canPlay||!move)return;
    const result=backgammonMove(game,move.from,move.to,move.die);
    if(!result.valid){setNotice(result.error||"Try a highlighted legal move.");return;}
    const next=afterMom(result.game);
    update(next,next.last);
  }
  function roll(){
    if(!canRoll)return;
    const result=backgammonRoll(game);
    if(!result.valid)return;
    update(afterMom(result.game),result.game.last);
  }
  function offer(){
    const response=backgammonOfferDouble(game);
    if(!response.valid){setNotice("The doubling cube cannot be offered right now.");return;}
    // Pip accepts an early family-game double; when strongly behind with a high
    // cube, he may decline it instead. Neither option uses money or real stakes.
    const pipDistance=response.game.board.reduce((sum,n,i)=>sum+
      (n<0?Math.abs(n)*(24-i):0),0)+response.game.bar[1]*25;
    const momDistance=response.game.board.reduce((sum,n,i)=>sum+
      (n>0?n*(i+1):0),0)+response.game.bar[0]*25;
    const accepts=response.game.cube<=2||pipDistance<momDistance+60;
    const result=backgammonRespondDouble(response.game,accepts);
    if(result.valid)update(afterMom(result.game),result.game.last);
  }
  function respond(accept){
    const result=backgammonRespondDouble(game,accept);
    if(result.valid)update(accept?afterMom(result.game):result.game,result.game.last);
  }
  function next(){
    const result=backgammonNextGame(game);
    if(result.valid)update(afterMom(result.game),result.game.last);
  }
  function restart(){
    if(!confirm){
      setConfirm(true);setNotice("Confirm a fresh match? Current Backgammon scores will restart; other games are safe.");
      return;
    }
    const fresh=newBackgammon(Date.now());
    update(afterMom(fresh),"New match! "+fresh.last);
    setConfirm(false);
  }
  function undo(){
    const result=backgammonUndo(game);
    if(result.valid)update(result.game,"Turn restored. Take your time.");
  }
  function help(){
    const move=backgammonHint(game);
    if(!move){setNotice("Roll the dice first, or choose from the available moves.");return;}
    setFrom(move.from);setHint(move);
    setNotice("Try "+playLabel(move)+".");
  }
  function pointButton(index,upper){
    const n=game.board[index],pip=n<0,mom=n>0;
    const fromHere=sources.has(index)&&canPlay;
    const suggested=hint?.from===index;
    const selected=from===index;
    return <button type="button" key={index} data-bg-point={index}
      className={"backgammon-point"+(upper?" upper":" lower")+
        (pip?" pip":"")+(mom?" mom":"")+
        (fromHere?" source":"")+(selected?" selected":"")+
        (suggested?" suggested":"")}
      aria-pressed={selected} aria-label={"Point "+(index+1)+": "+
        (pip?"Pip "+Math.abs(n):mom?"Mom "+n:"empty")+
        (fromHere?", legal source":"")}
      onClick={()=>{
        if(fromHere){setFrom(index);setHint(null);
          setNotice("Choose a destination from the large buttons below.");}
      }}>
      <span className="backgammon-point-index">{index+1}</span>
      {n!==0&&<Pips count={Math.abs(n)} pip={pip}/>}
      {fromHere&&<span className="backgammon-source-dot" aria-hidden="true"/>}
    </button>;
  }
  return <section className="family-mini-game backgammon-page" aria-label="Backgammon with Pip">
    <div className="cardgame-top">
      <div><p className="trail-eyebrow">🎲 The Board Game Nook</p>
        <h2>Backgammon with Pip</h2></div>
      <button type="button" className="trail-back" onClick={onLeave}>‹ Game Shelf</button>
    </div>
    <p className="cardgame-help">Roll, move, and bring your fifteen checkers home!
      Mom's cream checkers travel from Point 24 toward Point 1.
      Pip's blue checkers travel the other way. The game chooses legal moves for your dice.
      No clock and no money involved.</p>
    <div className="backgammon-score">
      <strong>🌼 Mom: {game.matchScore[0]} / {BACKGAMMON_TARGET}</strong>
      <strong>🐰 Pip: {game.matchScore[1]} / {BACKGAMMON_TARGET}</strong>
      <span>Game {game.round}</span>
      <span>Doubling cube: {game.cube}×</span>
    </div>
    {game.winner!==null&&<div className="cardgame-win" role="status">
      {game.winner===0?"🏆 Mom wins this game!":"🐰 Pip wins this game!"}
      {" "+game.result?.points+" points ("+game.result?.type+")."}
      {game.matchWinner!==null?<p>{game.matchWinner===0?
        "🌼 Mom won the match!":"🐰 Pip won the match!"}</p>:null}
    </div>}
    {game.doubleOfferedBy===1&&<div className="backgammon-double-offer" role="alert">
      <strong>🎲 Pip offers to double!</strong>
      <p>The cube will go from {game.cube}× to {game.cube*2}×.
        Accept to keep playing or pass to concede this game at its current value.
        These are friendly points, never money.</p>
      <div className="backgammon-actions">
        <button type="button" onClick={()=>respond(true)}>Accept Double</button>
        <button type="button" onClick={()=>respond(false)}>Pass This Game</button>
      </div>
    </div>}
    <div className="backgammon-layout">
      <div className="backgammon-main">
        <p className="backgammon-turn" role="status">
          {game.winner!==null?"Game over":game.doubleOfferedBy===1?
            "Pip offered a double":game.turn===0?
            game.dice.length?"🌼 Your move!":"🌼 Roll your dice":
            "🐰 Pip is thinking…"}
        </p>
        <div className="backgammon-scroll">
          <div className="backgammon-board" role="group" aria-label="Twenty-four point Backgammon board">
            <div className="backgammon-half top">
              {topPoints.map((index,i)=><React.Fragment key={index}>
                {i===6&&<div className="backgammon-centerbar" aria-hidden="true"/>}
                {pointButton(index,true)}
              </React.Fragment>)}
            </div>
            <div className="backgammon-middle">
              <div><strong>🐰 Pip's bar: {game.bar[1]}</strong><small>Off: {game.off[1]}/15</small></div>
              <span aria-hidden="true">🎲</span>
              <div><strong>🌼 Mom's bar: {game.bar[0]}</strong><small>Off: {game.off[0]}/15</small></div>
            </div>
            <div className="backgammon-half bottom">
              {bottomPoints.map((index,i)=><React.Fragment key={index}>
                {i===6&&<div className="backgammon-centerbar" aria-hidden="true"/>}
                {pointButton(index,false)}
              </React.Fragment>)}
            </div>
          </div>
        </div>
        <p className="backgammon-swipe-hint">On a small phone, swipe the board sideways to see all points.
          Or simply use the large legal-move buttons below.</p>
        <div className="backgammon-dice" aria-label="Remaining dice">
          <strong>🎲 Dice:</strong>
          {game.dice.length?game.dice.map((d,i)=><span className="backgammon-die" key={i}
            aria-label={"Die "+(i+1)+": "+d}>{d}</span>):<span>Not rolled yet</span>}
        </div>
        <div className="backgammon-actions">
          {canRoll&&<button type="button" className="backgammon-primary" onClick={roll}>🎲 Roll Dice</button>}
          {canRoll&&game.cube<64&&
            (game.cubeOwner===null||game.cubeOwner===0)&&
            <button type="button" onClick={offer}>Offer Double (cube {game.cube}×)</button>}
          {game.winner!==null&&game.matchWinner===null&&
            <button type="button" className="backgammon-primary" onClick={next}>Deal Next Game</button>}
          <button type="button" onClick={help} disabled={!canPlay||!game.dice.length}>
            💡 Move Hint
          </button>
          <button type="button" onClick={undo} disabled={!game.history.length}>↶ Undo My Turn</button>
          <button type="button" className={confirm?"backgammon-confirm":""} onClick={restart}>
            {confirm?"✓ Confirm Fresh Match":"↻ New Match"}
          </button>
        </div>
        <div className="backgammon-moves" aria-label="Legal Backgammon moves">
          <h3>🌼 Legal moves {from!==null?"from "+label(from):""}</h3>
          {canPlay&&game.bar[0]>0&&<p className="backgammon-help">
            You have {game.bar[0]} checker(s) on the bar. Re-enter them first.</p>}
          {canPlay&&game.dice.length>0&&!legal.length&&
            <p>No move is available for these dice; the turn will pass automatically.</p>}
          {canPlay&&legal.length>0&&<>
            <div className="backgammon-pick-sources" aria-label="Choose checker source">
              {[...sources].map(source=><button key={String(source)} type="button"
                onClick={()=>setFrom(source)} aria-pressed={from===source}>
                {source==="bar"?"🚪 Bar":"Point "+(source+1)}
              </button>)}
              {from!==null&&<button type="button" onClick={()=>setFrom(null)}>Show All</button>}
            </div>
            <div className="backgammon-move-buttons">
              {options.map(m=><button type="button" key={m.from+":"+m.to+":"+m.die}
                className={hint&&hint.from===m.from&&hint.to===m.to&&hint.die===m.die?
                  " suggested":""} onClick={()=>playMove(m)}>
                {playLabel(m)}
              </button>)}
            </div>
          </>}
          {game.dice.length===0&&game.winner===null&&game.turn===0&&
            <p>Tap Roll Dice to begin your next turn. You can offer a friendly double first.</p>}
        </div>
        <p className="backgammon-notice" role="status">{notice}</p>
      </div>
      <aside className="backgammon-rules">
        <h3>🌷 The Rules, Made Easy</h3>
        <p><strong>1.</strong> The game starts with a one-die roll each. Higher roll begins with both numbers.</p>
        <p><strong>2.</strong> Each die is a separate move. Doubles mean four moves!
          Use both dice whenever possible. The game highlights only legal choices.</p>
        <p><strong>3.</strong> Land on one lonely opponent checker to send it to the bar.
          Bar checkers must come back before moving others.</p>
        <p><strong>4.</strong> Once all fifteen checkers reach your home six points,
          bear them off using your dice. First player to bear off all fifteen wins.</p>
        <p><strong>5.</strong> Scores race to {BACKGAMMON_TARGET} points. A gammon or backgammon
          can earn extra friendly points. Doubling cube raises the point value, never real stakes.</p>
        <div className="backgammon-comfort">
          <strong>🐰 Pip says:</strong>
          <p>Nothing to buy. Nobody rushing you. Every game saves right on this device.</p>
        </div>
      </aside>
    </div>
    <p className="cardgame-foot">Offline Backgammon. Separate save from Harvest Valley,
      Mom's garden, Checkers and all other games.</p>
  </section>;
}
