// Run with: node tests/map-layers.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({URL, crypto: require('node:crypto').webcrypto});
vm.runInContext(script.slice(0, script.lastIndexOf('\ninit();')), context);
vm.runInContext(`
state.mapLayers=[{id:'legacy',provider:'hybrid',visible:true,opacity:0.8}];
normalizeMapLayers();
`, context);
assert.equal(vm.runInContext('state.mapLayers.map(l=>l.provider).join(",")', context), 'sat,osm');
assert.equal(vm.runInContext('state.mapLayers[1].opacity', context), 0.8 * 0.43);
vm.runInContext('normalizeMapLayers()', context);
assert.equal(vm.runInContext('state.mapLayers.length', context), 2);
for (const z of [0, 7, 19, 20]) {
 const n=2**z, x=Math.floor(n*0.565), y=Math.floor(n*0.32);
 const pl=new URL(vm.runInContext(`mapTileUrl(PROVIDERS.poland.url,${z},${x},${y})`,context));
 const lt=new URL(vm.runInContext(`mapTileUrl(PROVIDERS.lithuania.url,${z},${x},${y})`,context));
 assert.equal(pl.searchParams.get('BBOX'),lt.searchParams.get('bbox'));
 const [west,south,east,north]=pl.searchParams.get('BBOX').split(',').map(Number);
 assert.ok(east>west && north>south);
 assert.ok(Math.abs((east-west)-(north-south))<1e-7);
 assert.equal(pl.searchParams.get('CRS'),'EPSG:3857');
 assert.equal(lt.searchParams.get('imageSR'),'3857');
 assert.equal(pl.searchParams.get('TRANSPARENT'),'TRUE');
 assert.equal(lt.searchParams.get('transparent'),'true');
}
console.log('PASS: legacy migration is stable; both national maps use identical geographic bounds and transparent images at every tested zoom.');
const row={dataset:{mapLayer:'lt'},querySelector:()=>output};
const output={textContent:''},holder={dataset:{mapLayer:'lt'},style:{opacity:'1'}};
const list={innerHTML:''},tiles={children:[holder]};
context.document={getElementById:id=>id==='mapLayerList'?list:id==='tiles'?tiles:null};
context.testRow=row;
context.testInput={value:'40',title:'',closest:()=>row,matches:()=>true};
vm.runInContext(`state.mapLayers=[{id:'pl',provider:'poland',visible:true,opacity:1},{id:'lt',provider:'lithuania',visible:true,opacity:1}];renderMapLayers()`,context);
assert.ok(list.innerHTML.indexOf('data-map-layer="lt"')<list.innerHTML.indexOf('data-map-layer="pl"'));
vm.runInContext('renderStatus=()=>{};changed=()=>{};renderTiles=()=>{throw Error("Slider must not reload tiles")};mapLayerAction({target:testInput})',context);
assert.equal(holder.style.opacity,.4);
assert.equal(output.textContent,'40 %');
context.testDown={closest:()=>row,matches:()=>false,dataset:{mapAction:'down'}};
vm.runInContext('mapLayerAction({target:testDown})',context);
assert.equal(vm.runInContext('state.mapLayers.map(l=>l.id).join(",")',context),'lt,pl');
console.log('PASS: visual list is front-to-back, moving backwards updates drawing order, opacity updates without replacing tiles.');
