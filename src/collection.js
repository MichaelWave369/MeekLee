// Completely free, offline collectible garden and chapter chests for Mom.
// Every reward is deterministic, once-only per ten-level world chapter.
import { seedFor, rngFrom } from "./core.js";
import {normalizeVillagePlacements,placeVillageItem,storeVillageItem} from "./village.js";
import {normalizeVillageLife,advanceVillageActivity} from "./village-life.js";
import {normalizeVillageWander,advanceVillageWalk,advanceVillageLandmark} from "./village-wander.js";
import {normalizeVillageAtmosphere,changeVillageSky,toggleVillageGlow} from "./village-atmosphere.js";
import {normalizeVillageSeason,changeVillageSeason} from "./village-season.js";

export const GARDEN_DECOR = Object.freeze([
  {id:"sunflower",icon:"🌻",name:"Golden Sunflower"},
  {id:"rose",icon:"🌹",name:"Rose Bush"},
  {id:"tree",icon:"🌳",name:"Shady Tree"},
  {id:"mushroom",icon:"🍄",name:"Mushroom Patch"},
  {id:"fountain",icon:"⛲",name:"Garden Fountain"},
  {id:"tulips",icon:"🌷",name:"Tulip Bed"},
  {id:"bee",icon:"🐝",name:"Friendly Bees"},
  {id:"lantern",icon:"🏮",name:"Garden Lantern"},
  {id:"butterfly",icon:"🦋",name:"Butterfly Haven"},
  {id:"house",icon:"🏡",name:"Cozy Cottage"},
  {id:"rainbow",icon:"🌈",name:"Rainbow Arch"},
  {id:"pond",icon:"🪷",name:"Lily Pond"}
]);
// These decorations are earned from the NEW picture puzzles only. Never change
// the historic treasure-chest schedule: Mom's claimed chests stay identical.
export const JIGSAW_GARDEN_DECOR = Object.freeze([
  {id:"jigsaw_harvest_3",icon:"🌾",name:"Golden Wheat Bundle",scene:"harvest",size:3},
  {id:"jigsaw_harvest_4",icon:"🚜",name:"Little Farm Tractor",scene:"harvest",size:4},
  {id:"jigsaw_harvest_5",icon:"🧺",name:"Harvest Basket",scene:"harvest",size:5},
  {id:"jigsaw_pip_3",icon:"🪻",name:"Lavender Flowers",scene:"pip",size:3},
  {id:"jigsaw_pip_4",icon:"🦔",name:"Hedgehog Visitor",scene:"pip",size:4},
  {id:"jigsaw_pip_5",icon:"🍓",name:"Berry Patch",scene:"pip",size:5},
  {id:"jigsaw_lagoon_3",icon:"🐚",name:"Pretty Seashell",scene:"lagoon",size:3},
  {id:"jigsaw_lagoon_4",icon:"🪸",name:"Coral Garden",scene:"lagoon",size:4},
  {id:"jigsaw_lagoon_5",icon:"🦀",name:"Friendly Crab",scene:"lagoon",size:5}
]);
export const jigsawPrizeKey=(scene,size)=>scene+":"+size;

// Flower Meadow rewards are independent of the original four-world chests.
// Earn each once, across classic and large-piece mode, with no shop or timer.
export const MEADOW_GARDEN_DECOR = Object.freeze([
  {id:"meadow_daisy_wreath",icon:"🌼",name:"Daisy Wreath",level:3},
  {id:"meadow_flower_chimes",icon:"🎐",name:"Flower Wind Chimes",level:6},
  {id:"meadow_pollinator_home",icon:"🐝",name:"Pollinator Cottage",level:9},
  {id:"meadow_lily_walk",icon:"🪷",name:"Lily Walkway",level:12},
  {id:"meadow_bloom_cart",icon:"🛒",name:"Flower Market Cart",level:15},
  {id:"meadow_ribbon_arch",icon:"🎀",name:"Ribbon Blossom Arch",level:18}
]);
export function meadowPrizeForLevel(level){
  return MEADOW_GARDEN_DECOR.find(item=>item.level===level)||null;
}

// These are earned only from Pumpkin Patch's own independent milestones.
// Do not add Pumpkin Patch to CHEST_WORLDS: older chest keys and rewards are
// immutable, and old progress must never be reinterpreted.
export const PUMPKIN_GARDEN_DECOR=Object.freeze([
  {id:"pumpkin_lantern",icon:"🏮",name:"Autumn Pumpkin Lantern",level:3},
  {id:"pumpkin_hay_bench",icon:"🪑",name:"Hay Bale Bench",level:6},
  {id:"pumpkin_scarecrow",icon:"🎃",name:"Friendly Scarecrow",level:9},
  {id:"pumpkin_corn_gate",icon:"🌽",name:"Cornfield Garden Gate",level:12},
  {id:"pumpkin_cider_stand",icon:"🍎",name:"Little Cider Stand",level:15},
  {id:"pumpkin_autumn_gazebo",icon:"🍂",name:"Autumn Leaf Gazebo",level:18}
]);
export function pumpkinPrizeForLevel(level){
  return PUMPKIN_GARDEN_DECOR.find(item=>item.level===level)||null;
}

// Moonlight Orchard has separate earned prizes. Never add it to CHEST_WORLDS.
export const MOONLIGHT_GARDEN_DECOR=Object.freeze([
  {id:"moonlight_glow_lantern",icon:"🏮",name:"Moonlit Glow Lantern",level:3},
  {id:"moonlight_starry_birdbath",icon:"🐦",name:"Starry Birdbath",level:6},
  {id:"moonlight_silver_tree",icon:"🌳",name:"Silver Blossom Tree",level:9},
  {id:"moonlight_firefly_jar",icon:"✨",name:"Firefly Lantern Jar",level:12},
  {id:"moonlight_night_swing",icon:"🪑",name:"Moonlit Garden Swing",level:15},
  {id:"moonlight_moonbeam_arch",icon:"🌙",name:"Moonbeam Garden Arch",level:18}
]);
export function moonlightPrizeForLevel(level){
  return MOONLIGHT_GARDEN_DECOR.find(item=>item.level===level)||null;
}

// Grandma's Kitchen decorations are earned from cooking levels, not from
// anyone's private Family Porch notes or the original four-world chests.
export const KITCHEN_GARDEN_DECOR=Object.freeze([
  {id:"kitchen_herb_basket",icon:"🌿",name:"Grandma's Herb Basket",level:3},
  {id:"kitchen_berry_planter",icon:"🍓",name:"Strawberry Window Planter",level:6},
  {id:"kitchen_flour_sack",icon:"🌾",name:"Farmhouse Flour Sack",level:9},
  {id:"kitchen_tea_table",icon:"🫖",name:"Afternoon Tea Table",level:12},
  {id:"kitchen_picnic_bench",icon:"🧺",name:"Family Picnic Bench",level:15},
  {id:"kitchen_homestead_porch",icon:"🏡",name:"Grandma's Cozy Porch",level:18}
]);
export function kitchenPrizeForLevel(level){
  return KITCHEN_GARDEN_DECOR.find(item=>item.level===level)||null;
}
export const GARDEN_PETS = Object.freeze([
  {id:"bunny",icon:"🐰",name:"Pip the Bunny"},
  {id:"puppy",icon:"🐶",name:"Biscuit the Puppy"},
  {id:"kitten",icon:"🐱",name:"Muffin the Kitten"},
  {id:"fox",icon:"🦊",name:"Fern the Fox"},
  {id:"panda",icon:"🐼",name:"Poppy the Panda"},
  {id:"bear",icon:"🐻",name:"Honey the Bear"},
  {id:"otter",icon:"🦦",name:"Pebble the Otter"},
  {id:"bird",icon:"🐦",name:"Sunny the Bird"}
]);
export const BONUS_PIECES = Object.freeze(["🌼","🌸","🌻","🌷","🍀","🍓","🦋","🐞"]);
export const CHEST_WORLDS = Object.freeze(["harvest","sweets","rescue","bubbles"]);

export function chapterKey(mode, chapter) {
  return CHEST_WORLDS.includes(mode) && Number.isSafeInteger(chapter) && chapter > 0 ?
    mode + ":" + chapter : null;
}
export function chestReward(mode, chapter) {
  const key = chapterKey(mode,chapter);
  if (!key) return null;
  const offset=CHEST_WORLDS.indexOf(mode);
  return {
    key, mode, chapter, level: chapter * 10,
    decor: GARDEN_DECOR[(chapter - 1 + offset * 3) % GARDEN_DECOR.length],
    pet: GARDEN_PETS[(chapter - 1 + offset * 2) % GARDEN_PETS.length]
  };
}
function cleanBest(value) {
  return Number.isSafeInteger(value) && value >= 8 ? value : null;
}
export function normalizeCollection(raw = {}) {
  const previous=raw && typeof raw==="object" ? raw : {};
  const claimed={};
  const source=previous.claimed && typeof previous.claimed==="object" ? previous.claimed : {};
  for (const key of Object.keys(source)) {
    const [mode,chapterText]=key.split(":");
    const chapter=Number(chapterText);
    if (source[key]===true && chapterKey(mode,chapter)===key) claimed[key]=true;
  }
  const completedBonuses={};
  const bonusSource=previous.completedBonuses && typeof previous.completedBonuses==="object" ?
    previous.completedBonuses : {};
  for (const key of Object.keys(bonusSource)) {
    const best=cleanBest(bonusSource[key]);
    if (claimed[key] && best !== null) completedBonuses[key]=best;
  }
  const decorIds=new Set(Object.keys(claimed).map(k=>{
    const [mode,ch]=k.split(":"); return chestReward(mode,Number(ch))?.decor.id;
  }));
  const petIds=new Set(Object.keys(claimed).map(k=>{
    const [mode,ch]=k.split(":"); return chestReward(mode,Number(ch))?.pet.id;
  }));
  const jigsawPrizes=Array.isArray(previous.jigsawPrizes)?
    [...new Set(previous.jigsawPrizes.filter(k=>typeof k==="string" &&
      JIGSAW_GARDEN_DECOR.some(d=>jigsawPrizeKey(d.scene,d.size)===k)))]:[];
  for(const reward of JIGSAW_GARDEN_DECOR)
    if(jigsawPrizes.includes(jigsawPrizeKey(reward.scene,reward.size)))decorIds.add(reward.id);
  const meadowPrizes=Array.isArray(previous.meadowPrizes)?
    [...new Set(previous.meadowPrizes.filter(id=>
      typeof id==="string"&&MEADOW_GARDEN_DECOR.some(item=>item.id===id)))]:[];
  for(const item of MEADOW_GARDEN_DECOR)
    if(meadowPrizes.includes(item.id))decorIds.add(item.id);
  const pumpkinPrizes=Array.isArray(previous.pumpkinPrizes)?
    [...new Set(previous.pumpkinPrizes.filter(id=>
      typeof id==="string"&&PUMPKIN_GARDEN_DECOR.some(item=>item.id===id)))]:[];
  for(const item of PUMPKIN_GARDEN_DECOR)
    if(pumpkinPrizes.includes(item.id))decorIds.add(item.id);
  const moonlightPrizes=Array.isArray(previous.moonlightPrizes)?
    [...new Set(previous.moonlightPrizes.filter(id=>
      typeof id==="string"&&MOONLIGHT_GARDEN_DECOR.some(item=>item.id===id)))]:[];
  for(const item of MOONLIGHT_GARDEN_DECOR)
    if(moonlightPrizes.includes(item.id))decorIds.add(item.id);
  const kitchenPrizes=Array.isArray(previous.kitchenPrizes)?
    [...new Set(previous.kitchenPrizes.filter(id=>
      typeof id==="string"&&KITCHEN_GARDEN_DECOR.some(item=>item.id===id)))]:[];
  for(const item of KITCHEN_GARDEN_DECOR)
    if(kitchenPrizes.includes(item.id))decorIds.add(item.id);
  const villagePlacements=normalizeVillagePlacements(previous.villagePlacements,[...decorIds]);
  const villageLife=normalizeVillageLife(previous.villageLife);
  const villageWander=normalizeVillageWander(previous.villageWander);
  const villageAtmosphere=normalizeVillageAtmosphere(previous.villageAtmosphere);
  const villageSeason=normalizeVillageSeason(previous.villageSeason);
  const hiddenDecorations=Array.isArray(previous.hiddenDecorations) ?
    [...new Set(previous.hiddenDecorations.filter(id=>typeof id==="string" && decorIds.has(id)))]:[];
  const companion=petIds.has(previous.companion) ? previous.companion : null;
  return {claimed,completedBonuses,hiddenDecorations,companion,jigsawPrizes,meadowPrizes,pumpkinPrizes,moonlightPrizes,kitchenPrizes,villagePlacements,villageLife,villageWander,villageAtmosphere,villageSeason};
}
export function unlockedForMode(saved,mode) {
  if (!CHEST_WORLDS.includes(mode)) return 1;
  const classic=mode==="bubbles" ? saved?.shooterProgress?.[mode] : saved?.progress?.[mode];
  const easy=mode==="bubbles" ? saved?.easyShooterProgress?.[mode] : saved?.easyProgress?.[mode];
  const valid=v=>Number.isSafeInteger(v) && v>0 ? v : 1;
  return Math.max(valid(classic),valid(easy));
}
export function isChestClaimable(saved,mode,chapter) {
  const key=chapterKey(mode,chapter);
  return Boolean(key && unlockedForMode(saved,mode)>=chapter*10+1 &&
    !normalizeCollection(saved?.collection).claimed[key]);
}
// The total count is exact even when Mom has earned thousands of chapters.
export function totalAvailableChests(saved) {
  const claimed=normalizeCollection(saved?.collection).claimed;
  return CHEST_WORLDS.reduce((total,mode)=>{
    const earned=Math.floor((unlockedForMode(saved,mode)-1)/10);
    const used=Object.keys(claimed).reduce((count,key)=>{
      const [claimedMode,chapterText]=key.split(":");
      return count+(claimedMode===mode && Number(chapterText)<=earned ? 1 : 0);
    },0);
    return total+Math.max(0,earned-used);
  },0);
}
// Page a handful of unopened gifts; never iterate millions of milestones
// when an imported save has enormous progress. Later chests still exist.
export function availableChests(saved, limitPerWorld = 12) {
  const claimed=normalizeCollection(saved?.collection).claimed, result=[];
  for (const mode of CHEST_WORLDS) {
    const chapters=Math.floor((unlockedForMode(saved,mode)-1)/10);
    let emitted=0;
    for (let chapter=1;chapter<=chapters && emitted<limitPerWorld;chapter++) {
      const reward=chestReward(mode,chapter);
      if (!claimed[reward.key]) {result.push(reward);emitted++;}
    }
  }
  return result.sort((a,b)=>a.chapter-b.chapter || CHEST_WORLDS.indexOf(a.mode)-CHEST_WORLDS.indexOf(b.mode));
}
export function claimChapterChest(saved, mode, chapter) {
  const reward=chestReward(mode,chapter);
  const collection=normalizeCollection(saved?.collection);
  if (!reward || collection.claimed[reward.key] ||
    unlockedForMode(saved,mode)<chapter*10+1) return {valid:false,collection};
  return {
    valid:true,reward,
    collection:{
      ...collection,claimed:{...collection.claimed,[reward.key]:true},
      companion:collection.companion || reward.pet.id
    }
  };
}
export function gardenInventory(collection) {
  const normalized=normalizeCollection(collection),decor=new Map(),pets=new Map();
  const rewards=Object.keys(normalized.claimed).map(k=>{
    const [mode,c]=k.split(":");return chestReward(mode,Number(c));
  }).filter(Boolean);
  for (const item of rewards) {
    decor.set(item.decor.id,item.decor);
    pets.set(item.pet.id,item.pet);
  }
  for(const reward of JIGSAW_GARDEN_DECOR)if(normalized.jigsawPrizes.includes(
    jigsawPrizeKey(reward.scene,reward.size)))decor.set(reward.id,reward);
  for(const item of MEADOW_GARDEN_DECOR)
    if(normalized.meadowPrizes.includes(item.id))decor.set(item.id,item);
  for(const item of PUMPKIN_GARDEN_DECOR)
    if(normalized.pumpkinPrizes.includes(item.id))decor.set(item.id,item);
  for(const item of MOONLIGHT_GARDEN_DECOR)
    if(normalized.moonlightPrizes.includes(item.id))decor.set(item.id,item);
  for(const item of KITCHEN_GARDEN_DECOR)
    if(normalized.kitchenPrizes.includes(item.id))decor.set(item.id,item);
  return {decor:[...decor.values()],pets:[...pets.values()],rewards};
}
export function setGardenVillageSeason(collection,season){
  const current=normalizeCollection(collection);
  const result=changeVillageSeason(current.villageSeason,season);
  return {...result,collection:result.valid?
    {...current,villageSeason:result.season}:current};
}

export function setGardenVillageSky(collection,timeOfDay){
  const current=normalizeCollection(collection);
  const result=changeVillageSky(current.villageAtmosphere,timeOfDay);
  return {...result,collection:result.valid?
    {...current,villageAtmosphere:result.atmosphere}:current};
}
export function toggleGardenVillageGlow(collection,feature){
  const current=normalizeCollection(collection);
  const result=toggleVillageGlow(current.villageAtmosphere,feature);
  return {...result,collection:result.valid?
    {...current,villageAtmosphere:result.atmosphere}:current};
}

export function strollGardenVillage(collection){
  const current=normalizeCollection(collection);
  const result=advanceVillageWalk(current.villageWander);
  return {...result,collection:{...current,villageWander:result.wander}};
}
export function interactGardenVillageLandmark(collection,district){
  const current=normalizeCollection(collection);
  const result=advanceVillageLandmark(current.villageWander,district);
  return {...result,collection:result.valid?
    {...current,villageWander:result.wander}:current};
}

export function playGardenVillageActivity(collection,district,choice){
  const current=normalizeCollection(collection);
  const result=advanceVillageActivity(current.villageLife,district,choice);
  return {...result,collection:result.valid?
    {...current,villageLife:result.life}:current};
}

export function placeGardenVillageDecor(collection,id,plot){
  const current=normalizeCollection(collection);
  const owned=gardenInventory(current).decor.map(item=>item.id);
  const result=placeVillageItem(current.villagePlacements,id,plot,owned,current.hiddenDecorations);
  return {valid:result.valid,collection:result.valid?
    {...current,villagePlacements:result.placements}:current};
}
export function storeGardenVillageDecor(collection,id){
  const current=normalizeCollection(collection);
  const owned=gardenInventory(current).decor.map(item=>item.id);
  const result=storeVillageItem(current.villagePlacements,id,owned);
  return {valid:result.valid,collection:result.valid?
    {...current,villagePlacements:result.placements}:current};
}

export function selectCompanion(collection,petId) {
  const current=normalizeCollection(collection);
  if (petId !== null && !gardenInventory(current).pets.some(p=>p.id===petId)) return current;
  return {...current,companion:petId};
}
export function toggleDecoration(collection,id) {
  const current=normalizeCollection(collection);
  if (!gardenInventory(current).decor.some(d=>d.id===id)) return current;
  return {
    ...current,
    hiddenDecorations:current.hiddenDecorations.includes(id) ?
      current.hiddenDecorations.filter(d=>d!==id) : [...current.hiddenDecorations,id]
  };
}
export function bonusBoard(key) {
  const [mode,chapterText]=String(key).split(":");
  if (!chapterKey(mode,Number(chapterText)) || chapterKey(mode,Number(chapterText))!==key) return null;
  const rng=rngFrom(seedFor("meeklee:bonus:"+key,1));
  const deck=[...BONUS_PIECES,...BONUS_PIECES];
  for (let i=deck.length-1;i>0;i--) {
    const j=Math.floor(rng()*(i+1));
    [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  return deck;
}
export function completeBonus(collection,key,moves) {
  const current=normalizeCollection(collection);
  if (!current.claimed[key] || !bonusBoard(key) ||
    !Number.isSafeInteger(moves) || moves < 8) return {valid:false,collection:current};
  const best=current.completedBonuses[key];
  return {
    valid:true,
    collection:{
      ...current,
      completedBonuses:{...current.completedBonuses,[key]:best===undefined?moves:Math.min(best,moves)}
    }
  };
}

export function recordKitchenReward(collection,previousGame,nextGame){
  const current=normalizeCollection(collection);
  if(nextGame?.mode!=="kitchen"||!nextGame.won||previousGame?.won)return current;
  const prize=kitchenPrizeForLevel(nextGame.level);
  if(!prize||current.kitchenPrizes.includes(prize.id))return current;
  return normalizeCollection({...current,kitchenPrizes:[...current.kitchenPrizes,prize.id]});
}

export function recordMoonlightReward(collection,previousGame,nextGame){
  const current=normalizeCollection(collection);
  if(nextGame?.mode!=="moonlight"||!nextGame.won||previousGame?.won)return current;
  const prize=moonlightPrizeForLevel(nextGame.level);
  if(!prize||current.moonlightPrizes.includes(prize.id))return current;
  return normalizeCollection({...current,moonlightPrizes:[...current.moonlightPrizes,prize.id]});
}

export function recordPumpkinReward(collection,previousGame,nextGame){
  const current=normalizeCollection(collection);
  if(nextGame?.mode!=="pumpkin"||!nextGame.won||previousGame?.won)return current;
  const prize=pumpkinPrizeForLevel(nextGame.level);
  if(!prize||current.pumpkinPrizes.includes(prize.id))return current;
  return normalizeCollection({...current,pumpkinPrizes:[...current.pumpkinPrizes,prize.id]});
}

export function recordMeadowReward(collection,previousGame,nextGame){
  const current=normalizeCollection(collection);
  if(nextGame?.mode!=="meadow"||!nextGame.won||previousGame?.won)return current;
  const prize=meadowPrizeForLevel(nextGame.level);
  if(!prize||current.meadowPrizes.includes(prize.id))return current;
  return normalizeCollection({...current,meadowPrizes:[...current.meadowPrizes,prize.id]});
}

export function recordJigsawGardenReward(collection,previousGame,nextGame){
  const current=normalizeCollection(collection);
  if(nextGame?.kind!=="jigsaw"||!nextGame.won||previousGame?.won)return current;
  const key=jigsawPrizeKey(nextGame.scene,nextGame.size);
  if(!JIGSAW_GARDEN_DECOR.some(d=>jigsawPrizeKey(d.scene,d.size)===key))return current;
  return normalizeCollection({...current,jigsawPrizes:[...current.jigsawPrizes,key]});
}
