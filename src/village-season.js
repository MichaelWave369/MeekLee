// A manually selected season for Garden Village, separate from Day/Sunset/Night.
// Seasons change scenery only. They do not unlock or remove garden prizes.
export const VILLAGE_SEASONS=Object.freeze([
  Object.freeze({id:"spring",name:"Spring",icon:"🌸",description:"Blossoms, bees and fresh flowers."}),
  Object.freeze({id:"summer",name:"Summer",icon:"☀️",description:"The familiar sunny green village."}),
  Object.freeze({id:"autumn",name:"Autumn",icon:"🍂",description:"Warm leaves and harvest colors."}),
  Object.freeze({id:"winter",name:"Winter",icon:"❄️",description:"Snowy paths and quiet evergreens."})
]);
const VALID=new Set(VILLAGE_SEASONS.map(s=>s.id));
export const VILLAGE_SEASON_DECOR=Object.freeze({
  spring:Object.freeze(["🌸","🌷","🌼","🦋","🌸"]),
  summer:Object.freeze(["🌿","🌻","🌳","🌼","🌿"]),
  autumn:Object.freeze(["🍁","🍂","🍁","🌾","🍂"]),
  winter:Object.freeze(["❄️","🌲","❄️","⛄","❄️"])
});
export function normalizeVillageSeason(raw){
  return VALID.has(raw)?raw:"summer";
}
export function changeVillageSeason(current,season){
  const previous=normalizeVillageSeason(current);
  return VALID.has(season)&&previous!==season?
    {valid:true,season}:{valid:false,season:previous};
}
export function seasonalVillageDescription(raw,district){
  const season=normalizeVillageSeason(raw);
  if(district==="pond"&&season==="winter")
    return "The pond is calm and frosty, with snowy reeds along its shore.";
  if(district==="orchard"&&season==="autumn")
    return "Golden autumn leaves gather around the fruit trees.";
  if(district==="meadow"&&season==="spring")
    return "Fresh flowers bloom along Butterfly Garden.";
  const seasonal={
    spring:"A soft spring day fills the village with blossoms.",
    summer:"The familiar sunny village shines with green leaves.",
    autumn:"Copper and golden leaves decorate the paths.",
    winter:"Snowy rooftops and evergreens make everything cozy."
  };
  return seasonal[season];
}
