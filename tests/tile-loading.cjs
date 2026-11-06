const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
let timers=new Map(),nextTimer=0,created=0,revoked=[],images=[],networkCalls=0,decodeFailure=false,directFailure=true,directCalls=0; 
class FakeURL extends URL {static createObjectURL(){return 'blob:test-'+(++created)}static revokeObjectURL(u){revoked.push(u)}}
const status={textContent:''},button={},tiles={querySelectorAll:()=>images};
const c=vm.createContext({URL:FakeURL,document:{getElementById:id=>({tiles,tileLoadStatus:status,reloadMapTiles:button}[id])},crypto:require('node:crypto').webcrypto,AbortController,structuredClone,location:{href:'https://christian1binder.github.io/geoplan/'},Image:class{constructor(){this.naturalWidth=256}set src(value){this._src=value;if(value.startsWith('https:')){directCalls++;queueMicrotask(()=>directFailure?this.onerror?.():this.onload?.())}}decode(){return decodeFailure?Promise.reject(Error('bad image')):Promise.resolve()}},setTimeout:(f,ms)=>{timers.set(++nextTimer,{f,ms});return nextTimer},clearTimeout:id=>timers.delete(id),fetch:async()=>{networkCalls++;throw Error('offline')},caches:{open:async()=>({match:async()=>new Response('image',{headers:{'Content-Type':'image/png'}})})}});
vm.runInContext(source.slice(0,source.lastIndexOf('\ninit();')),c);const run=s=>vm.runInContext(s,c);
function img(){const i={dataset:{tileSource:'https://tile.openstreetmap.org/1/1/1.png'},style:{},isConnected:true,removeAttribute(){}};images=[i];c.tile=i;return i}
(async()=>{
 const i=img();await run('loadMapTile(tile)');assert.equal(i._tileState,'retry');assert.equal(networkCalls,1);assert.ok([...timers.values()].some(t=>t.ms===1500));
 c.fetch=async(url,options)=>{networkCalls++;assert.equal(options.cache,'reload');return new Response('image',{headers:{'Content-Type':'image/png'}})};
 await run('loadMapTile(tile,true)');assert.equal(i._tileState,'loaded');assert.equal(i._tileAttempts,0);assert.equal(i.style.visibility,'');const old=i.src;
 decodeFailure=true;await run('loadMapTile(tile,true)');assert.equal(i.src,old);assert.ok(revoked.includes('blob:test-2'));decodeFailure=false;
 c.fetch=async()=>{networkCalls++;throw Error('fail')};for(let n=0;n<4;n++)await run('loadMapTile(tile,true)');assert.equal(i._tileState,'failed');assert.equal(i._tileAttempts,3);assert.equal(i.src,old);
 run('offlineEnabled=true');const before=networkCalls;await run('loadMapTile(tile)');assert.equal(networkCalls,before);assert.equal(i._tileState,'loaded');assert.equal(button.disabled,true);
 c.caches.open=async()=>({match:async()=>undefined});await run('loadMapTile(tile)');assert.equal(i._tileState,'failed');assert.equal(networkCalls,before);assert.match(status.textContent,/lokalen Cache/);
 run('offlineEnabled=false');let release;c.fetch=()=>new Promise(r=>release=r);const pending=run('loadMapTile(tile,true)');run('disposeMapTile(tile)');release(new Response('late',{headers:{'Content-Type':'image/png'}}));await pending;assert.ok(revoked.includes(i._tileBlobUrl));assert.notEqual(i._tileState,'loaded');
 directFailure=false;c.fetch=async()=>{networkCalls++;throw TypeError('CORS blocked')};i.isConnected=true;await run('loadMapTile(tile,true)');assert.equal(i._tileState,'loaded');assert.equal(i.dataset.tileDisplayOnly,'true');assert.ok(i.src.startsWith('https:'));assert.match(status.textContent,/ohne Export/);
 run('directTileImages=true');const callsBefore=networkCalls;await run('loadMapTile(tile,true)');assert.equal(networkCalls,callsBefore);assert.equal(i.dataset.tileDisplayOnly,'true');
 run('directTileImages=false');directFailure=true;i.dataset.tileSource='https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/5/10/16';
 const hosts=[];c.fetch=async url=>{hosts.push(new URL(url).hostname);if(hosts.length===1)throw TypeError('host unreachable');return new Response('image',{headers:{'Content-Type':'image/jpeg'}})};
 await run('loadMapTile(tile,true)');assert.equal(i._tileState,'loaded');assert.equal(i.dataset.tileDisplayOnly,'false');assert.deepEqual(hosts,['services.arcgisonline.com','server.arcgisonline.com']);
 const directBefore=directCalls;c.fetch=async()=>new Response('',{status:403});await run('loadMapTile(tile,true)');assert.equal(i._tileState,'failed');assert.equal(directCalls,directBefore);assert.match(i.dataset.tileError,/403/);
 console.log('PASS: bounded retries, explicit refresh, invalid-image preservation, offline zero-network loading, missing cache and stale request disposal, automatic direct-image fallback and explicit compatibility mode.');
})().catch(e=>{console.error(e);process.exit(1)});
