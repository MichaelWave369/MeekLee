// Gentle, fully local Village activities. These are optional, untimed games.
// Nothing here awards or revokes a chest, pet, ornament, level or paid currency.
import {VILLAGE_DISTRICTS} from "./village.js";

export const VILLAGE_ACTIVITIES=Object.freeze({
  square:Object.freeze({
    name:"Fountain Ripples",icon:"⛲",intro:"Make three ripples in the fountain.",
    options:Object.freeze([
      Object.freeze({icon:"💧",name:"Water Drop"}),
      Object.freeze({icon:"✨",name:"Fountain Sparkle"}),
      Object.freeze({icon:"🫧",name:"Bubbly Ripple"})
    ]),
    order:Object.freeze([0,2,1]),
    cheers:"The fountain dances with happy ripples!"
  }),
  meadow:Object.freeze({
    name:"Butterfly Watch",icon:"🦋",intro:"Find three little garden visitors.",
    options:Object.freeze([
      Object.freeze({icon:"🦋",name:"Butterfly"}),
      Object.freeze({icon:"🐞",name:"Ladybug"}),
      Object.freeze({icon:"🐝",name:"Friendly Bee"})
    ]),
    order:Object.freeze([0,1,2]),
    cheers:"The meadow visitors wave their tiny wings!"
  }),
  orchard:Object.freeze({
    name:"Fruit Basket",icon:"🧺",intro:"Pick three fruits for a pretend picnic basket.",
    options:Object.freeze([
      Object.freeze({icon:"🍎",name:"Apple"}),
      Object.freeze({icon:"🍐",name:"Pear"}),
      Object.freeze({icon:"🍒",name:"Cherries"})
    ]),
    order:Object.freeze([0,2,1]),
    cheers:"Your picnic basket is ready for a cozy afternoon!"
  }),
  pond:Object.freeze({
    name:"Duck Parade",icon:"🦆",intro:"Spot the three pond friends in their parade.",
    options:Object.freeze([
      Object.freeze({icon:"🦆",name:"Duck"}),
      Object.freeze({icon:"🐤",name:"Duckling"}),
      Object.freeze({icon:"🪿",name:"Goose"})
    ]),
    order:Object.freeze([1,0,2]),
    cheers:"The duck parade makes a perfect little circle!"
  })
});
const DISTRICTS=VILLAGE_DISTRICTS.map(item=>item.id);
const MAX_ROUNDS=1000000;
const cleanRound=v=>Number.isSafeInteger(v)&&v>=0&&v<=MAX_ROUNDS?v:0;
const cleanStep=v=>Number.isInteger(v)&&v>=0&&v<3?v:0;

// The shape is stable across old saves, and malformed/unknown keys are dropped.
export function normalizeVillageLife(raw){
  const source=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};
  const out={};
  for(const district of DISTRICTS){
    const entry=source[district];
    out[district]={
      rounds:cleanRound(entry?.rounds),
      step:cleanStep(entry?.step)
    };
  }
  return out;
}
export function villageActivityTarget(life,district){
  const activity=VILLAGE_ACTIVITIES[district];
  if(!activity)return null;
  const {rounds,step}=normalizeVillageLife(life)[district];
  return activity.order[(step+rounds)%activity.order.length];
}
export function advanceVillageActivity(raw,district,choice){
  const life=normalizeVillageLife(raw);
  const activity=VILLAGE_ACTIVITIES[district];
  if(!activity||!Number.isInteger(choice)||
    choice<0||choice>=activity.options.length){
    return {valid:false,completed:false,life,message:"Choose a neighborhood activity first."};
  }
  const target=villageActivityTarget(life,district);
  if(choice!==target){
    return {valid:false,completed:false,life,
      message:"Try the "+activity.options[target].name+". No worries, nothing was lost!"};
  }
  const previous=life[district];
  const completed=previous.step===activity.order.length-1;
  const rounds=completed?Math.min(previous.rounds+1,MAX_ROUNDS):previous.rounds;
  const step=completed?0:previous.step+1;
  return {
    valid:true,completed,
    life:{...life,[district]:{rounds,step}},
    message:completed?activity.cheers:
      "Lovely! "+(step+1)+" of "+activity.order.length+" little steps is next."
  };
}

// A visitor must be an actually unlocked rescued pet. They do not alter Mom's
// selected companion or grant new pets. Rotate gently after finished activities.
export function villageVisitingPets(pets,companionId,district,rawLife){
  if(!VILLAGE_ACTIVITIES[district]||!Array.isArray(pets))return [];
  const eligible=pets.filter(p=>p&&typeof p.id==="string"&&p.id!==companionId&&
    typeof p.name==="string"&&typeof p.icon==="string");
  if(!eligible.length)return [];
  const seen=new Set();
  const guests=[];
  const life=normalizeVillageLife(rawLife);
  const districtIndex=DISTRICTS.indexOf(district);
  const start=(life[district].rounds+districtIndex)%eligible.length;
  for(let offset=0;offset<eligible.length&&guests.length<2;offset++){
    const pet=eligible[(start+offset)%eligible.length];
    if(!seen.has(pet.id)){seen.add(pet.id);guests.push(pet);}
  }
  return guests;
}
