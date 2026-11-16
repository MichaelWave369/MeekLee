// Eight optional soundtrack slots, one named for each existing puzzle world.
// All audio files remain in the user's browser. This is not an upload service.
export const SOUNDTRACK_SLOTS=Object.freeze([
  Object.freeze({id:"harvest",name:"Harvest Valley",icon:"🌻"}),
  Object.freeze({id:"sweets",name:"Sugar Mountain",icon:"🍬"}),
  Object.freeze({id:"rescue",name:"Critter Rescue",icon:"🐾"}),
  Object.freeze({id:"bubbles",name:"Bubble Lagoon",icon:"🫧"}),
  Object.freeze({id:"meadow",name:"Flower Meadow",icon:"🌷"}),
  Object.freeze({id:"pumpkin",name:"Pumpkin Patch",icon:"🎃"}),
  Object.freeze({id:"moonlight",name:"Moonlight Orchard",icon:"🌙"}),
  Object.freeze({id:"kitchen",name:"Grandma's Kitchen",icon:"🥣"})
]);
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
