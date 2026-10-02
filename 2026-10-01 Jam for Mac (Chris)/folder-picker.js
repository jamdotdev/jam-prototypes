(() => {
  'use strict';
  const folders = ['Drafts', 'Jam for Mac', 'Onboarding', 'Bug reports', 'Design reviews',
    'Product feedback', 'Engineering', 'Customer support', 'Design system', 'QA & testing',
    'Web app', 'Mobile', 'Team demos', 'Research', 'Archive'];
  const $ = (id) => document.getElementById(id);
  const trigger = $('draft-folder');
  const picker = $('draft-folder-picker');
  const search = $('draft-folder-search');
  const list = $('draft-folder-options');
  let selected = folders[0];
  let results = [];
  let activeIndex = -1;

  function highlight(index, scroll = false) {
    activeIndex = index;
    [...list.children].forEach((option, position) => option.classList.toggle('is-active', position === index));
    const option = list.children[index];
    if (option) {
      search.setAttribute('aria-activedescendant', option.id);
      if (scroll) option.scrollIntoView({ block: 'nearest' });
    } else search.removeAttribute('aria-activedescendant');
  }

  function filter() {
    const query = search.value.trim().toLocaleLowerCase();
    results = folders.filter((folder) => folder.toLocaleLowerCase().includes(query));
    list.replaceChildren();
    results.forEach((folder, index) => {
      const option = document.createElement('div');
      option.id = `draft-folder-option-${folders.indexOf(folder)}`;
      option.className = 'native-menu-item folder-option';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(folder === selected));
      const icon = document.createElement('img');
      icon.src = 'assets/draft/folder.svg';
      icon.alt = '';
      const label = document.createElement('span');
      label.textContent = folder;
      option.append(icon, label);
      option.addEventListener('pointermove', () => highlight(index));
      option.addEventListener('pointerdown', (event) => event.preventDefault());
      option.addEventListener('click', () => choose(folder));
      list.append(option);
    });
    $('draft-folder-empty').hidden = results.length > 0;
    list.scrollTop = 0;
    highlight(results.length ? Math.max(0, results.indexOf(selected)) : -1);
  }

  function updateSelection() {
    $('draft-folder-name').textContent = selected;
    trigger.setAttribute('aria-label', `Draft folder: ${selected}`);
    trigger.title = `Choose a folder · ${selected}`;
  }

  function close(returnFocus = false) {
    if (picker.hidden) return;
    picker.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    search.setAttribute('aria-expanded', 'false');
    search.removeAttribute('aria-activedescendant');
    if (returnFocus) trigger.focus({ preventScroll: true });
  }

  function choose(folder) {
    selected = folder;
    updateSelection();
    close(true);
  }

  function open() {
    search.value = '';
    picker.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    search.setAttribute('aria-expanded', 'true');
    filter();
    search.focus({ preventScroll: true });
    highlight(activeIndex, true);
  }

  trigger.addEventListener('click', () => picker.hidden ? open() : close(true));
  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      open();
    }
  });
  search.addEventListener('input', filter);
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (event.key === 'Tab') {
      close(true);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length) highlight((activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length, true);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (results[activeIndex]) choose(results[activeIndex]);
    }
  });
  document.addEventListener('pointerdown', (event) => {
    if (!picker.contains(event.target) && !trigger.contains(event.target)) close();
  });
  document.addEventListener('focusin', (event) => {
    if (!picker.contains(event.target) && !trigger.contains(event.target)) close();
  });
  document.addEventListener('playgroundchange', () => { if (window.JamPlayground.getSurface() !== 'draft') close(); });
  window.addEventListener('resize', () => close());
  window.addEventListener('blur', () => close());
  window.JamFolderPicker = { getSelected: () => selected, reset() { selected = folders[0]; updateSelection(); close(); } };
  updateSelection();
})();
