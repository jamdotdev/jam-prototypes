const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(process.env.RECORDING_TEST_URL||'http://127.0.0.1:8765/?surface=recording');await p.waitForFunction(()=>window.JamRecording);
await p.emulateMedia({reducedMotion:'reduce'});
await p.evaluate(()=>{JamRecording.updateSettings({camera:false,oneClick:true,pickerStart:'window',browserLogs:'connected'});JamRecording.setMode('window');JamRecording.setSafariState('disabled');});
const state=()=>p.evaluate(()=>JamRecording.getState()),safari=()=>p.evaluate(()=>JamRecording.getSafariState());
const row=p.locator('.rb-selection-notch .rb-notch-logs-restart'),label=row.locator('.rb-notch-logs-restart-label'),browser=p.locator('[data-window="browser"]'),tooltip=p.locator('.rb-tooltip');
const settings=p.locator('.sf-settings'),coach=p.locator('.sf-coach'),extension=p.locator('.sf-extension'),popover=p.locator('.sf-popover'),page=p.locator('.sf-guide'),card=p.locator('.rb-record-card'),tint=p.locator('.rb-hover-frame');
const bb=await browser.boundingBox(),point={x:bb.x+bb.width-60,y:bb.y+bb.height-40};
const hover=async()=>{await p.mouse.move(point.x-4,point.y-4);await p.mouse.move(point.x,point.y);await p.waitForTimeout(80);};
const settingUp=()=>p.evaluate(()=>document.querySelector('.recording-scene').dataset.browserGuide==='true');
// The button flips over to its new step, so its label changes a moment after Safari's state does.
const labelBecomes=text=>p.waitForFunction(text=>document.querySelector('.rb-selection-notch .rb-notch-logs-restart-label').textContent===text,text);
const overlaps=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
// S0: choosing Safari's state shows Safari, and the card's blue button offers to connect its logs
assert.equal(await p.evaluate(()=>JamRecording.getBrowserApp()),'safari');
assert.equal(await safari(),'disabled');
await hover();
assert.equal((await state()).target,'browser');assert.equal(await label.textContent(),'Connect Logs for Safari');
assert.ok(await row.locator('.rb-sf[data-symbol="arrow.forward.circle.fill"]').isVisible(),'the blue button ends with a forward arrow');
assert.ok(await p.locator('.rb-selection-notch .rb-notch-logs').isHidden(),'no logs label');
assert.ok(await extension.isHidden(),'Safari has no Jam button until the box is checked');
// The row's detail waits in a tooltip
await row.hover();await tooltip.waitFor({state:'visible'});
assert.equal(await tooltip.textContent(),'Turn on the Jam extension in Safari to capture logs');
assert.equal(await row.getAttribute('aria-describedby'),'rb-logs-tooltip');
// Connecting opens Safari's settings with Jam's alert in the middle of the screen, and the card and its tint stay on Safari's window
await row.click();
assert.ok(await settings.isVisible());assert.ok(await coach.isVisible());assert.ok(await tooltip.isHidden());
assert.equal(await coach.locator('h2').textContent(),'Enable the Jam Safari Extension');
assert.equal((await state()).target,'browser','the card stays up through the setup');assert.ok(await settingUp());
assert.ok(await card.isVisible());assert.ok(await tint.isVisible());
assert.equal(await tint.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(255, 59, 48, 0.4)','Safari’s window keeps its tint');
assert.ok(await p.locator('.rb-window-picker[data-picker="browser"]').isHidden(),'Safari stays clickable');
const notchBox=await p.locator('.rb-selection-notch').boundingBox(),settingsBox=await settings.boundingBox(),coachBox=await coach.boundingBox(),jamBox=await p.locator('.sf-checkbox-hit').boundingBox(),screen=await p.locator('.recording-scene').boundingBox();
assert.ok(!overlaps(settingsBox,notchBox),'Safari’s settings leave the card in view');
assert.ok(!overlaps(coachBox,jamBox),'the alert leaves Jam’s box in reach');
// macOS centres an app's alert on the screen rather than over the window it's about
assert.ok(Math.abs(coachBox.x+coachBox.width/2-(screen.x+screen.width/2))<2&&Math.abs(coachBox.y+coachBox.height/2-(screen.y+screen.height/2))<2,'the alert sits in the middle of the screen');
// It stays on Safari's window wherever the pointer goes
await p.mouse.move(120,820);await p.mouse.move(124,824);await p.waitForTimeout(80);
assert.equal((await state()).target,'browser');
// Checking the box (TC3) closes the alert, adds Jam's grey button left of the address, and flips the card's button to yellow
await p.locator('.sf-checkbox-hit').click();
assert.equal(await safari(),'permission');assert.ok(await coach.isHidden());
assert.ok(await extension.isVisible());assert.match(await extension.getAttribute('class'),/is-waiting/);
assert.ok((await extension.boundingBox()).x<(await p.locator('.sf-address').boundingBox()).x,'Jam’s button sits left of the address');
await labelBecomes('Grant permission for Safari logs');
assert.equal(await p.locator('.rb-selection-notch').getAttribute('data-logs'),'permission');
assert.equal(await p.locator('.rb-capture-status').textContent(),'Grant permission for Safari logs');
assert.equal((await state()).target,'browser');
// Closing the settings once the box is checked keeps the setup going
await p.locator('.sf-settings-close').click();assert.ok(await settings.isHidden());assert.ok(await settingUp());
// Granting permission opens jam.dev/safari in a new tab, and the card and its tint step away while it's up
await row.click();
assert.ok(await page.isVisible());assert.equal(await p.evaluate(()=>JamRecording.getSafariTab()),'guide');
assert.equal(await p.locator('.sf-address-text').textContent(),'jam.dev/safari');
assert.equal(await page.locator('h1').textContent(),'Connecting Jam to Safari');
assert.equal(await page.locator('button').count(),0,'the page only explains');
assert.equal(await page.locator('.sf-guide-card').count(),1,'one card, showing the permission');
assert.equal(await page.locator('.sf-checkbox').count(),0,'the page leaves out the extension’s box');
assert.ok(await card.isHidden());assert.ok(await tint.isHidden());assert.ok(await settingUp());
assert.equal((await state()).target,'browser','the card comes back to Safari');
// Allowing Jam on every website from its toolbar button connects Safari. The extension closes its tab, and the card comes back on its new state.
await extension.click();assert.ok(await popover.isVisible());assert.match(await popover.textContent(),/access “jam\.dev”/);
await p.locator('[data-allow="all"]').click();
assert.equal(await safari(),'connected');assert.equal(await p.locator('.rb-belt-toast-label').textContent(),'Logs enabled for Safari');
assert.doesNotMatch(await extension.getAttribute('class'),/is-waiting/);
await page.waitFor({state:'hidden'});
assert.equal(await p.evaluate(()=>JamRecording.getSafariTab()),'design');assert.equal(await p.locator('.sf-tab').count(),2);
assert.ok(await card.isVisible());assert.ok(await tint.isVisible());
await p.waitForFunction(()=>document.querySelector('.rb-selection-notch .rb-notch-logs-label').textContent==='Logs enabled'&&!document.querySelector('.rb-selection-notch .rb-notch-logs').hidden);
await p.waitForFunction(()=>document.querySelector('.recording-scene').dataset.browserGuide==='false');
// Closing Safari's settings with the box unchecked leaves the setup
await p.evaluate(()=>JamRecording.setSafariState('disabled'));await hover();await row.click();
assert.ok(await settingUp());await p.locator('.sf-settings-close').click();
assert.ok(!(await settingUp()));
// So does closing the page before allowing Jam, which goes back to the tab before it and brings the card back
await p.evaluate(()=>{JamRecording.setSafariState('permission');JamRecording.setSafariTab('checkout');});await hover();
assert.equal(await label.textContent(),'Grant permission for Safari logs');
await row.click();assert.ok(await settingUp());assert.ok(await card.isHidden());await p.locator('.sf-tab-close').click();
assert.ok(!(await settingUp()));assert.ok(await page.isHidden());
assert.equal(await p.evaluate(()=>JamRecording.getSafariTab()),'checkout');
await hover();assert.ok(await card.isVisible());assert.equal(await label.textContent(),'Grant permission for Safari logs');
await p.evaluate(()=>JamRecording.setSafariTab('design'));
// A site Jam isn't allowed on yet (TC7) names it in the tooltip
await p.evaluate(()=>JamRecording.setSafariState('site'));await hover();
assert.equal(await safari(),'site');assert.equal(await label.textContent(),'Grant permission for Safari logs');
await row.hover();await tooltip.waitFor({state:'visible'});
assert.equal(await tooltip.textContent(),'Allow the Jam extension on jam.dev to capture logs');
// Recording from the card during the setup leaves it
await p.evaluate(()=>JamRecording.setSafariState('disabled'));await hover();await row.click();
await p.locator('.rb-record-card .rb-picker-start').click();
assert.equal((await state()).stage,'recording');assert.ok(!(await settingUp()));
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
// The menu bar status offers the missing step, and runs the same setup
await p.evaluate(()=>JamRecording.setSafariState('disabled'));
await p.locator('.sf-menubar-button').click();
assert.deepEqual(await p.locator('.sf-status-menu [data-action]').allTextContents(),['Install Safari Extension…']);
await p.locator('.sf-status-menu [data-action="safari"]').click();
assert.ok(await settings.isVisible());assert.ok(await coach.isVisible());assert.equal(await p.evaluate(()=>JamRecording.getSettings().mode),'window');
assert.equal((await state()).target,'browser');
assert.deepEqual(errors,[]);
await b.close();console.log('recording-safari: ok');})().catch(e=>{console.error(e);process.exit(1);});
