// Calm, user-controlled Garden Village atmosphere.
// No real-world clock, server access, monetization or changes to earned items.
export const VILLAGE_SKIES=Object.freeze([
  Object.freeze({id:"day",name:"Day",icon:"☀️",description:"Sunny skies for a cheerful village stroll."}),
  Object.freeze({id:"sunset",name:"Sunset",icon:"🌅",description:"Warm evening skies as the village settles down."}),
  Object.freeze({id:"night",name:"Night",icon:"🌙",description:"Moonlight, quiet stars and a peaceful village."})
]);
const VALID_SKIES=new Set(VILLAGE_SKIES.map(item=>item.id));
const DEFAULT_ATMOSPHERE=Object.freeze({
  timeOfDay:"day",
  lanterns:true,
  fireflies:true
});
export function normalizeVillageAtmosphere(raw){
  const value=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};
  return {
    timeOfDay:VALID_SKIES.has(value.timeOfDay)?value.timeOfDay:DEFAULT_ATMOSPHERE.timeOfDay,
    lanterns:typeof value.lanterns==="boolean"?value.lanterns:DEFAULT_ATMOSPHERE.lanterns,
    fireflies:typeof value.fireflies==="boolean"?value.fireflies:DEFAULT_ATMOSPHERE.fireflies
  };
}
export function changeVillageSky(raw,timeOfDay){
  const atmosphere=normalizeVillageAtmosphere(raw);
  if(!VALID_SKIES.has(timeOfDay)||atmosphere.timeOfDay===timeOfDay)
    return {valid:false,atmosphere};
  return {valid:true,atmosphere:{...atmosphere,timeOfDay}};
}
export function toggleVillageGlow(raw,feature){
  const atmosphere=normalizeVillageAtmosphere(raw);
  if(feature!=="lanterns"&&feature!=="fireflies")
    return {valid:false,atmosphere};
  return {valid:true,atmosphere:{...atmosphere,[feature]:!atmosphere[feature]}};
}
export function villageVisibleGlow(raw){
  const atmosphere=normalizeVillageAtmosphere(raw);
  const evening=atmosphere.timeOfDay!=="day";
  return {
    timeOfDay:atmosphere.timeOfDay,
    lanterns:evening&&atmosphere.lanterns,
    fireflies:evening&&atmosphere.fireflies,
    moonlitPond:atmosphere.timeOfDay==="night"
  };
}
