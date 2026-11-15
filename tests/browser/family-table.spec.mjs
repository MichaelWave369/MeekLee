import {test,expect} from "@playwright/test";
import {
  createFamilyRoom,joinFamilyRoom,membership,familyAction,familyChat,familyView
} from "../../family/room-core.js";

async function openFamily(browser,width=390,online=false,url="./"){
  const context=await browser.newContext({
    viewport:{width,height:780},isMobile:true,hasTouch:true,deviceScaleFactor:2,reducedMotion:"reduce"
  });
  if(online)await context.addInitScript(()=>{
    localStorage.setItem("meeklee-family-api-v1","https://family.example");
  });
  const page=await context.newPage();
  await page.goto(url);
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:/Play Family Rook Table/}).click();
  await expect(page.getByRole("heading",{name:"MeekLee's Family Table"})).toBeVisible();
  return {context,page};
}

test("Family Rook preview is explicit and inviting, and offline Rook still works at 320px",async({browser})=>{
  const {context,page}=await openFamily(browser,320);
  await expect(page.getByText("Online rooms aren't connected yet.")).toBeVisible();
  await expect(page.getByText("Design preview · This is not a connected room yet.")).toBeVisible();
  await expect(page.getByText("Example family chat")).toBeVisible();
  await expect(page.getByText("Four seats. One table. Plenty of laughs.")).toBeVisible();
  await expect(page.getByRole("button",{name:/Create Private Family Table/})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.getByRole("button",{name:/Play Offline Rook While/}).click();
  await expect(page.getByRole("heading",{name:"Rook Card Table"})).toBeVisible();
  await context.close();
});

test("private family invite, bot seats, server-owned plays, chat and room recovery in phone UI",async({browser})=>{
  const code="b".repeat(32),hostToken="c".repeat(32);
  let gameRoom=null,now=1000,messageNumber=0;
  const route=async route=>{
    const request=route.request(),url=new URL(request.url());
    const base={
      "access-control-allow-origin":"*",
      "access-control-allow-methods":"GET,POST,OPTIONS",
      "access-control-allow-headers":"Authorization,Content-Type",
      "content-type":"application/json"
    };
    const reply=(data,status=200)=>route.fulfill({status,headers:base,body:JSON.stringify(data)});
    if(request.method()==="OPTIONS"){
      return route.fulfill({status:204,headers:base});
    }
    const token=request.headers().authorization?.replace(/^Bearer /,"");
    const data=request.method()==="POST"?request.postDataJSON():{};
    if(url.pathname==="/api/rooms"&&request.method()==="POST"){
      gameRoom=createFamilyRoom(code,data.name,hostToken,++now);
      return reply({ok:true,code,token:hostToken,room:familyView(gameRoom,hostToken)});
    }
    if(!gameRoom)return reply({ok:false,error:"No room"},404);
    if(url.pathname.endsWith("/join")){
      const session=data.token&&membership(gameRoom,data.token)?data.token:
        data.name==="Uncle Joe"?"d".repeat(32):"e".repeat(32);
      const joined=joinFamilyRoom(gameRoom,data.name,session,++now);
      if(!joined.ok)return reply({ok:false,error:joined.error},409);
      gameRoom=joined.room;
      return reply({ok:true,code,token:session,room:familyView(gameRoom,session)});
    }
    if(url.pathname.endsWith("/action")){
      if(data.version!==gameRoom.version)return reply({ok:false,error:"Another player moved"},409);
      const result=familyAction(gameRoom,token,data.action,++now,31);
      if(!result.ok)return reply({ok:false,error:result.error},409);
      gameRoom=result.room;
      return reply({ok:true,room:familyView(gameRoom,token)});
    }
    if(url.pathname.endsWith("/chat")){
      const result=familyChat(gameRoom,token,data.text,now+=1600,"chat"+(++messageNumber));
      if(!result.ok)return reply({ok:false,error:result.error},429);
      gameRoom=result.room;
      return reply({ok:true,room:familyView(gameRoom,token)});
    }
    if(url.pathname==="/api/rooms/"+code){
      const view=familyView(gameRoom,token);
      return view?reply({ok:true,room:view}):reply({ok:false,error:"Join first"},401);
    }
    return reply({ok:false,error:"Not found"},404);
  };
  const {context,page}=await openFamily(browser,390,true);
  await page.route("https://family.example/**",route);
  await page.getByLabel("Name at the table").fill("Mom");
  await page.getByRole("button",{name:/Create Private Family Table/}).click();
  await expect(page.getByText("Private Room")).toBeVisible();
  await expect(page.getByText("Waiting for the room creator", {exact:false})).toHaveCount(0);
  await expect(page.getByRole("button",{name:/Deal the Cards/})).toBeVisible();
  await page.getByRole("button",{name:/Deal the Cards/}).click();
  await expect(page.locator(".family-seat").getByText("Pip 🤖",{exact:true})).toBeVisible();
  await expect(page.locator(".family-card-hand .rook-card")).toHaveCount(9);
  await expect(page.getByText("Only you can see these cards")).toBeVisible();
  await page.getByLabel("Message everyone at the table").fill("Hi family! ❤️");
  await page.getByRole("button",{name:"Send Message"}).click();
  await expect(page.getByText("Hi family! ❤️")).toBeVisible();
  await page.reload();
  await page.getByRole("button",{name:"Open game menu"}).click();
  await page.getByRole("button",{name:/Cards/}).click();
  await page.getByRole("button",{name:/Play Family Rook Table/}).click();
  await expect(page.locator(".family-card-hand .rook-card")).toHaveCount(9);
  await expect(page.getByText("Hi family! ❤️")).toBeVisible();
  const invite=page.url();
  expect(invite).toContain(code);
  const second=await browser.newContext({viewport:{width:390,height:780},
    isMobile:true,hasTouch:true});
  await second.route("https://family.example/**",route);
  const guest=await second.newPage();
  await guest.goto(invite);
  await guest.getByRole("button",{name:"Open game menu"}).click();
  await guest.getByRole("button",{name:/Cards/}).click();
  await guest.getByRole("button",{name:/Play Family Rook Table/}).click();
  await guest.getByLabel("Name at the table").fill("Uncle Joe");
  await guest.getByRole("button",{name:/Pull Up a Chair/}).click();
  await expect(guest.getByText("You're watching this match.",{exact:false})).toBeVisible();
  await expect(guest.locator(".family-card-hand .rook-card")).toHaveCount(0);
  await expect(guest.getByText("Hi family! ❤️")).toBeVisible();
  await guest.getByLabel("Message everyone at the table").fill("Deal me in next hand!");
  await guest.getByRole("button",{name:"Send Message"}).click();
  await expect(guest.getByText("Deal me in next hand!")).toBeVisible();
  await second.close();
  await context.close();
});
