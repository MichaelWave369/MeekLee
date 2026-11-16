// Only recognize the eight published original MeekLee MP3s on this game's
// own origin. Manifest is generated from SHA-256 verified audio at build time.
import {MEEKLEE_ORIGINAL_TRACKS} from "./soundtrack.js";
export const BUNDLED_AUDIO_FILES=Object.freeze([
  "01-harvest-valley.mp3",
  "02-sugar-mountain.mp3",
  "03-critter-parade.mp3",
  "04-bubble-lagoon.mp3",
  "05-pips-garden.mp3",
  "06-family-rook.mp3",
  "07-solitaire-sunday.mp3",
  "08-main-theme.mp3"
]);
export function parseBundledSoundtrack(payload,base="/MeekLee/"){
  const incoming=payload?.tracks;
  if(payload?.version!==1||!Array.isArray(incoming)||incoming.length!==8)return [];
  if(typeof base!=="string"||!base.startsWith("/")||!base.endsWith("/"))return [];
  const result=Array(8).fill(null);
  for(const item of incoming){
    const slot=item?.slot;
    if(!Number.isInteger(slot)||slot<0||slot>=8||result[slot]||
      item.name!==MEEKLEE_ORIGINAL_TRACKS[slot]||
      item.path!=="audio/"+BUNDLED_AUDIO_FILES[slot]||
      typeof item.bytes!=="number"||item.bytes<=0||
      typeof item.sha256!=="string"||!/^[a-f0-9]{64}$/.test(item.sha256))
      return [];
    result[slot]={
      slot,name:item.name,url:base+item.path,bundled:true
    };
  }
  return result.every(Boolean)?result:[];
}

/**
 * Use a fresh same-origin request on each soundtrack check.
 * Older phone service workers pre-cached a zero-track manifest at the exact
 * unversioned URL; a new query parameter avoids that cache-first match.
 * HTTP cache:no-store cannot by itself bypass an older SW's cache-first fetch.
 */
export function soundtrackManifestUrl(base="/MeekLee/",nonce=Date.now()){
  if(typeof base!=="string"||!/^\/[a-zA-Z0-9/_-]*\/$/.test(base))
    return null;
  return base+"audio/manifest.json?refresh="+encodeURIComponent(String(nonce));
}
