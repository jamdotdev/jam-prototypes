(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const workspace = $('workspace');
  const scene = $('window-scene');
  const windowEl = $('onboarding-window');
  const lens = $('magnifier');
  const lensContent = $('lens-content');
  const canvas = $('background-grid');
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const initialGrid = window.JamDefaults.get('grid');
  const initialOnboarding = window.JamDefaults.get('onboarding');
  const settings = initialGrid.effects;
  const effectCopy = {
    disperse: ['Force', 'Radius', 'Response', 'Push the grid away from your cursor.'],
    magnetize: ['Attraction', 'Radius', 'Response', 'Pull the grid gently toward your cursor.'],
    bulge: ['Height', 'Radius', 'Response', 'Lift the grid into a soft dome beneath your cursor.'],
    twist: ['Rotation', 'Radius', 'Response', 'Turn the grid around your cursor.'],
    ripple: ['Amplitude', 'Reach', 'Wave speed', 'Send soft waves through the grid.'],
    trail: ['Intensity', 'Width', 'Fade speed', 'Leave a fading trail of muted gray squares.'],
  };
  let effect = initialGrid.effect;
  let gridEnabled = initialGrid.enabled;
  let gridFill = initialGrid.fill;
  let lensEnabled = initialOnboarding.lensEnabled;
  const gridBounds = { strength: [0, 100], radius: [40, 240], speed: [.2, 2], fill: [0, 30] };
  const bounded = (value, min, max, fallback) => Number.isFinite(Number(value))
    ? Math.max(min, Math.min(max, Number(value))) : fallback;
  let scale = 1;
  let windowPosition = { x: 0, y: 0 };
  let lensPosition = { x: 310, y: 186 };
  let lensSize = initialOnboarding.lensSize;
  let magnification = initialOnboarding.lensZoom;
  let cloneCanvas;
  let drag = null;
  let toastTimeout;
  let recordingStart = null;
  let recordingInterval;
  const surfaces = {
    onboarding: { label: 'Onboarding', width: 700, windowId: 'onboarding-window', playgroundId: 'onboarding-playground', resetId: 'reset-all' },
    welcome: { label: 'Welcome screen', width: 700, windowId: 'welcome-window', playgroundId: 'welcome-playground', resetId: 'welcome-reset', setActive: (active) => window.JamWelcome?.setActive(active) },
    draft: { label: 'DraftUI', width: 1027, windowId: 'draft-window', playgroundId: 'draft-playground', resetId: 'draft-reset', setActive: (active) => window.JamDraft?.setActive(active) },
    recording: { label: 'Recording belt', width: 1100, fullscreen: true, windowId: 'recording-window', playgroundId: 'recording-playground', resetId: 'recording-reset', setActive: (active) => window.JamRecording?.setActive(active) },
  };
  const surfacePositions = Object.fromEntries(Object.keys(surfaces).map((surface) => [surface, null]));
  let playgroundVisible = false;
  const currentSurface = () => surfaces[workspace.dataset.surface] || surfaces.onboarding;
  const surfaceWidth = () => currentSurface().width;

  // Programmatic focus after a drag must not inherit keyboard focus styling.
  document.body.dataset.inputMethod = 'pointer';
  const usePointer = () => { if (document.body.dataset.inputMethod !== 'pointer') document.body.dataset.inputMethod = 'pointer'; };
  document.addEventListener('pointerdown', usePointer, true);
  document.addEventListener('pointermove', usePointer, { capture: true, passive: true });
  document.addEventListener('keydown', (event) => {
    if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) document.body.dataset.inputMethod = 'keyboard';
  }, true);

  function syncLensCanvas(source = canvas) {
    if (!cloneCanvas || !lensEnabled) return;
    if (cloneCanvas.width !== source.width || cloneCanvas.height !== source.height) {
      cloneCanvas.width = source.width;
      cloneCanvas.height = source.height;
    }
    const context = cloneCanvas.getContext('2d');
    context.clearRect(0, 0, cloneCanvas.width, cloneCanvas.height);
    context.drawImage(source, 0, 0);
  }

  function refreshLensScene() {
    const copy = scene.cloneNode(true);
    copy.removeAttribute('id');
    copy.setAttribute('aria-hidden', 'true');
    copy.inert = true;
    copy.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    copy.querySelectorAll('button, [tabindex]').forEach((node) => node.tabIndex = -1);
    lensContent.replaceChildren(copy);
    cloneCanvas = copy.querySelector('canvas');
    syncLensCanvas();
  }

  function placeLens() {
    const half = lensSize / 2;
    lensPosition.x = Math.max(half, Math.min(700 - half, lensPosition.x));
    lensPosition.y = Math.max(half, Math.min(500 - half, lensPosition.y));
    lens.style.setProperty('--lens-size', `${lensSize}px`);
    lens.style.left = `${lensPosition.x - half}px`;
    lens.style.top = `${lensPosition.y - half}px`;
    const apertureRadius = lensSize * .61364 / 2;
    lensContent.style.transform = `translate(${apertureRadius - lensPosition.x * magnification}px, ${apertureRadius - lensPosition.y * magnification}px) scale(${magnification})`;
  }

  function recenterLens() {
    const target = scene.querySelector('.mini-jam img').getBoundingClientRect();
    const bounds = windowEl.getBoundingClientRect();
    lensPosition = { x: (target.x + target.width / 2 - bounds.x) / scale, y: (target.y + target.height / 2 - bounds.y) / scale };
    placeLens();
  }

  function positionWindow() {
    const width = surfaceWidth() * scale;
    const height = workspace.offsetHeight * scale;
    windowPosition.x = Math.max(12, Math.min($('desktop').clientWidth - width - 12, windowPosition.x));
    windowPosition.y = Math.max(40, Math.min(Math.max(40, $('desktop').clientHeight - height - 20), windowPosition.y));
    workspace.style.left = `${windowPosition.x}px`;
    workspace.style.top = `${windowPosition.y}px`;
  }

  function fitWindow(center = true) {
    if (currentSurface().fullscreen) {
      // Recording uses the inset desktop's own pixel coordinates.
      scale = 1;
      $('recording-playground').style.setProperty('--pg-body-height', `${Math.max(32, Math.min(260, $('desktop').clientHeight * .28, $('desktop').clientHeight - 282))}px`);
      window.JamRecording?.layout();
      return;
    }
    const width = surfaceWidth();
    // Reserve a stable panel budget; expanding a folder scrolls instead of shrinking the app.
    workspace.style.setProperty("--pg-body-height", `${Math.max(180, Math.min(300, $('desktop').clientHeight - (workspace.dataset.surface === "draft" ? 870 : 750)))}px`);
    // The taller Welcome playground needs room above the desktop caption.
    const verticalReserve = workspace.dataset.surface === 'welcome' ? 100 : 72;
    scale = Math.min(1, ($('desktop').clientWidth - 32) / width, ($('desktop').clientHeight - verticalReserve) / workspace.offsetHeight);
    scale = Math.max(.25, scale);
    workspace.style.setProperty('--workspace-scale', scale);
    if (center) windowPosition = { x: ($('desktop').clientWidth - width * scale) / 2, y: 28 + ($('desktop').clientHeight - 28 - workspace.offsetHeight * scale) / 2 - 5 };
    positionWindow();
    placeLens();
  }

  function getGridOptions() {
    return { effect, ...settings[effect], fill: gridFill, enabled: gridEnabled, reducedMotion: prefersReducedMotion.matches };
  }

  function getGridSettings() {
    return {
      effect,
      enabled: gridEnabled,
      fill: gridFill,
      effects: Object.fromEntries(Object.entries(settings).map(([name, values]) => [name, { ...values }])),
    };
  }

  function getGridLabels() {
    const [strength, radius, speed, description] = effectCopy[effect];
    return { strength, radius, speed, description };
  }

  function updateEffectSettings(name, patch = {}) {
    for (const key of ['strength', 'radius', 'speed']) {
      if (!Object.hasOwn(patch, key)) continue;
      settings[name][key] = bounded(patch[key], ...gridBounds[key], settings[name][key]);
    }
  }

  function updateGridOptions(patch = {}) {
    if (Object.hasOwn(settings, patch.effect)) effect = patch.effect;
    updateEffectSettings(effect, patch);
    if (Object.hasOwn(patch, 'fill')) gridFill = bounded(patch.fill, ...gridBounds.fill, gridFill);
    if (Object.hasOwn(patch, 'enabled')) gridEnabled = Boolean(patch.enabled);
    applyGridOptions();
    return getGridOptions();
  }

  function applyGridOptions() {
    grid.setOptions(getGridOptions());
    document.dispatchEvent(new CustomEvent('gridoptionschange', { detail: getGridOptions() }));
    // Grid values are shared by the onboarding and permissions default groups.
    window.JamDefaults.changed();
  }

  function applyGridSettings(values = {}) {
    Object.keys(settings).forEach((name) => updateEffectSettings(name, values.effects?.[name] || {}));
    grid.clearPointer();
    updateGridOptions(values);
    return getGridSettings();
  }

  function getLensSettings() {
    return { lensEnabled, lensZoom: magnification, lensSize };
  }

  function updateLensSettings(patch = {}) {
    if (Object.hasOwn(patch, 'lensEnabled')) lensEnabled = Boolean(patch.lensEnabled);
    if (Object.hasOwn(patch, 'lensZoom')) magnification = bounded(patch.lensZoom, 1.5, 4, magnification);
    if (Object.hasOwn(patch, 'lensSize')) lensSize = bounded(patch.lensSize, 88, 176, lensSize);
    lens.hidden = !lensEnabled;
    placeLens();
    syncLensCanvas();
    document.dispatchEvent(new CustomEvent('lensoptionschange', { detail: getLensSettings() }));
    window.JamDefaults.changed('onboarding');
    return getLensSettings();
  }

  function notify(message) {
    clearTimeout(toastTimeout);
    $('toast').textContent = message;
    $('toast').classList.add('is-visible');
    toastTimeout = setTimeout(() => $('toast').classList.remove('is-visible'), 2400);
  }

  function toggleMenu(force) {
    const open = typeof force === 'boolean' ? force : $('jam-menu').hidden;
    $('jam-menu').hidden = !open;
    $('strawberry-target').setAttribute('aria-expanded', String(open));
    refreshLensScene();
  }

  function updateTimer() {
    const elapsed = Math.floor((Date.now() - recordingStart) / 1000);
    $('recording-time').textContent = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
    const copy = lensContent.querySelector('.recording-indicator>span:last-child');
    if (copy) copy.textContent = $('recording-time').textContent;
  }

  function stopRecording() {
    recordingStart = null;
    clearInterval(recordingInterval);
    $('recording-indicator').hidden = true;
    $('record-button').textContent = 'Start Recording';
    $('record-button').classList.remove('is-recording');
    refreshLensScene();
  }

  function toggleRecording() {
    toggleMenu(false);
    if (recordingStart !== null) {
      stopRecording();
      notify('Preview recording stopped.');
    } else {
      recordingStart = Date.now();
      $('record-button').textContent = 'Stop Recording';
      $('record-button').classList.add('is-recording');
      $('recording-indicator').hidden = false;
      updateTimer();
      refreshLensScene();
      recordingInterval = setInterval(updateTimer, 1000);
      notify('Recording preview · Your screen is not being recorded.');
    }
  }

  refreshLensScene();
  const grid = new window.JamGrid(canvas, { width: 700, height: 500, onFrame: syncLensCanvas });
  applyGridSettings(initialGrid);
  updateLensSettings(initialOnboarding);
  fitWindow();
  recenterLens();

  lens.addEventListener('dblclick', recenterLens);
  $('titlebar').addEventListener('dblclick', () => fitWindow());
  $('strawberry-target').addEventListener('click', () => toggleMenu());
  $('record-button').addEventListener('click', toggleRecording);
  $('back-button').addEventListener('click', () => { stopRecording(); toggleMenu(false); recenterLens(); notify('Onboarding preview reset.'); });
  $('jam-menu').addEventListener('click', (event) => {
    const action = event.target.closest('[data-menu-action]')?.dataset.menuAction;
    if (action === 'record') toggleRecording();
    if (action === 'drafts') { toggleMenu(false); notify('No drafts yet. Your recordings will appear here.'); }
    if (action === 'settings') { toggleMenu(false); notify('Use the playground controls to adjust this preview.'); }
  });
  document.addEventListener('pointerdown', (event) => {
    if (!$('jam-menu').hidden && !event.target.closest('.jam-menu, .strawberry-target, .magnifier')) toggleMenu(false);
  });

  function localPoint(event) {
    const bounds = windowEl.getBoundingClientRect();
    return { x: (event.clientX - bounds.x) / scale, y: (event.clientY - bounds.y) / scale };
  }

  function beginDrag(event, type) {
    if (event.button !== 0 || drag) return;
    if (type === 'window' && event.target.closest('button, input, select, textarea')) return;
    const origin = type === 'lens' ? lensPosition : windowPosition;
    drag = { type, pointerId: event.pointerId, element: event.currentTarget, pointerX: event.clientX, pointerY: event.clientY, x: origin.x, y: origin.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    if (type === 'lens') lens.classList.add('is-dragging');
    else document.body.classList.add('is-window-dragging');
  }
  lens.addEventListener('pointerdown', (event) => beginDrag(event, 'lens'));
  $('titlebar').addEventListener('pointerdown', (event) => beginDrag(event, 'window'));
  window.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const divisor = drag.type === 'lens' ? scale : 1;
    const x = drag.x + (event.clientX - drag.pointerX) / divisor;
    const y = drag.y + (event.clientY - drag.pointerY) / divisor;
    if (drag.type === 'lens') { lensPosition = { x, y }; placeLens(); grid.pointer(lensPosition.x, lensPosition.y); }
    else { windowPosition = { x, y }; positionWindow(); grid.clearPointer(); }
  });
  function endDrag(event) {
    if (!drag || (event.pointerId !== undefined && event.pointerId !== drag.pointerId)) return;
    if (drag.element.hasPointerCapture(drag.pointerId)) drag.element.releasePointerCapture(drag.pointerId);
    drag = null;
    lens.classList.remove('is-dragging');
    document.body.classList.remove('is-window-dragging');
    if (event.type === 'pointercancel' || event.type === 'blur') grid.clearPointer();
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  window.addEventListener('blur', endDrag);
  windowEl.addEventListener('pointermove', (event) => {
    if (drag?.type === 'window') return;
    const point = localPoint(event);
    grid.pointer(point.x, point.y);
  });
  windowEl.addEventListener('pointerleave', () => { if (!drag) grid.clearPointer(); });

  const arrowVectors = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  function keyboardMove(event, type) {
    if (event.key === 'Home') { event.preventDefault(); type === 'lens' ? recenterLens() : fitWindow(); return; }
    const vector = arrowVectors[event.key];
    if (!vector) return;
    event.preventDefault();
    const step = event.shiftKey ? 20 : 4;
    if (type === 'lens') {
      lensPosition.x += vector[0] * step; lensPosition.y += vector[1] * step;
      placeLens(); grid.pointer(lensPosition.x, lensPosition.y);
    } else {
      windowPosition.x += vector[0] * step; windowPosition.y += vector[1] * step;
      positionWindow();
    }
  }
  lens.addEventListener('keydown', (event) => keyboardMove(event, 'lens'));
  lens.addEventListener('blur', () => grid.clearPointer());
  $('titlebar').addEventListener('keydown', (event) => keyboardMove(event, 'window'));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { toggleMenu(false); grid.clearPointer(); } });
  window.addEventListener('resize', () => fitWindow());
  new ResizeObserver(() => fitWindow()).observe($('desktop'));
  prefersReducedMotion.addEventListener('change', applyGridOptions);
  document.addEventListener('visibilitychange', () => { if (document.hidden && recordingStart !== null) updateTimer(); });

  function setSurface(surface) {
    if (!Object.hasOwn(surfaces, surface)) surface = 'onboarding';
    const previous = workspace.dataset.surface;
    if (Object.hasOwn(surfaces, previous)) surfacePositions[previous] = { ...windowPosition };
    grid.clearPointer();
    if (surface !== 'onboarding' && recordingStart !== null) stopRecording();
    workspace.dataset.surface = surface;
    $('desktop').dataset.surface = surface;
    workspace.hidden = Boolean(currentSurface().fullscreen);
    workspace.style.width = `${surfaceWidth()}px`;
    Object.entries(surfaces).forEach(([name, config]) => {
      $(config.windowId).hidden = name !== surface;
      $(config.playgroundId).hidden = name !== surface;
    });
    const saved = surfacePositions[surface];
    if (saved) windowPosition = { ...saved };
    fitWindow(!saved);
    Object.entries(surfaces).forEach(([name, config]) => config.setActive?.(name === surface));
    const url = new URL(location.href);
    if (url.searchParams.get('surface') !== surface) {
      url.searchParams.set('surface', surface);
      history.replaceState(history.state, '', url);
    }
    document.dispatchEvent(new CustomEvent('playgroundchange'));
  }

  function setPlaygroundVisible(visible) {
    playgroundVisible = Boolean(visible);
    Object.entries(surfaces).forEach(([name, config]) => {
      $(config.playgroundId).hidden = workspace.dataset.surface !== name;
    });
    fitWindow(false);
    document.dispatchEvent(new CustomEvent('playgroundchange'));
  }

  window.JamPlayground = {
    setSurface,
    setPlaygroundVisible,
    isPlaygroundVisible: () => playgroundVisible,
    fit: fitWindow,
    notify,
    getScale: () => scale,
    getGridOptions,
    updateGridOptions,
    getGridSettings,
    applyGridSettings,
    getGridLabels,
    getLensSettings,
    updateLensSettings,
    recenterLens,
    getSurface: () => workspace.dataset.surface,
    getSurfaceLabel: () => currentSurface().label,
    resetSurface: () => $(currentSurface().resetId).click(),
    bindWindowDrag(handle) {
      handle.addEventListener('pointerdown', (event) => beginDrag(event, 'window'));
      handle.addEventListener('dblclick', (event) => { if (!event.target.closest('button')) fitWindow(); });
      handle.addEventListener('keydown', (event) => { if (event.target === handle) keyboardMove(event, 'window'); });
    },
  };

  window.JamDefaults.register('onboarding', {
    groups: ['grid', 'onboarding'],
    read: () => ({ grid: getGridSettings(), onboarding: getLensSettings() }),
    apply(values) {
      applyGridSettings(values.grid);
      updateLensSettings(values.onboarding);
    },
    onReset() {
      stopRecording();
      toggleMenu(false);
      fitWindow();
      recenterLens();
    },
  });
})();
