const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(process.env.RECORDING_TEST_URL||'http://127.0.0.1:8765/?surface=recording');await p.waitForFunction(()=>window.JamRecording);
await p.evaluate(()=>{JamRecording.updateSettings({camera:false,oneClick:true,pickerStart:'window',browserLogs:'connected'});JamRecording.setMode('window');});
const state=()=>p.evaluate(()=>JamRecording.getState());
const card=p.locator('.rb-record-card'),start=card.locator('.rb-picker-start'),notch=p.locator('.rb-selection-notch');
// the belt has no record button in one-click mode, and close sits at its end
assert.equal(await p.locator('.rb-record').isVisible(),false);
const beltBox=await p.locator('.rb-belt').boundingBox(),closeBox=await p.locator('.rb-close').boundingBox();assert.ok(closeBox.x>beltBox.x+beltBox.width/2,'close is at the end of the belt');
// hovering a window shows its record card with logs and sizing in the notch
assert.equal(await card.isVisible(),false,'card stays hidden until hover');
let bb=await p.locator('[data-window="browser"]').boundingBox();const x=bb.x+bb.width*.85,y=bb.y+bb.height*.85;
await p.mouse.move(x,y);await p.waitForTimeout(100);
assert.equal((await state()).target,'browser');assert.ok(await start.isVisible());
assert.equal(await card.locator('.rb-picker-name').textContent(),'Chrome');
assert.equal(await notch.locator('.rb-notch-logs-label').textContent(),'Logs enabled');assert.ok(await notch.locator('.rb-notch-resize').isVisible());
// the Record window pill is inset in the panel, with sizing under it and the logs status last
assert.equal((await start.textContent()).trim(),'Record window');
const pill=await start.boundingBox(),panel=await notch.boundingBox(),size=await notch.locator('.rb-notch-sizing').boundingBox(),logs=await notch.locator('.rb-notch-logs').boundingBox();
assert.ok(Math.abs(pill.x-panel.x-8)<1&&Math.abs(pill.y-panel.y-8)<1&&Math.abs(pill.width-(panel.width-16))<1,'pill is inset in the panel');
assert.ok(size.y>=pill.y+pill.height&&logs.y>=size.y+size.height,'logs status sits below sizing');
await p.evaluate(()=>JamRecording.updateSettings({browserLogs:'unavailable'}));assert.equal(await notch.locator('.rb-notch-logs-label').textContent(),'Logs unavailable');
// resizing from the notch keeps the card on that window and does not start recording
await notch.locator('.rb-notch-resize').click();const item=p.locator('#rb-resize-menu .native-menu-item:not([disabled])').first();const label=(await item.textContent()).trim();await item.click();await p.waitForTimeout(100);
let st=await state();assert.equal(st.stage,'idle');assert.equal(st.target,'browser','card stays after a resize');
assert.equal(`${Math.round(await p.evaluate(()=>parseFloat(document.querySelector('[data-window="browser"]').style.width)))} × ${Math.round(await p.evaluate(()=>parseFloat(document.querySelector('[data-window="browser"]').style.height)))}`,label.replace(/\s*[×x]\s*/,' × '));
// Finder has no logs status
await p.evaluate(()=>JamRecording.resetSelection());
const fb=await p.locator('[data-window="finder"]').boundingBox();await p.mouse.move(fb.x+30,fb.y+fb.height-20);await p.waitForTimeout(100);
assert.equal((await state()).target,'finder');assert.ok(await notch.locator('.rb-notch-window-controls').isHidden());
// clicking the window starts recording it
await p.mouse.click(fb.x+30,fb.y+fb.height-20);await p.waitForTimeout(100);
st=await state();assert.equal(st.stage,'recording');assert.equal(st.selectedWindow,'finder');assert.equal(await card.isVisible(),false);
await p.evaluate(()=>JamRecording.setStage('idle'));assert.equal((await state()).selectedWindow,null,'one-click returns to picking');
// button-only start ignores clicks on the window
await p.evaluate(()=>JamRecording.updateSettings({pickerStart:'button'}));
bb=await p.locator('[data-window="browser"]').boundingBox();await p.mouse.move(bb.x+bb.width-30,bb.y+bb.height-20);await p.mouse.click(bb.x+bb.width-30,bb.y+bb.height-20);await p.waitForTimeout(100);
assert.equal((await state()).stage,'idle','window click ignored in button-only mode');
await start.click();await p.waitForTimeout(100);st=await state();assert.equal(st.stage,'recording');assert.equal(st.selectedWindow,'browser');
await p.evaluate(()=>{JamRecording.setStage('idle');JamRecording.updateSettings({pickerStart:'window'});JamRecording.setMode('screen');});
// screen: hover tints the display, the card shows its resolution, and a click records
await p.mouse.move(200,700);await p.waitForTimeout(100);
assert.equal((await state()).target,'screen');assert.ok(await p.locator('.rb-screen-picker').isVisible());assert.match(await card.locator('.rb-picker-logs-label').textContent(),/^\d+ × \d+$/);assert.equal((await start.textContent()).trim(),'Record screen');
await p.mouse.click(200,700);await p.waitForTimeout(100);assert.equal((await state()).stage,'recording');
await p.evaluate(()=>{JamRecording.setStage('idle');JamRecording.setMode('area');});await p.waitForTimeout(100);
// area: the card is always on the drawn area, with sizing in its notch
assert.equal((await state()).target,'area');assert.ok(await notch.locator('.rb-notch-width').isVisible());assert.ok(await card.locator('.rb-picker-app').isHidden());
assert.ok(await notch.locator('.rb-notch-rulers').isHidden(),'rulers button is off by default');assert.equal((await start.textContent()).trim(),'Record area');
await start.click();await p.waitForTimeout(100);assert.equal((await state()).stage,'recording');
await p.evaluate(()=>{JamRecording.setStage('idle');JamRecording.setMode('window');});
// classic
await p.evaluate(()=>JamRecording.updateSettings({oneClick:false,browserLogs:'connected'}));
assert.ok(await p.locator('.rb-record').isVisible());
await p.mouse.move(x,y);await p.locator('[data-window="browser"] .rb-window-selector').click();await p.waitForTimeout(100);
st=await state();assert.equal(st.selectedWindow,'browser');assert.equal(st.stage,'idle');
assert.equal(await p.locator('.rb-notch-logs-label').textContent(),'Logs enabled');
assert.ok(await p.locator('.rb-notch-change').isVisible());
assert.deepEqual(errors,[]);console.log('PASS: belt without Record, record card on window, screen and area, notch sizing on hover, button-only start, and the select-then-record flow.');await b.close();})().catch(e=>{console.error(e);process.exit(1);});
