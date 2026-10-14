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
assert.equal((await state()).target,'browser');assert.equal(await p.locator('.rb-picker-name').textContent(),'Chrome');assert.equal(await label.textContent(),'Enable Logs for Chrome');
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
// Full screen's menu lists only what sends logs, with no status and no switches
await p.evaluate(()=>{JamRecording.setSafariState('connected');JamRecording.setChromeState('missing');JamRecording.setMode('screen');});
await p.mouse.move(700,420);await p.mouse.move(720,430);await p.waitForTimeout(80);
await p.locator('.rb-picker-sources').click();
assert.deepEqual(await p.locator('.rb-source').evaluateAll(rows=>rows.map(row=>row.textContent)),['Safari'],'Chrome without the extension and a Notion needing a restart are left out');
assert.equal(await p.locator('.rb-sources-menu [role="menuitemcheckbox"]').count(),0,'nothing in the menu switches on or off');
await p.locator('.rb-picker-sources').click();assert.ok(await p.locator('.rb-sources-menu').isHidden());
// With nothing sending logs, the row is a ghost button to Jam's docs, which open in a new Chrome tab
await p.evaluate(()=>{JamRecording.setSafariState('permission');JamRecording.setBrowserApp('chrome');});
await p.mouse.move(700,420);await p.mouse.move(724,434);await p.waitForTimeout(80);
const sources=p.locator('.rb-picker-sources');
assert.equal(await p.locator('.rb-picker-sources-label').textContent(),'Logs unavailable');
assert.equal(await sources.getAttribute('aria-expanded'),null,'it opens no menu');
assert.ok(await sources.locator('.rb-sf').isVisible(),'it leads with the grey status dot');
assert.equal(await sources.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)','no fill until hovered');
await sources.click();
assert.equal(await p.evaluate(()=>JamRecording.getChromeTab()),'docs');assert.ok(await p.locator('.ch-docs').isVisible());
assert.equal(await p.locator('.ch-docs h1').textContent(),'Add logs to your recordings');
// The browser takes the pointer while the docs are up, so the page reads without the screen's tint
const browserBox=await p.locator('[data-window="browser"]').boundingBox();
await p.mouse.move(browserBox.x+200,browserBox.y+300);await p.mouse.move(browserBox.x+204,browserBox.y+304);await p.waitForTimeout(80);
assert.ok(await p.locator('.rb-record-card').isHidden());assert.ok(await p.locator('.rb-screen-picker').isHidden());
await p.mouse.move(40,860);await p.mouse.move(44,856);await p.waitForTimeout(80);
assert.ok(await p.locator('.rb-record-card').isVisible(),'the screen card comes back off the browser');
await p.locator('.ch-tab[data-tab="docs"] .ch-tab-close').click({force:true});
assert.equal(await p.evaluate(()=>JamRecording.getChromeTab()),'design');
// The menu bar status offers each browser's missing step
await p.locator('.sf-menubar-button').click();
assert.deepEqual(await p.locator('.sf-status-menu [data-action]').allTextContents(),['Install Chrome Extension…','Allow Jam in Safari…']);
await p.locator('.sf-status-menu [data-action="chrome"]').click();
assert.equal(await p.evaluate(()=>JamRecording.getSettings().mode),'window');assert.ok(await p.locator('.ch-store').isVisible());
assert.deepEqual(errors,[]);
await b.close();console.log('recording-chrome: ok');})().catch(e=>{console.error(e);process.exit(1);});
