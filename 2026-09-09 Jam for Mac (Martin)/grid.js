/*
 * Canvas lattice for the onboarding prototype. All coordinates are CSS pixels.
 *
 * const grid = new JamGrid(canvas, { width: 700, height: 500, onFrame });
 * grid.setOptions({ effect: 'twist', strength: 55, radius: 140, speed: 1 });
 * grid.pointer(localX, localY); // coordinates relative to the window
 * grid.clearPointer();
 *
 * onFrame(canvas, grid) runs after every rendered frame, including the initial
 * frame. Use the canvas as a source for the magnifying glass. Animation work
 * stops when settled, except while a hovered ripple or fading trail is moving.
 */
(function () {
  'use strict';

  const EFFECTS = new Set(['disperse', 'magnetize', 'bulge', 'twist', 'ripple', 'trail']);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  class JamGrid {
    constructor(canvas, { width = 700, height = 500, onFrame } = {}) {
      if (!canvas || typeof canvas.getContext !== 'function') {
        throw new TypeError('JamGrid requires a canvas element.');
      }
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.onFrame = typeof onFrame === 'function' ? onFrame : null;
      this.options = {
        effect: 'disperse',
        strength: 55,
        radius: 140,
        speed: 1,
        fill: 8,
        enabled: true,
        reducedMotion: false,
      };
      this.cellSize = 16;
      this.cursor = { x: width / 2, y: height / 2, active: false };
      this.trail = [];
      this.nodes = [];
      this.cells = [];
      this.raf = 0;
      this.lastTime = 0;
      this.phase = 0;
      this.destroyed = false;
      this._tick = this._tick.bind(this);
      this._visibility = () => {
        if (document.hidden) {
          cancelAnimationFrame(this.raf);
          this.raf = 0;
          this.lastTime = 0;
        } else {
          this._wake();
        }
      };
      document.addEventListener('visibilitychange', this._visibility);
      this.resize(width, height);
    }

    // Extra convenience for fitting the same prototype into smaller canvases.
    resize(width, height) {
      this.width = Math.max(1, finite(width, 700));
      this.height = Math.max(1, finite(height, 500));
      this.dpr = Math.min(3, window.devicePixelRatio || 1);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.columns = Math.ceil(this.width / this.cellSize) + 1;
      this.rows = Math.ceil(this.height / this.cellSize) + 1;
      this.nodes = [];
      this.cells = [];
      for (let row = 0; row < this.rows; row++) {
        for (let column = 0; column < this.columns; column++) {
          const x = column * this.cellSize;
          const y = row * this.cellSize;
          const seed = Math.sin(column * 127.1 + row * 311.7) * 43758.5453;
          this.nodes.push({ bx: x, by: y, x, y, glow: 0, seed: (seed - Math.floor(seed)) * 2 - 1 });
          if (row < this.rows - 1 && column < this.columns - 1) {
            this.cells.push({
              index: row * this.columns + column,
              x: x + this.cellSize / 2,
              y: y + this.cellSize / 2,
              alpha: 0,
            });
          }
        }
      }
      this._render();
      this._wake();
    }

    setOptions(patch = {}) {
      const previousEffect = this.options.effect;
      const next = { ...this.options };
      if (EFFECTS.has(patch.effect)) next.effect = patch.effect;
      if ('strength' in patch) next.strength = clamp(finite(patch.strength, next.strength), 0, 100);
      if ('radius' in patch) next.radius = clamp(finite(patch.radius, next.radius), 40, 240);
      if ('speed' in patch) next.speed = clamp(finite(patch.speed, next.speed), 0.2, 2);
      if ('fill' in patch) next.fill = clamp(finite(patch.fill, next.fill), 0, 30);
      if ('enabled' in patch) next.enabled = Boolean(patch.enabled);
      if ('reducedMotion' in patch) next.reducedMotion = Boolean(patch.reducedMotion);
      this.options = next;
      if (previousEffect !== next.effect || !next.enabled || next.reducedMotion) this.trail = [];
      this._wake();
    }

    pointer(x, y, active = true) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const wasActive = this.cursor.active;
      const dx = x - this.cursor.x;
      const dy = y - this.cursor.y;
      if (active && this.options.effect === 'trail' && !this.options.reducedMotion &&
          (!wasActive || Math.hypot(dx, dy) > 1.5)) {
        this.trail.push({
          x, y, at: performance.now(),
          dx: wasActive ? clamp(dx, -26, 26) : 0,
          dy: wasActive ? clamp(dy, -26, 26) : 0,
        });
        if (this.trail.length > 32) this.trail.shift();
      }
      this.cursor = { x, y, active: Boolean(active) };
      this._wake();
    }

    clearPointer() {
      this.cursor.active = false;
      this._wake();
    }

    // Preserves the destination context's transform, which can include zoom.
    drawTo(context) {
      context.drawImage(this.canvas, 0, 0, this.width, this.height);
    }

    destroy() {
      this.destroyed = true;
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.trail = [];
      document.removeEventListener('visibilitychange', this._visibility);
    }

    _wake() {
      if (this.destroyed || this.raf || document.hidden) return;
      this.raf = requestAnimationFrame(this._tick);
    }

    _influence(x, y, px, py, radius) {
      const distance = Math.hypot(x - px, y - py);
      if (distance >= radius) return 0;
      const t = 1 - distance / radius;
      return t * t * (3 - 2 * t);
    }

    _tick(now) {
      this.raf = 0;
      if (this.destroyed || document.hidden) return;
      const dt = this.lastTime ? Math.min((now - this.lastTime) / 1000, 0.04) : 1 / 60;
      this.lastTime = now;
      const options = this.options;
      const active = options.enabled && this.cursor.active;
      const moving = options.enabled && !options.reducedMotion;
      const amount = options.strength / 100;
      const radius = options.radius;
      const ease = options.reducedMotion ? 1 : 1 - Math.exp(-dt * (11 + options.speed * 6));
      const trailLifetime = 1250 / options.speed;
      this.trail = moving && options.effect === 'trail'
        ? this.trail.filter(point => now - point.at < trailLifetime)
        : [];
      if (active && moving && options.effect === 'ripple') this.phase += dt * options.speed * 4.5;
      let unsettled = false;

      for (const node of this.nodes) {
        let offsetX = 0;
        let offsetY = 0;
        const dx = node.bx - this.cursor.x;
        const dy = node.by - this.cursor.y;
        const distance = Math.hypot(dx, dy);
        const t = clamp(distance / radius, 0, 1);
        const falloff = (1 - t) ** 2;

        if (active && moving && distance < radius && distance > 0.01) {
          const nx = dx / distance;
          const ny = dy / distance;
          switch (options.effect) {
            case 'disperse': {
              const force = amount * 30 * falloff;
              // Stable, small lateral variation gives the scatter its own feel.
              offsetX = (nx - ny * node.seed * 0.45) * force;
              offsetY = (ny + nx * node.seed * 0.45) * force;
              break;
            }
            case 'magnetize': {
              const force = amount * 0.8 * falloff;
              offsetX = -dx * force;
              offsetY = -dy * force;
              break;
            }
            case 'bulge': {
              // Lens-like expansion preserves the central node and the rim.
              const force = amount * 1.2 * (1 - t * t) ** 2;
              offsetX = dx * force;
              offsetY = dy * force;
              break;
            }
            case 'twist': {
              const angle = amount * 1.7 * falloff;
              const cosine = Math.cos(angle);
              const sine = Math.sin(angle);
              offsetX = dx * cosine - dy * sine - dx;
              offsetY = dx * sine + dy * cosine - dy;
              break;
            }
            case 'ripple': {
              const wave = Math.sin(distance * 0.075 - this.phase);
              const force = wave * amount * 13 * falloff;
              offsetX = nx * force;
              offsetY = ny * force;
              break;
            }
            case 'trail': {
              offsetX = -dx * amount * 0.07 * falloff;
              offsetY = -dy * amount * 0.07 * falloff;
              break;
            }
          }
        }

        if (moving && options.effect === 'trail' && this.trail.length) {
          let totalWeight = 0;
          let trailX = 0;
          let trailY = 0;
          for (const point of this.trail) {
            const age = 1 - (now - point.at) / trailLifetime;
            const weight = this._influence(node.bx, node.by, point.x, point.y, radius * 0.7) * age * age;
            trailX += point.dx * weight;
            trailY += point.dy * weight;
            totalWeight += weight;
          }
          const divisor = Math.max(1, totalWeight * 0.7);
          offsetX += trailX / divisor * amount * 1.3;
          offsetY += trailY / divisor * amount * 1.3;
        }

        const targetX = node.bx + offsetX;
        const targetY = node.by + offsetY;
        let glow = active ? this._influence(node.bx, node.by, this.cursor.x, this.cursor.y, radius) : 0;
        if (options.effect === 'trail' && this.trail.length) {
          for (const point of this.trail) {
            const age = 1 - (now - point.at) / trailLifetime;
            glow = Math.max(glow,
              this._influence(node.bx, node.by, point.x, point.y, radius * 0.7) * age * age);
          }
        }
        node.glow += (glow - node.glow) * ease;
        if (Math.abs(glow - node.glow) > 0.0002) unsettled = true;
        else node.glow = glow;
        node.x += (targetX - node.x) * ease;
        node.y += (targetY - node.y) * ease;
        if (Math.abs(targetX - node.x) + Math.abs(targetY - node.y) > 0.015) {
          unsettled = true;
        } else {
          node.x = targetX;
          node.y = targetY;
        }
      }

      for (const cell of this.cells) {
        let influence = active
          ? this._influence(cell.x, cell.y, this.cursor.x, this.cursor.y, radius)
          : 0;
        if (options.effect === 'trail' && this.trail.length) {
          for (const point of this.trail) {
            const age = 1 - (now - point.at) / trailLifetime;
            influence = Math.max(influence,
              this._influence(cell.x, cell.y, point.x, point.y, radius * 0.7) * age * age);
          }
        }
        if (options.effect === 'ripple' && active && moving) {
          const distance = Math.hypot(cell.x - this.cursor.x, cell.y - this.cursor.y);
          influence *= 0.58 + 0.42 * Math.sin(distance * 0.075 - this.phase) ** 2;
        }
        const target = influence * options.fill / 100;
        cell.alpha += (target - cell.alpha) * ease;
        if (Math.abs(target - cell.alpha) > 0.0002) unsettled = true;
        else cell.alpha = target;
      }

      this._render();
      const continuous = (active && moving && options.effect === 'ripple' &&
        (amount > 0 || options.fill > 0)) || this.trail.length > 0;
      if (unsettled || continuous) this._wake();
      else this.lastTime = 0;
    }

    _render() {
      const context = this.ctx;
      const columns = this.columns;
      const nodes = this.nodes;
      context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      context.clearRect(0, 0, this.width, this.height);
      if (!this.options.enabled) {
        if (this.onFrame) this.onFrame(this.canvas, this);
        return;
      }

      for (const cell of this.cells) {
        if (cell.alpha < 0.0005) continue;
        const a = nodes[cell.index];
        const b = nodes[cell.index + 1];
        const c = nodes[cell.index + columns + 1];
        const d = nodes[cell.index + columns];
        context.fillStyle = `rgba(0, 0, 0, ${cell.alpha.toFixed(4)})`;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.lineTo(c.x, c.y);
        context.lineTo(d.x, d.y);
        context.closePath();
        context.fill();
      }

      // Each shared edge is drawn once so intersections retain a fine weight.
      const baseFade = context.createLinearGradient(0, 0, 0, 261);
      baseFade.addColorStop(0, 'rgba(0, 0, 0, 0.048)');
      baseFade.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.strokeStyle = baseFade;
      context.lineWidth = 0.65;
      context.beginPath();
      for (let row = 0; row < this.rows; row++) {
        for (let column = 0; column < columns; column++) {
          const node = nodes[row * columns + column];
          if (column === 0) context.moveTo(node.x, node.y);
          else context.lineTo(node.x, node.y);
        }
      }
      for (let column = 0; column < columns; column++) {
        for (let row = 0; row < this.rows; row++) {
          const node = nodes[row * columns + column];
          if (row === 0) context.moveTo(node.x, node.y);
          else context.lineTo(node.x, node.y);
        }
      }
      context.stroke();

      // Hover reveals local edges even below the resting grid's 261px fade.
      // Complement the base alpha so the darkest edge stays below 0.07.
      for (let row = 0; row < this.rows; row++) {
        for (let column = 0; column < columns; column++) {
          const index = row * columns + column;
          const a = nodes[index];
          const neighbours = [];
          if (column < columns - 1) neighbours.push(nodes[index + 1]);
          if (row < this.rows - 1) neighbours.push(nodes[index + columns]);
          for (const b of neighbours) {
            const glow = (a.glow + b.glow) / 2;
            if (glow < 0.001) continue;
            const baseAlpha = 0.048 * clamp(1 - (a.y + b.y) / 2 / 261, 0, 1);
            context.strokeStyle = `rgba(0, 0, 0, ${((0.07 - baseAlpha) * glow).toFixed(4)})`;
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
          }
        }
      }
      if (this.onFrame) this.onFrame(this.canvas, this);
    }
  }

  window.JamGrid = JamGrid;
}());
