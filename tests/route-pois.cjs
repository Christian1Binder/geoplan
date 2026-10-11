const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const script=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const c=vm.createContext({crypto:require('node:crypto').webcrypto,URLSearchParams,AbortSignal});vm.runInContext(script.slice(0,script.lastIndexOf('\ninit();')),c);
const run=s=>vm.runInContext(s,c);
(async()=>{
 let calls=0;c.fetch=async()=>({ok:true,json:async()=>++calls===1?{remark:'timeout',elements:[]}:{elements:[{type:'node',lat:49.4,lon:11,tags:{highway:'services'}}]}});
 assert.equal((await run("routePoiData('test')")).elements.length,1);assert.equal(calls,2);
 await run("routePoiData('test')");assert.equal(calls,2,'repeat should use cached data');
 c.fetch=async()=>{calls++;throw Error('network')};await assert.rejects(run("routePoiData('other')"),/Bereits geladene/);let last=calls;
 await assert.rejects(run("routePoiData('other')"),/Minute/);assert.equal(calls,last,'failed services should get a cooldown');
 console.log('PASS: incomplete responses fall back, successful POIs are cached, network failures produce German guidance and are rate-limited.');
})().catch(e=>{console.error(e);process.exit(1)});
