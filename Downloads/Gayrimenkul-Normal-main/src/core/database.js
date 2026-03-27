/**
 * src/core/database.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.0 / 2026-03-23
 *
 * Firestore CRUD katmanı.
 * - Tüm sorgular ownerUid filtresi ile çalışır (multi-tenant izolasyon)
 * - Silme işlemleri fiziksel değil, soft-delete yapar
 * - Tüm yazma işlemleri audit log'a kaydedilir
 * - Offline-First: enableIndexedDbPersistence firebase-config.js'de aktif
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { db }              from '../../config/firebase-config.js';
import { APP_CONFIG }      from '../../config/app-config.js';
import { getCurrentUser }  from './auth.js';
import { logAction }       from './logger.js';
import { handleError }     from './error-handler.js';

const { collections, pageSize } = APP_CONFIG;

// ══════════════════════════════════════════════════════════
//  TEMEL CRUD — Tüm koleksiyonlar için genel fonksiyonlar
// ══════════════════════════════════════════════════════════

/**
 * Koleksiyona yeni belge ekle.
 * ownerUid otomatik eklenir — dışarıdan geçilemez.
 * @param {string} collectionName
 * @param {object} data
 * @returns {Promise<string>} docId
 */
export async function createDoc(collectionName, data) {
  try {
    const uid = _requireUid();
    const payload = {
      ...data,
      ownerUid:  uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    };
    const ref   = await addDoc(collection(db, collectionName), payload);
    await logAction('CREATE', collectionName, ref.id, null, payload);
    return ref.id;
  } catch (err) {
    handleError(err, `createDoc:${collectionName}`);
    throw err;
  }
}

/**
 * Belgeyi güncelle.
 * Yalnızca ownerUid eşleşen belgeler güncellenebilir.
 * @param {string} collectionName
 * @param {string} docId
 * @param {object} updates
 */
export async function updateDocById(collectionName, docId, updates) {
  try {
    const uid  = _requireUid();
    const ref  = doc(db, collectionName, docId);
    const snap = await getDoc(ref);
    _assertOwner(snap, uid);

    const before  = snap.data();
    const payload = { ...updates, updatedAt: serverTimestamp() };
    await updateDoc(ref, payload);
    await logAction('UPDATE', collectionName, docId, before, payload);
  } catch (err) {
    handleError(err, `updateDoc:${collectionName}:${docId}`);
    throw err;
  }
}

/**
 * Soft-delete — fiziksel silme yasak (Anayasa §08)
 * isDeleted: true + deletedAt + deletedBy eklenir.
 * @param {string} collectionName
 * @param {string} docId
 */
export async function softDelete(collectionName, docId) {
  try {
    const uid  = _requireUid();
    const ref  = doc(db, collectionName, docId);
    const snap = await getDoc(ref);
    _assertOwner(snap, uid);

    const before = snap.data();
    const payload = {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: uid,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(ref, payload);
    await logAction('DELETE', collectionName, docId, before, payload);
    return before; // Undo için önceki veriyi döndür
  } catch (err) {
    handleError(err, `softDelete:${collectionName}:${docId}`);
    throw err;
  }
}

/**
 * Soft-delete geri al (Anayasa §08 — 30 saniyelik undo penceresi)
 * @param {string} collectionName
 * @param {string} docId
 * @param {object} previousData - softDelete'den dönen before verisi
 */
export async function undoDelete(collectionName, docId, previousData) {
  try {
    const uid = _requireUid();
    const ref = doc(db, collectionName, docId);
    await updateDoc(ref, {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      updatedAt: serverTimestamp(),
    });
    await logAction('UNDO_DELETE', collectionName, docId, null, previousData);
  } catch (err) {
    handleError(err, `undoDelete:${collectionName}:${docId}`);
    throw err;
  }
}

/**
 * Tek belge getir (ownerUid kontrolü ile)
 * @param {string} collectionName
 * @param {string} docId
 * @returns {Promise<object|null>}
 */
export async function getDocById(collectionName, docId) {
  try {
    const uid  = _requireUid();
    const snap = await getDoc(doc(db, collectionName, docId));
    if (!snap.exists()) return null;
    _assertOwner(snap, uid);
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    handleError(err, `getDoc:${collectionName}:${docId}`);
    throw err;
  }
}

// ══════════════════════════════════════════════════════════
//  LİSTE SORGULARI — Sayfalama + Multi-Tenant Filtre
// ══════════════════════════════════════════════════════════

/**
 * Koleksiyondaki kullanıcıya ait belgeler (silinmemişler)
 * @param {string} collectionName
 * @param {Array}  extraFilters  - ek where() koşulları [{field, op, value}]
 * @param {string} orderField    - sıralama alanı
 * @param {DocumentSnapshot} lastDoc - sayfalama için son belge
 * @returns {Promise<Array>}
 */
export async function listDocs(
  collectionName,
  extraFilters = [],
  orderField   = 'createdAt',
  lastDoc      = null
) {
  try {
    const uid = _requireUid();

    // Temel filtreler: ownerUid + silinmemiş
    let constraints = [
      where('ownerUid', '==', uid),
      where('isDeleted', '==', false),
      ...extraFilters.map(f => where(f.field, f.op, f.value)),
      orderBy(orderField, 'desc'),
      limit(pageSize),
    ];
    if (lastDoc) constraints.push(startAfter(lastDoc));

    const q    = query(collection(db, collectionName), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data(), _snap: d }));
  } catch (err) {
    handleError(err, `listDocs:${collectionName}`);
    throw err;
  }
}

/**
 * Gerçek zamanlı dinleyici — veri değiştiğinde callback çağrılır.
 * @param {string}   collectionName
 * @param {Function} callback  - (docs) => void
 * @param {Array}    extraFilters
 * @returns {Function} unsubscribe
 */
export function subscribeDocs(collectionName, callback, extraFilters = []) {
  const uid = _requireUid();
  const constraints = [
    where('ownerUid', '==', uid),
    where('isDeleted', '==', false),
    ...extraFilters.map(f => where(f.field, f.op, f.value)),
    orderBy('createdAt', 'desc'),
  ];
  const q = query(collection(db, collectionName), ...constraints);
  return onSnapshot(q, (snap) => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(docs);
  }, (err) => handleError(err, `subscribe:${collectionName}`));
}

// ══════════════════════════════════════════════════════════
//  KOLEKSIYON BAZLI YARDIMCILAR
// ══════════════════════════════════════════════════════════

// ── Mülkler ───────────────────────────────────────────────
export const getMulkler       = (f, o, l) => listDocs(collections.mulkler, f, o, l);
export const getMulk          = (id)       => getDocById(collections.mulkler, id);
export const createMulk       = (data)     => createDoc(collections.mulkler, data);
export const updateMulk       = (id, data) => updateDocById(collections.mulkler, id, data);
export const deleteMulk       = (id)       => softDelete(collections.mulkler, id);
export const subscribeMulkler = (cb)       => subscribeDocs(collections.mulkler, cb);

// ── Sözleşmeler ───────────────────────────────────────────
export const getSozlesmeler       = (f, o, l) => listDocs(collections.sozlesmeler, f, o, l);
export const getSozlesme          = (id)       => getDocById(collections.sozlesmeler, id);
export const createSozlesme       = (data)     => createDoc(collections.sozlesmeler, data);
export const updateSozlesme       = (id, data) => updateDocById(collections.sozlesmeler, id, data);
export const deleteSozlesme       = (id)       => softDelete(collections.sozlesmeler, id);

// ── Ödemeler ──────────────────────────────────────────────
export const getOdemeler       = (f, o, l) => listDocs(collections.odemeler, f, o, l);
export const createOdeme       = (data)     => createDoc(collections.odemeler, data);
export const updateOdeme       = (id, data) => updateDocById(collections.odemeler, id, data);
export const deleteOdeme       = (id)       => softDelete(collections.odemeler, id);

// ── İşlemler (Alım-Satım) ─────────────────────────────────
export const getIslemler       = (f, o, l) => listDocs(collections.islemler, f, o, l);
export const createIslem       = (data)     => createDoc(collections.islemler, data);
export const updateIslem       = (id, data) => updateDocById(collections.islemler, id, data);
export const deleteIslem       = (id)       => softDelete(collections.islemler, id);

// ══════════════════════════════════════════════════════════
//  ÖZEL SORGULAR
// ══════════════════════════════════════════════════════════

/**
 * Belirli dönemdeki ödemeleri getir
 * @param {string} donem — 'YYYY-MM'
 */
export async function getOdemelerByDonem(donem) {
  return listDocs(collections.odemeler, [{ field: 'donem', op: '==', value: donem }]);
}

/**
 * Bir mülke ait tüm sözleşmeleri getir
 * @param {string} mulkId
 */
export async function getSozlesmelerByMulk(mulkId) {
  return listDocs(collections.sozlesmeler, [{ field: 'mulkId', op: '==', value: mulkId }]);
}

// ══════════════════════════════════════════════════════════
//  İÇ YARDIMCILAR
// ══════════════════════════════════════════════════════════

function _requireUid() {
  const user = getCurrentUser();
  if (!user) throw new Error('AUTH/NOT_LOGGED_IN');
  return user.uid;
}

function _assertOwner(snap, uid) {
  if (!snap.exists()) throw new Error('DB/DOC_NOT_FOUND');
  const data = snap.data();
  // Admin tüm verilere erişebilir — diğerleri sadece kendi verisine
  const { getCurrentProfile } = require('./auth.js');
  const profile = getCurrentProfile();
  if (profile?.role !== APP_CONFIG.roles.ADMIN && data.ownerUid !== uid) {
    throw new Error('AUTH/FORBIDDEN — veri sahibi değilsiniz');
  }
}
