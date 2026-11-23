/* Tema: 'auto' (cihaza uy), 'light', 'dark'. Sayfa çizilmeden önce uygulanır. */
(function () {
  'use strict';
  const KEY = 'mektup-tema';
  const read = () => { try { return localStorage.getItem(KEY) || 'auto'; } catch { return 'auto'; } };
  function apply(t) {
    const el = document.documentElement;
    if (t === 'light' || t === 'dark') el.setAttribute('data-theme', t); else el.removeAttribute('data-theme');
    const dark = t === 'dark' || (t !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    const m = document.querySelector('meta[name=theme-color]');
    if (m) m.setAttribute('content', dark ? '#171214' : '#c8586c');
  }
  window.Theme = {
    get: read,
    set(t) { try { if (t === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, t); } catch { /* yoksay */ } apply(t); }
  };
  apply(read());
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => apply(read()));
})();
