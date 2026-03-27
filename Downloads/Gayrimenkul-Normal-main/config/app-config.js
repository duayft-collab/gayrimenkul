/**
 * app-config.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.0 / 2026-03-23
 *
 * Uygulama genelinde kullanılan sabitler ve versiyon bilgisi.
 * Bu dosya dışında versiyon numarası tanımlanamaz.
 */

export const APP_CONFIG = {
  // ─── Versiyon (Anayasa §07 — Statik Versiyonlama) ────
  version:     'v1.0',
  buildDate:   '2026-03-23',
  buildTime:   '00:00',
  versionFull: 'v1.0 / 2026-03-23',
  company:     'Duay Global Trade Company',
  email:       'info@duaycor.com',

  // ─── Koleksiyon İsimleri (tek kaynak) ────────────────
  collections: {
    users:      'users',
    mulkler:    'mulkler',
    sozlesmeler:'sozlesmeler',
    odemeler:   'odemeler',
    islemler:   'islemler',
    auditLogs:  'audit_logs',
    kiracilar:  'kiracilar',
    belgeler:   'belgeler',
    feedback:   'feedback',
  },

  // ─── RBAC Rolleri ─────────────────────────────────────
  roles: {
    ADMIN:   'admin',
    MANAGER: 'manager',
    VIEWER:  'viewer',
  },

  // ─── Kullanıcı Durumları ──────────────────────────────
  userStatus: {
    ACTIVE:    'active',
    SUSPENDED: 'suspended',
    PENDING:   'pending',
  },

  // ─── Mülk Türleri ─────────────────────────────────────
  mulkTurleri: ['Konut', 'Ticari', 'Arsa', 'Bina'],

  // ─── Mülk Durumları ───────────────────────────────────
  mulkDurumlari: ['Boş', 'Kirada', 'Satılık', 'Satıldı'],

  // ─── Sözleşme Türleri ─────────────────────────────────
  sozlesmeTurleri: ['Kira', 'Satış'],

  // ─── Ödeme Durumları ──────────────────────────────────
  odemeDurumlari: ['Ödendi', 'Gecikmiş', 'Bekliyor'],

  // ─── UI Ayarları ──────────────────────────────────────
  defaultLang:  'tr',
  defaultTheme: 'light',
  supportedLangs: ['tr', 'en'],

  // ─── Soft Delete — Admin geri alma penceresi (ms) ─────
  undoWindowMs: 30000,

  // ─── Pagination ───────────────────────────────────────
  pageSize: 20,

  // ─── Toast süresi (ms) ────────────────────────────────
  toastDuration: 3000,
};
