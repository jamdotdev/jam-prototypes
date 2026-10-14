(() => {
  'use strict';

  // The Jam menu bar extra, where each browser's extension status lives when nothing on screen asks for it
  function create({ sources, onAction }) {
    const item = document.querySelector('.desktop-menu-right > img[src*="strawberry"]');
    if (!item) return { refresh() {} };
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sf-menubar-button';
    button.setAttribute('aria-label', 'Jam');
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<img src="assets/strawberry.svg" alt="">';
    item.replaceWith(button);
    const menu = document.createElement('div');
    menu.className = 'native-menu sf-status-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Jam');
    menu.hidden = true;
    document.body.append(menu);

    function render() {
      const rows = sources();
      const actions = rows.filter((row) => row.action);
      menu.innerHTML = `<div class="native-menu-label" role="presentation">Log sources</div>${rows
        .map(({ name, file, status, tone }) => `<div class="sf-status-row" role="presentation"><span class="rb-app-icon"><img src="assets/recording/${file}" alt=""></span><span class="sf-status-name">${name}</span><span class="sf-status-value" data-tone="${tone}"><i></i>${status}</span></div>`)
        .join('')}${actions.length ? `<div class="native-menu-separator" role="separator"></div>${actions
        .map(({ action }) => `<button type="button" class="native-menu-item" role="menuitem" tabindex="-1" data-action="${action.id}">${action.label}</button>`)
        .join('')}` : ''}`;
    }

    function open() {
      render();
      menu.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      const bar = document.querySelector('.desktop-menubar').getBoundingClientRect();
      const box = button.getBoundingClientRect();
      menu.style.top = `${bar.bottom}px`;
      menu.style.setProperty('--menu-left', `${Math.max(8, Math.min(box.left - 8, innerWidth - menu.offsetWidth - 8))}px`);
      menu.querySelector('.native-menu-item')?.focus({ preventScroll: true });
    }

    function close() {
      if (menu.hidden) return;
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }

    button.addEventListener('click', () => (menu.hidden ? open() : close()));
    menu.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]');
      if (!action) return;
      close();
      onAction(action.dataset.action);
    });
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        close();
        button.focus();
      }
    });
    document.addEventListener('pointerdown', (event) => {
      if (!menu.hidden && !menu.contains(event.target) && !button.contains(event.target)) close();
    }, true);

    return {
      refresh() {
        if (!menu.hidden) render();
      },
    };
  }

  window.JamStatusMenu = { create };
})();
