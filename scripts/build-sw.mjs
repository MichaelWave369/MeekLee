import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

// Generate a self-contained offline cache from the actual Vite output filenames.
const root = "dist";
async function listFiles(folder) {
  let result = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) result = result.concat(await listFiles(path));
    else if (entry.isFile() && entry.name !== "sw.js") {
      const url = "./" + relative(root, path).split("\\").join("/");
      // The soundtrack manifest MUST stay fresh across mobile app updates.
      // Neither the full MP3s nor the changing manifest belong in the app shell.
      if (url !== "./audio/manifest.json" &&
          (!url.startsWith("./audio/") || !url.endsWith(".mp3"))) result.push(url);
    }
  }
  return result;
}
const files = (await listFiles(root)).sort();
if (!files.includes("./index.html")) throw new Error("Missing index.html");
const hash = createHash("sha256");
for (const file of files) {
  hash.update(file);
  hash.update(await readFile(join(root, file)));
}
const version = hash.digest("hex").slice(0, 14);
const output = [
  "// Auto-generated offline shell. No payments, analytics, or network services.",
  "const CACHE = " + JSON.stringify("meeklee-adventures-" + version) + ";",
  "const FILES = " + JSON.stringify(files) + ";",
  "const BASE = new URL('./', self.location.href);",
  "self.addEventListener('install', event => {",
  "  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new URL(file, BASE).href))).then(() => self.skipWaiting()));",
  "});",
  "self.addEventListener('activate', event => {",
  "  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('meeklee-adventures-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));",
  "});",
  "self.addEventListener('fetch', event => {",
  "  const request = event.request;",
  "  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;",
  "  // Do not intercept soundtrack metadata or MP3 streaming; old manifests may list zero songs.",
  "  const audioPath = new URL(request.url).pathname;",
  "  if (audioPath.endsWith('/audio/manifest.json') || (audioPath.includes('/audio/') && audioPath.endsWith('.mp3'))) return;",
  "  if (request.mode === 'navigate') {",
  "    event.respondWith(fetch(request).then(response => {",
  "      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); }",
  "      return response;",
  "    }).catch(async () => (await caches.match(request)) || (await caches.match(new URL('./index.html', BASE).href))));",
  "  } else {",
  "    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {",
  "      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); }",
  "      return response;",
  "    })));",
  "  }",
  "});"
].join("\n") + "\n";
await writeFile(join(root, "sw.js"), output);
console.log("Offline shell:", files.length, "files, revision", version);
