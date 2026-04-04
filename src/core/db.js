import {
  collection, doc, getDocs, addDoc, updateDoc,
  deleteDoc, onSnapshot, query, where, orderBy,
  serverTimestamp, writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

/* Koleksiyon adları */
export const COL = Object.freeze({
  MULKLER:  'mulkler',
  KIRALAR:  'kiralar',
  ALARMLAR: 'alarmlar',
  LOGLAR:   'activity_logs',
});

/* Mülkler */
export const mulklerCol  = () => collection(db, COL.MULKLER);
export const kiralarCol  = () => collection(db, COL.KIRALAR);
export const alarmlarCol = () => collection(db, COL.ALARMLAR);

/** Workspace filtreli realtime listener */
export function mulkleriDinle(workspaceId, callback) {
  const q = query(
    mulklerCol(),
    where('workspaceId', '==', workspaceId),
    where('isDeleted', '==', false),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

export function kiralarDinle(workspaceId, callback) {
  const q = query(
    kiralarCol(),
    where('workspaceId', '==', workspaceId),
    where('isDeleted', '==', false)
  );
  return onSnapshot(q, snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

export function alarmlarDinle(workspaceId, callback) {
  const q = query(
    alarmlarCol(),
    where('workspaceId', '==', workspaceId),
    where('isRead', '==', false)
  );
  return onSnapshot(q, snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

/** CRUD */
export async function mulkEkle(workspaceId, veri) {
  return addDoc(mulklerCol(), {
    ...veri, workspaceId,
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function mulkGuncelle(id, veri) {
  return updateDoc(doc(db, COL.MULKLER, id), {
    ...veri, updatedAt: serverTimestamp(),
  });
}

/** K06: Soft delete — fiziksel silme yok */
export async function mulkSil(id, silenKullanici) {
  return updateDoc(doc(db, COL.MULKLER, id), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: silenKullanici,
    updatedAt: serverTimestamp(),
  });
}
