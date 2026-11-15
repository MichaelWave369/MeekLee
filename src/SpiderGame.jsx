import React,{useState} from "react";
import {cardLabel} from "./solitaire.js";
import {newSpider,spiderCanDeal,spiderLegalMoves,spiderMove,spiderDeal,
  spiderHint,spiderBlocked,undoSpider} from "./spider.js";
import "./spider.css";

const columnLabel=index=>"Column "+(index+1);
export default function SpiderGame({game,onChange,onLeave}){
  const [selected,setSelected]=useState(null);
  const [hint,setHint]=useState(null);
  const [notice,setNotice]=useState("Build a descending run of spades, King to Ace.");
  const [confirm,setConfirm]=useState(false);
  const legal=spiderLegalMoves(game);
  const canDeal=spiderCanDeal(game);
  const blocked=spiderBlocked(game);
  const sourceOptions=new Map();
  legal.forEach(m=>{
    const key=m.from+":"+m.start;
    if(!sourceOptions.has(key))sourceOptions.set(key,m);
  });
  const destinations=selected?
    legal.filter(m=>m.from===selected.from&&m.start===selected.start):[];
  const sources=[...sourceOptions.entries()].map(([key,m])=>({...m,key}));
  function apply(result){
    if(!result.valid){setNotice(result.message||"That move doesn't fit.");return;}
    onChange(result.game);setSelected(null);setHint(null);setConfirm(false);
    setNotice(result.message||"Good move!");
  }
  function chooseSource(from,start){
    if(!legal.some(m=>m.from===from&&m.start===start))return;
    if(selected?.from===from&&selected.start===start){
      setSelected(null);setNotice("Selection cleared.");return;
    }
    setSelected({from,start});setHint(null);
    const pile=game.columns[from].up.slice(start);
    setNotice("Moving "+pile.map(cardLabel).join(" ")+" from "+columnLabel(from)+
      ". Choose a destination.");
  }
  function chooseTarget(to){
    if(!selected)return;
    if(!destinations.some(m=>m.to===to)){
      setNotice("That destination doesn't fit. Choose a highlighted column.");return;
    }
    apply(spiderMove(game,selected.from,selected.start,to));
  }
  function showHint(){
    const suggestion=spiderHint(game);
    if(!suggestion){
      setHint(null);setNotice("No moves remain. Try Undo or a new deal.");return;
    }
    setHint(suggestion);
    if(suggestion.type==="deal"){
      setSelected(null);setNotice("Hint: deal ten cards from the stock.");return;
    }
    setSelected({from:suggestion.from,start:suggestion.start});
    setNotice("Hint: move the highlighted sequence from "+columnLabel(suggestion.from)+
      " to "+columnLabel(suggestion.to)+".");
  }
  function restart(){
    if(!confirm){
      setConfirm(true);
      setNotice("Confirm a new Spider deal. Your other saved games are safe.");return;
    }
    onChange(newSpider(Date.now()));setSelected(null);setHint(null);setConfirm(false);
    setNotice("A fresh one-suit Spider game is ready!");
  }
  const remaining=game.columns.reduce((n,c)=>n+c.down.length+c.up.length,0);
  return <section className="family-mini-game spider-game" aria-label="Spider Solitaire one suit">
    <div className="cardgame-top">
      <div><p className="trail-eyebrow">🕷️ Mom's Solitaire Garden</p>
        <h2>Spider Solitaire</h2>
        <p className="spider-subtitle">Friendly one-suit edition</p></div>
      <button type="button" className="trail-back" onClick={onLeave}>‹ Game Shelf</button>
    </div>
    <p className="cardgame-help">Arrange spades from <strong>King down to Ace</strong>.
      Move any complete descending sequence onto a card one rank higher,
      or place it into an empty column. Finish eight 13-card runs to win!
      No timers, fees, or accounts.</p>
    <div className="spider-counters" aria-label="Spider Solitaire progress">
      <strong>🌼 Completed <span>{game.completed.length}/8</span></strong>
      <strong>🃏 Tableau <span>{remaining}</span></strong>
      <strong>🎴 Deals left <span>{game.stock.length/10}</span></strong>
      <strong>↗ Moves <span>{game.moves}</span></strong>
    </div>
    {game.won&&<div className="cardgame-win" role="status">
      🌷 All eight King-to-Ace runs cleared! Beautifully played!
    </div>}
    {blocked&&<p className="spider-stuck" role="status">
      No legal moves or stock deals remain. Undo a turn or start a new deal.
    </p>}
    {!canDeal&&game.stock.length>0&&!game.won&&
      <p className="spider-deal-info">To deal more cards, first put at least one
        face-up card in each of the ten columns.</p>}
    <div className="spider-layout">
      <div className="spider-table">
        <h3>🌼 Ten Card Columns</h3>
        <p>Tap the first card of a descending sequence, then choose a green destination
          column. On phones, slide the table left or right. Or use the larger buttons below.</p>
        <div className="spider-table-scroll" aria-label="Ten-column Spider Solitaire tableau">
          <div className="spider-columns">
            {game.columns.map((col,i)=>{
              const isDest=destinations.some(m=>m.to===i);
              const height=Math.max(170,108+col.down.length*15+col.up.length*28);
              return <div className={"spider-column"+(isDest?" destination":"")} key={i}
                data-spider-column={i} style={{minHeight:height+"px"}}>
                <button type="button" className="spider-column-head"
                  data-spider-target={i} onClick={()=>chooseTarget(i)}
                  disabled={!isDest}
                  aria-label={columnLabel(i)+(isDest?", valid move destination":"")}>
                  {columnLabel(i)}{isDest?" ✓":""}
                </button>
                {col.down.map((card,j)=><div className="spider-card down" key={card}
                  style={{top:(42+j*15)+"px"}} aria-label={"Face-down card "+(j+1)}>
                  🌼
                </div>)}
                {col.up.map((card,j)=>{
                  const available=sourceOptions.has(i+":"+j);
                  const isSelected=selected?.from===i&&selected.start===j;
                  const isHint=hint?.type==="move"&&hint.from===i&&hint.start===j;
                  return <button key={card} type="button"
                    data-spider-card={i+":"+j} disabled={!available||game.won}
                    aria-pressed={isSelected}
                    aria-label={columnLabel(i)+", card "+(j+1)+": "+cardLabel(card)+
                      (available?", movable sequence":"")}
                    className={"spider-card up"+(available?" movable":"")+
                      (isSelected?" selected":"")+(isHint?" hinted":"")}
                    style={{top:(42+col.down.length*15+j*28)+"px"}}
                    onClick={()=>chooseSource(i,j)}>
                    <strong>{cardLabel(card)}</strong>
                    <span aria-hidden="true">♠</span>
                  </button>;
                })}
                {!col.down.length&&!col.up.length&&
                  <span className="spider-empty-column">Empty space</span>}
              </div>;
            })}
          </div>
        </div>
        <div className="spider-stock">
          <button type="button" className="spider-deal" onClick={()=>apply(spiderDeal(game))}
            disabled={!canDeal} aria-label="Deal ten cards from stock">
            <span aria-hidden="true">🎴</span>
            <strong>Deal 10 Cards</strong><small>{game.stock.length/10} deals left</small>
          </button>
          <p>One new card to each column. All ten columns must have a card first.</p>
        </div>
        <p className="spider-message" role="status">{notice}</p>
        <div className="spider-actions">
          <button type="button" onClick={showHint} disabled={game.won}>💡 Hint</button>
          <button type="button" onClick={()=>apply(undoSpider(game))}
            disabled={!game.history.length}>↶ Undo</button>
          <button type="button" onClick={restart}
            className={confirm?"confirm":""} aria-label={confirm?"Confirm New Deal":"New Deal"}>
            {confirm?"✓ Confirm New Deal":"↻ New Deal"}
          </button>
        </div>
      </div>
      <aside className="spider-controls">
        <h3>🃏 Easy-Move Buttons</h3>
        <p>Choose a movable card run. Then tap the destination column.
          These big buttons do everything the little cards can.</p>
        {sources.length?<div className="spider-source-buttons" aria-label="Movable card runs">
          {sources.map(m=>{
            const cards=game.columns[m.from].up.slice(m.start);
            return <button key={m.key} type="button"
              data-spider-run={m.key} aria-pressed={selected?.from===m.from&&selected.start===m.start}
              className={"spider-run-choice"+(selected?.from===m.from&&selected.start===m.start?" picked":"")}
              onClick={()=>chooseSource(m.from,m.start)}>
              <strong>{cardLabel(cards[0])}
                {cards.length>1?" → "+cardLabel(cards.at(-1)):""}</strong>
              <small>From {columnLabel(m.from)} · {cards.length} card{cards.length>1?"s":""}</small>
            </button>;
          })}
        </div>:<p className="spider-no-moves">
          {game.stock.length?"No movable sequences right now. Deal cards when all columns are filled.":
            "No moves left. Use Undo or New Deal."}</p>}
        {selected&&<div className="spider-destinations">
          <h3>Move to which column?</h3>
          <div className="spider-destination-buttons">
            {destinations.map(m=><button type="button" key={m.to}
              data-spider-destination={m.to}
              className={hint?.type==="move"&&hint.to===m.to?"suggested":""}
              onClick={()=>chooseTarget(m.to)}>
              {columnLabel(m.to)}
              <small>{game.columns[m.to].up.length?
                "On "+cardLabel(game.columns[m.to].up.at(-1)):"Empty space"}</small>
            </button>)}
          </div>
        </div>}
        <div className="spider-rules">
          <h3>How to Play</h3>
          <p><strong>1.</strong> The first four columns have six cards,
            and the next six have five. Only the top card starts face-up.</p>
          <p><strong>2.</strong> Move a King-to-Ace descending sequence
            together, onto a card exactly one rank higher.</p>
          <p><strong>3.</strong> Any descending run can move to an empty column.
            Reveal the face-down cards underneath as you move.</p>
          <p><strong>4.</strong> Each complete King-to-Ace run disappears.
            Clear all eight to win.</p>
          <p><strong>5.</strong> There are five stock deals of ten cards.
            You cannot deal while any column is empty.
            Hint and Undo are always free.</p>
        </div>
      </aside>
    </div>
    <p className="cardgame-foot">Spider saves independently from Klondike,
      Pyramid, TriPeaks, Five Dice, the garden and every other adventure.
    </p>
  </section>;
}
