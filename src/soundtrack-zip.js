// Import a simple local ZIP of up to eight audio recordings.
// No third-party ZIP service, upload, eval or cross-origin request. Archive
// size and uncompressed payload are bounded to avoid decompression bombs.
import {audioFileCheck,MAX_AUDIO_BYTES,MAX_SOUNDTRACK_TRACKS} from "./soundtrack.js";

export const MAX_SOUNDTRACK_ZIP_BYTES=128*1024*1024;
const MAX_UNPACKED_BYTES=360*1024*1024;
const MAX_ZIP_ENTRIES=48;
const MIME={mp3:"audio/mpeg",wav:"audio/wav",ogg:"audio/ogg",
  m4a:"audio/mp4",aac:"audio/aac",flac:"audio/flac"};
const utf8=new TextDecoder("utf-8");
const CRC_TABLE=Array.from({length:256},(_,i)=>{
  let c=i;
  for(let j=0;j<8;j++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);
  return c>>>0;
});
export function zipAudioCrc32(bytes){
  let crc=0xffffffff;
  for(let i=0;i<bytes.length;i++)
    crc=CRC_TABLE[(crc^bytes[i])&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}

export async function extractSoundtrackZip(file){
  if(!file||typeof file.name!=="string"||!file.name.toLowerCase().endsWith(".zip"))
    throw new Error("Choose a ZIP archive of audio recordings.");
  if(!Number.isFinite(file.size)||file.size<22||file.size>MAX_SOUNDTRACK_ZIP_BYTES)
    throw new Error("The soundtrack ZIP must be between 22 bytes and 128 MB.");
  const bytes=new Uint8Array(await file.arrayBuffer());
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const len=bytes.length;
  const u16=o=>view.getUint16(o,true);
  const u32=o=>view.getUint32(o,true);
  let end=-1;
  for(let i=len-22;i>=Math.max(0,len-65557);i--){
    if(u32(i)===0x06054b50&&i+22+u16(i+20)===len){
      end=i;break;
    }
  }
  if(end<0||u16(end+4)!==0||u16(end+6)!==0||
    u16(end+8)!==u16(end+10))
    throw new Error("This isn't a supported single-file ZIP archive.");
  const entries=u16(end+10),centralSize=u32(end+12),centralStart=u32(end+16);
  if(entries>MAX_ZIP_ENTRIES||centralStart+centralSize>end)
    throw new Error("The ZIP has too many entries or an invalid directory.");
  const result=[];
  let consumed=0,offset=centralStart;
  for(let entry=0;entry<entries;entry++){
    if(offset+46>len||u32(offset)!==0x02014b50)
      throw new Error("The ZIP directory is damaged.");
    const flags=u16(offset+8),method=u16(offset+10);
    const crc=u32(offset+16),packedSize=u32(offset+20),size=u32(offset+24);
    const nameLength=u16(offset+28),extraLength=u16(offset+30),
      commentLength=u16(offset+32),localOffset=u32(offset+42);
    const next=offset+46+nameLength+extraLength+commentLength;
    if(next>len||next>centralStart+centralSize)
      throw new Error("The ZIP entry names are damaged.");
    const name=utf8.decode(bytes.subarray(offset+46,offset+46+nameLength));
    offset=next;
    if(name.endsWith("/")||name.startsWith("__MACOSX/")||
      name.startsWith(".")||name.includes("/")||name.includes("\\"))
      continue;
    // Ignore README files, but never try to execute anything.
    const ext=name.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
    if(!Object.hasOwn(MIME,ext||""))continue;
    if(flags&1)throw new Error("Password-protected ZIPs aren't supported.");
    if(method!==0&&method!==8)
      throw new Error("This ZIP uses an unsupported compression method.");
    if(size<1||size>MAX_AUDIO_BYTES||packedSize>MAX_SOUNDTRACK_ZIP_BYTES||
      consumed+size>MAX_UNPACKED_BYTES)
      throw new Error("One or more audio tracks exceed the ZIP safety limits.");
    if(result.length>=MAX_SOUNDTRACK_TRACKS)
      throw new Error("The Music Box accepts eight audio files at most.");
    if(localOffset+30>len||u32(localOffset)!==0x04034b50)
      throw new Error("The ZIP audio entry is damaged.");
    const payload=localOffset+30+u16(localOffset+26)+u16(localOffset+28);
    if(payload+packedSize>len)
      throw new Error("The ZIP audio data is incomplete.");
    const packed=bytes.subarray(payload,payload+packedSize);
    let data;
    if(method===0){
      data=packed;
    }else{
      if(typeof DecompressionStream!=="function")
        throw new Error("This browser can't open ZIPs directly. Unzip the archive and import the MP3 files instead.");
      try{
        const expanded=new Blob([packed]).stream()
          .pipeThrough(new DecompressionStream("deflate-raw"));
        data=new Uint8Array(await new Response(expanded).arrayBuffer());
      }catch{
        throw new Error("This browser couldn't decompress the audio ZIP. Try extracting the MP3 files first.");
      }
    }
    if(data.length!==size||zipAudioCrc32(data)!==crc)
      throw new Error("An audio track failed the ZIP integrity check.");
    const audio=new File([data],name,{type:MIME[ext]});
    const reason=audioFileCheck(audio);
    if(reason)throw new Error(name+": "+reason);
    consumed+=size;
    result.push(audio);
  }
  if(!result.length)
    throw new Error("No MP3, WAV, OGG, M4A, AAC or FLAC files were found in that ZIP.");
  return result;
}
