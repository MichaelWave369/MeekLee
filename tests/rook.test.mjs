import test from "node:test";
import assert from "node:assert/strict";
import {
  newRook,validRook,rookBid,rookDiscard,rookTrump,rookPlay,
  rookLegalCards,rookTrickWinner,rookCardPoints,rookCollect,
  nextRookRound,rookBotAction,rookAction,rookTeam,ROOK_TARGET,ROOK_BIRD
} from "../src/rook.js";

test("41-card partnership deal: Mom and three bots, nine cards apiece plus five nest",()=>{
  for(let seed=1;seed<=70;seed++){
    const g=newRook(seed);
    assert(validRook(g));
    assert.equal(g.hands.length,4);
    assert(g.hands.every(h=>h.length===9));
    assert.equal(g.nest.length,5);
    assert.equal(g.turn,0);
    assert.equal(g.phase,"bid");
    assert.equal(g.scores[0],0);
    assert.equal(rookTeam(0),rookTeam(2));
    assert.notEqual(rookTeam(0),rookTeam(1));
    assert.deepEqual(g,newRook(seed));
  }
  assert.equal(rookCardPoints(ROOK_BIRD),20);
  assert.equal(rookCardPoints("red-5"),5);
  assert.equal(rookCardPoints("red-10"),10);
  assert.equal(rookCardPoints("red-14"),10);
  assert.equal(rookCardPoints("red-13"),0);
});

test("human bidding, three passes, five-card nest, trump and trick follow-suit",()=>{
  let g=newRook(29);
  assert.equal(rookBid(g,0,65).valid,false);
  assert.equal(rookBid(g,0,70).valid,true);
  g=rookBid(g,0,70).game;
  for(let tries=0;g.phase==="bid"&&tries<20;tries++){
    const action=g.turn===0?{type:"bid",value:"pass"}:{type:"bid",value:"pass"};
    g=rookAction(g,action).game;
  }
  assert.equal(g.phase,"nest");
  assert.equal(g.bidder,0);
  assert.equal(g.hands[0].length,14);
  assert.equal(rookDiscard(g,0,[0,1,2,3,3]).valid,false);
  assert.equal(rookDiscard(g,0,[0,1,2,3,4]).valid,true);
  g=rookDiscard(g,0,[0,1,2,3,4]).game;
  assert.equal(g.nest.length,5);
  assert.equal(g.hands[0].length,9);
  assert.equal(rookTrump(g,0,"purple").valid,false);
  g=rookTrump(g,0,"red").game;
  assert.equal(g.phase,"play");
  const first=rookLegalCards(g,0);
  assert.equal(first.length,9);
  const play=rookPlay(g,0,first[0]);
  assert(play.valid);
  const led=play.game.trick[0].card;
  const next=play.game.turn;
  const matches=play.game.hands[next].filter(c=>c===ROOK_BIRD?
    g.trump==="red":c.startsWith(led===ROOK_BIRD?g.trump+"-":led.split("-")[0]+"-"));
  const legal=rookLegalCards(play.game,next);
  if(matches.length)assert.equal(legal.length,matches.length);
  assert(rookTrickWinner([{seat:0,card:"black-14"},{seat:1,card:"red-5"},
    {seat:2,card:ROOK_BIRD},{seat:3,card:"red-14"}],"red")===2);
});

test("three bots and Mom can legally finish multiple rounds and reach a game winner",()=>{
  for(const seed of [1,3,7,18,29]){
    let g=newRook(seed),completed=0,steps=0;
    while(g.phase!=="game-over"&&steps++<10000){
      const phase=g.phase;
      let action=null;
      if(phase==="trick-done")action={type:"collect"};
      else if(phase==="round-over"){
        assert.equal(g.points[0]+g.points[1],120,"each round captures all scoring cards");
        completed++;
        action={type:"next"};
      }else if(g.turn===0){
        if(phase==="bid")action={type:"bid",value:"pass"};
        else if(phase==="nest")action={type:"discard",indices:[0,1,2,3,4]};
        else if(phase==="trump")action={type:"trump",color:"green"};
        else if(phase==="play")action={type:"play",index:rookLegalCards(g,0)[0]};
      }else action=rookBotAction(g);
      assert(action,"no action in phase "+phase+" at step "+steps);
      const result=rookAction(g,action);
      assert(result.valid,"invalid "+JSON.stringify(action)+" in "+phase);
      assert(validRook(result.game));
      g=result.game;
      assert(g.hands.every(hand=>hand.length<=14));
    }
    assert(steps<10000,"AI partners must finish without looping");
    assert.equal(g.phase,"game-over");
    assert(completed>=1);
    assert(Math.max(...g.scores)>=ROOK_TARGET);
    assert.equal(g.points[0]+g.points[1],120);
  }
});

test("a failed bid subtracts bid points from the bidding partnership",()=>{
  let g=newRook(31);
  g={...g,phase:"trick-done",bidder:0,bid:100,trump:"red",
    hands:[[],[],[],[]],nest:["red-5","black-6","green-7","yellow-8","red-9"],
    trick:[{seat:0,card:"green-14"},{seat:1,card:"black-10"},
      {seat:2,card:"yellow-10"},{seat:3,card:"red-13"}],
    points:[20,60],trickWinner:3};
  const result=rookCollect(g);
  assert(result.valid);
  assert.equal(result.game.phase,"round-over");
  assert.equal(result.game.scores[0],-100);
  assert.equal(result.game.lastResult.bidMade,false);
});
