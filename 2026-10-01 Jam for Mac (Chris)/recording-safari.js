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
    disabled: 'Not connected',
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

  function create({ root, article, onChange, onToast, onGuide, sources, preset = 'disabled' }) {
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

    const menuButton = document.createElement('button');
    const strawberryItem = document.querySelector('.desktop-menu-right > img[src*="strawberry"]');
    const statusMenu = document.createElement('div');
    if (strawberryItem) {
      menuButton.type = 'button';
      menuButton.className = 'sf-menubar-button';
      menuButton.setAttribute('aria-label', 'Jam');
      menuButton.setAttribute('aria-haspopup', 'menu');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.innerHTML = strawberry;
      strawberryItem.replaceWith(menuButton);
      statusMenu.className = 'native-menu sf-status-menu';
      statusMenu.setAttribute('role', 'menu');
      statusMenu.setAttribute('aria-label', 'Jam');
      statusMenu.hidden = true;
      document.body.append(statusMenu);
    }

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
      extension.classList.toggle('is-pulsing', guiding && current !== 'connected');
      extension.title = current === 'connected' ? 'Jam for Safari' : 'Jam for Safari needs permission on this website';
      const open = guideOpen ? ['design', 'checkout', 'guide'] : ['design', 'checkout'];
      const key = `${open.join()}:${tab}`;
      if (tabBar.dataset.key !== key) {
        tabBar.dataset.key = key;
        tabBar.innerHTML = open
          .map((name) => `<button type="button" class="sf-tab" role="tab" aria-selected="${name === tab}" data-tab="${name}"><span>${tabs[name].title}</span>${name === 'guide' ? '<i class="sf-tab-close" role="button" aria-label="Close tab"></i>' : ''}</button>`)
          .join('');
      }
      content.hidden = tab === 'guide';
      guide.hidden = tab !== 'guide';
      if (tab === 'guide') renderGuide(current);
      for (const toggle of toggles) toggle.checked = enabled;
      settingsPane.querySelectorAll('.sf-checkbox-hit .sf-checkbox, .sf-detail-toggle .sf-checkbox').forEach((box) => box.classList.toggle('is-on', enabled));
      if (popoverOpen && current === 'connected') closePopover();
      if (!statusMenu.hidden) renderStatusMenu();
    }

    // A single-purpose page on jam.dev, opened in Safari whatever the default browser is
    function renderGuide(current) {
      const done = current === 'connected';
      guide.dataset.done = String(done);
      guide.innerHTML = `<div class="sf-guide-page">
        <header>${appIcon}<h2>${done ? 'You’re all set' : 'Allow Jam in Safari'}</h2><p>${done ? 'Jam now captures console logs and network requests from Safari. Head back to Jam to record.' : 'Two clicks, and Jam can capture console logs and network requests from Safari.'}</p></header>
        <ol class="sf-guide-steps">
          <li class="${done ? 'is-done' : 'is-current'}"><span class="sf-step-number">${done ? check : '1'}</span><div><strong>Click the Jam icon in Safari’s toolbar</strong><span>It’s next to the address bar, greyed out for now.</span></div>
            <span class="sf-step-art is-toolbar" aria-hidden="true"><i class="sf-art-address"></i><i class="sf-art-extension">${strawberry}</i></span></li>
          <li class="${done ? 'is-done' : ''}"><span class="sf-step-number">${done ? check : '2'}</span><div><strong>Choose “Always Allow on Every Website”</strong><span>Jam only reads a page while you’re recording it.</span></div>
            <span class="sf-step-art is-choices" aria-hidden="true"><i>Allow for One Day</i><i>Always Allow on This Website</i><i class="is-highlighted">Always Allow on Every Website</i></span></li>
        </ol>
        <p class="sf-guide-footnote">${done ? 'You can close this tab.' : 'Allowing one site at a time? Jam shows “Needs permission” on the others.'}</p>
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
      root.dataset.safariGuide = String(guiding);
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
      setGuiding(false);
      changed();
    }

    // The Jam menu bar extra, where Safari's status lives when nothing on screen asks for it
    function renderStatusMenu() {
      const current = state();
      const rows = sources().map(({ name, file, status, tone }) => `<div class="sf-status-row" role="presentation"><span class="rb-app-icon"><img src="assets/recording/${file}" alt=""></span><span class="sf-status-name">${name}</span><span class="sf-status-value" data-tone="${tone}"><i></i>${status}</span></div>`);
      const action = current === 'disabled' ? ['connect', 'Connect Safari…'] : ['permission', 'site'].includes(current) ? ['allow', 'Allow Jam in Safari…'] : null;
      statusMenu.innerHTML = `<div class="native-menu-label" role="presentation">Log sources</div>${rows.join('')}${action ? `<div class="native-menu-separator" role="separator"></div><button type="button" class="native-menu-item" role="menuitem" tabindex="-1" data-action="${action[0]}">${action[1]}</button>` : ''}`;
    }

    function openStatusMenu() {
      renderStatusMenu();
      statusMenu.hidden = false;
      menuButton.setAttribute('aria-expanded', 'true');
      const bar = document.querySelector('.desktop-menubar').getBoundingClientRect();
      const button = menuButton.getBoundingClientRect();
      statusMenu.style.top = `${bar.bottom}px`;
      statusMenu.style.setProperty('--menu-left', `${Math.max(8, Math.min(button.left - 8, innerWidth - statusMenu.offsetWidth - 8))}px`);
      statusMenu.querySelector('.native-menu-item')?.focus({ preventScroll: true });
    }

    function closeStatusMenu() {
      if (statusMenu.hidden) return;
      statusMenu.hidden = true;
      menuButton.setAttribute('aria-expanded', 'false');
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
    settingsPane.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeSettings();
      }
    });
    if (strawberryItem) {
      menuButton.addEventListener('click', () => (statusMenu.hidden ? openStatusMenu() : closeStatusMenu()));
      statusMenu.addEventListener('click', (event) => {
        const item = event.target.closest('[data-action]');
        if (!item) return;
        closeStatusMenu();
        window.JamRecording?.safariAction(item.dataset.action);
      });
      statusMenu.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeStatusMenu();
          menuButton.focus();
        }
      });
      document.addEventListener('pointerdown', (event) => {
        if (!statusMenu.hidden && !statusMenu.contains(event.target) && !menuButton.contains(event.target)) closeStatusMenu();
      }, true);
    }
    document.addEventListener('pointerdown', (event) => {
      if (popoverOpen && !popover.contains(event.target) && !event.target.closest('.sf-extension')) closePopover();
    }, true);

    render();
    root.dataset.safariGuide = 'false';

    return {
      state,
      host,
      statusText: () => statusText[state()],
      tab: () => tab,
      setTab,
      setPreset,
      openSettings,
      openGuide,
      reset,
      isGuiding: () => guiding,
      owns: (element) => !!element?.closest?.('.sf-settings, .sf-popover'),
    };
  }

  window.JamSafari = { create, presets, statusText };
})();
