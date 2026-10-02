(() => {
  'use strict';
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function create(root,{icon,onSize,onRatio,onOrientation,onPreset,onChangeWindow,onOpen,onClose,onToggleRulers=()=>{}}){
    const notch=document.createElement('div');
    notch.className='rb-selection-notch';notch.role='group';notch.hidden=true;
    notch.innerHTML=`<div class="rb-notch-backplate" aria-hidden="true"></div><div class="rb-notch-window-controls"><button type="button" class="rb-notch-change" aria-label="Change window" title="Change window">${icon('change')}<span class="rb-notch-change-label">Change window</span></button><i class="rb-notch-separator"></i><span class="rb-notch-logs" title="No logs">${icon('status')}<span class="rb-notch-logs-label">No logs</span></span><i class="rb-notch-separator"></i></div><div class="rb-notch-sizing"><button type="button" class="rb-notch-ratio" title="Change ratio" aria-label="Aspect ratio" aria-haspopup="menu" aria-expanded="false" aria-controls="rb-ratio-menu">${icon('aspect')}<span></span></button><label class="rb-notch-field"><span class="sr-only">Capture width</span><input class="rb-notch-width" aria-label="Capture width" type="text" inputmode="numeric" autocomplete="off" spellcheck="false"></label><span class="rb-notch-times" aria-hidden="true">×</span><label class="rb-notch-field"><span class="sr-only">Capture height</span><input class="rb-notch-height" aria-label="Capture height" type="text" inputmode="numeric" autocomplete="off" spellcheck="false"></label><button type="button" class="rb-notch-resize" aria-haspopup="menu" aria-expanded="false" aria-controls="rb-resize-menu">Resize</button><i class="rb-notch-separator rb-notch-rulers-separator" aria-hidden="true"></i><button type="button" class="rb-notch-rulers" title="Display rulers" aria-label="Display rulers" aria-pressed="false">${icon('rulers')}</button></div>`;
    const ratioMenu=document.createElement('div'),resizeMenu=document.createElement('div');
    for(const [menu,id,label] of [[ratioMenu,'rb-ratio-menu','Aspect ratio'],[resizeMenu,'rb-resize-menu','Resize presets']]){
      menu.id=id;menu.className='native-menu rb-sizing-menu';menu.role='menu';menu.tabIndex=-1;menu.setAttribute('aria-label',label);menu.hidden=true;root.append(menu);
    }
    root.append(notch);
    const $=selector=>notch.querySelector(selector),ratioButton=$('.rb-notch-ratio'),resizeButton=$('.rb-notch-resize');
    let context=null,currentMenu=null,trigger=null,contextKey=null,typeBuffer='',typeTimer=0;
    const naturalWidths=new Map(),moving=[...notch.children],animations=new Map();
    const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
    const GAP=8,FIT_BUFFER=12;
    let layout=null,pointerInput=true;
    root.addEventListener('pointerdown',()=>pointerInput=true,true);
    root.addEventListener('keydown',()=>{pointerInput=false;notch.classList.add('is-instant');stopMotion();},true);
    function stopMotion(){for(const animation of animations.values())animation.cancel();animations.clear();}
    reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)stopMotion();});
    function measureWidth(key){
      if(naturalWidths.has(key))return naturalWidths.get(key);
      // A hidden probe avoids expanding the focused live panel while measuring.
      // Expanding it at a canvas edge can otherwise scroll an overflow-hidden ancestor.
      const probe=notch.cloneNode(true);probe.inert=true;
      probe.classList.remove('is-compact');
      probe.style.cssText='left:0;top:0;width:max-content;max-width:none;visibility:hidden';
      root.append(probe);
      const wide=probe.offsetWidth,windowControls=probe.querySelector('.rb-notch-window-controls');
      windowControls.querySelector('.rb-notch-separator:last-child').remove();
      const result={wide,stacked:Math.max(windowControls.offsetWidth,probe.querySelector('.rb-notch-sizing').offsetWidth)+16};
      probe.remove();
      naturalWidths.set(key,result);return result;
    }
    function animateLayout(before){
      stopMotion();
      const scale=root.getBoundingClientRect().width/root.clientWidth;
      // FLIP each layer separately: text never scales, and capture handles stay above the backplate.
      for(const element of moving){
        const first=before.get(element),last=element.getBoundingClientRect();
        if(!first?.width||!last.width)continue;
        const x=(first.x-last.x)/scale,y=(first.y-last.y)/scale;
        const plate=element.classList.contains('rb-notch-backplate');
        const transform=`translate(${x}px,${y}px)${plate?` scale(${first.width/last.width},${first.height/last.height})`:''}`;
        const animation=element.animate([{transform},{transform:'none'}],{duration:220,easing:'cubic-bezier(.23,1,.32,1)'});
        animations.set(element,animation);
        animation.onfinish=()=>{if(animations.get(element)===animation)animations.delete(element);};
      }
    }
    document.fonts?.ready.then(()=>{naturalWidths.clear();if(context?.enabled)render(context);});
    function close(restore=true){
      if(!currentMenu)return;
      const menu=currentMenu,button=trigger;currentMenu=null;trigger=null;menu.hidden=true;
      button?.setAttribute('aria-expanded','false');clearTimeout(typeTimer);typeBuffer='';onClose(menu);
      if(restore&&!notch.hidden)button?.focus({preventScroll:true});
    }
    function position(menu,button){
      const rr=root.getBoundingClientRect(),br=button.getBoundingClientRect(),scale=rr.width/root.clientWidth;
      const width=root.clientWidth,height=root.clientHeight;
      menu.style.maxHeight=`${Math.max(40,height-16)}px`;
      const x=(br.left-rr.left)/scale,below=(br.bottom-rr.top)/scale+6,above=(br.top-rr.top)/scale-menu.offsetHeight-6;
      menu.style.left=`${clamp(x,8,width-menu.offsetWidth-8)}px`;
      menu.style.top=`${clamp(below+menu.offsetHeight<=height-8?below:above,8,height-menu.offsetHeight-8)}px`;
    }
    function menuItem(label,checked,run){
      const button=document.createElement('button');button.type='button';button.role='menuitemradio';button.className='native-menu-item';button.tabIndex=-1;button.textContent=label;button.setAttribute('aria-checked',String(checked));
      button.addEventListener('click',()=>{run();close();});
      button.addEventListener('pointermove',()=>{if(!button.disabled)button.focus({preventScroll:true});});
      return button;
    }
    function buildRatioMenu(){
      ratioMenu.innerHTML=`<div class="rb-notch-orientation" role="group" aria-label="Orientation"><button type="button" data-orientation="horizontal" aria-label="Horizontal" aria-pressed="false">${icon('horizontal')}</button><button type="button" data-orientation="vertical" aria-label="Vertical" aria-pressed="false">${icon('vertical')}</button></div><div class="native-menu-separator" role="separator"></div>`;
      ratioMenu.querySelectorAll('[data-orientation]').forEach(button=>button.addEventListener('click',()=>onOrientation(button.dataset.orientation)));
      for(const preset of ['1:1','4:3','16:9','16:10','custom']){
        const item=menuItem('',false,()=>onRatio(preset));item.dataset.ratio=preset;ratioMenu.append(item);
      }
    }
    function buildResizeMenu(){
      resizeMenu.replaceChildren();let available=0;
      for(const preset of JamSelectionGeometry.presets(context.sizing)){
        const fits=preset.width<=context.bounds.width&&preset.height<=context.bounds.height&&preset.width>=context.minimum.width&&preset.height>=context.minimum.height;
        const checked=Math.abs(context.rect.width-preset.width)<.5&&Math.abs(context.rect.height-preset.height)<.5;
        const item=menuItem(preset.label,checked,()=>onPreset(preset));item.disabled=!fits;
        if(!fits)item.title='This size does not fit the available desktop';else available++;
        resizeMenu.append(item);
      }
      if(!available){const note=document.createElement('p');note.className='rb-sizing-menu-note';note.textContent='Presets need more desktop space. Enter a size above.';resizeMenu.append(note);}
    }
    function syncRatioMenu(){
      ratioMenu.querySelectorAll('[data-orientation]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.orientation===context.sizing.orientation)));
      ratioMenu.querySelectorAll('[data-ratio]').forEach(button=>{
        button.textContent=JamSelectionGeometry.label({...context.sizing,preset:button.dataset.ratio});
        button.setAttribute('aria-checked',String(button.dataset.ratio===context.sizing.preset));
      });
    }
    function show(menu,button){
      if(!context?.enabled)return;
      if(currentMenu===menu){close();return;}
      close(false);onOpen(menu,button);currentMenu=menu;trigger=button;
      if(menu===ratioMenu){buildRatioMenu();syncRatioMenu();}else buildResizeMenu();
      menu.hidden=false;button.setAttribute('aria-expanded','true');position(menu,button);
      (menu.querySelector('.native-menu-item[aria-checked="true"]:not(:disabled)')||menu.querySelector('button:not(:disabled)')||menu).focus({preventScroll:true});
    }
    ratioButton.addEventListener('click',()=>show(ratioMenu,ratioButton));resizeButton.addEventListener('click',()=>show(resizeMenu,resizeButton));
    $('.rb-notch-change').addEventListener('click',onChangeWindow);
    $('.rb-notch-rulers').addEventListener('click',onToggleRulers);
    for(const axis of ['width','height']){
      const input=$(`.rb-notch-${axis}`);
      const restore=()=>{input.value=String(Math.round(context.rect[axis]));input.removeAttribute('aria-invalid');};
      input.addEventListener('focus',()=>{close(false);input.select();});
      input.addEventListener('input',()=>{
        const valid=/^\d+$/.test(input.value)&&Number(input.value)>0&&Number.isSafeInteger(Number(input.value));
        if(valid){input.removeAttribute('aria-invalid');onSize(axis,Number(input.value));}
        else input.setAttribute('aria-invalid','true');
      });
      input.addEventListener('blur',restore);
      input.addEventListener('keydown',event=>{
        event.stopPropagation();
        if(event.key==='Enter'){event.preventDefault();restore();input.blur();}
        else if(event.key==='Escape'){event.preventDefault();restore();input.blur();}
        else if(event.key==='ArrowUp'||event.key==='ArrowDown'){
          event.preventDefault();onSize(axis,context.rect[axis]+(event.key==='ArrowUp'?1:-1)*(event.shiftKey?10:1));restore();
        }
      });
    }
    for(const menu of [ratioMenu,resizeMenu])menu.addEventListener('keydown',event=>{
      event.stopPropagation();
      if(event.key==='Escape'||event.key==='Tab'){if(event.key==='Escape')event.preventDefault();close();return;}
      const items=[...menu.querySelectorAll('button:not(:disabled)')],index=items.indexOf(document.activeElement);let next=-1;
      if(!items.length)return;
      if(menu===ratioMenu&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){
        event.preventDefault();const orientation=event.key==='ArrowLeft'?'horizontal':'vertical';onOrientation(orientation);ratioMenu.querySelector(`[data-orientation="${orientation}"]`).focus();return;
      }
      if(event.key==='ArrowDown')next=(index+1)%items.length;else if(event.key==='ArrowUp')next=(index-1+items.length)%items.length;
      else if(event.key==='Home')next=0;else if(event.key==='End')next=items.length-1;
      else if(event.key.length===1&&!event.metaKey&&!event.ctrlKey&&event.key!==' '){typeBuffer+=event.key.toLowerCase();clearTimeout(typeTimer);typeTimer=setTimeout(()=>typeBuffer='',500);next=items.findIndex(button=>button.textContent.toLowerCase().startsWith(typeBuffer));}
      if(next>=0){event.preventDefault();items[next].focus({preventScroll:true});}
    });
    function render(next){
      const continuous=contextKey===next.key&&!notch.hidden;
      const before=continuous?new Map(moving.map(element=>[element,element.getBoundingClientRect()])):null;
      const instant=!continuous||!pointerInput||reducedMotion.matches||notch.contains(document.activeElement)&&document.activeElement.tagName==='INPUT';
      notch.classList.toggle('is-instant',instant);
      context=next;
      if(!continuous||!next.enabled){close(false);stopMotion();layout=null;}
      contextKey=next.key;notch.hidden=!next.enabled;if(!next.enabled)return;
      const windowMode=next.mode==='window',locked=next.sizing.preset!=='custom';
      notch.classList.toggle('is-window',windowMode);notch.classList.toggle('is-ratio-locked',locked);
      $('.rb-notch-rulers').hidden=windowMode;$('.rb-notch-rulers-separator').hidden=windowMode;
      $('.rb-notch-rulers').setAttribute('aria-pressed',String(!!next.sizing.rulers));
      notch.setAttribute('aria-label',`${windowMode?'Window':'Area'} sizing`);$('.rb-notch-window-controls').hidden=!windowMode;
      ratioButton.querySelector('span:last-child').textContent=locked?JamSelectionGeometry.label(next.sizing):'';
      ratioButton.setAttribute('aria-label',`Aspect ratio: ${JamSelectionGeometry.label(next.sizing)}`);
      for(const axis of ['width','height']){const input=$(`.rb-notch-${axis}`);if(document.activeElement!==input)input.value=String(Math.round(next.rect[axis]));input.setAttribute('aria-description',locked?'Aspect ratio locked. Changing this value updates the other dimension.':'Size in pixels');}
      const width=root.clientWidth,height=root.clientHeight;
      const available=Math.max(0,width-16),fitWidth=Math.min(available,next.rect.width);
      const natural=measureWidth(`${windowMode}:${JamSelectionGeometry.label(next.sizing)}`);
      const compact=windowMode&&(layout?.compact?natural.wide+FIT_BUFFER>fitWidth:natural.wide>fitWidth);
      notch.classList.toggle('is-compact',compact);
      notch.style.width=`${compact?natural.stacked:natural.wide}px`;
      notch.style.maxWidth=`${available}px`;
      const panelWidth=notch.offsetWidth,panelHeight=notch.offsetHeight;
      const floating=layout?.floating?next.rect.width<panelWidth+FIT_BUFFER:next.rect.width<panelWidth;
      const bottom=next.rect.y+next.rect.height;
      const below=bottom+(floating?GAP:0);
      const above=floating&&below+panelHeight>height-4&&next.rect.y-panelHeight-GAP>=0;
      const inside=!above&&below+panelHeight>height-4;
      const x=clamp(next.rect.x+next.rect.width/2-panelWidth/2,8,width-panelWidth-8);
      const y=above?next.rect.y-panelHeight-GAP:inside?bottom-panelHeight-(floating?GAP:0):below;
      const changed=layout&&(layout.compact!==compact||layout.floating!==floating||layout.above!==above||layout.inside!==inside);
      notch.classList.toggle('is-floating',floating);notch.classList.toggle('is-inset',inside);
      notch.classList.toggle('is-above',above);
      notch.style.left=`${x}px`;notch.style.top=`${clamp(y,0,height-panelHeight)}px`;
      if(changed&&before&&!instant&&!currentMenu)animateLayout(before);
      else if(instant)stopMotion();
      layout={compact,floating,above,inside};
      if(currentMenu===ratioMenu)syncRatioMenu();
      if(currentMenu)position(currentMenu,trigger);
    }
    return {render,close,owns:menu=>menu===ratioMenu||menu===resizeMenu};
  }
  globalThis.JamSelectionNotch={create};
})();
