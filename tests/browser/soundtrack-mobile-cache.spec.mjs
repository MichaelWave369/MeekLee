import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";

const source=JSON.parse(readFileSync("scripts/original-soundtrack.json","utf8"));
const complete={version:1,tracks:source.tracks.map(t=>({
  slot:t.slot,name:t.name,path:"audio/"+t.file,bytes:t.size,sha256:t.sha256
}))};

test("320px phone recovers from an old empty manifest without deleting saved games",async({browser})=>{
  const context=await browser.newContext({
    viewport:{width:320,height:780},isMobile:true,hasTouch:true,
    deviceScaleFactor:2,reducedMotion:"reduce"
  });
  const page=await context.newPage();
  const urls=[];
  let responses=0;
  await page.route("**/audio/manifest.json*",route=>{
    urls.push(route.request().url());
    responses++;
    return route.fulfill({
      status:200,contentType:"application/json",
      body:JSON.stringify(responses===1?{version:1,tracks:[]}:complete)
    });
  });
  await page.addInitScript(()=>{
    if(!localStorage.getItem("meeklee-adventures-save-v1"))
      localStorage.setItem("meeklee-adventures-save-v1",
        JSON.stringify({settings:{easy:true,motion:false},
          easyProgress:{harvest:6001},collection:{villageSeason:"winter"}}));
  });
  await page.goto("./");
  await expect.poll(()=>responses).toBe(1);
  await expect(page.getByRole("button",{name:"Play soundtrack"})).toBeDisabled();
  await page.locator(".soundtrack-library summary").click();
  const refresh=page.locator("[data-soundtrack-refresh]");
  await expect(refresh).toBeVisible();
  await refresh.click();
  await expect.poll(()=>responses).toBe(2);
  await expect(page.getByRole("button",{name:"Play soundtrack"})).toBeEnabled();
  await expect(page.locator("[data-soundtrack-status]")).toContainText("Eight original songs included");
  await expect(page.locator("[data-soundtrack-play]")).toHaveCount(8);
  await expect(page.getByText(/8\/8 loaded/)).toBeVisible();
  expect(urls[0]).toContain("/MeekLee/audio/manifest.json?refresh=");
  expect(urls[1]).toContain("/MeekLee/audio/manifest.json?refresh=");
  expect(urls[1]).not.toBe(urls[0]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const state=await page.evaluate(()=>JSON.parse(
    localStorage.getItem("meeklee-adventures-save-v1")));
  expect(state.easyProgress.harvest).toBe(6001);
  expect(state.collection.villageSeason).toBe("winter");
  await context.close();
});

test("online music metadata changes do not download all songs or start playing automatically",async({browser})=>{
  const context=await browser.newContext({
    viewport:{width:390,height:780},isMobile:true,hasTouch:true
  });
  const page=await context.newPage();
  let mp3Requests=0;
  await page.route("**/audio/manifest.json*",route=>route.fulfill({
    status:200,contentType:"application/json",body:JSON.stringify(complete)
  }));
  await page.route("**/audio/*.mp3",route=>{
    mp3Requests++;
    return route.abort();
  });
  await page.goto("./");
  await expect(page.getByRole("button",{name:"Play soundtrack"})).toBeEnabled();
  await page.locator(".soundtrack-library summary").click();
  await page.locator("[data-soundtrack-refresh]").click();
  await expect(page.locator("[data-soundtrack-play]")).toHaveCount(8);
  expect(mp3Requests).toBe(0);
  expect(await page.locator("[data-soundtrack-audio]").evaluate(el=>el.paused)).toBe(true);
  await context.close();
});
