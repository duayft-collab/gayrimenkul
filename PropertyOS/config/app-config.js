/**
 * config/app-config.js
 * Duay Global Trade Company — Property OS
 * Anayasa: K09
 * v1.0 / 2026-03-28
 */

export const APP_CONFIG = Object.freeze({
  version:     'v1.0',
  buildDate:   '2026-03-28',
  company:     'Duay Global Trade Company',
  email:       'info@duaycor.com',

  collections: {
    users:    'pos_users',
    mulkler:  'pos_mulkler',
    kiralar:  'pos_kiralar',
    belgeler: 'pos_belgeler',
    logs:     'pos_logs',
  },

  roles: { ADMIN: 'admin', USER: 'user' },

  defaultLang:    'tr',
  defaultTheme:   'light',
  undoWindowMs:   30000,
  toastDuration:  3000,
});
