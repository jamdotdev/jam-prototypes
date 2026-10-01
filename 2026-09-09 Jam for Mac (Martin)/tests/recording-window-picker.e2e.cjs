const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(process.env.RECORDING_TEST_URL||'http://127.0.0.1:8765/?surface=recording');await p.waitForFunction(()=>window.JamRecording);
await p.evaluate(()=>{JamRecording.updateSettings({camera:false,browserLogs:'connected'});JamRecording.setMode('window');});
const bb=await p.locator('[data-window="browser"]').boundingBox();const x=bb.x+bb.width/2,y=bb.y+bb.height*.8;
const start=p.locator('[data-picker="browser"] .rb-picker-start'),logs=p.locator('[data-picker="browser"] .rb-picker-logs-label');
// hover shows the app, record button, and logs status
assert.equal(await start.isVisible(),false,'controls stay hidden until hover');
await p.mouse.move(x,y);await p.waitForTimeout(100);
assert.ok(await start.isVisible());assert.equal(await p.locator('[data-picker="browser"] .rb-picker-name').textContent(),'Chrome');
assert.equal(await logs.textContent(),'Logs enabled');
await p.evaluate(()=>JamRecording.updateSettings({browserLogs:'unavailable'}));assert.equal(await logs.textContent(),'Logs unavailable');
assert.ok(await p.locator('[data-picker="finder"] .rb-picker-notch').isHidden(),'Finder has no logs status');
// clicking anywhere on the window starts recording it
await p.mouse.click(x,y);await p.waitForTimeout(100);
let st=await p.evaluate(()=>JamRecording.getState());assert.equal(st.stage,'recording');assert.equal(st.selectedWindow,'browser');
await p.evaluate(()=>JamRecording.setStage('idle'));assert.equal(await p.evaluate(()=>JamRecording.getState().selectedWindow),null,'one-click returns to picking');
// button-only
await p.evaluate(()=>JamRecording.updateSettings({pickerStart:'button'}));
await p.mouse.move(x,y+10);await p.mouse.click(x,y+10);await p.waitForTimeout(100);
assert.equal(await p.evaluate(()=>JamRecording.getState().stage),'idle','window click ignored in button-only mode');
await start.click();await p.waitForTimeout(100);
assert.equal(await p.evaluate(()=>JamRecording.getState().stage),'recording');
await p.evaluate(()=>JamRecording.setStage('idle'));
// classic
await p.evaluate(()=>JamRecording.updateSettings({oneClick:false,pickerStart:'window',browserLogs:'connected'}));
await p.mouse.move(x,y);await p.mouse.click(x,y);await p.waitForTimeout(100);
st=await p.evaluate(()=>JamRecording.getState());assert.equal(st.selectedWindow,'browser');assert.equal(st.stage,'idle');
assert.equal(await p.locator('.rb-notch-logs-label').textContent(),'Logs enabled');
assert.ok(await p.locator('.rb-notch-change').isVisible());
assert.deepEqual(errors,[]);console.log('PASS: hover controls, logs status, one-click start, return to picking, button-only start, and the select-then-record flow.');await b.close();})().catch(e=>{console.error(e);process.exit(1);});
