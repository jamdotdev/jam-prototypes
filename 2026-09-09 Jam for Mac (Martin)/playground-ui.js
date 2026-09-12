(() => {
  'use strict';
  const defaults=window.JamDefaults, schema=window.JamPlaygroundSchema;
  const configurations=[
    {id:'welcome-playground',reset:'welcome-reset',surface:'welcome'},
    {id:'onboarding-playground',reset:'reset-all',surface:'onboarding'},
    {id:'draft-playground',reset:'draft-reset',surface:'draft'},
    {id:'recording-playground',reset:'recording-reset',surface:'recording'},
  ];
  defaults.register('permissions',{
    groups:['grid','permissions'],
    read:()=>({grid:JamPlayground.getGridSettings(),permissions:JamWelcomeFlow.getPermissionSettings()}),
    apply(values){JamPlayground.applyGridSettings(values.grid);JamWelcomeFlow.updatePermissionSettings(values.permissions,false);},
  });
  const shells=new Map();let current=null,refreshFrame=0;
  const sidebar=document.createElement('aside');sidebar.id='playground-sidebar';sidebar.className='playground-sidebar';sidebar.setAttribute('aria-label','Playground');sidebar.inert=true;document.body.append(sidebar);
  const settingsButton=document.getElementById('playground-settings');
  function syncSidebar(){
    const open=JamPlayground.isPlaygroundVisible();
    document.body.classList.toggle('playground-open',open);sidebar.inert=!open;
    sidebar.setAttribute('aria-hidden',String(!open));settingsButton.setAttribute('aria-expanded',String(open));
    settingsButton.setAttribute('aria-label',open?'Close playground':'Open playground');
    if(open&&document.activeElement===settingsButton)sidebar.querySelector('.pg-shell:not([hidden]) .collapse-button')?.focus({preventScroll:true});
  }
  function toggleSidebar(open,keyboard=false){
    document.body.classList.toggle('playground-instant',keyboard);
    JamPlayground.setPlaygroundVisible(open);
    if(!open)settingsButton.focus({preventScroll:true});
  }
  settingsButton.addEventListener('click',event=>toggleSidebar(!JamPlayground.isPlaygroundVisible(),event.detail===0));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!event.defaultPrevented&&JamPlayground.isPlaygroundVisible()&&!document.querySelector('.dialkit-select-content,[role="menu"]:not([hidden]),dialog[open]')){
      toggleSidebar(false,true);event.preventDefault();
    }
  });
  function screenFor(surface){
    if(surface!=='welcome')return surface;
    const stage=JamWelcomeFlow.getState().stage;
    return stage==='welcome'?'welcome':stage==='permissions'||stage==='returning'?'permissions':'handoff';
  }
  function go(screen){
    if(screen==='draft'||screen==='recording'){JamPlayground.setSurface(screen);return;}
    JamWelcomeFlow.goToScreen(screen==='handoff'?'waiting':screen);
  }
  function iconButton(label,direction){
    const button=document.createElement('button');button.type='button';button.className='pg-icon-button';button.title=label;button.setAttribute('aria-label',label);
    button.innerHTML=`<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${direction==='left'?'m10 4-4 4 4 4':'m6 4 4 4-4 4'}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;return button;
  }
  for(const config of configurations){
    const root=document.getElementById(config.id);root.classList.add('dialkit-root','pg-shell');root.dataset.mode='inline';sidebar.append(root);
    root.innerHTML=`<div class="toolbar-title-row"><div class="toolbar-title"><span class="live-dot"></span>Playground</div><div class="toolbar-screen-center"></div><div class="toolbar-actions"><button type="button" class="collapse-button" aria-label="Close playground"><img src="assets/recording/sf/xmark.png" alt=""></button></div></div><div class="pg-content"><div class="pg-player" aria-label="Player"></div><div class="pg-sections" aria-label="Element controls"></div><div class="playground-footer"><span class="playground-default-status" role="status"></span><div class="playground-default-actions"><button type="button" class="text-button" id="${config.reset}">Reset</button><button type="button" class="text-button make-default-button" id="${config.surface}-make-default" disabled>Make Default</button></div></div></div>`;
    const shell={...config,root,center:root.querySelector('.toolbar-screen-center'),playerHost:root.querySelector('.pg-player'),sectionsHost:root.querySelector('.pg-sections'),status:root.querySelector('.playground-default-status'),resetButton:root.querySelector(`#${config.reset}`),save:root.querySelector('.make-default-button')};shells.set(config.surface,shell);
    const collapse=root.querySelector('.collapse-button');
    collapse.addEventListener('click',event=>toggleSidebar(false,event.detail===0));
    shell.resetButton.addEventListener('click',()=>{defaults.reset(screenFor(config.surface));shell.status.textContent='';refresh();});
    shell.save.addEventListener('click',async()=>{
      const screen=screenFor(config.surface);shell.status.textContent='';
      try{await defaults.save(screen);if(screen===screenFor(config.surface))shell.status.textContent='Defaults saved';}
      catch(error){shell.status.textContent=error.message;}
      refresh();
    });
  }
  function destroyCurrent(){if(!current)return;current.unsubscribe?.();current.controls.destroy();current.player.destroy();current.title.destroy();current.shell.center.replaceChildren();current=null;}
  function mountScreen(shell,screen){
    destroyCurrent();shell.status.textContent='';
    const titleHost=document.createElement('div');titleHost.className='pg-screen-select';shell.center.append(titleHost);
    const title=DialKit.mountSelectControl(titleHost,{label:'',value:screen,options:schema.screens.map(({id,label})=>({value:id,label})),onChange:go});titleHost.querySelector('button').setAttribute('aria-label',`Screen: ${schema.screens.find(item=>item.id===screen).label}`);
    const index=schema.screens.findIndex(item=>item.id===screen);
    if(['welcome','handoff','permissions','onboarding'].includes(screen)){
      const previous=iconButton('Previous onboarding screen','left'),next=iconButton('Next onboarding screen','right');previous.disabled=index===0;next.disabled=index===3;
      previous.addEventListener('click',()=>go(schema.screens[index-1].id));next.addEventListener('click',()=>go(schema.screens[index+1].id));shell.center.append(previous,next);
    }
    const controls=JamPlaygroundControls.mount(shell.sectionsHost,screen,schema.sections(screen));
    const player=JamPlaygroundPlayer.mount(shell.playerHost,screen);
    current={shell,screen,controls,player,title,lastSettings:''};
    const engine=schema.engine(screen);
    current.unsubscribe=engine?.subscribe(()=>{
      if(!current||current.screen!==screen)return;
      player.refresh();controls.refreshReadouts();
      // Playback frames update only transport; control mounts stay stable during drags.
      const settings=JSON.stringify(screen==='recording'?{settings:engine.getSettings(),stage:engine.getState().stage,camera:engine.getCameraStatus()}:engine.getSettings());
      if(settings!==current.lastSettings){current.lastSettings=settings;scheduleRefresh();}
    });
    shell.root.dataset.screen=screen;
    shell.root.setAttribute("aria-label", `${schema.screens.find(item=>item.id===screen).label} playground controls`);
    // Body height is bounded independently of disclosure state, so the app never shrinks as sections open.
    JamPlayground.fit(false);
  }
  function refresh(){
    syncSidebar();
    const surface=JamPlayground.getSurface(),screen=screenFor(surface),shell=shells.get(surface);
    if(!current||current.screen!==screen||current.shell!==shell)mountScreen(shell,screen);
    current.controls.refresh();current.player.refresh();
    for(const item of shells.values()){
      const key=screenFor(item.surface),dirty=defaults.isDirty(key),saving=defaults.isSaving(key);
      item.save.disabled=!dirty||saving;item.resetButton.disabled=saving;item.save.textContent=saving?'Saving…':'Make Default';
      item.save.title=dirty?'Save these settings as the default for this screen':'These settings match the default';
      if(dirty&&item.status.textContent==='Defaults saved')item.status.textContent='';
    }
  }
  function scheduleRefresh(){if(!refreshFrame)refreshFrame=requestAnimationFrame(()=>{refreshFrame=0;refresh();});}
  window.addEventListener('defaultsstatechange',scheduleRefresh);
  document.addEventListener('playgroundchange',refresh);
  document.addEventListener('welcomeflowchange',refresh);
  for(const name of ['gridoptionschange','lensoptionschange'])document.addEventListener(name,scheduleRefresh);
  refresh();JamPlayground.fit();
})();
