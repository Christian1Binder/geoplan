const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const handlers={},records=new Map();let calls=0,writes=0,failNetwork=false,failCache=false,failWrites=false,html=false;
const tile=text=>new Response(text,{headers:{'Content-Type':'image/png'}});
const cache={match:async r=>records.get(r.url)?.clone(),put:async(r,v)=>{writes++;if(failWrites)throw Error('quota');records.set(r.url,v)}};
const c=vm.createContext({Request,Response,Headers,URL,AbortController,setTimeout,clearTimeout,caches:{open:async()=>{if(failCache)throw Error('private mode');return cache}},self:{addEventListener:(n,f)=>handlers[n]=f},fetch:async()=>{calls++;if(failNetwork)throw Error('network');return html?new Response('<html>error</html>',{headers:{'Content-Type':'text/html'}}):tile('fresh')}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8'),c);
async function request(url,mode='default'){let answer,background;handlers.fetch({request:new Request(url,{cache:mode,mode:'cors'}),respondWith:p=>answer=p,waitUntil:p=>background=p});let r=await answer;await background;return r}
(async()=>{
 const url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/5/10/16';
 records.set(url,tile('cached'));let r=await request(url);assert.equal(await r.text(),'cached');assert.equal(await records.get(url).clone().text(),'fresh');
 r=await request(url,'reload');assert.equal(await r.text(),'fresh');
 failNetwork=true;r=await request(url,'reload');assert.equal(await r.text(),'fresh');assert.equal(r.headers.get('X-GeoPlan-Fallback'),'1');
 records.clear();r=await request(url);assert.equal(r.status,504);assert.equal(records.size,0);
 failNetwork=false;failCache=true;r=await request(url);assert.equal(await r.text(),'fresh');failCache=false;failWrites=true;r=await request(url);assert.equal(await r.text(),'fresh');
 failWrites=false;html=true;r=await request(url);assert.equal(r.status,504);assert.equal(records.size,0);
 // Legacy opaque records cannot satisfy CORS image requests.
 records.set(url,{clone:()=>({ok:false,type:'opaque'})});html=false;r=await request(url);assert.equal(await r.text(),'fresh');
 console.log('PASS: cache revalidation, network refresh, cached fallback, cache/quota failures, rejection of HTML errors and legacy opaque CORS cache.');
})().catch(e=>{console.error(e);process.exit(1)});
