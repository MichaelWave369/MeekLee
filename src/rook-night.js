// Mom's Rook game-night statistics and cheerful, context-aware bot lines.
// Derived only from public match state, never from hidden opponent cards.
import {ROOK_NAMES,ROOK_SUITS} from "./rook.js";

const nonnegative = value =>
  Number.isSafeInteger(value) && value >= 0 ? Math.min(value, 1000000000) : 0;
export const emptyRookStats = () => ({
  played:0,wins:0,losses:0,currentStreak:0,bestStreak:0,
  handsPlayed:0,trumpCounts:Object.fromEntries(ROOK_SUITS.map(s=>[s.id,0]))
});

export function normalizeRookStats(raw) {
  const g=raw && typeof raw==="object" ? raw : {};
  const played=nonnegative(g.played),wins=Math.min(nonnegative(g.wins),played);
  const losses=Math.min(nonnegative(g.losses),played-wins);
  const currentStreak=Math.min(nonnegative(g.currentStreak),wins);
  return {
    played,wins,losses,currentStreak,
    bestStreak:Math.max(currentStreak,Math.min(nonnegative(g.bestStreak),wins)),
    handsPlayed:nonnegative(g.handsPlayed),
    trumpCounts:Object.fromEntries(ROOK_SUITS.map(s=>
      [s.id,nonnegative(g.trumpCounts?.[s.id])]))
  };
}

export function favoriteRookTrump(stats) {
  const counts=normalizeRookStats(stats).trumpCounts;
  const ranked=ROOK_SUITS.map(s=>({id:s.id,label:s.label,count:counts[s.id]}))
    .sort((a,b)=>b.count-a.count);
  return ranked[0].count > 0 ? ranked[0] : null;
}

/** Only record validated transitions, not every render or an old loaded victory.
 * Mom's favorite trump color counts her choices only, not a bot's calls.
 */
export function recordRookTransition(stats,previous,next) {
  const current=normalizeRookStats(stats);
  if(previous?.kind!=="rook" || next?.kind!=="rook")return current;
  const output={...current,trumpCounts:{...current.trumpCounts}};
  if(previous.phase==="trump" && next.phase==="play" &&
    previous.bidder===0 && ROOK_SUITS.some(s=>s.id===next.trump)) {
    output.trumpCounts[next.trump]++;
  }
  if(previous.phase==="trick-done" && next.phase==="round-over")output.handsPlayed++;
  if(previous.phase!=="game-over" && next.phase==="game-over" &&
    (next.winner===0 || next.winner===1)) {
    output.played++;
    output.handsPlayed++;
    if(next.winner===0){
      output.wins++;
      output.currentStreak++;
      output.bestStreak=Math.max(output.bestStreak,output.currentStreak);
    } else {
      output.losses++;
      output.currentStreak=0;
    }
  }
  return output;
}

export const ROOK_PERSONALITIES=Object.freeze({
  1:{name:"Willow",avatar:"🌷",style:"The thoughtful competitor"},
  2:{name:"Pip",avatar:"🐰",style:"Mom's enthusiastic partner"},
  3:{name:"Fern",avatar:"🦊",style:"The playful challenger"}
});

export function rookBotLine(game,seat) {
  if(!game || !ROOK_PERSONALITIES[seat])return "";
  const ours=seat===2;
  if(game.phase==="game-over") {
    if(game.winner===0)return ours?"We did it, Mom! What a team!":
      seat===1?"Beautifully played. Rematch sometime?":"You two were on fire!";
    return ours?"We'll get the next one, partner!":
      seat===1?"A lovely game. Well played!":"Ha! That was a close one!";
  }
  if(game.phase==="round-over") {
    if(ours)return game.lastResult?.bidMade && game.lastResult.bidder%2===0?
      "We made our bid, Mom!":"Another hand down. We've got this!";
    return seat===1?"Good hand, everyone.":"Who's ready for the next deal?";
  }
  if(game.phase==="trick-done"){
    if(game.trickWinner===seat)return ours?"Got one for our team!":
      seat===1?"I have this trick.":"That one's coming my way!";
    if(ours && game.trickWinner===0)return "That's my partner! Nice one!";
    return ours?"Next trick, Mom!":seat===1?"Nicely played.":"Not bad, not bad!";
  }
  if(game.phase==="bid"){
    if(game.turn===seat)return ours?"Thinking through my hand…":
      seat===1?"Let me consider my bid.":"Should I raise the stakes?";
    return ours?"I'm right here, partner!":
      seat===1?"Every good hand has a story.":"I've got my eye on the table!";
  }
  if(game.phase==="nest" || game.phase==="trump") {
    if(game.bidder===seat)return ours?"Let's choose our best cards!":
      seat===1?"Choosing carefully.":"Time to pick a winner!";
    return ours?"You've got this, Mom!":
      seat===1?"A smart trump call matters.":"Wonder what color we'll get!";
  }
  if(game.phase==="play"){
    if(game.turn===seat)return ours?"I'll play my part, partner!":
      seat===1?"Let's see what I can do.":"Here comes my card!";
    return ours?"You're up, Mom!" :
      seat===1?"Keeping an eye on the tricks.":"This is getting interesting!";
  }
  return ours?"Team Mom and Pip!":
    seat===1?"Ready when you are.":"Deal me in!";
}
