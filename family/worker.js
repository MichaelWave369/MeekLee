// Deploy separately with: npx wrangler@4 deploy --config family/wrangler.toml
// Free-tier-friendly, hibernatable WebSockets + SQLite-backed Durable Objects.
// No server secrets in the GitHub Pages bundle. No card authority in browsers.
import {
  createFamilyRoom, joinFamilyRoom, membership, familyAction, familyChat,
  familyView, ROOM_IDLE_LIFETIME_MS
} from "./room-core.js";

const CODE_PATTERN=/^[a-f0-9]{32}$/;
const CHAT_BODY_LIMIT=2048;
const ORIGINS=new Set([
  "https://michaelwave369.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
]);
function originOkay(request,env){
  const origin=request.headers.get("Origin");
  return !origin || ORIGINS.has(origin) || (env.ALLOWED_ORIGIN && origin===env.ALLOWED_ORIGIN);
}
function cors(request,env) {
  const origin=request.headers.get("Origin");
  const headers={
    "Cache-Control":"no-store",
    "Vary":"Origin",
    "Access-Control-Allow-Headers":"Authorization, Content-Type",
    "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
    "Access-Control-Max-Age":"3600"
  };
  if(origin && originOkay(request,env))headers["Access-Control-Allow-Origin"]=origin;
  return headers;
}
function json(payload,status=200,headers={}){
  return new Response(JSON.stringify(payload),{
    status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}
  });
}
function deny(message,status=400){return json({ok:false,error:message},status);}
function bearer(request){
  const match=/^Bearer ([A-Za-z0-9_-]{24,80})$/.exec(request.headers.get("Authorization")||"");
  return match?.[1]||null;
}
async function body(request){
  const length=Number(request.headers.get("Content-Length")||0);
  if(length>CHAT_BODY_LIMIT)throw Error("Too much text.");
  const input=await request.text();
  if(input.length>CHAT_BODY_LIMIT)throw Error("Too much text.");
  const result=JSON.parse(input||"{}");
  if(!result||typeof result!=="object"||Array.isArray(result))throw Error("Invalid request.");
  return result;
}
async function routeToRoom(request,env,code,operation){
  if(!CODE_PATTERN.test(code))return deny("Invalid family room link.",404);
  const id=env.FAMILY_ROOMS.idFromName("family-"+code);
  const object=env.FAMILY_ROOMS.get(id);
  return object.fetch(new Request("https://family-internal/"+operation,{
    method:request.method,headers:request.headers,body:
      request.method==="POST"?request.body:undefined,
    // Cloudflare's runtime can stream a request body to an internal DO.
    duplex:request.method==="POST"?"half":undefined
  }));
}
export default {
  async fetch(request,env){
    if(!originOkay(request,env))return deny("This site is not allowed to open family rooms.",403);
    const u=new URL(request.url);
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(request,env)});
    let result;
    try{
      if(u.pathname==="/api/health"&&request.method==="GET"){
        result=json({ok:true,service:"MeekLee Family Table",version:1});
      }else if(u.pathname==="/api/rooms"&&request.method==="POST"){
        const data=await body(request);
        const code=crypto.randomUUID().replace(/-/g,"");
        const token=crypto.randomUUID().replace(/-/g,"");
        const stub=env.FAMILY_ROOMS.get(env.FAMILY_ROOMS.idFromName("family-"+code));
        result=await stub.fetch(new Request("https://family-internal/create",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({code,token,name:data.name})
        }));
      }else{
        const match=/^\/api\/rooms\/([a-f0-9]{32})(?:\/(join|action|chat|ws))?$/.exec(u.pathname);
        if(!match)result=deny("Endpoint not found.",404);
        else {
          const op=match[2]||"view";
          const allowed=op==="view"?"GET":op==="ws"?"GET":"POST";
          result=request.method!==allowed?deny("Method not allowed.",405):
            await routeToRoom(request,env,match[1],op);
        }
      }
    }catch(error){
      result=deny(error instanceof SyntaxError?"Please check your message.":error.message||"Request failed.",400);
    }
    if(result.status===101)return result; // WebSocket responses may not be wrapped.
    const headers=new Headers(result.headers);
    for(const [k,v] of Object.entries(cors(request,env)))headers.set(k,v);
    return new Response(result.body,{status:result.status,headers});
  }
};

export class FamilyRoomDO {
  constructor(ctx,env){this.ctx=ctx;this.env=env;}
  async read(){return this.ctx.storage.get("room");}
  async persist(room){
    await this.ctx.storage.put("room",room);
    await this.ctx.storage.setAlarm(room.updatedAt+ROOM_IDLE_LIFETIME_MS);
    this.broadcast(room);
  }
  broadcast(room){
    for(const ws of this.ctx.getWebSockets()){
      const token=ws.deserializeAttachment()?.token;
      const view=familyView(room,token);
      try {
        if(!view){ws.close(1008,"Seat no longer available.");continue;}
        ws.send(JSON.stringify({kind:"state",room:view}));
      }catch{/* A disconnected visitor can rejoin using their private token. */}
    }
  }
  async fetch(request){
    const route=new URL(request.url).pathname;
    const token=bearer(request);
    const old=await this.read();
    if(route==="/create"&&request.method==="POST"){
      if(old)return deny("Room already exists.",409);
      const data=await body(request);
      const room=createFamilyRoom(data.code,data.name,data.token);
      await this.persist(room);
      return json({ok:true,code:room.code,token:data.token,room:familyView(room,data.token)});
    }
    if(!old)return deny("This room has expired or does not exist.",404);
    if(route==="/join"&&request.method==="POST"){
      const data=await body(request);
      const session=membership(old,data.token)?data.token:crypto.randomUUID().replace(/-/g,"");
      const joined=joinFamilyRoom(old,data.name,session);
      if(!joined.ok)return deny(joined.error,409);
      if(!joined.rejoined)await this.persist(joined.room);
      return json({ok:true,code:joined.room.code,token:session,room:familyView(joined.room,session)});
    }
    if(route==="/view"&&request.method==="GET"){
      const view=familyView(old,token);
      return view?json({ok:true,room:view}):deny("Join this family room first.",401);
    }
    if(route==="/ws"&&request.headers.get("Upgrade")?.toLowerCase()==="websocket"){
      const selected=(request.headers.get("Sec-WebSocket-Protocol")||"")
        .split(",").map(s=>s.trim()).find(s=>/^seat\.[A-Za-z0-9_-]{24,80}$/.test(s));
      const t=selected?.slice(5);
      if(!membership(old,t))return deny("Join the room before connecting.",401);
      const pair=new WebSocketPair();
      const [client,server]=Object.values(pair);
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({token:t});
      server.send(JSON.stringify({kind:"state",room:familyView(old,t)}));
      this.broadcast(old);
      return new Response(null,{status:101,webSocket:client,
        headers:{"Sec-WebSocket-Protocol":selected}});
    }
    if(route==="/action"&&request.method==="POST"){
      if(!membership(old,token))return deny("Join the room before playing.",401);
      const data=await body(request);
      if(data.version!==old.version)return deny("Another player moved. Please use the updated table.",409);
      const result=familyAction(old,token,data.action);
      if(!result.ok)return deny(result.error,409);
      await this.persist(result.room);
      return json({ok:true,room:familyView(result.room,token)});
    }
    if(route==="/chat"&&request.method==="POST"){
      if(!membership(old,token))return deny("Join the room before chatting.",401);
      const data=await body(request);
      const result=familyChat(old,token,data.text,Date.now(),crypto.randomUUID());
      if(!result.ok)return deny(result.error,429);
      await this.persist(result.room);
      return json({ok:true,room:familyView(result.room,token)});
    }
    return deny("Endpoint not found.",404);
  }
  async webSocketMessage(ws,message){
    if(message==="ping")try{ws.send("pong");}catch{}
  }
  async webSocketClose(ws,code,reason) {
    try{ws.close(code,reason);}catch{}
    const room=await this.read();
    if(room)this.broadcast(room);
  }
  async webSocketError(ws){
    try{ws.close(1011,"Connection dropped.");}catch{}
  }
  async alarm(){
    const room=await this.read();
    if(!room)return;
    if(Date.now()-room.updatedAt>=ROOM_IDLE_LIFETIME_MS){
      for(const ws of this.ctx.getWebSockets())try{ws.close(1001,"Room expired.");}catch{}
      await this.ctx.storage.deleteAll();
    }else await this.ctx.storage.setAlarm(room.updatedAt+ROOM_IDLE_LIFETIME_MS);
  }
}
