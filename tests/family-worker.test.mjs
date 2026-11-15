import test from "node:test";
import assert from "node:assert/strict";
import worker,{FamilyRoomDO} from "../family/worker.js";

function fakeServer(){
  const objects=new Map();
  const env={};
  env.FAMILY_ROOMS={
    idFromName:name=>name,
    get:id=>{
      if(!objects.has(id)){
        const data=new Map();
        const ctx={
          storage:{
            get:async key=>data.get(key),
            put:async(key,value)=>{data.set(key,structuredClone(value));},
            setAlarm:async ms=>{data.set("test-alarm",ms);},
            deleteAll:async()=>{data.clear();}
          },
          getWebSockets:()=>[]
        };
        objects.set(id,new FamilyRoomDO(ctx,env));
      }
      return objects.get(id);
    }
  };
  return env;
}
async function invoke(env,path,method="GET",data,token,origin="https://michaelwave369.github.io"){
  const result=await worker.fetch(new Request("https://family.example"+path,{
    method,
    headers:{"Origin":origin,
      "Content-Type":"application/json",
      ...(token?{"Authorization":"Bearer "+token}:{})},
    ...(method==="POST"?{body:JSON.stringify(data||{})}:{})
  }),env);
  return {status:result.status,headers:result.headers,body:await result.json()};
}
test("the real Worker HTTP router creates private rooms and never exposes room state to visitors",async()=>{
  const env=fakeServer();
  const health=await invoke(env,"/api/health");
  assert.equal(health.status,200);
  assert.equal(health.body.service,"MeekLee Family Table");
  assert.equal(health.headers.get("Access-Control-Allow-Origin"),
    "https://michaelwave369.github.io");
  const created=await invoke(env,"/api/rooms","POST",{name:"Mom"});
  assert.equal(created.status,200);
  assert.equal(created.body.ok,true);
  assert.match(created.body.code,/^[a-f0-9]{32}$/);
  assert.match(created.body.token,/^[a-f0-9]{32}$/);
  const code=created.body.code,secret=created.body.token;
  assert.equal(created.body.room.game,null);
  assert.equal((await invoke(env,"/api/rooms/"+code)).status,401);
  const safe=await invoke(env,"/api/rooms/"+code,"GET",null,secret);
  assert.equal(safe.status,200);
  assert.equal(safe.body.room.me.host,true);
  assert(!JSON.stringify(safe.body).includes(secret));
  const evil=await invoke(env,"/api/rooms","POST",{name:"Bad"},
    null,"https://example-evil.test");
  assert.equal(evil.status,403);
  const badRoom=await invoke(env,"/api/rooms/"+"x".repeat(32));
  assert.equal(badRoom.status,404);
});

test("HTTP players can join, play a server-enforced turn, share bounded chat and spectate privately",async()=>{
  const env=fakeServer();
  const created=(await invoke(env,"/api/rooms","POST",{name:"Mom"})).body;
  const c=created.code,host=created.token;
  const aunt=await invoke(env,"/api/rooms/"+c+"/join","POST",{name:"Aunt"});
  assert.equal(aunt.status,200);
  assert.equal(aunt.body.room.me.seat,1);
  const unauthorized=await invoke(env,"/api/rooms/"+c+"/action","POST",
    {version:created.room.version,action:{type:"start"}},aunt.body.token);
  assert.equal(unauthorized.status,409);
  const start=await invoke(env,"/api/rooms/"+c+"/action","POST",
    {version:aunt.body.room.version,action:{type:"start"}},host);
  assert.equal(start.status,200);
  assert.equal(start.body.room.game.phase,"bid");
  assert.equal(start.body.room.game.hand.length,9);
  assert.equal(start.body.room.seats[2].bot,true);
  assert.equal("hands" in start.body.room.game,false);
  const badVersion=await invoke(env,"/api/rooms/"+c+"/action","POST",
    {version:1,action:{type:"bid",value:70}},host);
  assert.equal(badVersion.status,409);
  const spectator=await invoke(env,"/api/rooms/"+c+"/join","POST",{name:"Grandma"});
  assert.equal(spectator.body.room.me.role,"spectator");
  assert.deepEqual(spectator.body.room.game.hand,[]);
  const bid=await invoke(env,"/api/rooms/"+c+"/action","POST",
    {version:spectator.body.room.version,action:{type:"bid",value:70}},host);
  assert.equal(bid.status,200);
  const fakeCard=await invoke(env,"/api/rooms/"+c+"/action","POST",
    {version:bid.body.room.version,action:{type:"play",index:0}},spectator.body.token);
  assert.equal(fakeCard.status,409);
  const msg=await invoke(env,"/api/rooms/"+c+"/chat","POST",{text:"How is everyone?"},spectator.body.token);
  assert.equal(msg.status,200);
  assert.equal(msg.body.room.chat.at(-1).text,"How is everyone?");
  assert.equal(msg.body.room.chat.at(-1).name,"Grandma");
  assert.equal(msg.body.room.game.hand.length,0);
  const rejoin=await invoke(env,"/api/rooms/"+c+"/join","POST",
    {name:"Somebody Else",token:aunt.body.token});
  assert.equal(rejoin.status,200);
  assert.equal(rejoin.body.token,aunt.body.token);
  assert.equal(rejoin.body.room.me.seat,1);
  assert.equal(rejoin.body.room.me.name,"Aunt");
  const unapproved=await invoke(env,"/api/rooms/"+c+"/action","POST",
    {version:bid.body.room.version,action:{type:"restart"}},aunt.body.token);
  assert.equal(unapproved.status,409);
});

test("OPTIONS preflight advertises CORS headers for a family's ordinary browser requests",async()=>{
  const env=fakeServer();
  const result=await worker.fetch(new Request("https://family.example/api/rooms",{
    method:"OPTIONS",headers:{"Origin":"https://michaelwave369.github.io",
      "Access-Control-Request-Method":"POST",
      "Access-Control-Request-Headers":"content-type,authorization"}}),env);
  assert.equal(result.status,204);
  assert.match(result.headers.get("Access-Control-Allow-Headers"),/Authorization/);
  assert.equal(result.headers.get("Access-Control-Allow-Origin"),
    "https://michaelwave369.github.io");
});
