/**
 * rbac-roles.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.0 / 2026-03-23
 *
 * Rol tabanlı erişim kontrol matrisi.
 * Her modül için izin tanımları bu dosyada merkezi tutulur.
 * Yeni modül eklendiğinde yalnızca bu dosya güncellenir.
 */

import { APP_CONFIG } from './app-config.js';

const { ADMIN, MANAGER, VIEWER } = APP_CONFIG.roles;

// ─── İzin Matrisi ─────────────────────────────────────────
// true  → bu rol bu işlemi yapabilir
// false → yasak, UI'da gizlenir + backend rule ile bloke edilir
export const PERMISSIONS = {

  // Mülkler modülü
  mulkler: {
    read:   [ADMIN, MANAGER, VIEWER],
    create: [ADMIN, MANAGER],
    update: [ADMIN, MANAGER],
    delete: [ADMIN],          // Soft delete — sadece admin
  },

  // Sözleşmeler modülü
  sozlesmeler: {
    read:   [ADMIN, MANAGER, VIEWER],
    create: [ADMIN, MANAGER],
    update: [ADMIN, MANAGER],
    delete: [ADMIN],
  },

  // Kira Takibi modülü
  odemeler: {
    read:   [ADMIN, MANAGER, VIEWER],
    create: [ADMIN, MANAGER],
    update: [ADMIN, MANAGER],
    delete: [ADMIN],
  },

  // Alım-Satım modülü
  islemler: {
    read:   [ADMIN, MANAGER, VIEWER],
    create: [ADMIN, MANAGER],
    update: [ADMIN, MANAGER],
    delete: [ADMIN],
  },

  // Raporlar
  raporlar: {
    read:   [ADMIN, MANAGER, VIEWER],
    export: [ADMIN, MANAGER],
  },

  // Admin Paneli — sadece admin
  adminPanel: {
    read:         [ADMIN],
    manageUsers:  [ADMIN],
    viewAuditLog: [ADMIN],
    backup:       [ADMIN],
    restore:      [ADMIN],
  },
};

// ─── İzin Kontrol Fonksiyonu ──────────────────────────────
/**
 * Kullanıcının belirli bir işlemi yapma yetkisi var mı?
 * @param {string} userRole   - 'admin' | 'manager' | 'viewer'
 * @param {string} module     - 'mulkler' | 'sozlesmeler' vb.
 * @param {string} action     - 'read' | 'create' | 'update' | 'delete'
 * @returns {boolean}
 */
export function canDo(userRole, module, action) {
  const modulePerms = PERMISSIONS[module];
  if (!modulePerms) return false;
  const allowedRoles = modulePerms[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(userRole);
}

// ─── UI Gizleme Yardımcısı ────────────────────────────────
/**
 * Yetkisiz kullanıcıdan HTML elementini gizler.
 * @param {string} userRole
 * @param {string} module
 * @param {string} action
 * @param {HTMLElement} el
 */
export function guardElement(userRole, module, action, el) {
  if (!canDo(userRole, module, action)) {
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');
  }
}

// ─── Rol Hiyerarşisi ──────────────────────────────────────
export const ROLE_HIERARCHY = {
  [ADMIN]:   3,
  [MANAGER]: 2,
  [VIEWER]:  1,
};

/**
 * A rolü B rolünden daha mı yetkili?
 * @param {string} roleA
 * @param {string} roleB
 * @returns {boolean}
 */
export function isHigherRole(roleA, roleB) {
  return (ROLE_HIERARCHY[roleA] || 0) > (ROLE_HIERARCHY[roleB] || 0);
}
