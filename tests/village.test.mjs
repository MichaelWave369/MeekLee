import test from "node:test";
import assert from "node:assert/strict";
import {
  VILLAGE_COLS,VILLAGE_ROWS,VILLAGE_PLOTS,VILLAGE_DISTRICTS,VILLAGE_CAPACITY,
  villagePlotId,validVillagePlot,normalizeVillagePlacements,
  placeVillageItem,storeVillageItem
} from "../src/village.js";
import {
  CHEST_WORLDS,normalizeCollection,gardenInventory,toggleDecoration,
  placeGardenVillageDecor,storeGardenVillageDecor
} from "../src/collection.js";
import {createSaveState} from "../src/save.js";
import {makeLevel,SIZE,EASY_SIZE} from "../src/core.js";
import {newFreeCell} from "../src/freecell.js";

const owned=()=>normalizeCollection({
  claimed:{"harvest:1":true},
  meadowPrizes:["meadow_daisy_wreath"],
  pumpkinPrizes:["pumpkin_lantern"],
  moonlightPrizes:["moonlight_glow_lantern"],
  kitchenPrizes:["kitchen_herb_basket"],
  companion:"bunny"
});
test("Garden Village has four distinct neighborhoods, 80 real slots and no invented unlocks",()=>{
  assert.equal(VILLAGE_COLS,5);
  assert.equal(VILLAGE_ROWS,4);
  assert.equal(VILLAGE_PLOTS,20);
  assert.equal(VILLAGE_DISTRICTS.length,4);
  assert.equal(VILLAGE_CAPACITY,80);
  assert.equal(new Set(VILLAGE_DISTRICTS.map(d=>d.id)).size,4);
  assert.equal(villagePlotId("square",0),"square:0");
  assert.equal(villagePlotId("pond",19),"pond:19");
  assert.equal(villagePlotId("unknown",1),null);
  assert.equal(villagePlotId("square",20),null);
  for(const plot of ["square:0","pond:19","meadow:13","orchard:7"])
    assert(validVillagePlot(plot));
  for(const plot of ["square:-1","square:20","square:01","square:1.0",
    "square:1:2","madeup:3","pond:NaN",3,null,{},[]])
    assert(!validVillagePlot(plot),"invalid plot "+String(plot));
  assert.equal(CHEST_WORLDS.length,4);
});
test("normalize removes forged items, duplicate positions and invalid or corrupt save shapes",()=>{
  const allowed=["sunflower","meadow_daisy_wreath","kitchen_herb_basket"];
  assert.deepEqual(normalizeVillagePlacements(null,allowed),{});
  assert.deepEqual(normalizeVillagePlacements([],allowed),{});
  assert.deepEqual(normalizeVillagePlacements("square:0",allowed),{});
  assert.deepEqual(normalizeVillagePlacements({
    sunflower:"square:0",
    meadow_daisy_wreath:"square:0",
    kitchen_herb_basket:"pond:19",
    forged:"orchard:2"
  },allowed),{
    sunflower:"square:0",kitchen_herb_basket:"pond:19"
  });
  assert.deepEqual(normalizeVillagePlacements({
    sunflower:"meadow:20",meadow_daisy_wreath:"meadow:02",
    kitchen_herb_basket:"orchard:3"
  },allowed),{kitchen_herb_basket:"orchard:3"});
});
test("only genuinely owned visible decorations can be placed and a full plot cannot overwrite another",()=>{
  const current=owned(),items=gardenInventory(current).decor.map(i=>i.id);
  assert(items.includes("sunflower"));
  assert(items.includes("kitchen_herb_basket"));
  assert.equal(current.villagePlacements.sunflower,undefined);
  const stolen=placeGardenVillageDecor(current,"not-earned","square:0");
  assert(!stolen.valid);
  assert.deepEqual(stolen.collection,current);
  const invalid=placeGardenVillageDecor(current,"sunflower","square:20");
  assert(!invalid.valid);
  const first=placeGardenVillageDecor(current,"sunflower","square:0");
  assert(first.valid);
  assert.equal(first.collection.villagePlacements.sunflower,"square:0");
  assert.equal(current.villagePlacements.sunflower,undefined,"old collection immutable");
  const taken=placeGardenVillageDecor(first.collection,"kitchen_herb_basket","square:0");
  assert(!taken.valid);
  assert.deepEqual(taken.collection.villagePlacements,first.collection.villagePlacements);
  assert.deepEqual(gardenInventory(first.collection).decor.map(i=>i.id),items);
  const second=placeGardenVillageDecor(first.collection,"kitchen_herb_basket","pond:19");
  assert(second.valid);
  assert.equal(Object.keys(second.collection.villagePlacements).length,2);
  const duplicated=placeGardenVillageDecor(second.collection,"sunflower","square:0");
  assert(!duplicated.valid);
});
test("moving between neighborhoods has no duplicates; storage never deletes the earned item",()=>{
  const initial=placeGardenVillageDecor(owned(),"sunflower","square:0");
  const moved=placeGardenVillageDecor(initial.collection,"sunflower","orchard:19");
  assert(moved.valid);
  assert.deepEqual(moved.collection.villagePlacements,{sunflower:"orchard:19"});
  const stored=storeGardenVillageDecor(moved.collection,"sunflower");
  assert(stored.valid);
  assert.deepEqual(stored.collection.villagePlacements,{});
  assert(gardenInventory(stored.collection).decor.some(item=>item.id==="sunflower"));
  assert.deepEqual(storeGardenVillageDecor(stored.collection,"sunflower").collection,stored.collection);
  assert.equal(storeVillageItem({sunflower:"square:0"},"forged",["sunflower"]).valid,false);
  assert.equal(placeVillageItem({sunflower:"square:0"},"sunflower","pond:7",
    ["sunflower"],["sunflower"]).valid,false);
});
test("hidden original Garden decorations retain remembered plots but cannot be newly placed while hidden",()=>{
  const initial=placeGardenVillageDecor(owned(),"sunflower","square:0");
  const hidden=toggleDecoration(initial.collection,"sunflower");
  assert(hidden.hiddenDecorations.includes("sunflower"));
  assert.equal(hidden.villagePlacements.sunflower,"square:0",
    "hiding in Garden should not lose remembered Village arrangement");
  const attempted=placeGardenVillageDecor(hidden,"sunflower","meadow:4");
  assert.equal(attempted.valid,false);
  assert.equal(attempted.collection.villagePlacements.sunflower,"square:0");
  const stored=storeGardenVillageDecor(hidden,"sunflower");
  assert(stored.valid,"stored original garden decor may be removed from village layout");
  assert.deepEqual(stored.collection.villagePlacements,{});
  const visible=toggleDecoration(hidden,"sunflower");
  assert(!visible.hiddenDecorations.includes("sunflower"));
  const move=placeGardenVillageDecor(visible,"sunflower","meadow:4");
  assert(move.valid);
});
test("legacy level 6001, FreeCell, pets, chests and all seasonal rewards survive village migration",()=>{
  const harvest=makeLevel("harvest",6001,SIZE);
  const kitchen=makeLevel("kitchen",18,EASY_SIZE);
  const freecell=newFreeCell(369);
  const raw={
    mode:"harvest",games:{harvest},progress:{harvest:6001},
    easyGames:{kitchen},easyProgress:{kitchen:18},
    cards:{freecell},
    collection:{
      claimed:{"harvest:1":true},companion:"bunny",
      meadowPrizes:["meadow_daisy_wreath"],
      pumpkinPrizes:["pumpkin_lantern"],
      moonlightPrizes:["moonlight_glow_lantern"],
      kitchenPrizes:["kitchen_herb_basket"],
      villagePlacements:{
        sunflower:"square:0",kitchen_herb_basket:"pond:19",
        not_a_reward:"orchard:10"
      }
    }
  };
  const migrated=createSaveState(raw,true);
  assert.deepEqual(migrated.games.harvest,harvest);
  assert.deepEqual(migrated.easyGames.kitchen,kitchen);
  assert.deepEqual(migrated.cards.freecell,freecell);
  assert.equal(migrated.progress.harvest,6001);
  assert.equal(migrated.collection.claimed["harvest:1"],true);
  assert.equal(migrated.collection.companion,"bunny");
  assert.equal(migrated.collection.meadowPrizes[0],"meadow_daisy_wreath");
  assert.equal(migrated.collection.pumpkinPrizes[0],"pumpkin_lantern");
  assert.equal(migrated.collection.moonlightPrizes[0],"moonlight_glow_lantern");
  assert.equal(migrated.collection.kitchenPrizes[0],"kitchen_herb_basket");
  assert.deepEqual(migrated.collection.villagePlacements,
    {sunflower:"square:0",kitchen_herb_basket:"pond:19"});
  const next=createSaveState(JSON.parse(JSON.stringify(migrated)),true);
  assert.deepEqual(next.collection,migrated.collection);
  assert.deepEqual(next.cards.freecell,freecell);
  assert.deepEqual(next.games.harvest,harvest);
});
test("old collections load with no villages but keep the same garden inventory",()=>{
  const legacy=owned();
  const {villagePlacements,...previous}=legacy;
  const migrated=normalizeCollection(previous);
  assert.deepEqual(migrated.villagePlacements,{});
  assert.deepEqual(gardenInventory(migrated),gardenInventory(legacy));
  assert.deepEqual(normalizeVillagePlacements(Object.fromEntries(
    Array.from({length:100},(_,i)=>["item"+i,"square:"+i])),
    Array.from({length:100},(_,i)=>"item"+i)),Object.fromEntries(
    Array.from({length:20},(_,i)=>["item"+i,"square:"+i])));
});
