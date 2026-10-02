(() => {
  'use strict';
  const HOLD_MS = 500;
  const names = { nw: 'top left', ne: 'top right', sw: 'bottom left', se: 'bottom right' };

  // A small affordance over the existing capture, never a full-canvas hit layer.
  function create(root, { context, local, onPin }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rb-camera-slot rb-camera-pin';
    button.innerHTML = JamCameraPlaceholders.borderMarkup() + '<span class="rb-camera-pin-label">Press to pin</span>';
    button.tabIndex = -1;
    button.setAttribute('aria-hidden', 'true');
    root.append(button);
    const listeners = new AbortController();
    let pointer = null, candidate = null, press = null, swallowClick = false;

    function atPointer() {
      const state = context();
      if (!pointer || !state.enabled || document.hidden) return null;
      const { bounds, slots } = state, p = local(pointer, false);
      const x = p.x - bounds.x, y = p.y - bounds.y;
      if (x < 0 || y < 0 || x > bounds.width || y > bounds.height) return null;
      const hit = document.elementFromPoint(pointer.clientX, pointer.clientY);
      if (!hit || !root.contains(hit)) return null;
      if (!button.contains(hit)) {
        if (hit.closest('button,a,input,select,textarea,[role="button"],[role="slider"],[role="menu"],.desktop-menubar,.rb-window-titlebar,.rb-window-resizer,.rb-camera,.rb-belt,.rb-selection-notch')) return null;
        const window = hit.closest('[data-window]');
        if (state.window && window && window.dataset.window !== state.window) return null;
      }
      const size = slots[0].size;
      const reachX = Math.min(bounds.width / 2, Math.max(72, size + 24));
      const reachY = Math.min(bounds.height / 2, Math.max(72, size + 24));
      const horizontal = x < reachX ? 'w' : x > bounds.width - reachX ? 'e' : '';
      const vertical = y < reachY ? 'n' : y > bounds.height - reachY ? 's' : '';
      if (!horizontal || !vertical) return null;
      const slot = slots.find(item => item.name === vertical + horizontal);
      // Reflow, selection changes, and a different bubble size cancel a held gesture.
      return { ...slot, style: state.style, key: JSON.stringify([state.key, bounds, slot, state.style]) };
    }

    function paint() {
      button.classList.toggle('is-visible', !!candidate);
      button.classList.toggle('is-holding', !!press);
      button.tabIndex = candidate ? 0 : -1;
      button.setAttribute('aria-hidden', String(!candidate));
      if (!candidate) return;
      const diameter = Math.max(24, candidate.size);
      Object.assign(button.style, {
        left: `${candidate.x - diameter / 2}px`, top: `${candidate.y - diameter / 2}px`,
        width: `${diameter}px`, height: `${diameter}px`,
      });
      button.dataset.corner = candidate.name;
      JamCameraPlaceholders.paintBorder(button, diameter, candidate.style, !!press);
      button.setAttribute('aria-label', `Pin camera to ${names[candidate.name]}. Hold for half a second, or press Enter.`);
    }

    function cancelPress() {
      const previous = press;
      press = null; // Lost capture can fire synchronously when released.
      if (!previous) return;
      clearTimeout(previous.timer);
      previous.animation?.cancel();
      if (root.hasPointerCapture(previous.id)) root.releasePointerCapture(previous.id);
    }

    function refresh() {
      const next = atPointer();
      if (press && next?.key !== press.slot.key) cancelPress();
      candidate = next;
      paint();
    }

    function clear() {
      cancelPress(); pointer = candidate = null; paint();
    }

    function move(event) {
      if (event.isPrimary === false || (press && event.pointerId !== press.id)) return;
      pointer = { clientX: event.clientX, clientY: event.clientY };
      if (press && (event.buttons === 0 || Math.hypot(event.clientX - press.start.clientX, event.clientY - press.start.clientY) > 10)) cancelPress();
      refresh();
    }

    function down(event) {
      if (event.isPrimary === false) { clear(); return; }
      swallowClick = false;
      if (event.button !== 0) { clear(); return; }
      pointer = { clientX: event.clientX, clientY: event.clientY };
      refresh();
      if (!candidate || press) return;
      event.preventDefault(); event.stopPropagation();
      swallowClick = true;
      const current = press = { id: event.pointerId, slot: candidate, start: pointer };
      root.setPointerCapture(event.pointerId);
      current.animation = JamCameraPlaceholders.holdBorder(button, HOLD_MS);
      current.timer = setTimeout(() => {
        refresh();
        if (press !== current) return;
        const name = current.slot.name;
        clear();
        onPin(name, false);
      }, HOLD_MS);
      paint();
    }

    function up(event) {
      if (press && event.pointerId === press.id) { cancelPress(); refresh(); }
    }

    const listen = (target, type, callback, capture = false) => target.addEventListener(type, callback, { capture, signal: listeners.signal });
    listen(document, 'pointermove', move, true);
    listen(root, 'pointerdown', down, true);
    listen(document, 'pointerup', up, true);
    listen(document, 'pointercancel', clear, true);
    listen(root, 'lostpointercapture', up);
    listen(root, 'pointerleave', clear);
    listen(window, 'blur', clear);
    listen(document, 'visibilitychange', clear);
    listen(document, 'keydown', event => {
      if (event.key !== 'Escape' || !candidate) return;
      event.preventDefault(); event.stopPropagation(); clear();
    }, true);
    listen(root, 'click', event => {
      if (!swallowClick || event.detail === 0) return;
      swallowClick = false; event.preventDefault(); event.stopImmediatePropagation();
    }, true);
    listen(button, 'click', event => {
      if (event.detail !== 0) return;
      refresh();
      if (!candidate) return;
      const name = candidate.name;
      clear(); onPin(name, true);
    });
    return { refresh, clear, destroy() { clear(); listeners.abort(); button.remove(); } };
  }
  globalThis.JamCameraPin = { create };
})();
