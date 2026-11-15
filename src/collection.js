// Completely free, offline collectible garden and chapter chests for Mom.
// Every reward is deterministic, once-only per ten-level world chapter.
import { seedFor, rngFrom } from "./core.js";

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
  const hiddenDecorations=Array.isArray(previous.hiddenDecorations) ?
    [...new Set(previous.hiddenDecorations.filter(id=>typeof id==="string" && decorIds.has(id)))]:[];
  const companion=petIds.has(previous.companion) ? previous.companion : null;
  return {claimed,completedBonuses,hiddenDecorations,companion};
}
export function unlockedForMode(saved,mode) {
  if (!CHEST_WORLDS.includes(mode)) return 1;
  const classic=mode==="bubbles" ? saved?.shooterProgress?.[mode] : saved?.progress?.[mode];
  const easy=mode==="bubbles" ? saved?.easyShooterProgress?.[mode] : saved?.easyProgress?.[mode];
  const valid=v=>Number.isSafeInteger(v) && v>0 ? v : 1;
  return Math.max(valid(classic),valid(easy));
}
export function availableChests(saved) {
  const claimed=normalizeCollection(saved?.collection).claimed, result=[];
  for (const mode of CHEST_WORLDS) {
    const chapters=Math.min(200,Math.floor((unlockedForMode(saved,mode)-1)/10));
    for (let chapter=1;chapter<=chapters;chapter++) {
      const reward=chestReward(mode,chapter);
      if (!claimed[reward.key]) result.push(reward);
    }
  }
  return result;
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
  return {decor:[...decor.values()],pets:[...pets.values()],rewards};
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
