const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(process.env.RECORDING_TEST_URL||'http://127.0.0.1:8765/?surface=recording');await p.waitForFunction(()=>window.JamRecording);
await p.evaluate(()=>{JamRecording.updateSettings({camera:false,oneClick:true,pickerStart:'window',electronLogs:'ask'});JamRecording.setMode('window');JamRecording.resetElectronApps();});
const state=()=>p.evaluate(()=>JamRecording.getState());
const card=p.locator('.rb-record-card'),start=card.locator('.rb-picker-start'),notch=p.locator('.rb-selection-notch'),restartRow=notch.locator('.rb-notch-logs-restart'),alert=p.locator('.rb-alert');
const hoverNotion=async()=>{const nb=await p.locator('[data-window="notion"]').boundingBox();const point={x:nb.x+nb.width-40,y:nb.y+nb.height-30};await p.mouse.move(point.x,point.y);await p.waitForTimeout(100);return point;};
// hovering Notion asks for a restart before logs can be captured
const point=await hoverNotion();
let st=await state();assert.equal(st.target,'notion');assert.equal(st.apps.notion.debug,'off');
assert.equal(await card.locator('.rb-picker-name').textContent(),'Notion');
assert.ok(await restartRow.isVisible());assert.equal((await restartRow.textContent()).trim(),'Restart to capture logs');assert.ok(await notch.locator('.rb-notch-logs').isHidden());
// Record opens the alert instead of recording, and Escape goes back to the card
await start.click();await p.waitForTimeout(100);
st=await state();assert.equal(st.stage,'idle');assert.equal(st.alert,'notion');assert.ok(await alert.isVisible());
assert.equal(await alert.locator('.rb-alert-title').textContent(),'Restart Notion to capture console logs?');
assert.equal(await p.evaluate(()=>document.activeElement.textContent),'Restart','Restart is the default button');
assert.equal(await card.evaluate(el=>getComputedStyle(el).visibility),'hidden','the card steps back behind the alert');
await p.keyboard.press('Escape');await p.waitForTimeout(100);
st=await state();assert.equal(st.alert,null);assert.equal(st.target,'notion');assert.ok(await card.isVisible());assert.equal(st.stage,'idle');
// the logs row opens the alert too; Restart relaunches Notion and comes back to the card with logs enabled
await restartRow.click();await p.waitForTimeout(100);assert.ok(await alert.isVisible());
await alert.locator('[data-choice="restart"]').click();await p.waitForTimeout(100);
st=await state();assert.equal(st.apps.notion.debug,'restarting');assert.equal(await start.getAttribute('aria-disabled'),'true');
assert.equal((await restartRow.textContent()).trim(),'Restarting Notion…');
await start.click({force:true});await p.waitForTimeout(100);assert.equal((await state()).stage,'idle','Record waits for the restart');
await p.waitForFunction(()=>JamRecording.getState().apps.notion.debug==='on',null,{timeout:8000});
st=await state();assert.equal(st.stage,'idle','back to the card, not recording');assert.equal(st.target,'notion');
assert.equal(await notch.locator('.rb-notch-logs-label').textContent(),'Logs enabled');assert.ok(await restartRow.isHidden());
assert.equal(await start.getAttribute('aria-disabled'),'false');
await start.click();await p.waitForTimeout(100);st=await state();assert.equal(st.stage,'recording');assert.equal(st.selectedWindow,'notion');
await p.evaluate(()=>JamRecording.setStage('idle'));
// Capture without logs records right away and doesn't ask again
await p.evaluate(()=>JamRecording.resetElectronApps());await hoverNotion();
await p.mouse.click(point.x,point.y);await p.waitForTimeout(100);assert.ok(await alert.isVisible(),'a click on the window asks first');
await alert.locator('[data-choice="skip"]').click();await p.waitForTimeout(100);
st=await state();assert.equal(st.stage,'recording');assert.equal(st.selectedWindow,'notion');assert.equal(st.apps.notion.declined,true);
await p.evaluate(()=>JamRecording.setStage('idle'));await hoverNotion();
assert.equal((await restartRow.textContent()).trim(),'Restart to capture logs','the restart stays on offer');
await p.mouse.click(point.x,point.y);await p.waitForTimeout(100);assert.equal((await state()).stage,'recording','no second alert');
await p.evaluate(()=>{JamRecording.setStage('idle');JamRecording.resetElectronApps();});
// Chrome keeps its own logs status
const bb=await p.locator('[data-window="browser"]').boundingBox();await p.mouse.move(bb.x+bb.width*.5,bb.y+bb.height*.85);await p.waitForTimeout(100);
assert.equal((await state()).target,'browser');assert.ok(await restartRow.isHidden());
assert.deepEqual(errors,[]);console.log('PASS: Notion asks to restart for logs, relaunches back to the card with logs enabled, and can record without logs.');await b.close();})().catch(e=>{console.error(e);process.exit(1);});
