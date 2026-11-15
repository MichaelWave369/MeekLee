// Pure, dependency-free authority for MeekLee's private Family Rook rooms.
// The *server*, never the browser, owns the deck and validates every action.
// This module is shared by Cloudflare Durable Objects and the Node test suite.
import {
  newRook, rookAction, rookBotAction, rookLegalCards, ROOK_NAMES, ROOK_SUITS
} from "../src/rook.js";

const BOT_NAMES=Object.freeze(["","Willow 🤖","Pip 🤖","Fern 🤖"]);
export const ROOM_MAX_SPECTATORS=18;
export const ROOM_CHAT_LIMIT=70;
export const ROOM_IDLE_LIFETIME_MS=30*24*60*60*1000;

export function cleanFamilyName(value) {
  return typeof value==="string" ? value.replace(/[\u0000-\u001f\u007f]/g,"")
    .replace(/[<>]/g,"").trim().slice(0,28) : "";
}

export function createFamilyRoom(code,hostName,token,now=Date.now()) {
  const name=cleanFamilyName(hostName);
  if(!name||typeof token!=="string"||token.length<24)throw Error("A name and secure session token are required.");
  return {
    code,version:1,createdAt:now,updatedAt:now,phase:"lobby",
    players:[{name,token,bot:false},null,null,null],
    spectators:[],waiting:[],game:null,chat:[],lastChatAt:{},
    lastTrick:null,lastAction:"Welcome! Invite family, then start the match."
  };
}
export function membership(room,token){
  if(typeof token!=="string"||token.length<24)return null;
  for(let seat=0;seat<4;seat++)if(room.players[seat]?.token===token)
    return {seat,name:room.players[seat].name,role:"player",host:seat===0};
  const watcher=room.spectators.find(s=>s.token===token);
  return watcher?{seat:null,name:watcher.name,role:"spectator",host:false}:null;
}
function changed(room,now){
  return {...room,version:room.version+1,updatedAt:now};
}
export function joinFamilyRoom(room,name,token,now=Date.now()){
  if(!room)return {ok:false,error:"Room not found."};
  const existing=membership(room,token);
  if(existing)return {ok:true,room,member:existing,rejoined:true};
  const cleaned=cleanFamilyName(name);
  if(!cleaned)return {ok:false,error:"Please enter a name to join the family table."};
  if(typeof token!=="string"||token.length<24)return {ok:false,error:"Invalid session."};
  let next=changed(room,now);
  const empty=next.phase==="lobby"?next.players.findIndex(p=>p===null):-1;
  if(empty>=0){
    next.players=[...room.players];next.players[empty]={name:cleaned,token,bot:false};
    next.lastAction=cleaned+" pulled up a chair.";
    return {ok:true,room:next,member:membership(next,token)};
  }
  if(room.spectators.length>=ROOM_MAX_SPECTATORS)
    return {ok:false,error:"The watching area is full for now."};
  next.spectators=[...room.spectators,{name:cleaned,token}];
  next.lastAction=cleaned+" joined to watch and chat.";
  return {ok:true,room:next,member:membership(next,token)};
}
function filledSeats(room) {
  return room.players.map((p,i)=>p||{name:BOT_NAMES[i]||ROOK_NAMES[i],bot:true,token:null});
}
// Players arriving after a match has begun can request a bot chair, but
// receive no cards until the NEXT fresh hand. This prevents mid-hand leaks.
function promoteQueued(room){
  const next={...room,players:[...room.players],spectators:[...room.spectators],
    waiting:[...(room.waiting||[])]};
  for(let seat=1;seat<4;seat++){
    if(!next.players[seat]?.bot||!next.waiting.length)continue;
    const token=next.waiting.shift();
    const idx=next.spectators.findIndex(s=>s.token===token);
    if(idx<0)continue;
    const person=next.spectators.splice(idx,1)[0];
    next.players[seat]={...person,bot:false};
    next.lastAction=person.name+" has joined the Rook table for the next hand!";
  }
  return next;
}
function advanceBots(room){
  // A hard cap prevents the server hanging on a malformed state.
  let next={...room},safety=0;
  while(next.game && safety++<180){
    const g=next.game;
    if(g.phase==="trick-done"){
      next.lastTrick={cards:g.trick.map(({seat,card})=>({seat,card})),winner:g.trickWinner};
      const collect=rookAction(g,{type:"collect"});
      if(!collect.valid)break;
      next.game=collect.game;
      next.lastAction=next.players[g.trickWinner].name+" won the trick.";
      continue;
    }
    if(["round-over","game-over"].includes(g.phase))break;
    if(!Number.isInteger(g.turn)||!next.players[g.turn]?.bot)break;
    const action=rookBotAction(g);
    if(!action)break;
    const nextMove=rookAction(g,action);
    if(!nextMove.valid)break;
    next.game=nextMove.game;
    if(action.type==="play"){
      next.lastAction=next.players[g.turn].name+" played a card.";
    }else if(action.type==="bid"){
      next.lastAction=next.players[g.turn].name+(action.value==="pass"?" passed.":" bid "+action.value+".");
    }else if(action.type==="trump"){
      next.lastAction=next.players[g.turn].name+" chose "+action.color+" trump.";
    }else if(action.type==="discard"){
      next.lastAction=next.players[g.turn].name+" put five cards in the nest.";
    }
  }
  if(safety>=180)next.lastAction="The game has paused for a safety check.";
  return next;
}
const acceptedAction=new Set(["bid","discard","trump","play"]);
export function familyAction(room,token,action,now=Date.now(),seed=now){
  const member=membership(room,token);
  if(!member)return {ok:false,error:"Rejoin with your private seat before playing."};
  if(!action||typeof action!=="object")return {ok:false,error:"Invalid game action."};
  if(action.type==="start"){
    if(!member.host)return {ok:false,error:"The room creator starts the match."};
    if(room.phase!=="lobby")return {ok:false,error:"Match already started."};
    let next=changed(room,now);
    next.players=filledSeats(room);
    next.phase="playing";
    next.game=newRook(seed);
    next.lastTrick=null;
    next.lastAction="The cards are dealt! Let's play Rook.";
    next=advanceBots(next);
    return {ok:true,room:next};
  }
  if(action.type==="restart"){
    if(!member.host||room.phase!=="playing"||room.game?.phase!=="game-over")
      return {ok:false,error:"Only the room creator can start another match after the final score."};
    let next=promoteQueued(changed(room,now));
    next.game=newRook(seed);
    next.lastTrick=null;
    next.lastAction="New match. Same family table!";
    next=advanceBots(next);
    return {ok:true,room:next};
  }
  if(action.type==="next"){
    if(!member.host||room.game?.phase!=="round-over")
      return {ok:false,error:"The room creator deals the next hand."};
    let next=promoteQueued(changed(room,now));
    next.game=rookAction(room.game,{type:"next"}).game;
    next.lastTrick=null;
    next.lastAction="Fresh cards for the next hand!";
    next=advanceBots(next);
    return {ok:true,room:next};
  }
  if(action.type==="queue"||action.type==="leave-queue"){
    if(room.phase!=="playing"||member.role!=="spectator")
      return {ok:false,error:"Only a spectator can request the next open bot seat."};
    const waiting=room.waiting||[];
    if(action.type==="queue"){
      if(waiting.includes(token))return {ok:true,room};
      const botSeats=room.players.filter(p=>p?.bot).length;
      if(!botSeats||waiting.length>=botSeats)
        return {ok:false,error:"No bot chairs are free for the next hand."};
      return {ok:true,room:{...changed(room,now),waiting:[...waiting,token],
        lastAction:member.name+" is waiting for the next hand."}};
    }
    return {ok:true,room:{...changed(room,now),waiting:waiting.filter(t=>t!==token)}};
  }
  if(room.phase!=="playing"||!room.game)return {ok:false,error:"The family match has not started."};
  if(member.role!=="player")return {ok:false,error:"Spectators can chat but cannot play cards."};
  if(room.game.turn!==member.seat)return {ok:false,error:"Another player has the turn."};
  if(!acceptedAction.has(action.type))return {ok:false,error:"That action is not allowed."};
  // Only whitelisted parameters are forwarded. The server ignores any
  // client-supplied game, cards, seat number, score or winning-trick claims.
  const requested=action.type==="bid"?{type:"bid",value:action.value}:
    action.type==="discard"?{type:"discard",indices:action.indices}:
    action.type==="trump"?{type:"trump",color:action.color}:
    {type:"play",index:action.index};
  const result=rookAction(room.game,requested);
  if(!result.valid)return {ok:false,error:"That move is not legal for your hand."};
  let next=changed(room,now);
  next.game=result.game;
  if(requested.type==="play")next.lastAction=member.name+" played a card.";
  if(requested.type==="bid")next.lastAction=member.name+
    (requested.value==="pass"?" passed.":" bid "+requested.value+".");
  if(requested.type==="discard")next.lastAction=member.name+" set aside the five nest cards.";
  if(requested.type==="trump")next.lastAction=member.name+" chose "+requested.color+" trump.";
  next=advanceBots(next);
  return {ok:true,room:next};
}
export function familyChat(room,token,text,now=Date.now(),id=String(now)){
  const member=membership(room,token);
  if(!member)return {ok:false,error:"Join the room before chatting."};
  if(typeof text!=="string"||!text.trim())return {ok:false,error:"Write a message first."};
  const clean=text.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,"").trim().slice(0,400);
  if(!clean)return {ok:false,error:"Write a message first."};
  if((room.lastChatAt[token]||0)>now-1200)
    return {ok:false,error:"Give everyone a moment between messages."};
  const next=changed(room,now);
  next.chat=[...room.chat.slice(-(ROOM_CHAT_LIMIT-1)),{
    id,name:member.name,seat:member.seat,at:now,text:clean
  }];
  next.lastChatAt={...room.lastChatAt,[token]:now};
  return {ok:true,room:next};
}
export function familyView(room,token){
  const me=membership(room,token);
  if(!me)return null;
  const g=room.game;
  const game=g?{
    phase:g.phase,round:g.round,dealer:g.dealer,turn:g.turn,
    scores:[...g.scores],points:[...g.points],
    bid:g.bid,bidder:g.bidder,trump:g.trump,
    passed:[...g.passed],
    trick:g.trick.map(({seat,card})=>({seat,card})),
    trickWinner:g.trickWinner,winner:g.winner,
    lastResult:g.lastResult?{...g.lastResult}:null,
    handCounts:g.hands.map(hand=>hand.length),
    // Only your own cards can be viewed or selected.
    hand:me.role==="player"?[...g.hands[me.seat]]:[],
    legal:me.role==="player"?rookLegalCards(g,me.seat):[],
    nestCount:g.nest.length
  }:null;
  return {
    code:room.code,version:room.version,phase:room.phase,
    me:{role:me.role,seat:me.seat,name:me.name,host:me.host},
    seats:room.players.map((p,seat)=>p?{seat,name:p.name,bot:p.bot}:null),
    spectatorCount:room.spectators.length,
    waitingCount:(room.waiting||[]).length,
    onWaitingList:(room.waiting||[]).includes(token),
    botSeats:room.players.filter(p=>p?.bot).length,
    lastAction:room.lastAction,lastTrick:room.lastTrick,
    game,chat:room.chat.map(m=>({...m}))
  };
}
