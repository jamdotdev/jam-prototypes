const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(process.env.RECORDING_TEST_URL||'http://127.0.0.1:8765/?surface=recording');await p.waitForFunction(()=>window.JamRecording);
await p.emulateMedia({reducedMotion:'reduce'});
await p.evaluate(()=>{JamRecording.updateSettings({camera:false,oneClick:true,pickerStart:'window',browserLogs:'connected'});JamRecording.setMode('window');JamRecording.setSafariState('disabled');});
const state=()=>p.evaluate(()=>JamRecording.getState()),safari=()=>p.evaluate(()=>JamRecording.getSafariState());
const row=p.locator('.rb-selection-notch .rb-notch-logs-restart'),label=row.locator('.rb-notch-logs-restart-label'),browser=p.locator('[data-window="browser"]'),tooltip=p.locator('.rb-tooltip');
const bb=await browser.boundingBox(),point={x:bb.x+bb.width-60,y:bb.y+bb.height-40};
const hover=async()=>{await p.mouse.move(point.x-4,point.y-4);await p.mouse.move(point.x,point.y);await p.waitForTimeout(80);};
// S0: choosing Safari's state shows Safari, and the card offers to set up the extension instead of claiming logs
assert.equal(await p.evaluate(()=>JamRecording.getBrowserApp()),'safari');
assert.equal(await safari(),'disabled');
await hover();
assert.equal((await state()).target,'browser');assert.equal(await label.textContent(),'Setup Extension for logs');
assert.equal(await p.locator('.rb-selection-notch').getAttribute('data-cta'),'ghost');
assert.ok(await row.locator('.rb-sf[data-symbol="puzzlepiece.extension"]').isVisible(),'the ghost row leads with the extension symbol');
assert.ok(await p.locator('.rb-selection-notch .rb-notch-logs').isHidden(),'no logs label');
// The row's detail waits in a tooltip
await row.hover();await tooltip.waitFor({state:'visible'});
assert.equal(await tooltip.textContent(),'Turn on the Jam extension in Safari to capture logs');
assert.equal(await row.getAttribute('aria-describedby'),'rb-logs-tooltip');
// Setting up opens Jam's window on its first step, and the browser window stays clickable behind it
await row.click();
const setup=p.locator('.sf-setup'),step=()=>setup.getAttribute('data-step');
assert.ok(await setup.isVisible());assert.ok(await tooltip.isHidden());assert.equal(await step(),'1');
assert.equal((await state()).target,null,'the card steps aside for the setup window');
assert.ok(await p.locator('.rb-window-picker[data-picker="browser"]').isHidden());
const frame=await setup.boundingBox(),toolbar=await p.locator('.sf-toolbar').boundingBox();
assert.ok(frame.y>=toolbar.y+toolbar.height||frame.x+frame.width<=bb.x,'the window stays clear of Safari’s toolbar');
assert.equal(await setup.locator('.sf-setup-button.is-primary').count(),1,'one primary button');
assert.equal(await p.locator('.sf-setup-primary').textContent(),'Open Safari Settings');
await p.keyboard.press('Escape');assert.ok(await setup.isHidden(),'Escape closes it');
await hover();await row.click();assert.ok(await setup.isVisible());
// Its button opens Safari's settings and closes the window
await p.locator('.sf-setup-primary').click();
assert.ok(await setup.isHidden());assert.ok(await p.locator('.sf-settings').isVisible());
// Checking the box moves Safari to needing permission, not to connected (TC3)
await p.locator('.sf-checkbox-hit').click();
assert.equal(await safari(),'permission');
await p.locator('.sf-settings-close').click();assert.ok(await p.locator('.sf-settings').isHidden());
await hover();assert.equal(await label.textContent(),'Enable logs for this site');
// The yellow row opens Safari's own permission prompt, not Jam's window
const popover=p.locator('.sf-popover');
await row.click();assert.ok(await setup.isHidden());assert.ok(await popover.isVisible());
assert.equal(await p.locator('.sf-extension').getAttribute('aria-expanded'),'true');
assert.match(await popover.textContent(),/access “jam\.dev”/);
// Allowing on this website only connects that site (TC7)
await p.locator('[data-allow="site"]').click();
assert.equal(await safari(),'connected');assert.equal(await p.locator('.rb-belt-toast-label').textContent(),'Logs enabled for Safari');
assert.ok(await popover.isHidden());
// Another site shows the yellow status, whose tooltip names the site
await p.locator('.sf-tab[data-tab="checkout"]').click();
assert.equal(await safari(),'site');await hover();
assert.equal(await label.textContent(),'Enable logs for this site');
await row.hover();await tooltip.waitFor({state:'visible'});
assert.equal(await tooltip.textContent(),'Allow the Jam extension on shop.acme.dev to capture logs');
assert.ok(await p.locator('.rb-capture-notch').isHidden());
// It asks for that site
await row.click();assert.ok(await setup.isHidden());assert.match(await popover.textContent(),/access “shop\.acme\.dev”/);
await p.keyboard.press('Escape');assert.ok(await popover.isHidden());
// The blue look has its own copy for both steps
await p.evaluate(()=>JamRecording.setLogsButton('blue'));await hover();
assert.equal(await label.textContent(),'Enable log permissions');assert.equal(await p.locator('.rb-selection-notch').getAttribute('data-cta'),'blue');
await p.evaluate(()=>JamRecording.setSafariState('disabled'));await hover();
assert.equal(await label.textContent(),'Enable Logs for Safari');
assert.ok(await row.locator('.rb-sf[data-symbol="arrow.forward.circle.fill"]').isVisible(),'the blue button ends with a forward arrow');
await p.evaluate(()=>JamRecording.setLogsButton('ghost'));
// The other option explains the same two steps on a jam.dev page, in a new Safari tab instead of Jam's window, and Jam
// opens Safari's settings beside it
await p.evaluate(()=>JamRecording.setSafariGuide('tab'));await hover();await row.click();
const page=p.locator('.sf-guide'),statuses=()=>page.locator('.sf-setup-step').evaluateAll(items=>items.map(item=>item.dataset.status));
assert.ok(await setup.isHidden());assert.ok(await page.isVisible());assert.ok(await p.locator('.sf-settings').isVisible());
assert.equal(await p.evaluate(()=>JamRecording.getSafariTab()),'guide');
assert.equal(await p.locator('.sf-address-text').textContent(),'jam.dev/safari');
assert.ok(await p.locator('.rb-window-picker[data-picker="browser"]').isHidden(),'the page stays clickable');
// The page can't see Safari, so both steps stay active, with no buttons or statuses
assert.deepEqual(await statuses(),['current','current']);
assert.equal(await page.locator('button,.sf-setup-status').count(),0);
await p.locator('.sf-checkbox-hit').click();assert.equal(await safari(),'permission');
assert.deepEqual(await statuses(),['current','current']);
await p.locator('.sf-settings-close').click();
// Allowing Jam on every website leaves the page as it was, while Safari's window goes back to recording
await p.locator('.sf-extension').click();await p.locator('[data-allow="all"]').click();
assert.equal(await safari(),'connected');assert.equal(await p.locator('.rb-belt-toast-label').textContent(),'Logs enabled for Safari');
assert.equal(await page.locator('h1').textContent(),'Get logs from Safari');assert.deepEqual(await statuses(),['current','current']);
await p.waitForFunction(()=>!document.querySelector('.recording-scene[data-browser-guide="true"]'));
assert.ok(await page.isVisible(),'the tab stays open');
// Closing the tab goes back to the page before it
await p.locator('.sf-tab-close').click();assert.ok(await page.isHidden());
assert.equal(await p.locator('.sf-tab').count(),2);
await p.evaluate(()=>JamRecording.setSafariGuide('window'));
// Full screen lists Safari only once it's connected on every site, and never with a setup button
await p.evaluate(()=>{JamRecording.setSafariState('permission');JamRecording.setMode('screen');});
await p.mouse.move(700,420);await p.mouse.move(720,430);await p.waitForTimeout(80);
await p.locator('.rb-picker-sources').click();
const item=p.locator('.rb-source[data-source="safari"]');
assert.equal(await item.getAttribute('aria-disabled'),'true');assert.equal(await item.locator('.rb-source-detail').textContent(),'Needs permission');
assert.equal(await p.locator('.rb-picker-sources').getAttribute('aria-label'),'Logs enabled from Chrome. Log sources');
await p.evaluate(()=>JamRecording.setSafariState('off'));
assert.equal(await p.locator('.rb-source[data-source="safari"]').count(),0,'a Safari that is not running is not listed');
assert.equal(await p.evaluate(()=>JamRecording.getBrowserApp()),'chrome','the browser window plays Chrome while Safari is not running');
// The menu bar status offers the missing step
await p.evaluate(()=>JamRecording.setSafariState('disabled'));
await p.locator('.sf-menubar-button').click();
assert.deepEqual(await p.locator('.sf-status-menu [data-action]').allTextContents(),['Install Safari Extension…']);
await p.locator('.sf-status-menu [data-action="safari"]').click();
assert.ok(await setup.isVisible());assert.equal(await p.evaluate(()=>JamRecording.getSettings().mode),'window');
assert.deepEqual(errors,[]);
await b.close();console.log('recording-safari: ok');})().catch(e=>{console.error(e);process.exit(1);});
