/**
 * @file core/paylasim.js
 * @description Mülk paylaşım — link token veya kullanıcı e-postası
 * @anayasa K02 token crypto.randomUUID · K06 aktif flag · K11 workspace
 */
import {
  collection, doc, addDoc, updateDoc, getDocs, query, where, serverTimestamp, getDoc, arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';

/* ══════════ KIRACI PORTAL TOKEN (kportal_ prefix) ══════════
 * Hesap özeti paylaşımı (kiraci_) ile çakışmaz.
 * kiracilar/{id} dokümanı üzerinde portalToken + portalAktif + portalTokenGecmis.
 */

const KIRACILAR = 'kiracilar';

function rastgeleHex(byte = 32) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const a = new Uint8Array(byte);
    crypto.getRandomValues(a);
    return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Date.now().toString(16) + Math.random().toString(16).slice(2, 18);
}

/** Kiracı için portal token üret (mevcut varsa geçmişe atar) */
export async function kiraciPortalTokenUret(kiraciId, workspaceId) {
  if (!kiraciId) throw new Error('Kiracı ID yok');
  const token = 'kportal_' + rastgeleHex(32);
  try {
    const kSnap = await getDoc(doc(db, KIRACILAR, kiraciId));
    if (!kSnap.exists()) throw new Error('Kiracı bulunamadı');
    const mevcut = kSnap.data();
    const updates = {
      portalToken: token,
      portalTokenOlusturma: serverTimestamp(),
      portalAktif: true,
    };
    // Eski token varsa geçmişe at (son 5 sakla)
    if (mevcut.portalToken) {
      const eski = (mevcut.portalTokenGecmis || []).slice(-4);
      eski.push({
        token: mevcut.portalToken,
        iptal: new Date().toISOString(),
      });
      updates.portalTokenGecmis = eski;
    }
    await updateDoc(doc(db, KIRACILAR, kiraciId), updates);

    const base = window.location.origin + window.location.pathname;
    const url = `${base}#/kportal/${token}`;
    return { token, url };
  } catch (e) {
    console.error('[kiraciPortalTokenUret]', e);
    throw new Error('Portal linki oluşturulamadı: ' + e.message);
  }
}

/** Public — token ile kiracıyı bul (workspace context'iyle) */
export async function kportalTokenCoz(token) {
  if (!token || !token.startsWith('kportal_')) {
    throw new Error('Geçersiz token formatı');
  }
  try {
    const q = query(
      collection(db, KIRACILAR),
      where('portalToken', '==', token),
    );
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('Link geçersiz veya iptal edilmiş');
    const kSnap = snap.docs[0];
    const kiraci = { id: kSnap.id, ...kSnap.data() };
    // Backward compat: portalAktif undefined ise true
    if (kiraci.portalAktif === false) {
      throw new Error('Link iptal edilmiş');
    }
    if (kiraci.isDeleted) {
      throw new Error('Kiracı kaydı silinmiş');
    }
    return kiraci;
  } catch (e) {
    throw e;
  }
}

/** Portal linkini iptal et */
export async function kportalTokenIptal(kiraciId) {
  try {
    await updateDoc(doc(db, KIRACILAR, kiraciId), {
      portalAktif: false,
      portalIptalZaman: serverTimestamp(),
    });
    // Audit log — islemLogu
    try {
      await addDoc(collection(db, 'islemLogu'), {
        tip: 'portal_iptal',
        entityTip: 'kiraci',
        entityId: kiraciId,
        zaman: serverTimestamp(),
        isDeleted: false,
      });
    } catch {}
  } catch (e) {
    throw new Error('Link iptal edilemedi: ' + e.message);
  }
}

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

/** Public — token ile paylaşım çöz. mulkId 'kiraci_' prefix'li ise kiracı branch. */
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

  // Kiracı branch — mulkId 'kiraci_<id>' ise hesap özeti paylaşımı
  if (typeof pay.mulkId === 'string' && pay.mulkId.startsWith('kiraci_')) {
    pay.tipKiraci = true;
    const kiraciId = pay.mulkId.split('kiraci_')[1];
    try {
      const kSnap = await getDoc(doc(db, 'kiracilar', kiraciId));
      if (kSnap.exists()) pay.kiraci = { id: kSnap.id, ...kSnap.data() };
      // Kiracıya ait kiraları çek
      const qKira = query(
        collection(db, 'kiralar'),
        where('workspaceId', '==', pay.workspaceId),
        where('kiraciId', '==', kiraciId),
        where('isDeleted', '==', false),
      );
      const kiraSnap = await getDocs(qKira);
      pay.kiralar = kiraSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ödemeler
      const qOde = query(
        collection(db, 'odemeler'),
        where('workspaceId', '==', pay.workspaceId),
        where('kiraciId', '==', kiraciId),
        where('isDeleted', '==', false),
      );
      const odeSnap = await getDocs(qOde);
      pay.odemeler = odeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[paylasim] kiracı yüklenemedi:', e.message);
    }
    return pay;
  }

  // Mülk branch (mevcut davranış)
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
