const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(process.env.RECORDING_TEST_URL||'http://127.0.0.1:8765/?surface=recording');await p.waitForFunction(()=>window.JamRecording);
await p.emulateMedia({reducedMotion:'reduce'});
await p.evaluate(()=>{JamRecording.updateSettings({camera:false,oneClick:true,pickerStart:'window'});JamRecording.setMode('window');JamRecording.resetSafari();});
const state=()=>p.evaluate(()=>JamRecording.getState()),safari=()=>p.evaluate(()=>JamRecording.getSafariState());
const row=p.locator('.rb-selection-notch .rb-notch-logs-restart'),label=row.locator('.rb-notch-logs-restart-label'),browser=p.locator('[data-window="browser"]');
const bb=await browser.boundingBox(),point={x:bb.x+bb.width-60,y:bb.y+bb.height-40};
const hover=async()=>{await p.mouse.move(point.x-4,point.y-4);await p.mouse.move(point.x,point.y);await p.waitForTimeout(80);};
// S0: the extension isn't enabled, so the card offers to connect Safari instead of claiming logs
assert.equal(await safari(),'disabled');
await hover();
assert.equal((await state()).target,'browser');assert.equal(await label.textContent(),'Connect Safari');
assert.ok(await p.locator('.rb-selection-notch .rb-notch-logs').isHidden(),'no logs label');
// Connecting explains the checkbox before opening Safari's settings
await row.click();
assert.equal((await state()).alert,'browser');assert.equal(await p.locator('.rb-alert-title').textContent(),'Turn on Jam in Safari');
await p.locator('.rb-alert-button.is-default').click();
assert.equal((await state()).alert,null);assert.ok(await p.locator('.sf-settings').isVisible());
// Checking the box moves Safari to needing permission, not to connected (TC3)
await p.locator('.sf-checkbox-hit').click();
assert.equal(await safari(),'permission');
await p.locator('.sf-settings-close').click();assert.ok(await p.locator('.sf-settings').isHidden());
await hover();
assert.equal(await label.textContent(),'Needs permission');
assert.ok(await p.locator('.rb-capture-notch').isHidden());
// The permission step opens the guide in Safari, and the window becomes clickable
await row.click();
assert.equal(await p.locator('.sf-tab[aria-selected="true"]').getAttribute('data-tab'),'guide');
assert.equal(await p.locator('.sf-address-text').textContent(),'jam.dev/safari');
assert.equal((await state()).target,null,'the card steps aside for the guide');
assert.ok(await p.locator('.rb-window-picker[data-picker="browser"]').isHidden());
// Allowing on this website only connects that site (TC7)
await p.locator('.sf-extension').click();assert.ok(await p.locator('.sf-popover').isVisible());
await p.locator('[data-allow="site"]').click();
assert.equal(await safari(),'connected');assert.equal(await p.locator('.rb-belt-toast-label').textContent(),'Logs enabled for Safari');
await p.waitForFunction(()=>!document.querySelector('.recording-scene[data-safari-guide="true"]'));
await p.locator('.sf-tab[data-tab="checkout"]').click();
assert.equal(await safari(),'site');await hover();
assert.equal(await label.textContent(),'Not allowed on shop.acme.dev');
// Full screen lists Safari only once it's connected on every site, and never with a setup button
await p.evaluate(()=>{JamRecording.setSafariState('permission');JamRecording.setMode('screen');});
await p.mouse.move(700,420);await p.mouse.move(720,430);await p.waitForTimeout(80);
await p.locator('.rb-picker-sources').click();
const item=p.locator('.rb-source[data-source="safari"]');
assert.equal(await item.getAttribute('aria-disabled'),'true');assert.equal(await item.locator('.rb-source-detail').textContent(),'Needs permission');
assert.equal(await p.locator('.rb-picker-sources').getAttribute('aria-label'),'Logs enabled from Chrome. Log sources');
await p.evaluate(()=>JamRecording.setSafariState('off'));
assert.equal(await p.locator('.rb-source[data-source="safari"]').count(),0,'a Safari that is not running is not listed');
// The menu bar status offers the missing step
await p.evaluate(()=>JamRecording.setSafariState('disabled'));
await p.locator('.sf-menubar-button').click();
assert.equal(await p.locator('.sf-status-menu [data-action]').textContent(),'Connect Safari…');
await p.locator('.sf-status-menu [data-action]').click();
const st=await state();assert.equal(st.alert,'browser');assert.equal(await p.evaluate(()=>JamRecording.getSettings().mode),'window');
assert.deepEqual(errors,[]);
await b.close();console.log('recording-safari: ok');})().catch(e=>{console.error(e);process.exit(1);});
