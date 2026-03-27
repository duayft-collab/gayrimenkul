/**
 * src/ui/theme-toggle.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.0 / 2026-03-23
 *
 * Dark / Light mod yönetimi.
 * - data-theme="dark|light" HTML root attribute üzerinden çalışır
 * - Kullanıcı tercihi localStorage ve Firestore'a kaydedilir
 * - Sistem tercihini (prefers-color-scheme) algılar
 */

import { APP_CONFIG } from '../../config/app-config.js';

let _currentTheme = APP_CONFIG.defaultTheme;

// ─── Başlangıç ────────────────────────────────────────────
/**
 * Uygulama başlangıcında temayı yükle.
 * Öncelik: localStorage → Firestore profili → sistem tercihi → varsayılan
 * @param {object|null} userProfile
 */
export function initTheme(userProfile = null) {
  const stored  = localStorage.getItem('gm_theme');
  const profile = userProfile?.theme;
  const system  = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  _currentTheme = stored || profile || system || APP_CONFIG.defaultTheme;
  _apply(_currentTheme);

  // Sistem teması değişirse otomatik güncelle (eğer kullanıcı seçim yapmamışsa)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('gm_theme')) {
      _apply(e.matches ? 'dark' : 'light');
    }
  });
}

// ─── Tema Değiştir ────────────────────────────────────────
/**
 * @param {'dark'|'light'} theme
 * @param {boolean} persist - Firestore'a kaydet
 */
export async function setTheme(theme, persist = true) {
  _currentTheme = theme;
  _apply(theme);
  localStorage.setItem('gm_theme', theme);

  if (persist) {
    try {
      const { getCurrentUser } = await import('../core/auth.js');
      const { updateDocById }  = await import('../core/database.js');
      const user = getCurrentUser();
      if (user) {
        await updateDocById(APP_CONFIG.collections.users, user.uid, { theme });
      }
    } catch (_) { /* Sessiz hata */ }
  }

  // Toggle butonlarını güncelle
  _updateToggleButtons(theme);
}

// ─── Toggle ───────────────────────────────────────────────
export function toggleTheme() {
  setTheme(_currentTheme === 'dark' ? 'light' : 'dark');
}

export function getTheme() { return _currentTheme; }
export function isDark()   { return _currentTheme === 'dark'; }

// ─── DOM Uygulama ─────────────────────────────────────────
function _apply(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  // Meta theme-color (mobil tarayıcı başlık rengi)
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.content = theme === 'dark' ? '#1a1a1a' : '#ffffff';
  }
}

function _updateToggleButtons(theme) {
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
    const iconEl = btn.querySelector('[data-theme-icon]');
    if (iconEl) iconEl.textContent = theme === 'dark' ? '☀' : '☾';
    const labelEl = btn.querySelector('[data-theme-label]');
    if (labelEl) {
      const { t } = require('../core/i18n.js');
      labelEl.textContent = theme === 'dark' ? t('ui.lightMode') : t('ui.darkMode');
    }
  });
}
