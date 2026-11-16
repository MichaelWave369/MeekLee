import test from "node:test";
import assert from "node:assert/strict";
import {
  VILLAGE_ACTIVITIES,normalizeVillageLife,advanceVillageActivity,
  villageActivityTarget,villageVisitingPets
} from "../src/village-life.js";
import {
  normalizeCollection,playGardenVillageActivity,
  gardenInventory,placeGardenVillageDecor,CHEST_WORLDS
} from "../src/collection.js";
import {createSaveState} from "../src/save.js";
import {makeLevel,SIZE,EASY_SIZE} from "../src/core.js";
import {newFreeCell} from "../src/freecell.js";

const districtNames=["square","meadow","orchard","pond"];
test("four distinct no-clock neighborhood activities have three choices and three steps",()=>{
  assert.deepEqual(Object.keys(VILLAGE_ACTIVITIES),districtNames);
  for(const d of districtNames){
    const card=VILLAGE_ACTIVITIES[d];
    assert.equal(card.options.length,3);
    assert.equal(card.order.length,3);
    assert.equal(new Set(card.order).size,3);
    assert(card.options.every(o=>o.name&&o.icon));
    assert(!("seconds" in card)&&!("price" in card)&&!("reward" in card));
  }
  assert.deepEqual(CHEST_WORLDS,["harvest","sweets","rescue","bubbles"]);
});
test("legacy and malformed activity saves safely normalize without changing other garden fields",()=>{
  const empty=normalizeVillageLife();
  assert.deepEqual(Object.keys(empty),districtNames);
  for(const d of districtNames)assert.deepEqual(empty[d],{rounds:0,step:0});
  const corrupt=normalizeVillageLife({
    square:{rounds:5,step:2},
    meadow:{rounds:-1,step:4},
    orchard:{rounds:1.2,step:"2"},
    pond:{rounds:Number.POSITIVE_INFINITY,step:1},
    fake:{rounds:123,step:2}
  });
  assert.deepEqual(corrupt.square,{rounds:5,step:2});
  assert.deepEqual(corrupt.meadow,{rounds:0,step:0});
  assert.deepEqual(corrupt.orchard,{rounds:0,step:0});
  assert.deepEqual(corrupt.pond,{rounds:0,step:1});
  assert(!Object.hasOwn(corrupt,"fake"));
  assert.deepEqual(normalizeVillageLife([]),empty);
  assert.deepEqual(normalizeVillageLife({square:{rounds:1000001,step:2}}).square,
    {rounds:0,step:2});
});
test("fountain ripples progress in order; wrong choices do not affect saves or cost a life",()=>{
  const start=normalizeVillageLife();
  const expected=[0,2,1],original=JSON.stringify(start);
  assert.equal(villageActivityTarget(start,"square"),0);
  const invalid=advanceVillageActivity(start,"square",2);
  assert(!invalid.valid);
  assert.deepEqual(invalid.life,start);
  assert.equal(villageActivityTarget(start,"nope"),null);
  assert(!advanceVillageActivity(start,"unknown",0).valid);
  assert(!advanceVillageActivity(start,"square",-1).valid);
  assert(!advanceVillageActivity(start,"square","0").valid);
  let life=start;
  expected.forEach((choice,i)=>{
    assert.equal(villageActivityTarget(life,"square"),choice);
    const next=advanceVillageActivity(life,"square",choice);
    assert(next.valid);
    assert.equal(next.completed,i===2);
    life=next.life;
  });
  assert.equal(life.square.rounds,1);
  assert.equal(life.square.step,0);
  assert.equal(villageActivityTarget(life,"square"),2,
    "round two rotates the target sequence");
  assert.equal(JSON.stringify(start),original);
});
test("each neighborhood completes multiple rounds without timers, payments or progress leakage",()=>{
  let state=normalizeVillageLife();
  for(const d of districtNames){
    for(let i=0;i<9;i++){
      const choice=villageActivityTarget(state,d);
      const next=advanceVillageActivity(state,d,choice);
      assert(next.valid);
      state=next.life;
    }
    assert.deepEqual(state[d],{rounds:3,step:0});
    for(const other of districtNames.filter(x=>x!==d)){
      assert(state[other].rounds>=0);
    }
  }
  assert.deepEqual(Object.values(state).map(x=>x.rounds),[3,3,3,3]);
});
test("only genuinely unlocked rescue friends can visit, and selected companion is not duplicated",()=>{
  const pets=[
    {id:"bunny",icon:"🐰",name:"Pip"},
    {id:"puppy",icon:"🐶",name:"Biscuit"},
    {id:"kitten",icon:"🐱",name:"Muffin"},
    {id:"fox",icon:"🦊",name:"Fern"}
  ];
  const none=villageVisitingPets([],null,"pond");
  assert.deepEqual(none,[]);
  const noExtra=villageVisitingPets([pets[0]],"bunny","pond");
  assert.deepEqual(noExtra,[]);
  const guests=villageVisitingPets(pets,"bunny","pond");
  assert.equal(guests.length,2);
  assert(guests.every(p=>p.id!=="bunny"&&pets.includes(p)));
  const again=villageVisitingPets(pets,"bunny","pond");
  assert.deepEqual(again,guests);
  const life=normalizeVillageLife({pond:{rounds:1,step:0}});
  const rotated=villageVisitingPets(pets,"bunny","pond",life);
  assert.equal(rotated.length,2);
  assert.notDeepEqual(rotated,guests);
  assert.deepEqual(villageVisitingPets(pets,null,"forged"),[]);
});
test("real saved activity completion cannot grant chests, ornaments or pets",()=>{
  let collection=normalizeCollection({
    claimed:{"harvest:1":true,"sweets:1":true},
    companion:"bunny",
    meadowPrizes:["meadow_daisy_wreath"],
    villagePlacements:{sunflower:"square:0"}
  });
  const original=JSON.stringify(collection);
  for(let i=0;i<12;i++){
    const choice=villageActivityTarget(collection.villageLife,"pond");
    const action=playGardenVillageActivity(collection,"pond",choice);
    assert(action.valid);
    collection=action.collection;
  }
  assert.equal(collection.villageLife.pond.rounds,4);
  assert.deepEqual(collection.villageLife.square,{rounds:0,step:0});
  assert.deepEqual(collection.villagePlacements,{sunflower:"square:0"});
  assert.deepEqual(collection.claimed,{"harvest:1":true,"sweets:1":true});
  assert.deepEqual(collection.meadowPrizes,["meadow_daisy_wreath"]);
  assert.equal(collection.companion,"bunny");
  assert.equal(gardenInventory(collection).pets.length,2);
  assert.equal(original.includes("villageLife"),true);
  const invalid=playGardenVillageActivity(collection,"pond",99);
  assert.equal(invalid.valid,false);
  assert.deepEqual(invalid.collection,collection);
});
test("village activity progress survives old level 6001, FreeCell, other worlds and all garden prizes",()=>{
  const old=makeLevel("harvest",6001,SIZE);
  const kitchen=makeLevel("kitchen",19,EASY_SIZE);
  const freecell=newFreeCell(369);
  const raw={
    mode:"harvest",games:{harvest:old},progress:{harvest:6001},
    easyGames:{kitchen},easyProgress:{kitchen:19},
    cards:{freecell},
    collection:{
      claimed:{"harvest:1":true,"sweets:1":true},
      companion:"bunny",
      meadowPrizes:["meadow_daisy_wreath"],
      pumpkinPrizes:["pumpkin_lantern"],
      moonlightPrizes:["moonlight_glow_lantern"],
      kitchenPrizes:["kitchen_herb_basket"],
      villagePlacements:{sunflower:"square:0"},
      villageLife:{square:{rounds:12,step:2},pond:{rounds:2,step:1}}
    }
  };
  const save=createSaveState(raw,true);
  assert.deepEqual(save.games.harvest,old);
  assert.deepEqual(save.easyGames.kitchen,kitchen);
  assert.deepEqual(save.cards.freecell,freecell);
  assert.equal(save.progress.harvest,6001);
  assert.equal(save.collection.companion,"bunny");
  assert.equal(save.collection.claimed["harvest:1"],true);
  assert.deepEqual(save.collection.villagePlacements,{sunflower:"square:0"});
  assert.deepEqual(save.collection.villageLife.square,{rounds:12,step:2});
  assert.deepEqual(save.collection.villageLife.pond,{rounds:2,step:1});
  const roundtrip=createSaveState(JSON.parse(JSON.stringify(save)),true);
  assert.deepEqual(roundtrip.collection,save.collection);
  assert.deepEqual(roundtrip.cards.freecell,freecell);
  assert.deepEqual(roundtrip.games.harvest,old);
});
