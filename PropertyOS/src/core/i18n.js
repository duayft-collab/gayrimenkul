/**
 * src/core/i18n.js
 * Duay Global Trade Company — Property OS
 * Anayasa: K13
 * v1.0 / 2026-03-28
 */

import { TR } from '../locales/tr.js';
import { EN } from '../locales/en.js';

const LOCALES = { tr: TR, en: EN };
let _lang = localStorage.getItem('pos_lang') || 'tr';

export function t(path) {
  const keys   = path.split('.');
  let   node   = LOCALES[_lang] || TR;
  for (const k of keys) {
    if (node == null) return path;
    node = node[k];
  }
  return node ?? path;
}

export function getLang()    { return _lang; }
export function setLang(lng) {
  _lang = lng;
  localStorage.setItem('pos_lang', lng);
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}
