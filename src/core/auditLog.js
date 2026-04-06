/**
 * @file core/auditLog.js
 * @description Audit log — CRUD işlem geçmişi + diff snapshotları
 * @anayasa K05 izlenebilirlik · K11 workspace · K14 PII yok
 */
import {
  collection, addDoc, query, where, orderBy, getDocs, limit as qLimit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const COL = 'islemLogu';

/** Obje farkını hesapla — sadece değişen alanları döndür */
export function diffHesapla(oncekiDeger, yeniDeger) {
  const onceki = oncekiDeger || {};
  const yeni = yeniDeger || {};
  const fark = { onceki: {}, yeni: {} };
  const anahtarlar = new Set([...Object.keys(onceki), ...Object.keys(yeni)]);
  for (const k of anahtarlar) {
    // Sistem alanlarını atla
    if (['olusturulma', 'guncellenme', 'ts', 'deletedAt', 'createdAt', 'updatedAt'].includes(k)) continue;
    const o = onceki[k];
    const y = yeni[k];
    if (JSON.stringify(o) !== JSON.stringify(y)) {
      fark.onceki[k] = o === undefined ? null : o;
      fark.yeni[k] = y === undefined ? null : y;
    }
  }
  return fark;
}

export async function logKaydet({
  workspaceId, user, tip, entityTip, entityId, entityAd,
  oncekiDeger = null, yeniDeger = null, notlar = null
}) {
  try {
    const fark = (oncekiDeger || yeniDeger) ? diffHesapla(oncekiDeger, yeniDeger) : null;
    await addDoc(collection(db, COL), {
      workspaceId,
      kullaniciId: user?.uid || 'bilinmiyor',
      kullaniciEmail: user?.email || 'bilinmiyor',
      kullaniciAd: user?.name || 'bilinmiyor',
      tip,
      entityTip: entityTip || null,
      entityId: entityId || null,
      entityAd: entityAd || null,
      fark,
      oncekiDeger: oncekiDeger ? temizle(oncekiDeger) : null,
      yeniDeger: yeniDeger ? temizle(yeniDeger) : null,
      userAgent: navigator?.userAgent?.slice(0, 250) || null,
      notlar,
      zaman: serverTimestamp(),
      isDeleted: false,
    });
  } catch (e) {
    console.warn('[auditLog]', e.message);
  }
}

/** Firestore undefined kabul etmediği için null'a çevir + serverTimestamp kaldır */
function temizle(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(temizle);
  const out = {};
  for (const k in obj) {
    const v = obj[k];
    if (v === undefined) continue;
    if (typeof v === 'object' && v !== null && typeof v.toDate === 'function') {
      try { out[k] = v.toDate().toISOString(); } catch { out[k] = null; }
    } else {
      out[k] = temizle(v);
    }
  }
  return out;
}

export async function logListele(workspaceId, filtreler = {}) {
  try {
    let q = query(
      collection(db, COL),
      where('workspaceId', '==', workspaceId),
      where('isDeleted', '==', false),
      orderBy('zaman', 'desc'),
      qLimit(filtreler.limit || 500),
    );
    const snap = await getDocs(q);
    let liste = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (filtreler.tip) liste = liste.filter(l => l.tip === filtreler.tip);
    if (filtreler.entityTip) liste = liste.filter(l => l.entityTip === filtreler.entityTip);
    if (filtreler.kullaniciId) liste = liste.filter(l => l.kullaniciId === filtreler.kullaniciId);
    return liste;
  } catch (e) {
    // orderBy + composite index eksik olursa fallback
    console.warn('[logListele] fallback:', e.message);
    try {
      const q2 = query(
        collection(db, COL),
        where('workspaceId', '==', workspaceId),
        where('isDeleted', '==', false),
      );
      const snap = await getDocs(q2);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.zaman?.seconds || 0) - (a.zaman?.seconds || 0))
        .slice(0, filtreler.limit || 500);
    } catch (e2) {
      console.error('[logListele]', e2);
      return [];
    }
  }
}

export async function logEntityIcin(workspaceId, entityTip, entityId) {
  try {
    const q = query(
      collection(db, COL),
      where('workspaceId', '==', workspaceId),
      where('entityTip', '==', entityTip),
      where('entityId', '==', entityId),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.zaman?.seconds || 0) - (a.zaman?.seconds || 0));
  } catch (e) {
    console.error('[logEntityIcin]', e);
    return [];
  }
}
