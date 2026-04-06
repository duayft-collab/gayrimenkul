/**
 * @file core/paylasim.js
 * @description Mülk paylaşım — link token veya kullanıcı e-postası
 * @anayasa K02 token crypto.randomUUID · K06 aktif flag · K11 workspace
 */
import {
  collection, doc, addDoc, updateDoc, getDocs, query, where, serverTimestamp, getDoc
} from 'firebase/firestore';
import { db } from './firebase';

const COL = 'paylasimlar';

function yeniToken() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'pay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

export async function paylasimLinkOlustur({ workspaceId, mulkId, yetki = 'view', sureGun = 30, olusturan }) {
  const token = yeniToken();
  const sonKullanim = new Date(Date.now() + sureGun * 24 * 60 * 60 * 1000);
  const ref = await addDoc(collection(db, COL), {
    workspaceId, mulkId, tip: 'link', token,
    userEmail: null, yetki,
    olusturan: olusturan || 'bilinmiyor',
    olusturulma: serverTimestamp(),
    sonKullanim,
    aktif: true,
  });
  return { id: ref.id, token, sonKullanim };
}

export async function paylasimKullaniciEkle({ workspaceId, mulkId, email, yetki = 'view', olusturan }) {
  const ref = await addDoc(collection(db, COL), {
    workspaceId, mulkId, tip: 'user',
    token: null,
    userEmail: (email || '').toLowerCase().trim(),
    yetki,
    olusturan: olusturan || 'bilinmiyor',
    olusturulma: serverTimestamp(),
    sonKullanim: null,
    aktif: true,
  });
  return { id: ref.id };
}

export async function paylasimListele(workspaceId, mulkId) {
  const q = query(
    collection(db, COL),
    where('workspaceId', '==', workspaceId),
    where('mulkId', '==', mulkId),
    where('aktif', '==', true),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function paylasimIptal(paylasimId) {
  await updateDoc(doc(db, COL, paylasimId), { aktif: false, iptalZaman: serverTimestamp() });
}

/** Public — token ile paylaşım çöz */
export async function paylasimTokenCoz(token) {
  if (!token) return null;
  const q = query(collection(db, COL), where('token', '==', token), where('aktif', '==', true));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const pay = { id: snap.docs[0].id, ...snap.docs[0].data() };
  // Süre kontrolü
  if (pay.sonKullanim) {
    const bitis = pay.sonKullanim.toDate ? pay.sonKullanim.toDate() : new Date(pay.sonKullanim);
    if (bitis.getTime() < Date.now()) return { ...pay, suresiGecti: true };
  }
  // Mülkü çek
  try {
    const mulkSnap = await getDoc(doc(db, 'mulkler', pay.mulkId));
    if (mulkSnap.exists()) pay.mulk = { id: mulkSnap.id, ...mulkSnap.data() };
  } catch (e) {
    console.warn('[paylasim] mülk yüklenemedi:', e.message);
  }
  return pay;
}

export function paylasimLinkUrl(token) {
  const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
  return `${base}?share=${token}`;
}
