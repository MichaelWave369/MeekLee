// Browser-only local soundtrack storage. Audio never leaves this device.
// Separate IndexedDB from the original puzzle save and private Family Porch.
import {audioFileCheck,soundtrackSlotIndex,MAX_SOUNDTRACK_TRACKS} from "./soundtrack.js";

export const SOUNDTRACK_DB="meeklee-local-soundtrack-v1";
export const SOUNDTRACK_STORE="tracks";
function openDatabase(){
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==="undefined"){
      reject(new Error("This browser does not support local audio storage."));return;
    }
    const request=indexedDB.open(SOUNDTRACK_DB,1);
    request.onupgradeneeded=()=>{
      if(!request.result.objectStoreNames.contains(SOUNDTRACK_STORE))
        request.result.createObjectStore(SOUNDTRACK_STORE,{keyPath:"slot"});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error("Cannot open local audio library."));
    request.onblocked=()=>reject(new Error("Audio library is open in another tab. Close it and retry."));
  });
}
function requestStore(mode,operation){
  return openDatabase().then(db=>new Promise((resolve,reject)=>{
    let result,done=false;
    try{
      const transaction=db.transaction(SOUNDTRACK_STORE,mode);
      const store=transaction.objectStore(SOUNDTRACK_STORE);
      const request=operation(store);
      request.onsuccess=()=>{result=request.result;};
      request.onerror=()=>{ /* Transaction error handler supplies the failure. */ };
      transaction.oncomplete=()=>{
        if(!done){done=true;db.close();resolve(result);}
      };
      transaction.onerror=()=>{
        if(!done){done=true;db.close();reject(transaction.error||new Error("Local audio storage failed."));}
      };
      transaction.onabort=()=>{
        if(!done){done=true;db.close();reject(transaction.error||new Error("Local audio save was interrupted."));}
      };
    }catch(error){db.close();reject(error);}
  }));
}
export async function loadSoundtrack(){
  const records=await requestStore("readonly",store=>store.getAll());
  const slots=Array(MAX_SOUNDTRACK_TRACKS).fill(null);
  for(const record of records||[]){
    const slot=soundtrackSlotIndex(record?.slot);
    if(slot===null||!record.blob||typeof record.name!=="string")continue;
    if(audioFileCheck({name:record.name,size:record.blob.size,
      type:record.blob.type}))continue;
    slots[slot]={slot,name:record.name,blob:record.blob};
  }
  return slots;
}
export async function saveSoundtrackTrack(slot,file){
  if(soundtrackSlotIndex(slot)===null)throw new Error("Choose one of eight soundtrack slots.");
  const error=audioFileCheck(file);
  if(error)throw new Error(error);
  // Structured-cloned Blob is durable across browser reloads when storage
  // permission/quota allows it. Never encode audio in localStorage.
  const record={slot,name:file.name,blob:file};
  await requestStore("readwrite",store=>store.put(record));
  return record;
}
export async function removeSoundtrackTrack(slot){
  if(soundtrackSlotIndex(slot)===null)throw new Error("Invalid soundtrack slot.");
  await requestStore("readwrite",store=>store.delete(slot));
}
