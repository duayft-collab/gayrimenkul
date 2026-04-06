/**
 * @file core/kiraTakvimSync.js
 * @description Kira → Takvim otomatik sync (idempotent)
 * @anayasa K11 workspace · K06 soft delete
 *
 * Cycle-safe: Firestore'a direkt yazar, kiralarDb/takvim import etmez.
 * takvimOlaylari.kaynak='auto_kira' + kiraId alanıyla üretilen olaylar işaretlenir.
 */
import {
  collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const TAKVIM = 'takvimOlaylari';

function toDate(v) {
  if (!v) return null;
  if (v.toDate) return v.toDate();
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

/**
 * Kira için takvim olaylarını (re)oluştur
 * - Her ay için "kira" vadesinden 3 gün önce tekrarlı hatırlatıcı
 * - Sözleşme bitişi için "sozlesme"
 * - Sonraki artış için "odeme"
 */
export async function kiraTakvimeYaz(workspaceId, kira) {
  if (!kira?.id || !workspaceId) return;

  // İdempotent — önce eskileri soft delete
  await kiradanOlaylariSil(workspaceId, kira.id);

  const bas = toDate(kira.baslangicTarihi);
  if (!bas) return;
  const bitis = toDate(kira.bitisTarihi);
  const sonrakiArtis = toDate(kira.sonrakiArtisTarihi);

  const olaylar = [];

  // 1) Aylık kira vadesi hatırlatıcısı (başlangıç tarihinden 3 gün önce, tekrarlı)
  const hatirlatma = new Date(bas);
  hatirlatma.setDate(hatirlatma.getDate() - 3);
  olaylar.push({
    workspaceId,
    kiraId: kira.id,
    mulkId: kira.mulkId || null,
    kiraciId: kira.kiraciId || null,
    tarih: hatirlatma,
    tip: 'kira',
    baslik: 'Kira Vadesi (3 gün)',
    not: `Aylık kira vadesi yaklaşıyor`,
    tekrar: 'monthly',
    tamamlandi: false,
    isDeleted: false,
    olusturulma: serverTimestamp(),
    kaynak: 'auto_kira',
  });

  // 2) Sözleşme bitiş
  if (bitis) {
    olaylar.push({
      workspaceId,
      kiraId: kira.id,
      mulkId: kira.mulkId || null,
      kiraciId: kira.kiraciId || null,
      tarih: bitis,
      tip: 'sozlesme',
      baslik: 'Sözleşme Bitiş',
      not: 'Kira sözleşmesi sona eriyor — yenileme kararı ver',
      tekrar: 'once',
      tamamlandi: false,
      isDeleted: false,
      olusturulma: serverTimestamp(),
      kaynak: 'auto_kira',
    });
  }

  // 3) Sonraki kira artış tarihi
  if (sonrakiArtis) {
    olaylar.push({
      workspaceId,
      kiraId: kira.id,
      mulkId: kira.mulkId || null,
      kiraciId: kira.kiraciId || null,
      tarih: sonrakiArtis,
      tip: 'odeme',
      baslik: 'Kira Artış Zamanı',
      not: `Artış uygulanabilir (${kira.artisKosulu || 'TUFE'})`,
      tekrar: 'yearly',
      tamamlandi: false,
      isDeleted: false,
      olusturulma: serverTimestamp(),
      kaynak: 'auto_kira',
    });
  }

  for (const o of olaylar) {
    try { await addDoc(collection(db, TAKVIM), o); }
    catch (e) { console.warn('[kiraTakvimeYaz]', e.message); }
  }
  return olaylar.length;
}

/** Kiraya bağlı tüm auto_kira olaylarını soft delete */
export async function kiradanOlaylariSil(workspaceId, kiraId) {
  try {
    const q = query(
      collection(db, TAKVIM),
      where('workspaceId', '==', workspaceId),
      where('kiraId', '==', kiraId),
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const veri = d.data();
      if (veri.kaynak !== 'auto_kira') continue; // Manuel olayları koru
      if (veri.isDeleted) continue;
      await updateDoc(doc(db, TAKVIM, d.id), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: 'kira_sync',
      });
    }
  } catch (e) {
    console.warn('[kiradanOlaylariSil]', e.message);
  }
}
