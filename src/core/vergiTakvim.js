/**
 * @file core/vergiTakvim.js
 * @description Türkiye vergi takvimi — vade hesabı, alarm sync, gecikme faizi
 * @anayasa K11 workspace · K14 audit
 */
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { gecikmeFaizi } from './vergiHesap';

const TAKVIM_COL = 'takvimOlaylari';

/* ════ TR Vergi Vadeleri (sabit) ════ */
export const VADELER = [
  { ad: 'GMSİ Beyanname',     ay: 3,  gun: 25, tip: 'beyan',  kritik: true,  donemli: false },
  { ad: 'GMSİ 1. Taksit',     ay: 3,  gun: 31, tip: 'odeme',  kritik: false, donemli: false },
  { ad: 'Emlak Vergisi 1',    ay: 5,  gun: 31, tip: 'odeme',  kritik: true,  donemli: false },
  { ad: 'GMSİ 2. Taksit',     ay: 7,  gun: 31, tip: 'odeme',  kritik: false, donemli: false },
  { ad: 'Emlak Vergisi 2',    ay: 11, gun: 30, tip: 'odeme',  kritik: true,  donemli: false },
  { ad: 'Muhtasar Beyan',     ay: null, gun: 26, tip: 'beyan', kritik: false, donemli: true }, // her ay
  { ad: 'KDV Beyan',          ay: null, gun: 26, tip: 'beyan', kritik: false, donemli: true },
];

/* ════ Yıllık vade Date listesi ════ */
export function vergiTakvimYili(yil) {
  const sonuc = [];
  for (const v of VADELER) {
    if (v.donemli) {
      // Her ay için
      for (let m = 0; m < 12; m++) {
        sonuc.push({
          ...v,
          tarih: new Date(yil, m, v.gun),
          baslik: `${v.ad} (${m + 1}/${yil})`,
        });
      }
    } else {
      sonuc.push({
        ...v,
        tarih: new Date(yil, v.ay - 1, v.gun),
        baslik: `${v.ad} ${yil}`,
      });
    }
  }
  return sonuc.sort((a, b) => a.tarih - b.tarih);
}

/** Önümüzdeki N gün içindeki vadeler */
export function yaklasanVadeler(gunOnce = 30, yil = new Date().getFullYear()) {
  const tum = vergiTakvimYili(yil);
  // Sonraki yıl vadelerini de ekle (Aralık ayında)
  if (new Date().getMonth() >= 9) {
    tum.push(...vergiTakvimYili(yil + 1));
  }
  const bugun = new Date();
  const limit = new Date(bugun); limit.setDate(limit.getDate() + gunOnce);
  return tum.filter(v => v.tarih >= bugun && v.tarih <= limit);
}

/** Geçmiş vadeli (henüz tamamlanmamış) — gecikme faizi hesabıyla */
export function gecikmisVadeler(yil = new Date().getFullYear()) {
  const tum = vergiTakvimYili(yil);
  const bugun = new Date();
  return tum
    .filter(v => v.tarih < bugun && !v.tamamlandi)
    .map(v => {
      const gun = Math.floor((bugun - v.tarih) / (1000 * 60 * 60 * 24));
      return {
        ...v,
        gecikmeGun: gun,
      };
    });
}

/** Vade bildirimi oluştur (15/7/3/1 gün öncesi) */
export async function vadeBildirimUret(workspaceId, vade) {
  if (!workspaceId || !vade) return;
  const bugun = new Date();
  const fark = Math.floor((vade.tarih - bugun) / (1000 * 60 * 60 * 24));
  if (![15, 7, 3, 1].includes(fark)) return;

  try {
    const { bildirimOlustur } = await import('./bildirimlerDb');
    await bildirimOlustur({
      workspaceId,
      tip: 'vergi_vadesi',
      baslik: `⏰ ${fark} gün kaldı: ${vade.ad}`,
      mesaj: `${vade.tarih.toLocaleDateString('tr-TR')} vadeli ${vade.tip}`,
      link: 'vergiPaneli',
    });
  } catch (e) {
    console.warn('[vadeBildirim]', e.message);
  }
}

/**
 * takvimSync — vade'leri takvimOlaylari koleksiyonuna sync (idempotent)
 * Yıl başında bir kez çağrılır
 */
export async function takvimSync(workspaceId, yil) {
  if (!workspaceId) return { yazildi: 0 };
  const guard = `vergiTakvimSync_${workspaceId}_${yil}`;
  if (localStorage.getItem(guard)) return { atlandi: true };

  const vadeler = vergiTakvimYili(yil);
  let yazildi = 0;

  for (const v of vadeler) {
    if (v.donemli) continue; // Her ay için bildirim çoğaltmamak için
    try {
      // Aynı vade var mı kontrol
      const q = query(
        collection(db, TAKVIM_COL),
        where('workspaceId', '==', workspaceId),
        where('kaynak', '==', 'vergi_takvim'),
        where('baslik', '==', v.baslik),
      );
      const snap = await getDocs(q);
      if (!snap.empty) continue; // Zaten var

      await addDoc(collection(db, TAKVIM_COL), {
        workspaceId,
        tarih: v.tarih,
        tip: v.tip === 'beyan' ? 'odeme' : 'odeme',
        baslik: v.baslik,
        not: `${v.tip === 'beyan' ? '📋 Beyanname' : '💰 Ödeme'} vadesi · ${v.kritik ? 'KRİTİK' : 'Standart'}`,
        tekrar: 'once',
        tamamlandi: false,
        isDeleted: false,
        kaynak: 'vergi_takvim',
        olusturulma: serverTimestamp(),
      });
      yazildi++;
    } catch (e) {
      console.warn('[vergiTakvimSync]', e.message);
    }
  }

  localStorage.setItem(guard, '1');
  return { yazildi };
}

/** Geçmiş vade için gecikme faizi tutarı (basit hesap) */
export function vadeGecikmeFaizi(odenmemisTutarKurus, gecikmeGun) {
  return gecikmeFaizi(odenmemisTutarKurus, gecikmeGun, 42);
}
