import test from "node:test";
import assert from "node:assert/strict";
import {
  VILLAGE_SEASONS,VILLAGE_SEASON_DECOR,normalizeVillageSeason,
  changeVillageSeason,seasonalVillageDescription
} from "../src/village-season.js";
import {
  CHEST_WORLDS,normalizeCollection,gardenInventory,setGardenVillageSeason
} from "../src/collection.js";
import {createSaveState} from "../src/save.js";
import {makeLevel,SIZE,EASY_SIZE} from "../src/core.js";
import {newFreeCell} from "../src/freecell.js";

test("four clearly named manually-selected seasons never change a clock or puzzle mode",()=>{
  assert.deepEqual(VILLAGE_SEASONS.map(x=>x.id),["spring","summer","autumn","winter"]);
  assert.equal(new Set(VILLAGE_SEASONS.map(x=>x.id)).size,4);
  assert.equal(CHEST_WORLDS.length,4);
  for(const season of VILLAGE_SEASONS){
    assert(season.name&&season.icon&&season.description);
    assert.equal(VILLAGE_SEASON_DECOR[season.id].length,5);
    assert(!("timer" in season)&&!("price" in season));
  }
  assert.equal(normalizeVillageSeason(), "summer");
  assert.equal(normalizeVillageSeason("snow"),"summer");
  assert.equal(normalizeVillageSeason({id:"winter"}),"summer");
  assert.equal(normalizeVillageSeason("winter"),"winter");
});
test("seasons change on deliberate valid choice, never add or erase ornaments",()=>{
  const invalid=changeVillageSeason("summer","festival");
  assert.deepEqual(invalid,{valid:false,season:"summer"});
  assert.deepEqual(changeVillageSeason("summer","summer"),invalid);
  assert.deepEqual(changeVillageSeason("broken","spring"),{valid:true,season:"spring"});
  for(const season of ["spring","autumn","winter","summer"]){
    assert.equal(changeVillageSeason("spring",season).season,season);
  }
  assert.match(seasonalVillageDescription("spring","meadow"),/flowers bloom/);
  assert.match(seasonalVillageDescription("autumn","orchard"),/Golden autumn/);
  assert.match(seasonalVillageDescription("winter","pond"),/frosty/);
  assert.match(seasonalVillageDescription("bogus","square"),/sunny village/);
});
test("season settings and separate Day/Sunset/Night choices persist independently",()=>{
  const initial=normalizeCollection({
    claimed:{"harvest:1":true},companion:"bunny",
    meadowPrizes:["meadow_daisy_wreath"],
    villagePlacements:{sunflower:"square:0"},
    villageAtmosphere:{timeOfDay:"night",lanterns:false,fireflies:true},
    villageLife:{pond:{rounds:7,step:2}},
    villageWander:{step:6,scenery:{pond:2}}
  });
  assert.equal(initial.villageSeason,"summer");
  const before=JSON.stringify(initial);
  const moved=setGardenVillageSeason(initial,"autumn");
  assert(moved.valid);
  assert.equal(moved.collection.villageSeason,"autumn");
  const {villageSeason:oldSeason,...oldRest}=initial;
  const {villageSeason:newSeason,...newRest}=moved.collection;
  assert.deepEqual(newRest,oldRest);
  assert.equal(moved.collection.villageAtmosphere.timeOfDay,"night");
  assert.deepEqual(gardenInventory(moved.collection),gardenInventory(initial));
  assert.equal(JSON.stringify(initial),before);
  const invalid=setGardenVillageSeason(moved.collection,"gibberish");
  assert(!invalid.valid);
  assert.deepEqual(invalid.collection,moved.collection);
});
test("old 6001+ saves, FreeCell, all eight worlds and personal decorations survive seasonal migration",()=>{
  const harvest=makeLevel("harvest",6001,SIZE),moon=makeLevel("moonlight",13,EASY_SIZE);
  const card=newFreeCell(369);
  const raw={
    mode:"harvest",games:{harvest},progress:{harvest:6001},
    easyGames:{moonlight:moon},easyProgress:{moonlight:13,kitchen:29},
    cards:{freecell:card},
    collection:{
      claimed:{"harvest:1":true},companion:"bunny",
      hiddenDecorations:["sunflower"],
      meadowPrizes:["meadow_daisy_wreath"],
      pumpkinPrizes:["pumpkin_lantern"],
      moonlightPrizes:["moonlight_glow_lantern"],
      kitchenPrizes:["kitchen_herb_basket"],
      villagePlacements:{sunflower:"square:0",kitchen_herb_basket:"pond:19"},
      villageLife:{square:{rounds:2,step:1}},
      villageWander:{step:4,scenery:{pond:3}},
      villageAtmosphere:{timeOfDay:"night",lanterns:true,fireflies:false},
      villageSeason:"winter"
    }
  };
  const save=createSaveState(raw,true);
  assert.deepEqual(save.games.harvest,harvest);
  assert.deepEqual(save.easyGames.moonlight,moon);
  assert.equal(save.progress.harvest,6001);
  assert.equal(save.easyProgress.kitchen,29);
  assert.deepEqual(save.cards.freecell,card);
  assert.equal(save.collection.villageSeason,"winter");
  assert.equal(save.collection.villageAtmosphere.timeOfDay,"night");
  assert.deepEqual(save.collection.villagePlacements,{
    sunflower:"square:0",kitchen_herb_basket:"pond:19"
  });
  assert.equal(save.collection.villageLife.square.rounds,2);
  assert.equal(save.collection.villageWander.step,4);
  assert.equal(save.collection.companion,"bunny");
  assert.deepEqual(save.collection.hiddenDecorations,["sunflower"]);
  const reopened=createSaveState(JSON.parse(JSON.stringify(save)),true);
  assert.deepEqual(reopened.collection,save.collection);
  assert.deepEqual(reopened.games.harvest,harvest);
  assert.deepEqual(reopened.cards.freecell,card);
});
