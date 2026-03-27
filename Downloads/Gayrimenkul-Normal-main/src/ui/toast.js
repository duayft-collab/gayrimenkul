/**
 * src/ui/toast.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.0 / 2026-03-23
 *
 * Toast / Bildirim sistemi.
 * success | error | warning | info türlerini destekler.
 * Birden fazla toast üst üste sıralanır.
 */

import { APP_CONFIG } from '../../config/app-config.js';

const ICONS = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

// Toast container DOM'a bir kez eklenir
let _container = null;

function _ensureContainer() {
  if (_container) return;
  _container = document.createElement('div');
  _container.id = 'toast-container';
  _container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
    max-width: 360px;
  `;
  document.body.appendChild(_container);
}

/**
 * Toast göster.
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {string} message
 * @param {number} duration - ms (0 = otomatik kapanmaz)
 * @param {object} action   - { label, fn } opsiyonel aksiyon butonu
 * @returns {Function} close — toast'ı programatik kapat
 */
export function showToast(type = 'info', message, duration, action = null) {
  _ensureContainer();
  duration = duration ?? APP_CONFIG.toastDuration;

  const colors = {
    success: { bg: '#e8f5ee', border: '#bde0cd', text: '#1a7a4a', icon: '#1a7a4a' },
    error:   { bg: '#fdecea', border: '#f5c6c6', text: '#c0392b', icon: '#c0392b' },
    warning: { bg: '#fdf6e3', border: '#f0d080', text: '#b8860b', icon: '#b8860b' },
    info:    { bg: '#eff3ff', border: '#b5d0f0', text: '#2563eb', icon: '#2563eb' },
  };
  const c = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${c.bg};
    border: 1px solid ${c.border};
    border-radius: 8px;
    padding: 12px 16px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-family: Inter, sans-serif;
    font-size: 13px;
    color: ${c.text};
    pointer-events: all;
    opacity: 0;
    transform: translateX(12px);
    transition: all 0.2s ease;
    max-width: 360px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  `;

  toast.innerHTML = `
    <span style="font-size:15px;font-weight:600;color:${c.icon};flex-shrink:0;margin-top:1px">${ICONS[type]}</span>
    <div style="flex:1">
      <div style="line-height:1.5">${message}</div>
      ${action ? `<button id="toast-action" style="
        margin-top:6px;background:none;border:1px solid ${c.border};
        border-radius:4px;padding:3px 10px;font-size:12px;
        color:${c.text};cursor:pointer;font-family:inherit;
      ">${action.label}</button>` : ''}
    </div>
    <button style="
      background:none;border:none;cursor:pointer;
      color:${c.text};font-size:16px;line-height:1;
      padding:0 2px;opacity:0.6;flex-shrink:0;
    " aria-label="Kapat">✕</button>
  `;

  _container.appendChild(toast);

  // Aksiyon butonu
  if (action) {
    toast.querySelector('#toast-action')?.addEventListener('click', () => {
      action.fn();
      close();
    });
  }

  // Kapatma butonu
  toast.querySelector('button:last-child').addEventListener('click', close);

  // Animasyon ile göster
  requestAnimationFrame(() => {
    toast.style.opacity  = '1';
    toast.style.transform = 'translateX(0)';
  });

  let timer;
  if (duration > 0) {
    timer = setTimeout(close, duration);
  }

  function close() {
    clearTimeout(timer);
    toast.style.opacity   = '0';
    toast.style.transform = 'translateX(12px)';
    setTimeout(() => toast.remove(), 200);
  }

  return close;
}

// ─── Undo Toast (Anayasa §08 — 30 sn undo penceresi) ─────
/**
 * Silme işlemi sonrası 30 saniyelik geri alma toast'ı.
 * @param {string}   itemName   - silinen öğenin adı
 * @param {Function} onUndo     - geri alma callback'i
 * @param {string}   undoLabel  - buton etiketi
 */
export function showUndoToast(itemName, onUndo, undoLabel = 'Geri Al') {
  const duration = APP_CONFIG.undoWindowMs;
  showToast('warning', `"${itemName}" silindi.`, duration, {
    label: undoLabel,
    fn:    onUndo,
  });
}

// ─── Bağlantı Durum Toast'ları ────────────────────────────
let _offlineToastClose = null;

export function showOfflineToast(message) {
  if (_offlineToastClose) return;
  _offlineToastClose = showToast('warning', message, 0); // Kapanmaz
}

export function hideOfflineToast() {
  if (_offlineToastClose) {
    _offlineToastClose();
    _offlineToastClose = null;
  }
}
