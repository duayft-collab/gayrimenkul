/**
 * @file core/kiraHesap.js
 * @description Otomatik kira üretimi + TÜFE artışı + USD/EUR kur çevirimi
 * @anayasa K10 — tüm para kuruş integer
 */
import { odemeEkle, kiraciOdemeleri } from './odemelerDb';
import { kiracininKiralari, kiralarListele } from './kiralarDb';

/**
 * Belirli bir kira için başlangıç-bitiş arası aylık ödemeleri üret
 * Zaten var olan ayları atlar (idempotent)
 */
export async function otomatikKiraUret(workspaceId, user, kira, mevcutOdemeler = []) {
  if (!kira.baslangicTarihi || !kira.aylikKiraKurus) return { uretildi: 0, atlanan: 0 };

  const bas = kira.baslangicTarihi?.toDate ? kira.baslangicTarihi.toDate() : new Date(kira.baslangicTarihi);
  const bitis = kira.bitisTarihi?.toDate ? kira.bitisTarihi.toDate() : (kira.bitisTarihi ? new Date(kira.bitisTarihi) : new Date());
  const bugun = new Date();
  const sonTarih = bitis < bugun ? bitis : bugun;

  // Mevcut kira ödemelerini set'e al — ay-yıl bazında
  const mevcut = new Set();
  for (const o of mevcutOdemeler) {
    if (o.kiraId !== kira.id || o.tip !== 'kira') continue;
    const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi);
    if (!isNaN(v.getTime())) mevcut.add(`${v.getFullYear()}-${v.getMonth()}`);
  }

  let uretildi = 0;
  let atlanan = 0;
  const aktif = new Date(bas.getFullYear(), bas.getMonth(), 1);
  while (aktif <= sonTarih) {
    const anahtar = `${aktif.getFullYear()}-${aktif.getMonth()}`;
    if (mevcut.has(anahtar)) {
      atlanan++;
    } else {
      const vade = new Date(aktif);
      // Vade günü: sözleşmedeki başlangıç günü veya ayın başı
      vade.setDate(bas.getDate());
      try {
        await odemeEkle(workspaceId, user, {
          mulkId: kira.mulkId,
          kiraciId: kira.kiraciId,
          kiraId: kira.id,
          tip: 'kira',
          tutarKurus: kira.aylikKiraKurus,
          paraBirim: kira.paraBirim || 'TRY',
          vadeTarihi: vade,
          durum: 'bekliyor',
          aciklama: `${anahtar} Kira`,
        });
        uretildi++;
      } catch (e) {
        console.warn('[otomatikKiraUret]', e.message);
      }
    }
    aktif.setMonth(aktif.getMonth() + 1);
  }
  return { uretildi, atlanan };
}

/**
 * Tüm aktif kiralar için eksik ayları üret
 */
export async function tumKiralarIcinOtomatikUret(workspaceId, user, odemeler) {
  const kiralar = await kiralarListele(workspaceId);
  const aktif = kiralar.filter(k => k.durum === 'dolu' || k.durum === 'muhsait');
  let toplamUret = 0;
  for (const k of aktif) {
    const r = await otomatikKiraUret(workspaceId, user, k, odemeler);
    toplamUret += r.uretildi;
  }
  return { kiraSayisi: aktif.length, toplamUret };
}

/**
 * TÜFE bazlı kira artışı (yeni tutarKurus hesapla)
 * @param {number} mevcutKurus
 * @param {number} tufeYuzde — ör 48.5
 */
export function tufeArtis(mevcutKurus, tufeYuzde) {
  return Math.round(mevcutKurus * (1 + tufeYuzde / 100));
}

/** USD/EUR → TL çevrim (kurus integer) */
export function dovizCevir(kurus, paraBirim, kurDegeri) {
  if (paraBirim === 'TRY') return kurus;
  return Math.round(kurus * (kurDegeri || 1));
}

/** Dashboard marketData'dan kur al */
export function marketKurAl(marketData, paraBirim) {
  if (!marketData) return null;
  if (paraBirim === 'USD') return marketData.usdTry || null;
  if (paraBirim === 'EUR') return marketData.eurTry || null;
  return 1;
}
