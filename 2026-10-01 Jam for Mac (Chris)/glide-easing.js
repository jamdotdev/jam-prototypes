(() => {
  'use strict';

  const PRESETS = [
    { name: 'Smooth', value: [1 / 3, 0, 2 / 3, 1] },
    { name: 'Ease in/out', value: [.42, 0, .58, 1] },
    { name: 'Gentle stop', value: [.16, 1, .3, 1] },
    { name: 'Linear', value: [0, 0, 1, 1] }
  ];
  const PLOT = { x: 26, y: 12, width: 198, height: 108 };
  const VIEW = { width: 240, height: 144 };
  const clamp = value => Math.max(0, Math.min(1, value));
  const normalize = value => PRESETS[0].value.map((fallback, index) =>
    value && Number.isFinite(value[index]) ? clamp(value[index]) : fallback
  );
  const component = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;

  // The curve parameter differs from elapsed time. Solve its x coordinate first.
  function solve(value, time) {
    const x = Number.isFinite(time) ? clamp(time) : 0;
    if (x === 0 || x === 1) return x;
    if (value[0] === value[1] && value[2] === value[3]) return x;
    let low = 0;
    let high = 1;
    for (let i = 0; i < 48; i++) {
      const middle = (low + high) / 2;
      if (component(middle, value[0], value[2]) < x) low = middle;
      else high = middle;
    }
    return clamp(component((low + high) / 2, value[1], value[3]));
  }

  function mount(container, options = {}) {
    if (!container || !container.ownerDocument) throw new TypeError('An easing editor container is required.');
    const doc = container.ownerDocument;
    const root = doc.createElement('div');
    root.className = 'jam-glide-easing';
    root.innerHTML = `
      <div class="jam-glide-easing__graph">
        <svg class="jam-glide-easing__plot" viewBox="0 0 240 144" preserveAspectRatio="none" aria-hidden="true">
          <path class="jam-glide-easing__grid" d="M26 12H224V120H26ZM26 66H224M125 12V120"/>
          <path class="jam-glide-easing__diagonal" d="M26 120L224 12"/>
          <path class="jam-glide-easing__tangent" data-tangent="0"/>
          <path class="jam-glide-easing__tangent" data-tangent="1"/>
          <path class="jam-glide-easing__curve"/>
          <circle class="jam-glide-easing__endpoint" cx="26" cy="120" r="2"/>
          <circle class="jam-glide-easing__endpoint" cx="224" cy="12" r="2"/>
          <circle class="jam-glide-easing__progress" r="3.5"/>
          <text class="jam-glide-easing__axis" x="125" y="140" text-anchor="middle">Time</text>
          <text class="jam-glide-easing__axis" x="8" y="66" text-anchor="middle" transform="rotate(-90 8 66)">Travel</text>
        </svg>
        <button type="button" class="jam-glide-easing__handle" data-handle="0" aria-label="Start point"><span></span></button>
        <button type="button" class="jam-glide-easing__handle" data-handle="1" aria-label="End point"><span></span></button>
      </div>
      <div class="jam-glide-easing__controls">
        <label class="jam-glide-easing__preset-label"><span>Glide easing</span><span class="jam-glide-easing__select-wrap"><select aria-label="Glide easing preset"></select></span></label>
        <div class="jam-glide-easing__numbers">
          ${['Start X', 'Start Y', 'End X', 'End Y'].map((name, index) => `<label><span>${name}</span><input type="number" min="0" max="1" step="0.01" inputmode="decimal" data-coordinate="${index}" aria-label="${name}" /></label>`).join('')}
        </div>
        <span class="jam-glide-easing__sr-only" data-keyboard-help>Use left and right arrows to change time, and up and down arrows to change travel. Hold Shift for larger steps. All values stay between zero and one.</span>
      </div>`;
    container.replaceChildren(root);

    let value = normalize(options.value);
    let progress = 0;
    let drag = null;
    const plot = root.querySelector('.jam-glide-easing__plot');
    const curve = root.querySelector('.jam-glide-easing__curve');
    const marker = root.querySelector('.jam-glide-easing__progress');
    const tangents = Array.from(root.querySelectorAll('[data-tangent]'));
    const handles = Array.from(root.querySelectorAll('[data-handle]'));
    const inputs = Array.from(root.querySelectorAll('[data-coordinate]'));
    const preset = root.querySelector('select');
    const help = root.querySelector('[data-keyboard-help]');
    // A unique description keeps separately mounted editors accessible.
    mount.sequence = (mount.sequence || 0) + 1;
    help.id = `jam-glide-easing-help-${mount.sequence}`;
    for (const handle of handles) handle.setAttribute('aria-describedby', help.id);
    for (let index = 0; index <= PRESETS.length; index++) {
      const option = doc.createElement('option');
      option.value = String(index);
      option.textContent = PRESETS[index]?.name || 'Custom';
      option.disabled = index === PRESETS.length;
      preset.append(option);
    }
    const point = (x, y) => ({ x: PLOT.x + x * PLOT.width, y: PLOT.y + (1 - y) * PLOT.height });
    const display = number => String(Number(number.toFixed(3)));

    function renderProgress() {
      const position = point(progress, solve(value, progress));
      marker.setAttribute('cx', String(position.x));
      marker.setAttribute('cy', String(position.y));
    }

    function render(preservedInput = null) {
      const start = point(value[0], value[1]);
      const end = point(value[2], value[3]);
      curve.setAttribute('d', `M26 120C${start.x} ${start.y} ${end.x} ${end.y} 224 12`);
      tangents[0].setAttribute('d', `M26 120L${start.x} ${start.y}`);
      tangents[1].setAttribute('d', `M224 12L${end.x} ${end.y}`);
      [start, end].forEach((position, index) => {
        handles[index].style.left = `${position.x / VIEW.width * 100}%`;
        handles[index].style.top = `${position.y / VIEW.height * 100}%`;
        handles[index].setAttribute('aria-label', `${index ? 'End' : 'Start'} point: time ${display(value[index * 2])}, travel ${display(value[index * 2 + 1])}`);
      });
      inputs.forEach((input, index) => {
        if (input !== preservedInput) input.value = display(value[index]);
      });
      const selected = PRESETS.findIndex(item => item.value.every((coordinate, index) => Math.abs(coordinate - value[index]) < .000001));
      preset.value = String(selected === -1 ? PRESETS.length : selected);
      renderProgress();
    }

    function update(next, notify = true, preservedInput = null) {
      const previous = value;
      value = normalize(next);
      render(preservedInput);
      if (notify && value.some((coordinate, index) => coordinate !== previous[index]) && typeof options.onChange === 'function') {
        options.onChange(value.slice());
      }
    }

    preset.addEventListener('change', () => {
      const selected = PRESETS[Number(preset.value)];
      if (selected) update(selected.value);
    });
    inputs.forEach((input, index) => {
      input.addEventListener('input', () => {
        if (input.value === '' || !Number.isFinite(input.valueAsNumber)) return;
        const next = value.slice();
        next[index] = input.valueAsNumber;
        update(next, true, input);
      });
      input.addEventListener('change', () => render());
      input.addEventListener('blur', () => render());
    });

    function pointerPosition(event) {
      const rect = plot.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      return {
        x: ((event.clientX - rect.left) / rect.width * VIEW.width - PLOT.x) / PLOT.width,
        y: 1 - ((event.clientY - rect.top) / rect.height * VIEW.height - PLOT.y) / PLOT.height
      };
    }

    handles.forEach((handle, index) => {
      handle.addEventListener('pointerdown', event => {
        if (event.button !== 0 || drag) return;
        const position = pointerPosition(event);
        if (!position) return;
        event.preventDefault();
        handle.focus({ preventScroll: true });
        handle.setPointerCapture(event.pointerId);
        drag = { pointerId: event.pointerId, index, offsetX: value[index * 2] - position.x, offsetY: value[index * 2 + 1] - position.y };
        handle.classList.add('is-dragging');
        doc.addEventListener('pointermove', moveDrag, true);
        doc.addEventListener('pointerup', endDrag, true);
        doc.addEventListener('pointercancel', endDrag, true);
      });
      const moveDrag = event => {
        if (!drag || drag.pointerId !== event.pointerId || drag.index !== index) return;
        const position = pointerPosition(event);
        if (!position) return;
        const next = value.slice();
        next[index * 2] = position.x + drag.offsetX;
        next[index * 2 + 1] = position.y + drag.offsetY;
        update(next);
      };
      const endDrag = event => {
        if (!drag || drag.pointerId !== event.pointerId || drag.index !== index) return;
        drag = null;
        doc.removeEventListener('pointermove', moveDrag, true);
        doc.removeEventListener('pointerup', endDrag, true);
        doc.removeEventListener('pointercancel', endDrag, true);
        handle.classList.remove('is-dragging');
        if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      };
      handle.addEventListener('lostpointercapture', endDrag);
      handle.addEventListener('keydown', event => {
        const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [1, 1], ArrowDown: [1, -1] };
        const move = moves[event.key];
        if (!move) return;
        event.preventDefault();
        const next = value.slice();
        next[index * 2 + move[0]] += move[1] * (event.shiftKey ? .1 : .01);
        update(next);
      });
    });

    render();
    return {
      setValue(next) { update(next, false); },
      getValue() { return value.slice(); },
      ease(time) { return solve(value, time); },
      setProgress(time) { progress = Number.isFinite(time) ? clamp(time) : 0; renderProgress(); }
    };
  }

  window.JamGlideEasing = { mount };
})();
