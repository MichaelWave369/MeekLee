import React, {useRef,useState} from "react";
import {ClassicCard} from "./CardTiles.jsx";
import {
  STANDARD_SUITS,cardLabel,newSolitaire,drawSolitaire,
  moveSolitaire,autoSolitaire,solitaireHint,undoSolitaire
} from "./solitaire.js";

export default function SolitaireGame({game,onChange,onLeave}){
  const [selected,setSelected]=useState(null);
  const [notice,setNotice]=useState("Tap a card, then tap where it belongs.");
  const [confirmNew,setConfirmNew]=useState(false);
  const [hint,setHint]=useState(null);
  const [dealPreference,setDealPreference]=useState(game.drawCount===3?3:1);
  const dragRef=useRef(null);
  const suppressClickRef=useRef(false);
  const [dragging,setDragging]=useState(false);
  function skipAfterDrag(){
    if(!suppressClickRef.current)return false;
    suppressClickRef.current=false;return true;
  }
  function beginDrag(event,from){
    if(game.won||event.button!==0||event.pointerType==="mouse"&&!event.isPrimary)return;
    dragRef.current={from,x:event.clientX,y:event.clientY,pointerId:event.pointerId,active:false};
    try{event.currentTarget.setPointerCapture(event.pointerId);}catch{}
  }
  function moveDrag(event){
    const drag=dragRef.current;
    if(!drag||drag.pointerId!==event.pointerId)return;
    if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>16){
      drag.active=true;setDragging(true);
    }
  }
  function endDrag(event){
    const drag=dragRef.current;
    if(!drag||drag.pointerId!==event.pointerId)return;
    dragRef.current=null;setDragging(false);
    if(!drag.active)return;
    suppressClickRef.current=true;
    window.setTimeout(()=>{suppressClickRef.current=false;},50);
    const target=document.elementFromPoint(event.clientX,event.clientY)
      ?.closest?.("[data-solitaire-drop]");
    const attr=target?.getAttribute("data-solitaire-drop")||"";
    let to=null;
    if(attr.startsWith("tableau-")){
      const column=Number(attr.slice(8));
      if(Number.isInteger(column)&&column>=0&&column<7)to={zone:"tableau",column};
    }else if(attr.startsWith("foundation-")){
      const suit=attr.slice(11);
      if(STANDARD_SUITS.some(s=>s.id===suit))to={zone:"foundation",suit};
    }
    if(to)apply(moveSolitaire(game,drag.from,to));
    else setNotice("Drag to a column or foundation, or tap cards to move them.");
  }
  const dragHandlers=from=>({
    onPointerDown:e=>beginDrag(e,from),onPointerMove:moveDrag,
    onPointerUp:endDrag,onPointerCancel:()=>{
      dragRef.current=null;setDragging(false);
    }
  });
  const apply=result=>{
    if(!result.valid){setNotice("That card won't fit there. Try a different spot.");return false;}
    onChange(result.game);setSelected(null);setHint(null);
    setNotice(result.message||"A lovely move!");
    return true;
  };
  const fromWaste={zone:"waste"};
  const fromTableau=(column,index)=>({zone:"tableau",column,index});
  function chooseTableau(column,index){
    if(skipAfterDrag())return;
    const dest={zone:"tableau",column};
    if(selected?.zone==="tableau"&&selected.column===column){
      setSelected(fromTableau(column,index));return;
    }
    if(selected && apply(moveSolitaire(game,selected,dest)))return;
    setSelected(fromTableau(column,index));
    setNotice("Card selected. Choose a foundation or another column.");
  }
  function chooseWaste(){
    if(skipAfterDrag()||!game.waste.length)return;
    setSelected(fromWaste);setHint(null);
    setNotice("Waste card selected. Tap a column or foundation to place it.");
  }
  function foundation(suit){
    if(skipAfterDrag())return;
    if(selected){
      if(selected.zone==="foundation"&&selected.suit===suit){setSelected(null);return;}
      apply(moveSolitaire(game,selected,{zone:"foundation",suit}));
    }else if(game.foundations[suit]?.length){
      setSelected({zone:"foundation",suit});
      setNotice("Foundation card selected. Tap a tableau column to bring it back.");
    }else setNotice("Select an Ace, then tap its empty foundation.");
  }
  function newDeal(){
    if(!confirmNew){setConfirmNew(true);setNotice("Tap New Deal again to confirm. Your puzzle levels stay saved.");return;}
    onChange(newSolitaire(Date.now(),dealPreference));
    setConfirmNew(false);setSelected(null);setHint(null);
    setNotice("Freshly shuffled! Have fun.");
  }
  function showHint(){
    const h=solitaireHint(game);setHint(h);
    setNotice(!h?"No easy moves are showing. Try another deal.":
      h.type==="draw"?"Try the stock pile for another card.":
      h.to.zone==="foundation"?"A card can go onto its matching suit foundation.":
      "A card can move to a different tableau column.");
  }
  const homes=STANDARD_SUITS.reduce((n,s)=>n+game.foundations[s.id].length,0);
  return <section className="cardgame solitaire-game" aria-label="Klondike Solitaire">
    <div className="cardgame-top">
      <div><p className="trail-eyebrow">♣ Mom's Card Corner</p><h2>Klondike Solitaire</h2></div>
      <button type="button" className="trail-back" onClick={onLeave}>‹ Card Corner</button>
    </div>
    <p className="cardgame-help">Draw {game.drawCount===3?"three cards":"one card"} at a time.
      Build suits Ace to King and alternate red/black
      down the columns. <strong>Drag cards onto each other</strong>, or tap the card and destination.
      Touch-drag works on phones, too!</p>
    <div className="solitaire-deal-choice" aria-label="Choose Klondike deal style for the next deal">
      <strong>♠️ Deal style</strong>
      <button type="button" aria-pressed={dealPreference===1} onClick={()=>setDealPreference(1)}>
        Draw 1
      </button>
      <button type="button" aria-pressed={dealPreference===3} onClick={()=>setDealPreference(3)}>
        Draw 3
      </button>
      <small>{dealPreference!==(game.drawCount===3?3:1)?
        "This style starts with your next New Deal. Your current game is safe.":
        "Choose a different style for your next New Deal."}</small>
    </div>
    <div className="cardgame-score">
      <span>🏡 {homes}/52 home</span><span>🃏 {game.stock.length} in stock</span>
      <span>🌟 {game.moves} moves</span>
    </div>
    {game.won && <div className="cardgame-win" role="status">
      🌷 You won Solitaire! What a beautiful game! 🌷
    </div>}
    <div className="solitaire-draw-row">
      <button type="button" className={"solitaire-stock "+(game.stock.length?"has-cards":"")}
        aria-label={game.stock.length?"Draw "+(game.drawCount===3?"three":"one")+" card"+(game.drawCount===3?"s":"")+" from stock":
          game.waste.length?"Recycle the waste pile":"Stock is empty"}
        onClick={()=>apply(drawSolitaire(game))}
        disabled={!game.stock.length&&!game.waste.length||game.won}>
        <span aria-hidden="true">{game.stock.length?"🌼":game.waste.length?"↻":"✓"}</span>
        <small>{game.stock.length?"Draw":game.waste.length?"Recycle":"Empty"}</small>
      </button>
      <div className="solitaire-waste" {...(game.waste.length?dragHandlers(fromWaste):{})}>
        {game.waste.length?<ClassicCard card={game.waste.at(-1)}
          selected={selected?.zone==="waste"} onClick={chooseWaste}/>:
          <div className="solitaire-placeholder">Waste</div>}
      </div>
      <div className="solitaire-foundations" aria-label="Four suit foundations">
        {STANDARD_SUITS.map(s=>
          <button key={s.id} type="button" className={"solitaire-foundation"+(s.red?" red":"")+
            (selected?.zone==="foundation"&&selected.suit===s.id?" selected":"")}
            onClick={()=>foundation(s.id)}
            data-solitaire-drop={"foundation-"+s.id}
            {...(game.foundations[s.id].length?dragHandlers({zone:"foundation",suit:s.id}):{})}
            aria-label={s.name+" foundation with "+game.foundations[s.id].length+" cards"}>
            {game.foundations[s.id].length?
              <><strong>{cardLabel(game.foundations[s.id].at(-1))}</strong>
                <small>{s.name}</small></>:
              <><strong>{s.mark}</strong><small>Ace</small></>}
          </button>)}
      </div>
    </div>
    <p className="solitaire-scroll-tip">Seven columns. On a narrow phone, slide this area sideways to see them all.</p>
    <div className="solitaire-scroll" role="region" aria-label="Seven Solitaire columns" tabIndex={0}>
      <div className="solitaire-tableau">
        {game.tableau.map((col,column)=>{
          const total=col.down.length+col.up.length;
          const depth=Math.max(1,total);
          return <div className="solitaire-column" key={column}
            data-solitaire-drop={"tableau-"+column}
            style={{height:Math.max(110,depth*29+74)+"px"}}>
            <button type="button" className="solitaire-column-target"
              aria-label={"Empty column "+(column+1)+", only Kings can move here"}
              onClick={()=>selected?apply(moveSolitaire(game,selected,{zone:"tableau",column})):
                setNotice("Only Kings can fill an empty column.")}/>
            {col.down.map((card,i)=>
              <div key={card} className="solitaire-down" style={{top:i*29+"px"}}
                aria-hidden="true">🌼</div>)}
            {col.up.map((card,index)=>
              <div key={card} className="solitaire-up" style={{top:(col.down.length+index)*29+"px"}}
                {...dragHandlers(fromTableau(column,index))}>
                <ClassicCard card={card} small={false}
                  onClick={()=>chooseTableau(column,index)}
                  selected={selected?.zone==="tableau"&&selected.column===column&&selected.index===index}
                  highlight={hint?.from?.zone==="tableau"&&hint.from.column===column&&
                    (hint.from.index??col.up.length-1)===index}/>
              </div>)}
          </div>;
        })}
      </div>
    </div>
    <p className="cardgame-notice" role="status">{dragging?
      "Release over a card column or foundation to move it.":notice}</p>
    <div className="solitaire-actions">
      <button type="button" onClick={()=>apply(autoSolitaire(game,selected))}
        disabled={game.won}>✨ Auto Home</button>
      <button type="button" onClick={showHint}>💡 Hint</button>
      <button type="button" onClick={()=>apply(undoSolitaire(game))}
        disabled={!game.history?.length}>↶ Undo</button>
      <button type="button" className={confirmNew?"confirm-new":""} onClick={newDeal}>
        {confirmNew?"✓ Confirm New Deal":"↻ New Deal"}</button>
    </div>
    <p className="cardgame-foot">No timers, no move limits and unlimited free deals. Game is saved automatically.</p>
  </section>;
}
