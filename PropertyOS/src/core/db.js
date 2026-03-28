/**
 * src/core/db.js
 * Duay Global Trade Company — Property OS
 * Anayasa: K03, K06
 * v1.0 / 2026-03-28
 */

import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, getDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db }           from '../../config/firebase-config.js';
import { APP_CONFIG }   from '../../config/app-config.js';
import { getCurrentUser } from './auth.js';

function _uid() {
  const u = getCurrentUser();
  if (!u) throw new Error('Oturum yok');
  return u.uid;
}

export async function listDocs(col) {
  const uid = _uid();
  const q   = query(
    collection(db, col),
    where('ownerUid',  '==', uid),
    where('isDeleted', '==', false),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getDocById(col, id) {
  const snap = await getDoc(doc(db, col, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function addDocument(col, data) {
  const uid = _uid();
  return addDoc(collection(db, col), {
    ...data,
    ownerUid:  uid,
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateDocument(col, id, data) {
  return updateDoc(doc(db, col, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function softDelete(col, id) {
  const uid = _uid();
  return updateDoc(doc(db, col, id), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: uid,
  });
}
