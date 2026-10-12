(() => {
  'use strict';

  // Safari's extension has two gates before Jam gets logs: the box in Safari's Extensions settings, then the user
  // allowing it on websites from its toolbar button. Jam only ever hears that the socket is open, so the belt has to
  // say which gate is still closed.
  const tabs = {
    design: { title: 'Design system', host: 'jam.dev', path: 'jam.dev/design-system' },
    checkout: { title: 'Checkout', host: 'shop.acme.dev', path: 'shop.acme.dev/checkout' },
    guide: { title: 'Allow Jam in Safari', host: 'jam.dev', path: 'jam.dev/safari' },
  };
  const presets = ['off', 'disabled', 'permission', 'site', 'connected'];
  const statusText = {
    off: 'Not running',
    disabled: 'Not installed',
    permission: 'Needs permission',
    site: 'Not allowed on this site',
    connected: 'Connected',
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const escapeHTML = (text) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const appIcon = '<img class="sf-jam-icon" src="assets/welcome/app-icon.png" alt="">';
  const strawberry = '<img src="assets/strawberry.svg" alt="">';
  const puzzle = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 2.5a2 2 0 0 1 4 0V4h3.5A1.5 1.5 0 0 1 17 5.5V9h-1.5a2 2 0 1 0 0 4H17v3.5a1.5 1.5 0 0 1-1.5 1.5H12v-1.5a2 2 0 1 0-4 0V18H4.5A1.5 1.5 0 0 1 3 16.5V13h1.5a2 2 0 1 0 0-4H3V5.5A1.5 1.5 0 0 1 4.5 4H8z"/></svg>';
  const check = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.4l2.3 2.3 4.7-5.2"/></svg>';
  const cursor = '<img class="sf-cursor" src="assets/recording/cursor.svg" alt="">';

  function create({ root, article, onChange, onToast, onGuide, onSetup, preset = 'disabled' }) {
    let running = preset !== 'off';
    let enabled = !['off', 'disabled'].includes(preset);
    // 'none', 'all', or the set of hosts allowed one by one
    let access = preset === 'connected' ? 'all' : 'none';
    let tab = 'design';
    let guideOpen = false;
    let guiding = false;
    let guideTimer = 0;
    let popoverOpen = false;

    // Safari's chrome replaces Chrome's address bar inside the same browser window
    const titlebar = article.querySelector('.rb-window-titlebar');
    const content = article.querySelector('.rb-browser-content');
    const toolbar = document.createElement('div');
    toolbar.className = 'sf-toolbar';
    toolbar.innerHTML = `<span class="sf-nav" aria-hidden="true"><i class="sf-chevron is-back"></i><i class="sf-chevron"></i></span>
      <span class="sf-address"><span class="sf-address-text"></span></span>
      <button type="button" class="sf-extension" aria-label="Jam for Safari" aria-haspopup="dialog" aria-expanded="false">${strawberry}</button>
      <span class="sf-tools" aria-hidden="true"><i></i><i></i></span>`;
    titlebar.append(toolbar);
    const tabBar = document.createElement('div');
    tabBar.className = 'sf-tabs';
    tabBar.setAttribute('role', 'tablist');
    tabBar.setAttribute('aria-label', 'Safari tabs');
    content.before(tabBar);
    const guide = document.createElement('div');
    guide.className = 'sf-guide';
    guide.hidden = true;
    content.after(guide);
    const popover = document.createElement('div');
    popover.className = 'sf-popover';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', 'Jam for Safari');
    popover.hidden = true;
    article.append(popover);

    const settingsPane = document.createElement('div');
    settingsPane.className = 'sf-settings';
    settingsPane.setAttribute('role', 'dialog');
    settingsPane.setAttribute('aria-label', 'Safari Settings, Extensions');
    settingsPane.hidden = true;
    settingsPane.innerHTML = `<header class="sf-settings-titlebar">
        <div class="traffic-lights"><button type="button" class="traffic close sf-settings-close" aria-label="Close Safari Settings"></button><span class="traffic minimize"></span><span class="traffic zoom"></span></div>
        <strong>Extensions</strong>
        <nav class="sf-settings-tabs" aria-hidden="true">${['General', 'Tabs', 'AutoFill', 'Passwords', 'Search', 'Security', 'Privacy', 'Websites', 'Profiles', 'Extensions', 'Advanced']
          .map((name) => `<span class="${name === 'Extensions' ? 'is-selected' : ''}"><i>${name === 'Extensions' ? puzzle : ''}</i>${name}</span>`)
          .join('')}</nav>
      </header>
      <div class="sf-settings-body">
        <aside class="sf-settings-list">
          <div class="sf-settings-row"><span class="sf-checkbox is-on" aria-hidden="true">${check}</span><span class="sf-ext-icon is-password" aria-hidden="true"></span><span>1Password for Safari</span></div>
          <div class="sf-settings-row is-selected"><label class="sf-checkbox-hit"><input type="checkbox" class="sf-jam-toggle" aria-label="Enable Jam for Safari"><span class="sf-checkbox" aria-hidden="true">${check}</span></label><span class="sf-ext-icon" aria-hidden="true">${appIcon}</span><span>Jam for Safari</span></div>
        </aside>
        <section class="sf-settings-detail">
          <div class="sf-detail-head">${appIcon}<div><strong>Jam for Safari</strong><span>Version 1.0 (39)</span><label class="sf-detail-toggle"><input type="checkbox" class="sf-jam-toggle" tabindex="-1" aria-hidden="true"><span class="sf-checkbox" aria-hidden="true">${check}</span>Enable Jam for Safari</label></div></div>
          <p>Captures console logs and network requests for your Jam recordings.</p>
          <dl><dt>Permissions for “Jam for Safari”:</dt><dd><b>Webpage Contents</b> Can read sensitive information from webpages, including passwords, phone numbers and credit cards.</dd><dd><b>Browsing History</b> Can see when you visit webpages.</dd></dl>
          <span class="sf-settings-button" aria-hidden="true">Edit Websites…</span>
        </section>
      </div>`;
    root.append(settingsPane);
    const toggles = [...settingsPane.querySelectorAll('.sf-jam-toggle')];

    // Jam's own window for the first gate, laid out like onboarding, with a picture of where the box is
    const setup = document.createElement('section');
    setup.className = 'sf-setup';
    setup.setAttribute('role', 'dialog');
    setup.setAttribute('aria-labelledby', 'sf-setup-title');
    setup.setAttribute('aria-describedby', 'sf-setup-message');
    setup.hidden = true;
    setup.innerHTML = `<div class="sf-setup-grid" aria-hidden="true"></div>
      <header class="sf-setup-titlebar"><div class="traffic-lights"><button type="button" class="traffic close sf-setup-close" aria-label="Close"></button><span class="traffic minimize"></span><span class="traffic zoom"></span></div></header>
      <div class="sf-setup-heading"><h2 id="sf-setup-title">Turn on Jam in Safari</h2><p id="sf-setup-message">Safari’s settings open on Extensions. Check the box next to Jam for Safari.</p></div>
      <div class="sf-setup-viz" aria-hidden="true">
        <div class="sf-setup-pane">
          <div class="sf-setup-pane-titlebar"><span class="sf-setup-lights"><i></i><i></i><i></i></span><strong>Extensions</strong></div>
          <div class="sf-setup-pane-tabs">${['General', 'Tabs', 'AutoFill', 'Passwords', 'Security', 'Websites', 'Extensions', 'Advanced']
            .map((name) => `<span class="${name === 'Extensions' ? 'is-selected' : ''}"><i>${name === 'Extensions' ? puzzle : ''}</i>${name}</span>`)
            .join('')}</div>
          <div class="sf-setup-pane-body">
            <div class="sf-setup-pane-list">
              <span class="sf-setup-row"><span class="sf-checkbox is-on">${check}</span><span class="sf-ext-icon is-password"></span>1Password for Safari</span>
              <span class="sf-setup-row is-selected"><span class="sf-checkbox sf-setup-box">${check}</span><span class="sf-ext-icon">${appIcon}</span>Jam for Safari${cursor}</span>
            </div>
            <div class="sf-setup-pane-detail">${appIcon}<span><strong>Jam for Safari</strong><i></i><i></i><i class="is-short"></i></span></div>
          </div>
        </div>
      </div>
      <footer class="sf-setup-footer"><p>Box won’t stay checked? Quit and reopen Safari, then try again.</p><div><button type="button" class="sf-setup-button sf-setup-cancel">Not Now</button><button type="button" class="sf-setup-button is-primary sf-setup-open">Open Safari Settings</button></div></footer>`;
    root.append(setup);

    function host() {
      return tabs[tab].host;
    }

    function state() {
      if (!running) return 'off';
      if (!enabled) return 'disabled';
      if (access === 'all') return 'connected';
      if (access === 'none' || !access.size) return 'permission';
      return access.has(host()) ? 'connected' : 'site';
    }

    function changed() {
      render();
      onChange();
    }

    function render() {
      const current = state();
      article.dataset.safari = current;
      toolbar.querySelector('.sf-address-text').textContent = tabs[tab].path;
      const extension = toolbar.querySelector('.sf-extension');
      extension.hidden = !enabled;
      extension.classList.toggle('is-waiting', current === 'permission' || current === 'site');
      extension.title = current === 'connected' ? 'Jam for Safari' : 'Jam for Safari needs permission on this website';
      const open = guideOpen ? ['design', 'checkout', 'guide'] : ['design', 'checkout'];
      const key = `${open.join()}:${tab}`;
      if (tabBar.dataset.key !== key) {
        tabBar.dataset.key = key;
        tabBar.innerHTML = open
          .map((name) => `<button type="button" class="sf-tab" role="tab" aria-selected="${name === tab}" data-tab="${name}"><span>${tabs[name].title}</span>${name === 'guide' ? '<i class="sf-tab-close" role="button" aria-label="Close tab"></i>' : ''}</button>`)
          .join('');
      }
      // The page on show is the tab's; Chrome's own pages take over when the window plays Chrome.
      article.dataset.safariTab = tab;
      guide.hidden = tab !== 'guide';
      if (tab === 'guide') renderGuide(current);
      for (const toggle of toggles) toggle.checked = enabled;
      settingsPane.querySelectorAll('.sf-checkbox-hit .sf-checkbox, .sf-detail-toggle .sf-checkbox').forEach((box) => box.classList.toggle('is-on', enabled));
      if (popoverOpen && current === 'connected') closePopover();
    }

    // A single-purpose page on jam.dev, opened in Safari whatever the default browser is. It's styled after the
    // marketing site, since it will be built in Framer from the site's components.
    function renderGuide(current) {
      const done = current === 'connected';
      const step = (number, state) => `<span class="sf-step-number">${state === 'is-done' ? check : number}</span>`;
      const first = done ? 'is-done' : 'is-current';
      const second = done ? 'is-done' : '';
      guide.dataset.done = String(done);
      guide.innerHTML = `<div class="sf-guide-page">
        <nav class="sf-guide-nav"><img class="sf-guide-logo" src="assets/auth-logo.svg" alt="Jam"><span class="sf-guide-button">Need help?</span></nav>
        <header class="sf-guide-hero">
          ${done ? '<span class="sf-guide-status"><i></i>Logs enabled</span>' : '<span class="sf-guide-eyebrow"><span class="sf-guide-eyebrow-tile"><img src="assets/recording/safari.png" alt=""></span>Jam for Safari</span>'}
          <h1>${done ? 'You’re all set' : 'Allow Jam in Safari'}</h1>
          <p>${done ? 'Jam now captures console logs and network requests from Safari. Head back to Jam to record.' : 'Two clicks, and Jam captures console logs and network requests from Safari.'}</p>
        </header>
        <ol class="sf-guide-steps">
          <li class="${first}">
            ${step(1, first)}
            <div class="sf-step-art" aria-hidden="true"><span class="sf-art-window"><span class="sf-art-titlebar"><i></i><i></i><i></i></span><span class="sf-art-toolbar"><span class="sf-art-address">jam.dev/safari</span><span class="sf-art-extension">${strawberry}${done ? '' : cursor}</span><span class="sf-art-tool"></span></span><span class="sf-art-page"></span></span></div>
            <div class="sf-step-copy"><h2>Click Jam in Safari’s toolbar</h2><p>It’s next to the address bar, greyed out for now.</p></div>
          </li>
          <li class="${second}">
            ${step(2, second)}
            <div class="sf-step-art" aria-hidden="true"><span class="sf-art-popover"><span class="sf-art-popover-head">${appIcon}<b>Allow “Jam for Safari” to access “jam.dev”?</b></span><i>Allow for One Day</i><i>Always Allow on This Website</i><i class="is-highlighted">Always Allow on Every Website${done ? '' : cursor}</i></span></div>
            <div class="sf-step-copy"><h2>Choose “Always Allow on Every Website”</h2><p>Jam only reads a page while you’re recording it.</p></div>
          </li>
        </ol>
        <p class="sf-guide-footnote">${done ? 'You can close this tab.' : 'Rather allow one site at a time? Jam asks again on the sites you haven’t allowed.'}</p>
      </div>`;
    }

    function openPopover() {
      if (popoverOpen || !enabled) return;
      const current = state();
      if (current === 'connected') return;
      popoverOpen = true;
      popover.innerHTML = `<div class="sf-popover-head">${appIcon}<p><strong>Allow “Jam for Safari” to access “${escapeHTML(host())}”?</strong>The extension can read and alter webpages, including passwords, phone numbers and credit cards.</p></div>
        <div class="sf-popover-buttons"><button type="button" data-allow="day">Allow for One Day</button><button type="button" data-allow="site">Always Allow on This Website</button><button type="button" data-allow="all" class="is-default">Always Allow on Every Website</button></div>`;
      popover.hidden = false;
      // The arrow points at the toolbar button, wherever the window's width puts it
      const button = toolbar.querySelector('.sf-extension').getBoundingClientRect();
      const box = article.getBoundingClientRect();
      const scale = box.width / article.offsetWidth || 1;
      const center = (button.left + button.width / 2 - box.left) / scale;
      const left = Math.max(8, Math.min(center - popover.offsetWidth + 26, article.offsetWidth - popover.offsetWidth - 8));
      popover.style.left = `${left}px`;
      popover.style.setProperty('--arrow-x', `${center - left - 6}px`);
      toolbar.querySelector('.sf-extension').setAttribute('aria-expanded', 'true');
      popover.querySelector('.is-default').focus({ preventScroll: true });
    }

    function closePopover() {
      if (!popoverOpen) return;
      popoverOpen = false;
      popover.hidden = true;
      toolbar.querySelector('.sf-extension').setAttribute('aria-expanded', 'false');
    }

    function allow(scope) {
      const before = state();
      if (scope === 'all') access = 'all';
      else access = new Set([...(access instanceof Set ? access : []), host()]);
      closePopover();
      changed();
      if (before !== 'connected' && state() === 'connected') {
        onToast('Logs enabled for Safari');
        // The guide steps aside once it's done, so the belt can show Safari as connected
        if (guiding) {
          clearTimeout(guideTimer);
          guideTimer = setTimeout(() => setGuiding(false), reduced.matches ? 0 : 1400);
        }
      }
    }

    function setGuiding(value) {
      if (guiding === value) return;
      guiding = value;
      render();
      onGuide(guiding);
    }

    function openGuide() {
      running = true;
      guideOpen = true;
      tab = 'guide';
      closeSettings();
      changed();
      setGuiding(true);
    }

    function closeGuide() {
      guideOpen = false;
      if (tab === 'guide') tab = 'design';
      closePopover();
      setGuiding(false);
      changed();
    }

    function openSetup() {
      running = true;
      setup.hidden = false;
      setup.style.left = `${Math.max(8, (root.clientWidth - setup.offsetWidth) / 2)}px`;
      setup.style.top = `${Math.max(36, (root.clientHeight - setup.offsetHeight) / 2 - 30)}px`;
      setup.querySelector('.sf-setup-open').focus({ preventScroll: true });
      onSetup(true);
    }

    function closeSetup() {
      if (setup.hidden) return;
      setup.hidden = true;
      onSetup(false);
    }

    function openSettings() {
      running = true;
      settingsPane.hidden = false;
      const rect = root.getBoundingClientRect();
      settingsPane.style.left = `${Math.max(8, (rect.width - settingsPane.offsetWidth) / 2)}px`;
      settingsPane.style.top = `${Math.max(36, (rect.height - settingsPane.offsetHeight) / 2 - 40)}px`;
      settingsPane.querySelector('.sf-checkbox-hit input').focus({ preventScroll: true });
      changed();
    }

    function closeSettings() {
      if (settingsPane.hidden) return;
      settingsPane.hidden = true;
      onChange();
    }

    function setPreset(name) {
      if (!presets.includes(name)) return;
      running = name !== 'off';
      enabled = !['off', 'disabled'].includes(name);
      access = name === 'connected' ? 'all' : name === 'site' ? new Set(['shop.acme.dev']) : 'none';
      if (name === 'site' && host() === 'shop.acme.dev') tab = 'design';
      closePopover();
      changed();
    }

    function setTab(name) {
      if (!tabs[name]) return;
      if (name === 'guide') guideOpen = true;
      tab = name;
      closePopover();
      changed();
    }

    function reset() {
      clearTimeout(guideTimer);
      running = true;
      enabled = false;
      access = 'none';
      guideOpen = false;
      tab = 'design';
      closePopover();
      closeSettings();
      closeSetup();
      setGuiding(false);
      changed();
    }

    tabBar.addEventListener('pointerdown', (event) => event.stopPropagation());
    tabBar.addEventListener('click', (event) => {
      if (event.target.closest('.sf-tab-close')) {
        closeGuide();
        return;
      }
      const button = event.target.closest('.sf-tab');
      if (button) setTab(button.dataset.tab);
    });
    toolbar.querySelector('.sf-extension').addEventListener('pointerdown', (event) => event.stopPropagation());
    toolbar.querySelector('.sf-extension').addEventListener('click', () => (popoverOpen ? closePopover() : openPopover()));
    popover.addEventListener('pointerdown', (event) => event.stopPropagation());
    popover.addEventListener('click', (event) => {
      const button = event.target.closest('[data-allow]');
      if (button) allow(button.dataset.allow);
    });
    popover.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closePopover();
        toolbar.querySelector('.sf-extension').focus({ preventScroll: true });
      }
    });
    for (const toggle of toggles) {
      toggle.addEventListener('change', () => {
        enabled = toggle.checked;
        changed();
      });
    }
    settingsPane.querySelector('.sf-settings-close').addEventListener('click', closeSettings);
    setup.querySelector('.sf-setup-close').addEventListener('click', closeSetup);
    setup.querySelector('.sf-setup-cancel').addEventListener('click', closeSetup);
    setup.querySelector('.sf-setup-open').addEventListener('click', () => {
      closeSetup();
      openSettings();
    });
    setup.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeSetup();
      } else if (event.key === 'Tab') {
        // Focus stays in the window while it's up, as it would in a sheet
        const buttons = [...setup.querySelectorAll('.sf-setup-button')];
        const index = buttons.indexOf(document.activeElement);
        event.preventDefault();
        buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
      }
    });
    settingsPane.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeSettings();
      }
    });
    document.addEventListener('pointerdown', (event) => {
      if (popoverOpen && !popover.contains(event.target) && !event.target.closest('.sf-extension')) closePopover();
    }, true);

    render();

    return {
      state,
      host,
      statusText: () => statusText[state()],
      tab: () => tab,
      setTab,
      setPreset,
      openSetup,
      openSettings,
      openGuide,
      reset,
      isGuiding: () => guiding,
      isSetupOpen: () => !setup.hidden,
      owns: (element) => !!element?.closest?.('.sf-settings, .sf-popover, .sf-setup'),
    };
  }

  window.JamSafari = { create, presets, statusText };
})();
