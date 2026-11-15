// MeekLee picture puzzles: swap image pieces into place.
// No downloaded/user-uploaded photos: curated original SVG pictures in /jigsaws.
import {shuffleCards} from "./solitaire.js";
export const JIGSAW_SCENES=Object.freeze([
  {id:"harvest",name:"Sunny Harvest Valley",icon:"🌻",description:"Sunflowers, farmhouses and lovely vegetables."},
  {id:"pip",name:"Pip's Happy Garden",icon:"🐰",description:"A happy bunny among the flowers."},
  {id:"lagoon",name:"Bubbly Blue Lagoon",icon:"🫧",description:"Fish, flowers, shells and soft blue waves."}
]);
export const JIGSAW_SIZES=[3,4,5];
function shuffledPieces(seed,size){
  const tiles=shuffleCards(Array.from({length:size*size},(_,i)=>i),seed);
  // Ensure the opening board needs solving.
  if(tiles.every((v,i)=>v===i)) [tiles[0],tiles[1]]=[tiles[1],tiles[0]];
  return tiles;
}
export function newJigsaw(seed=Date.now(),scene="harvest",size=3){
  if(!JIGSAW_SIZES.includes(size))size=3;
  if(!JIGSAW_SCENES.some(s=>s.id===scene))scene="harvest";
  return {kind:"jigsaw",seed,scene,size,tiles:shuffledPieces(seed,size),
    moves:0,won:false};
}
export function validJigsaw(g){
  return g?.kind==="jigsaw"&&JIGSAW_SIZES.includes(g.size)&&
    JIGSAW_SCENES.some(s=>s.id===g.scene)&&Array.isArray(g.tiles)&&
    g.tiles.length===g.size*g.size&&new Set(g.tiles).size===g.tiles.length&&
    g.tiles.every(i=>Number.isInteger(i)&&i>=0&&i<g.tiles.length)&&
    Number.isSafeInteger(g.moves)&&g.moves>=0&&typeof g.won==="boolean";
}
export function swapJigsaw(g,from,to){
  if(!validJigsaw(g)||g.won||!Number.isInteger(from)||!Number.isInteger(to)||
     from<0||to<0||from>=g.tiles.length||to>=g.tiles.length||from===to)
    return {valid:false,game:g};
  const tiles=[...g.tiles];[tiles[from],tiles[to]]=[tiles[to],tiles[from]];
  return {valid:true,game:{...g,tiles,moves:g.moves+1,
    won:tiles.every((v,i)=>v===i)}};
}
export function correctJigsawPieces(g){
  return g.tiles.reduce((sum,v,i)=>sum+(v===i?1:0),0);
}
