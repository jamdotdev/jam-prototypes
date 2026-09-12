/*
 * Permissions reuses the menu bar onboarding grid and its authoritative options.
 * Load after grid.js and prototype.js, with #permission-grid-canvas and
 * its permission preview window present. JamPlayground.updateGridOptions(patch)
 * updates both surfaces; document's gridoptionschange event carries the snapshot.
 */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('permission-grid-canvas');
  const windowEl = $('welcome-window');
  const playground = window.JamPlayground;
  if (!canvas || !windowEl || !window.JamGrid || !playground) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const grid = new window.JamGrid(canvas, { width: 700, height: 500 });
  let active = false;

  const canInteract = () => active && playground.getSurface() === 'welcome' && !windowEl.hidden && !document.hidden;

  function sync() {
    const options = playground.getGridOptions();
    const enabled = canInteract() && options.enabled;
    if (!enabled) grid.clearPointer();
    grid.setOptions({ ...options, enabled, reducedMotion: reducedMotion.matches });
  }

  document.addEventListener('gridoptionschange', sync);
  document.addEventListener('playgroundchange', sync);
  reducedMotion.addEventListener('change', sync);

  windowEl.addEventListener('pointermove', (event) => {
    if (!canInteract() || !playground.getGridOptions().enabled) return;
    if (document.body.classList.contains('is-window-dragging')) {
      grid.clearPointer();
      return;
    }
    const bounds = windowEl.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    grid.pointer((event.clientX - bounds.left) * 700 / bounds.width, (event.clientY - bounds.top) * 500 / bounds.height);
  }, { passive: true });
  windowEl.addEventListener('pointerleave', () => grid.clearPointer());
  windowEl.addEventListener('pointercancel', () => grid.clearPointer());
  window.addEventListener('blur', () => grid.clearPointer());
  document.addEventListener('visibilitychange', () => { grid.clearPointer(); sync(); });

  window.JamPermissionGrid = {
    setActive(value) {
      active = Boolean(value);
      grid.clearPointer();
      sync();
    },
    sync,
  };
  sync();
})();
