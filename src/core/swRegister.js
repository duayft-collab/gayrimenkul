/**
 * @file core/swRegister.js
 * @description Service Worker kayıt + güncelleme kontrolü
 */

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  // Vite base: /Gayrimenkul/
  const base = import.meta.env.BASE_URL || '/';
  const swUrl = base + 'service-worker.js';
  return navigator.serviceWorker.register(swUrl, { scope: base })
    .then(reg => {
      console.log('[SW] kaydedildi:', reg.scope);
      // Güncelleme kontrolü
      reg.addEventListener('updatefound', () => {
        const yeni = reg.installing;
        if (yeni) {
          yeni.addEventListener('statechange', () => {
            if (yeni.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] yeni sürüm hazır, yenile');
            }
          });
        }
      });
      return reg;
    })
    .catch(err => {
      console.warn('[SW] kayıt hatası:', err.message);
      return null;
    });
}

/** Online/offline durum hook'u gibi davranır */
export function watchOnline(callback) {
  const on = () => callback(true);
  const off = () => callback(false);
  window.addEventListener('online', on);
  window.addEventListener('offline', off);
  callback(navigator.onLine);
  return () => {
    window.removeEventListener('online', on);
    window.removeEventListener('offline', off);
  };
}
