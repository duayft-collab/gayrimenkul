/**
 * @file core/yedek.js
 * @description JSON yedekleme & geri yükleme
 * @anayasa K06 yükleme öncesi eski verileri soft delete + audit log
 */
import {
  collection, getDocs, query, where, writeBatch, doc, serverTimestamp, addDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { logKaydet } from './auditLog';

const COLLECTIONS = [
  'mulkler', 'kiralar', 'kiracilar', 'odemeler', 'alarmlar',
  'takvimOlaylari', 'katKarsiligiHesaplari', 'paylasimlar',
];

export async function yedekOlustur(workspaceId) {
  const yedek = {
    version: '1.0.0',
    olusturulma: new Date().toISOString(),
    workspaceId,
    collections: {},
    ozet: {},
  };
  for (const col of COLLECTIONS) {
    try {
      const q = query(collection(db, col), where('workspaceId', '==', workspaceId));
      const snap = await getDocs(q);
      yedek.collections[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      yedek.ozet[col] = yedek.collections[col].length;
    } catch (e) {
      console.warn(`[yedek] ${col}:`, e.message);
      yedek.collections[col] = [];
      yedek.ozet[col] = 0;
    }
  }
  return yedek;
}

export async function yedekIndir(workspaceId, user) {
  const yedek = await yedekOlustur(workspaceId);
  const json = JSON.stringify(yedek, (k, v) => {
    // Firestore Timestamp'leri serialize et
    if (v && typeof v === 'object' && typeof v.toDate === 'function') {
      return { __ts: v.toDate().toISOString() };
    }
    return v;
  }, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const tarih = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const a = document.createElement('a');
  a.href = url;
  a.download = `yedek_${workspaceId}_${tarih}.json`;
  a.click();
  URL.revokeObjectURL(url);

  // Meta kaydı — yedekler collection'a
  try {
    await addDoc(collection(db, 'yedekler'), {
      workspaceId,
      olusturulma: serverTimestamp(),
      olusturan: user?.name || 'bilinmiyor',
      boyutByte: blob.size,
      kayitSayisi: Object.values(yedek.ozet).reduce((a, b) => a + b, 0),
      ozet: yedek.ozet,
      dosyaAdi: a.download,
    });
  } catch (e) {
    console.warn('[yedek meta]', e.message);
  }

  logKaydet({
    workspaceId, user, tip: 'export',
    entityTip: 'yedek', entityId: null, entityAd: 'JSON Yedek',
    notlar: `${yedek.ozet ? Object.values(yedek.ozet).reduce((a, b) => a + b, 0) : 0} kayıt`,
  });

  return yedek;
}

export async function yedekYukle(workspaceId, user, file, { uzeriniYaz = false } = {}) {
  const text = await file.text();
  let yedek;
  try {
    yedek = JSON.parse(text, (k, v) => {
      if (v && typeof v === 'object' && v.__ts) return new Date(v.__ts);
      return v;
    });
  } catch (e) {
    throw new Error('Geçersiz JSON: ' + e.message);
  }

  if (!yedek.version || !yedek.collections) {
    throw new Error('Geçersiz yedek formatı');
  }

  const sonuc = { yuklenen: 0, hata: 0, collections: {} };

  for (const [col, kayitlar] of Object.entries(yedek.collections)) {
    if (!Array.isArray(kayitlar)) continue;
    sonuc.collections[col] = 0;

    // K06: Eğer uzeriniYaz aktifse mevcut kayıtları soft delete
    if (uzeriniYaz) {
      try {
        const q = query(collection(db, col), where('workspaceId', '==', workspaceId));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
          batch.update(d.ref, {
            isDeleted: true,
            deletedAt: serverTimestamp(),
            deletedBy: 'restore_backup',
          });
        });
        await batch.commit();
      } catch (e) {
        console.warn(`[yedekYukle] ${col} silme:`, e.message);
      }
    }

    // Kayıtları batch'ler halinde ekle (max 500/batch)
    for (let i = 0; i < kayitlar.length; i += 400) {
      const chunk = kayitlar.slice(i, i + 400);
      try {
        const batch = writeBatch(db);
        for (const k of chunk) {
          const { id, ...veri } = k;
          veri.workspaceId = workspaceId;
          veri.isDeleted = false;
          veri.restoredAt = serverTimestamp();
          veri.restoredBy = user?.name || 'bilinmiyor';
          batch.set(doc(collection(db, col)), veri);
        }
        await batch.commit();
        sonuc.yuklenen += chunk.length;
        sonuc.collections[col] += chunk.length;
      } catch (e) {
        console.error(`[yedekYukle] ${col} chunk:`, e);
        sonuc.hata += chunk.length;
      }
    }
  }

  logKaydet({
    workspaceId, user, tip: 'import',
    entityTip: 'yedek', entityId: null, entityAd: 'JSON Restore',
    notlar: `${sonuc.yuklenen} kayıt yüklendi, ${sonuc.hata} hata`,
  });

  return sonuc;
}

export async function yedeklerListesi(workspaceId) {
  try {
    const q = query(collection(db, 'yedekler'), where('workspaceId', '==', workspaceId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.olusturulma?.seconds || 0) - (a.olusturulma?.seconds || 0));
  } catch (e) {
    return [];
  }
}

/** Haftalık otomatik yedek kontrolü — app açılışında çağır */
export async function otomatikYedekKontrol(workspaceId, user, { enabled = true } = {}) {
  if (!enabled) return null;
  try {
    const liste = await yedeklerListesi(workspaceId);
    const sonYedek = liste[0];
    const birHafta = 7 * 24 * 60 * 60 * 1000;
    const sonZaman = sonYedek?.olusturulma?.toDate?.().getTime() || 0;
    if (Date.now() - sonZaman > birHafta) {
      // Bildirim olarak uyar — kullanıcı manuel indirmesi gerekir
      return { gerekli: true, sonZaman };
    }
    return { gerekli: false, sonZaman };
  } catch (e) {
    return null;
  }
}
