import test from "node:test";
import assert from "node:assert/strict";
import {
  VILLAGE_LANDMARK_MOMENTS,normalizeVillageWander,villageWalkDistrict,
  nextVillageWalkDistrict,advanceVillageWalk,currentLandmarkMoment,
  advanceVillageLandmark,villageWalkingParty
} from "../src/village-wander.js";
import {
  CHEST_WORLDS,normalizeCollection,gardenInventory,
  strollGardenVillage,interactGardenVillageLandmark
} from "../src/collection.js";
import {createSaveState} from "../src/save.js";
import {makeLevel,SIZE,EASY_SIZE} from "../src/core.js";
import {newFreeCell} from "../src/freecell.js";

const areas=["square","meadow","orchard","pond"];
test("walk route is four fixed neighborhoods and scenery offers three visible moments each",()=>{
  assert.deepEqual(Object.keys(VILLAGE_LANDMARK_MOMENTS),areas);
  for(const id of areas){
    const moments=VILLAGE_LANDMARK_MOMENTS[id];
    assert.equal(moments.length,3);
    assert.equal(new Set(moments.map(m=>m.message)).size,3);
    assert(moments.every(m=>m.icon&&m.message));
    assert(moments.every(m=>!Object.hasOwn(m,"price")&&!Object.hasOwn(m,"reward")));
  }
  assert.deepEqual(CHEST_WORLDS,["harvest","sweets","rescue","bubbles"]);
});
test("old, corrupt and fabricated routes normalize without creating districts",()=>{
  const old=normalizeVillageWander(null);
  assert.deepEqual(old,{step:0,scenery:{square:0,meadow:0,orchard:0,pond:0}});
  assert.deepEqual(normalizeVillageWander([]),old);
  assert.deepEqual(normalizeVillageWander("pond"),old);
  const cleaned=normalizeVillageWander({
    step:7,scenery:{square:15,meadow:-2,orchard:1.3,pond:4,fictional:30}
  });
  assert.equal(cleaned.step,7);
  assert.deepEqual(cleaned.scenery,{square:15,meadow:0,orchard:0,pond:4});
  assert.deepEqual(normalizeVillageWander({step:-1,scenery:[]}),old);
  assert.equal(normalizeVillageWander({step:1_000_001}).step,0);
  assert.equal(normalizeVillageWander({step:1_000_000}).step,1_000_000);
  assert.equal(villageWalkDistrict({step:7}),"pond");
  assert.equal(nextVillageWalkDistrict({step:7}),"square");
});
test("a walk advances only on a deliberate click and loops through all four districts",()=>{
  const before=normalizeVillageWander(),snapshot=JSON.stringify(before);
  const expected=["meadow","orchard","pond","square","meadow"];
  let progress=before;
  for(const [i,nextArea] of expected.entries()){
    assert.equal(nextVillageWalkDistrict(progress),nextArea);
    const result=advanceVillageWalk(progress);
    assert(result.valid);
    assert.equal(result.district,nextArea);
    assert.equal(result.wander.step,i+1);
    assert.deepEqual(result.wander.scenery,before.scenery);
    progress=result.wander;
  }
  assert.equal(JSON.stringify(before),snapshot,"source remains immutable");
  const rollover=advanceVillageWalk({step:1_000_000});
  assert.equal(rollover.wander.step,0);
  assert.equal(rollover.district,"square");
});
test("landmark changes only the chosen district and produces distinct visible scenes",()=>{
  let current=normalizeVillageWander({step:13});
  assert.equal(currentLandmarkMoment(current,"pond"),null);
  assert.equal(currentLandmarkMoment(current,"fake"),null);
  assert.equal(advanceVillageLandmark(current,"fake").valid,false);
  const source=JSON.stringify(current);
  for(const district of areas){
    for(let i=0;i<3;i++){
      const change=advanceVillageLandmark(current,district);
      assert(change.valid);
      assert.deepEqual(change.moment,VILLAGE_LANDMARK_MOMENTS[district][i]);
      assert.equal(change.wander.scenery[district],i+1);
      assert.equal(currentLandmarkMoment(change.wander,district).icon,change.moment.icon);
      assert.equal(change.wander.step,13);
      current=change.wander;
    }
  }
  assert.equal(currentLandmarkMoment(current,"square").icon,
    VILLAGE_LANDMARK_MOMENTS.square[2].icon);
  const again=advanceVillageLandmark(current,"square");
  assert.deepEqual(again.moment,VILLAGE_LANDMARK_MOMENTS.square[0]);
  assert.equal(again.wander.scenery.square,4);
  assert.equal(JSON.parse(source).step,13);
  const cap=advanceVillageLandmark({scenery:{pond:1_000_000}},"pond");
  assert.equal(cap.wander.scenery.pond,1);
});
test("walking pets can only be derived from unlocked pets, and selected companion stays out",()=>{
  const pets=[
    {id:"bunny",name:"Pip",icon:"🐰"},
    {id:"puppy",name:"Biscuit",icon:"🐶"},
    {id:"kitten",name:"Muffin",icon:"🐱"},
    {id:"fox",name:"Fern",icon:"🦊"}
  ];
  assert.deepEqual(villageWalkingParty([],"bunny").pets,[]);
  assert.deepEqual(villageWalkingParty([pets[0]],"bunny").pets,[]);
  const start=villageWalkingParty(pets,"bunny",{step:0});
  assert.equal(start.district,"square");
  assert.deepEqual(start.pets,[pets[1],pets[2]]);
  for(let step=1;step<4;step++){
    const party=villageWalkingParty(pets,"bunny",{step});
    assert.deepEqual(party.pets,start.pets,"visitors stay together during a lap");
    assert.equal(party.district,areas[step]);
  }
  const next=villageWalkingParty(pets,"bunny",{step:4});
  assert.deepEqual(next.pets,[pets[2],pets[3]]);
  assert(next.pets.every(p=>p.id!=="bunny"&&pets.includes(p)));
  assert.deepEqual(villageWalkingParty([...pets,pets[1]],"bunny",{step:4}).pets,next.pets);
  assert.deepEqual(villageWalkingParty(pets,null,{step:0}).pets,[pets[0],pets[1]]);
});
test("strolling and scenery cannot grant or revoke earned pets, original chests or village plots",()=>{
  const start=normalizeCollection({
    claimed:{"harvest:1":true,"sweets:1":true},
    companion:"bunny",
    meadowPrizes:["meadow_daisy_wreath"],
    pumpkinPrizes:["pumpkin_lantern"],
    villagePlacements:{sunflower:"square:0"},
    villageLife:{square:{rounds:7,step:2}}
  });
  const original=JSON.stringify(start);
  const walk=strollGardenVillage(start);
  assert(walk.valid);
  assert.equal(walk.collection.villageWander.step,1);
  const fountain=interactGardenVillageLandmark(walk.collection,"square");
  assert(fountain.valid);
  assert.equal(fountain.collection.villageWander.scenery.square,1);
  const pond=interactGardenVillageLandmark(fountain.collection,"pond");
  assert(pond.valid);
  assert.equal(pond.collection.villageWander.scenery.pond,1);
  const invalid=interactGardenVillageLandmark(pond.collection,"fake");
  assert(!invalid.valid);
  assert.deepEqual(invalid.collection,pond.collection);
  assert.deepEqual(pond.collection.villagePlacements,start.villagePlacements);
  assert.deepEqual(pond.collection.villageLife,start.villageLife);
  assert.deepEqual(pond.collection.claimed,start.claimed);
  assert.deepEqual(pond.collection.meadowPrizes,start.meadowPrizes);
  assert.deepEqual(pond.collection.pumpkinPrizes,start.pumpkinPrizes);
  assert.equal(pond.collection.companion,"bunny");
  assert.deepEqual(gardenInventory(pond.collection),gardenInventory(start));
  assert.equal(JSON.stringify(start),original);
});
test("level 6001, FreeCell, all prior gardens, hidden ornaments and incomplete rounds survive reload",()=>{
  const harvest=makeLevel("harvest",6001,SIZE);
  const kitchen=makeLevel("kitchen",18,EASY_SIZE);
  const freecell=newFreeCell(369);
  const raw={
    mode:"harvest",games:{harvest},progress:{harvest:6001},
    easyGames:{kitchen},easyProgress:{kitchen:18},
    cards:{freecell},
    collection:{
      claimed:{"harvest:1":true,"sweets:1":true},companion:"bunny",
      hiddenDecorations:["sunflower"],
      meadowPrizes:["meadow_daisy_wreath"],
      pumpkinPrizes:["pumpkin_lantern"],
      moonlightPrizes:["moonlight_glow_lantern"],
      kitchenPrizes:["kitchen_herb_basket"],
      villagePlacements:{sunflower:"square:0"},
      villageLife:{pond:{rounds:6,step:2}},
      villageWander:{step:7,scenery:{square:13,meadow:2,orchard:0,pond:3}}
    }
  };
  const saved=createSaveState(raw,true);
  assert.deepEqual(saved.games.harvest,harvest);
  assert.deepEqual(saved.easyGames.kitchen,kitchen);
  assert.deepEqual(saved.cards.freecell,freecell);
  assert.equal(saved.progress.harvest,6001);
  assert.equal(saved.collection.companion,"bunny");
  assert.equal(saved.collection.claimed["harvest:1"],true);
  assert.deepEqual(saved.collection.hiddenDecorations,["sunflower"]);
  assert.deepEqual(saved.collection.villagePlacements,{sunflower:"square:0"});
  assert.deepEqual(saved.collection.villageLife.pond,{rounds:6,step:2});
  assert.deepEqual(saved.collection.villageWander,{step:7,
    scenery:{square:13,meadow:2,orchard:0,pond:3}});
  const restored=createSaveState(JSON.parse(JSON.stringify(saved)),true);
  assert.deepEqual(restored.collection,saved.collection);
  assert.deepEqual(restored.cards.freecell,freecell);
  assert.deepEqual(restored.games.harvest,harvest);
});
