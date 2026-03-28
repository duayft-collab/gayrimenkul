/**
 * src/ui/toast.js
 * Duay Global Trade Company — Property OS
 * Anayasa: K04
 * v1.0 / 2026-03-28
 */

import { APP_CONFIG } from '../../config/app-config.js';

export function showToast(msg, type = 'info', duration = APP_CONFIG.toastDuration) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast';
  if (type === 'success') el.style.background = 'var(--green)';
  if (type === 'error')   el.style.background = 'var(--red)';
  el.textContent = msg;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, duration);
}
