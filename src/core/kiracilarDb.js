/**
 * @file core/kiracilarDb.js
 * @description Kiracılar CRUD + realtime listener
 * @anayasa K01 SRP · K06 soft delete · K11 workspace · K12 RBAC · K14 log
 */
import {
  collection, doc, addDoc, updateDoc, query, where, orderBy,
  onSnapshot, serverTimestamp, getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { yetkiZorunlu } from './rbac';

const COL = 'kiracilar';
const LOG = 'activity_logs';

const col = () => collection(db, COL);

async function log(workspaceId, user, action, targetId, meta = {}) {
  try {
    await addDoc(collection(db, LOG), {
      workspaceId, module: 'kiracilar', action, targetId,
      user: user?.name || 'bilinmiyor', meta, ts: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[kiracilarDb] log:', e.message);
  }
}

export function kiracilariDinle(workspaceId, callback) {
  const q = query(
    col(),
    where('workspaceId', '==', workspaceId),
    where('isDeleted', '==', false),
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, err => {
    console.error('[kiracilar] listener:', err);
    callback([]);
  });
}

export async function kiraciEkle(workspaceId, user, veri) {
  yetkiZorunlu(user, 'user');
  try {
    const ref = await addDoc(col(), {
      ...veri,
      workspaceId,
      aktif: veri.aktif ?? true,
      olusturan: user?.name || 'bilinmiyor',
      olusturulma: serverTimestamp(),
      guncellenme: serverTimestamp(),
      isDeleted: false,
      deletedAt: null,
    });
    log(workspaceId, user, 'create', ref.id, { adSoyad: veri.adSoyad });
    return ref.id;
  } catch (e) {
    console.error('[kiraciEkle]', e);
    throw new Error('Kiracı eklenemedi: ' + e.message);
  }
}

export async function kiraciGuncelle(workspaceId, user, id, veri) {
  yetkiZorunlu(user, 'user');
  try {
    await updateDoc(doc(db, COL, id), {
      ...veri,
      guncellenme: serverTimestamp(),
    });
    log(workspaceId, user, 'update', id, {});
  } catch (e) {
    console.error('[kiraciGuncelle]', e);
    throw new Error('Kiracı güncellenemedi: ' + e.message);
  }
}

export async function kiraciSil(workspaceId, user, id) {
  yetkiZorunlu(user, 'manager');
  try {
    await updateDoc(doc(db, COL, id), {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: user?.name || 'bilinmiyor',
      guncellenme: serverTimestamp(),
    });
    log(workspaceId, user, 'delete', id, {});
  } catch (e) {
    console.error('[kiraciSil]', e);
    throw new Error('Kiracı silinemedi: ' + e.message);
  }
}

export async function kiraciGeriAl(workspaceId, user, id) {
  try {
    await updateDoc(doc(db, COL, id), {
      isDeleted: false, deletedAt: null, deletedBy: null,
      guncellenme: serverTimestamp(),
    });
    log(workspaceId, user, 'undelete', id, {});
  } catch (e) {
    console.warn('[kiraciGeriAl]', e);
  }
}

export async function kiracilarListele(workspaceId) {
  try {
    const q = query(col(),
      where('workspaceId', '==', workspaceId),
      where('isDeleted', '==', false),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('[kiracilarListele]', e);
    return [];
  }
}
