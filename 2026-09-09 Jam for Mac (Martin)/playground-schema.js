(() => {
  'use strict';
  // This describes controls only. Engines own live values; JamDefaults owns baselines.
  const W=()=>window.JamWelcome, F=()=>window.JamWelcomeFlow, G=()=>window.JamPlayground, D=()=>window.JamDraft, R=()=>window.JamRecording;
  const option=(value,label)=>({value:String(value),label});
  const options=values=>values.map(value=>typeof value==='string'?option(value,value[0].toUpperCase()+value.slice(1)):option(...value));
  const field=(type,id,label,get,set,extra={})=>({type,id,label,get,set,...extra});
  const slider=(id,label,get,set,min,max,step=1,unit='')=>field('slider',id,label,get,set,{min,max,step,unit});
  const toggle=(id,label,get,set)=>field('toggle',id,label,get,set);
  const select=(id,label,get,set,values)=>field('select',id,label,get,set,{options:options(values)});
  const action=(id,label,run)=>({type:'action',id,label,run});
  const readout=(id,label,get)=>({type:'readout',id,label,get});
  const section=(id,title,controls,open=true)=>({id,title,controls,open});
  const welcomeSetting=(id,label,min,max,step,unit)=>slider(id,label,()=>W().getSettings().settings[id],value=>W().updateSettings({settings:{[id]:value}}),min,max,step,unit);
  const handoffSetting=(id,label,min,max,step,unit)=>slider(id,label,()=>F().getSettings().settings[id],value=>F().updateSettings({settings:{[id]:value}}),min,max,step,unit);
  const recordingSetting=(id,label,min,max,step,unit)=>slider(id,label,()=>R().getSettings()[id],value=>R().updateSettings({[id]:value}),min,max,step,unit);
  const recordingToggle=(id,label)=>toggle(id,label,()=>R().getSettings()[id],value=>R().updateSettings({[id]:value}));
  const recordingColor=(id,label)=>field('color',id,label,()=>R().getSettings()[id],value=>R().updateSettings({[id]:value}));
  const gridSlider=(id,label,min,max,step,unit)=>slider(`grid-${id}`,label,()=>G().getGridOptions()[id],value=>G().updateGridOptions({[id]:value}),min,max,step,unit);
  const seconds=value=>{const n=Math.max(0,Number(value)||0);return `${Math.floor(n/60)}:${(n%60).toFixed(2).padStart(5,'0')}`;};
  function grid(){return section('grid','Grid',[
    toggle('grid-enabled','Hover effect',()=>G().getGridOptions().enabled,value=>G().updateGridOptions({enabled:value})),
    select('grid-effect','Motion',()=>G().getGridOptions().effect,value=>G().updateGridOptions({effect:value}),['disperse','magnetize','bulge','twist','ripple','trail']),
    gridSlider('strength',()=>G().getGridLabels().strength,0,100,1,'%'),
    gridSlider('radius',()=>G().getGridLabels().radius,40,240,4,'px'),
    gridSlider('speed',()=>G().getGridLabels().speed,.2,2,.1,'×'),
    gridSlider('fill','Cell fill',0,30,1,'%'),
  ]);}
  function sections(screen){
    if(screen==='recording')return [
      section('capture','Capture',[
        select('mode','Selection',()=>R().getSettings().mode,value=>R().setMode(value),[['screen','Screen'],['window','Window'],['area','Area']]),
        select('stage','State',()=>R().getState().stage,value=>R().setStage(value),[['idle','Idle'],['recording','Recording'],['paused','Paused'],['limit','Time limit']]),
        recordingToggle('microphone','Microphone'),
        action('reset-selection','Reset selection',()=>R().resetSelection()),
      ]),
      section('camera','Camera',[
        action('use-camera','Use Mac camera',()=>R().requestCamera()),
        readout('camera-status','Camera',()=>R().getCameraStatus()),
        toggle('camera','Camera bubble',()=>R().getSettings().camera,value=>value?R().requestCamera(R().getCameraState().deviceId):R().updateSettings({camera:false})),
        recordingSetting('cameraSize','Bubble size',()=>R().getSettings().cameraMinSize,()=>R().getSettings().cameraMaxSize,1,'px'),
        recordingSetting('cameraZoom','Camera zoom',1,3,.05,'×'),
        recordingSetting('cameraMinSize','Minimum size',12,()=>R().getSettings().cameraMaxSize,1,'px'),
        recordingSetting('cameraMaxSize','Maximum size',()=>R().getSettings().cameraMinSize,480,1,'px'),
        recordingToggle('followCursor','Follow cursor'),
        recordingSetting('followSize','Follower size',12,160,1,'px'),
        recordingToggle('mirror','Mirror camera'),
      ]),
      section('camera-borders','Overlay borders',[
        recordingColor('placeholderContrastColor','Default color'),
        recordingColor('placeholderContrastHoverColor','Hover color'),
        recordingColor('placeholderContrastActiveColor','Active color'),
        recordingColor('placeholderContrastEdgeColor','Edge color'),
      ]),
      section('placeholders','Camera placeholders',[
        recordingSetting('placeholderTargetScale','Target scale',1,1.3,.01,'×'),
        recordingSetting('placeholderOtherOpacity','Other placeholders',0,100,1,'%'),
        recordingSetting('placeholderStroke','Stroke width',.5,4,.5,'px'),
        recordingSetting('placeholderActiveStroke','Active stroke increase',0,4,.5,'px'),
        recordingSetting('placeholderDash','Dash length',1,16,1,'px'),
        recordingSetting('placeholderGap','Gap length',1,24,1,'px'),
        recordingColor('placeholderOverlayColor','Overlay color'),
        recordingSetting('placeholderOverlayOpacity','Overlay opacity',0,80,1,'%'),
      ]),
      section('belt','Belt spring',[
        recordingSetting('beltSpring','Stiffness',80,500,10,''),
        recordingSetting('beltDamping','Damping',10,50,1,''),
      ]),
      section('follower','Cursor follower',[
        recordingSetting('followShrink','Motion shrink',0,30,1,'%'),
        recordingSetting('gap','Cursor gap',8,64,2,'px'),
        recordingSetting('stiffness','Stiffness',80,500,10,''),
        recordingSetting('damping','Damping',10,50,1,''),
        recordingSetting('anticipation','Anticipation',0,100,1,'%'),
        recordingToggle('showBounds','Show capture bounds'),
      ]),
      section('time-limit','Recording limit',[
        readout('maximum-duration','Stops at',()=> '30:00'),
        slider('elapsed','Elapsed',()=>R().getState().elapsed,value=>R().setElapsed(value),0,1800,1,'s'),
        action('preview-limit','Preview final 10 seconds',()=>R().previewLimit()),
        recordingSetting('warningSeconds','Warning window',5,30,1,'s'),
        recordingSetting('pulseStart','Starting pulse',600,1600,50,'ms'),
        recordingSetting('pulseEnd','Final pulse',350,600,25,'ms'),
        recordingSetting('pulseStrength','Pulse strength',0,8,1,'%'),
      ]),
    ];
    if(screen==='welcome')return [
      section('stickers','Stickers',[
        welcomeSetting('stagger','Stagger',0,90,5,'ms'),welcomeSetting('turn','Arrival turn',0,120,5,'°'),
        welcomeSetting('drift','Slow rotation',0,5,.1,'°/s'),welcomeSetting('depth','Perspective',0,60,1,'%'),
        welcomeSetting('orbit','Orbit size',70,115,1,'%'),
        toggle('keep-rotating','Keep rotating',()=>W().getSettings().keepRotating,value=>W().updateSettings({keepRotating:value})),
      ]),
      section('grid','Grid',[
        select('grid-style','Motion',()=>W().getSettings().settings.gridStyle,value=>W().updateSettings({settings:{gridStyle:value}}),['wave','diffusion','magnetize','twist']),
        welcomeSetting('gridAmount','Deformation',0,20,1,'px'),welcomeSetting('gridSoftness','Softness',20,100,1,'%'),
        action('replay-grid','Replay grid',()=>W().replayGrid()),
        section('horizontal','Horizontal lines',[
          welcomeSetting('hDelay','Start delay',0,1200,20,'ms'),welcomeSetting('hDuration','Duration',100,2400,20,'ms'),welcomeSetting('hOpacity','Opacity',0,100,1,'%'),
        ],false),
        section('vertical','Vertical lines',[
          welcomeSetting('vDelay','Offset from horizontal',-1600,1600,20,'ms'),welcomeSetting('vDuration','Duration',100,2400,20,'ms'),welcomeSetting('vOpacity','Opacity',0,100,1,'%'),
        ],false),
      ]),
    ];
    if(screen==='handoff')return [
      section('cursor','Cursor',[
        handoffSetting('wiggleDelay','Wiggle delay',0,1500,50,'ms'),handoffSetting('wiggle','Wiggle',100,600,20,'ms'),
        handoffSetting('glide','Glide duration',600,2400,50,'ms'),handoffSetting('arc','Arc size',40,160,5,'%'),
        toggle('flip','3D landing flip',()=>F().getSettings().settings.flip,value=>F().updateSettings({settings:{flip:value}})),
        toggle('show-path','Show glide path',()=>F().getSettings().showPath,value=>F().updateSettings({showPath:value})),
        section('easing','Glide easing',[{type:'custom',id:'easing-editor',element:()=>F().getEasingElement()}],false),
      ]),
      section('stickers','Stickers',[handoffSetting('fan','Fan distance',20,180,5,'px')]),
      section('browser','Browser',[
        select('browser-mode','Launch in',()=>F().getSettings().browserMode,value=>F().updateSettings({browserMode:value}),[['auto','Default browser'],['popup','Browser popup']]),
        action('simulate-return','Simulate return',()=>F().simulateReturn()),
      ]),
    ];
    if(screen==='permissions')return [grid()];
    if(screen==='onboarding')return [grid(),section('lens','Magnifying lens',[
      toggle('lens-enabled','Show lens',()=>G().getLensSettings().lensEnabled,value=>G().updateLensSettings({lensEnabled:value})),
      select('lens-zoom','Magnification',()=>String(G().getLensSettings().lensZoom),value=>G().updateLensSettings({lensZoom:Number(value)}),[[1.5,'1.5×'],[2,'2×'],[3,'3×'],[4,'4×']]),
      slider('lens-size','Size',()=>G().getLensSettings().lensSize,value=>G().updateLensSettings({lensSize:value}),88,176,4,'px'),
      action('recenter-lens','Recenter lens',()=>G().recenterLens()),
    ])];
    return [
      section('preview','Preview',[
        select('preview-source','Source',()=>D().getSettings().preview,value=>D().updateSettings({preview:value}),[['video','Sample video'],['figma','Design reference']]),
        toggle('camera','Camera bubble',()=>D().getSettings().camera,value=>D().updateSettings({camera:value})),
        action('choose-video','Choose video…',()=>D().chooseVideo()),readout('media-name','',()=>D().getMediaName()),
      ]),
      section('selection','Selection',[
        select('trim-preset','Trim',()=>D().getTrimState().preset==='custom'?'Custom trim':D().getTrimState().preset,value=>D().setTrimPreset(value),[['untrimmed','Untrimmed'],['trimmed','Trimmed']]),
        readout('trim-in','In',()=>seconds(D().getTrimState().start)),readout('trim-out','Out',()=>seconds(D().getTrimState().end)),readout('trim-selected','Selected',()=>seconds(D().getTrimState().selected)),
      ]),
      section('handles','Trim handles',[
        slider('response','Response',()=>D().getSettings().handleResponse,value=>D().updateSettings({handleResponse:value}),80,500,10,'ms'),
        slider('springiness','Springiness',()=>D().getSettings().springiness,value=>D().updateSettings({springiness:value}),0,100,1,'%'),
      ]),
      section('connection','Connection',[field('segments','connection-state','Connection',()=>D().getSettings().connection,value=>D().updateSettings({connection:value}),{options:options(['connected','offline'])})]),
    ];
  }
  window.JamPlaygroundSchema={sections,seconds,
    screens:[{id:'welcome',label:'Welcome screen'},{id:'handoff',label:'Browser handoff'},{id:'permissions',label:'Permissions'},{id:'onboarding',label:'Menu bar'},{id:'recording',label:'Recording belt'},{id:'draft',label:'DraftUI'}],
    engine:screen=>screen==='welcome'?W():screen==='handoff'||screen==='permissions'?F():screen==='draft'?D():screen==='recording'?R():null,
  };
})();
