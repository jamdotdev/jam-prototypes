(() => {
  'use strict';
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const formatTime = (seconds, precise = false) => {
    const value = Math.max(0, seconds);
    const minutes = Math.floor(value / 60);
    const remainder = Math.floor(value % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}${precise ? `.${Math.floor((value % 1) * 100 + 0.00001).toString().padStart(2, '0')}` : ''}`;
  };
  let instanceCount = 0;
  const chevrons = {
    start: 'M9 17L4.33214 10.465C4.21263 10.2977 4.15288 10.214 4.12976 10.1228C4.10935 10.0422 4.10935 9.9578 4.12976 9.87722C4.15288 9.78597 4.21263 9.70232 4.33214 9.53501L9 3',
    end: 'M3 17L7.66786 10.465C7.78737 10.2977 7.84712 10.214 7.87024 10.1228C7.89065 10.0422 7.89065 9.9578 7.87024 9.87722C7.84712 9.78597 7.78737 9.70232 7.66786 9.53501L3 3',
  };
  const handleIcon = side => `<svg class="dt-handle-icon" width="12" height="20" viewBox="0 0 12 20" fill="none" aria-hidden="true"><path d="${chevrons[side]}" stroke="black" stroke-opacity=".1216" stroke-width="4" stroke-linecap="round"/></svg>`;

  // Setters accept playback state without emitting callbacks. Callbacks are user intents.
  class JamDraftTimeline {
    constructor(container, options = {}) {
      if (!container) throw new Error('JamDraftTimeline requires a container.');
      this.container = container;
      this.options = { loop: false, handleAnimationMs: 220, handleSpringiness: 65, ...options };
      this.duration = Math.max(.25, finite(options.duration, 163));
      this.start = 0;
      this.end = this.duration;
      this.time = 0;
      this.sourceSizeBytes = Number.isFinite(options.sourceSizeBytes) && options.sourceSizeBytes >= 0 ? options.sourceSizeBytes : null;
      this.showFileSize = false;
      this.playing = false;
      this.active = true;
      this.drag = null;
      this.hoverTime = null;
      this.isPreviewing = false;
      this.listeners = [];
      this.id = `draft-timeline-${++instanceCount}`;
      container.innerHTML = `<div class="draft-timeline" role="group" aria-label="Video playback and trim controls">
        <button class="dt-play" type="button" aria-label="Play video" aria-pressed="false"><span class="dt-play-icon dt-play-icon--play"><img src="assets/trim-play.svg" alt="" draggable="false"></span><span class="dt-play-icon dt-play-icon--pause"><img src="assets/trim-pause.svg" alt="" draggable="false"></span></button>
        <div class="dt-track" role="group" aria-label="Video timeline">
          <div class="dt-film" aria-hidden="true"></div><div class="dt-selection" aria-hidden="true"><div class="dt-selected-frames"></div></div>
          <div class="dt-scrubber" role="slider" tabindex="0" aria-label="Video position" aria-valuemin="0" aria-valuemax="${this.duration}" aria-valuenow="0" aria-describedby="${this.id}-help"></div>
          <button class="dt-handle dt-handle--start" type="button" role="slider" aria-label="Trim start" aria-orientation="horizontal" aria-describedby="${this.id}-help"><span class="dt-handle-visual">${handleIcon('start')}</span></button>
          <button class="dt-handle dt-handle--end" type="button" role="slider" aria-label="Trim end" aria-orientation="horizontal" aria-describedby="${this.id}-help"><span class="dt-handle-visual">${handleIcon('end')}</span></button>
          <div class="dt-current-head" aria-hidden="true"></div><div class="dt-hover-head" aria-hidden="true"></div><div class="dt-tooltip" aria-hidden="true">0:00.00</div>
        </div><button type="button" class="dt-duration" aria-label="Selected video duration"></button>
        <span class="dt-sr-only" id="${this.id}-help">Hover while paused to preview frames. Click or release a scrub to place the playhead and play. Drag the handles to trim. Arrow keys adjust by a tenth of a second; Shift and arrows adjust by one second. Home and End move to a boundary. Enter on the playhead starts playback. Space plays or pauses.</span>
      </div>`;
      this.root = container.querySelector('.draft-timeline');
      this.track = this.root.querySelector('.dt-track');
      this.scrubber = this.root.querySelector('.dt-scrubber');
      this.selection = this.root.querySelector('.dt-selection');
      this.frames = this.root.querySelector('.dt-selected-frames');
      this.playButton = this.root.querySelector('.dt-play');
      this.startHandle = this.root.querySelector('.dt-handle--start');
      this.endHandle = this.root.querySelector('.dt-handle--end');
      this.handleMotion = new Map([
        [this.startHandle, { path: this.startHandle.querySelector('path'), original: chevrons.start, progress: 0, velocity: 0, target: 0, frame: 0 }],
        [this.endHandle, { path: this.endHandle.querySelector('path'), original: chevrons.end, progress: 0, velocity: 0, target: 0, frame: 0 }],
      ]);
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.currentHead = this.root.querySelector('.dt-current-head');
      this.hoverHead = this.root.querySelector('.dt-hover-head');
      this.tooltip = this.root.querySelector('.dt-tooltip');
      this.durationLabel = this.root.querySelector('.dt-duration');
      this.bind();
      this.setOptions(options);
      this.render();
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.render());
        this.resizeObserver.observe(this.track);
      }
    }

    listen(target, type, callback, options) {
      target.addEventListener(type, callback, options);
      this.listeners.push(() => target.removeEventListener(type, callback, options));
    }

    bind() {
      this.listen(this.playButton, 'click', () => this.togglePlay());
      this.listen(this.durationLabel, 'click', () => { this.showFileSize = !this.showFileSize; this.renderDuration(); });
      this.listen(this.startHandle, 'pointerdown', event => this.beginDrag(event, 'start'));
      this.listen(this.endHandle, 'pointerdown', event => this.beginDrag(event, 'end'));
      this.listen(this.track, 'pointerdown', event => {
        if (!event.target.closest('.dt-handle')) this.beginDrag(event, 'scrub');
      });
      this.listen(window, 'pointermove', event => {
        if (this.drag && event.pointerId === this.drag.pointerId) this.updateDrag(event);
      });
      this.listen(window, 'pointerup', event => this.endDrag(event));
      this.listen(window, 'pointercancel', event => this.endDrag(event));
      this.listen(this.track, 'lostpointercapture', event => this.endDrag(event));
      this.listen(window, 'blur', () => { this.endDrag(); this.clearHover(); });
      this.listen(this.track, 'pointermove', event => {
        if (this.drag || this.playing || !this.active || event.pointerType === 'touch') return;
        if (event.target.closest('.dt-handle')) { this.clearHover(); return; }
        this.hoverTime = this.timeAtClientX(event.clientX);
        this.isPreviewing = true;
        this.root.classList.add('is-hovering');
        this.renderHover();
        this.options.onPreviewTimeChange?.(this.hoverTime);
      });
      this.listen(this.track, 'pointerleave', () => { if (!this.drag) this.clearHover(); });
      this.listen(this.startHandle, 'keydown', event => this.keyboard(event, 'start'));
      this.listen(this.endHandle, 'keydown', event => this.keyboard(event, 'end'));
      this.listen(this.scrubber, 'keydown', event => this.keyboard(event, 'scrub'));
      this.listen(window, 'resize', () => this.render());
      this.listen(this.reducedMotion, 'change', () => {
        if (this.reducedMotion.matches) this.settleHandles();
      });
      this.listen(document, 'visibilitychange', () => {
        if (document.hidden) { this.endDrag(); this.clearHover(); this.settleHandles(); }
      });
    }

    drawHandle(motion) {
      // Keep Figma's rounded path intact and unfold its points into one line.
      let coordinate = 0;
      const amount = motion.progress;
      const d = amount === 0 ? motion.original : motion.original.replace(/\d+(?:\.\d+)?/g, value => {
        const from = Number(value);
        const to = coordinate++ % 2 === 0 ? 6 : 10 + (from - 10) * 15 / 14;
        return String(Number((from + (to - from) * amount).toFixed(5)));
      });
      motion.path.setAttribute('d', d);
      // Geometry can overshoot; keep the stroke within the two designed styles.
      const styleAmount = clamp(amount, 0, 1);
      motion.path.setAttribute('stroke-width', String(4 + styleAmount));
      motion.path.setAttribute('stroke-opacity', String(.1216 + .0284 * styleAmount));
    }

    animateHandle(handle, straight) {
      const motion = this.handleMotion.get(handle);
      if (!motion) return;
      cancelAnimationFrame(motion.frame);
      motion.frame = 0;
      motion.target = straight ? 1 : 0;
      let previousTime = performance.now();
      const step = now => {
        const response = clamp(finite(this.options.handleAnimationMs, 220), 0, 1000);
        if (this.reducedMotion.matches || !this.active || document.hidden || response === 0) {
          this.settleHandle(motion);
          return;
        }
        const dt = Math.max(0, (now - previousTime) / 1000);
        previousTime = now;
        const omega = 4.5 / Math.max(.04, response / 1000);
        const damping = 1 - .75 * clamp(finite(this.options.handleSpringiness, 65), 0, 100) / 100;
        const displacement = motion.progress - motion.target;
        const velocity = motion.velocity;
        const decay = Math.exp(-damping * omega * dt);
        // Solve the damped spring exactly per frame, retaining velocity when
        // the target changes. This stays stable at any refresh rate.
        if (damping === 1) {
          const b = velocity + omega * displacement;
          motion.progress = motion.target + decay * (displacement + b * dt);
          motion.velocity = decay * (velocity - omega * b * dt);
        } else {
          const frequency = omega * Math.sqrt(1 - damping * damping);
          const b = (velocity + damping * omega * displacement) / frequency;
          const sin = Math.sin(frequency * dt);
          const cos = Math.cos(frequency * dt);
          motion.progress = motion.target + decay * (displacement * cos + b * sin);
          motion.velocity = decay * ((b * frequency - damping * omega * displacement) * cos
            - (displacement * frequency + damping * omega * b) * sin);
        }
        if (Math.abs(motion.progress - motion.target) < .001 && Math.abs(motion.velocity) < .01) {
          this.settleHandle(motion);
          return;
        }
        this.drawHandle(motion);
        motion.frame = requestAnimationFrame(step);
      };
      step(previousTime);
    }

    settleHandle(motion) {
      cancelAnimationFrame(motion.frame);
      motion.frame = 0;
      motion.progress = motion.target;
      motion.velocity = 0;
      this.drawHandle(motion);
    }

    settleHandles() {
      for (const motion of this.handleMotion.values()) this.settleHandle(motion);
    }

    geometry() {
      const rect = this.track.getBoundingClientRect();
      const width = this.track.clientWidth || 545;
      return { rect, width, contentWidth: Math.max(1, width - 56), scale: rect.width / width || 1 };
    }

    timeAtClientX(clientX) {
      const { rect, contentWidth, scale } = this.geometry();
      return clamp(((clientX - rect.left) / scale - 28) / contentWidth * this.duration, this.start, this.end);
    }

    seek(time, source) {
      this.time = clamp(time, this.start, this.end);
      this.render();
      this.options.onTimeChange?.(this.time, { source });
    }

    requestPlay(playing) {
      if (this.playing === playing) return;
      this.playing = playing;
      this.clearHover();
      this.render();
      this.options.onPlayChange?.(playing);
    }

    togglePlay() {
      if (!this.active || this.drag) return;
      if (!this.playing && this.time >= this.end - .01) this.seek(this.start, 'restart');
      this.requestPlay(!this.playing);
    }

    beginDrag(event, mode) {
      if (!this.active || this.drag || (event.button !== undefined && event.button !== 0)) return;
      event.preventDefault();
      event.stopPropagation();
      this.requestPlay(false);
      this.clearHover();
      const { contentWidth, scale } = this.geometry();
      this.drag = { mode, pointerId: event.pointerId, clientX: event.clientX, initialValue: mode === 'start' ? this.start : this.end, contentWidth, scale };
      this.root.classList.toggle('is-trimming', mode !== 'scrub');
      const target = mode === 'start' ? this.startHandle : mode === 'end' ? this.endHandle : this.scrubber;
      target.focus({ preventScroll: true });
      target.classList.add('is-dragging');
      if (mode !== 'scrub') this.animateHandle(target, true);
      try { this.track.setPointerCapture(event.pointerId); } catch (_) { /* A synthetic or canceled pointer has no capture. */ }
      if (mode === 'scrub') this.seek(this.timeAtClientX(event.clientX), 'scrub');
      else this.seek(mode === 'start' ? this.start : this.end, `trim-${mode}`);
      this.hoverTime = this.time;
      this.renderHover();
    }

    updateDrag(event) {
      if (!this.drag) return;
      const { mode, clientX, initialValue, contentWidth, scale } = this.drag;
      if (mode === 'scrub') {
        this.seek(this.timeAtClientX(event.clientX), 'scrub');
      } else {
        const time = initialValue + (event.clientX - clientX) / scale / contentWidth * this.duration;
        this.trimBoundary(mode, time);
      }
      this.hoverTime = this.time;
      this.root.classList.add('is-hovering');
      this.renderHover();
    }

    trimBoundary(mode, value) {
      const minSpan = Math.min(.25, this.duration);
      const previous = mode === 'start' ? this.start : this.end;
      if (mode === 'start') this.start = clamp(value, 0, this.end - minSpan);
      else this.end = clamp(value, this.start + minSpan, this.duration);
      if (Math.abs(previous - this[mode]) > .00001) this.options.onTrimChange?.({ start: this.start, end: this.end });
      this.seek(this[mode], `trim-${mode}`);
    }

    endDrag(event) {
      if (!this.drag || (event?.pointerId !== undefined && event.pointerId !== this.drag.pointerId)) return;
      const { pointerId, mode } = this.drag;
      const placed = event?.type === 'pointerup';
      // Include the release coordinate even when the browser coalesces a fast move.
      if (placed && Number.isFinite(event.clientX)) this.updateDrag(event);
      this.drag = null;
      this.root.classList.remove('is-trimming');
      this.startHandle.classList.remove('is-dragging');
      this.endHandle.classList.remove('is-dragging');
      this.animateHandle(this.startHandle, false);
      this.animateHandle(this.endHandle, false);
      this.scrubber.classList.remove('is-dragging');
      try { if (this.track.hasPointerCapture(pointerId)) this.track.releasePointerCapture(pointerId); } catch (_) { /* Browser already released a canceled pointer. */ }
      this.clearHover();
      this.render();
      if (placed && mode === 'scrub' && this.active && !document.hidden) this.requestPlay(true);
    }

    keyboard(event, mode) {
      if (!this.active) return;
      if (event.key === 'Enter' && mode === 'scrub') {
        event.preventDefault(); event.stopPropagation();
        if (!this.playing) this.togglePlay();
        return;
      }
      if (event.key === ' ' || event.key.toLowerCase() === 'k') {
        event.preventDefault(); event.stopPropagation(); this.togglePlay(); return;
      }
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      this.requestPlay(false);
      this.clearHover();
      const current = mode === 'scrub' ? this.time : this[mode];
      const step = event.shiftKey ? 1 : .1;
      let value = current + (['ArrowLeft', 'ArrowDown'].includes(event.key) ? -step : step);
      if (event.key === 'Home') value = mode === 'scrub' ? this.start : 0;
      if (event.key === 'End') value = mode === 'scrub' ? this.end : this.duration;
      if (mode === 'scrub') this.seek(value, 'keyboard');
      else this.trimBoundary(mode, value);
    }

    clearHover() {
      const wasPreviewing = this.isPreviewing;
      this.isPreviewing = false;
      this.hoverTime = null;
      this.root.classList.remove('is-hovering');
      if (wasPreviewing) this.options.onPreviewTimeChange?.(null);
    }

    renderHover() {
      if (this.hoverTime === null) return;
      const { width, contentWidth } = this.geometry();
      const x = 28 + this.hoverTime / this.duration * contentWidth;
      this.hoverHead.style.left = `${x}px`;
      this.tooltip.textContent = formatTime(this.hoverTime, true);
      this.tooltip.style.left = `${clamp(x, 27, width - 27)}px`;
    }

    render() {
      const { width, contentWidth } = this.geometry();
      const startX = this.start / this.duration * contentWidth;
      const endX = this.end / this.duration * contentWidth + 56;
      this.root.style.setProperty('--dt-start-x', `${startX}px`);
      this.root.style.setProperty('--dt-end-x', `${endX}px`);
      // Keep both 40px targets separate even for a frame-sized cut in a long clip.
      // Only their invisible hit regions shift; the 28px handles remain in place.
      this.root.style.setProperty('--dt-hit-shift', `${Math.max(0, (68 - (endX - startX)) / 2)}px`);
      this.root.style.setProperty('--dt-strip-width', `${width}px`);
      this.selection.style.left = `${startX}px`;
      this.selection.style.width = `${endX - startX}px`;
      this.frames.style.setProperty('--dt-selected-position', `${-startX - 28}px 0`);
      this.currentHead.style.left = `${28 + this.time / this.duration * contentWidth}px`;
      this.root.classList.toggle('is-trimmed', this.start > .0001 || this.end < this.duration - .0001);
      this.root.classList.toggle('is-playing', this.playing);
      this.root.classList.toggle('is-inactive', !this.active);
      this.playButton.setAttribute('aria-label', this.playing ? 'Pause video' : 'Play video');
      this.playButton.setAttribute('aria-pressed', String(this.playing));
      this.playButton.disabled = !this.active;
      this.scrubber.setAttribute('tabindex', this.active ? '0' : '-1');
      this.scrubber.setAttribute('aria-valuemin', this.start.toFixed(2));
      this.scrubber.setAttribute('aria-valuemax', this.end.toFixed(2));
      this.scrubber.setAttribute('aria-valuenow', this.time.toFixed(2));
      this.scrubber.setAttribute('aria-valuetext', `${formatTime(this.time, true)} of ${formatTime(this.duration, true)}`);
      for (const [handle, min, max, value] of [[this.startHandle, 0, this.end - .25, this.start], [this.endHandle, this.start + .25, this.duration, this.end]]) {
        handle.setAttribute('aria-valuemin', Math.max(0, min).toFixed(2));
        handle.setAttribute('aria-valuemax', Math.max(0, max).toFixed(2));
        handle.setAttribute('aria-valuenow', value.toFixed(2));
        handle.setAttribute('aria-valuetext', formatTime(value, true));
        handle.disabled = !this.active;
      }
      this.durationLabel.disabled = !this.active;
      this.renderDuration();
      this.renderHover();
    }

    getSelectedSizeBytes() {
      return this.sourceSizeBytes === null ? null : this.sourceSizeBytes * clamp((this.end - this.start) / this.duration, 0, 1);
    }

    renderDuration() {
      const seconds = this.end - this.start;
      const duration = formatTime(seconds, seconds < 1);
      const bytes = this.getSelectedSizeBytes();
      let size = '—';
      if (bytes !== null) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const unit = bytes > 0 ? clamp(Math.floor(Math.log10(bytes) / 3), 0, units.length - 1) : 0;
        size = `${(bytes / 1000 ** unit).toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
      }
      this.durationLabel.textContent = this.showFileSize ? size : duration;
      this.durationLabel.dataset.metric = this.showFileSize ? 'size' : 'duration';
      this.durationLabel.setAttribute('aria-label', this.showFileSize
        ? `Estimated file size: ${bytes === null ? 'unavailable' : size}. Show duration`
        : `Selected video duration: ${duration}. Show estimated file size`);
      this.durationLabel.title = this.showFileSize
        ? `${bytes === null ? 'File size unavailable.' : 'Estimated from the original file size and selected duration.'} Click to show duration.`
        : `${formatTime(this.start, true)} – ${formatTime(this.end, true)} (${seconds.toFixed(2)} seconds). Click to show estimated file size.`;
    }

    setSourceSize(bytes) {
      this.sourceSizeBytes = Number.isFinite(bytes) && bytes >= 0 ? bytes : null;
      this.renderDuration();
    }

    getState() { return { duration: this.duration, start: this.start, end: this.end, time: this.time, playing: this.playing, active: this.active, trimmed: this.start > .0001 || this.end < this.duration - .0001 }; }
    setTime(time) { this.time = clamp(finite(time, this.time), this.start, this.end); this.render(); }
    setPlaying(playing) { this.playing = Boolean(playing) && this.active && !this.drag; if (this.playing) this.clearHover(); this.render(); }
    setDuration(seconds) {
      const previous = this.duration;
      this.duration = Math.max(.25, finite(seconds, previous));
      this.start = clamp(this.start / previous * this.duration, 0, this.duration - .25);
      this.end = clamp(this.end / previous * this.duration, this.start + .25, this.duration);
      this.time = clamp(this.time / previous * this.duration, this.start, this.end);
      this.render();
    }
    setTrim(start, end) {
      this.start = clamp(finite(start, 0), 0, this.duration - .25);
      this.end = clamp(finite(end, this.duration), this.start + .25, this.duration);
      this.time = clamp(this.time, this.start, this.end);
      this.render();
    }
    reset() { this.endDrag(); this.settleHandles(); this.start = 0; this.end = this.duration; this.time = 0; this.playing = false; this.showFileSize = false; this.clearHover(); this.render(); }
    setActive(active) { this.active = Boolean(active); if (!this.active) { this.endDrag(); this.settleHandles(); this.requestPlay(false); this.clearHover(); } this.render(); }
    setOptions(options = {}) {
      Object.assign(this.options, options);
    }
    setThumbnailSource(url, { size = 'var(--dt-strip-width) 100%', position = '0 0' } = {}) {
      this.root.style.setProperty('--dt-thumbnail-image', `url(${JSON.stringify(String(url))})`);
      this.root.style.setProperty('--dt-thumbnail-size', size);
      this.root.style.setProperty('--dt-thumbnail-position', position);
    }
    destroy() { this.endDrag(); for (const motion of this.handleMotion.values()) cancelAnimationFrame(motion.frame); this.resizeObserver?.disconnect(); for (const remove of this.listeners) remove(); this.listeners = []; this.container.replaceChildren(); }
  }
  window.JamDraftTimeline = JamDraftTimeline;
})();
