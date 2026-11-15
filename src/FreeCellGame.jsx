import React,{useState} from "react";
import {cardLabel,cardRed,STANDARD_SUITS} from "./solitaire.js";
import {newFreeCell,freeCellMoves,freeCellMove,freeCellHint,freeCellBlocked,
  undoFreeCell,freeCellCapacity} from "./freecell.js";
import "./freecell.css";

function sourceName(key){
  return key[0]==="c"?"Free Cell "+(Number(key.slice(1))+1):
    "Column "+(Number(key.slice(1))+1);
}
function destinationName(key){
  return key[0]==="t"?"Column "+(Number(key.slice(1))+1):
    key[0]==="c"?"Free Cell "+(Number(key.slice(1))+1):
    (STANDARD_SUITS.find(s=>s.id===key.slice(1))?.name||"Suit")+" Foundation";
}
export default function FreeCellGame({game,onChange,onLeave}){
  const [selected,setSelected]=useState(null);
  const [hint,setHint]=useState(null);
  const [message,setMessage]=useState("Choose a card or a descending alternating-color run.");
  const [confirm,setConfirm]=useState(false);
  const moves=freeCellMoves(game);
  const blocked=freeCellBlocked(game);
  const chosen=selected?moves.filter(m=>m.from===selected.from&&
    m.start===selected.start):[];
  const sources=[...new Map(moves.map(m=>[m.from+":"+m.start,m])).values()];
  const enabledSource=(from,start)=>moves.some(m=>m.from===from&&m.start===start);
  const destinationEnabled=to=>chosen.some(m=>m.to===to);
  const canUndo=game.history.length>0;
  const completed=STANDARD_SUITS.reduce((n,s)=>n+game.foundations[s.id].length,0);
  const sourceCards=m=>m.from[0]==="c"?
    [game.cells[Number(m.from.slice(1))]]:
    game.tableau[Number(m.from.slice(1))].slice(m.start);
  function apply(result){
    if(!result.valid){setMessage(result.message||"That move isn't available.");return;}
    onChange(result.game);setSelected(null);setHint(null);setConfirm(false);
    setMessage(result.message||"Nice move!");
  }
  function pick(from,start){
    if(!enabledSource(from,start))return;
    if(selected?.from===from&&selected.start===start){
      setSelected(null);setMessage("Selection cleared.");return;
    }
    setSelected({from,start});setHint(null);
    const card=from[0]==="c"?game.cells[Number(from.slice(1))]:
      game.tableau[Number(from.slice(1))][start];
    setMessage(cardLabel(card)+" selected. Pick an available destination.");
  }
  function target(to){
    if(!selected||!destinationEnabled(to))return;
    apply(freeCellMove(game,selected.from,selected.start,to));
  }
  function suggest(){
    const m=freeCellHint(game);
    if(!m){setMessage("No moves available. Try Undo or a new deal.");setSelected(null);return;}
    setSelected({from:m.from,start:m.start});
    setHint(m);
    setMessage("Hint: move from "+sourceName(m.from)+" to "+destinationName(m.to)+".");
  }
  function restart(){
    if(!confirm){setConfirm(true);setMessage("Confirm a new FreeCell deal. Other games remain saved.");return;}
    onChange(newFreeCell(Date.now()));setSelected(null);setHint(null);setConfirm(false);
    setMessage("A fresh FreeCell game is ready!");
  }
  function cardFace(card){
    return <><strong>{cardLabel(card)}</strong>
      <span aria-hidden="true">{cardRed(card)?"♥":"♠"}</span></>;
  }
  return <section className="family-mini-game freecell-game" aria-label="FreeCell Solitaire">
    <div className="cardgame-top">
      <div><p className="trail-eyebrow">🌼 Mom's Solitaire Garden</p>
        <h2>FreeCell Solitaire</h2></div>
      <button type="button" className="trail-back" onClick={onLeave}>‹ Game Shelf</button>
    </div>
    <p className="cardgame-help">A cozy game of planning: every card is face-up!
      Use <strong>four Free Cells</strong> as temporary parking, build columns in
      alternating colors from King to Ace, and build all four suit foundations
      from Ace to King. No timers, accounts, fees or lives.</p>
    <div className="freecell-counters" aria-label="FreeCell game progress">
      <strong>🌷 Foundation cards <span>{completed}/52</span></strong>
      <strong>🃏 Free cells open <span>{game.cells.filter(c=>c===null).length}/4</span></strong>
      <strong>✨ Moves <span>{game.moves}</span></strong>
    </div>
    {game.won&&<div className="cardgame-win" role="status">
      🌼 All four foundations complete! FreeCell conquered! 🌼
    </div>}
    {blocked&&<p className="freecell-stuck" role="status">
      No legal moves remain. Try Undo or a new deal.
    </p>}
    <div className="freecell-layout">
      <main className="freecell-main">
        <h3>🌼 Free Cells & Foundations</h3>
        <div className="freecell-upper">
          <div className="freecell-slot-group" aria-label="Four temporary free cells">
            <h4>Four Free Cells</h4>
            <div className="freecell-slots">
              {game.cells.map((card,i)=>{
                const from="c"+i,to="c"+i,enabled=enabledSource(from,0);
                const dest=destinationEnabled(to);
                return <div key={i} className="freecell-slot-wrap">
                  {card?<button type="button" data-freecell-cell={i}
                    className={"freecell-card"+(cardRed(card)?" red":"")+
                      (selected?.from===from?" selected":"")+
                      (hint?.from===from?" hinted":"")}
                    aria-label={"Free Cell "+(i+1)+": "+cardLabel(card)}
                    disabled={!enabled||game.won} onClick={()=>pick(from,0)}>
                    {cardFace(card)}</button>:
                    <button type="button" data-freecell-empty-cell={i}
                      disabled={!dest} onClick={()=>target(to)}
                      className={"freecell-empty-slot"+(dest?" target":"")+
                        (hint?.to===to?" hinted":"")}
                      aria-label={"Free Cell "+(i+1)+(dest?", available destination":", empty")}>
                      <span aria-hidden="true">✦</span><small>Cell {i+1}</small>
                    </button>}
                </div>;
              })}
            </div>
          </div>
          <div className="freecell-slot-group" aria-label="Four suit foundations">
            <h4>Suit Foundations</h4>
            <div className="freecell-slots">
              {STANDARD_SUITS.map(s=>{
                const cards=game.foundations[s.id],top=cards.at(-1);
                const to="f"+s.id,dest=destinationEnabled(to);
                return <button type="button" data-freecell-foundation={s.id}
                  key={s.id} onClick={()=>target(to)} disabled={!dest}
                  className={"freecell-foundation"+(dest?" target":"")+
                    (hint?.to===to?" hinted":"")+(s.red?" red":"")}
                  aria-label={s.name+" Foundation: "+(top?cardLabel(top):"empty")+
                    (dest?", available destination":"")}>
                  <strong>{top?cardLabel(top):s.mark}</strong>
                  <small>{cards.length}/13</small>
                </button>;
              })}
            </div>
          </div>
        </div>
        <h3>🌿 The Eight Columns</h3>
        <p className="freecell-instruction">Tap any movable run, then the highlighted
          destination. Swipe horizontally on a phone, or use the bigger buttons to the right.</p>
        <div className="freecell-table-scroll" aria-label="Eight-column FreeCell card board">
          <div className="freecell-columns">
            {game.tableau.map((cards,i)=>{
              const to="t"+i,dest=destinationEnabled(to);
              return <div className={"freecell-column"+(dest?" destination":"")}
                data-freecell-column={i} key={i}
                style={{minHeight:Math.max(154,114+cards.length*26)+"px"}}>
                <button type="button" className="freecell-column-top"
                  data-freecell-column-target={i} disabled={!dest}
                  aria-label={"Column "+(i+1)+(dest?", available destination":"")}
                  onClick={()=>target(to)}>
                  Column {i+1}{dest?" ✓":""}
                </button>
                {cards.map((card,j)=>{
                  const enabled=enabledSource("t"+i,j);
                  const active=selected?.from==="t"+i&&selected.start===j;
                  const suggested=hint?.from==="t"+i&&hint.start===j;
                  return <button type="button" key={card}
                    data-freecell-card={i+":"+j}
                    className={"freecell-card tableau"+(cardRed(card)?" red":"")+
                      (enabled?" movable":"")+(active?" selected":"")+
                      (suggested?" hinted":"")}
                    style={{top:(42+j*26)+"px"}}
                    aria-label={"Column "+(i+1)+", card "+(j+1)+
                      ": "+cardLabel(card)+(enabled?", movable run":"")}
                    disabled={!enabled||game.won} aria-pressed={active}
                    onClick={()=>pick("t"+i,j)}>
                    {cardFace(card)}
                  </button>;
                })}
                {!cards.length&&<div className="freecell-empty-column">Empty</div>}
              </div>;
            })}
          </div>
        </div>
        <p className="freecell-notice" role="status">{message}</p>
        <div className="freecell-actions">
          <button type="button" onClick={suggest} disabled={game.won}>💡 Hint</button>
          <button type="button" onClick={()=>apply(undoFreeCell(game))}
            disabled={!canUndo}>↶ Undo</button>
          <button type="button" aria-label={confirm?"Confirm New Deal":"New Deal"}
            className={confirm?"confirm":""} onClick={restart}>
            {confirm?"✓ Confirm New Deal":"↻ New Deal"}
          </button>
        </div>
      </main>
      <aside className="freecell-side">
        <h3>🃏 Easy-Move Buttons</h3>
        <p>All legal runs have bigger buttons here, so Mom never needs to drag a
          tiny card. Pick a source, then a destination.</p>
        {sources.length?<div className="freecell-run-buttons" aria-label="Playable cards and sequences">
          {sources.map(m=>{
            const cards=sourceCards(m);
            return <button type="button" key={m.from+":"+m.start}
              data-freecell-run={m.from+":"+m.start}
              className={"freecell-run-choice"+
                (selected?.from===m.from&&selected.start===m.start?" selected":"")}
              aria-pressed={selected?.from===m.from&&selected.start===m.start}
              onClick={()=>pick(m.from,m.start)}>
              <strong>{cardLabel(cards[0])}
                {cards.length>1?" → "+cardLabel(cards.at(-1)):""}</strong>
              <small>{sourceName(m.from)} · {cards.length} card{cards.length===1?"":"s"}</small>
            </button>;
          })}
        </div>:<p>No moves available. Undo a move or try a new deal.</p>}
        {selected&&<div className="freecell-targets">
          <h3>Where should they go?</h3>
          <div className="freecell-target-buttons">
            {chosen.map(m=><button type="button" key={m.to}
              data-freecell-destination={m.to}
              onClick={()=>target(m.to)}
              className={hint?.to===m.to?"hinted":""}>
              <strong>{destinationName(m.to)}</strong>
              <small>{m.to[0]==="t"?
                (game.tableau[Number(m.to.slice(1))].length?
                  "On "+cardLabel(game.tableau[Number(m.to.slice(1))].at(-1)):
                  "Empty column"):
                m.to[0]==="c"?"Empty temporary cell":"Move home"}</small>
            </button>)}
          </div>
          {selected.from[0]==="t"&&<p className="freecell-capacity">
            Moving a full sequence uses the available free cells and open columns.
            Current maximum depends on the destination.</p>}
        </div>}
        <div className="freecell-rules">
          <h3>How to Play</h3>
          <p><strong>1.</strong> All 52 cards are face-up in eight columns,
            the first four with seven cards and the rest with six.</p>
          <p><strong>2.</strong> Build columns downward with alternating red and black.
            Move a correctly ordered sequence together when enough space is free.</p>
          <p><strong>3.</strong> Each of the four temporary free cells holds one card.</p>
          <p><strong>4.</strong> Build the four suit foundations upward from Ace to King.
            Cards placed on foundations stay there.</p>
          <p><strong>5.</strong> Empty columns can hold any card or legal sequence.
            Bigger moves need open free cells or empty columns. Win by
            moving all 52 cards to the foundations.</p>
          <p>Hints and recent-move undo are always free. Every game saves independently.</p>
        </div>
      </aside>
    </div>
    <p className="cardgame-foot">FreeCell saves on this device without changing
      the other Solitaire games, Five Dice, the garden, or your puzzle worlds.</p>
  </section>;
}
