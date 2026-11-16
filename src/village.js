// Garden Village: offline and accessible placement rules for owned treasures.
// The original Garden and its visible/hidden switches are not replaced.
export const VILLAGE_COLS=5;
export const VILLAGE_ROWS=4;
export const VILLAGE_PLOTS=VILLAGE_COLS*VILLAGE_ROWS;
export const VILLAGE_DISTRICTS=Object.freeze([
  Object.freeze({id:"square",name:"Village Square",icon:"🏡",
    description:"A cozy meeting place around the village fountain.",
    landmark:"⛲",landmarkName:"Village Fountain"}),
  Object.freeze({id:"meadow",name:"Flower Lane",icon:"🌷",
    description:"Sunny paths for blossoms, butterflies and cheerful treasures.",
    landmark:"🦋",landmarkName:"Butterfly Garden"}),
  Object.freeze({id:"orchard",name:"Orchard Hill",icon:"🍎",
    description:"A gentle hillside for fruit trees and harvest decorations.",
    landmark:"🌳",landmarkName:"Orchard Tree"}),
  Object.freeze({id:"pond",name:"Pondside Walk",icon:"🪷",
    description:"A peaceful spot for lanterns, benches and waterside memories.",
    landmark:"🦆",landmarkName:"Duck Pond"})
]);
const DISTRICTS=new Set(VILLAGE_DISTRICTS.map(d=>d.id));
export const VILLAGE_CAPACITY=VILLAGE_PLOTS*VILLAGE_DISTRICTS.length;
export function villagePlotId(district,index){
  return DISTRICTS.has(district)&&Number.isInteger(index)&&
    index>=0&&index<VILLAGE_PLOTS?district+":"+index:null;
}
export function validVillagePlot(plot){
  if(typeof plot!=="string")return false;
  const [district,index,...rest]=plot.split(":");
  return rest.length===0&&/^(0|[1-9]\d*)$/.test(index||"")&&
    villagePlotId(district,Number(index))===plot;
}
export function normalizeVillagePlacements(raw,owned=[]){
  if(!raw||typeof raw!=="object"||Array.isArray(raw))return {};
  const eligible=new Set(owned),used=new Set(),out={};
  // Only saved *owned* IDs with unique real plots survive import.
  for(const [id,plot] of Object.entries(raw)){
    if(!eligible.has(id)||!validVillagePlot(plot)||used.has(plot))continue;
    out[id]=plot;
    used.add(plot);
    if(used.size===VILLAGE_CAPACITY)break;
  }
  return out;
}
export function placeVillageItem(placements,id,plot,owned=[],hidden=[]){
  const clean=normalizeVillagePlacements(placements,owned);
  if(!owned.includes(id)||hidden.includes(id)||!validVillagePlot(plot)||
    Object.entries(clean).some(([other,spot])=>other!==id&&spot===plot))
    return {valid:false,placements:clean};
  if(clean[id]===plot)return {valid:false,placements:clean};
  return {valid:true,placements:{...clean,[id]:plot}};
}
export function storeVillageItem(placements,id,owned=[]){
  const clean=normalizeVillagePlacements(placements,owned);
  if(!Object.hasOwn(clean,id))return {valid:false,placements:clean};
  const rest={...clean};delete rest[id];
  return {valid:true,placements:rest};
}
