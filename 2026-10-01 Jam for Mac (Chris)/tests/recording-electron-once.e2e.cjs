const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(process.env.RECORDING_TEST_URL||'http://127.0.0.1:8765/?surface=recording');await p.waitForFunction(()=>window.JamRecording);
await p.evaluate(()=>{JamRecording.updateSettings({camera:false,oneClick:true,pickerStart:'window',electronLogs:'once'});JamRecording.setMode('window');JamRecording.resetElectronApps();});
const state=()=>p.evaluate(()=>JamRecording.getState());const debugIs=value=>p.waitForFunction(value=>JamRecording.getState().apps.notion.debug===value,value,{timeout:6000});
const card=p.locator('.rb-record-card'),start=card.locator('.rb-picker-start'),row=p.locator('.rb-selection-notch .rb-notch-logs-restart'),banner=p.locator('.rb-banner'),notice=p.locator('#draft-logs-notice');
const nb=await p.locator('[data-window="notion"]').boundingBox(),point={x:nb.x+nb.width-40,y:nb.y+nb.height-30};
const hoverNotion=async()=>{await p.mouse.move(point.x,point.y);await p.waitForTimeout(100);};
// Record never asks: the logs row is an opt-in that names its cost
await hoverNotion();
assert.equal((await state()).target,'notion');
assert.equal(await row.locator('.rb-notch-logs-restart-label').textContent(),'Turn on console logs');
assert.equal(await row.locator('.rb-notch-logs-restart-detail').textContent(),'Restarts Notion');
await p.mouse.click(point.x,point.y);await p.waitForTimeout(100);
let st=await state();assert.equal(st.stage,'recording','a click records straight away');assert.equal(st.alert,null);assert.equal(st.selectedWindow,'notion');
// Finishing offers the opt-in on the draft, and turning it on there restarts Notion in the background
await p.locator('.rb-stop').click();await p.waitForTimeout(200);
assert.ok(await notice.isVisible());assert.equal(await p.locator('#draft-logs-title').textContent(),'No console logs from Notion');
await p.locator('#draft-logs-button').click();await p.waitForTimeout(100);
assert.equal(await p.locator('#draft-logs-title').textContent(),'Restarting Notion…');assert.ok(await p.locator('#draft-logs-button').isHidden());
await debugIs('on');await p.waitForTimeout(50);
assert.equal(await p.locator('#draft-logs-title').textContent(),'Console logs on for Notion');
st=await state();assert.deepEqual(st.apps.notion,{debug:'on',declined:false,enabled:true});
// The opt-in on the card restarts Notion with no dialog, back to the card with logs enabled
await p.evaluate(()=>{JamPlayground.setSurface('recording');JamRecording.updateSettings({camera:false});JamRecording.setMode('window');JamRecording.resetElectronApps();});await hoverNotion();
await row.click();await p.waitForTimeout(100);
st=await state();assert.equal(st.alert,null,'no dialog');assert.equal(st.apps.notion.debug,'restarting');assert.equal(await start.getAttribute('aria-disabled'),'true');
assert.equal(await row.locator('.rb-notch-logs-restart-detail').textContent(),'Logs turn on as it reopens');
await debugIs('on');st=await state();assert.equal(st.stage,'idle');assert.equal(st.target,'notion');assert.equal(st.apps.notion.enabled,true);
assert.equal(await p.locator('.rb-selection-notch .rb-notch-logs-label').textContent(),'Logs enabled');
// Opening Notion again later drops debug mode, and Jam relaunches it with logs on and says so
await p.evaluate(()=>JamRecording.reopenElectronApp('notion'));await p.waitForTimeout(100);
assert.equal((await state()).apps.notion.debug,'restarting','Jam already knows it will turn logs back on');
await debugIs('on');assert.ok(await banner.isVisible());assert.equal(await banner.locator('.rb-banner-title').textContent(),'Console logs on for Notion');
await banner.click();await p.waitForTimeout(300);assert.ok(await banner.isHidden());
// Without the opt-in, reopening leaves logs off
await p.evaluate(()=>JamRecording.resetElectronApps());await p.evaluate(()=>JamRecording.reopenElectronApp('notion'));await p.waitForTimeout(2000);
st=await state();assert.equal(st.apps.notion.debug,'off');assert.ok(await banner.isHidden());
// The ask flow brings the dialog back after a later launch
await p.evaluate(()=>{JamRecording.updateSettings({electronLogs:'ask'});});await hoverNotion();await start.click();await p.waitForTimeout(100);assert.equal((await state()).alert,'notion');
await p.keyboard.press('Escape');
assert.deepEqual(errors,[]);console.log('PASS: Notion records without asking, turns logs on from the card or the draft without a dialog, and Jam relaunches it with logs on at a later launch.');await b.close();})().catch(e=>{console.error(e);process.exit(1);});
