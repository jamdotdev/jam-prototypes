(() => {
  'use strict';

  const permissions = [
    { id: 'screen', name: 'Screen Recording', action: 'Allow screen recording', icon: 'display.svg' },
    { id: 'camera', name: 'Camera', action: 'Allow camera', icon: 'camera.svg' },
    { id: 'microphone', name: 'Microphone', action: 'Allow microphone', icon: 'microphone.svg' }
  ];
  const granted = { screen: false, camera: false, microphone: false };
  let host = null;
  let footerButton = null;
  let onContinue = null;
  let active = false;
  let completed = false;
  let listeners = null;

  function getState() {
    return { active, completed, permissions: { ...granted }, next: permissions.find(item => !granted[item.id])?.id ?? 'continue' };
  }

  function paint() {
    if (!host) return;
    permissions.forEach(item => {
      const control = host.querySelector(`[data-permission="${item.id}"]`);
      control.setAttribute('aria-checked', String(granted[item.id]));
    });
    if (active && footerButton) {
      const next = permissions.find(item => !granted[item.id]);
      footerButton.textContent = next?.action ?? 'Continue';
      footerButton.disabled = completed;
      footerButton.dataset.permissionStep = next?.id ?? 'continue';
    }
  }

  function announce(message) {
    host.querySelector('.permission-status').textContent = message;
    host.dispatchEvent(new CustomEvent('permissionchange', { bubbles: true, detail: getState() }));
  }

  function update(id, value, keyboard = false) {
    if (!active || completed) return;
    if (keyboard) host.classList.add('permissions-no-motion');
    granted[id] = value;
    paint();
    if (keyboard) {
      // Apply the state without tweening keyboard-triggered controls.
      void host.offsetWidth;
      host.classList.remove('permissions-no-motion');
    }
    const item = permissions.find(permission => permission.id === id);
    announce(`${item.name} ${value ? 'allowed' : 'turned off'}.`);
  }

  function handleContinue(event) {
    if (!active || completed) return;
    const next = permissions.find(item => !granted[item.id]);
    if (next) {
      update(next.id, true, event.detail === 0);
      return;
    }
    completed = true;
    paint();
    announce('Permissions are ready.');
    onContinue?.(getState());
  }

  /**
   * Mount only the permission content; the caller owns the window, grid and footer.
   * Call setActive(true) after entering this stage. Each footer press simulates
   * granting the next permission, then invokes options.onContinue with the state.
   * This prototype never requests browser or operating-system capture access.
   */
  function mount(container, button, options = {}) {
    if (!(container instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) {
      throw new TypeError('JamPermissions.mount requires a container and footer button.');
    }
    listeners?.abort();
    listeners = new AbortController();
    if (host && host !== container) host.replaceChildren();
    host = container;
    footerButton = button;
    onContinue = typeof options.onContinue === 'function' ? options.onContinue : null;
    active = false;
    completed = false;
    Object.keys(granted).forEach(id => { granted[id] = false; });
    host.classList.add('permission-content');
    host.inert = true;
    host.innerHTML = `
      <header class="permission-header">
        <h2 id="permission-title">Record your screen</h2>
        <p>Give Jam access to record your screen, a window, or a selected area.</p>
      </header>
      <div class="permission-rows" role="group" aria-labelledby="permission-title">
        ${permissions.map(item => `
          <div class="permission-row">
            <span class="permission-label" id="permission-label-${item.id}">${item.name}</span>
            <button class="permission-switch" type="button" role="switch" data-permission="${item.id}" aria-labelledby="permission-label-${item.id}" aria-checked="false">
              <span class="permission-switch-knob"><img src="assets/permissions/${item.icon}" width="12.8" height="12.8" alt="" draggable="false"></span>
            </button>
          </div>`).join('')}
      </div>
      <p class="permission-status" role="status" aria-live="polite" aria-atomic="true"></p>`;
    host.addEventListener('click', event => {
      const control = event.target.closest('[data-permission]');
      if (!control || !host.contains(control)) return;
      const id = control.dataset.permission;
      update(id, !granted[id], event.detail === 0);
    }, { signal: listeners.signal });
    footerButton.addEventListener('click', handleContinue, { signal: listeners.signal });
    paint();
    return window.JamPermissions;
  }

  function reset() {
    Object.keys(granted).forEach(id => { granted[id] = false; });
    completed = false;
    if (host) {
      host.classList.add('permissions-no-motion');
      host.querySelector('.permission-status').textContent = '';
      paint();
      void host.offsetWidth;
      host.classList.remove('permissions-no-motion');
    }
  }

  function setActive(value) {
    active = Boolean(value);
    if (host) host.inert = !active;
    paint();
  }

  window.JamPermissions = { mount, reset, setActive, getState };
})();
