(() => {
  'use strict';
  // UI sounds for recording moments. Watches JamRecording's state rather than being called from it,
  // so the belt code stays unaware of audio.
  const FILES = ['ChimeA', 'ChimeB', 'CountDownShutter', 'ErrorBloop', 'HeroSimpleCelebration02', 'PositiveStart',
    'QuickBlip', 'ReverseBlip', 'SimpleCelebration', 'StartUp', 'SuccessChime', 'TickTock'];
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
  let settings = { ...fallback };
  const buffers = new Map();

  function source(name) {
    if (!buffers.has(name)) {
      const audio = new Audio(`assets/sounds/${name}.m4a`);
      audio.preload = 'auto';
      buffers.set(name, audio);
    }
    return buffers.get(name);
  }

  function play(name, { force = false } = {}) {
    if (!valid(name) || name === 'none' || (!settings.enabled && !force)) return;
    // A fresh element per play lets quick repeats overlap instead of cutting each other off.
    const audio = source(name).cloneNode();
    audio.volume = Math.max(0, Math.min(1, settings.volume / 100));
    audio.play().catch(() => { /* Autoplay can be refused before the first click. */ });
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
    play,
    playMoment,
  };

  window.JamDefaults.register('recording', {
    groups: ['sounds'],
    read: () => ({ sounds: { ...settings } }),
    apply: (values) => { settings = { ...fallback }; updateSettings(values.sounds); },
  });
  window.JamRecording.subscribe(observe);
  // Finishing a recording switches to the draft without notifying subscribers.
  document.addEventListener('playgroundchange', observe);
  observe();
})();
