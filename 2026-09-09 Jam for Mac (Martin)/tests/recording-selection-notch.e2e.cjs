const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.RECORDING_TEST_URL||'http://127.0.0.1:8766/?surface=recording';
const output=process.env.RECORDING_TEST_OUTPUT||'/tmp/jam-notch-e2e';fs.mkdirSync(output,{recursive:true});
const near=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<.6,`${message}: ${actual} != ${expected}`);
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const page=await browser.newPage({viewport:{width:1360,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('response',response=>{if(response.status()>=400&&/recording-selection|assets\/recording\/sf/.test(response.url()))errors.push(`${response.status()} ${response.url()}`);});
  const state=()=>page.evaluate(()=>JamRecording.getState()),rect=async()=> (await state()).bounds;
  const mode=async value=>{await page.evaluate(value=>{JamRecording.setStage('idle');JamRecording.setMode(value);},value);};
  const notch=page.locator('.rb-selection-notch'),ratioButton=page.locator('.rb-notch-ratio'),resizeButton=page.locator('.rb-notch-resize');
  async function ratio(preset){await ratioButton.click();await page.locator(`#rb-ratio-menu [data-ratio="${preset}"]`).click();}
  async function orientation(value){await ratioButton.click();await page.getByRole('button',{name:value==='vertical'?'Vertical':'Horizontal',exact:true}).click();await page.keyboard.press('Escape');}
  async function dimension(axis,value){const input=page.getByRole('textbox',{name:`Capture ${axis}`,exact:true});await input.fill(String(value));await input.press('Tab');}
  async function baseline(){await ratio('custom');await dimension('width',400);await dimension('height',300);}
  async function checkFields(){const r=await rect();near(Number(await page.locator('.rb-notch-width').inputValue()),r.width,'Width follows rectangle');near(Number(await page.locator('.rb-notch-height').inputValue()),r.height,'Height follows rectangle');}
  async function dragHandle(handle,dx,dy,modifiers=[]){
    const box=await page.locator(`.rb-handle-${handle}`).boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
    for(const modifier of modifiers)await page.keyboard.down(modifier);
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:6});await checkFields();await page.mouse.up();
    for(const modifier of [...modifiers].reverse())await page.keyboard.up(modifier);
  }
  try{
    await page.goto(url);await page.waitForFunction(()=>window.JamRecording&&window.JamSelectionGeometry);
    await page.evaluate(()=>JamRecording.updateSettings({camera:false}));await mode('area');await checkFields();
    assert.ok(await notch.isVisible());assert.ok(!await page.locator('.rb-notch-window-controls').isVisible());
    assert.equal(await page.locator('.rb-notch-ratio .rb-sf').evaluate(el=>getComputedStyle(el).display),'block','Aspect symbol is visible');
    const beforeFlip=await rect();await orientation('vertical');let r=await rect();near(r.width,beforeFlip.height,'Custom orientation swaps width');near(r.height,beforeFlip.width,'Custom orientation swaps height');
    await resizeButton.click();assert.deepEqual((await page.locator('#rb-resize-menu .native-menu-item').allTextContents()).slice(0,3),['640 × 360','960 × 540','1280 × 720'],'Custom includes smaller landscape 16:9 presets in ascending order');await page.keyboard.press('Escape');
    await orientation('horizontal');
    for(const preset of ['1:1','4:3','16:9','16:10'])for(const direction of ['horizontal','vertical']){
      await orientation(direction);await ratio(preset);r=await rect();const [a,b]=preset.split(':').map(Number),q=direction==='vertical'?b/a:a/b;
      near(r.width/r.height,q,`Ratio ${preset} ${direction}`);await checkFields();
      assert.ok(await notch.evaluate(el=>el.classList.contains('is-ratio-locked')));
      await resizeButton.click();const text=await page.locator('#rb-resize-menu .native-menu-item').first().innerText();
      const [w,h]=text.split(' × ').map(Number);near(w/h,q,'Preset follows ratio and orientation');await page.keyboard.press('Escape');
    }
    await orientation('horizontal');await ratio('4:3');await dimension('width',600);r=await rect();near(r.height,450,'Locked width updates height');
    await dimension('height',300);r=await rect();near(r.width,400,'Locked height updates width');
    const widthInput=page.locator('.rb-notch-width');await widthInput.fill('');await widthInput.press('Escape');assert.equal((await state()).sizing.preset,'4:3');near(Number(await widthInput.inputValue()),400,'Empty input restores');
    await widthInput.fill('abc');await widthInput.press('Enter');await checkFields();
    await widthInput.focus();await widthInput.press('ArrowUp');await widthInput.press('Escape');near((await rect()).width,401,'Arrow key edits size without moving selection');
    await resizeButton.click();await page.getByRole('menuitemradio',{name:'640 × 480',exact:true}).click();r=await rect();near(r.width,640,'Exact preset width');near(r.height,480,'Exact preset height');
    for(const modifiers of [[],['Shift'],['Alt'],['Alt','Shift']])for(const handle of ['nw','n','ne','e','se','s','sw','w']){
      await baseline();const start=await rect(),gx=handle.includes('w')?-1:handle.includes('e')?1:0,gy=handle.includes('n')?-1:handle.includes('s')?1:0;
      await dragHandle(handle,gx*30,gy*12,modifiers);r=await rect();
      if(modifiers.includes('Shift'))near(r.width/r.height,start.width/start.height,'Shift locks custom ratio');
      if(modifiers.includes('Alt')){near(r.x+r.width/2,start.x+start.width/2,'Option keeps center X');near(r.y+r.height/2,start.y+start.height/2,'Option keeps center Y');}
      else{if(gx)near(gx>0?r.x:r.x+r.width,gx>0?start.x:start.x+start.width,'Opposite horizontal edge stays');if(gy)near(gy>0?r.y:r.y+r.height,gy>0?start.y:start.y+start.height,'Opposite vertical edge stays');}
    }
    await baseline();const handleBox=await page.locator('.rb-handle-e').boundingBox(),startX=handleBox.x+10,startY=handleBox.y+10;
    await page.mouse.move(startX,startY);await page.mouse.down();await page.mouse.move(startX+30,startY);const beforeShift=await rect();
    await page.keyboard.down('Shift');await page.mouse.move(startX+30,startY);let afterShift=await rect();near(afterShift.width,beforeShift.width,'Shift entry has no width jump');near(afterShift.height,beforeShift.height,'Shift entry has no height jump');
    await page.mouse.move(startX+60,startY);afterShift=await rect();near(afterShift.width/afterShift.height,beforeShift.width/beforeShift.height,'Shift locks shape at moment of press');await page.mouse.up();await page.keyboard.up('Shift');
    await ratio('16:9');await dimension('width',600);const locked=await rect();await dragHandle('se',30,70,['Shift']);r=await rect();near(r.width/r.height,16/9,'Shift does not override preset');assert.ok(r.height>locked.height);
    assert.equal(await page.locator('.rb-area-dimensions').count(),0,'Dimensions appear only in the sizing notch');
    const bottomHandle=await page.locator('.rb-handle-s').boundingBox();
    assert.ok(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.classList.contains('rb-handle-s'),{x:bottomHandle.x+bottomHandle.width/2,y:bottomHandle.y+14}),'Bottom handle stays reachable over the notch lip');
    await page.screenshot({path:path.join(output,'area-locked.png')});
    await ratioButton.click();await page.screenshot({path:path.join(output,'area-ratio-menu.png')});await page.keyboard.press('Escape');
    // New drawings retain explicit ratio and never include the notch in the capture bounds.
    await page.mouse.move(40,70);await page.mouse.down();await page.mouse.move(240,200,{steps:8});await page.mouse.up();near((await rect()).width/(await rect()).height,16/9,'Drawing preserves ratio');await checkFields();
    await ratio('custom');await dimension('width',50);await dimension('height',50);r=await rect();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollLeft),0,'Sizing focus never scrolls the desktop');
    await page.mouse.move(r.x+25,r.y+25);await page.mouse.down();await page.mouse.move(60,999,{steps:8});await page.mouse.up();
    assert.ok(await notch.evaluate(el=>el.classList.contains('is-above')),'Small area at bottom floats above selection');
    const bottomNotch=await notch.boundingBox();assert.ok(bottomNotch.y+bottomNotch.height<=1000,'Bottom notch remains visible');await checkFields();await ratioButton.click();assert.ok(await page.locator('#rb-ratio-menu').isVisible(),'Inset notch stays interactive');await page.keyboard.press('Escape');
    await mode('window');assert.ok(!await notch.isVisible());await page.evaluate(()=>JamRecording.selectWindow('browser'));assert.ok(await notch.isVisible());assert.ok(await page.locator('.rb-notch-window-controls').isVisible());
    assert.equal(await page.locator('.rb-notch-change').getAttribute('title'),'Change window');
    assert.equal(await ratioButton.getAttribute('title'),'Change ratio');
    for(const width of [470,800,470,800,320]){
      await dimension('width',width);
      assert.ok(await page.locator('.rb-notch-change-label').isVisible(),'Change window text stays visible');
      assert.ok(await page.locator('.rb-notch-logs-label').isVisible(),'Full logs status stays visible');
      const firstRow=await page.locator('.rb-notch-window-controls').boundingBox(),secondRow=await page.locator('.rb-notch-sizing').boundingBox();
      assert.equal(secondRow.y>firstRow.y+firstRow.height,width<700,'Rows stack when the window cannot fit the full notch');
      const box=await notch.boundingBox();assert.ok(box.width<=width+.6||await notch.evaluate(el=>el.classList.contains('is-floating')),'Window notch fits the selection or detaches');
      for(const child of await notch.locator('button:visible,input:visible').all()){const cb=await child.boundingBox();assert.ok(cb.x>=box.x-.6&&cb.x+cb.width<=box.x+box.width+.6,'Narrow notch controls stay inside');}
      if(width===470)await page.screenshot({path:path.join(output,'window-stacked.png')});
    }
    await ratio('4:3');await dimension('width',640);r=await rect();near(r.height,480,'Window dimensions honor ratio');
    const nativeWindow=await page.locator('[data-window="browser"]').boundingBox();near(nativeWindow.width,r.width,'Actual window width changes');near(nativeWindow.height,r.height,'Actual window height changes');
    const windowHandle=await page.locator('[data-window="browser"] .rb-window-resizer').boundingBox();await page.mouse.move(windowHandle.x+10,windowHandle.y+10);await page.mouse.down();await page.mouse.move(windowHandle.x+40,windowHandle.y+40,{steps:8});await page.mouse.up();near((await rect()).width/(await rect()).height,4/3,'Native window resizer respects locked ratio');await checkFields();
    await page.screenshot({path:path.join(output,'window-locked.png')});await resizeButton.click();await page.screenshot({path:path.join(output,'window-presets.png')});await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Change window',exact:true}).click();assert.equal((await state()).selectedWindow,null);await page.evaluate(()=>JamRecording.selectWindow('finder'));assert.equal((await state()).sizing.preset,'custom','Each window owns sizing state');
    await page.getByRole('button',{name:'Change window',exact:true}).click();await page.evaluate(()=>JamRecording.selectWindow('browser'));assert.equal((await state()).sizing.preset,'4:3','Reselection retains window ratio');
    // Sidebar resizing retains locked geometry; narrow menus remain usable.
    await page.locator('#playground-settings').click();await page.waitForTimeout(450);near((await rect()).width/(await rect()).height,4/3,'Sidebar preserves ratio');
    await page.setViewportSize({width:863,height:900});await page.waitForTimeout(450);r=await rect();near(r.width/r.height,4/3,'Narrow canvas preserves ratio');
    const desktopBox=await page.locator('#desktop').boundingBox(),notchBox=await notch.boundingBox();assert.ok(notchBox.x>=desktopBox.x&&notchBox.x+notchBox.width<=desktopBox.x+desktopBox.width+.6,'Notch stays inside canvas');
    const captureBox=await page.locator('#recording-window').boundingBox();
    near(notchBox.x,Math.max(captureBox.x+8,Math.min(captureBox.x+captureBox.width-notchBox.width-8,captureBox.x+r.x+r.width/2-notchBox.width/2)),'Compact notch remains centered or clamped');
    for(const child of await notch.locator('button:visible,input:visible').all()){const box=await child.boundingBox();assert.ok(box.x>=notchBox.x-.6&&box.x+box.width<=notchBox.x+notchBox.width+.6,'Compact controls stay inside notch');}
    await ratio('16:9');await resizeButton.click();assert.equal(await page.locator('#rb-resize-menu button:not(:disabled)').count(),0,'Oversized presets disabled');await page.keyboard.press('Home');await page.keyboard.press('End');await page.keyboard.press('Escape');
    await page.screenshot({path:path.join(output,'window-sidebar-narrow.png')});
    await page.evaluate(()=>JamRecording.updateSettings({camera:true,followCursor:true}));await page.waitForFunction(()=>JamRecording.getCameraState().status==='live');
    await page.mouse.move(desktopBox.x+10,desktopBox.y+80);await page.waitForTimeout(1000);r=await rect();const camera=(await state()).camera;
    assert.ok(camera.x-camera.size/2>=r.x-1&&camera.x+camera.size/2<=r.x+r.width+1&&camera.y-camera.size/2>=r.y-1&&camera.y+camera.size/2<=r.y+r.height+1,'Follower stays in resized capture');
    await page.evaluate(()=>JamRecording.setStage('recording'));assert.ok(!await notch.isVisible(),'Notch hides while recording');await page.evaluate(()=>JamRecording.setStage('paused'));assert.ok(!await notch.isVisible(),'Notch hides while paused');
    await page.evaluate(()=>JamRecording.setStage('idle'));assert.ok(await notch.isVisible());
    await mode('screen');assert.ok(!await notch.isVisible(),'Screen has no sizing notch');await mode('area');assert.ok(await notch.isVisible());
    await page.emulateMedia({reducedMotion:'reduce'});await ratio('1:1');near((await rect()).width/(await rect()).height,1,'Reduced motion preserves functionality');
    await page.evaluate(()=>JamRecording.resetSelection());assert.equal((await state()).sizing.preset,'custom','Reset clears selection ratios');
    assert.deepEqual(errors,[],'No browser runtime or asset errors');
    console.log('PASS: window/area notches, live fields, menus, all handles/modifiers, mid-drag Shift, presets, drawing, sidebar, camera bounds, state lifecycle and reduced motion.');
  }catch(error){await page.screenshot({path:path.join(output,'failure.png')});console.error('Page errors:',errors);throw error;}
  finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
