(() => {
  'use strict';

  // Jam's docs page on adding logs, which full screen links to when no app sends logs. It's a wireframe: the headings
  // are real and everything else is a grey bar standing in for the text.
  const bars = (...widths) => widths.map((width) => `<i class="jd-bar" style="width:${width}%"></i>`).join('');
  const sources = [
    ['chrome-app.png', 'Chrome', [92, 64]],
    ['safari.png', 'Safari', [88, 72, 40]],
    ['notion.png', 'Electron apps', [90, 56]],
  ];

  function page() {
    const element = document.createElement('div');
    element.className = 'jd-docs';
    element.hidden = true;
    element.innerHTML = `<div class="jd-page">
        <header class="jd-bar-top"><img class="jd-logo" src="assets/auth-logo.svg" alt="Jam"><span class="jd-product">Docs</span><span class="jd-search"></span></header>
        <div class="jd-body">
          <nav class="jd-nav" aria-hidden="true">${bars(70, 54, 62)}<span class="jd-nav-current">Capture logs</span>${bars(58, 66, 48, 60)}</nav>
          <article class="jd-article">
            <span class="jd-eyebrow">Recording</span>
            <h1>Add logs to your recordings</h1>
            <p class="jd-lines" aria-hidden="true">${bars(96, 88, 52)}</p>
            ${sources
              .map(([file, name, widths]) => `<section class="jd-section"><h2><img src="assets/recording/${file}" alt="">${name}</h2><p class="jd-lines" aria-hidden="true">${bars(...widths)}</p></section>`)
              .join('')}
          </article>
        </div>
      </div>`;
    return element;
  }

  window.JamDocs = { page, title: 'Add logs to your recordings', path: 'jam.dev/docs/capture-logs' };
})();
