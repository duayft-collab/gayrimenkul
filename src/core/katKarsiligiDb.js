/**
 * @file core/katKarsiligiDb.js
 * @description Kat Karşılığı fizibilite hesapları — Firestore CRUD
 * @anayasa K01 try/catch, K06 soft delete, K10 kuruş, K11 workspace, K14 log
 */
import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const COL = 'katKarsiligiHesaplari';
const LOG = 'activity_logs';

const col = () => collection(db, COL);

async function log(workspaceId, user, action, targetId, meta = {}) {
  try {
    await addDoc(collection(db, LOG), {
      workspaceId,
      module: 'katKarsiligi',
      action,
      targetId,
      user: user || 'bilinmiyor',
      meta,
      ts: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[katKarsiligiDb] log hatası:', e.message);
  }
}

/** Yeni hesap kaydet */
export async function hesapKaydet(workspaceId, user, veri) {
  try {
    const ref = await addDoc(col(), {
      ...veri,
      workspaceId,
      olusturan: user || 'bilinmiyor',
      olusturulma: serverTimestamp(),
      guncellenme: serverTimestamp(),
      isDeleted: false,
      deletedAt: null,
    });
    await log(workspaceId, user, 'create', ref.id, { ad: veri.ad });
    return ref.id;
  } catch (e) {
    console.error('[hesapKaydet]', e);
    throw new Error('Hesap kaydedilemedi: ' + e.message);
  }
}

/** Var olan hesabı güncelle */
export async function hesapGuncelle(workspaceId, user, id, veri) {
  try {
    await updateDoc(doc(db, COL, id), {
      ...veri,
      guncellenme: serverTimestamp(),
    });
    await log(workspaceId, user, 'update', id, {});
  } catch (e) {
    console.error('[hesapGuncelle]', e);
    throw new Error('Hesap güncellenemedi: ' + e.message);
  }
}

/** Tek bir hesabı yükle */
export async function hesapYukle(id) {
  try {
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (e) {
    console.error('[hesapYukle]', e);
    throw new Error('Hesap yüklenemedi: ' + e.message);
  }
}

/** Workspace içindeki tüm hesapları listele */
export async function hesapListele(workspaceId) {
  try {
    const q = query(
      col(),
      where('workspaceId', '==', workspaceId),
      where('isDeleted', '==', false),
      orderBy('guncellenme', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    // orderBy + where composite index eksikse fallback
    console.warn('[hesapListele] composite index fallback:', e.message);
    try {
      const q2 = query(
        col(),
        where('workspaceId', '==', workspaceId),
        where('isDeleted', '==', false)
      );
      const snap = await getDocs(q2);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e2) {
      console.error('[hesapListele]', e2);
      throw new Error('Liste yüklenemedi: ' + e2.message);
    }
  }
}

/** Soft delete */
export async function hesapSil(workspaceId, user, id) {
  try {
    await updateDoc(doc(db, COL, id), {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: user || 'bilinmiyor',
      guncellenme: serverTimestamp(),
    });
    await log(workspaceId, user, 'delete', id, {});
  } catch (e) {
    console.error('[hesapSil]', e);
    throw new Error('Hesap silinemedi: ' + e.message);
  }
}

/** Silme geri al (30sn undo) */
export async function hesapGeriAl(workspaceId, user, id) {
  try {
    await updateDoc(doc(db, COL, id), {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      guncellenme: serverTimestamp(),
    });
    await log(workspaceId, user, 'undelete', id, {});
  } catch (e) {
    console.error('[hesapGeriAl]', e);
  }
}
