(() => {
  'use strict';
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function create(root,{icon,onSize,onRatio,onOrientation,onPreset,onChangeWindow,onOpen,onClose}){
    const notch=document.createElement('div');
    notch.className='rb-selection-notch';notch.role='group';notch.hidden=true;
    notch.innerHTML=`<div class="rb-notch-window-controls"><button type="button" class="rb-notch-change">${icon('change')}<span>Change window</span></button><i class="rb-notch-separator"></i><span class="rb-notch-logs">${icon('status')}Not capturing logs</span><i class="rb-notch-separator"></i></div><div class="rb-notch-sizing"><button type="button" class="rb-notch-ratio" aria-label="Aspect ratio" aria-haspopup="menu" aria-expanded="false" aria-controls="rb-ratio-menu">${icon('aspect')}<span></span></button><label class="rb-notch-field"><span class="sr-only">Capture width</span><input class="rb-notch-width" aria-label="Capture width" type="text" inputmode="numeric" autocomplete="off" spellcheck="false"></label><span class="rb-notch-times" aria-hidden="true">×</span><label class="rb-notch-field"><span class="sr-only">Capture height</span><input class="rb-notch-height" aria-label="Capture height" type="text" inputmode="numeric" autocomplete="off" spellcheck="false"></label><button type="button" class="rb-notch-resize" aria-haspopup="menu" aria-expanded="false" aria-controls="rb-resize-menu">Resize</button></div>`;
    const ratioMenu=document.createElement('div'),resizeMenu=document.createElement('div');
    for(const [menu,id,label] of [[ratioMenu,'rb-ratio-menu','Aspect ratio'],[resizeMenu,'rb-resize-menu','Resize presets']]){
      menu.id=id;menu.className='native-menu rb-sizing-menu';menu.role='menu';menu.tabIndex=-1;menu.setAttribute('aria-label',label);menu.hidden=true;root.append(menu);
    }
    root.append(notch);
    const $=selector=>notch.querySelector(selector),ratioButton=$('.rb-notch-ratio'),resizeButton=$('.rb-notch-resize');
    let context=null,currentMenu=null,trigger=null,contextKey=null,typeBuffer='',typeTimer=0;
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
      context=next;
      if(contextKey!==next.key||!next.enabled)close(false);
      contextKey=next.key;notch.hidden=!next.enabled;if(!next.enabled)return;
      const windowMode=next.mode==='window',locked=next.sizing.preset!=='custom';
      notch.classList.toggle('is-window',windowMode);notch.classList.toggle('is-ratio-locked',locked);
      notch.setAttribute('aria-label',`${windowMode?'Window':'Area'} sizing`);$('.rb-notch-window-controls').hidden=!windowMode;
      ratioButton.querySelector('span:last-child').textContent=locked?JamSelectionGeometry.label(next.sizing):'';
      ratioButton.setAttribute('aria-label',`Aspect ratio: ${JamSelectionGeometry.label(next.sizing)}`);
      for(const axis of ['width','height']){const input=$(`.rb-notch-${axis}`);if(document.activeElement!==input)input.value=String(Math.round(next.rect[axis]));input.setAttribute('aria-description',locked?'Aspect ratio locked. Changing this value updates the other dimension.':'Size in pixels');}
      const width=root.clientWidth,height=root.clientHeight;
      notch.classList.toggle('is-compact',width<620);
      notch.style.maxWidth=`${Math.max(0,width-16)}px`;
      const x=clamp(next.rect.x+next.rect.width/2-notch.offsetWidth/2,8,width-notch.offsetWidth-8);
      const bottom=next.rect.y+next.rect.height,inside=bottom+notch.offsetHeight>height-4;
      notch.classList.toggle('is-inset',inside);
      notch.style.left=`${x}px`;notch.style.top=`${clamp(inside?bottom-notch.offsetHeight:bottom,0,height-notch.offsetHeight)}px`;
      if(currentMenu===ratioMenu)syncRatioMenu();
      if(currentMenu)position(currentMenu,trigger);
    }
    return {render,close,owns:menu=>menu===ratioMenu||menu===resizeMenu};
  }
  globalThis.JamSelectionNotch={create};
})();
