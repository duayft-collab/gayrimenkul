/**
 * src/ui/router.js
 * Duay Global Trade Company — Property OS
 * Anayasa: K01
 * v1.0 / 2026-03-28
 */

const routes = {};
let _current = null;

export function registerRoute(hash, fn) { routes[hash] = fn; }

export function navigate(hash) {
  window.location.hash = hash;
}

export function initRouter(defaultHash = '#dashboard') {
  window.addEventListener('hashchange', _handle);
  _handle();
  if (!window.location.hash) navigate(defaultHash);
}

async function _handle() {
  const hash = window.location.hash || '#dashboard';
  const fn   = routes[hash];
  if (!fn) return;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === hash);
  });

  const content = document.getElementById('content');
  if (!content) return;
  content.innerHTML = `<div class="empty"><div class="empty-icon">⏳</div><p>Yükleniyor...</p></div>`;

  try {
    _current = hash;
    await fn(content);
  } catch(e) {
    console.error(e);
    content.innerHTML = `<div class="empty"><p>Modül yüklenemedi.</p></div>`;
  }
}
