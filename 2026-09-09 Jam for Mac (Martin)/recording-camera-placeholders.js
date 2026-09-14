(() => {
  'use strict';
  const svgNS = 'http://www.w3.org/2000/svg';
  const borders = new WeakMap();
  const palettes = new WeakMap();

  function paintPalette(root, settings) {
    const colors = [settings.placeholderContrastColor, settings.placeholderContrastHoverColor, settings.placeholderContrastActiveColor, settings.placeholderContrastEdgeColor];
    const key = JSON.stringify(colors);
    if (palettes.get(root) === key) return;
    palettes.set(root, key);
    ['color', 'hover-color', 'active-color', 'edge-color'].forEach((name, index) => root.style.setProperty(`--rb-camera-border-${name}`, colors[index]));
  }

  // Snapshot every placeholder setting from the same source used by the overlay.
  function borderStyle(settings) {
    return Object.fromEntries(Object.entries(settings).filter(([key]) => key.startsWith('placeholder')));
  }

  // Borders and transparent cutouts use the same visual emphasis, never snap geometry.
  function paintPlacement(element, settings, targeted, visible) {
    element.style.scale = String(visible && targeted ? settings.placeholderTargetScale ?? 1 : 1);
    element.style.opacity = String(visible && !targeted ? (settings.placeholderOtherOpacity ?? 100) / 100 : 1);
  }

  function borderMarkup() {
    return '<svg class="rb-camera-slot-border" aria-hidden="true"><circle fill="none"/></svg>';
  }

  function dashPattern(size, width, dash, gap) {
    const radius = Math.max(.5, (size - width) / 2), circumference = 2 * Math.PI * radius;
    // Fit complete repeats to avoid a doubled dash or a tiny gap at the seam.
    const count = Math.max(1, Math.round(circumference / (dash + gap)));
    const period = circumference / count;
    return { radius, count, dash: period * dash / (dash + gap), gap: period * gap / (dash + gap) };
  }

  function paintBorder(element, size, settings, active = false) {
    const svg = element.querySelector('.rb-camera-slot-border'), circle = svg.querySelector('circle');
    // State color includes its alpha. Legacy per-placeholder opacity/color overrides
    // remain readable in saved presets, but no longer diverge from shared borders.
    const key = JSON.stringify([size, settings.placeholderStroke, settings.placeholderDash, settings.placeholderGap]);
    let border = borders.get(element);
    if (border?.key !== key) {
      const pattern = dashPattern(size, settings.placeholderStroke, settings.placeholderDash, settings.placeholderGap);
      border = { key, circle, pattern };
      borders.set(element, border);
      svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
      circle.setAttribute('cx', size / 2); circle.setAttribute('cy', size / 2);
      circle.setAttribute('r', pattern.radius);
      circle.setAttribute('stroke-dasharray', `${pattern.dash} ${pattern.gap}`);
      circle.setAttribute('transform', `rotate(-90 ${size / 2} ${size / 2})`);
    }
    svg.classList.toggle('has-pin-contrast', true);
    circle.setAttribute('stroke', active ? settings.placeholderContrastActiveColor : settings.placeholderContrastColor);
    // Keep the centerline and dash pattern stable as the interaction stroke grows.
    circle.setAttribute('stroke-width', settings.placeholderStroke + (active ? settings.placeholderActiveStroke : 0));
    circle.setAttribute('stroke-opacity', 1);
  }

  function holdFrames(pattern) {
    return Array.from({ length: pattern.count + 1 }, (_, closed) => ({
      offset: closed / pattern.count,
      strokeDasharray: Array.from({ length: pattern.count }, (_, index) => index < closed
        ? `${pattern.dash + pattern.gap} 0` : `${pattern.dash} ${pattern.gap}`).join(' '),
    }));
  }

  function holdBorder(element, duration) {
    const border = borders.get(element);
    // The existing border gains one connected gap at a time, clockwise from twelve.
    return border.circle.animate(holdFrames(border.pattern), { duration, easing: 'linear', fill: 'forwards' });
  }

  function createOverlay(root) {
    const svg = document.createElementNS(svgNS, 'svg');
    svg.classList.add('rb-camera-drag-overlay'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<defs><mask id="rb-camera-slot-cutouts" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" style="mask-type:luminance"><rect fill="white"/></mask></defs><rect class="rb-camera-overlay-fill" mask="url(#rb-camera-slot-cutouts)"/>';
    const mask = svg.querySelector('mask'), maskRect = mask.querySelector('rect'), fill = svg.querySelector('.rb-camera-overlay-fill');
    const holes = Array.from({ length: 8 }, () => {
      const circle = document.createElementNS(svgNS, 'circle'); circle.setAttribute('fill', 'black'); mask.append(circle); return circle;
    });
    root.append(svg);
    let previous = '';
    return {
      update(bounds, slots, visible, settings, nearest = null) {
        svg.classList.toggle('is-visible', visible);
        if (!visible) return;
        const key = JSON.stringify([bounds, slots, settings.placeholderOverlayColor, settings.placeholderOverlayOpacity, settings.placeholderTargetScale, settings.placeholderOtherOpacity, nearest]);
        if (key === previous) return;
        previous = key;
        for (const rect of [mask, maskRect, fill]) for (const [attribute, value] of Object.entries(bounds)) {
          rect.setAttribute(attribute, value);
        }
        slots.forEach((slot, index) => {
          holes[index].setAttribute('cx', slot.x); holes[index].setAttribute('cy', slot.y);
          holes[index].setAttribute('r', Math.max(24, slot.size) / 2);
          paintPlacement(holes[index], settings, slot.name === nearest, visible);
        });
        fill.setAttribute('fill', settings.placeholderOverlayColor);
        fill.setAttribute('fill-opacity', settings.placeholderOverlayOpacity / 100);
      },
    };
  }

  globalThis.JamCameraPlaceholders = { paintPlacement, borderMarkup, borderStyle, paintPalette, paintBorder, holdBorder, createOverlay, dashPattern, holdFrames };
})();
