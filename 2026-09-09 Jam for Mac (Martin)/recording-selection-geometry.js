(() => {
  'use strict';

  const ratios = {'1:1': [1, 1], '4:3': [4, 3], '16:9': [16, 9], '16:10': [16, 10]};
  const widths = {
    '1:1': [640, 800, 1024, 1280, 1600],
    '4:3': [640, 800, 1024, 1280, 1600],
    '16:9': [1280, 1600, 1920, 2560],
    '16:10': [640, 800, 1024, 1280, 1440, 1680, 1920, 2560],
  };
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const positive = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
  const validRatio = value => positive(value, null);

  function pair(state = {}) {
    const values = ratios[state.preset];
    if (!values) return null;
    return state.orientation === 'vertical' ? [values[1], values[0]] : values;
  }

  function ratio(state) {
    const values = pair(state);
    return values ? values[0] / values[1] : null;
  }

  function label(state) {
    const values = pair(state);
    return values ? values.join(':') : 'Custom';
  }

  function presets(state = {}) {
    const preset = ratios[state.preset] ? state.preset : '16:9';
    const vertical = !!ratios[state.preset] && state.orientation === 'vertical';
    const [x, y] = ratios[preset];
    return widths[preset].map(width => {
      const height = Math.round(width * y / x);
      const result = vertical ? {width: height, height: width} : {width, height};
      return {...result, label: `${result.width} × ${result.height}`};
    });
  }

  function frame(bounds) {
    return {x: finite(bounds?.x, 0), y: finite(bounds?.y, 0), width: Math.max(0, finite(bounds?.width, 0)), height: Math.max(0, finite(bounds?.height, 0))};
  }

  function dimensions(width, height, maxWidth, maxHeight, minimum, lockedRatio) {
    const minWidth = positive(minimum?.width, 50), minHeight = positive(minimum?.height, 50);
    if (lockedRatio) {
      const maximum = Math.max(0, Math.min(maxWidth, maxHeight * lockedRatio));
      const lower = Math.min(maximum, Math.max(minWidth, minHeight * lockedRatio));
      const nextWidth = clamp(width, lower, maximum);
      return {width: nextWidth, height: nextWidth / lockedRatio};
    }
    return {width: clamp(width, Math.min(minWidth, maxWidth), maxWidth), height: clamp(height, Math.min(minHeight, maxHeight), maxHeight)};
  }

  function fit(rect, bounds, minimum = {width: 50, height: 50}, lockedRatio = null) {
    const b = frame(bounds), q = validRatio(lockedRatio);
    const width = positive(rect.width, minimum.width || 50), height = positive(rect.height, minimum.height || 50);
    const cx = finite(rect.x, b.x) + width / 2, cy = finite(rect.y, b.y) + height / 2;
    const next = dimensions(width, height, b.width, b.height, minimum, q);
    return {x: clamp(cx - next.width / 2, b.x, b.x + b.width - next.width), y: clamp(cy - next.height / 2, b.y, b.y + b.height - next.height), ...next};
  }

  function size(rect, requested, bounds, minimum = {width: 50, height: 50}, lockedRatio = null, axis = 'width') {
    const q = validRatio(lockedRatio);
    let width = positive(requested.width, rect.width), height = positive(requested.height, rect.height);
    if (q) {
      if (axis === 'height') width = height * q;
      else height = width / q;
    }
    return fit({x: rect.x + (rect.width - width) / 2, y: rect.y + (rect.height - height) / 2, width, height}, bounds, minimum, q);
  }

  function capacity(anchor, fraction, low, high) {
    return Math.max(0, fraction === 0 ? high - anchor : fraction === 1 ? anchor - low : 2 * Math.min(anchor - low, high - anchor));
  }

  function anchored(width, height, anchor, fraction, bounds, minimum, lockedRatio) {
    const maximumWidth = capacity(anchor.x, fraction.x, bounds.x, bounds.x + bounds.width);
    const maximumHeight = capacity(anchor.y, fraction.y, bounds.y, bounds.y + bounds.height);
    const next = dimensions(width, height, maximumWidth, maximumHeight, minimum, lockedRatio);
    return {x: anchor.x - next.width * fraction.x, y: anchor.y - next.height * fraction.y, ...next};
  }

  function resize(rect, handle, dx, dy, {bounds, minimum = {width: 50, height: 50}, ratio: selectedRatio = null, shiftKey = false, altKey = false}) {
    const b = frame(bounds), q = validRatio(selectedRatio) || (shiftKey ? positive(rect.width / rect.height, null) : null);
    const initial = fit(rect, b, minimum, q);
    const gx = handle.includes('w') ? -1 : handle.includes('e') ? 1 : 0;
    const gy = handle.includes('n') ? -1 : handle.includes('s') ? 1 : 0;
    if (!gx && !gy) return initial;
    const fraction = {x: altKey || !gx ? .5 : gx > 0 ? 0 : 1, y: altKey || !gy ? .5 : gy > 0 ? 0 : 1};
    const anchor = {x: initial.x + initial.width * fraction.x, y: initial.y + initial.height * fraction.y};
    const multiplier = altKey ? 2 : 1;
    const dw = gx * finite(dx, 0) * multiplier, dh = gy * finite(dy, 0) * multiplier;
    let width = initial.width + dw, height = initial.height + dh;
    if (q) {
      // A corner follows whichever axis the pointer changed most proportionally.
      const useHeight = !gx || (gy && Math.abs(dh) / initial.height > Math.abs(dw) / initial.width);
      if (useHeight) width = height * q;
      else height = width / q;
    }
    return anchored(width, height, anchor, fraction, b, minimum, q);
  }

  function draw(start, point, {bounds, minimum = {width: 50, height: 50}, ratio: selectedRatio = null, shiftKey = false, altKey = false}) {
    const b = frame(bounds), q = validRatio(selectedRatio) || (shiftKey ? 1 : null);
    const anchor = {x: clamp(finite(start.x, b.x), b.x, b.x + b.width), y: clamp(finite(start.y, b.y), b.y, b.y + b.height)};
    const dx = finite(point.x, anchor.x) - anchor.x, dy = finite(point.y, anchor.y) - anchor.y;
    const fraction = {x: altKey ? .5 : dx < 0 ? 1 : 0, y: altKey ? .5 : dy < 0 ? 1 : 0};
    let width = Math.abs(dx) * (altKey ? 2 : 1), height = Math.abs(dy) * (altKey ? 2 : 1);
    if (q) {width = Math.max(width, height * q); height = width / q;}
    const next = anchored(width, height, anchor, fraction, b, minimum, q);
    // A click exactly on a canvas edge must still create a usable selection.
    return next.width && next.height ? next : fit({x: anchor.x, y: anchor.y, width: minimum.width, height: minimum.height}, b, minimum, q);
  }

  const api = {ratio, label, presets, fit, size, resize, draw};
  globalThis.JamSelectionGeometry = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
