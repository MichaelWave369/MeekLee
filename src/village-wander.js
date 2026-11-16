// Calm, deterministic neighborhood strolls and interactive landmarks.
// No timers, remote services, rewards, pet acquisition or purchases.
import {VILLAGE_DISTRICTS} from "./village.js";

const DISTRICTS=VILLAGE_DISTRICTS.map(item=>item.id);
const DISTRICT_SET=new Set(DISTRICTS);
const MAX_COUNT=1_000_000;
const count=value=>Number.isSafeInteger(value)&&value>=0&&value<=MAX_COUNT?value:0;

export const VILLAGE_LANDMARK_MOMENTS=Object.freeze({
  square:Object.freeze([
    Object.freeze({icon:"💦",message:"A gentle fountain splash sparkles in the sunshine."}),
    Object.freeze({icon:"✨",message:"The fountain catches the light like a handful of stars."}),
    Object.freeze({icon:"⛲",message:"Soft ripples make circles around the village fountain."})
  ]),
  meadow:Object.freeze([
    Object.freeze({icon:"🦋",message:"A butterfly drifts between the garden flowers."}),
    Object.freeze({icon:"🌷",message:"Fresh blossoms brighten the little flower lane."}),
    Object.freeze({icon:"🐝",message:"A friendly bee hums past the butterfly garden."})
  ]),
  orchard:Object.freeze([
    Object.freeze({icon:"🍃",message:"The orchard leaves rustle in a gentle breeze."}),
    Object.freeze({icon:"🍎",message:"An apple catches a warm patch of sunshine."}),
    Object.freeze({icon:"🌳",message:"The trees sway softly above the orchard path."})
  ]),
  pond:Object.freeze([
    Object.freeze({icon:"🌊",message:"The pond shimmers as tiny ripples spread."}),
    Object.freeze({icon:"🦆",message:"A duck paddles slowly around the reeds."}),
    Object.freeze({icon:"🪷",message:"A lily opens beside the quiet pond."})
  ])
});

export function normalizeVillageWander(raw){
  const source=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};
  const scenery=source.scenery&&typeof source.scenery==="object"&&
    !Array.isArray(source.scenery)?source.scenery:{};
  const clean={};
  for(const district of DISTRICTS)clean[district]=count(scenery[district]);
  return {step:count(source.step),scenery:clean};
}
export function villageWalkDistrict(raw){
  const state=normalizeVillageWander(raw);
  return DISTRICTS[state.step%DISTRICTS.length];
}
export function nextVillageWalkDistrict(raw){
  const state=normalizeVillageWander(raw);
  const next=state.step===MAX_COUNT?0:state.step+1;
  return DISTRICTS[next%DISTRICTS.length];
}
export function advanceVillageWalk(raw){
  const current=normalizeVillageWander(raw);
  const step=current.step===MAX_COUNT?0:current.step+1;
  return {valid:true,wander:{...current,step},district:DISTRICTS[step%DISTRICTS.length]};
}
export function currentLandmarkMoment(raw,district){
  if(!DISTRICT_SET.has(district))return null;
  const {scenery}=normalizeVillageWander(raw);
  const visits=scenery[district];
  return visits>0?
    VILLAGE_LANDMARK_MOMENTS[district][(visits-1)%VILLAGE_LANDMARK_MOMENTS[district].length]:
    null;
}
export function advanceVillageLandmark(raw,district){
  const current=normalizeVillageWander(raw);
  if(!DISTRICT_SET.has(district))return {valid:false,wander:current,moment:null};
  const visits=current.scenery[district];
  const moment=VILLAGE_LANDMARK_MOMENTS[district][visits%VILLAGE_LANDMARK_MOMENTS[district].length];
  const scenery={...current.scenery,[district]:visits===MAX_COUNT?1:visits+1};
  return {valid:true,wander:{...current,scenery},moment};
}
// Visitors always come from the *already unlocked* companion collection.
// One or two friends stroll along the route. Their identities stay stable
// during one lap and rotate on the next lap; the chosen companion stays home.
export function villageWalkingParty(unlockedPets,chosenCompanionId,raw){
  const wander=normalizeVillageWander(raw);
  const district=villageWalkDistrict(wander);
  const list=Array.isArray(unlockedPets)?unlockedPets.filter(p=>
    p&&typeof p.id==="string"&&typeof p.icon==="string"&&
    typeof p.name==="string"&&p.id!==chosenCompanionId):[];
  const unique=[...new Map(list.map(p=>[p.id,p])).values()];
  const lap=Math.floor(wander.step/DISTRICTS.length);
  const index=unique.length?lap%unique.length:0;
  const guests=[];
  for(let i=0;i<Math.min(2,unique.length);i++)guests.push(unique[(index+i)%unique.length]);
  return {district,step:wander.step,pets:guests};
}
