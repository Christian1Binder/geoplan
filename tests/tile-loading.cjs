const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
let timers=new Map(),nextTimer=0,created=0,revoked=[],images=[],networkCalls=0,decodeFailure=false;
class FakeURL extends URL {static createObjectURL(){return 'blob:test-'+(++created)}static revokeObjectURL(u){revoked.push(u)}}
const status={textContent:''},button={},tiles={querySelectorAll:()=>images};
const c=vm.createContext({URL:FakeURL,document:{getElementById:id=>({tiles,tileLoadStatus:status,reloadMapTiles:button}[id])},crypto:require('node:crypto').webcrypto,AbortController,structuredClone,Image:class{decode(){return decodeFailure?Promise.reject(Error('bad image')):Promise.resolve()}},setTimeout:(f,ms)=>{timers.set(++nextTimer,{f,ms});return nextTimer},clearTimeout:id=>timers.delete(id),fetch:async()=>{networkCalls++;throw Error('offline')},caches:{open:async()=>({match:async()=>new Response('image',{headers:{'Content-Type':'image/png'}})})}});
vm.runInContext(source.slice(0,source.lastIndexOf('\ninit();')),c);const run=s=>vm.runInContext(s,c);
function img(){const i={dataset:{tileSource:'https://tile.openstreetmap.org/1/1/1.png'},style:{},isConnected:true};images=[i];c.tile=i;return i}
(async()=>{
 const i=img();await run('loadMapTile(tile)');assert.equal(i._tileState,'retry');assert.equal(networkCalls,1);assert.ok([...timers.values()].some(t=>t.ms===1500));
 c.fetch=async(url,options)=>{networkCalls++;assert.equal(options.cache,'reload');return new Response('image',{headers:{'Content-Type':'image/png'}})};
 await run('loadMapTile(tile,true)');assert.equal(i._tileState,'loaded');assert.equal(i._tileAttempts,0);assert.equal(i.style.visibility,'');const old=i.src;
 decodeFailure=true;await run('loadMapTile(tile,true)');assert.equal(i.src,old);assert.ok(revoked.includes('blob:test-2'));decodeFailure=false;
 c.fetch=async()=>{networkCalls++;throw Error('fail')};for(let n=0;n<4;n++)await run('loadMapTile(tile,true)');assert.equal(i._tileState,'failed');assert.equal(i._tileAttempts,3);assert.equal(i.src,old);
 run('offlineEnabled=true');const before=networkCalls;await run('loadMapTile(tile)');assert.equal(networkCalls,before);assert.equal(i._tileState,'loaded');assert.equal(button.disabled,true);
 c.caches.open=async()=>({match:async()=>undefined});await run('loadMapTile(tile)');assert.equal(i._tileState,'failed');assert.equal(networkCalls,before);assert.match(status.textContent,/lokalen Cache/);
 run('offlineEnabled=false');let release;c.fetch=()=>new Promise(r=>release=r);const pending=run('loadMapTile(tile,true)');run('disposeMapTile(tile)');release(new Response('late',{headers:{'Content-Type':'image/png'}}));await pending;assert.ok(revoked.includes(i._tileBlobUrl));assert.notEqual(i._tileState,'loaded');
 console.log('PASS: bounded retries, explicit refresh, invalid-image preservation, offline zero-network loading, missing cache and stale request disposal.');
})().catch(e=>{console.error(e);process.exit(1)});
