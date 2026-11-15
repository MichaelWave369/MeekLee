import test from "node:test";
import assert from "node:assert/strict";
import {rookLegalCards,rookCardPoints,ROOK_TARGET} from "../src/rook.js";
import {
  createFamilyRoom,joinFamilyRoom,membership,familyAction,familyChat,
  familyView,cleanFamilyName,ROOM_CHAT_LIMIT,ROOM_MAX_SPECTATORS
} from "../family/room-core.js";

const CODE="a".repeat(32),tokens=Array.from({length:28},(_,i)=>String(i+1).padStart(32,"f"));
const newRoom=()=>createFamilyRoom(CODE,"Mom",tokens[0],1000);
const ok=result=>{assert.equal(result.ok,true,result.error);return result.room;};

test("private family table grants 4 seats, unlimited bot substitutions when starting and optional spectators",()=>{
  let room=newRoom();
  assert.equal(room.phase,"lobby");
  assert.equal(room.players[0].name,"Mom");
  assert.equal(room.players[1],null);
  assert.equal(membership(room,tokens[0]).host,true);
  room=ok(joinFamilyRoom(room,"Auntie",tokens[1],1100));
  room=ok(joinFamilyRoom(room,"Uncle Joe",tokens[2],1200));
  room=ok(joinFamilyRoom(room,"Cousin",tokens[3],1300));
  assert.equal(room.players[3].name,"Cousin");
  room=ok(joinFamilyRoom(room,"Another Cousin",tokens[4],1400));
  assert.equal(membership(room,tokens[4]).role,"spectator");
  assert.equal(room.spectators.length,1);
  assert.equal(room.players.length,4);
  const same=joinFamilyRoom(room,"Different Name",tokens[2],1500);
  assert(same.ok&&same.rejoined);
  assert.equal(same.room.players[2].name,"Uncle Joe");
  assert.equal(room.players[2].token,tokens[2]);
  assert.equal(familyAction(room,tokens[4],{type:"start"}).ok,false);
  room=ok(familyAction(room,tokens[0],{type:"start"},1600,77));
  assert.equal(room.phase,"playing");
  assert.equal(room.game.kind,"rook");
  assert(room.players.every(p=>p&&!p.bot));
  assert.equal(room.game.hands.flat().length,36);
  assert.equal(room.game.nest.length,5);
  assert.equal(room.game.turn,0);
  assert.equal(familyAction(room,tokens[4],{type:"play",index:0}).ok,false);
  assert.equal(familyAction(room,tokens[0],{type:"start"}).ok,false);
});

test("bot fill works with just Mom and a single relative, using established 41-card rules",()=>{
  let room=newRoom();
  room=ok(joinFamilyRoom(room,"Uncle",tokens[1],1100));
  room=ok(familyAction(room,tokens[0],{type:"start"},1200,34));
  assert.equal(room.players[0].bot,false);
  assert.equal(room.players[1].bot,false);
  assert.equal(room.players[2].bot,true);
  assert.equal(room.players[3].bot,true);
  assert.equal(room.game.hands.flat().length+room.game.nest.length+room.game.trick.length,41);
  assert.deepEqual(familyView(room,tokens[1]).game.hand,room.game.hands[1]);
  assert.deepEqual(familyView(room,tokens[0]).game.hand,room.game.hands[0]);
  assert.notDeepEqual(room.game.hands[0],room.game.hands[1]);
  assert.equal(room.players[1].name,"Uncle");
  assert.equal(room.players[2].name,"Pip 🤖");
});

test("every recipient sees only their own hand; spectators see no hands and session tokens never leak",()=>{
  let room=newRoom();
  room=ok(joinFamilyRoom(room,"Aunt",tokens[1],1100));
  room=ok(joinFamilyRoom(room,"Sister",tokens[2],1101));
  room=ok(joinFamilyRoom(room,"Brother",tokens[3],1102));
  room=ok(joinFamilyRoom(room,"Watcher",tokens[4],1103));
  room=ok(familyAction(room,tokens[0],{type:"start"},2000,12));
  for(let i=0;i<5;i++){
    const view=familyView(room,tokens[i]);
    assert(view);
    assert.equal(view.game.hand.length,i<4?9:0);
    assert.equal(view.game.handCounts.length,4);
    assert.equal("hands" in view.game,false);
    assert.equal("nest" in view.game,false);
    assert.equal("token" in view.me,false);
    for(const secret of tokens)assert.equal(JSON.stringify(view).includes(secret),false);
  }
  assert.equal(familyView(room,"someone_else"),null);
  assert.deepEqual(familyView(room,tokens[4]).game.legal,[]);
  assert.equal(room.players[1].token,tokens[1]);
});

test("one complete bot-assisted match follows bid/nest/trump/trick/score, without cheating or hangs",()=>{
  for(const seed of [5,21,97]){
    let room=ok(familyAction(newRoom(),tokens[0],{type:"start"},2000,seed));
    let safety=0;
    while(room.game.phase!=="game-over"&&safety++<2000){
      const g=room.game;
      let action;
      if(g.phase==="round-over"){
        assert.equal(g.points[0]+g.points[1],120);
        action={type:"next"};
      }else{
        assert.equal(g.turn,0,"Only Mom should be waiting, bots play on the server");
        if(g.phase==="bid")action={type:"bid",value:"pass"};
        else if(g.phase==="nest")action={type:"discard",indices:[0,1,2,3,4]};
        else if(g.phase==="trump")action={type:"trump",color:"red"};
        else if(g.phase==="play")action={type:"play",index:rookLegalCards(g,0)[0]};
        else throw Error("Unexpected phase "+g.phase);
      }
      const result=familyAction(room,tokens[0],action,2000+safety,seed+safety);
      assert(result.ok,"Step "+safety+": "+result.error);
      room=result.room;
      assert.equal(room.game.hands.length,4);
      assert(room.game.hands.every(h=>h.length<=14));
    }
    assert(safety<2000,"server bots should reach a winner");
    assert.equal(room.game.phase,"game-over");
    assert.equal(room.game.points[0]+room.game.points[1],120);
    assert(Math.max(...room.game.scores)>=ROOK_TARGET);
    assert.equal(familyView(room,tokens[0]).game.winner,room.game.winner);
    assert.equal(familyAction(room,tokens[1],{type:"restart"}).ok,false);
    room=ok(familyAction(room,tokens[0],{type:"restart"},7000,seed+10000));
    assert.equal(room.game.round,1);
    assert.deepEqual(room.game.scores,[0,0]);
  }
});

test("illegal moves, spoofed turns, bot actions and unapproved replacement are blocked",()=>{
  let room=ok(familyAction(newRoom(),tokens[0],{type:"start"},2000,101));
  assert.equal(familyAction(room,tokens[0],{type:"play",index:0}).ok,false);
  assert.equal(familyAction(room,tokens[0],{type:"bid",value:61}).ok,false);
  assert.equal(familyAction(room,tokens[1],{type:"bid",value:70}).ok,false);
  assert.equal(familyAction(room,tokens[0],{type:"danger",game:{winner:0}}).ok,false);
  const first=familyAction(room,tokens[0],{type:"bid",value:70,seat:3,winner:0});
  assert(first.ok);
  assert.equal(first.room.game.winner,null);
  assert(first.room.game.bid>=70,"Bots may legitimately outbid Mom after her 70 bid.");
  assert.equal(first.room.players[0].name,"Mom");
});

test("text chat is invite-only, bounded, rate-limited and plain text; guests can watch and chat",()=>{
  let room=newRoom();
  assert.equal(cleanFamilyName("  <Aunt Sue>  "),"Aunt Sue");
  assert.equal(cleanFamilyName(" \n  "), "");
  assert.equal(familyChat(room,"not-a-token","hello").ok,false);
  room=ok(joinFamilyRoom(room,"Aunt",tokens[1],1100));
  room=ok(joinFamilyRoom(room,"Uncle",tokens[2],1101));
  room=ok(joinFamilyRoom(room,"Sister",tokens[3],1102));
  room=ok(familyChat(room,tokens[0]," Hello family! ",2000,"m1"));
  assert.equal(room.chat.at(-1).text,"Hello family!");
  assert.equal(room.chat.at(-1).name,"Mom");
  assert.equal(familyChat(room,tokens[0],"spam",2200).ok,false);
  assert.equal(familyChat(room,tokens[0],"  ").ok,false);
  room=ok(familyChat(room,tokens[1],"<script>alert(1)</script>",4000,"m2"));
  // Text stays data, and React renders it escaped, never as HTML.
  assert.equal(room.chat.at(-1).text,"<script>alert(1)</script>");
  for(let i=0;i<ROOM_MAX_SPECTATORS+3;i++){
    const seatIndex=i+4;
    const joined=joinFamilyRoom(room,"Visitor "+i,tokens[seatIndex],5000+i);
    if(joined.ok)room=joined.room;
  }
  assert.equal(room.spectators.length,ROOM_MAX_SPECTATORS-0);
  const watcherToken=tokens[4];
  const message=familyChat(room,watcherToken,"Watching from home.",6000,"spectator-msg");
  assert(message.ok);
  assert.equal(message.room.chat.at(-1).seat,null);
  let now=10000;
  for(let i=0;i<ROOM_CHAT_LIMIT+12;i++){
    room=ok(familyChat(room,tokens[0],"Message "+i,now+=1250,"seq-"+i));
  }
  assert.equal(room.chat.length,ROOM_CHAT_LIMIT);
  assert.equal(room.chat.at(0).text,"Message 12");
});
