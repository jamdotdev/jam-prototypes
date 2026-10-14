(() => {
  'use strict';

  // Chrome's extension comes from the Chrome Web Store, and captures logs as soon as it's added: there's no second
  // gate like Safari's. Whether it's installed is the belt's `browserLogs` setting, so the sidebar and defaults own it.
  const strawberry = '<img src="assets/strawberry.svg" alt="">';
  const appIcon = '<img class="ch-jam-icon" src="assets/welcome/app-icon.png" alt="">';
  const storeIcon = '<svg class="ch-store-icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="#ea4335" d="M2 5h12l-1 9H3z"/><path fill="#fbbc04" d="M8 5h6l-1 9H8z"/><path fill="#34a853" d="M3 9.5h10L13 14H3z"/><path fill="#4285f4" d="M8 9.5h5L13 14H8z"/><path fill="none" stroke="#5f6368" stroke-width="1.3" d="M5.5 5V4a2.5 2.5 0 0 1 5 0v1"/></svg>';
  const puzzle = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 2.5a2 2 0 0 1 4 0V4h3.5A1.5 1.5 0 0 1 17 5.5V9h-1.5a2 2 0 1 0 0 4H17v3.5a1.5 1.5 0 0 1-1.5 1.5H12v-1.5a2 2 0 1 0-4 0V18H4.5A1.5 1.5 0 0 1 3 16.5V13h1.5a2 2 0 1 0 0-4H3V5.5A1.5 1.5 0 0 1 4.5 4H8z"/></svg>';
  const tabs = {
    design: { title: 'Design system', url: 'jam.dev/design-system', icon: strawberry },
    store: { title: 'Jam - Chrome Web Store', url: 'chromewebstore.google.com/detail/jam', icon: storeIcon },
    docs: { title: JamDocs.title, url: JamDocs.path, icon: strawberry },
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function create({ root, article, installed, onInstall, onChange, onGuide }) {
    let tab = 'design';
    let storeOpen = false;
    let docsOpen = false;
    let dialogOpen = false;
    let guiding = false;
    let guideTimer = 0;

    const titlebar = article.querySelector('.rb-window-titlebar');
    const content = article.querySelector('.rb-browser-content');
    const strip = document.createElement('div');
    strip.className = 'ch-tabs';
    strip.setAttribute('role', 'tablist');
    strip.setAttribute('aria-label', 'Chrome tabs');
    titlebar.append(strip);
    const toolbar = document.createElement('div');
    toolbar.className = 'ch-toolbar';
    toolbar.innerHTML = `<span class="ch-nav" aria-hidden="true"><i class="ch-back"></i><i class="ch-forward"></i><i class="ch-reload"></i></span>
      <span class="ch-omnibox"><i class="ch-tune" aria-hidden="true"></i><span class="ch-url"></span></span>
      <span class="ch-actions" aria-hidden="true"><span class="ch-pinned">${strawberry}</span><span class="ch-puzzle">${puzzle}</span><span class="ch-avatar"></span></span>`;
    content.before(toolbar);
    const store = document.createElement('div');
    store.className = 'ch-store';
    store.hidden = true;
    content.after(store);
    const docs = JamDocs.page();
    docs.classList.add('ch-docs');
    store.after(docs);
    const dialog = document.createElement('div');
    dialog.className = 'ch-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-labelledby', 'ch-dialog-title');
    dialog.hidden = true;
    dialog.innerHTML = `<div class="ch-dialog-head">${appIcon}<h2 id="ch-dialog-title">Add “Jam”?</h2></div>
      <p>It can:</p><ul><li>Read and change all your data on all websites</li><li>Capture content of your screen</li></ul>
      <div class="ch-dialog-buttons"><button type="button" class="ch-button is-tonal" data-choice="cancel">Cancel</button><button type="button" class="ch-button is-filled" data-choice="add">Add extension</button></div>`;
    article.append(dialog);

    function render() {
      const added = installed();
      article.dataset.chromeTab = tab;
      toolbar.querySelector('.ch-url').textContent = tabs[tab].url;
      toolbar.querySelector('.ch-pinned').hidden = !added;
      const open = ['design', ...(storeOpen ? ['store'] : []), ...(docsOpen ? ['docs'] : [])];
      const key = `${open.join()}:${tab}`;
      if (strip.dataset.key !== key) {
        strip.dataset.key = key;
        strip.innerHTML = `${open
          .map((name) => `<button type="button" class="ch-tab" role="tab" aria-selected="${name === tab}" data-tab="${name}"><span class="ch-tab-icon">${tabs[name].icon}</span><span class="ch-tab-title">${tabs[name].title}</span>${name === 'design' ? '' : '<i class="ch-tab-close" role="button" aria-label="Close tab"></i>'}</button>`)
          .join('')}<span class="ch-new-tab" aria-hidden="true"></span>`;
      }
      store.hidden = tab !== 'store';
      docs.hidden = tab !== 'docs';
      if (tab === 'store') renderStore(added);
    }

    // The extension's listing, much as the store shows it
    function renderStore(added) {
      store.innerHTML = `<div class="ch-store-page">
        <header class="ch-store-bar">${storeIcon}<span>chrome web store</span><span class="ch-store-search">Search extensions and themes</span></header>
        <section class="ch-listing">
          ${appIcon}
          <div class="ch-listing-text"><h1>Jam</h1><a>jam.dev</a><span class="ch-listing-meta"><b>4.8 ★</b> (2.6K ratings) · Extension · Developer Tools · 200,000 users</span><span class="ch-featured">Featured</span></div>
          <button type="button" class="ch-button ${added ? 'is-outlined' : 'is-filled'} ch-store-add">${added ? 'Remove from Chrome' : 'Add to Chrome'}</button>
        </section>
        <div class="ch-shots" aria-hidden="true"><i></i><i></i><i></i></div>
        <p class="ch-listing-overview">Capture bugs with console logs, network requests and your screen in one click.</p>
      </div>`;
    }

    function openDialog() {
      if (dialogOpen || installed()) return;
      dialogOpen = true;
      dialog.hidden = false;
      dialog.querySelector('[data-choice="add"]').focus({ preventScroll: true });
    }

    function closeDialog() {
      if (!dialogOpen) return;
      dialogOpen = false;
      dialog.hidden = true;
    }

    function add() {
      closeDialog();
      onInstall();
      render();
      // The store steps aside once Jam has the extension, so the belt can show Chrome as connected
      clearTimeout(guideTimer);
      guideTimer = setTimeout(() => setGuiding(false), reduced.matches ? 0 : 1400);
    }

    function setGuiding(value) {
      if (guiding === value) return;
      guiding = value;
      onGuide(guiding);
    }

    function changed() {
      render();
      onChange();
    }

    function openStore() {
      storeOpen = true;
      tab = 'store';
      changed();
      setGuiding(!installed());
    }

    function closeStore() {
      storeOpen = false;
      if (tab === 'store') tab = 'design';
      closeDialog();
      setGuiding(false);
      changed();
    }

    function openDocs() {
      docsOpen = true;
      tab = 'docs';
      closeDialog();
      docs.scrollTop = 0;
      changed();
    }

    function closeDocs() {
      docsOpen = false;
      if (tab === 'docs') tab = 'design';
      changed();
    }

    function setTab(name) {
      if (!tabs[name]) return;
      if (name === 'store') storeOpen = true;
      if (name === 'docs') docsOpen = true;
      tab = name;
      closeDialog();
      changed();
    }

    function reset() {
      clearTimeout(guideTimer);
      storeOpen = false;
      docsOpen = false;
      tab = 'design';
      closeDialog();
      setGuiding(false);
      render();
    }

    strip.addEventListener('pointerdown', (event) => event.stopPropagation());
    strip.addEventListener('click', (event) => {
      if (event.target.closest('.ch-tab-close')) {
        if (event.target.closest('.ch-tab').dataset.tab === 'docs') closeDocs();
        else closeStore();
        return;
      }
      const button = event.target.closest('.ch-tab');
      if (button) setTab(button.dataset.tab);
    });
    store.addEventListener('click', (event) => {
      if (event.target.closest('.ch-store-add') && !installed()) openDialog();
    });
    dialog.addEventListener('pointerdown', (event) => event.stopPropagation());
    dialog.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-choice]')?.dataset.choice;
      if (choice === 'add') add();
      else if (choice === 'cancel') closeDialog();
    });
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeDialog();
      }
    });

    render();

    return {
      refresh: render,
      tab: () => tab,
      setTab,
      openStore,
      openDocs,
      reset,
      isGuiding: () => guiding,
      owns: (element) => !!element?.closest?.('.ch-dialog'),
    };
  }

  window.JamChrome = { create };
})();
