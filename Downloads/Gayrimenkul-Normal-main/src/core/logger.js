/**
 * src/core/logger.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.0 / 2026-03-23
 *
 * Denetim logu (Audit Log) sistemi.
 * Tüm kullanıcı hareketleri Firestore audit_logs koleksiyonuna yazılır.
 * Bu koleksiyon yalnızca okunabilir — güncelleme ve silme yasaktır.
 * (Firestore Rules ile korunur)
 */

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { db }           from '../../config/firebase-config.js';
import { APP_CONFIG }   from '../../config/app-config.js';

const { collections } = APP_CONFIG;

// ─── Log Aksiyonu Yazma ───────────────────────────────────
/**
 * Firestore audit_logs koleksiyonuna yeni satır ekler.
 * Hata olursa sessizce başarısız olur — ana işlemi bloke etmez.
 *
 * @param {string} action     - 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE' | ...
 * @param {string} col        - etkilenen koleksiyon adı
 * @param {string} docId      - etkilenen belge ID
 * @param {object|null} before - değişim öncesi veri snapshot
 * @param {object|null} after  - değişim sonrası veri snapshot
 */
export async function logAction(action, col, docId, before = null, after = null) {
  try {
    // Mevcut kullanıcıyı dinamik al (circular import önlemek için)
    const { getCurrentUser } = await import('./auth.js');
    const user = getCurrentUser();

    // PII maskeleme — şifreler ve hassas alanlar loglanmaz
    const sanitized = {
      before: _sanitize(before),
      after:  _sanitize(after),
    };

    await addDoc(collection(db, collections.auditLogs), {
      uid:        user?.uid   || 'system',
      email:      user?.email ? _maskEmail(user.email) : 'system',
      action,
      collection: col,
      docId:      docId || null,
      before:     sanitized.before,
      after:      sanitized.after,
      timestamp:  serverTimestamp(),
      userAgent:  navigator.userAgent.substring(0, 200),
    });
  } catch (err) {
    // Log hatası ana işlemi durdurmamalı
    console.warn('[Logger] Log yazılamadı:', err);
  }
}

// ─── Log Listesi Getir (Admin) ────────────────────────────
/**
 * Son N adet log kaydını getirir.
 * Yalnızca Admin rolündeki kullanıcılar çağırabilir.
 * @param {number} limitCount
 * @param {string|null} filterUid - belirli kullanıcı filtresi
 * @returns {Promise<Array>}
 */
export async function getAuditLogs(limitCount = 100, filterUid = null) {
  try {
    const constraints = [
      orderBy('timestamp', 'desc'),
      limit(limitCount),
    ];
    if (filterUid) constraints.unshift(where('uid', '==', filterUid));
    const q    = query(collection(db, collections.auditLogs), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[Logger] Log okunamadı:', err);
    return [];
  }
}

// ─── Yardımcı Fonksiyonlar ────────────────────────────────

/**
 * Hassas alanları logdan temizler (Anayasa §08 — PII Maskeleme)
 * @param {object|null} data
 * @returns {object|null}
 */
function _sanitize(data) {
  if (!data) return null;
  const sensitive = ['password', 'sifre', 'tcNo', 'tc_no', 'telefon', 'phone', 'token'];
  const clean = { ...data };
  sensitive.forEach(key => {
    if (clean[key] !== undefined) clean[key] = '***MASKED***';
  });
  return clean;
}

/**
 * E-posta maskele: ahmet@domain.com → a***@domain.com
 * @param {string} email
 * @returns {string}
 */
function _maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return local.charAt(0) + '***@' + domain;
}

// ─── Kısa Log Yardımcıları ────────────────────────────────
export const logLogin    = (uid) => logAction('LOGIN',    'users', uid, null, null);
export const logLogout   = (uid) => logAction('LOGOUT',   'users', uid, null, null);
export const logCreate   = (col, id, data)    => logAction('CREATE', col, id, null, data);
export const logUpdate   = (col, id, b, a)    => logAction('UPDATE', col, id, b,    a);
export const logDelete   = (col, id, before)  => logAction('DELETE', col, id, before, null);
export const logExport   = (col)              => logAction('EXPORT', col, null, null, null);
