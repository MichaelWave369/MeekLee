// Eight optional soundtrack slots from the creator's MeekLeeAdventures.zip.
// Four songs are puzzle-world themes; four cover the welcome, garden and cards.
// Keep slot indices 0-7 stable so earlier offline IndexedDB imports survive.
export const SOUNDTRACK_SLOTS=Object.freeze([
  Object.freeze({id:"harvest",name:"Harvest Valley",icon:"🌻"}),
  Object.freeze({id:"sweets",name:"Sugar Mountain",icon:"🍬"}),
  Object.freeze({id:"rescue",name:"Critter Rescue",icon:"🐾"}),
  Object.freeze({id:"bubbles",name:"Bubble Lagoon",icon:"🫧"}),
  Object.freeze({id:"garden",name:"Pip's Little Garden",icon:"🌷"}),
  Object.freeze({id:"rook",name:"The Family Rook Table",icon:"🃏"}),
  Object.freeze({id:"solitaire",name:"Solitaire Sunday",icon:"♠️"}),
  Object.freeze({id:"welcome",name:"Main Theme · The Welcome",icon:"🎶"})
]);
// Exact original audio filenames from the supplied ZIP, not fabricated songs.
export const MEEKLEE_ORIGINAL_TRACKS=Object.freeze([
  "Morning in Harvest Valley A.mp3",
  "Sugar Mountain Shuffle A.mp3",
  "Little Critter Parade A.mp3",
  "Bubbles in the Blue A.mp3",
  "Pip's Little Garden A.mp3",
  "The Family Rook Table A.mp3",
  "Solitaire Sunday A.mp3",
  "Main Theme A · The Welcome.mp3"
]);
export function meekleeTrackSlot(name){
  if(typeof name!=="string")return null;
  const value=name.normalize("NFKC").toLowerCase().trim();
  const match=MEEKLEE_ORIGINAL_TRACKS.findIndex(
    title=>title.normalize("NFKC").toLowerCase()===value);
  return match>=0?match:null;
}
export function assignMeekLeeSlots(files){
  if(!Array.isArray(files))return [];
  const seen=new Set();
  const result=[];
  for(const file of files){
    const preferred=meekleeTrackSlot(file?.name);
    let slot=preferred!==null&&!seen.has(preferred)?preferred:null;
    if(slot===null)slot=SOUNDTRACK_SLOTS.findIndex((_,i)=>!seen.has(i));
    if(slot<0)break;
    seen.add(slot);
    result.push({file,slot});
  }
  return result;
}
export const MAX_SOUNDTRACK_TRACKS=SOUNDTRACK_SLOTS.length;
export const MAX_AUDIO_BYTES=60*1024*1024;
export const AUDIO_EXTENSIONS=Object.freeze(["mp3","wav","ogg","m4a","aac","flac"]);
const EXTENSION_PATTERN=/\.([a-z0-9]+)$/i;
const MIDI_OR_PLAYLIST=/\.(?:mid|midi|m3u|pls|exe|html|js|svg)$/i;
export function audioFileCheck(file){
  if(!file||typeof file.name!=="string"||typeof file.size!=="number"||
    file.size<=0||!Number.isFinite(file.size))return "Choose a real audio file.";
  if(file.size>MAX_AUDIO_BYTES)return "That audio file is too large (60 MB maximum per track).";
  if(MIDI_OR_PLAYLIST.test(file.name))return "Choose an audio recording, not a playlist or program.";
  const extension=file.name.match(EXTENSION_PATTERN)?.[1]?.toLowerCase();
  if(!AUDIO_EXTENSIONS.includes(extension))
    return "Choose MP3, WAV, OGG, M4A, AAC or FLAC audio.";
  if(typeof file.type==="string"&&file.type&&
    !file.type.startsWith("audio/")&&file.type!=="application/ogg"&&
    file.type!=="application/octet-stream")
    return "That file isn't recognized as audio.";
  return null;
}
export function soundtrackSlotIndex(index){
  return Number.isInteger(index)&&index>=0&&index<MAX_SOUNDTRACK_TRACKS?index:null;
}
export function soundtrackDisplayName(name){
  if(typeof name!=="string")return "Untitled track";
  const title=name.replace(/\.[a-z0-9]{2,5}$/i,"").replace(/[_-]+/g," ").trim();
  return title.slice(0,110)||"Untitled track";
}
