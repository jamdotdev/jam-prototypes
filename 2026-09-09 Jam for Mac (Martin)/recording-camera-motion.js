(() => {
  'use strict';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
  const squared = (x, y) => x * x + y * y;

  // Project onto the capture rectangle minus the cursor-tip exclusion circle.
  // The rectangle's lower edge also keeps the whole camera below the arrow tip
  // whenever that fits. If it cannot fit below, it slides along the bottom edge.
  function project(x, y, rect, pointer, radius, direction) {
    const { minX, maxX, minY, maxY } = rect;
    const px = pointer.x, py = pointer.y;
    x = clamp(x, minX, maxX); y = clamp(y, minY, maxY);
    const dx = x - px, dy = y - py;
    if (squared(dx, dy) >= radius * radius - 1e-8) return { x, y };
    const candidates = [];
    const add = (cx, cy) => {
      if (cx >= minX - 1e-7 && cx <= maxX + 1e-7 && cy >= minY - 1e-7 && cy <= maxY + 1e-7) {
        const point = { x: clamp(cx, minX, maxX), y: clamp(cy, minY, maxY) };
        if (squared(point.x - px, point.y - py) >= radius * radius - 1e-6) candidates.push(point);
      }
    };
    const distance = Math.hypot(dx, dy);
    if (distance > 1e-8) add(px + dx * radius / distance, py + dy * radius / distance);
    else add(px + direction * radius, py);
    for (const cy of [minY, maxY]) {
      const remainder = radius * radius - squared(0, cy - py);
      if (remainder >= 0) {
        const offset = Math.sqrt(remainder);
        add(px - offset, cy); add(px + offset, cy);
      }
    }
    for (const cx of [minX, maxX]) {
      const remainder = radius * radius - squared(cx - px, 0);
      if (remainder >= 0) {
        const offset = Math.sqrt(remainder);
        add(cx, py - offset); add(cx, py + offset);
      }
    }
    const corners = [
      { x: minX, y: minY }, { x: maxX, y: minY },
      { x: minX, y: maxY }, { x: maxX, y: maxY },
    ];
    corners.forEach(point => add(point.x, point.y));
    if (!candidates.length) {
      // The capture is too small for a clear tip: maximize the available gap.
      return corners.sort((a, b) =>
        squared(b.x - px, b.y - py) - squared(a.x - px, a.y - py) || direction * (b.x - a.x)
      )[0];
    }
    candidates.sort((a, b) =>
      squared(a.x - x, a.y - y) - squared(b.x - x, b.y - y) || direction * (b.x - a.x)
    );
    return candidates[0];
  }

  function create(initial = {}) {
    let state = { x: finite(initial.x), y: finite(initial.y), size: Math.max(12, finite(initial.size, 96)), side: 'bottom-right', motionScale: 1 };
    let vx = 0, vy = 0, direction = 1, attachment = 1, parked = null, wasOutside = false;
    function snap(next = {}) {
      state = { ...state, x: finite(next.x, state.x), y: finite(next.y, state.y), size: Math.max(12, finite(next.size, state.size)) };
      state.motionScale = 1;
      vx = vy = 0; attachment = 1; parked = null; wasOutside = false;
      return { ...state };
    }
    function step(options = {}) {
      const sourceBounds = options.bounds || {};
      const bounds = {
        x: finite(sourceBounds.x), y: finite(sourceBounds.y),
        width: Math.max(0, finite(sourceBounds.width)), height: Math.max(0, finite(sourceBounds.height)),
      };
      const p = options.pointer || {};
      const pointer = { x: finite(p.x, state.x), y: finite(p.y, state.y) };
      const dt = clamp(finite(options.dt, 1 / 60), 0, .05);
      // Preserve a requested 12px diameter even in captures too small for 4px padding.
      const inset = Math.min(4, Math.max(0, (Math.min(bounds.width, bounds.height) - 12) / 2));
      const maxSize = Math.max(0, Math.min(bounds.width, bounds.height) - inset * 2);
      const requested = Math.min(maxSize, Math.max(12, finite(options.size, 96)));
      state.size = Math.min(maxSize, options.reducedMotion ? requested : state.size + (requested - state.size) * (1 - Math.exp(-dt * 18)));
      const r = state.size / 2;
      const fullRect = {
        minX: bounds.x + inset + r, maxX: bounds.x + bounds.width - inset - r,
        minY: bounds.y + inset + r, maxY: bounds.y + bounds.height - inset - r,
      };
      const outside = Boolean(options.pinOutside) && (pointer.x < bounds.x || pointer.x > bounds.x + bounds.width || pointer.y < bounds.y || pointer.y > bounds.y + bounds.height);
      // Use speed for sustained motion and acceleration for a gentle initial response.
      // Scale is visual only: keep containment and cursor clearance at the full size.
      const shrink = clamp(finite(options.shrink), 0, 30) / 100;
      const speed = Math.hypot(finite(p.vx), finite(p.vy));
      const acceleration = Math.hypot(finite(p.ax), finite(p.ay));
      const energy = outside ? 0 : clamp(speed / 1400 + Math.min(acceleration / 20000, 1) * .2, 0, 1);
      const targetScale = 1 - shrink * energy;
      state.motionScale = options.reducedMotion || shrink === 0 ? 1
        : state.motionScale + (targetScale - state.motionScale) * (1 - Math.exp(-dt * (targetScale < state.motionScale ? 22 : 14)));
      if (Math.abs(state.motionScale - targetScale) < .0001) state.motionScale = targetScale;
      if (!options.pinOutside) { parked = null; attachment = 1; }
      if (outside && !wasOutside) {
        // Latch the exit location once. Moving outside must not drag the parked
        // camera along the edge. Relative coordinates retain its dock on resize.
        parked = {
          u: clamp((pointer.x - fullRect.minX) / (fullRect.maxX - fullRect.minX || 1), 0, 1),
          v: clamp((pointer.y - fullRect.minY) / (fullRect.maxY - fullRect.minY || 1), 0, 1),
        };
      }
      wasOutside = outside;
      // Keep one spring alive across the boundary. Rejoin over about 250ms,
      // retaining velocity instead of starting a separate arrival animation.
      attachment = outside ? 0 : options.reducedMotion ? 1 : 1 - (1 - attachment) * Math.exp(-dt * 14);
      const behindY = clamp(pointer.y + r, fullRect.minY, fullRect.maxY);
      const rect = { ...fullRect, minY: fullRect.minY + (behindY - fullRect.minY) * attachment };
      const clearance = Math.min(6, Math.max(2, r / 8));
      const exclusionRadius = r + clearance;
      // With too little lateral space, maximize tip clearance inside the full
      // bounds. This is the sole fallback that may put the camera above the tip.
      const farthestBehindDistance = Math.max(...[
        [rect.minX, rect.minY], [rect.maxX, rect.minY], [rect.minX, rect.maxY], [rect.maxX, rect.maxY],
      ].map(([x, y]) => Math.hypot(x - pointer.x, y - pointer.y)));
      if (farthestBehindDistance < exclusionRadius - 1e-7) rect.minY = fullRect.minY;
      const gap = clamp(finite(options.gap, 20), 8, 64);
      const distance = r + gap;
      const rightSlack = rect.maxX - (pointer.x + distance);
      const leftSlack = pointer.x - distance - rect.minX;
      // Returning to the default right side needs extra room, so small cursor
      // movements around an edge do not repeatedly flip the camera.
      if (direction === 1 && rightSlack < -8 && leftSlack > rightSlack + 18) direction = -1;
      else if (direction === -1 && (rightSlack >= 24 || (leftSlack < -8 && rightSlack > leftSlack + 18))) direction = 1;
      const strength = options.reducedMotion ? 0 : clamp(finite(options.anticipation, 35), 0, 100) / 100;
      const trailX = clamp(finite(p.vx) * .045 + finite(p.ax) * .00025, -r * .7, r * .7) * strength;
      const trailY = clamp(finite(p.vy) * .045 + finite(p.ay) * .00025, -r * .7, r * .7) * strength;
      const followTarget = project(pointer.x + direction * distance - trailX, pointer.y + distance - trailY, rect, pointer, exclusionRadius, direction);
      const pinnedTarget = parked
        ? { x: fullRect.minX + parked.u * (fullRect.maxX - fullRect.minX), y: fullRect.minY + parked.v * (fullRect.maxY - fullRect.minY) }
        : project(pointer.x, pointer.y, fullRect, pointer, exclusionRadius, direction);
      const target = outside ? pinnedTarget : project(pinnedTarget.x + (followTarget.x - pinnedTarget.x) * attachment, pinnedTarget.y + (followTarget.y - pinnedTarget.y) * attachment, rect, pointer, exclusionRadius, direction);
      const below = fullRect.maxY >= pointer.y + r;
      state.mode = outside ? 'pinned' : attachment < .98 ? 'reconnecting' : 'following';
      state.side = outside ? 'pinned' : below ? (direction === 1 ? 'bottom-right' : 'bottom-left') : (direction === 1 ? 'right' : 'left');
      function constrain() {
        const next = outside
          ? { x: clamp(state.x, fullRect.minX, fullRect.maxX), y: clamp(state.y, fullRect.minY, fullRect.maxY) }
          : project(state.x, state.y, rect, pointer, exclusionRadius, direction);
        const dx = next.x - state.x, dy = next.y - state.y, magnitude = Math.hypot(dx, dy);
        if (magnitude > 1e-8) {
          // Remove only momentum into the constraint; keep tangential movement.
          const nx = dx / magnitude, ny = dy / magnitude, inward = vx * nx + vy * ny;
          if (inward < 0) { vx -= inward * nx; vy -= inward * ny; }
        }
        state.x = next.x; state.y = next.y;
      }
      constrain();
      if (options.reducedMotion) { state.x = target.x; state.y = target.y; vx = vy = 0; }
      else {
        const k = clamp(finite(options.stiffness, 220), 80, 500);
        const c = Math.max(clamp(finite(options.damping, 26), 10, 50), outside || attachment < .98 ? 2 * Math.sqrt(k) : 0);
        const count = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / count;
        for (let i = 0; i < count; i++) {
          vx += (k * (target.x - state.x) - c * vx) * h;
          vy += (k * (target.y - state.y) - c * vy) * h;
          state.x += vx * h; state.y += vy * h;
          constrain();
        }
      }
      return { ...state };
    }
    return { step, snap, getState: () => ({ ...state }) };
  }
  globalThis.JamCameraMotion = { create };
})();
