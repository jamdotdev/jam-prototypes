(() => {
  'use strict';

  // Safari's extension has two gates before Jam gets logs: the box in Safari's Extensions settings, then the user
  // allowing it on websites from its toolbar button. Jam only ever hears that the socket is open, so the belt has to
  // say which gate is still closed.
  const tabs = {
    design: { title: 'Design system', host: 'jam.dev', path: 'jam.dev/design-system' },
    checkout: { title: 'Checkout', host: 'shop.acme.dev', path: 'shop.acme.dev/checkout' },
    guide: { title: 'Get logs from Safari', host: 'jam.dev', path: 'jam.dev/safari' },
  };
  // Where the two steps are shown: Jam's own window, or a jam.dev page Jam opens in a new Safari tab
  const guides = ['window', 'tab'];
  const presets = ['off', 'disabled', 'permission', 'site', 'connected'];
  const statusText = {
    off: 'Not running',
    disabled: 'Not installed',
    permission: 'Needs permission',
    site: 'Not allowed on this site',
    connected: 'Connected',
  };
  const escapeHTML = (text) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const appIcon = '<img class="sf-jam-icon" src="assets/welcome/app-icon.png" alt="">';
  const strawberry = '<img src="assets/strawberry.svg" alt="">';
  const puzzle = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 2.5a2 2 0 0 1 4 0V4h3.5A1.5 1.5 0 0 1 17 5.5V9h-1.5a2 2 0 1 0 0 4H17v3.5a1.5 1.5 0 0 1-1.5 1.5H12v-1.5a2 2 0 1 0-4 0V18H4.5A1.5 1.5 0 0 1 3 16.5V13h1.5a2 2 0 1 0 0-4H3V5.5A1.5 1.5 0 0 1 4.5 4H8z"/></svg>';
  const check = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.4l2.3 2.3 4.7-5.2"/></svg>';
  const cursor = '<img class="sf-cursor" src="assets/recording/cursor.svg" alt="">';
  const spinner = `<span class="rb-spinner" aria-hidden="true">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<i style="--i:${i}"></i>`).join('')}</span>`;
  // The window's one primary button does whatever moves the current step along.
  const setupCopy = {
    1: { title: 'Get logs from Safari', message: 'Two steps in Safari, and Jam ticks each one off as you go.', note: 'Box won’t stay checked? Quit and reopen Safari, then try again.', primary: 'Open Safari Settings' },
    2: { title: 'Get logs from Safari', message: 'Two steps in Safari, and Jam ticks each one off as you go.', note: 'Rather allow one site at a time? Jam asks again on the sites you haven’t allowed.', primary: 'Open Safari' },
    done: { title: 'Logs enabled for Safari', message: 'Jam now captures console logs and network requests from Safari.', note: '', primary: 'Done' },
  };
  // Both steps, as Jam's window and the jam.dev page show them. The page only explains, so it says where Safari's
  // settings are and has no statuses.
  const stepsMarkup = (page) => `<li class="sf-setup-step" data-step="1">
      <div class="sf-setup-art is-settings" aria-hidden="true"><span class="sf-art-stage">
        <span class="sf-art-pane"><span class="sf-art-pane-title"><span class="sf-setup-lights"><i></i><i></i><i></i></span>Extensions</span>
          <span class="sf-art-row"><span class="sf-checkbox is-on">${check}</span><span class="sf-ext-icon is-password"></span>1Password for Safari</span>
          <span class="sf-art-row is-selected"><span class="sf-checkbox sf-art-box">${check}</span><span class="sf-ext-icon">${appIcon}</span>Jam for Safari</span></span>
        ${cursor}
      </span></div>
      <div class="sf-setup-step-copy">
        <span class="sf-setup-badge" aria-hidden="true"><b>1</b>${check}</span>
        <div><h3>Turn on Jam Extension in Safari</h3>${page ? '<p>Choose Safari › Settings…, click Extensions, then check the box next to Jam for Safari.</p>' : `<p>In Safari’s settings, check the box next to Jam for Safari.</p><span class="sf-setup-status is-done">${check}Turned on</span>`}</div>
      </div>
    </li>
    <li class="sf-setup-step" data-step="2">
      <div class="sf-setup-art is-toolbar" aria-hidden="true"><span class="sf-art-stage">
        <span class="sf-art-toolbar"><span class="sf-art-nav"><i></i><i></i></span><span class="sf-art-address">jam.dev</span><span class="sf-art-extension">${strawberry}</span><span class="sf-art-tool"></span></span>
        <span class="sf-art-popover"><b>Allow “Jam for Safari” to access “jam.dev”?</b><i>Allow for One Day</i><i>Always Allow on This Website</i><i class="is-default">Always Allow on Every Website</i></span>
        ${cursor}
      </span></div>
      <div class="sf-setup-step-copy">
        <span class="sf-setup-badge" aria-hidden="true"><b>2</b>${check}</span>
        <div><h3>Click the Jam icon and enable site level logs permissions</h3><p>It’s in Safari’s toolbar${page ? ', just above this page' : ''}. Choose “Always Allow on Every Website”.</p>${page ? '' : `<span class="sf-setup-status is-waiting" role="status">${spinner}Waiting for Safari…</span><span class="sf-setup-status is-done">${check}Allowed</span>`}</div>
      </div>
    </li>`;

  function create({ root, article, onChange, onToast, onSetup, preset = 'disabled' }) {
    let running = preset !== 'off';
    let enabled = !['off', 'disabled'].includes(preset);
    // 'none', 'all', or the set of hosts allowed one by one
    let access = preset === 'connected' ? 'all' : 'none';
    let tab = 'design';
    let guide = 'window';
    let guideOpen = false;
    let guiding = false;
    let popoverOpen = false;
    let doneTimer = 0;
    // Whether Safari's setup has the pointer: Jam's window, the jam.dev page, or Safari's own permission prompt
    let holding = false;

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
    // jam.dev/safari, a page with both steps that Jam opens in Safari whatever the default browser is. A web page can't
    // see Safari's settings or the extension, so both steps stay active: it explains, and Jam's belt reports the result.
    const guidePage = document.createElement('div');
    guidePage.className = 'sf-guide';
    guidePage.hidden = true;
    guidePage.innerHTML = `<div class="sf-guide-page">
        <nav class="sf-guide-nav"><img class="sf-guide-logo" src="assets/auth-logo.svg" alt="Jam"><span class="sf-guide-help">Need help?</span></nav>
        <header class="sf-guide-heading"><h1>Get logs from Safari</h1><p>Connect Jam to the Safari extension and enable permissions</p></header>
        <ol class="sf-guide-steps">${stepsMarkup(true)}</ol>
        <p class="sf-guide-note">Box won’t stay checked? Quit and reopen Safari, then try again.</p>
      </div>`;
    for (const item of guidePage.querySelectorAll('.sf-setup-step')) item.dataset.status = 'current';
    content.after(guidePage);
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

    // Jam's own window for both gates, as wide as onboarding, with the two steps side by side. It stays clear of Safari's
    // toolbar and ticks each step off as Safari reports it.
    const setup = document.createElement('section');
    setup.className = 'sf-setup';
    setup.setAttribute('role', 'dialog');
    setup.setAttribute('aria-labelledby', 'sf-setup-title');
    setup.setAttribute('aria-describedby', 'sf-setup-message');
    setup.hidden = true;
    setup.innerHTML = `<div class="sf-setup-grid" aria-hidden="true"></div>
      <header class="sf-setup-titlebar"><div class="traffic-lights"><button type="button" class="traffic close sf-setup-close" aria-label="Close"></button><span class="traffic minimize"></span><span class="traffic zoom"></span></div></header>
      <div class="sf-setup-heading"><h2 id="sf-setup-title"></h2><p id="sf-setup-message"></p></div>
      <ol class="sf-setup-steps">${stepsMarkup(false)}</ol>
      <footer class="sf-setup-footer"><p class="sf-setup-note"></p><div><button type="button" class="sf-setup-button sf-setup-cancel">Not Now</button><button type="button" class="sf-setup-button is-primary sf-setup-primary"></button></div></footer>`;
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
      article.dataset.safariTab = tab;
      guidePage.hidden = tab !== 'guide';
      renderSetup(current);
      for (const toggle of toggles) toggle.checked = enabled;
      settingsPane.querySelectorAll('.sf-checkbox-hit .sf-checkbox, .sf-detail-toggle .sf-checkbox').forEach((box) => box.classList.toggle('is-on', enabled));
      if (popoverOpen && current === 'connected') closePopover();
    }

    // The window shows whichever step is next, and a step Safari undoes (unchecking the box) comes back.
    function renderSetup(current) {
      const step = current === 'connected' ? 'done' : enabled ? '2' : '1';
      if (setup.dataset.step === step) return;
      const copy = setupCopy[step];
      setup.querySelector('#sf-setup-title').textContent = copy.title;
      setup.querySelector('#sf-setup-message').textContent = copy.message;
      setup.querySelector('.sf-setup-note').textContent = copy.note;
      setup.querySelector('.sf-setup-primary').textContent = copy.primary;
      setup.querySelector('.sf-setup-cancel').hidden = step === 'done';
      setup.dataset.step = step;
      for (const item of setup.querySelectorAll('.sf-setup-step')) {
        const done = step === 'done' || item.dataset.step < step;
        item.dataset.status = done ? 'done' : item.dataset.step === step ? 'current' : 'next';
        item.setAttribute('aria-current', String(item.dataset.status === 'current' ? 'step' : false));
      }
      // Once both are done the window steps aside, and the page hands Safari's window back, so the belt can show
      // Safari as connected
      if (step === 'done' && (!setup.hidden || guiding)) {
        clearTimeout(doneTimer);
        doneTimer = setTimeout(() => {
          closeSetup();
          setGuiding(false);
        }, 1400);
      }
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
      hold();
    }

    function closePopover() {
      if (!popoverOpen) return;
      popoverOpen = false;
      popover.hidden = true;
      toolbar.querySelector('.sf-extension').setAttribute('aria-expanded', 'false');
      hold();
    }

    function allow(scope) {
      const before = state();
      if (scope === 'all') access = 'all';
      else access = new Set([...(access instanceof Set ? access : []), host()]);
      closePopover();
      changed();
      if (before !== 'connected' && state() === 'connected') onToast('Logs enabled for Safari');
    }

    // The browser window in the desktop's own coordinates
    function windowFrame() {
      const box = root.getBoundingClientRect();
      const frame = article.getBoundingClientRect();
      const scale = box.width / root.offsetWidth || 1;
      return { x: (frame.left - box.left) / scale, y: (frame.top - box.top) / scale };
    }

    // Beside Safari when there's room; otherwise centred below Safari's toolbar, so Jam's button stays in reach.
    function placeSetup() {
      const frame = windowFrame();
      const width = setup.offsetWidth;
      const height = setup.offsetHeight;
      const beside = frame.x - width - 24 >= 8;
      setup.style.left = `${beside ? frame.x - width - 24 : Math.max(8, (root.clientWidth - width) / 2)}px`;
      setup.style.top = `${Math.max(36, Math.min(frame.y + (beside ? 0 : 52), root.clientHeight - height - 8))}px`;
    }

    // The window steps aside once its button has done what Jam can for the step: open Safari's settings, or Safari's
    // permission prompt.
    function setupAction() {
      const step = setup.dataset.step;
      closeSetup();
      if (step === '1') openSettings();
      else if (step === '2') openPopover();
    }

    // The logs row and the menu bar start whichever step is missing. Turning the extension on goes through Jam's window
    // or the jam.dev page; allowing it on websites is Safari's own prompt, which Jam opens from the toolbar button.
    function startSetup() {
      if (running && enabled) openPopover();
      else if (guide === 'tab') openGuide();
      else openSetup();
    }

    function setGuiding(value) {
      guiding = value;
      hold();
    }

    function hold() {
      const value = !setup.hidden || guiding || popoverOpen;
      if (holding === value) return;
      holding = value;
      onSetup(holding);
    }

    // Safari comes forward on the page, in a tab of its own. The page has no button for Safari's settings, so Jam opens
    // them on Extensions too while the box is unchecked.
    function openGuide() {
      running = true;
      clearTimeout(doneTimer);
      closePopover();
      closeSetup();
      guideOpen = true;
      tab = 'guide';
      guidePage.scrollTop = 0;
      changed();
      setGuiding(state() !== 'connected');
      if (!enabled) openSettings(true);
    }

    function closeGuide() {
      clearTimeout(doneTimer);
      guideOpen = false;
      if (tab === 'guide') tab = 'design';
      closePopover();
      changed();
      setGuiding(false);
    }

    function setGuide(value) {
      if (!guides.includes(value) || value === guide) return;
      guide = value;
      closeSetup();
      if (guideOpen) closeGuide();
    }

    function openSetup() {
      running = true;
      clearTimeout(doneTimer);
      closePopover();
      render();
      setup.hidden = false;
      placeSetup();
      setup.querySelector('.sf-setup-primary').focus({ preventScroll: true });
      hold();
    }

    function closeSetup() {
      clearTimeout(doneTimer);
      if (setup.hidden) return;
      setup.hidden = true;
      closeSettings();
      hold();
    }

    // Safari opens its settings on Extensions with Jam selected. Beside the jam.dev page they sit to Safari's left,
    // below the page's heading, so the page stays readable.
    function openSettings(besidePage = false) {
      running = true;
      settingsPane.hidden = false;
      const frame = windowFrame();
      const left = besidePage ? frame.x - settingsPane.offsetWidth - 24 : (root.clientWidth - settingsPane.offsetWidth) / 2;
      const top = besidePage ? frame.y + 44 : (root.clientHeight - settingsPane.offsetHeight) / 2 - 40;
      settingsPane.style.left = `${Math.max(16, left)}px`;
      settingsPane.style.top = `${Math.max(36, Math.min(top, root.clientHeight - settingsPane.offsetHeight - 8))}px`;
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
      if (name === 'guide') setGuiding(state() !== 'connected');
    }

    function reset() {
      running = true;
      enabled = false;
      access = 'none';
      guideOpen = false;
      tab = 'design';
      closePopover();
      closeSettings();
      closeSetup();
      changed();
      setGuiding(false);
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
    setup.querySelector('.sf-setup-primary').addEventListener('click', setupAction);
    // Clicking Safari's window brings it forward over its Settings pane, as macOS would
    article.addEventListener('pointerdown', closeSettings, true);
    setup.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeSetup();
      } else if (event.key === 'Tab') {
        // Focus stays in the window while it's up, as it would in a sheet
        const buttons = [...setup.querySelectorAll('.sf-setup-button')].filter((button) => button.offsetParent);
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
      guide: () => guide,
      setGuide,
      startSetup,
      openSetup,
      openSettings,
      reset,
      isGuiding: () => holding,
      isSetupOpen: () => !setup.hidden,
      owns: (element) => !!element?.closest?.('.sf-settings, .sf-popover, .sf-setup'),
    };
  }

  window.JamSafari = { create, presets, guides, statusText };
})();
