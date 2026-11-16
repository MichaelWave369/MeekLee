import test from "node:test";
import assert from "node:assert/strict";
import {
  VILLAGE_SKIES,normalizeVillageAtmosphere,changeVillageSky,
  toggleVillageGlow,villageVisibleGlow
} from "../src/village-atmosphere.js";
import {
  CHEST_WORLDS,normalizeCollection,gardenInventory,
  setGardenVillageSky,toggleGardenVillageGlow
} from "../src/collection.js";
import {createSaveState} from "../src/save.js";
import {makeLevel,SIZE,EASY_SIZE} from "../src/core.js";
import {newFreeCell} from "../src/freecell.js";

test("three manual sky presets have a fixed safe order and no automatic clock",()=>{
  assert.deepEqual(VILLAGE_SKIES.map(x=>x.id),["day","sunset","night"]);
  assert(VILLAGE_SKIES.every(x=>x.icon&&x.name&&x.description));
  assert.equal(new Set(VILLAGE_SKIES.map(x=>x.id)).size,3);
  assert.equal(CHEST_WORLDS.length,4);
  assert(!VILLAGE_SKIES.some(x=>Object.hasOwn(x,"timezone")||Object.hasOwn(x,"timer")));
});
test("old saves default to day and turned-on optional lights, without invalid extra keys",()=>{
  const empty={timeOfDay:"day",lanterns:true,fireflies:true};
  for(const raw of [null,undefined,"night",5,[],{}])
    assert.deepEqual(normalizeVillageAtmosphere(raw),empty);
  assert.deepEqual(normalizeVillageAtmosphere({
    timeOfDay:"night",lanterns:false,fireflies:false,
    paidLanterns:true,unlockedPrize:true
  }),{timeOfDay:"night",lanterns:false,fireflies:false});
  assert.deepEqual(normalizeVillageAtmosphere({
    timeOfDay:"midnight",lanterns:"false",fireflies:null
  }),empty);
  assert.deepEqual(normalizeVillageAtmosphere({
    timeOfDay:"sunset",lanterns:true,fireflies:false
  }),{timeOfDay:"sunset",lanterns:true,fireflies:false});
});
test("sky changes on deliberate valid selection only and preserve light preference",()=>{
  const initial=normalizeVillageAtmosphere();
  const raw=JSON.stringify(initial);
  const invalid=changeVillageSky(initial,"blue-hour");
  assert(!invalid.valid);
  assert.deepEqual(invalid.atmosphere,initial);
  assert(!changeVillageSky(initial,"day").valid);
  assert(!changeVillageSky(initial,undefined).valid);
  const sunset=changeVillageSky(initial,"sunset");
  assert(sunset.valid);
  assert.equal(sunset.atmosphere.timeOfDay,"sunset");
  assert.equal(sunset.atmosphere.lanterns,true);
  assert.equal(sunset.atmosphere.fireflies,true);
  const night=changeVillageSky(sunset.atmosphere,"night");
  assert(night.valid);
  assert.deepEqual(night.atmosphere,{timeOfDay:"night",lanterns:true,fireflies:true});
  const day=changeVillageSky(night.atmosphere,"day");
  assert(day.valid);
  assert.deepEqual(day.atmosphere,initial);
  assert.equal(JSON.stringify(initial),raw,"original object never mutates");
});
test("lantern and firefly toggles are independent and never create garden items",()=>{
  const initial=normalizeVillageAtmosphere();
  assert(!toggleVillageGlow(initial,"coins").valid);
  assert(!toggleVillageGlow(initial,"").valid);
  assert(!toggleVillageGlow(initial,5).valid);
  const lanterns=toggleVillageGlow(initial,"lanterns");
  assert(lanterns.valid);
  assert.deepEqual(lanterns.atmosphere,{...initial,lanterns:false});
  const flies=toggleVillageGlow(lanterns.atmosphere,"fireflies");
  assert(flies.valid);
  assert.deepEqual(flies.atmosphere,{...initial,lanterns:false,fireflies:false});
  const again=toggleVillageGlow(flies.atmosphere,"fireflies");
  assert.equal(again.atmosphere.fireflies,true);
  assert.equal(again.atmosphere.lanterns,false);
});
test("scenery is visible at sunset and night, never day, pond reflection only at night",()=>{
  assert.deepEqual(villageVisibleGlow({timeOfDay:"day",lanterns:true,fireflies:true}),{
    timeOfDay:"day",lanterns:false,fireflies:false,moonlitPond:false
  });
  assert.deepEqual(villageVisibleGlow({timeOfDay:"sunset",lanterns:true,fireflies:true}),{
    timeOfDay:"sunset",lanterns:true,fireflies:true,moonlitPond:false
  });
  assert.deepEqual(villageVisibleGlow({timeOfDay:"night",lanterns:true,fireflies:true}),{
    timeOfDay:"night",lanterns:true,fireflies:true,moonlitPond:true
  });
  assert.deepEqual(villageVisibleGlow({timeOfDay:"night",lanterns:false,fireflies:false}),{
    timeOfDay:"night",lanterns:false,fireflies:false,moonlitPond:true
  });
});
test("collection transitions preserve awards, rescue pets, plots, mini-games and strolling",()=>{
  const raw={
    claimed:{"harvest:1":true,"sweets:1":true},
    companion:"bunny",
    meadowPrizes:["meadow_daisy_wreath"],
    pumpkinPrizes:["pumpkin_lantern"],
    moonlightPrizes:["moonlight_glow_lantern"],
    kitchenPrizes:["kitchen_herb_basket"],
    hiddenDecorations:["sunflower"],
    villagePlacements:{sunflower:"square:0"},
    villageLife:{pond:{rounds:12,step:2}},
    villageWander:{step:7,scenery:{square:2,pond:4}}
  };
  const previous=normalizeCollection(raw);
  const snapshot=JSON.stringify(previous);
  const night=setGardenVillageSky(previous,"night");
  assert(night.valid);
  const lanterns=toggleGardenVillageGlow(night.collection,"lanterns");
  assert(lanterns.valid);
  const fireflies=toggleGardenVillageGlow(lanterns.collection,"fireflies");
  assert(fireflies.valid);
  assert.deepEqual(fireflies.collection.villageAtmosphere,{
    timeOfDay:"night",lanterns:false,fireflies:false
  });
  const {villageAtmosphere:_old,...previousRest}=previous;
  const {villageAtmosphere:_new,...afterRest}=fireflies.collection;
  assert.deepEqual(afterRest,previousRest);
  assert.deepEqual(gardenInventory(fireflies.collection),gardenInventory(previous));
  assert.equal(JSON.stringify(previous),snapshot);
  assert(!setGardenVillageSky(fireflies.collection,"midnight").valid);
  assert(!toggleGardenVillageGlow(fireflies.collection,"paid").valid);
});
test("existing level 6001+, FreeCell, world saves and every garden item survive day/night save migration",()=>{
  const harvest=makeLevel("harvest",6001,SIZE);
  const kitchen=makeLevel("kitchen",18,EASY_SIZE);
  const freecell=newFreeCell(369);
  const raw={
    mode:"harvest",games:{harvest},progress:{harvest:6001},
    easyGames:{kitchen},easyProgress:{kitchen:18,moonlight:33,pumpkin:29},
    cards:{freecell},
    collection:{
      claimed:{"harvest:1":true,"sweets:1":true},
      companion:"bunny",hiddenDecorations:["sunflower"],
      meadowPrizes:["meadow_daisy_wreath"],
      pumpkinPrizes:["pumpkin_lantern"],
      moonlightPrizes:["moonlight_glow_lantern"],
      kitchenPrizes:["kitchen_herb_basket"],
      villagePlacements:{sunflower:"square:0",kitchen_herb_basket:"pond:19"},
      villageLife:{pond:{rounds:5,step:1}},
      villageWander:{step:9,scenery:{pond:3}},
      villageAtmosphere:{timeOfDay:"night",lanterns:false,fireflies:true}
    }
  };
  const saved=createSaveState(raw,true);
  assert.deepEqual(saved.games.harvest,harvest);
  assert.deepEqual(saved.easyGames.kitchen,kitchen);
  assert.deepEqual(saved.cards.freecell,freecell);
  assert.equal(saved.progress.harvest,6001);
  assert.equal(saved.easyProgress.pumpkin,29);
  assert.equal(saved.easyProgress.moonlight,33);
  assert.equal(saved.collection.companion,"bunny");
  assert.equal(saved.collection.claimed["harvest:1"],true);
  assert.deepEqual(saved.collection.villagePlacements,{
    sunflower:"square:0",kitchen_herb_basket:"pond:19"
  });
  assert.deepEqual(saved.collection.villageLife.pond,{rounds:5,step:1});
  assert.equal(saved.collection.villageWander.step,9);
  assert.deepEqual(saved.collection.villageAtmosphere,{
    timeOfDay:"night",lanterns:false,fireflies:true
  });
  const reopened=createSaveState(JSON.parse(JSON.stringify(saved)),true);
  assert.deepEqual(reopened.collection,saved.collection);
  assert.deepEqual(reopened.games.harvest,harvest);
  assert.deepEqual(reopened.cards.freecell,freecell);
});
