import {useEffect,useRef,useState} from "react";
import {
  SOUNDTRACK_SLOTS,MAX_SOUNDTRACK_TRACKS,audioFileCheck,
  soundtrackDisplayName,assignMeekLeeSlots,meekleeTrackSlot
} from "./soundtrack.js";
import {
  loadSoundtrack,saveSoundtrackTrack,removeSoundtrackTrack
} from "./soundtrack-storage.js";
import {extractSoundtrackZip} from "./soundtrack-zip.js";
import {parseBundledSoundtrack} from "./bundled-soundtrack.js";
import "./soundtrack.css";

export default function SoundtrackPlayer(){
  const [tracks,setTracks]=useState(()=>Array(MAX_SOUNDTRACK_TRACKS).fill(null));
  const [onlineTracks,setOnlineTracks]=useState(()=>Array(MAX_SOUNDTRACK_TRACKS).fill(null));
  const [continuous,setContinuous]=useState(true);
  const [ready,setReady]=useState(false);
  const [status,setStatus]=useState("Reading the local soundtrack shelf...");
  const [selected,setSelected]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [volume,setVolume]=useState(.45);
  const audioRef=useRef(null),urlRef=useRef(null);
  const bulkRef=useRef(null),singleRef=useRef(null),replaceRef=useRef(0);
  const [unpackingZip,setUnpackingZip]=useState(false);
  const importBusyRef=useRef(false);

  // The public manifest is tiny. MP3 bytes are never fetched until the
  // listener deliberately presses Play (audio has preload="none").
  useEffect(()=>{
    let active=true;
    fetch(import.meta.env.BASE_URL+"audio/manifest.json")
      .then(r=>r.ok?r.json():null)
      .then(data=>{
        if(!active)return;
        const files=parseBundledSoundtrack(data,import.meta.env.BASE_URL);
        if(files.length===8){
          setOnlineTracks(files);
          setStatus("Eight original songs included! Tap Play to listen.");
        }
      }).catch(()=>{/* Offline without a cached manifest: private imports still work. */});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{
    if(onlineTracks[7]&&!tracks.some(Boolean)&&!playing)setSelected(7);
  },[onlineTracks,tracks]);

  useEffect(()=>{
    let active=true;
    loadSoundtrack().then(items=>{
      if(!active)return;
      setTracks(items);
      if(items.some(Boolean))setStatus("Your saved songs are ready. Tap Play whenever you like.");
      else if(!onlineTracks.some(Boolean))
        setStatus("Your soundtrack shelf is empty. Import your own eight audio files to fill it.");
    }).catch(error=>{
      if(active)setStatus("Local audio library unavailable: "+error.message+
        " You can still try importing tracks for this visit.");
    }).finally(()=>{if(active)setReady(true);});
    return()=>{active=false;};
  },[]);
  useEffect(()=>()=>{ // App unmount, never leave a background audio element alive.
    audioRef.current?.pause();
    if(urlRef.current)URL.revokeObjectURL(urlRef.current);
    urlRef.current=null;
  },[]);

  function stopCurrent(){
    if(audioRef.current){
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
    if(urlRef.current){URL.revokeObjectURL(urlRef.current);urlRef.current=null;}
    setPlaying(false);
  }
  async function playSlot(index){
    const track=tracks[index]||onlineTracks[index];
    if(!track){setStatus("Add a recording to this slot before playing.");return;}
    const audio=audioRef.current;
    if(!audio)return;
    stopCurrent();
    const url=track.bundled?track.url:URL.createObjectURL(track.blob);
    urlRef.current=track.bundled?null:url;
    audio.src=url;
    audio.volume=volume;
    audio.load();
    setSelected(index);
    try{
      await audio.play();
      setPlaying(true);
      setStatus("Now playing: "+soundtrackDisplayName(track.name)+".");
    }catch(error){
      setPlaying(false);
      setStatus("This recording could not play in this browser. Try MP3 or WAV.");
    }
  }
  async function resumeOrPause(){
    const audio=audioRef.current;
    if(!audio)return;
    if(playing&&!audio.paused){
      audio.pause();setPlaying(false);return;
    }
    if(urlRef.current&&audio.src){
      try{await audio.play();setPlaying(true);}
      catch{setStatus("Press Play again, or choose a compatible MP3 or WAV file.");}
    }else await playSlot(selected);
  }
  function nextOrPrevious(direction){
    const next=Array.from({length:MAX_SOUNDTRACK_TRACKS},(_,i)=>
      (selected+direction*(i+1)+MAX_SOUNDTRACK_TRACKS*2)%MAX_SOUNDTRACK_TRACKS)
      .find(index=>tracks[index]||onlineTracks[index]);
    if(next===undefined){setStatus("Import a recording first.");return;}
    void playSlot(next);
  }
  async function importFiles(list,mode){
    if(!ready||importBusyRef.current)return;
    importBusyRef.current=true;
    try{
      const picked=Array.from(list||[]);
      if(!picked.length)return;
      const items=mode==="single"?picked.slice(0,1):picked.slice(0,MAX_SOUNDTRACK_TRACKS);
      const assignments=mode==="zip"?assignMeekLeeSlots(items):
        items.map((file,i)=>({file,slot:mode==="single"?replaceRef.current:i}));
      const changed=[...tracks];
      let imported=0,notSaved=0;
      let lastError="";
      for(const {file,slot:index} of assignments){
        const validation=audioFileCheck(file);
        if(validation){lastError=file.name+": "+validation;continue;}
        if(index===selected&&urlRef.current)stopCurrent();
        changed[index]={slot:index,name:file.name,blob:file};
        try{await saveSoundtrackTrack(index,file);}
        catch(error){notSaved++;lastError=error.message;}
        imported++;
      }
      setTracks(changed);
      if(imported&&mode==="zip"&&assignments.some(
        ({file,slot})=>slot===7&&meekleeTrackSlot(file.name)===7))
        setSelected(7); // Original Welcome theme is ready under the big Play button.
      if(imported){
        setStatus(imported+" recording"+(imported===1?"":"s")+" ready to play."+
          (notSaved?" "+notSaved+" could not be saved for offline reload.":" Saved locally for offline visits.")+
          (lastError?" "+lastError:""));
      }else if(lastError)setStatus(lastError);
      if(picked.length>MAX_SOUNDTRACK_TRACKS&&mode==="bulk")
        setStatus("The jukebox has eight slots. Only the first eight files were considered.");
    }finally{importBusyRef.current=false;}
  }
  async function importZip(file){
    if(!ready||importBusyRef.current||!file)return;
    importBusyRef.current=true;
    setUnpackingZip(true);
    setStatus("Checking your ZIP and unpacking the local audio tracks...");
    try{
      const audio=await extractSoundtrackZip(file);
      // importFiles owns the same exclusive import lock during IndexedDB saves.
      importBusyRef.current=false;
      await importFiles(audio,"zip");
    }catch(error){
      setStatus("Could not import that ZIP: "+error.message);
    }finally{
      importBusyRef.current=false;
      setUnpackingZip(false);
    }
  }
  async function removeTrack(index){
    if(!tracks[index])return;
    if(selected===index)stopCurrent();
    try{
      await removeSoundtrackTrack(index);
      setTracks(previous=>previous.map((item,i)=>i===index?null:item));
      setStatus(onlineTracks[index]?
        "Your local copy was removed. The built-in original is still ready to play.":
        "Removed the local soundtrack copy. No game progress was changed.");
    }catch(error){
      setStatus("Unable to remove this local audio track: "+error.message);
    }
  }
  const library=tracks.map((item,i)=>item||onlineTracks[i]);
  const available=library.filter(Boolean).length;
  const onlineCount=onlineTracks.filter(Boolean).length;
  const current=library[selected];
  return <section className="meeklee-soundtrack" data-soundtrack-player
    aria-label="MeekLee eight-track jukebox">
    <audio ref={audioRef} preload="none" data-soundtrack-audio
      onEnded={()=>{
        setPlaying(false);
        if(continuous&&available>1)nextOrPrevious(1);
        else setStatus("Track finished. Press Play when you'd like another.");
      }}
      onError={()=>{if(audioRef.current?.currentSrc){
        setPlaying(false);
        setStatus("This song couldn't load. Check your connection or choose another track.");
      }}}/>
    <div className="soundtrack-mini">
      <div className="soundtrack-now">
        <span aria-hidden="true">🎵</span>
        <div><strong>MeekLee Music Box</strong>
          <small>{playing?"♫ Playing: "+soundtrackDisplayName(current?.name):
            current?"Ready: "+soundtrackDisplayName(current.name):
            onlineCount===8?"Eight songs included. Just press Play!":
            "Eight cozy music slots. Your own tracks, played locally."}</small></div>
      </div>
      <div className="soundtrack-transport" aria-label="Music playback controls">
        <button type="button" data-soundtrack-prev onClick={()=>nextOrPrevious(-1)}
          disabled={!available} aria-label="Previous loaded track">◀◀</button>
        <button type="button" data-soundtrack-toggle
          onClick={()=>void resumeOrPause()} disabled={!available}
          aria-label={playing?"Pause soundtrack":"Play soundtrack"}>
          {playing?"⏸ Pause":"▶ Play"}
        </button>
        <button type="button" data-soundtrack-next onClick={()=>nextOrPrevious(1)}
          disabled={!available} aria-label="Next loaded track">▶▶</button>
      </div>
    </div>
    <details className="soundtrack-library">
      <summary>🎶 Open my 8-track music shelf <span>({available}/8 loaded)</span></summary>
      <p>{onlineCount===8?
        "All eight original songs are included with the game! Just press Play. The music streams one track at a time, so opening a puzzle does not download the whole album. You can still import a personal version if you wish.":
        "Import MeekLeeAdventures.zip directly to load the original eight songs, or use the individual-file importer. Music starts only when you press Play."}
        Personal recordings are stored in this browser, never uploaded or synced to a server.</p>
      <p className="soundtrack-storage-note">Files are stored in this browser
        only when you import your own recordings. Built-in songs are streamed
        directly from the game on demand.</p>
      <label className="soundtrack-continuous">
        <input type="checkbox" data-soundtrack-continuous
          checked={continuous} onChange={event=>setContinuous(event.target.checked)}/>
        <span>Keep playing the next song (after I press Play)</span>
      </label>
      <div className="soundtrack-import">
        <label className="soundtrack-file-label soundtrack-zip-label">
          {unpackingZip?"⏳ Unpacking your soundtrack...":"🎼 Import MeekLeeAdventures ZIP"}
          <input type="file" data-soundtrack-zip
            aria-label="Import an eight-song MeekLeeAdventures ZIP"
            accept=".zip,application/zip"
            disabled={!ready||unpackingZip}
            onChange={event=>{
              const file=event.target.files?.[0];
              void importZip(file);
              event.target.value="";
            }}/>
        </label>
        <label className="soundtrack-file-label">
          📂 Import up to eight tracks
          <input ref={bulkRef} type="file" data-soundtrack-import multiple
            aria-label="Import up to eight local audio files"
            accept=".mp3,.wav,.ogg,.m4a,.aac,.flac,audio/*"
            disabled={!ready}
            onChange={event=>{
              const picked=event.target.files;
              void importFiles(picked,"bulk");
              event.target.value="";
            }}/>
        </label>
        <label className="soundtrack-volume">Volume
          <input type="range" min="0" max="1" step=".05" value={volume}
            data-soundtrack-volume
            onChange={event=>{
              const next=Number(event.target.value);
              setVolume(next);
              if(audioRef.current)audioRef.current.volume=next;
            }}
            aria-label="Music volume"/>
          <strong>{Math.round(volume*100)}%</strong>
        </label>
      </div>
      <div className="soundtrack-slots" aria-label="Eight soundtrack slots">
        {SOUNDTRACK_SLOTS.map((slot,i)=><div className="soundtrack-slot"
          key={slot.id} data-soundtrack-slot={i}>
          <div className="soundtrack-slot-name">
            <span aria-hidden="true">{slot.icon}</span>
            <strong>{i+1}. {slot.name}</strong>
            <small>{tracks[i]?soundtrackDisplayName(tracks[i].name):
              onlineTracks[i]?soundtrackDisplayName(onlineTracks[i].name)+" · Included":
              "Empty slot"}</small>
          </div>
          <div className="soundtrack-slot-actions">
            {library[i]&&<button type="button" data-soundtrack-play={i}
              onClick={()=>void playSlot(i)}>▶ Play</button>}
            <button type="button" data-soundtrack-replace={i}
              onClick={()=>{replaceRef.current=i;singleRef.current?.click();}}
              disabled={!ready}>{tracks[i]?"Replace":"Add song"}</button>
            {tracks[i]&&<button type="button" data-soundtrack-remove={i}
              onClick={()=>void removeTrack(i)}>Remove</button>}
            {!tracks[i]&&onlineTracks[i]&&
              <small className="soundtrack-included">✓ Included with MeekLee</small>}
          </div>
        </div>)}
      </div>
      <input ref={singleRef} type="file" className="soundtrack-hidden-input"
        data-soundtrack-single aria-label="Choose an audio file for selected slot"
        accept=".mp3,.wav,.ogg,.m4a,.aac,.flac,audio/*"
        onChange={event=>{
          const picked=event.target.files;
          void importFiles(picked,"single");
          event.target.value="";
        }}/>
      <p className="soundtrack-privacy">{onlineCount===8?
        "The original tracks are supplied by this game and stream only when played. Imported personal copies stay on this device.":
        "The site does not have a published soundtrack yet. Importing the ZIP is a private fallback, with no account required."}
        Local files may take storage space, and
        a private browsing window may forget them. If this browser cannot
        store them, the game will say so. Nothing is sent to Suno, GitHub or
        any other music service. Audio belongs to its creator.</p>
    </details>
    <p className="soundtrack-status" role="status" data-soundtrack-status>{status}</p>
  </section>;
}
