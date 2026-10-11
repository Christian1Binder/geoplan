const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',disabled:false,getBoundingClientRect:()=>({width:900,height:650})});return elements.get(id)};
const c=vm.createContext({document:{getElementById:el},crypto:require('node:crypto').webcrypto,AbortSignal,URLSearchParams,URL,setTimeout,clearTimeout,structuredClone,fetch:async()=>{throw Error('Unexpected network request')}});
vm.runInContext(source.slice(0,source.lastIndexOf('\ninit();')),c);
vm.runInContext('changed=()=>{};renderAll=()=>{};renderOverlay=()=>{};renderStatus=()=>{}',c);
const run=s=>vm.runInContext(s,c);
(async()=>{
 assert.deepEqual(Array.from(await run("geocodeRouteInput('49.49, 10.79')")),[49.49,10.79]);
 await assert.rejects(run("geocodeRouteInput('95, 10')"),/Koordinaten/);
 const urls=[];c.fetch=async url=>{urls.push(url);const coords=url.split('/driving/')[1].split('?')[0].split(';').map(p=>p.split(',').map(Number));return{ok:true,json:async()=>({code:'Ok',routes:[{geometry:{coordinates:coords},distance:1000,duration:100},{geometry:{coordinates:[coords[0],[coords[0][0]+.01,coords[0][1]+.01],coords[1]]},distance:1200,duration:120}]})}};
 run("state.routePlan={start:'49,10',via:['50,11'],end:'51,12',vehicle:'car'}");await run('calculateRoute()');
 assert.equal(urls.length,2);assert.ok(urls.every(u=>u.includes('alternatives=true')));
 assert.equal(run('route.alternatives.length'),3);
 assert.ok(run('route.alternatives.every(r=>r.points.some(p=>p[0]===50&&p[1]===11))'));
 assert.equal(run('route.distance'),2000);run('chooseRoute(1)');assert.equal(run('route.selected'),1);assert.equal(run('route.distance'),2200);
 assert.ok(run('JSON.parse(projectData()).route.alternatives.length===3'));
 run('routeChanged()');assert.equal(run('state.route'),null);
 // A reply from a project that has since been closed must never overwrite the new project.
 let release;c.fetch=()=>new Promise(r=>release=()=>r({ok:true,json:async()=>({code:'Ok',routes:[{geometry:{coordinates:[[10,49],[12,51]]},distance:1,duration:1}]})}));
 const pending=run('calculateRoute()');await new Promise(r=>setImmediate(r));run('state={...state,route:null}');release();await pending;assert.equal(run('state.route'),null);
 // No-route responses are actionable and release the busy button.
 c.fetch=async()=>({ok:true,json:async()=>({code:'NoRoute'})});await run('calculateRoute()');assert.match(el('routeStatus').textContent,/Keine befahrbare Verbindung/);assert.equal(el('routeBtn').disabled,false);
 console.log('PASS: coordinate validation, ordered intermediate stops in every alternative, switching, persistence, stale-response protection and routing errors.');
})().catch(e=>{console.error(e);process.exit(1)});
