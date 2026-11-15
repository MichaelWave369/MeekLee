import test from "node:test";
import assert from "node:assert/strict";
import {
  newColorParade,validColorParade,paradePlayable,paradePlay,paradeDraw,
  paradePass,paradeBotAction,paradeAction,PARADE_COLORS,PARADE_TARGET
} from "../src/color-parade.js";

test("four-player Color Parade starts with 108 original cards and seven cards per seat",()=>{
  for(let seed=1;seed<=50;seed++){
    const g=newColorParade(seed);
    assert(validColorParade(g));
    assert.equal(g.hands.length,4);
    assert(g.hands.every(hand=>hand.length===7));
    assert.equal(g.discard.length,1);
    assert.equal(g.deck.length,79);
    assert.equal(g.turn,0);
    assert.equal(g.phase,"play");
    assert.deepEqual(g,newColorParade(seed));
  }
});

test("playing a card requires matching color, number, type or a wild color",()=>{
  let g=newColorParade(9);
  const hand=g.hands[0],index=hand.findIndex(c=>c.type==="wild");
  if(index>=0){
    assert.equal(paradePlay(g,0,index).valid,false);
    assert.equal(paradePlay(g,0,index,"purple").valid,false);
    const played=paradePlay(g,0,index,"leaf");
    assert(played.valid);
    assert.equal(played.game.activeColor,"leaf");
    assert.equal(played.game.turn,1);
    assert.equal(played.game.hands[0].length,6);
    assert.equal(validColorParade(played.game),true);
  }
  const invalid=hand.findIndex(c=>!paradePlayable(g,c));
  if(invalid>=0)assert.equal(paradePlay(g,0,invalid).valid,false);
  assert.equal(paradePlay(g,1,0,"coral").valid,false);
});

test("draw one, play or end turn, and never draw twice in the same turn",()=>{
  const g=newColorParade(18);
  const draw=paradeDraw(g,0);
  assert(draw.valid);
  assert.equal(draw.game.hands[0].length,8);
  assert.equal(draw.game.drawn,true);
  assert.equal(paradeDraw(draw.game,0).valid,false);
  assert.equal(paradePass(g,0).valid,false);
  const passed=paradePass(draw.game,0);
  assert(passed.valid);
  assert.equal(passed.game.turn,1);
  assert.equal(passed.game.drawn,false);
  assert(validColorParade(passed.game));
});

test("action cards skip, reverse, and draw two obey the turn direction",()=>{
  for(const type of ["skip","reverse","draw2"]){
    let seed=1,g,index=-1;
    while(seed<=70){
      const candidate=newColorParade(seed++);
      const pick=candidate.hands[0].findIndex(c=>c.type===type);
      if(pick>=0){g=candidate;index=pick;break;}
    }
    assert(g,"seed with action "+type);
    const card=g.hands[0][index];
    g={...g,activeColor:card.color};
    const result=paradePlay(g,0,index);
    assert(result.valid);
    if(type==="skip")assert.equal(result.game.turn,2);
    if(type==="reverse"){assert.equal(result.game.direction,-1);assert.equal(result.game.turn,3);}
    if(type==="draw2"){
      assert.equal(result.game.turn,2);
      assert.equal(result.game.hands[1].length,9);
      assert.equal(result.game.deck.length,g.deck.length-2);
    }
    assert(validColorParade(result.game));
  }
});

test("all three bots finish entire rounds without illegal moves or infinite turns",()=>{
  for(const seed of [1,2,4,9,17,22]){
    let game=newColorParade(seed),steps=0,rounds=0;
    while(game.phase!=="game-over"&&steps++<15000){
      let action=null;
      if(game.phase==="round-over"){
        rounds++;action={type:"next"};
      }else if(game.turn===0){
        const hand=game.hands[0];
        const index=hand.findIndex(c=>paradePlayable(game,c));
        action=index>=0?{type:"play",index,color:hand[index].type==="wild"?"sun":null}:
          game.drawn?{type:"pass"}:{type:"draw"};
      }else action=paradeBotAction(game);
      assert(action,"missing action at "+steps);
      const result=paradeAction(game,action);
      assert(result.valid,JSON.stringify(action));
      assert(validColorParade(result.game));
      game=result.game;
    }
    assert(steps<15000,"bots must finish independently of network");
    assert.equal(game.phase,"game-over");
    assert(Math.max(...game.scores)>=PARADE_TARGET);
    assert(rounds>=0);
  }
});
