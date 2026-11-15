import React,{useEffect,useState} from "react";
import "./family-game-house.css";

const KEY="meeklee-family-porch-notes-v1";
const kinds=[
  {id:"idea",icon:"💡",label:"Game Idea"},
  {id:"recipe",icon:"🍓",label:"Family Recipe"},
  {id:"story",icon:"📖",label:"Family Story"}
];
const readNotes=()=>{
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||"[]");
    if(!Array.isArray(raw))return [];
    return raw.slice(0,60).filter(n=>
      n&&typeof n.id==="string"&&
      kinds.some(x=>x.id===n.kind)&&typeof n.title==="string"&&
      typeof n.body==="string").map(n=>({
        id:n.id,kind:n.kind,title:n.title.slice(0,100),
        body:n.body.slice(0,3000),by:typeof n.by==="string"?n.by.slice(0,60):"",
        at:Number.isFinite(n.at)?n.at:0
      }));
  }catch{return [];}
};
const formatNote=n=>{
  const label=kinds.find(k=>k.id===n.kind)?.label||"Family note";
  return label+": "+n.title+(n.by?"\nShared by: "+n.by:"")+
    "\n\n"+n.body+"\n\nShared from MeekLee Adventures ❤️\n"+
    "https://michaelwave369.github.io/MeekLee/";
};
export default function FamilyPorch({onLeave}){
  const [notes,setNotes]=useState(readNotes);
  const [kind,setKind]=useState("idea");
  const [title,setTitle]=useState("");
  const [by,setBy]=useState("");
  const [body,setBody]=useState("");
  const [notice,setNotice]=useState("");
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [filter,setFilter]=useState("all");
  useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(notes));}
    catch{setNotice("Your device could not save the notebook. Try freeing storage.");}
  },[notes]);
  function add(e){
    e.preventDefault();
    if(!title.trim()||!body.trim()){setNotice("Add a title and a few words first.");return;}
    const note={id:crypto.randomUUID?.()||String(Date.now())+"-"+Math.random(),
      kind,title:title.trim().slice(0,100),body:body.trim().slice(0,3000),
      by:by.trim().slice(0,60),at:Date.now()};
    setNotes(old=>[note,...old].slice(0,60));
    setTitle("");setBody("");setNotice("Saved on this phone! Share it with family whenever you like.");
  }
  async function share(note){
    const text=formatNote(note);
    try{
      if(navigator.share){
        await navigator.share({title:note.title,text});
        setNotice("Your phone's sharing menu opened for this note.");
      }else if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(text);
        setNotice("Copied! Paste the note into a message to family.");
      }else setNotice("Sharing isn't available here. You can select and copy the text below.");
    }catch(err){
      if(err?.name!=="AbortError")setNotice("Sharing wasn't completed. You can copy the note text instead.");
    }
  }
  const shown=notes.filter(n=>filter==="all"||n.kind===filter);
  return <section className="family-mini-game family-porch" aria-label="MeekLee Family Porch notebook">
    <div className="cardgame-top"><div><p className="trail-eyebrow">❤️ Memories and good ideas</p>
      <h2>The Family Porch</h2></div>
      <button type="button" className="trail-back" onClick={onLeave}>‹ Game Shelf</button>
    </div>
    <p className="cardgame-help">A cozy place to jot down a new game idea, Grandma's favorite
      recipe, or a family story. Save it here and share it by text or your phone's Share menu.</p>
    <div className="family-porch-disclaimer" role="note">
      <strong>Private notebook for now</strong>
      <p>These notes live only on this device. They are <strong>not posted publicly</strong> or
        sent automatically. To share one, tap its Share button and choose a person.
        A future family community will need permission, privacy and moderation controls.</p>
    </div>
    <form className="family-porch-form" onSubmit={add}>
      <h3>✏️ Write something wonderful</h3>
      <fieldset>
        <legend>What are you adding?</legend>
        <div className="family-porch-kinds">
          {kinds.map(k=><label key={k.id} className={kind===k.id?" selected":""}>
            <input type="radio" name="kind" checked={kind===k.id}
              onChange={()=>setKind(k.id)}/>{k.icon} {k.label}
          </label>)}
        </div>
      </fieldset>
      <label htmlFor="porch-title">Title</label>
      <input id="porch-title" type="text" maxLength="100" value={title}
        placeholder={kind==="idea"?"A new game for Mom":kind==="recipe"?"Grandma's apple cake":"That funny Rook night"}
        onChange={e=>setTitle(e.target.value)}/>
      <label htmlFor="porch-by">From (optional)</label>
      <input id="porch-by" type="text" maxLength="60" value={by}
        placeholder="Aunt Sue, Uncle Mike, Mom..." onChange={e=>setBy(e.target.value)}/>
      <label htmlFor="porch-body">{kind==="recipe"?"Ingredients and steps":kind==="story"?"Tell the story":"Describe your game idea"}</label>
      <textarea id="porch-body" maxLength="3000" rows="5" value={body}
        placeholder="Write it here. There's no rush..."
        onChange={e=>setBody(e.target.value)}/>
      <button type="submit" className="family-mini-primary">🌷 Save in My Notebook</button>
    </form>
    <div className="family-porch-heading">
      <h3>📚 My saved notes ({notes.length})</h3>
      <label htmlFor="porch-filter">Show</label>
      <select id="porch-filter" value={filter} onChange={e=>setFilter(e.target.value)}>
        <option value="all">Everything</option>
        {kinds.map(k=><option key={k.id} value={k.id}>{k.label}s</option>)}
      </select>
    </div>
    {shown.length?<div className="family-porch-notes">
      {shown.map(n=><article className="family-porch-note" key={n.id}>
        <p className="family-porch-category">{kinds.find(k=>k.id===n.kind)?.icon} {kinds.find(k=>k.id===n.kind)?.label}</p>
        <h4>{n.title}</h4><small>{n.by?"From "+n.by+" · ":""}{n.at?new Date(n.at).toLocaleDateString():""}</small>
        <p className="family-porch-note-body">{n.body}</p>
        <div className="family-mini-actions">
          <button type="button" onClick={()=>share(n)}>📤 Share with Family</button>
          <button type="button" onClick={()=>setConfirmDelete(n.id)}>
            {confirmDelete===n.id?"Confirm Remove":"Remove Note"}
          </button>
          {confirmDelete===n.id&&<button type="button" onClick={()=>{
            setNotes(old=>old.filter(x=>x.id!==n.id));setConfirmDelete(null);
          }}>✓ Yes, remove it</button>}
        </div>
      </article>)}
    </div>:<p className="family-mini-notice">No notes here yet. Write the first one above!</p>}
    <div className="family-porch-contribute">
      <h3>💡 Suggest a new game for MeekLee</h3>
      <p>You can also submit a feature idea directly on GitHub. A free GitHub account is
        required for the public issue tracker. For friends without accounts,
        save a Game Idea above and use your phone's Share button.</p>
      <a href="https://github.com/MichaelWave369/MeekLee/issues/new?template=game-idea.yml"
        target="_blank" rel="noopener noreferrer">Open the MeekLee suggestion form ↗</a>
    </div>
  </section>;
}
