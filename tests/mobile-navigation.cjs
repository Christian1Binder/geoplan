const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const elements=new Map(),captures=new Set();
function element(id){if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},focus(){},getBoundingClientRect:()=>({left:10,top:52,width:390,height:600}),setPointerCapture:id=>captures.add(id),releasePointerCapture:id=>captures.delete(id),hasPointerCapture:id=>captures.has(id)});return elements.get(id)}
const context=vm.createContext({document:{getElementById:element,querySelectorAll:()=>[],querySelector:()=>element('searchWrap'),body:element('body')},crypto:require('node:crypto').webcrypto,structuredClone,setTimeout,clearTimeout,matchMedia:()=>({matches:true})});
vm.runInContext(source.slice(0,source.lastIndexOf('\ninit();')),context);
const run=s=>vm.runInContext(s,context);
run(`renderAll=()=>{};renderTiles=()=>{};renderOverlay=()=>{};renderStatus=()=>{};renderPresentation=()=>{};setHint=()=>{};inspectPlanTarget=()=>{inspections++};let inspections=0;state.projectFolders=[];state.mapLayers=[];state.types=[{id:'t',shape:'rectangle'}];state.objects=[{id:'a',typeId:'t',lat:50,lon:10,length:10,width:10,rotation:0,layerId:'plan'}];mobileView=true;
const blank={closest:()=>null},object={closest:s=>s.includes('[data-object]')?{dataset:{object:'a'}}:null},button={closest:s=>s.includes('button')?{}:null};
function event(type,id,x,y,target=blank){return{type,pointerId:id,pointerType:'touch',clientX:x,clientY:y,button:0,target,detail:1,preventDefault(){},stopImmediatePropagation(){}}}
function touch(type,id,x,y,target){handleTouch(event(type,id,x,y,target))}`);
// Dragging across an object in view mode must move only the map.
run("let original=JSON.stringify(state.objects);touch('pointerdown',1,100,150,object);touch('pointermove',1,160,180,object)");
assert.equal(run('JSON.stringify(state.objects)===original'),true);
assert.equal(run('drag.kind'),'map');
run("touch('pointerup',1,160,180,object)");assert.equal(run('touchPoints.size'),0);assert.equal(captures.size,0);
// A second finger cancels the single drag, zooms around the midpoint, and pans.
run("touchClickUntil=0;state.center=[50,10];state.zoom=12;touch('pointerdown',1,100,200);touch('pointerdown',2,200,200);let oldCenter=JSON.stringify(state.center);touch('pointermove',2,310,240)");
assert.equal(run('state.zoom'),13);assert.notEqual(run('JSON.stringify(state.center)'),run('oldCenter'));
run("touch('pointerup',2,310,240)");assert.equal(run('drag.kind'),'map');assert.equal(run('touchPoints.size'),1);
run("let afterPinch=JSON.stringify(state.center);touch('pointermove',1,125,210)");assert.notEqual(run('JSON.stringify(state.center)'),run('afterPinch'));
run("touch('pointercancel',1,125,210)");assert.equal(run('touchPoints.size'),0);assert.equal(run('drag'),null);assert.equal(captures.size,0);
// Taps open information once; synthetic clicks after a drag/pinch cannot edit.
run("touchClickUntil=0;touch('pointerdown',1,100,150,object);touch('pointerup',1,100,150,object)");assert.equal(run('inspections'),1);
run("mapClick(event('click',1,100,150,object))");assert.equal(run('inspections'),1);
// Buttons never add measurement points, while ordinary taps still do.
run("mobileView=false;mode='distance';draft=[];touchClickUntil=0;mapClick(event('click',1,30,80,button))");assert.equal(run('draft.length'),0);
run("mapClick(event('click',1,30,80,blank))");assert.equal(run('draft.length'),1);
// Wheel events are accumulated; horizontal motion does not zoom.
run("state.zoom=12;wheelZoom({deltaY:0,deltaX:100,preventDefault(){}})");assert.equal(run('state.zoom'),12);
run("for(let i=0;i<6;i++)wheelZoom({deltaY:-10,deltaMode:0,clientX:100,clientY:200,preventDefault(){}})");assert.equal(run('state.zoom'),12);
run("wheelZoom({deltaY:-10,deltaMode:0,clientX:100,clientY:200,preventDefault(){}})");assert.equal(run('state.zoom'),13);
// Zoom anchor remains geographically exact even at high latitude.
run("state.center=[75,10];state.zoom=8;let before=geo(70,110);zoomAt(1,80,162);let after=geo(70,110)");
assert.ok(run('Math.abs(before[0]-after[0])<1e-9&&Math.abs(before[1]-after[1])<1e-9'));
// Interrupted edits roll back when another finger begins navigation.
run("mode='select';history=[JSON.stringify(state)];let restored=0;restore=()=>{restored++;drag=null};touch('pointerdown',1,100,150,object);drag={kind:'move-selection',moved:true};touch('pointerdown',2,200,150,object)");assert.equal(run('restored'),1);
run('resetTouchGesture()');assert.equal(captures.size,0);
// Viewer state never leaks into serialized project data.
assert.equal(run("JSON.stringify(state).includes('mobileView')"),false);
assert.match(html,/id="mobileOpenBtn"/);assert.match(html,/id="finishMeasureBtn"/);
console.log('PASS: safe view gestures, pinch/pan transitions, cancellation, tap suppression, control isolation, wheel damping, exact zoom anchors and edit rollback.');
