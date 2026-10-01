const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(process.env.RECORDING_TEST_URL||'http://127.0.0.1:8765/?surface=recording');await p.waitForFunction(()=>window.JamRecording);
await p.evaluate(()=>{JamRecording.updateSettings({camera:false,countdown:3});JamRecording.setMode('window');});
const bb=await p.locator('[data-window="browser"]').boundingBox();const x=bb.x+bb.width/2,y=bb.y+bb.height*.8;
await p.mouse.move(x,y);await p.mouse.click(x,y);await p.waitForTimeout(200);
assert.equal(await p.evaluate(()=>JamRecording.getState().countdown),3);
await p.keyboard.press('Escape');await p.waitForTimeout(100);
let st=await p.evaluate(()=>JamRecording.getState());assert.equal(st.countdown,0);assert.equal(st.selectedWindow,null);assert.equal(st.stage,'idle');
await p.waitForTimeout(3300);assert.equal(await p.evaluate(()=>JamRecording.getState().stage),'idle','cancelled countdown never starts');
// button-only
await p.evaluate(()=>JamRecording.updateSettings({countdown:0,pickerStart:'button'}));
await p.mouse.move(x,y+10);await p.mouse.click(x,y+10);await p.waitForTimeout(100);
assert.equal(await p.evaluate(()=>JamRecording.getState().stage),'idle','window click ignored in button-only mode');
await p.locator('[data-picker="browser"] .rb-picker-start').click();await p.waitForTimeout(100);
assert.equal(await p.evaluate(()=>JamRecording.getState().stage),'recording');
await p.evaluate(()=>JamRecording.setStage('idle'));assert.equal(await p.evaluate(()=>JamRecording.getState().selectedWindow),null,'one-click returns to picking');
// resize from card
await p.mouse.move(x,y);await p.locator('[data-picker="browser"] .rb-picker-resize').click();await p.waitForTimeout(100);
const item=p.locator('#rb-picker-menu .native-menu-item:not([disabled])').first();const label=await item.textContent();await item.click();

assert.equal(await p.locator('[data-picker="browser"] .rb-picker-dimensions').textContent(),label);
// classic
await p.evaluate(()=>JamRecording.updateSettings({oneClick:false}));
await p.mouse.move(x,y);await p.mouse.click(x,y);await p.waitForTimeout(100);
st=await p.evaluate(()=>JamRecording.getState());assert.equal(st.selectedWindow,'browser');assert.equal(st.stage,'idle');
assert.equal(await p.locator('.rb-notch-logs-label').textContent(),'Capturing logs');
assert.ok(await p.locator('.rb-notch-change').isVisible());
assert.deepEqual(errors,[]);console.log('PASS: one-click start, countdown and Escape cancel, button-only start, return to picking, card resize, logs status, and the select-then-record flow.');await b.close();})().catch(e=>{console.error(e);process.exit(1);});
