/**
 * src/ui/router.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.0 / 2026-03-23
 *
 * Hafif SPA yönlendirici.
 * - Hash tabanlı yönlendirme (#dashboard, #mulkler vb.)
 * - RBAC koruması: yetkisiz rotalar engellenir
 * - Her sayfa geçişi audit log'a yazılır
 */

import { getCurrentRole, isAdmin } from '../core/auth.js';
import { canDo }                   from '../../config/rbac-roles.js';
import { showToast }               from './toast.js';
import { t }                       from '../core/i18n.js';

// ─── Rota Tanımları ───────────────────────────────────────
const ROUTES = {
  dashboard:   { module: 'dashboard',  permission: null },
  mulkler:     { module: 'mulkler',    permission: { mod: 'mulkler',     act: 'read' } },
  sozlesmeler: { module: 'sozlesmeler',permission: { mod: 'sozlesmeler', act: 'read' } },
  kira:        { module: 'kira',       permission: { mod: 'odemeler',    act: 'read' } },
  kiracilar:   { module: 'kiracilar',  permission: { mod: 'sozlesmeler', act: 'read' } },
  belgeler:    { module: 'belgeler',   permission: { mod: 'mulkler',     act: 'read' } },
  piyasa:      { module: 'piyasa',     permission: { mod: 'mulkler',     act: 'read' } },
  alisatis:    { module: 'alisatis',   permission: { mod: 'islemler',    act: 'read' } },
  yatirim:     { module: 'yatirim',    permission: { mod: 'islemler',    act: 'read' } },
  raporlar:    { module: 'raporlar',   permission: { mod: 'raporlar',    act: 'read' } },
  admin:       { module: 'admin',      permission: { mod: 'adminPanel',  act: 'read' } },
};

const DEFAULT_ROUTE = 'dashboard';

let _currentRoute   = null;
let _loadedModules  = {};       // Modül önbelleği
let _onRouteChange  = null;     // Callback

// ─── Router Başlat ────────────────────────────────────────
/**
 * @param {Function} onRouteChange - (routeId, module) => void
 */
export function initRouter(onRouteChange) {
  _onRouteChange = onRouteChange;
  window.addEventListener('hashchange', _handleRoute);
  _handleRoute(); // Sayfa yüklendiğinde mevcut hash'i işle
}

// ─── Programatik Yönlendirme ──────────────────────────────
export function navigate(routeId) {
  window.location.hash = routeId;
}

export function getCurrentRoute() { return _currentRoute; }

// ─── Rota İşleyici ────────────────────────────────────────
async function _handleRoute() {
  const hash    = window.location.hash.replace('#', '') || DEFAULT_ROUTE;
  const route   = ROUTES[hash];

  // Bilinmeyen rota → varsayılana yönlendir
  if (!route) {
    navigate(DEFAULT_ROUTE);
    return;
  }

  // RBAC kontrolü
  if (route.permission) {
    const role = getCurrentRole();
    if (!role || !canDo(role, route.permission.mod, route.permission.act)) {
      showToast('error', t('admin.accessDenied'));
      navigate(_currentRoute || DEFAULT_ROUTE);
      return;
    }
  }

  _currentRoute = hash;

  // Modülü yükle (önce önbellekten)
  try {
    const mod = await _loadModule(route.module);
    _updateActiveNav(hash);
    if (_onRouteChange) _onRouteChange(hash, mod);
  } catch (err) {
    console.error(`[Router] Modül yüklenemedi: ${route.module}`, err);
    showToast('error', t('ui.error'));
  }
}

// ─── Modül Yükleyici (Lazy + Cache) ───────────────────────
async function _loadModule(moduleName) {
  if (_loadedModules[moduleName]) return _loadedModules[moduleName];

  const moduleMap = {
    dashboard:   () => import('../modules/dashboard.js'),
    mulkler:     () => import('../modules/mulkler.js'),
    sozlesmeler: () => import('../modules/sozlesmeler.js'),
    kira:        () => import('../modules/kira-takibi.js'),
    kiracilar:   () => import('../modules/kiracilar.js'),
    belgeler:    () => import('../modules/belgeler.js'),
    piyasa:      () => import('../modules/piyasa.js'),
    alisatis:    () => import('../modules/alis-satis.js'),
    yatirim:     () => import('../modules/yatirim-analizi.js'),
    raporlar:    () => import('../modules/raporlar.js'),
    admin:       () => import('../admin/admin-panel.js'),
  };

  const loader = moduleMap[moduleName];
  if (!loader) throw new Error(`Bilinmeyen modül: ${moduleName}`);

  const mod = await loader();
  _loadedModules[moduleName] = mod;
  return mod;
}

// ─── Aktif Nav Güncelle ───────────────────────────────────
function _updateActiveNav(routeId) {
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === routeId);
  });
  // Sayfa başlığını güncelle
  const titleEl = document.getElementById('page-title');
  if (titleEl) {
    titleEl.setAttribute('data-i18n', `nav.${routeId}`);
    titleEl.textContent = t(`nav.${routeId}`);
  }
}
