const TILE_CACHE='lageplaner-tiles-v1';

self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

// Kartenkacheln werden cache-first ausgeliefert. So bleiben zuvor gespeicherte
// Kartenausschnitte auch ohne Netzverbindung sichtbar.
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  const isTile=url.hostname==='tile.openstreetmap.org'||url.hostname==='server.arcgisonline.com';
  if(!isTile)return;
  event.respondWith(caches.open(TILE_CACHE).then(async cache=>{
    const stored=await cache.match(event.request);
    if(stored)return stored;
    try{const response=await fetch(event.request);cache.put(event.request,response.clone());return response}
    catch{return new Response('',{status:504,statusText:'Kartenkachel nicht offline gespeichert'})}
  }));
});
