// Build an accurate public soundtrack manifest from actual verified MP3 files.
// A source-only PR offers a silent player until all eight binaries are published.
import {createHash} from "node:crypto";
import {readFile,mkdir,writeFile,stat} from "node:fs/promises";
import {join} from "node:path";

const root=process.env.MEEKLEE_AUDIO_DIR||"public/audio";
const source=JSON.parse(await readFile("scripts/original-soundtrack.json","utf8"));
if(source.tracks.length!==8||source.version!==1)
  throw new Error("Expected exactly eight original MeekLee tracks.");

async function isPresent(file){
  try{return (await stat(file)).isFile();}
  catch(error){if(error.code==="ENOENT")return false;throw error;}
}
const paths=source.tracks.map(item=>join(root,item.file));
const present=await Promise.all(paths.map(isPresent));
if(present.some(Boolean)&&!present.every(Boolean))
  throw new Error("A partial bundled soundtrack was detected. Supply all eight verified MP3s.");
const tracks=[];
if(present.every(Boolean)){
  for(const item of source.tracks){
    const bytes=await readFile(join(root,item.file));
    const sha256=createHash("sha256").update(bytes).digest("hex");
    if(bytes.length!==item.size||sha256!==item.sha256)
      throw new Error("Original soundtrack does not match the approved upload: "+item.name);
    tracks.push({slot:item.slot,name:item.name,path:"audio/"+item.file,
      bytes:item.size,sha256:item.sha256});
  }
}
await mkdir(root,{recursive:true});
await writeFile(join(root,"manifest.json"),
  JSON.stringify({version:1,tracks},null,2)+"\n");
console.log(tracks.length===8?
  "Bundled soundtrack: eight verified online MP3s ready to stream on demand.":
  "Bundled soundtrack: no online audio yet; local ZIP import remains available.");
