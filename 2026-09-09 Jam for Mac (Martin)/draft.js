(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const video = $('draft-video');
  const sampleSource = 'assets/draft/jam-video.mp4';
  const sampleStrip = 'assets/draft/jam-video-filmstrip.jpg';
  const timeline = new window.JamDraftTimeline($('draft-timeline'), {
    duration: 104.566667,
    handleAnimationMs: 180,
    onTimeChange(time) { showVideo(); seek(time); },
    onPlayChange(playing) { playing ? play() : pause(); },
    onTrimChange() {
      $('draft-trim-preset').value = timeline.getState().trimmed ? 'custom' : 'untrimmed';
      updateReadout();
    },
  });
  let active = false;
  let mediaReady = false;
  let playbackFrame = 0;
  let playRequest = 0;
  let sourceVersion = 0;
  let customURL = null;
  let customStrip = null;
  let popoverTimer = 0;

  function formatTime(seconds) {
    const hundredths = Math.floor(Math.max(0, seconds) * 100 + .00001);
    return `${Math.floor(hundredths / 6000)}:${String(Math.floor(hundredths / 100) % 60).padStart(2, '0')}.${String(hundredths % 100).padStart(2, '0')}`;
  }

  function updateReadout() {
    const { start, end } = timeline.getState();
    $('draft-in-time').value = formatTime(start);
    $('draft-out-time').value = formatTime(end);
    $('draft-selection-time').value = formatTime(end - start);
  }

  function setPreview(mode) {
    const reference = mode === 'figma';
    $('draft-preview-mode').value = reference ? 'figma' : 'video';
    $('draft-figma-reference').hidden = !reference;
    video.hidden = reference;
    timeline.setThumbnailSource(reference ? 'assets/trim-video-track.png' : customStrip || sampleStrip,
      reference ? { size: '23.58px 50.98px' } : {});
    if (reference) pause();
  }

  function showVideo() { if (video.hidden) setPreview('video'); }

  function seek(time) {
    if (video.readyState >= 1) video.currentTime = Math.max(0, Math.min(time, video.duration));
    timeline.setTime(time);
  }

  function pause() {
    playRequest++;
    video.pause();
    timeline.setPlaying(false);
    cancelAnimationFrame(playbackFrame);
    playbackFrame = 0;
  }

  async function play() {
    if (!active || !mediaReady) { pause(); return; }
    const request = ++playRequest;
    showVideo();
    const { start, end } = timeline.getState();
    if (video.currentTime < start || video.currentTime >= end - .01) seek(start);
    try {
      await video.play();
      if (request !== playRequest || !active) return;
      timeline.setPlaying(true);
      startClock();
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
      if ($('draft-loop').checked) seek(start);
      else { pause(); seek(end); return; }
    } else timeline.setTime(video.currentTime);
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
  });
  video.addEventListener('pause', () => {
    timeline.setPlaying(false);
    cancelAnimationFrame(playbackFrame);
    playbackFrame = 0;
  });
  video.addEventListener('ended', () => {
    if (active && $('draft-loop').checked) { seek(timeline.getState().start); play(); }
    else { pause(); timeline.setTime(timeline.getState().end); }
  });
  video.addEventListener('seeked', () => timeline.setTime(video.currentTime));
  function initializeMedia() {
    if (!Number.isFinite(video.duration) || video.duration < .25) {
      mediaReady = false;
      pause();
      timeline.setActive(false);
      $('draft-media-error').hidden = false;
      return;
    }
    mediaReady = true;
    $('draft-media-error').hidden = true;
    timeline.setDuration(video.duration);
    timeline.reset();
    timeline.setActive(active);
    $('draft-trim-preset').value = 'untrimmed';
    updateReadout();
  }
  function mediaError() {
    mediaReady = false;
    pause();
    timeline.setActive(false);
    $('draft-media-error').hidden = false;
  }
  video.addEventListener('loadedmetadata', initializeMedia);
  video.addEventListener('error', mediaError);
  video.addEventListener('click', () => timeline.togglePlay());

  function closePopover(returnFocus = false) {
    clearTimeout(popoverTimer);
    $('draft-offline-button').setAttribute('aria-expanded', 'false');
    $('draft-offline-popover').classList.remove('is-open');
    popoverTimer = setTimeout(() => { $('draft-offline-popover').hidden = true; }, 160);
    if (returnFocus) $('draft-offline-button').focus();
  }

  function openPopover() {
    clearTimeout(popoverTimer);
    $('draft-offline-popover').hidden = false;
    $('draft-offline-button').setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
      if ($('draft-offline-button').getAttribute('aria-expanded') === 'true') $('draft-offline-popover').classList.add('is-open');
    });
  }

  function setConnection(connection) {
    const offline = connection === 'offline';
    $('draft-connection').value = offline ? 'offline' : 'connected';
    $('draft-window').dataset.connection = connection;
    $('draft-connected-label').hidden = offline;
    $('draft-offline-button').hidden = !offline;
    $('draft-folder-name').hidden = !offline;
    $('draft-create-button').textContent = offline ? 'Save to drafts' : 'Create Jam';
    closePopover();
  }

  $('draft-connection').addEventListener('change', (event) => setConnection(event.target.value));
  $('draft-offline-button').addEventListener('click', () => {
    $('draft-offline-button').getAttribute('aria-expanded') === 'true' ? closePopover() : openPopover();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('#draft-offline-button, #draft-offline-popover')) closePopover();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && $('draft-offline-button').getAttribute('aria-expanded') === 'true') closePopover(true);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  $('draft-trim-preset').addEventListener('change', (event) => {
    pause();
    const { duration } = timeline.getState();
    const trimmed = event.target.value === 'trimmed';
    timeline.setTrim(trimmed ? duration * .14 : 0, trimmed ? duration * .88 : duration);
    seek(timeline.getState().start);
    updateReadout();
  });
  $('draft-preview-mode').addEventListener('change', (event) => {
    setPreview(event.target.value);
    $('draft-camera-enabled').checked = event.target.value === 'figma';
    $('draft-camera').hidden = !$('draft-camera-enabled').checked;
  });
  $('draft-camera-enabled').addEventListener('change', (event) => { $('draft-camera').hidden = !event.target.checked; });
  $('draft-playback-speed').addEventListener('change', (event) => { video.playbackRate = Number(event.target.value); });
  function updateHandleSpeed() {
    const input = $('draft-handle-speed');
    $('draft-handle-speed-value').value = `${input.value} ms`;
    input.style.setProperty('--range-fill', `${(input.value - input.min) / (input.max - input.min) * 100}%`);
    timeline.setOptions({ handleAnimationMs: Number(input.value) });
  }
  $('draft-handle-speed').addEventListener('input', updateHandleSpeed);
  $('draft-toggle-controls').addEventListener('click', () => {
    const expanded = $('draft-toggle-controls').getAttribute('aria-expanded') !== 'true';
    $('draft-toggle-controls').setAttribute('aria-expanded', String(expanded));
    $('draft-toggle-controls').setAttribute('aria-label', `${expanded ? 'Collapse' : 'Expand'} DraftUI controls`);
    $('draft-controls-body').hidden = !expanded;
    window.JamPlayground.fit(false);
  });

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
      if ($('draft-preview-mode').value === 'video') timeline.setThumbnailSource(customStrip);
    } catch (_) {
      // A video may play even when the browser cannot extract its thumbnails.
    } finally { reader.removeAttribute('src'); reader.load(); }
  }

  function loadSource(url, label) {
    pause();
    mediaReady = false;
    timeline.setActive(false);
    sourceVersion++;
    customStrip = null;
    $('draft-media-error').hidden = true;
    $('draft-video-name').textContent = label;
    $('draft-preview-mode').options[0].textContent = customURL ? 'Your video' : 'Sample video';
    video.src = url;
    video.load();
    setPreview('video');
    if (customURL) {
      timeline.setThumbnailSource('');
      makeFilmstrip(url, sourceVersion);
    }
  }

  $('draft-load-video').addEventListener('click', () => $('draft-video-file').click());
  $('draft-video-file').addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const previous = customURL;
    customURL = URL.createObjectURL(file);
    loadSource(customURL, file.name);
    if (previous) URL.revokeObjectURL(previous);
    event.target.value = '';
  });
  $('draft-reset').addEventListener('click', () => {
    const previous = customURL;
    customURL = null;
    loadSource(sampleSource, 'jam-video.mp4 · stored locally');
    if (previous) URL.revokeObjectURL(previous);
    timeline.reset();
    $('draft-trim-preset').value = 'untrimmed';
    setConnection('connected');
    $('draft-handle-speed').value = '180'; updateHandleSpeed();
    $('draft-playback-speed').value = '1'; video.playbackRate = 1;
    $('draft-loop').checked = true;
    $('draft-camera-enabled').checked = false;
    $('draft-camera').hidden = true;
    $('draft-title').value = '';
    $('draft-description').value = '';
    updateReadout();
    window.JamPlayground.fit();
  });
  $('draft-folder').addEventListener('click', () => window.JamPlayground.notify('Draft folder · prototype preview'));
  $('draft-create-button').addEventListener('click', () => {
    window.JamPlayground.notify($('draft-connection').value === 'offline' ? 'Saved to drafts · prototype preview' : 'Jam created · prototype preview');
  });

  window.JamDraft = {
    timeline,
    setActive(value) {
      active = value;
      timeline.setActive(value && mediaReady);
      if (!value) { pause(); closePopover(); }
    },
  };
  window.JamPlayground.bindWindowDrag($('draft-titlebar'));
  timeline.setThumbnailSource(sampleStrip);
  updateHandleSpeed();
  updateReadout();
  // A local or cached sample can finish metadata loading before deferred scripts run.
  if (video.error) mediaError();
  else if (video.readyState >= 1) initializeMedia();
  else timeline.setActive(false);
  window.JamPlayground.setSurface(new URLSearchParams(location.search).get('surface') || 'onboarding');
})();
