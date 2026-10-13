(() => {
  'use strict';

  // Safari's extension has two gates before Jam gets logs: the box in Safari's Extensions settings, then the user
  // allowing it on websites from its toolbar button. Jam only ever hears that the socket is open, so the belt has to
  // say which gate is still closed.
  const tabs = {
    design: { title: 'Design system', host: 'jam.dev', path: 'jam.dev/design-system' },
    checkout: { title: 'Checkout', host: 'shop.acme.dev', path: 'shop.acme.dev/checkout' },
    guide: { title: 'Connecting Jam to Safari', host: 'jam.dev', path: 'jam.dev/safari' },
  };
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
  // The extension's own toolbar icon, which Safari greys until the user allows it
  const strawberry = '<img src="assets/recording/safari-extension.png" alt="">';
  const puzzle = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 2.5a2 2 0 0 1 4 0V4h3.5A1.5 1.5 0 0 1 17 5.5V9h-1.5a2 2 0 1 0 0 4H17v3.5a1.5 1.5 0 0 1-1.5 1.5H12v-1.5a2 2 0 1 0-4 0V18H4.5A1.5 1.5 0 0 1 3 16.5V13h1.5a2 2 0 1 0 0-4H3V5.5A1.5 1.5 0 0 1 4.5 4H8z"/></svg>';
  const check = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.4l2.3 2.3 4.7-5.2"/></svg>';
  const cursor = '<img class="sf-cursor" src="assets/recording/cursor.svg" alt="">';

  function create({ root, article, onChange, onToast, onSetup, preset = 'disabled' }) {
    let running = preset !== 'off';
    let enabled = !['off', 'disabled'].includes(preset);
    // 'none', 'all', or the set of hosts allowed one by one
    let access = preset === 'connected' ? 'all' : 'none';
    let tab = 'design';
    // The tab Safari goes back to when the jam.dev page closes
    let lastTab = 'design';
    let guideOpen = false;
    let popoverOpen = false;
    // Jam's setup is under way, from the logs button until Safari is connected or the user walks away from it. The record
    // card stays on Safari's window throughout, so recording picks up where it left off.
    let active = false;
    let doneTimer = 0;
    let closeTimer = 0;

    // Safari's chrome replaces Chrome's address bar inside the same browser window. Extensions sit left of the address.
    const titlebar = article.querySelector('.rb-window-titlebar');
    const content = article.querySelector('.rb-browser-content');
    const toolbar = document.createElement('div');
    toolbar.className = 'sf-toolbar';
    toolbar.innerHTML = `<span class="sf-nav" aria-hidden="true"><i class="sf-chevron is-back"></i><i class="sf-chevron"></i></span>
      <button type="button" class="sf-extension" aria-label="Jam for Safari" aria-haspopup="dialog" aria-expanded="false">${strawberry}</button>
      <span class="sf-address"><span class="sf-address-text"></span></span>
      <span class="sf-tools" aria-hidden="true"><i></i><i></i></span>`;
    titlebar.append(toolbar);
    const extension = toolbar.querySelector('.sf-extension');
    const tabBar = document.createElement('div');
    tabBar.className = 'sf-tabs';
    tabBar.setAttribute('role', 'tablist');
    tabBar.setAttribute('aria-label', 'Safari tabs');
    content.before(tabBar);
    // jam.dev/safari, which Jam opens in a new Safari tab for the second gate, laid out like jam.dev/download: a centred
    // heading over one card. A web page can't see the extension, so it only shows how, with a loop of clicking Jam's
    // toolbar button and allowing it on every website.
    const guidePage = document.createElement('div');
    guidePage.className = 'sf-guide';
    guidePage.hidden = true;
    guidePage.innerHTML = `<div class="sf-guide-page">
        <header class="sf-guide-heading">
          <h1>Connecting Jam to Safari</h1>
          <p>Allow Jam on every website so it can capture console logs and network requests.</p>
        </header>
        <section class="sf-guide-card">
          <div class="sf-guide-art sf-demo" aria-hidden="true"><span class="sf-demo-stage">
            <span class="sf-art-window"><span class="sf-art-toolbar"><span class="sf-art-nav"><i></i><i></i></span><span class="sf-demo-extension">${strawberry}</span><span class="sf-art-address">jam.dev/safari</span></span></span>
            <span class="sf-demo-popover"><span class="sf-demo-popover-head">${appIcon}<b>Allow “Jam for Safari” to access “jam.dev”?</b></span><i>Allow for One Day</i><i>Always Allow on This Website</i><i class="is-default">Always Allow on Every Website</i></span>
            ${cursor}
          </span></div>
          <p class="sf-guide-caption"><b>Click the Jam icon</b> and choose Always Allow on Every Website</p>
        </section>
      </div>`;
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

    // Jam's alert, centred on the screen while Safari's settings are open, with a picture of the one thing to do there.
    // The picture fades at its edges so it reads as an illustration rather than the box itself. It goes once the box is
    // checked.
    const coach = document.createElement('div');
    coach.className = 'sf-coach';
    coach.setAttribute('role', 'dialog');
    coach.setAttribute('aria-labelledby', 'sf-coach-title');
    coach.setAttribute('aria-describedby', 'sf-coach-message');
    coach.hidden = true;
    coach.innerHTML = `<img class="sf-coach-icon" src="assets/welcome/app-icon.png" width="64" height="64" alt="">
      <h2 class="sf-coach-title" id="sf-coach-title">Enable the Jam Safari Extension</h2>
      <p class="sf-coach-message" id="sf-coach-message">In Safari’s Extensions settings, check the box next to Jam for Safari.</p>
      <span class="sf-coach-art" aria-hidden="true"><span class="sf-art-row"><span class="sf-checkbox is-on">${check}</span><span class="sf-ext-icon is-password"></span>1Password for Safari</span><span class="sf-art-row is-selected"><span class="sf-checkbox sf-art-box">${check}</span><span class="sf-ext-icon">${appIcon}</span>Jam for Safari</span>${cursor}</span>
      <button type="button" class="sf-coach-button">OK</button>`;
    root.append(coach);

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
      // Safari adds the button as the box is checked, greyed until the user allows it on websites
      if (extension.hidden && enabled) {
        extension.classList.add('is-arriving');
        extension.addEventListener('animationend', () => extension.classList.remove('is-arriving'), { once: true });
      }
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
      for (const toggle of toggles) toggle.checked = enabled;
      settingsPane.querySelectorAll('.sf-checkbox-hit .sf-checkbox, .sf-detail-toggle .sf-checkbox').forEach((box) => box.classList.toggle('is-on', enabled));
      if (popoverOpen && current === 'connected') closePopover();
      // Once Jam is allowed, the extension closes its own setup tab a moment later
      if (current === 'connected' && guideOpen && !closeTimer) {
        closeTimer = setTimeout(() => {
          closeTimer = 0;
          closeGuide();
        }, 900);
      }
      // The card comes back on Safari's new state and holds there a moment, then goes back to following the pointer
      if (active && current === 'connected' && tab !== 'guide' && !doneTimer) {
        doneTimer = setTimeout(() => {
          doneTimer = 0;
          setActive(false);
        }, 1400);
      }
    }

    function setActive(value) {
      if (!value) {
        clearTimeout(doneTimer);
        doneTimer = 0;
      }
      if (active === value) return;
      active = value;
      onSetup(active);
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
      const button = extension.getBoundingClientRect();
      const box = article.getBoundingClientRect();
      const scale = box.width / article.offsetWidth || 1;
      const center = (button.left + button.width / 2 - box.left) / scale;
      const left = Math.max(8, Math.min(center - 26, article.offsetWidth - popover.offsetWidth - 8));
      popover.style.left = `${left}px`;
      popover.style.setProperty('--arrow-x', `${center - left - 6}px`);
      extension.setAttribute('aria-expanded', 'true');
      popover.querySelector('.is-default').focus({ preventScroll: true });
    }

    function closePopover() {
      if (!popoverOpen) return;
      popoverOpen = false;
      popover.hidden = true;
      extension.setAttribute('aria-expanded', 'false');
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

    // The logs button and the menu bar start whichever gate is still closed: Safari's settings with Jam's alert over
    // them, or the jam.dev page that shows how to allow Jam from the toolbar.
    function startSetup() {
      if (state() === 'connected') return;
      running = true;
      if (enabled) openGuide();
      else {
        openSettings();
        openCoach();
      }
      setActive(true);
    }

    function openGuide() {
      closePopover();
      closeSettings();
      guideOpen = true;
      if (tab !== 'guide') lastTab = tab;
      tab = 'guide';
      guidePage.scrollTop = 0;
      changed();
    }

    function closeGuide() {
      clearTimeout(closeTimer);
      closeTimer = 0;
      guideOpen = false;
      if (tab === 'guide') tab = lastTab;
      closePopover();
      changed();
      if (state() !== 'connected') setActive(false);
    }

    // Safari opens its settings on Extensions with Jam selected, to the left of its window so the record card stays in
    // view.
    function openSettings() {
      running = true;
      settingsPane.hidden = false;
      const frame = windowFrame();
      const left = frame.x - settingsPane.offsetWidth - 24;
      const top = frame.y + 44;
      settingsPane.style.left = `${Math.max(16, left)}px`;
      settingsPane.style.top = `${Math.max(36, Math.min(top, root.clientHeight - settingsPane.offsetHeight - 8))}px`;
      settingsPane.querySelector('.sf-checkbox-hit input').focus({ preventScroll: true });
      changed();
    }

    // Closing Safari's settings with the box still unchecked leaves the setup.
    function closeSettings() {
      if (settingsPane.hidden) return;
      settingsPane.hidden = true;
      closeCoach();
      onChange();
      if (!enabled) setActive(false);
    }

    // macOS centres an app's alert on the screen, whichever window it's about
    function openCoach() {
      if (enabled) return;
      coach.hidden = false;
      coach.style.left = `${(root.clientWidth - coach.offsetWidth) / 2}px`;
      coach.style.top = `${(root.clientHeight - coach.offsetHeight) / 2}px`;
      coach.querySelector('.sf-coach-button').focus({ preventScroll: true });
    }

    function closeCoach() {
      coach.hidden = true;
    }

    function setPreset(name) {
      if (!presets.includes(name)) return;
      running = name !== 'off';
      enabled = !['off', 'disabled'].includes(name);
      access = name === 'connected' ? 'all' : name === 'site' ? new Set(['shop.acme.dev']) : 'none';
      if (name === 'site' && host() === 'shop.acme.dev') tab = 'design';
      closePopover();
      if (enabled) closeCoach();
      changed();
    }

    function setTab(name) {
      if (!tabs[name]) return;
      if (name === 'guide' && !guideOpen) {
        guideOpen = true;
        lastTab = tab;
      }
      tab = name;
      closePopover();
      changed();
    }

    function reset() {
      running = true;
      enabled = false;
      access = 'none';
      clearTimeout(closeTimer);
      closeTimer = 0;
      guideOpen = false;
      tab = 'design';
      closePopover();
      closeSettings();
      changed();
      setActive(false);
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
    extension.addEventListener('pointerdown', (event) => event.stopPropagation());
    extension.addEventListener('click', () => (popoverOpen ? closePopover() : openPopover()));
    popover.addEventListener('pointerdown', (event) => event.stopPropagation());
    popover.addEventListener('click', (event) => {
      const button = event.target.closest('[data-allow]');
      if (button) allow(button.dataset.allow);
    });
    popover.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closePopover();
        extension.focus({ preventScroll: true });
      }
    });
    for (const toggle of toggles) {
      toggle.addEventListener('change', () => {
        enabled = toggle.checked;
        if (enabled) closeCoach();
        changed();
      });
    }
    settingsPane.querySelector('.sf-settings-close').addEventListener('click', closeSettings);
    coach.querySelector('.sf-coach-button').addEventListener('click', closeCoach);
    coach.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        closeCoach();
        settingsPane.querySelector('.sf-checkbox-hit input').focus({ preventScroll: true });
      }
    });
    // Clicking Safari's window brings it forward over its Settings pane, as macOS would
    article.addEventListener('pointerdown', closeSettings, true);
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
      startSetup,
      openSettings,
      reset,
      isGuiding: () => active,
      endSetup: () => setActive(false),
      // The card and its tint step away while the setup tab is up, so the page reads on its own
      isAway: () => active && tab === 'guide',
      owns: (element) => !!element?.closest?.('.sf-settings, .sf-popover, .sf-coach'),
    };
  }

  window.JamSafari = { create, presets, statusText };
})();
