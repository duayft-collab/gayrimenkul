/**
 * src/core/i18n.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.0 / 2026-03-23
 *
 * TR/EN çeviri motoru.
 * - data-i18n="key" attribute'lu tüm elementleri otomatik çevirir
 * - Kullanıcı dil tercihi Firestore'a kaydedilir
 * - Sayfa yenilenmeden dil değiştirilebilir
 */

import { TR } from '../locales/tr.js';
import { EN } from '../locales/en.js';
import { APP_CONFIG } from '../../config/app-config.js';

const LOCALES = { tr: TR, en: EN };

let _currentLang = APP_CONFIG.defaultLang;

// ─── Dil Al / Ayarla ──────────────────────────────────────
export function getLang() { return _currentLang; }

/**
 * Aktif dili değiştir ve tüm sayfayı güncelle.
 * @param {'tr'|'en'} lang
 * @param {boolean} persist - Firestore'a kaydet
 */
export async function setLang(lang, persist = true) {
  if (!APP_CONFIG.supportedLangs.includes(lang)) return;
  _currentLang = lang;
  localStorage.setItem('gm_lang', lang);
  document.documentElement.setAttribute('lang', lang);
  _applyTranslations();

  if (persist) {
    try {
      const { getCurrentUser } = await import('./auth.js');
      const { updateDocById }  = await import('./database.js');
      const user = getCurrentUser();
      if (user) {
        await updateDocById(APP_CONFIG.collections.users, user.uid, { lang });
      }
    } catch (_) { /* Sessiz hata — auth yüklenmemiş olabilir */ }
  }
}

/**
 * Uygulama başlangıcında dili yükle.
 * Öncelik: localStorage → Firestore profili → varsayılan
 * @param {object|null} userProfile
 */
export function initLang(userProfile = null) {
  const stored  = localStorage.getItem('gm_lang');
  const profile = userProfile?.lang;
  _currentLang  = stored || profile || APP_CONFIG.defaultLang;
  localStorage.setItem('gm_lang', _currentLang);
  document.documentElement.setAttribute('lang', _currentLang);
  _applyTranslations();
}

// ─── Çeviri Getir ─────────────────────────────────────────
/**
 * Anahtar ile çeviri döndür. Nokta notasyonu desteklenir.
 * Örnek: t('nav.dashboard') → 'Ana Pano'
 * @param {string} key
 * @param {object} vars - şablon değişkenleri: {name: 'Ahmet'}
 * @returns {string}
 */
export function t(key, vars = {}) {
  const locale  = LOCALES[_currentLang] || LOCALES.tr;
  const value   = _deepGet(locale, key) || _deepGet(LOCALES.tr, key) || key;
  return _interpolate(value, vars);
}

// ─── DOM Uygulama ─────────────────────────────────────────
/**
 * data-i18n="key" attribute'lu tüm elementleri çevirir.
 * data-i18n-placeholder="key" → input placeholder çevirisi
 * data-i18n-title="key" → tooltip çevirisi
 */
function _applyTranslations() {
  // İçerik çevirisi
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key   = el.getAttribute('data-i18n');
    const value = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.value = value;
    } else {
      el.textContent = value;
    }
  });

  // Placeholder çevirisi
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });

  // Title (tooltip) çevirisi
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });

  // HTML attribute çevirisi (aria-label vb.)
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
  });
}

// ─── İç Yardımcılar ───────────────────────────────────────
function _deepGet(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function _interpolate(str, vars) {
  if (!vars || typeof str !== 'string') return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

// ─── Dışa Aktar ───────────────────────────────────────────
export { _applyTranslations as applyTranslations };
