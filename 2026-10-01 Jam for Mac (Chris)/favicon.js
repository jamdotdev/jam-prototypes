(() => {
  'use strict';
  const appearance = matchMedia('(prefers-color-scheme: dark)');
  function updateFavicon() {
    const mode = appearance.matches ? 'dark' : 'light';
    document.getElementById('app-favicon').setAttribute('href', `assets/favicon-${mode}.svg`);
    document.getElementById('app-favicon-fallback').setAttribute('href', `assets/favicon-${mode}.png`);
  }
  appearance.addEventListener('change', updateFavicon);
  updateFavicon();
})();
