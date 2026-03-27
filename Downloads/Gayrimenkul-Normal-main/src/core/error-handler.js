/**
 * src/core/error-handler.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.0 / 2026-03-23
 *
 * Merkezi hata yönetim sistemi.
 * - Firebase hata kodlarını Türkçe/İngilizce mesajlara çevirir
 * - Tüm hatalar konsola ve isteğe bağlı olarak log'a yazılır
 * - Kullanıcıya anlamlı toast mesajı gösterilir
 */

import { showToast }  from '../ui/toast.js';
import { getLang }    from '../core/i18n.js';

// ─── Firebase → Kullanıcı Dostu Mesaj Haritası ────────────
const ERROR_MESSAGES = {
  tr: {
    // Auth hataları
    'auth/user-not-found':       'Bu e-posta adresi kayıtlı değil.',
    'auth/wrong-password':       'Şifre hatalı. Lütfen tekrar deneyin.',
    'auth/invalid-email':        'Geçersiz e-posta formatı.',
    'auth/too-many-requests':    'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.',
    'auth/user-disabled':        'Bu hesap devre dışı bırakılmıştır.',
    'auth/email-already-in-use': 'Bu e-posta adresi zaten kullanılıyor.',
    'auth/weak-password':        'Şifre en az 6 karakter olmalıdır.',
    'auth/network-request-failed': 'İnternet bağlantısı yok. Çevrimdışı moddasınız.',
    'auth/popup-closed-by-user': 'Giriş penceresi kapatıldı.',
    'auth/invalid-credential':   'E-posta veya şifre hatalı.',

    // Firestore hataları
    'permission-denied':         'Bu işlem için yetkiniz yok.',
    'not-found':                 'Kayıt bulunamadı.',
    'already-exists':            'Bu kayıt zaten mevcut.',
    'resource-exhausted':        'Sunucu kapasitesi aşıldı. Lütfen bekleyin.',
    'unavailable':               'Sunucuya ulaşılamıyor. Çevrimdışı moddasınız.',
    'deadline-exceeded':         'İstek zaman aşımına uğradı.',
    'cancelled':                 'İşlem iptal edildi.',

    // Uygulama hataları
    'AUTH/NOT_LOGGED_IN':        'Oturum süresi doldu. Lütfen tekrar giriş yapın.',
    'AUTH/FORBIDDEN':            'Bu işlem için yetkiniz yok.',
    'AUTH/SUSPENDED':            'Hesabınız askıya alınmıştır. Yönetici ile iletişime geçin.',
    'AUTH/PROFILE_NOT_FOUND':    'Kullanıcı profili bulunamadı.',
    'DB/DOC_NOT_FOUND':          'Kayıt bulunamadı veya silinmiş.',

    // Genel
    default: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
  },
  en: {
    'auth/user-not-found':       'This email address is not registered.',
    'auth/wrong-password':       'Incorrect password. Please try again.',
    'auth/invalid-email':        'Invalid email format.',
    'auth/too-many-requests':    'Too many failed attempts. Please try again later.',
    'auth/user-disabled':        'This account has been disabled.',
    'auth/email-already-in-use': 'This email address is already in use.',
    'auth/weak-password':        'Password must be at least 6 characters.',
    'auth/network-request-failed': 'No internet connection. You are in offline mode.',
    'auth/invalid-credential':   'Incorrect email or password.',
    'permission-denied':         'You do not have permission for this action.',
    'not-found':                 'Record not found.',
    'already-exists':            'This record already exists.',
    'unavailable':               'Server unavailable. You are in offline mode.',
    'AUTH/NOT_LOGGED_IN':        'Session expired. Please log in again.',
    'AUTH/FORBIDDEN':            'You do not have permission for this action.',
    'AUTH/SUSPENDED':            'Your account has been suspended. Contact your administrator.',
    'AUTH/PROFILE_NOT_FOUND':    'User profile not found.',
    'DB/DOC_NOT_FOUND':          'Record not found or has been deleted.',
    default: 'An unexpected error occurred. Please try again.',
  },
};

// ─── Ana Hata İşleyici ────────────────────────────────────
/**
 * Tüm hataları bu fonksiyona gönder.
 * @param {Error}  err      - yakalanan hata nesnesi
 * @param {string} context  - hatanın nereden geldiği (log için)
 * @param {boolean} silent  - true ise toast gösterme
 */
export function handleError(err, context = 'unknown', silent = false) {
  const code    = err?.code || err?.message || 'default';
  const lang    = getLang();
  const messages = ERROR_MESSAGES[lang] || ERROR_MESSAGES.tr;
  const message = messages[code] || messages.default;

  // Konsol logu (geliştirme ortamı)
  console.error(`[ERROR][${context}] code=${code}`, err);

  // Kullanıcıya göster
  if (!silent) {
    showToast('error', message);
  }

  // Oturum sona erdiyse giriş sayfasına yönlendir
  if (code === 'AUTH/NOT_LOGGED_IN' || code === 'auth/user-not-found') {
    setTimeout(() => {
      window.location.href = '/pages/index.html';
    }, 1500);
  }

  return message;
}

// ─── Promise Zinciri için Sarmalayıcı ─────────────────────
/**
 * async fonksiyonu try/catch olmadan güvenli çalıştır.
 * @param {Function} fn
 * @param {string}   context
 * @returns {Promise<any>}
 */
export async function safeRun(fn, context = 'safeRun') {
  try {
    return await fn();
  } catch (err) {
    handleError(err, context);
    return null;
  }
}

// ─── Global Window Hata Yakalayıcı ────────────────────────
// Yakalanmayan hatalar için son savunma hattı
window.addEventListener('unhandledrejection', (event) => {
  handleError(event.reason, 'unhandledRejection');
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.error('[GLOBAL ERROR]', event.error);
});
