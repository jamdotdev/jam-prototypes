(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const video = $('draft-video');
  const sampleStrip = 'assets/draft/jam-video-filmstrip.jpg';
  // Exact bytes of the bundled recording; chosen files use their File.size.
  const sampleSizeBytes = 19590393;
  const initialDefaults = window.JamDefaults.get('draft');
  const settings = { ...initialDefaults };
  const subscribers = new Set();
  let mediaName = 'jam-video.mp4 · stored locally';
  let applyingDefaults = false;
  const timeline = new window.JamDraftTimeline($('draft-timeline'), {
    duration: 104.566667,
    handleAnimationMs: initialDefaults.handleResponse,
    handleSpringiness: initialDefaults.springiness,
    sourceSizeBytes: sampleSizeBytes,
  });
  let active = false;
  let mediaReady = false;
  let mediaUnavailable = false;
  let playbackFrame = 0;
  let hoverPreviewTime = null;
  let hoverPreviewFrame = 0;
  let playRequest = 0;
  let sourceVersion = 0;
  let customURL = null;
  let customStrip = null;
  let popoverTimer = 0;
  let popoverOpenTimer = 0;
  let popoverCloseTimer = 0;
  let popoverPinned = false;
  let suppressPopoverFocus = false;

  // Install callbacks after the timeline and playback state both exist.
  timeline.setOptions({
    onTimeChange(time) { showVideo(); seek(time); },
    onPreviewTimeChange: previewAt,
    onPlayChange(playing) { playing ? play() : pause(); },
    onTrimChange() {
      rememberTrim();
      settingsChanged();
    },
  });

  function notify(type = 'player') {
    if (applyingDefaults) return;
    const state = {
      type, settings: getSettings(), player: getPlayerState(),
      trim: getTrimState(), mediaName,
    };
    subscribers.forEach((subscriber) => subscriber(state));
  }

  function settingsChanged() {
    if (!applyingDefaults) window.JamDefaults.changed('draft');
    notify('settings');
  }

  // Keep exact defaults comparisons stable across duration conversions.
  const trimFraction = (value) => Number(Math.min(1, Math.max(0, value)).toFixed(9));
  const range = (value, min, max, fallback) => Number.isFinite(Number(value))
    ? Math.max(min, Math.min(max, Number(value))) : fallback;

  function rememberTrim() {
    const { start, end, duration } = timeline.getState();
    settings.trimStart = trimFraction(start / duration);
    settings.trimEnd = trimFraction(end / duration);
  }

  function getTrimState() {
    const { start, end, duration, trimmed } = timeline.getState();
    const isPreset = Math.abs(start / duration - .14) < .000001 && Math.abs(end / duration - .88) < .000001;
    return {
      preset: trimmed ? isPreset ? 'trimmed' : 'custom' : 'untrimmed',
      start, end, selected: end - start, duration,
    };
  }

  function getPlayerState() {
    const { playing, time, duration, start, end } = timeline.getState();
    return {
      playing, time, duration, start, end, rate: settings.playbackSpeed,
      loop: settings.loop, ready: mediaReady,
      status: mediaUnavailable || video.error ? 'Video unavailable' : !mediaReady ? 'Loading video…' : playing ? 'Playing' : 'Paused',
    };
  }

  function applyTrim() {
    const { duration } = timeline.getState();
    timeline.setTrim(settings.trimStart * duration, settings.trimEnd * duration);
    seek(timeline.getState().start);
  }

  function getSettings() { return { ...settings }; }

  function updateSettings(patch, { couplePreview = true } = {}) {
    if (!patch || typeof patch !== 'object') return;
    const has = (key) => Object.prototype.hasOwnProperty.call(patch, key);
    if (has('connection')) setConnection(patch.connection);
    if (has('handleResponse')) settings.handleResponse = range(patch.handleResponse, 80, 500, settings.handleResponse);
    if (has('springiness')) settings.springiness = range(patch.springiness, 0, 100, settings.springiness);
    if (has('handleResponse') || has('springiness')) {
      timeline.setOptions({ handleAnimationMs: settings.handleResponse, handleSpringiness: settings.springiness });
    }
    if (has('playbackSpeed') && [.5, 1, 1.5, 2].includes(Number(patch.playbackSpeed))) {
      settings.playbackSpeed = Number(patch.playbackSpeed);
      video.playbackRate = settings.playbackSpeed;
    }
    if (has('loop')) settings.loop = Boolean(patch.loop);
    if (has('preview')) {
      // Choosing a preview couples the camera setting; hover-switching does not.
      if (couplePreview && !has('camera')) settings.camera = patch.preview === 'figma';
      setPreview(patch.preview);
    }
    if (has('camera')) settings.camera = Boolean(patch.camera);
    $('draft-camera').hidden = !settings.camera;
    if (has('trimStart') || has('trimEnd')) {
      pause();
      const minimum = Math.min(1, .25 / timeline.getState().duration);
      const requestedStart = has('trimStart') ? range(patch.trimStart, 0, 1, settings.trimStart) : settings.trimStart;
      const requestedEnd = has('trimEnd') ? range(patch.trimEnd, 0, 1, settings.trimEnd) : settings.trimEnd;
      settings.trimStart = trimFraction(Math.min(requestedStart, 1 - minimum));
      settings.trimEnd = trimFraction(Math.max(requestedEnd, settings.trimStart + minimum));
      applyTrim();
      rememberTrim();
    }
    settingsChanged();
  }

  function applySettings(values) {
    applyingDefaults = true;
    try {
      pause();
      timeline.reset();
      updateSettings(values, { couplePreview: false });
    } finally {
      applyingDefaults = false;
    }
    notify('settings');
  }

  function setPreview(mode) {
    const reference = mode === 'figma';
    settings.preview = reference ? 'figma' : 'video';
    $('draft-figma-reference').hidden = !reference;
    video.hidden = reference;
    timeline.setThumbnailSource(reference ? 'assets/trim-video-track.png' : customStrip || sampleStrip,
      reference ? { size: '23.58px 50.98px' } : {});
    if (reference) { timeline.clearHover(); pause(); }
  }

  function showVideo() {
    if (settings.preview === 'video') return;
    setPreview('video');
    settingsChanged();
  }

  function seek(time) {
    cancelAnimationFrame(hoverPreviewFrame);
    hoverPreviewFrame = 0;
    hoverPreviewTime = null;
    timeline.setTime(time);
    if (video.readyState >= 1 && Number.isFinite(video.duration)) video.currentTime = timeline.getState().time;
    notify();
  }

  function previewAt(time) {
    cancelAnimationFrame(hoverPreviewFrame);
    hoverPreviewFrame = 0;
    hoverPreviewTime = time;
    if (time === null) {
      if (mediaReady) video.currentTime = timeline.getState().time;
    } else {
      showVideo();
      queueHoverPreview();
    }
  }

  function queueHoverPreview() {
    if (hoverPreviewFrame || hoverPreviewTime === null || !active || !mediaReady) return;
    hoverPreviewFrame = requestAnimationFrame(() => {
      hoverPreviewFrame = 0;
      if (hoverPreviewTime === null || !active || !mediaReady || !video.paused || video.seeking) return;
      const target = Math.max(0, Math.min(hoverPreviewTime, video.duration));
      // Finish the current decoder seek before requesting the latest hover frame.
      if (Math.abs(video.currentTime - target) > .001) video.currentTime = target;
    });
  }

  function pause() {
    playRequest++;
    video.pause();
    timeline.setPlaying(false);
    cancelAnimationFrame(playbackFrame);
    playbackFrame = 0;
    notify();
  }

  async function play() {
    if (!active || !mediaReady) { pause(); return; }
    const request = ++playRequest;
    timeline.clearHover();
    showVideo();
    const { start, end } = timeline.getState();
    if (video.currentTime < start || video.currentTime >= end - .01) seek(start);
    try {
      await video.play();
      if (request !== playRequest || !active) return;
      timeline.setPlaying(true);
      startClock();
      notify();
    } catch (error) {
      if (request !== playRequest || error.name === 'AbortError') return;
      pause();
      window.JamPlayground.notify('This video couldn’t play. Try choosing another video.');
    }
  }

  function advance() {
    playbackFrame = 0;
    if (video.paused || !active) return;
    const { start, end } = timeline.getState();
    if (video.currentTime >= end) {
      if (settings.loop) seek(start);
      else { pause(); seek(end); return; }
    } else timeline.setTime(video.currentTime);
    notify();
    playbackFrame = requestAnimationFrame(advance);
  }

  function startClock() {
    cancelAnimationFrame(playbackFrame);
    playbackFrame = requestAnimationFrame(advance);
  }

  video.addEventListener('play', () => {
    if (!active || !mediaReady) { pause(); return; }
    timeline.setPlaying(true);
    startClock();
    notify();
  });
  video.addEventListener('pause', () => {
    timeline.setPlaying(false);
    cancelAnimationFrame(playbackFrame);
    playbackFrame = 0;
    notify();
  });
  video.addEventListener('ended', () => {
    if (active && settings.loop) { seek(timeline.getState().start); play(); }
    else { pause(); timeline.setTime(timeline.getState().end); notify(); }
  });
  video.addEventListener('seeked', () => {
    if (hoverPreviewTime !== null) queueHoverPreview();
    else if (!video.paused) { timeline.setTime(video.currentTime); notify(); }
  });
  function initializeMedia() {
    if (!Number.isFinite(video.duration) || video.duration < .25) {
      mediaReady = false;
      mediaUnavailable = true;
      pause();
      timeline.setActive(false);
      $('draft-media-error').hidden = false;
      return;
    }
    mediaReady = true;
    mediaUnavailable = false;
    $('draft-media-error').hidden = true;
    timeline.setDuration(video.duration);
    timeline.reset();
    applyTrim();
    timeline.setActive(active);
    notify('media');
  }
  function mediaError() {
    mediaReady = false;
    mediaUnavailable = true;
    pause();
    timeline.setActive(false);
    $('draft-media-error').hidden = false;
    notify('media');
  }
  video.addEventListener('loadedmetadata', initializeMedia);
  video.addEventListener('error', mediaError);
  video.addEventListener('click', () => timeline.togglePlay());

  function closePopover(returnFocus = false) {
    clearTimeout(popoverTimer);
    clearTimeout(popoverOpenTimer);
    clearTimeout(popoverCloseTimer);
    popoverPinned = false;
    $('draft-offline-button').setAttribute('aria-expanded', 'false');
    $('draft-offline-popover').inert = true;
    $('draft-offline-popover').classList.remove('is-open');
    popoverTimer = setTimeout(() => { $('draft-offline-popover').hidden = true; }, 160);
    if (returnFocus) {
      suppressPopoverFocus = true;
      $('draft-offline-button').focus();
      suppressPopoverFocus = false;
    }
  }

  function openPopover(pin = false) {
    if ($('draft-offline-button').hidden || !active) return;
    clearTimeout(popoverTimer);
    clearTimeout(popoverOpenTimer);
    clearTimeout(popoverCloseTimer);
    popoverPinned = popoverPinned || pin;
    $('draft-offline-popover').hidden = false;
    $('draft-offline-popover').inert = false;
    $('draft-offline-button').setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
      if ($('draft-offline-button').getAttribute('aria-expanded') === 'true') $('draft-offline-popover').classList.add('is-open');
    });
  }

  function setConnection(connection) {
    const offline = connection === 'offline';
    settings.connection = offline ? 'offline' : 'connected';
    $('draft-window').dataset.connection = offline ? 'offline' : 'connected';
    $('draft-connected-label').hidden = offline;
    $('draft-offline-button').hidden = !offline;
    $('draft-create-button').textContent = offline ? 'Save to drafts' : 'Create Jam';
    closePopover();
  }
  $('draft-offline-button').addEventListener('click', () => {
    popoverPinned ? closePopover() : openPopover(true);
  });
  $('draft-offline-button').addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'touch') return;
    clearTimeout(popoverCloseTimer);
    popoverOpenTimer = setTimeout(() => openPopover(), 140);
  });
  function leavePopover() {
    clearTimeout(popoverOpenTimer);
    clearTimeout(popoverCloseTimer);
    if (!popoverPinned) popoverCloseTimer = setTimeout(() => {
      if (!popoverPinned && !$('draft-offline-button').matches(':hover') && !$('draft-offline-popover').matches(':hover')) closePopover();
    }, 180);
  }
  $('draft-offline-button').addEventListener('pointerleave', leavePopover);
  $('draft-offline-popover').addEventListener('pointerenter', () => clearTimeout(popoverCloseTimer));
  $('draft-offline-popover').addEventListener('pointerleave', leavePopover);
  $('draft-offline-button').addEventListener('focus', () => { if (!suppressPopoverFocus && document.body.dataset.inputMethod === 'keyboard') openPopover(); });
  document.addEventListener('focusin', (event) => {
    if (!event.target.closest('#draft-offline-button, #draft-offline-popover')) closePopover();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('#draft-offline-button, #draft-offline-popover')) closePopover();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && $('draft-offline-button').getAttribute('aria-expanded') === 'true') closePopover(true);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  function setTrimPreset(preset) {
    if (!['trimmed', 'untrimmed'].includes(preset)) return;
    updateSettings({ trimStart: preset === 'trimmed' ? .14 : 0, trimEnd: preset === 'trimmed' ? .88 : 1 });
  }

  function seekTo(time) {
    timeline.clearHover();
    showVideo();
    seek(time);
  }

  function restart() {
    pause();
    seekTo(timeline.getState().start);
    return play();
  }

  // The thumbnail reader uses a separate video so it never interrupts scrubbing.
  async function makeFilmstrip(url, version) {
    const reader = document.createElement('video');
    reader.muted = true;
    reader.preload = 'auto';
    function once(event) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => finish(new Error('Video thumbnail timeout')), 5000);
        const success = () => finish();
        const failure = () => finish(new Error('Video thumbnail unavailable'));
        function finish(error) {
          clearTimeout(timer);
          reader.removeEventListener(event, success);
          reader.removeEventListener('error', failure);
          error ? reject(error) : resolve();
        }
        reader.addEventListener(event, success, { once: true });
        reader.addEventListener('error', failure, { once: true });
      });
    }
    try {
      const ready = once('loadeddata');
      reader.src = url;
      await ready;
      const canvas = document.createElement('canvas');
      canvas.width = 672; canvas.height = 28;
      const context = canvas.getContext('2d');
      for (let index = 0; index < 12; index++) {
        if (version !== sourceVersion) return;
        const sought = once('seeked');
        reader.currentTime = (index + .5) / 12 * reader.duration;
        await sought;
        const ratio = Math.max(56 / reader.videoWidth, 28 / reader.videoHeight);
        const width = 56 / ratio, height = 28 / ratio;
        context.drawImage(reader, (reader.videoWidth - width) / 2, (reader.videoHeight - height) / 2, width, height, index * 56, 0, 56, 28);
      }
      if (version !== sourceVersion) return;
      customStrip = canvas.toDataURL('image/jpeg', .8);
      if (settings.preview === 'video') timeline.setThumbnailSource(customStrip);
    } catch (_) {
      // A video may play even when the browser cannot extract its thumbnails.
    } finally { reader.removeAttribute('src'); reader.load(); }
  }

  function loadSource(url, label, sizeBytes) {
    pause();
    mediaReady = false;
    mediaUnavailable = false;
    timeline.setActive(false);
    timeline.setSourceSize(sizeBytes);
    sourceVersion++;
    customStrip = null;
    $('draft-media-error').hidden = true;
    mediaName = label;
    video.src = url;
    video.load();
    setPreview('video');
    if (customURL) {
      timeline.setThumbnailSource('');
      makeFilmstrip(url, sourceVersion);
    }
    settingsChanged();
    notify('media');
  }

  $('draft-video-file').addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const previous = customURL;
    customURL = URL.createObjectURL(file);
    loadSource(customURL, file.name, file.size);
    if (previous) URL.revokeObjectURL(previous);
    event.target.value = '';
  });
  $('draft-create-button').addEventListener('click', () => {
    window.JamPlayground.notify(settings.connection === 'offline' ? 'Saved to drafts · prototype preview' : 'Jam created · prototype preview');
  });

  window.JamDraft = {
    timeline,
    getSettings,
    updateSettings,
    getPlayerState,
    getTrimState,
    getMediaName: () => mediaName,
    chooseVideo: () => $('draft-video-file').click(),
    subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); },
    play, pause, restart, seek: seekTo,
    setRate: (value) => updateSettings({ playbackSpeed: value }),
    setLoop: (value) => updateSettings({ loop: value }),
    setTrimPreset,
    setActive(value) {
      active = value;
      timeline.setActive(value && mediaReady);
      if (!value) { pause(); closePopover(); }
      notify();
    },
  };
  window.JamPlayground.bindWindowDrag($('draft-titlebar'));
  timeline.setThumbnailSource(sampleStrip);
  window.JamDefaults.register('draft', {
    groups: ['draft'],
    read: () => ({ draft: getSettings() }),
    apply: ({ draft: values }) => applySettings(values),
  });
  // A local or cached sample can finish metadata loading before deferred scripts run.
  if (video.error) mediaError();
  else if (video.readyState >= 1) initializeMedia();
  else timeline.setActive(false);
  window.JamPlayground.setSurface(new URLSearchParams(location.search).get('surface') || 'onboarding');
})();
