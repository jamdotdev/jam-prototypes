const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.clock.install();
await p.goto(process.env.RECORDING_TEST_URL||'http://127.0.0.1:8765/?surface=recording');await p.waitForFunction(()=>window.JamRecording);
await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));
assert.equal(await p.evaluate(()=>JamRecording.getSettings().electronLogs),'restart','the restart button is the default flow');
await p.evaluate(()=>{JamRecording.updateSettings({camera:false,oneClick:true,pickerStart:'window'});JamRecording.setMode('window');JamRecording.resetElectronApps();});
const state=()=>p.evaluate(()=>JamRecording.getState());
const card=p.locator('.rb-record-card'),start=card.locator('.rb-picker-start'),row=p.locator('.rb-selection-notch .rb-notch-logs-restart'),frame=p.locator('.rb-hover-frame'),toast=p.locator('.rb-belt-toast'),notionWindow=p.locator('[data-window="notion"]');
const nb=await notionWindow.boundingBox(),point={x:nb.x+nb.width-40,y:nb.y+nb.height-30};
const hoverNotion=async()=>{await p.mouse.move(point.x,point.y);await p.clock.runFor(100);};
// The logs button restarts Notion straight away, with no dialog
await hoverNotion();
assert.equal(await row.locator('.rb-notch-logs-restart-label').textContent(),'Restart to capture logs');assert.equal(await row.locator('.rb-notch-logs-restart-detail').textContent(),'');
assert.ok(await toast.isHidden());
await row.click();await p.clock.runFor(100);
let st=await state();assert.equal(st.alert,null,'no dialog');assert.equal(st.apps.notion.debug,'restarting');assert.equal(await start.getAttribute('aria-disabled'),'true');
// Jam says what it's doing in a toast on the belt
assert.ok(await toast.isVisible());assert.equal(await toast.locator('.rb-belt-toast-label').textContent(),'Restarting Notion to enable logs');
const tb=await toast.boundingBox(),bb=await p.locator('.rb-belt').boundingBox();
assert.ok(tb.y+tb.height<=bb.y,'the toast sits on top of the belt');assert.ok(Math.abs(tb.x+tb.width/2-(bb.x+bb.width/2))<1,'centred on the belt');
// Notion closes, but its red tint stays where it was and ripples while it waits
assert.ok(await notionWindow.evaluate(el=>el.classList.contains('is-quitting')));
assert.ok(await frame.isVisible());assert.deepEqual(await frame.boundingBox(),nb);
assert.ok(await frame.evaluate(el=>el.classList.contains('is-reloading')));
assert.equal(await frame.evaluate(el=>getComputedStyle(el,'::before').animationName),'rb-ripple');
await p.mouse.move(40,500);await p.clock.runFor(100);assert.equal((await state()).target,'notion','the card stays with Notion while it restarts');
await p.clock.runFor(2000);
assert.ok(await notionWindow.evaluate(el=>el.classList.contains('is-launching')),'Notion reopens after 2 seconds');assert.ok(await frame.evaluate(el=>el.classList.contains('is-reloading')));
await p.clock.runFor(1500);assert.equal((await state()).apps.notion.debug,'restarting','still loading at 3.8 seconds');
await p.clock.runFor(400);
// Four seconds in, logs are on and the toast confirms it before going away
st=await state();assert.equal(st.apps.notion.debug,'on');assert.equal(st.stage,'idle');assert.equal(st.target,'notion');
assert.ok(!(await frame.evaluate(el=>el.classList.contains('is-reloading'))));
assert.equal(await p.locator('.rb-selection-notch .rb-notch-logs-label').textContent(),'Logs enabled');
assert.equal(await toast.locator('.rb-belt-toast-label').textContent(),'Logs enabled for Notion');
await p.clock.runFor(3000);assert.ok(await toast.isHidden());
// Record without logs turned on records straight away
await p.evaluate(()=>JamRecording.resetElectronApps());await hoverNotion();
await p.mouse.click(point.x,point.y);await p.clock.runFor(100);
st=await state();assert.equal(st.stage,'recording','a click records without asking');assert.equal(st.alert,null);assert.equal(st.selectedWindow,'notion');
await p.evaluate(()=>JamRecording.setStage('idle'));
assert.deepEqual(errors,[]);console.log('PASS: the logs button restarts Notion in 4 seconds with no dialog, a toast on the belt and a rippling tint, and Record never asks.');await b.close();})().catch(e=>{console.error(e);process.exit(1);});
