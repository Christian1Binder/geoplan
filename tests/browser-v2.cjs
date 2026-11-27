// npm install --no-save playwright && npx playwright install chromium && node tests/browser-v2.cjs
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file))});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});try{
 const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true,serviceWorkers:'block'});
 const tile='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#1f8250"/></svg>';
 await context.route('https://**/*',r=>r.fulfill({status:200,contentType:'image/svg+xml',headers:{'Access-Control-Allow-Origin':'*'},body:tile}));
 const requests=[];context.on('request',q=>requests.push({url:q.url(),body:q.postData()||''}));const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.locator('#v2ExportBtn').waitFor();
 assert.match(await page.title(),/GeoPlan 2\.1/);
 await page.locator('#v2PaletteSearch').fill('Container');
 assert.equal(await page.locator('#palette .tool').count(),1);
 await page.locator('#palette .v2-star').click();assert.equal(await page.locator('#palette .v2-star').getAttribute('aria-pressed'),'true');
 await page.locator('#palette .tool').click();
 const box=await page.locator('#map').boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await page.waitForFunction(()=>JSON.parse(projectData()).objects.length===1);
 // Individual label settings must survive the project JSON, while export choices are transient.
 await page.locator('[data-v2-right="properties"]').click();
 await page.locator('#v21-object-labelName').selectOption('false');
 assert.equal(await page.evaluate(()=>state.objects[0].labelName),false);
 await page.evaluate(()=>{state.objects[0].description='Local description';changed()});
 await page.locator('#v21-object-labelDescription').selectOption('true');
 assert.equal(await page.evaluate(()=>state.objects[0].labelDescription),true);
 assert.equal(await page.evaluate(()=>planSvg(false).includes('Local description')),true);
 assert.equal(await page.evaluate(()=>planSvg(false).includes('>Container</text>')),false);
 await page.locator('[data-tab="route"]').click();assert.ok(await page.locator('#routeStart').isVisible());
 await page.locator('[data-tab="library"]').click();
 await page.locator('#leftPanelBtn').click();assert.ok(await page.locator('#appLayout').evaluate(e=>e.classList.contains('v2-hide-left')));await page.locator('#leftPanelBtn').click();
 await page.locator('.v2-map-quick').click();assert.ok(await page.locator('#mapLayerList').isVisible());
 await page.locator('#v2ExportBtn').click();
 await page.waitForFunction(()=>document.getElementById('v2ExportStatus')?.textContent.includes('Vorschau vollständig'),{},{timeout:30000});
 await page.locator('#v21LabelMode').selectOption('manual');
 await page.locator('#v21LabelList input[data-v21-field="labelName"]').check();
 await page.locator('#v21LabelList input[data-v21-field="labelDescription"]').uncheck();
 await page.locator('#v2PreviewBtn').click();
 await page.waitForFunction(()=>document.getElementById('v2ExportStatus')?.textContent.includes('Vorschau vollständig'),{},{timeout:30000});
 assert.equal(await page.evaluate(()=>state.objects[0].labelName),false);
 assert.equal(await page.evaluate(()=>state.objects[0].labelDescription),true);
 await page.locator('#v21LabelMode').selectOption('none');
 await page.locator('#v2PreviewBtn').click();
 await page.waitForFunction(()=>document.getElementById('v2ExportStatus')?.textContent.includes('Vorschau vollständig'),{},{timeout:30000});
 const sample=await page.locator('#v2PreviewImage canvas').evaluate(c=>Array.from(c.getContext('2d').getImageData(150,150,1,1).data));
 assert.deepEqual(sample,[31,130,80,255],'export must contain the map background');
 let download=page.waitForEvent('download');await page.locator('#v2DownloadBtn').click();let d=await download;assert.match(d.suggestedFilename(),/\.png$/);assert.equal(fs.readFileSync(await d.path()).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 await page.locator('#v2Format').selectOption('pdf');await page.locator('#v2PreviewBtn').click();await page.waitForFunction(()=>document.getElementById('v2ExportStatus')?.textContent.includes('Vorschau vollständig'),{},{timeout:30000});
 download=page.waitForEvent('download');await page.locator('#v2DownloadBtn').click();d=await download;assert.match(d.suggestedFilename(),/\.pdf$/);const pdf=fs.readFileSync(await d.path());assert.equal(pdf.subarray(0,8).toString(),'%PDF-1.4');assert.match(pdf.toString('latin1'),/startxref/);
 // A display-only map must not silently produce an apparently complete export.
 await page.evaluate(()=>{v2ReadTile=async()=>{throw Error('CORS test')};document.querySelectorAll('#tiles img').forEach(i=>i.dataset.tileDisplayOnly='true')});
 await page.locator('#v2Format').selectOption('png');await page.locator('#v2PreviewBtn').click();
 await page.waitForFunction(()=>document.getElementById('v2ExportStatus')?.textContent.includes('Kachel(n) fehlen'),{},{timeout:30000});
 assert.equal(await page.locator('#v2DownloadBtn').isDisabled(),true);await page.locator('#v2AllowIncomplete').check();assert.equal(await page.locator('#v2DownloadBtn').isDisabled(),false);
 await page.locator('#v2ExportDialog [data-close]').first().click();
 // Create a private library type through the actual editor, then restart and decline project recovery.
 await page.evaluate(()=>showTypeEditor('new'));
 await page.locator('#typeName').fill('PRIVATE_TEST_MARKER_21');
 await page.locator('#saveTypeBtn').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('geoplan-private-library-v1')||'null')?.types.some(t=>t.name==='PRIVATE_TEST_MARKER_21'));
 await page.locator('#closeLibraryDialog').click();
 assert.equal(await page.evaluate(async()=>{try{await fetch('https://example.com/PRIVATE_TEST_MARKER_21');return false}catch{return true}}),true);
 assert.equal(requests.some(q=>q.url.includes('PRIVATE_TEST_MARKER_21')||q.body.includes('PRIVATE_TEST_MARKER_21')),false);
 await page.reload();
 await page.locator('#actionDialog button[value="cancel"]').waitFor();
 await page.locator('#actionDialog button[value="cancel"]').click();
 await page.waitForFunction(()=>state.types.some(t=>t.name==='PRIVATE_TEST_MARKER_21'));
 assert.equal(await page.evaluate(()=>state.objects.length),0);
 await page.locator('#v2PaletteSearch').fill('PRIVATE_TEST_MARKER_21');
 assert.equal(await page.locator('#palette .tool').count(),1);
 await page.setViewportSize({width:820,height:1180});await page.locator('#leftPanelBtn').click();assert.ok(await page.locator('.panel.left').isVisible());await page.locator('#rightPanelBtn').click();assert.ok(await page.locator('.panel.right').isVisible());assert.equal(await page.locator('.panel.left').isVisible(),false);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);assert.ok(await page.locator('.top').evaluate(e=>e.scrollWidth<=e.clientWidth+2),'phone header must fit');
 assert.deepEqual(errors,[]);console.log('PASS: UI, library search and favorites, individual labels and export overrides, private library persistence after restart, CSP and network isolation, responsive panels, map pixels in PNG and direct PDF download.');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
