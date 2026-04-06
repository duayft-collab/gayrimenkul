/**
 * @file core/vergiGider.js
 * @description Götürü vs Gerçek gider karşılaştırma + giderler CRUD
 * @anayasa K06 soft delete · K10 kuruş · K11 workspace
 */
import {
  collection, doc, addDoc, updateDoc, getDocs, query, where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { yetkiZorunlu } from './rbac';
import { gmsiVergisi } from './hesaplamalar';
import { logKaydet } from './auditLog';

const COL = 'giderler';
export const KATEGORILER = [
  { v: 'tamir',    l: '🔧 Tamir/Bakım' },
  { v: 'dask',     l: '🏚️ DASK' },
  { v: 'sigorta',  l: '🛡️ Konut Sigortası' },
  { v: 'emlak',    l: '🏛️ Emlak Vergisi' },
  { v: 'faiz',     l: '💳 Konut Kredisi Faizi' },
  { v: 'yonetim',  l: '👤 Yönetici Ücreti' },
  { v: 'amortis',  l: '📉 Amortisman' },
  { v: 'diger',    l: '📎 Diğer' },
];

/* ════ CRUD ════ */

export async function giderEkle(workspaceId, user, veri) {
  yetkiZorunlu(user, 'user');
  try {
    const ref = await addDoc(collection(db, COL), {
      workspaceId,
      mulkId: veri.mulkId || null,
      kategori: veri.kategori || 'diger',
      tutarKurus: Math.round(veri.tutarKurus || 0),
      tarih: veri.tarih || new Date(),
      aciklama: veri.aciklama || '',
      dekontUrl: veri.dekontUrl || null,
      isDeleted: false,
      olusturan: user?.name || 'bilinmiyor',
      createdAt: serverTimestamp(),
    });
    logKaydet({
      workspaceId, user, tip: 'create',
      entityTip: 'gider', entityId: ref.id,
      entityAd: `${veri.kategori} · ${(veri.tutarKurus / 100).toFixed(0)}₺`,
    });
    return ref.id;
  } catch (e) {
    throw new Error('Gider eklenemedi: ' + e.message);
  }
}

export async function giderListele(workspaceId, mulkId = null, yil = null) {
  try {
    let q;
    if (mulkId) {
      q = query(
        collection(db, COL),
        where('workspaceId', '==', workspaceId),
        where('mulkId', '==', mulkId),
        where('isDeleted', '==', false),
      );
    } else {
      q = query(
        collection(db, COL),
        where('workspaceId', '==', workspaceId),
        where('isDeleted', '==', false),
      );
    }
    const snap = await getDocs(q);
    let liste = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (yil) {
      liste = liste.filter(g => {
        const t = g.tarih?.toDate ? g.tarih.toDate() : new Date(g.tarih);
        return t.getFullYear() === yil;
      });
    }
    return liste.sort((a, b) => {
      const ta = a.tarih?.toDate ? a.tarih.toDate() : new Date(a.tarih || 0);
      const tb = b.tarih?.toDate ? b.tarih.toDate() : new Date(b.tarih || 0);
      return tb - ta;
    });
  } catch (e) {
    console.error('[giderListele]', e);
    return [];
  }
}

export async function giderGuncelle(workspaceId, user, id, veri) {
  yetkiZorunlu(user, 'user');
  await updateDoc(doc(db, COL, id), { ...veri, guncellenme: serverTimestamp() });
}

export async function giderSil(workspaceId, user, id) {
  yetkiZorunlu(user, 'manager');
  await updateDoc(doc(db, COL, id), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: user?.name || 'bilinmiyor',
  });
  logKaydet({ workspaceId, user, tip: 'delete', entityTip: 'gider', entityId: id });
}

/* ════ Götürü vs Gerçek ════ */

export function goturuGider(brutKiraKurus, oran = 15) {
  return Math.round((brutKiraKurus || 0) * oran / 100);
}

export async function gercekGider(workspaceId, mulkId, yil) {
  const liste = await giderListele(workspaceId, mulkId, yil);
  return liste.reduce((a, g) => a + (g.tutarKurus || 0), 0);
}

/**
 * Karşılaştırma: hangi yöntem daha avantajlı
 */
export async function karsilastirma({ workspaceId, mulkId, brutKiraKurus, yil, mulkDegerKurus = 0 }) {
  const goturu = goturuGider(brutKiraKurus, 15);
  const gercek = await gercekGider(workspaceId, mulkId, yil);
  // Amortisman %2/yıl
  const amortisman = Math.round((mulkDegerKurus || 0) * 0.02);
  const gercekToplam = gercek + amortisman;

  const matrahGoturu = Math.max(0, brutKiraKurus - goturu);
  const matrahGercek = Math.max(0, brutKiraKurus - gercekToplam);

  const vergiGoturu = gmsiVergisi(matrahGoturu, 0).vergi;
  const vergiGercek = gmsiVergisi(matrahGercek, 0).vergi;
  const tasarruf = vergiGoturu - vergiGercek;

  return {
    goturuGiderKurus: goturu,
    gercekGiderKurus: gercekToplam,
    gercekHam: gercek,
    amortismanKurus: amortisman,
    matrahGoturuKurus: matrahGoturu,
    matrahGercekKurus: matrahGercek,
    vergiGoturuKurus: vergiGoturu,
    vergiGercekKurus: vergiGercek,
    tasarrufKurus: Math.abs(tasarruf),
    tavsiye: tasarruf > 0 ? 'gercek' : 'goturu',
    neden: tasarruf > 0
      ? `Gerçek gider yöntemi ${(tasarruf / 100).toFixed(0)} ₺ tasarruf sağlar`
      : `Götürü yöntem ${(Math.abs(tasarruf) / 100).toFixed(0)} ₺ daha uygundur`,
  };
}
