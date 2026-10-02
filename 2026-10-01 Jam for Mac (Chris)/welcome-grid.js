/* Deterministic welcome-grid entrance. The welcome timeline owns the clock. */
(() => {
  'use strict';
  const WIDTH = 700, HEIGHT = 500, FADE_END = 261.2805, STEP = 8;
  const INK_ALPHA = 15 / 255;
  const STYLES = new Set(['wave', 'diffusion', 'magnetize', 'twist']);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const smooth = value => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };

  class JamWelcomeGrid {
    constructor(canvas) {
      this.canvas = canvas;
      this.context = canvas.getContext('2d', { alpha: true });
      this.drawCount = 0;
      this.signature = '';
      this.state = {};
      this.resize();
    }

    resize(pixelRatio = window.devicePixelRatio || 1) {
      const dpr = clamp(number(pixelRatio, 1), 1, 2);
      if (dpr === this.dpr) return;
      this.dpr = dpr;
      this.canvas.width = Math.round(WIDTH * dpr);
      this.canvas.height = Math.round(HEIGHT * dpr);
      this.signature = '';
    }

    render(options = {}) {
      const config = {
        hProgress: clamp(number(options.hProgress, 0), 0, 1),
        vProgress: clamp(number(options.vProgress, 0), 0, 1),
        style: STYLES.has(options.style) ? options.style : 'wave',
        amount: clamp(number(options.amount, 8), 0, 24),
        softness: clamp(number(options.softness, 65), 0, 100),
        hOpacity: clamp(number(options.hOpacity, .6), 0, 1),
        vOpacity: clamp(number(options.vOpacity, .6), 0, 1),
        reducedMotion: Boolean(options.reducedMotion),
      };
      // Once a line orientation settles, the caller can hand it back to the CSS
      // pattern by passing opacity 0. Unchanged frames do no drawing at all.
      const signature = Object.values(config).join('|');
      if (signature === this.signature || !this.context) return false;
      this.signature = signature;
      this.state = config;
      this.drawCount++;
      const ctx = this.context;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.lineWidth = 1;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000';
      if (config.hProgress > 0 && config.hOpacity > 0) this.drawOrientation('h', config);
      if (config.vProgress > 0 && config.vOpacity > 0) this.drawOrientation('v', config);
      ctx.globalAlpha = 1;
      return true;
    }

    drawOrientation(orientation, config) {
      const progress = orientation === 'h' ? config.hProgress : config.vProgress;
      const opacity = orientation === 'h' ? config.hOpacity : config.vOpacity;
      const ctx = this.context;
      const band = 30 + config.softness * .9;
      const buckets = Array.from({ length: 48 }, () => []);
      const reveal = y => config.reducedMotion ? smooth(progress)
        : progress >= 1 ? 1 : smooth((progress * (FADE_END + 2 * band) - y) / (2 * band));

      const point = (x, y) => {
        const arrival = reveal(y);
        if (config.reducedMotion || progress >= 1 || config.amount === 0) return { x, y, arrival };
        const force = config.amount * (1 - arrival) ** 2;
        let dx = 0, dy = 0;
        switch (config.style) {
          case 'diffusion':
            // A continuous field, not random samples, keeps neighboring points
            // connected while the softly scattered lines gather into place.
            dx = force * (Math.sin(x * .017 + y * .029) + .3 * Math.sin(x * .051 - y * .022));
            dy = force * .7 * (Math.cos(x * .019 - y * .025) + .25 * Math.sin(x * .039 + y * .041));
            break;
          case 'magnetize':
            dx = (350 - x) / 350 * force * 1.2;
            dy = (110 - y) / 180 * force * .8;
            break;
          case 'twist': {
            const angle = force / 400;
            const cos = Math.cos(angle), sin = Math.sin(angle);
            dx = (x - 350) * (cos - 1) - (y - 120) * sin;
            dy = (x - 350) * sin + (y - 120) * (cos - 1);
            break;
          }
          default:
            dx = force * Math.sin(x / 140 + y / 60 - progress * Math.PI * 2);
            dy = force * .6 * Math.sin(x / 90 + y / 130 - progress * Math.PI * 1.5);
        }
        return { x: x + dx, y: y + dy, arrival };
      };

      const segment = (a, b) => {
        const mask = clamp(1 - (a.y + b.y) / 2 / FADE_END, 0, 1);
        const alpha = mask * (a.arrival + b.arrival) / 2;
        if (alpha <= 0) return;
        const bucket = Math.max(1, Math.round(alpha * (buckets.length - 1)));
        buckets[bucket].push(a.x, a.y, b.x, b.y);
      };
      // CSS's 1px gradient bands start at x = -.5 and y = -2.5.
      // Their stroke centers are x = 16n and, after scaleY(-1), y = 6 + 16n.
      if (orientation === 'h') {
        for (let y = -10; y < FADE_END + 32; y += 16) {
          let previous = point(-32, y);
          for (let x = -32 + STEP; x <= WIDTH + 32; x += STEP) {
            const next = point(x, y); segment(previous, next); previous = next;
          }
        }
      } else {
        for (let x = -16; x <= WIDTH + 16; x += 16) {
          let previous = point(x, -32);
          for (let y = -32 + STEP; y <= FADE_END + 32; y += STEP) {
            const next = point(x, y); segment(previous, next); previous = next;
          }
        }
      }
      // Batching short segments by opacity gives the vertical lines a continuous
      // soft arrival band without a hard clipping edge or costly blur filters.
      for (let i = 1; i < buckets.length; i++) {
        const coordinates = buckets[i];
        if (!coordinates.length) continue;
        ctx.beginPath();
        ctx.globalAlpha = INK_ALPHA * opacity * i / (buckets.length - 1);
        for (let j = 0; j < coordinates.length; j += 4) {
          ctx.moveTo(coordinates[j], coordinates[j + 1]);
          ctx.lineTo(coordinates[j + 2], coordinates[j + 3]);
        }
        ctx.stroke();
      }
    }

    getState() {
      return { ...this.state, drawCount: this.drawCount, width: WIDTH, height: HEIGHT, dpr: this.dpr,
        settled: this.state.hProgress === 1 && this.state.vProgress === 1 };
    }
  }
  window.JamWelcomeGrid = JamWelcomeGrid;
})();
