// Loaded as an external file (not inline) so the Content-Security-Policy in
// nginx.conf can keep script-src 'self' with no 'unsafe-inline'.
(function () {
  var pref = 'system';
  try {
    pref = localStorage.getItem('diagramforge_theme') || 'system';
  } catch (e) {
    /* storage blocked - fall back to the OS setting */
  }
  var dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
})();
