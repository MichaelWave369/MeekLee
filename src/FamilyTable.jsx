import React, {useEffect,useRef,useState} from "react";
import {RookTile} from "./CardTiles.jsx";
import {ROOK_SUITS,ROOK_TARGET} from "./rook.js";
import "./family-table.css";

const API_KEY="meeklee-family-api-v1";
const NAME_KEY="meeklee-family-name-v1";
const ROOM_RE=/^[a-f0-9]{32}$/;
const defaultServer=(import.meta.env.VITE_FAMILY_API_URL||"").trim();
const cleanServer=value=>{
  try{
    const u=new URL(value.trim());
    if(u.username||u.password||u.search||u.hash)return "";
    if(u.protocol!=="https:" &&
      !(u.protocol==="http:"&&["localhost","127.0.0.1"].includes(u.hostname)))return "";
    return u.origin;
  }catch{return "";}
};
function inviteFromHash(){
  if(typeof window==="undefined")return {code:"",server:""};
  const hash=new URLSearchParams(window.location.hash.slice(1));
  const code=hash.get("family")||"";
  return {code:ROOM_RE.test(code)?code:"",server:cleanServer(hash.get("server")||"")};
}
const stored=(name,fallback="")=>{
  try{return window.localStorage.getItem(name)||fallback;}catch{return fallback;}
};
const seatLabel=(seats,seat)=>{
  if(seat===null||seat===undefined)return "";
  return seats?.[seat]?.name||"Seat "+(seat+1);
};
function sessionKey(server,code){return "meeklee-family-seat-v1:"+server+":"+code;}
function makeInvite(server,code){
  return window.location.origin+window.location.pathname+
    "#family="+encodeURIComponent(code)+"&server="+encodeURIComponent(server);
}
async function familyRequest(server,path,method="GET",data,token){
  const res=await fetch(server+path,{
    method,cache:"no-store",
    headers:{
      "Content-Type":"application/json",
      ...(token?{"Authorization":"Bearer "+token}:{})
    },
    ...(method==="POST"?{body:JSON.stringify(data||{})}:{})
  });
  const payload=await res.json().catch(()=>({}));
  if(!res.ok||!payload.ok)throw Error(payload.error||"The family server couldn't answer. Please try again.");
  return payload;
}

function PreviewTable({onPractice}){
  const names=[
    {name:"Mom",avatar:"🌼",kind:"Your seat"},
    {name:"Aunt or Uncle",avatar:"🌷",kind:"Family player"},
    {name:"Family Partner",avatar:"🐰",kind:"Across the table"},
    {name:"Bot or Relative",avatar:"🦊",kind:"Fill any seat"}
  ];
  return <section className="family-preview" aria-label="Illustrative preview of the family table">
    <p className="family-preview-notice">Design preview · This is not a connected room yet.</p>
    <div className="family-preview-wood">
      <div className="family-preview-cloth">
        <span className="family-preview-lamp" aria-hidden="true">🕯️</span>
        <strong>Family Rook Night</strong>
        <p>Four seats. One table. Plenty of laughs.</p>
        <div className="family-preview-seats">
          {names.map((p,i)=><div key={i} className="family-preview-seat">
            <span aria-hidden="true">{p.avatar}</span>
            <strong>{p.name}</strong>
            <small>{p.kind}</small>
          </div>)}
        </div>
        <div className="family-preview-center">
          <span aria-hidden="true">🐦</span>
          <p>Private links · Three bot substitutes · Chat while you play</p>
        </div>
      </div>
    </div>
    <div className="family-preview-chat" aria-label="Example text conversation">
      <strong>Example family chat</strong>
      <p><b>Mom:</b> Who's ready for Rook?</p>
      <p><b>Uncle:</b> Deal me in!</p>
      <p><b>Aunt:</b> I hope you brought your lucky cards.</p>
      <small>Illustrative messages, not real people online.</small>
    </div>
    <button type="button" className="family-primary-button" onClick={onPractice}>
      🐦 Play Offline Rook While We Set Up Online Rooms
    </button>
  </section>;
}

export default function FamilyTable({onLeave,onPractice}){
  const invitation=inviteFromHash();
  const [server,setServer]=useState(()=>invitation.server||
    cleanServer(stored(API_KEY,defaultServer)));
  const [draftServer,setDraftServer]=useState(()=>invitation.server||
    cleanServer(stored(API_KEY,defaultServer)));
  const [name,setName]=useState(()=>stored(NAME_KEY,""));
  const [code,setCode]=useState(()=>invitation.code);
  const [token,setToken]=useState(()=>
    invitation.code&&invitation.server?
      stored(sessionKey(invitation.server,invitation.code)):"");
  const [room,setRoom]=useState(null);
  const [connected,setConnected]=useState(false);
  const [pending,setPending]=useState(false);
  const [notice,setNotice]=useState("");
  const [chatText,setChatText]=useState("");
  const [nestPicks,setNestPicks]=useState([]);
  const [copyMessage,setCopyMessage]=useState("");
  const socketRef=useRef(null);
  const chatEndRef=useRef(null);
  const authRef=useRef({server,code,token});
  authRef.current={server,code,token};

  useEffect(()=>{
    if(!server||!code)return;
    const savedToken=stored(sessionKey(server,code));
    if(savedToken&&!token)setToken(savedToken);
  },[server,code,token]);
  // Restore an existing room, including a reserved seat after the phone slept.
  useEffect(()=>{
    if(!server||!code||!token)return;
    let cancelled=false;
    familyRequest(server,"/api/rooms/"+code,"GET",null,token)
      .then(data=>{if(!cancelled){setRoom(data.room);setNotice("");}})
      .catch(err=>{if(!cancelled){setRoom(null);setNotice(err.message);}});
    return ()=>{cancelled=true;};
  },[server,code,token]);
  // WebSockets transmit only each viewer's filtered room state. Reconnects
  // transparently when a phone changes networks; HTTP remains available.
  useEffect(()=>{
    if(!room||!server||!code||!token)return;
    let live=true,attempt=0,timer=null;
    function open(){
      if(!live)return;
      const endpoint=server.replace(/^http/,"ws")+"/api/rooms/"+code+"/ws";
      let ws;
      try{ws=new WebSocket(endpoint,["seat."+token]);}
      catch{setConnected(false);return;}
      socketRef.current=ws;
      ws.onopen=()=>{if(live){setConnected(true);attempt=0;}};
      ws.onmessage=e=>{
        if(!live)return;
        try{
          const event=JSON.parse(e.data);
          if(event.kind==="state")setRoom(event.room);
        }catch{/* Ignore malformed transport events. */}
      };
      ws.onerror=()=>{if(live)setConnected(false);};
      ws.onclose=()=>{
        if(!live)return;
        setConnected(false);
        attempt++;
        timer=window.setTimeout(open,Math.min(12000,700*Math.pow(2,Math.min(attempt,4))));
      };
    }
    open();
    return ()=>{
      live=false;window.clearTimeout(timer);
      const socket=socketRef.current;
      socketRef.current=null;
      try{if(socket?.readyState<=1)socket.close();}catch{/* best effort */}
    };
  },[Boolean(room),server,code,token]);
  // A very infrequent fallback refresh helps players whose network blocks WS.
  useEffect(()=>{
    if(!server||!code||!token||connected)return;
    const id=window.setInterval(()=>{
      familyRequest(server,"/api/rooms/"+code,"GET",null,token)
        .then(d=>setRoom(d.room)).catch(()=>{});
    },15000);
    return ()=>window.clearInterval(id);
  },[server,code,token,connected]);
  useEffect(()=>{chatEndRef.current?.scrollIntoView?.({block:"nearest"});},[room?.chat?.length]);

  function enterRoom(response,api=server){
    const roomCode=response.code;
    if(!ROOM_RE.test(roomCode)||!response.token)return;
    try {
      localStorage.setItem(sessionKey(api,roomCode),response.token);
      localStorage.setItem(NAME_KEY,name.trim());
    }catch{/* The room is still usable until the browser closes. */}
    setCode(roomCode);setToken(response.token);setRoom(response.room);
    setNotice("");setNestPicks([]);
    window.history.replaceState(null,"",makeInvite(api,roomCode));
  }
  async function create(){
    if(!name.trim()){setNotice("Please type your name first.");return;}
    if(!server){setNotice("The online room service is not connected yet.");return;}
    setPending(true);
    try{
      const result=await familyRequest(server,"/api/rooms","POST",{name:name.trim()});
      enterRoom(result);
    }catch(e){setNotice(e.message);}finally{setPending(false);}
  }
  async function join(){
    if(!name.trim()){setNotice("Please enter a name so the family knows who's here.");return;}
    setPending(true);
    try{
      const response=await familyRequest(server,"/api/rooms/"+code+"/join","POST",
        {name:name.trim(),token:token||undefined});
      enterRoom(response);
    }catch(e){setNotice(e.message);}finally{setPending(false);}
  }
  async function gameAction(action){
    if(pending||!room||!token)return;
    setPending(true);setNotice("");
    try{
      const response=await familyRequest(server,"/api/rooms/"+code+"/action","POST",
        {action,version:room.version},token);
      setRoom(response.room);setNestPicks([]);
    }catch(e){
      setNotice(e.message);
      try{
        const refresh=await familyRequest(server,"/api/rooms/"+code,"GET",null,token);
        setRoom(refresh.room);
      }catch{/* Leave last known table visible. */}
    }finally{setPending(false);}
  }
  async function sendChat(event){
    event.preventDefault();
    const text=chatText.trim();
    if(!text||pending||!token)return;
    setPending(true);
    try{
      const response=await familyRequest(server,"/api/rooms/"+code+"/chat","POST",{text},token);
      setRoom(response.room);setChatText("");setNotice("");
    }catch(e){setNotice(e.message);}finally{setPending(false);}
  }
  async function copyInvite(){
    try{
      await navigator.clipboard.writeText(makeInvite(server,code));
      setCopyMessage("Family invitation copied! Send it to your relatives.");
    }catch{setCopyMessage("Copy the address from your browser to invite family.");}
  }
  function leaveRoom(){
    setRoom(null);setCode("");setToken("");setConnected(false);setNestPicks([]);setNotice("");
    window.history.replaceState(null,"",window.location.pathname+window.location.search);
  }
  function saveServer(event){
    event.preventDefault();
    const valid=cleanServer(draftServer);
    if(!valid){setNotice("Use an HTTPS family-server address, or local HTTP for development.");return;}
    try{localStorage.setItem(API_KEY,valid);}catch{}
    setServer(valid);setNotice("Family server address saved on this device.");
  }
  const g=room?.game;
  const mySeat=room?.me?.seat;
  const turn=g && room.me.role==="player" && g.turn===mySeat;
  const canAct=turn&&!pending;
  const myHand=g?.hand||[];
  const minimum=Math.max(70,(g?.bid||0)+5);
  const isCreator=room?.me.host;
  const names=room?.seats||[];
  const publicLink=Boolean(code&&server);
  return <section className="family-table-page" aria-label="MeekLee Family Table">
    <div className="cardgame-top">
      <div><p className="trail-eyebrow">🐦 MeekLee Adventures</p><h2>MeekLee's Family Table</h2></div>
      <button type="button" className="trail-back" onClick={onLeave}>‹ Card Corner</button>
    </div>
    <p className="family-intro">Same family Rook rules. Four seats at each table, with bots for
      empty chairs, and a place to chat without driving across town.</p>
    {!server&&<div className="family-setup-note" role="status">
      <strong>Online rooms aren't connected yet.</strong>
      <p>This is a real interface preview. Private multiplayer needs a room server before relatives can join each other.
        Your offline Rook game is still ready to play.</p>
    </div>}
    {!server&&<PreviewTable onPractice={onPractice}/>}
    {!room&&<div className="family-entry">
      <h3>{code?"You've been invited to a family table!":"Gather Around the Table"}</h3>
      <p>{code?"Type your name and join your relatives.":"Once the room service is connected, create a private Rook room and send one link to your family."}</p>
      <label htmlFor="family-name">Name at the table</label>
      <input id="family-name" type="text" maxLength="28" autoComplete="nickname"
        placeholder="Mom, Aunt Sue, Uncle Joe..." value={name}
        onChange={e=>setName(e.target.value)}/>
      {server&&<button className="family-primary-button" type="button" disabled={pending}
        onClick={code?join:create}>
        {pending?"Connecting…":code?"Pull Up a Chair →":"Create Private Family Table →"}
      </button>}
      {code&&<p className="family-help-small">If your room has started or all chairs are taken,
        you can watch the game and join the text conversation.</p>}
    </div>}
    {!room&&<details className="family-server-settings">
      <summary>Set up family room server</summary>
      <p>Paste the address of a deployed MeekLee Family Table Worker. You'll only need to do this once on your device.
        Shared family invitations carry the server address automatically.</p>
      <form onSubmit={saveServer}>
        <label htmlFor="family-server-url">Family room server URL</label>
        <input id="family-server-url" type="url" placeholder="https://meeklee-family-table.yourname.workers.dev"
          value={draftServer} onChange={e=>setDraftServer(e.target.value)}/>
        <button type="submit">Save Server Address</button>
      </form>
    </details>}
    {room&&<div className="family-live-area">
      <div className="family-live-top">
        <div><strong>Private Room</strong><small>{code.slice(0,8).toUpperCase()} · {connected?"Live connection":"Reconnecting / checking"}</small></div>
        <button type="button" onClick={copyInvite}>🔗 Copy Family Invite</button>
        <button type="button" onClick={leaveRoom}>Leave View</button>
      </div>
      {copyMessage&&<p className="family-notice" role="status">{copyMessage}</p>}
      <div className="family-live-columns">
        <div className="family-game-column">
          <div className="family-seat-grid" aria-label="Four Rook seats">
            {names.map((p,seat)=><div className={"family-seat"+(p?.bot?" family-bot":"")+
              (mySeat===seat?" family-is-me":"")} key={seat}>
              <span aria-hidden="true">{["🌼","🌷","🐰","🦊"][seat]}</span>
              <strong>{p?.name||"Open Chair"}</strong>
              <small>{!p?"Invite someone":p.bot?"Computer player":
                seat===mySeat?"You":seat===0?"Room creator":"Family member"}</small>
              {g?.turn===seat&&<small className="family-turn-label">Their turn</small>}
            </div>)}
          </div>
          <p className="family-spectators">👀 {room.spectatorCount} watching and chatting
            {room.me.role==="spectator"?" · You're watching":""}</p>
          {room.phase==="lobby"&&<div className="family-lobby-help">
            <h3>Welcome to the family table!</h3>
            <p>Send the invitation link to relatives. Four people can play; empty chairs become
              computer players when the room creator starts. Everyone else can watch and chat.</p>
            {isCreator?<button type="button" className="family-primary-button"
                onClick={()=>gameAction({type:"start"})} disabled={pending}>
                🐦 Deal the Cards · Fill Empty Seats with Bots
              </button>:<p><strong>Waiting for the room creator to deal…</strong></p>}
          </div>}
          {g&&<>
            <div className="family-game-score">
              <div><strong>{seatLabel(names,0)} + {seatLabel(names,2)}</strong>
                <span>{g.scores[0]} / {ROOK_TARGET}</span></div>
              <div><strong>{seatLabel(names,1)} + {seatLabel(names,3)}</strong>
                <span>{g.scores[1]} / {ROOK_TARGET}</span></div>
            </div>
            <div className="family-match-meta">
              <span>Hand {g.round}</span>
              <span>{g.bid?"Bid "+g.bid+" · "+seatLabel(names,g.bidder):"Bidding"}</span>
              <span>{g.trump?"Trump: "+g.trump:"No trump yet"}</span>
            </div>
            <div className="family-green-table" aria-label="Shared game table">
              <p>{g.phase==="trick-done"?"Trick finished":
                g.phase==="round-over"?"Hand complete":
                g.phase==="game-over"?"Match complete":
                "Turn: "+seatLabel(names,g.turn)}</p>
              <div className="family-played-cards">
                {(g.trick?.length?g.trick:room.lastTrick?.cards||[]).map(({seat,card},i)=>
                  <div className="family-played-entry" key={seat+"-"+i}>
                    <RookTile card={card}/><small>{seatLabel(names,seat)}</small>
                  </div>)}
                {!g.trick?.length&&!room.lastTrick&&<strong className="family-nest-symbol">🐦</strong>}
              </div>
              <small>{room.lastAction}</small>
              <p className="family-counter">Captured: {g.points[0]} to {g.points[1]} points</p>
            </div>
            {g.phase==="bid"&&canAct&&<div className="family-action-prompt">
              <h3>Your bid</h3>
              <div className="family-action-buttons">
                <button type="button" onClick={()=>gameAction({type:"bid",value:"pass"})}>Pass</button>
                {minimum<=120&&<button type="button"
                  onClick={()=>gameAction({type:"bid",value:minimum})}>Bid {minimum}</button>}
                {minimum+10<=120&&<button type="button"
                  onClick={()=>gameAction({type:"bid",value:minimum+10})}>Bid {minimum+10}</button>}
              </div>
            </div>}
            {g.phase==="nest"&&canAct&&<div className="family-action-prompt">
              <h3>Pick five cards for the nest</h3>
              <p>{nestPicks.length}/5 selected</p>
              <button type="button" disabled={nestPicks.length!==5}
                onClick={()=>gameAction({type:"discard",indices:nestPicks})}>
                Put Five Cards in Nest
              </button>
            </div>}
            {g.phase==="trump"&&canAct&&<div className="family-action-prompt">
              <h3>Choose your trump color</h3>
              <div className="family-action-buttons">
                {ROOK_SUITS.map(s=><button key={s.id} type="button"
                  style={{"--card-color":s.color}}
                  onClick={()=>gameAction({type:"trump",color:s.id})}>{s.mark} {s.label}</button>)}
              </div>
            </div>}
            {g.phase==="round-over"&&<div className="family-round-end">
              <h3>Hand finished!</h3>
              <p>Team points: {g.lastResult?.teamPoints.join(" – ")}.
                {g.lastResult?.bidMade?" The bid was made!":" The bidders went set!"}</p>
              {isCreator&&<button className="family-primary-button" type="button"
                disabled={pending} onClick={()=>gameAction({type:"next"})}>Deal Next Hand</button>}
            </div>}
            {g.phase==="game-over"&&<div className="family-round-end family-champions">
              <h3>🏆 {g.winner===0?seatLabel(names,0)+" and "+seatLabel(names,2):
                seatLabel(names,1)+" and "+seatLabel(names,3)} win!</h3>
              <p>What a lovely game together.</p>
              {isCreator&&<button type="button" className="family-primary-button"
                onClick={()=>gameAction({type:"restart"})} disabled={pending}>New Match</button>}
            </div>}
            {room.me.role==="player"&&["bid","nest","trump","play"].includes(g.phase)&&
              <section className="family-my-hand" aria-label="Your private Rook hand">
                <h3>🃏 Your Cards <small>Only you can see these cards</small></h3>
                <p>{turn?"It's your turn!":"Waiting for "+seatLabel(names,g.turn)+"…"}
                  {g.phase==="play"&&turn?" Play a highlighted card.":""}</p>
                <div className="family-card-hand">
                  {myHand.map((card,index)=><RookTile key={card} card={card}
                    disabled={!canAct||
                      !(g.phase==="nest"||g.phase==="play"&&g.legal.includes(index))}
                    selected={g.phase==="nest"&&nestPicks.includes(index)}
                    highlight={g.phase==="play"&&turn&&g.legal.includes(index)}
                    onClick={g.phase==="nest"&&canAct?()=>{
                      setNestPicks(old=>old.includes(index)?old.filter(i=>i!==index):
                        old.length<5?[...old,index]:old);
                    }:g.phase==="play"&&canAct&&g.legal.includes(index)?
                      ()=>gameAction({type:"play",index}):undefined}/>)}
                </div>
              </section>}
            {room.me.role==="spectator"&&<div className="family-watching-note">
              <p>You're watching this match. Player hands stay private, but you're welcome in the conversation!</p>
              {room.onWaitingList?<div className="family-seat-waiting">
                <strong>You're on the list to replace a bot at the next hand.</strong>
                <button type="button" disabled={pending}
                  onClick={()=>gameAction({type:"leave-queue"})}>Leave Waiting List</button>
              </div>:room.botSeats>room.waitingCount?
                <button type="button" className="family-primary-button" disabled={pending}
                  onClick={()=>gameAction({type:"queue"})}>🃏 Play the Next Hand (Take a Bot Seat)</button>:
                <small>All playing chairs are currently occupied. You're welcome to stay and chat.</small>}
            </div>}
          </>}
        </div>
        <aside className="family-chat-panel" aria-label="Private family text chat">
          <div className="family-chat-heading">
            <h3>💬 Family Chat</h3><small>Private to this invitation · Text only for now</small>
          </div>
          <div className="family-chat-scroll" role="log" aria-live="polite"
            aria-label="Family messages">
            {!room.chat.length&&<p className="family-chat-empty">
              Pull up a chair and say hello! The stories are as important as the cards.
            </p>}
            {room.chat.slice(-40).map(m=><div className="family-chat-bubble" key={m.id}>
              <strong>{m.name}</strong><span>{m.text}</span>
            </div>)}
            <span ref={chatEndRef}/>
          </div>
          <form className="family-chat-compose" onSubmit={sendChat}>
            <label htmlFor="family-chat-message">Message everyone at the table</label>
            <textarea id="family-chat-message" rows="2" maxLength="400"
              placeholder="Hello family! ❤️" value={chatText}
              onChange={e=>setChatText(e.target.value)}/>
            <button type="submit" disabled={pending||!chatText.trim()}>Send Message</button>
          </form>
          <small className="family-chat-privacy">Anyone with this invitation link can enter.
            Share it only with people you trust. No public chat directory.</small>
        </aside>
      </div>
    </div>}
    {notice&&<p className="family-notice" role="alert">{notice}</p>}
    <p className="family-footer">Offline Rook remains unchanged. This online room option uses
      server-authoritative cards and chat; it does not share Mom's puzzle or garden saves.</p>
  </section>;
}
