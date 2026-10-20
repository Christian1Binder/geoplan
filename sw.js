const TILE_CACHE='lageplaner-tiles-v1';
const TILE_HOSTS=['tile.openstreetmap.org','server.arcgisonline.com','mapy.geoportal.gov.pl','www.geoportal.lt'];
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

// Cached tiles remain usable while a fresh copy is requested. Cache failures
// must never prevent an online image from being delivered.
async function tileCache(){try{return await caches.open(TILE_CACHE)}catch{return null}}
function readableTile(response,request){return response&&((response.ok&&/^(image\/|application\/octet-stream)/i.test(response.headers.get('Content-Type')||''))||(request.mode==='no-cors'&&response.type==='opaque'))}
async function cachedTile(cache,request){try{const r=await cache?.match(request);return readableTile(r,request)?r:null}catch{return null}}
async function networkTile(request,cache){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(new Request(request,{signal:controller.signal}));
  if(!readableTile(response,request))throw Error('Kartenquelle antwortet mit '+response.status);
  if(cache)try{await cache.put(request,response.clone())}catch{}
  return response;
 }finally{clearTimeout(timeout)}
}
function staleTile(response){
 if(response.type==='opaque')return response;
 const headers=new Headers(response.headers);headers.set('X-GeoPlan-Fallback','1');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||!TILE_HOSTS.includes(new URL(event.request.url).hostname))return;
 const cachePromise=tileCache(),storedPromise=cachePromise.then(c=>cachedTile(c,event.request));
 const freshPromise=cachePromise.then(c=>networkTile(event.request,c));
 // Keep revalidation alive even after responding from cache, and consume failures.
 event.waitUntil(freshPromise.then(()=>{},()=>{}));
 event.respondWith((async()=>{
  const stored=await storedPromise;
  if(stored&&event.request.cache!=='reload')return stored;
  try{return await freshPromise}catch{return stored?staleTile(stored):new Response('',{status:504,statusText:'Kartenquelle nicht erreichbar'})}
 })());
});
