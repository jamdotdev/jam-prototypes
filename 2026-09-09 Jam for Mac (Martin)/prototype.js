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
  const settings = {
    disperse: { strength: 45, radius: 120, speed: 1 },
    magnetize: { strength: 45, radius: 140, speed: 1 },
    bulge: { strength: 50, radius: 144, speed: 1 },
    twist: { strength: 55, radius: 156, speed: 1 },
    ripple: { strength: 45, radius: 160, speed: 1 },
    trail: { strength: 60, radius: 64, speed: 1 },
  };
  const defaults = JSON.parse(JSON.stringify(settings));
  const effectCopy = {
    disperse: ['Force', 'Radius', 'Response', 'Push the grid away from your cursor.'],
    magnetize: ['Attraction', 'Radius', 'Response', 'Pull the grid gently toward your cursor.'],
    bulge: ['Height', 'Radius', 'Response', 'Lift the grid into a soft dome beneath your cursor.'],
    twist: ['Rotation', 'Radius', 'Response', 'Turn the grid around your cursor.'],
    ripple: ['Amplitude', 'Reach', 'Wave speed', 'Send soft waves through the grid.'],
    trail: ['Intensity', 'Width', 'Fade speed', 'Leave a fading trail of muted gray squares.'],
  };
  let effect = 'disperse';
  let scale = 1;
  let windowPosition = { x: 0, y: 0 };
  let lensPosition = { x: 310, y: 186 };
  let lensSize = 88;
  let magnification = 2;
  let cloneCanvas;
  let drag = null;
  let toastTimeout;
  let recordingStart = null;
  let recordingInterval;
  const surfacePositions = { onboarding: null, draft: null };
  const surfaceWidth = () => workspace.dataset.surface === 'draft' ? 1027 : 700;

  function syncLensCanvas(source = canvas) {
    if (!cloneCanvas || !$('lens-enabled').checked) return;
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
    windowPosition.x = Math.max(12, Math.min(innerWidth - width - 12, windowPosition.x));
    windowPosition.y = Math.max(40, Math.min(Math.max(40, innerHeight - height - 20), windowPosition.y));
    workspace.style.left = `${windowPosition.x}px`;
    workspace.style.top = `${windowPosition.y}px`;
  }

  function fitWindow(center = true) {
    const width = surfaceWidth();
    scale = Math.min(1, (innerWidth - 32) / width, (innerHeight - 72) / workspace.offsetHeight);
    scale = Math.max(.25, scale);
    workspace.style.setProperty('--workspace-scale', scale);
    if (center) windowPosition = { x: (innerWidth - width * scale) / 2, y: 28 + (innerHeight - 28 - workspace.offsetHeight * scale) / 2 - 5 };
    positionWindow();
    placeLens();
  }

  function paintRange(input) {
    input.style.setProperty('--range-fill', `${(Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
  }

  function applyGridOptions() {
    grid.setOptions({ effect, ...settings[effect], fill: Number($('fill').value), enabled: $('grid-enabled').checked, reducedMotion: prefersReducedMotion.matches });
    $('strength-value').value = `${$('strength').value}%`;
    $('radius-value').value = `${$('radius').value} px`;
    $('speed-value').value = `${Number($('speed').value).toFixed(1)}×`;
    $('fill-value').value = `${$('fill').value}%`;
    $('onboarding-playground').querySelectorAll('input[type="range"]').forEach(paintRange);
  }

  function setEffect(value) {
    effect = value;
    $('effect').value = value;
    for (const key of ['strength', 'radius', 'speed']) $(key).value = settings[value][key];
    const [strength, radius, speed, description] = effectCopy[value];
    $('strength-label').textContent = strength;
    $('radius-label').textContent = radius;
    $('speed-label').textContent = speed;
    $('effect-description').textContent = description;
    applyGridOptions();
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
  setEffect('disperse');
  fitWindow();
  recenterLens();

  $('effect').addEventListener('change', (event) => setEffect(event.target.value));
  ['strength', 'radius', 'speed'].forEach((key) => $(key).addEventListener('input', (event) => {
    settings[effect][key] = Number(event.target.value);
    applyGridOptions();
  }));
  $('fill').addEventListener('input', applyGridOptions);
  $('grid-enabled').addEventListener('change', applyGridOptions);
  $('lens-enabled').addEventListener('change', () => {
    lens.hidden = !$('lens-enabled').checked;
    ['lens-zoom', 'lens-size', 'center-lens'].forEach((id) => $(id).disabled = lens.hidden);
    syncLensCanvas();
  });
  $('lens-zoom').addEventListener('change', (event) => { magnification = Number(event.target.value); placeLens(); });
  $('lens-size').addEventListener('input', (event) => {
    lensSize = Number(event.target.value);
    $('lens-size-value').value = lensSize;
    paintRange(event.target);
    placeLens();
  });
  $('center-lens').addEventListener('click', recenterLens);
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

  $('toggle-controls').addEventListener('click', () => {
    const expanded = $('toggle-controls').getAttribute('aria-expanded') === 'true';
    $('toggle-controls').setAttribute('aria-expanded', String(!expanded));
    $('toggle-controls').setAttribute('aria-label', `${expanded ? 'Expand' : 'Collapse'} prototype controls`);
    $('controls-body').hidden = expanded;
    fitWindow(false);
  });
  $('reset-all').addEventListener('click', () => {
    Object.keys(settings).forEach((key) => Object.assign(settings[key], defaults[key]));
    $('grid-enabled').checked = true;
    $('lens-enabled').checked = true;
    lens.hidden = false;
    ['lens-zoom', 'lens-size', 'center-lens'].forEach((id) => $(id).disabled = false);
    magnification = 2;
    lensSize = 88;
    $('lens-zoom').value = '2';
    $('lens-size').value = '88';
    $('lens-size-value').value = '88';
    $('fill').value = '10';
    grid.clearPointer();
    stopRecording();
    toggleMenu(false);
    setEffect('disperse');
    fitWindow();
    recenterLens();
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
  prefersReducedMotion.addEventListener('change', applyGridOptions);
  document.addEventListener('visibilitychange', () => { if (document.hidden && recordingStart !== null) updateTimer(); });

  function setSurface(surface) {
    if (!['onboarding', 'draft'].includes(surface)) surface = 'onboarding';
    const previous = workspace.dataset.surface;
    surfacePositions[previous] = { ...windowPosition };
    grid.clearPointer();
    if (surface === 'draft' && recordingStart !== null) stopRecording();
    workspace.dataset.surface = surface;
    workspace.style.width = `${surface === 'draft' ? 1027 : 700}px`;
    windowEl.hidden = surface !== 'onboarding';
    $('onboarding-playground').hidden = surface !== 'onboarding';
    $('draft-window').hidden = surface !== 'draft';
    $('draft-playground').hidden = surface !== 'draft';
    document.querySelectorAll('.surface-tabs button').forEach((button) => {
      const selected = button.dataset.surface === surface;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    const saved = surfacePositions[surface];
    if (saved) windowPosition = { ...saved };
    fitWindow(!saved);
    window.JamDraft?.setActive(surface === 'draft');
  }

  document.querySelectorAll('.surface-tabs button').forEach((button) => {
    button.addEventListener('click', () => setSurface(button.dataset.surface));
    button.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const target = ['ArrowLeft', 'Home'].includes(event.key) ? 'onboarding' : 'draft';
      setSurface(target);
      $(`surface-${target}`).focus();
    });
  });

  window.JamPlayground = {
    setSurface,
    fit: fitWindow,
    notify,
    getScale: () => scale,
    getSurface: () => workspace.dataset.surface,
    bindWindowDrag(handle) {
      handle.addEventListener('pointerdown', (event) => beginDrag(event, 'window'));
      handle.addEventListener('dblclick', (event) => { if (!event.target.closest('button')) fitWindow(); });
      handle.addEventListener('keydown', (event) => { if (event.target === handle) keyboardMove(event, 'window'); });
    },
  };
})();
