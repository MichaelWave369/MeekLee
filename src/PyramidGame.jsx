import React,{useState} from "react";
import {cardLabel,cardRed,cardRank} from "./solitaire.js";
import {newPyramid,pyramidAvailable,pyramidCard,pyramidExposed,pyramidRemove,
  pyramidDraw,pyramidHint,pyramidBlocked,undoPyramid,MAX_RECYCLES} from "./pyramid.js";
import "./pyramid.css";

const rows=Array.from({length:7},(_,r)=>Array.from({length:r+1},
  (_,c)=>r*(r+1)/2+c));
function positionName(index){
  let row=0;
  while((row+1)*(row+2)/2<=index)row++;
  return "row "+(row+1)+", card "+(index-row*(row+1)/2+1);
}
export default function PyramidGame({game,onChange,onLeave}){
  const [selected,setSelected]=useState(null);
  const [hint,setHint]=useState([]);
  const [confirmNew,setConfirmNew]=useState(false);
  const [notice,setNotice]=useState("Choose two uncovered cards totaling 13, or one king.");
  const exposed=pyramidExposed(game);
  const available=pyramidAvailable(game);
  const blocked=pyramidBlocked(game);
  const remaining=game.tableau.filter(Boolean).length;
  const wasteTop=game.waste.at(-1);
  const canDraw=game.stock.length>0||game.waste.length>0&&game.recycles<MAX_RECYCLES;
  function apply(result){
    if(!result.valid){setNotice(result.message||"Those cards cannot be removed together.");return false;}
    onChange(result.game);setSelected(null);setHint([]);setConfirmNew(false);
    setNotice(result.message||"Lovely move!");
    return true;
  }
  function choose(key){
    if(!available.includes(key)||game.won)return;
    const current=pyramidCard(game,key);
    if(cardRank(current)===13){apply(pyramidRemove(game,[key]));return;}
    if(selected===key){setSelected(null);setNotice("Card unselected.");return;}
    if(selected&&available.includes(selected)&&
      cardRank(pyramidCard(game,selected))+cardRank(current)===13){
      apply(pyramidRemove(game,[selected,key]));return;
    }
    setSelected(key);setHint([]);
    setNotice(cardLabel(current)+" selected. Choose a card worth "+
      (13-cardRank(current))+", or choose another exposed card.");
  }
  function draw(){
    apply(pyramidDraw(game));
  }
  function suggest(){
    const suggestion=pyramidHint(game);
    if(!suggestion){setHint([]);setNotice("No pairs or draws remain. Start a new deal!");return;}
    if(suggestion.type==="draw"||suggestion.type==="recycle"){
      setHint([]);setSelected(null);
      setNotice(suggestion.type==="draw"?"Hint: draw a fresh card.":
        "Hint: recycle the waste pile to look again.");return;
    }
    setHint(suggestion.cards);setSelected(null);
    setNotice(suggestion.cards.length===1?"Hint: remove that exposed king.":
      "Hint: the glowing cards add up to thirteen.");
  }
  function undo(){
    const result=undoPyramid(game);
    if(!result.valid){setNotice("No moves to undo yet.");return;}
    apply(result);
  }
  function fresh(){
    if(!confirmNew){setConfirmNew(true);
      setNotice("Press Confirm New Deal once more. Other games will stay saved.");return;}
    onChange(newPyramid(Date.now()));setSelected(null);setHint([]);setConfirmNew(false);
    setNotice("A new pyramid awaits! Enjoy your cards.");
  }
  function renderCard(key,card,covered=false,large=false){
    const usable=available.includes(key);
    const active=selected===key,highlight=hint.includes(key);
    const name=key==="w"?"Top waste card":positionName(Number(key.slice(2)));
    return <button type="button" key={key} data-pyramid-key={key}
      onClick={()=>choose(key)} disabled={!usable||game.won}
      aria-pressed={active}
      aria-label={name+": "+cardLabel(card)+(covered?", covered":
        usable?", available to play":"")+(active?", selected":"")}
      className={"pyramid-card"+(cardRed(card)?" red":"")+
        (covered?" covered":"")+(active?" selected":"")+
        (highlight?" suggested":"")+(large?" large":"")}>
      <strong>{cardLabel(card)}</strong>
      <span aria-hidden="true">{cardRed(card)?"♥":"♣"}</span>
    </button>;
  }
  return <section className="family-mini-game pyramid-game" aria-label="Pyramid Solitaire">
    <div className="cardgame-top">
      <div><p className="trail-eyebrow">♠️ Mom's Solitaire Garden</p>
        <h2>Pyramid Solitaire</h2></div>
      <button type="button" className="trail-back" onClick={onLeave}>‹ Game Shelf</button>
    </div>
    <p className="cardgame-help">Clear the pyramid by pairing uncovered cards totaling
      <strong> 13</strong>. A king is worth 13 and goes by itself.
      Queen + Ace, Jack + Two, Ten + Three, and so on. You can draw
      from the stock, use the top waste card and recycle the stock twice.
      No timer, no purchases, no pressure.</p>
    <div className="pyramid-counters" aria-label="Pyramid game progress">
      <strong>🌷 {28-remaining}/28 pyramid cards cleared</strong>
      <strong>🃏 {game.stock.length} stock cards</strong>
      <strong>↻ {MAX_RECYCLES-game.recycles} recycles left</strong>
    </div>
    {game.won&&<div className="cardgame-win" role="status">
      🌼 Pyramid cleared! Beautifully done! 🌼
    </div>}
    {blocked&&<div className="pyramid-blocked" role="status">
      No more pairs or draws. That happens with Pyramid!
      You can undo a step or try a fresh deal.
    </div>}
    <div className="pyramid-layout">
      <div className="pyramid-main">
        <h3>🌼 The Pyramid</h3>
        <p className="pyramid-instruction">Uncovered cards have a bright border.
          On narrow phones, slide the pyramid sideways if needed.</p>
        <div className="pyramid-scroll" aria-label="28-card pyramid board">
          <div className="pyramid-rows">
            {rows.map((indices,r)=><div className="pyramid-row" key={r}>
              {indices.map(i=>game.tableau[i]?
                renderCard("t:"+i,game.tableau[i],!exposed.includes(i)):
                <span key={i} className="pyramid-empty" aria-label="Removed card"/>)}
            </div>)}
          </div>
        </div>
        <div className="pyramid-deck">
          <div className="pyramid-deck-stack">
            <button type="button" className="pyramid-stock" onClick={draw}
              disabled={game.won||!canDraw}
              aria-label={game.stock.length?
                "Draw one card from stock":canDraw?"Recycle waste pile":"No draws remaining"}>
              <span aria-hidden="true">{game.stock.length?"🌼":canDraw?"↻":"✓"}</span>
              <strong>{game.stock.length?"Draw":canDraw?"Recycle":"Empty"}</strong>
              <small>{game.stock.length+" cards"}</small>
            </button>
          </div>
          <div className="pyramid-waste">
            <strong>Top Waste</strong>
            {wasteTop?renderCard("w",wasteTop,false,true):
              <div className="pyramid-waste-empty">No waste yet</div>}
          </div>
        </div>
        <p className="pyramid-notice" role="status">{notice}</p>
        <div className="pyramid-actions">
          <button type="button" onClick={suggest} disabled={game.won}>💡 Hint</button>
          <button type="button" onClick={undo} disabled={!game.history.length}>↶ Undo</button>
          <button type="button" className={confirmNew?"confirm-new":""}
            aria-label={confirmNew?"Confirm New Deal":"New Deal"} onClick={fresh}>
            {confirmNew?"✓ Confirm New Deal":"↻ New Deal"}
          </button>
        </div>
      </div>
      <aside className="pyramid-side">
        <h3>🌷 Available cards</h3>
        <p>These larger buttons play the same exposed cards as the pyramid.
          Tap a king to remove it, or choose two cards that add to 13.</p>
        {available.length?<div className="pyramid-choices">
          {available.map(key=>{
            const card=pyramidCard(game,key);
            return <button type="button" key={key} onClick={()=>choose(key)}
              data-pyramid-choice={key}
              aria-pressed={selected===key}
              className={"pyramid-choice"+(selected===key?" selected":"")+
                (hint.includes(key)?" suggested":"")}>
              <strong>{cardLabel(card)}</strong>
              <span>{key==="w"?"Top Waste":positionName(Number(key.slice(2)))}</span>
              {cardRank(card)===13&&<small>Remove king</small>}
            </button>;
          })}
        </div>:<p>Draw a card or begin a new game.</p>}
        <div className="pyramid-rules">
          <h3>How to play</h3>
          <p><strong>1.</strong> Only uncovered cards may be removed.
            Covering cards block the two immediately above them.</p>
          <p><strong>2.</strong> Pick two cards whose ranks add to 13,
            or remove any exposed king alone.</p>
          <p><strong>3.</strong> Draw a card to the waste pile.
            Only its top card is available for pairing.</p>
          <p><strong>4.</strong> Clear all 28 pyramid cards to win.
            Two waste recycles give you three passes through the stock.</p>
          <p>Hints and undo are always free. Your other games save separately.</p>
        </div>
      </aside>
    </div>
  </section>;
}
