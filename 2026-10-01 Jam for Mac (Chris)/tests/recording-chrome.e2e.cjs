const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(process.env.RECORDING_TEST_URL||'http://127.0.0.1:8765/?surface=recording');await p.waitForFunction(()=>window.JamRecording);
await p.emulateMedia({reducedMotion:'reduce'});
await p.evaluate(()=>{JamRecording.updateSettings({camera:false,oneClick:true,pickerStart:'window'});JamRecording.setMode('window');JamRecording.setSafariState('connected');JamRecording.setChromeState('missing');});
const state=()=>p.evaluate(()=>JamRecording.getState()),chrome=()=>p.evaluate(()=>JamRecording.getChromeState());
const row=p.locator('.rb-selection-notch .rb-notch-logs-restart'),label=row.locator('.rb-notch-logs-restart-label'),browser=p.locator('[data-window="browser"]'),tooltip=p.locator('.rb-tooltip');
const bb=await browser.boundingBox(),point={x:bb.x+bb.width-60,y:bb.y+bb.height-40};
const hover=async()=>{await p.mouse.move(point.x-4,point.y-4);await p.mouse.move(point.x,point.y);await p.waitForTimeout(80);};
// Choosing Chrome's state shows Chrome, and without the extension the card offers to install it
assert.equal(await p.evaluate(()=>JamRecording.getBrowserApp()),'chrome');
await hover();
assert.equal((await state()).target,'browser');assert.equal(await p.locator('.rb-picker-name').textContent(),'Chrome');assert.equal(await label.textContent(),'Install Extension for logs');
await row.hover();await tooltip.waitFor({state:'visible'});
assert.equal(await tooltip.textContent(),'Add Jam to Chrome to capture console logs and network requests');
// Installing opens Jam's listing in a new Chrome Web Store tab, and the window becomes clickable
await row.click();
assert.equal(await p.locator('.ch-tab[aria-selected="true"]').getAttribute('data-tab'),'store');
assert.equal(await p.locator('.ch-url').textContent(),'chromewebstore.google.com/detail/jam');
assert.ok(await p.locator('.ch-store').isVisible());assert.ok(await p.locator('.rb-browser-content').isHidden());
assert.equal((await state()).target,null,'the card steps aside for the store');
assert.ok(await p.locator('.rb-window-picker[data-picker="browser"]').isHidden());
// Chrome asks before adding it, and cancelling changes nothing
await p.locator('.ch-store-add').click();assert.ok(await p.locator('.ch-dialog').isVisible());
await p.locator('.ch-dialog [data-choice="cancel"]').click();
assert.ok(await p.locator('.ch-dialog').isHidden());assert.equal(await chrome(),'missing');
await p.locator('.ch-store-add').click();await p.locator('.ch-dialog [data-choice="add"]').click();
assert.equal(await chrome(),'connected');assert.equal(await p.locator('.rb-belt-toast-label').textContent(),'Logs enabled for Chrome');
assert.equal((await p.locator('.ch-store-add').textContent()).trim(),'Remove from Chrome');
assert.ok(await p.locator('.ch-pinned').isVisible(),'Jam is pinned in the toolbar');
await p.waitForFunction(()=>!document.querySelector('.recording-scene[data-browser-guide="true"]'));
await hover();assert.equal(await p.locator('.rb-selection-notch .rb-notch-logs-label').textContent(),'Logs enabled');
// Each browser shows its own pages: Safari's guide tab doesn't blank Chrome's window
await p.evaluate(()=>{JamRecording.setSafariState('permission');JamRecording.setSafariTab('guide');JamRecording.setBrowserApp('chrome');JamRecording.setChromeTab('design');});
assert.ok(await p.locator('.rb-browser-content').isVisible());assert.ok(await p.locator('.sf-guide').isHidden());
// Full screen lists Chrome as not installed, without a switch to turn on
await p.evaluate(()=>{JamRecording.setChromeState('missing');JamRecording.setMode('screen');});
await p.mouse.move(700,420);await p.mouse.move(720,430);await p.waitForTimeout(80);
await p.locator('.rb-picker-sources').click();
const item=p.locator('.rb-source[data-source="browser"]');
assert.equal(await item.getAttribute('aria-disabled'),'true');assert.equal(await item.locator('.rb-source-detail').textContent(),'Not installed');
// The menu bar status offers each browser's missing step
await p.locator('.sf-menubar-button').click();
assert.deepEqual(await p.locator('.sf-status-menu [data-action]').allTextContents(),['Install Chrome Extension…','Allow Jam in Safari…']);
await p.locator('.sf-status-menu [data-action="chrome"]').click();
assert.equal(await p.evaluate(()=>JamRecording.getSettings().mode),'window');assert.ok(await p.locator('.ch-store').isVisible());
assert.deepEqual(errors,[]);
await b.close();console.log('recording-chrome: ok');})().catch(e=>{console.error(e);process.exit(1);});
