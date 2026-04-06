/**
 * @file core/versiyonlama.js
 * @description Entity versiyon geçmişi — her update öncesi snapshot, max 10 FIFO
 * @anayasa K06 fiziksel silme yok, FIFO rotation
 */
import {
  collection, addDoc, query, where, getDocs, deleteDoc, doc, orderBy,
  serverTimestamp, updateDoc
} from 'firebase/firestore';
import { db } from './firebase';

const COL = 'versiyonlar';
const MAX_VERSIYON = 10;

export async function versiyonKaydet({ workspaceId, user, entityTip, entityId, veri }) {
  try {
    // Mevcut versiyonları çek
    const q = query(
      collection(db, COL),
      where('workspaceId', '==', workspaceId),
      where('entityTip', '==', entityTip),
      where('entityId', '==', entityId),
    );
    const snap = await getDocs(q);
    const mevcut = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.versiyon || 0) - (a.versiyon || 0));

    const sonrakiVersiyon = (mevcut[0]?.versiyon || 0) + 1;

    // Yeni versiyon ekle
    await addDoc(collection(db, COL), {
      workspaceId,
      entityTip,
      entityId,
      versiyon: sonrakiVersiyon,
      veri: temizle(veri),
      degistiren: user?.name || 'bilinmiyor',
      degistirenId: user?.uid || null,
      zaman: serverTimestamp(),
    });

    // FIFO — eski versiyonları sil
    if (mevcut.length >= MAX_VERSIYON) {
      const silinecekler = mevcut.slice(MAX_VERSIYON - 1);
      for (const v of silinecekler) {
        try { await deleteDoc(doc(db, COL, v.id)); } catch {}
      }
    }
    return sonrakiVersiyon;
  } catch (e) {
    console.warn('[versiyonKaydet]', e.message);
    return null;
  }
}

export async function versiyonlariListele(workspaceId, entityTip, entityId) {
  try {
    const q = query(
      collection(db, COL),
      where('workspaceId', '==', workspaceId),
      where('entityTip', '==', entityTip),
      where('entityId', '==', entityId),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.versiyon || 0) - (a.versiyon || 0));
  } catch (e) {
    console.error('[versiyonlariListele]', e);
    return [];
  }
}

export async function versiyonaDondur({ workspaceId, user, entityTip, entityId, versiyonId, collectionAdi }) {
  try {
    const versiyonlar = await versiyonlariListele(workspaceId, entityTip, entityId);
    const v = versiyonlar.find(x => x.id === versiyonId);
    if (!v) throw new Error('Versiyon bulunamadı');
    // Entity'yi versiyon verisi ile güncelle
    const veri = { ...v.veri, guncellenme: serverTimestamp(), geriAlinanVersiyon: v.versiyon };
    delete veri.id; delete veri.workspaceId; delete veri.olusturulma;
    await updateDoc(doc(db, collectionAdi, entityId), veri);
    return v.versiyon;
  } catch (e) {
    console.error('[versiyonaDondur]', e);
    throw new Error('Geri döndürülemedi: ' + e.message);
  }
}

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
