(() => {
  'use strict';

  const bar = document.querySelector('.app-menubar');
  const triggers = [...bar.querySelectorAll('.menu-trigger')];
  const playground = window.JamPlayground;
  let openTrigger = null;
  let returnFocus = null;
  let trackingPointer = null;
  let typeahead = '';
  let typeaheadTime = 0;

  const menuFor = (trigger) => document.getElementById(trigger.getAttribute('aria-controls'));
  const itemsFor = (trigger) => [...menuFor(trigger).querySelectorAll('.native-menu-item:not(:disabled)')];

  function syncState() {
    const surface = playground.getSurface();
    bar.querySelectorAll('[data-surface]').forEach((item) => {
      item.setAttribute('aria-checked', String(item.dataset.surface === surface));
    });
    document.getElementById('menu-playground').setAttribute('aria-checked', String(playground.isPlaygroundVisible()));
    document.getElementById('menu-reset').textContent = `Reset ${surface === 'draft' ? 'DraftUI' : 'Onboarding'} Playground`;
  }

  function focusTrigger(trigger) {
    triggers.forEach((item) => { item.tabIndex = item === trigger ? 0 : -1; });
    trigger.focus({ preventScroll: true });
  }

  function closeMenu(restoreFocus = false) {
    if (!openTrigger) return;
    const trigger = openTrigger;
    menuFor(trigger).hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    openTrigger = null;
    trackingPointer = null;
    typeahead = '';
    if (restoreFocus) focusTrigger(trigger);
  }

  function openMenu(trigger, edge) {
    if (!openTrigger) returnFocus = document.activeElement;
    else if (openTrigger !== trigger) closeMenu();
    syncState();
    openTrigger = trigger;
    focusTrigger(trigger);
    trigger.setAttribute('aria-expanded', 'true');
    const menu = menuFor(trigger);
    menu.hidden = false;
    const left = Math.max(8, Math.min(trigger.getBoundingClientRect().left, innerWidth - menu.offsetWidth - 8));
    menu.style.setProperty('--menu-left', `${left}px`);
    if (edge) {
      const items = itemsFor(trigger);
      (edge === 'last' ? items.at(-1) : items[0])?.focus();
    }
  }

  function activate(item) {
    if (!openTrigger) return;
    const trigger = openTrigger;
    closeMenu(true);
    if (item.dataset.surface) {
      playground.setSurface(item.dataset.surface);
    } else if (item.dataset.dialog) {
      const dialog = document.getElementById(item.dataset.dialog);
      dialog.addEventListener('close', () => focusTrigger(trigger), { once: true });
      dialog.showModal();
    } else {
      const commands = {
        playground: () => playground.setPlaygroundVisible(!playground.isPlaygroundVisible()),
        center: () => playground.fit(),
        reset: () => document.getElementById(playground.getSurface() === 'draft' ? 'draft-reset' : 'reset-all').click(),
      };
      commands[item.dataset.command]?.();
    }
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      if (openTrigger === trigger) closeMenu(true);
      else {
        openMenu(trigger);
        trackingPointer = event.pointerId;
      }
    });
    // Keyboard and assistive-technology clicks have no preceding pointerdown.
    trigger.addEventListener('click', (event) => {
      if (event.detail !== 0) return;
      openTrigger === trigger ? closeMenu(true) : openMenu(trigger, 'first');
    });
    trigger.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse' || !openTrigger || openTrigger === trigger) return;
      const pointer = trackingPointer;
      openMenu(trigger);
      trackingPointer = pointer;
    });
  });

  bar.querySelectorAll('.native-menu-item').forEach((item) => {
    item.addEventListener('click', () => activate(item));
    item.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse' && openTrigger && document.activeElement !== item) item.focus({ preventScroll: true });
    });
  });
  bar.querySelectorAll('.native-menu').forEach((menu) => {
    menu.addEventListener('pointermove', (event) => {
      if (openTrigger && event.pointerType === 'mouse' && !event.target.closest('.native-menu-item')) focusTrigger(openTrigger);
    });
  });

  bar.addEventListener('keydown', (event) => {
    const trigger = openTrigger || event.target.closest('.desktop-menu')?.querySelector('.menu-trigger');
    if (!trigger || event.altKey || event.ctrlKey || event.metaKey) return;
    const keys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'];
    if (keys.includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') { closeMenu(true); return; }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const next = triggers[(triggers.indexOf(trigger) + direction + triggers.length) % triggers.length];
        openTrigger ? openMenu(next, 'first') : focusTrigger(next);
        return;
      }
      if (!openTrigger) { openMenu(trigger, event.key === 'ArrowUp' || event.key === 'End' ? 'last' : 'first'); return; }
      const items = itemsFor(trigger);
      const index = items.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : index < 0 ? (event.key === 'ArrowUp' ? items.length - 1 : 0)
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    } else if (event.key === 'Tab') {
      closeMenu(true);
    } else if (openTrigger && event.key.length === 1 && event.key !== ' ') {
      event.preventDefault();
      const now = performance.now();
      typeahead = now - typeaheadTime > 600 ? event.key.toLowerCase() : typeahead + event.key.toLowerCase();
      typeaheadTime = now;
      const items = itemsFor(trigger);
      const start = items.indexOf(document.activeElement) + 1;
      const ordered = [...items.slice(start), ...items.slice(0, start)];
      const query = [...typeahead].every((letter) => letter === typeahead[0]) ? typeahead[0] : typeahead;
      ordered.find((item) => item.textContent.trim().toLowerCase().startsWith(query))?.focus();
    }
  });

  document.addEventListener('pointerup', (event) => {
    if (event.pointerId !== trackingPointer) return;
    trackingPointer = null;
    const item = event.target.closest('.native-menu-item');
    if (item && bar.contains(item)) activate(item);
  });
  document.addEventListener('pointercancel', () => closeMenu(true));
  document.addEventListener('pointerdown', (event) => {
    if (openTrigger && !bar.contains(event.target)) {
      const previous = returnFocus;
      closeMenu();
      if (previous instanceof HTMLElement && previous.isConnected && !previous.closest('[hidden]')) previous.focus({ preventScroll: true });
    }
  });
  document.addEventListener('focusin', (event) => {
    if (openTrigger && !bar.contains(event.target)) closeMenu();
  });
  window.addEventListener('blur', () => closeMenu());
  window.addEventListener('resize', () => closeMenu(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) closeMenu(); });
  document.addEventListener('playgroundchange', syncState);
  syncState();
})();
