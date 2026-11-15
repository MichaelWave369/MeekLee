import React from "react";
import {cardLabel,cardRed,STANDARD_SUITS} from "./solitaire.js";
import {ROOK_BIRD,rookSuit,rookRank,ROOK_SUITS} from "./rook.js";
import {PARADE_COLORS} from "./color-parade.js";

export function ClassicCard({card,back=false,selected=false,disabled=false,onClick,small=false,highlight=false,title=""}){
  const suit=STANDARD_SUITS.find(s=>s.id===String(card||"").split("-")[0]);
  return <button type="button" disabled={disabled||!onClick}
    onClick={onClick} title={title||(!back?cardLabel(card):"Face-down card")}
    className={"playing-card classic"+(back?" back":"")+(selected?" selected":"")+
      (small?" small":"")+(highlight?" legal":"")}>
      {back?<span aria-hidden="true">🌼</span>:
        <><span className="card-corner-label">{cardLabel(card)}</span>
        <span className="card-center-icon" aria-hidden="true">{suit?.mark}</span>
        <span className="card-corner-label card-bottom-label">{cardLabel(card)}</span></>}
    </button>;
}
export function RookTile({card,onClick,disabled=false,selected=false,highlight=false,hidden=false}){
  const suit=ROOK_SUITS.find(s=>s.id===rookSuit(card));
  return <button type="button" disabled={disabled||!onClick} onClick={onClick}
    aria-label={hidden?"Face-down card":card===ROOK_BIRD?"Bird trump card":suit?.label+" "+rookRank(card)}
    className={"playing-card rook-card"+(selected?" selected":"")+(highlight?" legal":"")+(hidden?" back":"")}
    style={{"--card-color":suit?.color||"#7356a5"}}>
    {hidden?<span aria-hidden="true">🌼</span>:card===ROOK_BIRD?
      <><span className="rook-value">🐦</span><span className="rook-suit">Bird</span></>:
      <><span className="rook-value">{rookRank(card)}</span>
      <span className="rook-suit">{suit?.label}</span></>}
  </button>;
}
export function ParadeTile({card,hidden=false,selected=false,disabled=false,onClick,highlight=false}){
  const color=PARADE_COLORS.find(x=>x.id===card?.color);
  const isWild=card?.type==="wild";
  const label=card?.type==="number"?card.value:card?.type==="draw2"?"+2":
    card?.type==="skip"?"⊘":card?.type==="reverse"?"↺":"🌈";
  const accessible=isWild?"Wild color card":(color?.label||"")+" "+
    (card?.type==="number"?card.value:card?.type==="draw2"?"Draw Two":card?.type||"");
  return <button type="button" disabled={disabled||!onClick} onClick={onClick}
    aria-label={hidden?"Face-down card":accessible}
    className={"playing-card parade-card"+(hidden?" back":"")+(selected?" selected":"")+(highlight?" legal":"")}
    style={{"--card-color":isWild?"#6d5da8":color?.hex||"#54788b"}}>
    {hidden?<span aria-hidden="true">🌼</span>:
      <><span className="parade-badge">{isWild?"★":color?.symbol}</span>
        <strong>{label}</strong>
        <small>{isWild?"WILD":card.type==="number"?color?.label:
          card.type==="draw2"?"TAKE TWO":card.type.toUpperCase()}</small></>}
  </button>;
}
