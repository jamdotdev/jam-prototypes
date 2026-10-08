(() => {
  'use strict';
  // UI sounds for recording moments. Watches JamRecording's state rather than being called from it,
  // so the belt code stays unaware of audio.
  const FILES = ['ChimeA', 'ChimeB', 'CountDownShutter', 'ErrorBloop', 'GreetingAir', 'GreetingBloom', 'GreetingPad',
    'HeroSimpleCelebration02', 'PositiveStart', 'QuickBlip', 'ReverseBlip', 'SimpleCelebration', 'StartUp',
    'SuccessChime', 'TickTock'];
  const MOMENTS = [
    { id: 'start', label: 'Recording starts' },
    { id: 'pause', label: 'Paused' },
    { id: 'resume', label: 'Resumed' },
    { id: 'restart', label: 'Restarted' },
    { id: 'limit', label: 'Final seconds' },
    { id: 'stop', label: 'Recording ends' },
  ];
  const fallback = { enabled: true, volume: 70, start: 'PositiveStart', pause: 'ReverseBlip', resume: 'QuickBlip',
    restart: 'CountDownShutter', limit: 'TickTock', stop: 'SuccessChime' };
  const valid = (name) => name === 'none' || FILES.includes(name);
  const greetingFallback = { sound: 'GreetingPad', volume: 60 };
  let settings = { ...fallback };
  let greeting = { ...greetingFallback };
  const buffers = new Map();

  function source(name) {
    if (!buffers.has(name)) {
      const audio = new Audio(`assets/sounds/${name}.m4a`);
      audio.preload = 'auto';
      buffers.set(name, audio);
    }
    return buffers.get(name);
  }

  function play(name, { force = false, volume = settings.volume } = {}) {
    if (!valid(name) || name === 'none' || (!settings.enabled && !force)) return null;
    // A fresh element per play lets quick repeats overlap instead of cutting each other off.
    const audio = source(name).cloneNode();
    audio.volume = Math.max(0, Math.min(1, volume / 100));
    return audio.play().then(() => audio, () => null);
  }

  function playMoment(moment) { play(settings[moment]); }

  function updateSettings(patch = {}) {
    const next = { ...settings };
    for (const [key, value] of Object.entries(patch)) {
      if (key === 'enabled') next.enabled = Boolean(value);
      else if (key === 'volume') next.volume = Math.max(0, Math.min(100, Number(value) || 0));
      else if (MOMENTS.some((moment) => moment.id === key) && valid(value)) next[key] = value;
    }
    settings = next;
    window.JamDefaults?.changed('recording');
  }

  // Choosing a sound in the sidebar auditions it, even with sounds off.
  function choose(moment, name) {
    updateSettings({ [moment]: name });
    play(name, { force: true });
  }

  // The Welcome screen's greeting is a long pad, so a replay stops the previous one rather than layering.
  let greetingAudio = null, greetingWaiting = false;
  function playGreeting() {
    greetingAudio?.pause(); greetingAudio = null;
    const request = play(greeting.sound, { force: true, volume: greeting.volume });
    request?.then((audio) => {
      if (audio) { greetingAudio = audio; return; }
      // Browsers refuse sound before the first click, so a greeting on page load waits for it.
      if (greetingWaiting) return;
      greetingWaiting = true;
      const retry = () => {
        greetingWaiting = false;
        const state = window.JamWelcome.getState();
        if (state.active && state.elapsed < state.total) playGreeting();
      };
      window.addEventListener('pointerdown', retry, { once: true, capture: true });
    });
  }
  function stopGreeting() { greetingAudio?.pause(); greetingAudio = null; }
  function updateGreeting(patch = {}) {
    if (valid(patch.sound)) greeting.sound = patch.sound;
    if (patch.volume !== undefined) greeting.volume = Math.max(0, Math.min(100, Number(patch.volume) || 0));
    window.JamDefaults?.changed('welcome');
  }
  let welcomeLast = null;
  function observeWelcome() {
    const state = window.JamWelcome.getState();
    const previous = welcomeLast;
    welcomeLast = { active: state.active, elapsed: state.elapsed };
    if (!state.active) { if (previous?.active) stopGreeting(); return; }
    // A new run starts when the screen opens or its timeline jumps back to the beginning.
    if (state.elapsed < 50 && (!previous || !previous.active || previous.elapsed >= 50)) playGreeting();
  }

  let last = null;
  function observe() {
    const state = window.JamRecording.getState();
    const next = { stage: state.stage, elapsed: state.elapsed };
    const previous = last;
    last = next;
    if (!previous) return;
    const was = previous.stage, now = next.stage;
    if (was === 'idle' && now !== 'idle') playMoment('start');
    else if (was !== 'idle' && now === 'idle') playMoment('stop');
    else if (now === 'paused' && was !== 'paused') playMoment('pause');
    else if (was === 'paused' && now !== 'paused') playMoment('resume');
    else if (now === 'limit' && was === 'recording') playMoment('limit');
    else if (now !== 'idle' && previous.elapsed > 0.5 && next.elapsed < 0.1) playMoment('restart');
  }

  window.JamSounds = {
    files: FILES,
    moments: MOMENTS,
    getSettings: () => ({ ...settings }),
    updateSettings,
    choose,
    getGreeting: () => ({ ...greeting }),
    updateGreeting,
    chooseGreeting(name) { updateGreeting({ sound: name }); playGreeting(); },
    playGreeting,
    play,
    playMoment,
  };

  window.JamDefaults.register('recording', {
    groups: ['sounds'],
    read: () => ({ sounds: { ...settings } }),
    apply: (values) => { settings = { ...fallback }; updateSettings(values.sounds); },
  });
  window.JamDefaults.register('welcome', {
    groups: ['greeting'],
    read: () => ({ greeting: { ...greeting } }),
    apply: (values) => { greeting = { ...greetingFallback }; updateGreeting(values.greeting); },
  });
  window.JamWelcome.subscribe(observeWelcome);
  window.JamRecording.subscribe(observe);
  // Finishing a recording switches to the draft without notifying subscribers.
  document.addEventListener('playgroundchange', observe);
  observe();
  observeWelcome();
})();
