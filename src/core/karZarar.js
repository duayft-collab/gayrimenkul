/**
 * @file core/karZarar.js
 * @description Kâr/Zarar + vergi hesaplamaları
 * @anayasa K10 — tüm hesaplamalar kuruş integer
 */
import { odemeTlKurus } from './odemelerDb';

/** Dönemi filtre — odemeler içinden */
export function donemFiltre(odemeler, bas, bit) {
  return (odemeler || []).filter(o => {
    if (o.isDeleted) return false;
    const v = o.odemeTarihi?.toDate ? o.odemeTarihi.toDate()
      : (o.odemeTarihi ? new Date(o.odemeTarihi) : null);
    const vade = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi || 0);
    const kontrol = v || vade;
    if (!kontrol) return false;
    if (bas && kontrol < bas) return false;
    if (bit && kontrol > bit) return false;
    return true;
  });
}

/** Gelir: kira/depozito tahsil edilenler + satış (mülk durumu satıldı) */
export function hesaplaGelir({ odemeler, mulkler, bas, bit }) {
  const donem = donemFiltre(odemeler, bas, bit);
  const kira = donem.filter(o => o.tip === 'kira' && o.durum === 'odendi')
    .reduce((a, o) => a + odemeTlKurus(o), 0);
  const depozito = donem.filter(o => o.tip === 'depozito' && o.durum === 'odendi')
    .reduce((a, o) => a + odemeTlKurus(o), 0);
  const aidat = donem.filter(o => o.tip === 'aidat' && o.durum === 'odendi')
    .reduce((a, o) => a + odemeTlKurus(o), 0);
  // Satış geliri — mülk durumu 'satildi' olan ve tarih aralığında güncellenenler
  let satis = 0;
  for (const m of (mulkler || [])) {
    if (m.durum !== 'satildi') continue;
    // Basit: updatedAt dönemde ise satış olarak say
    const g = m.updatedAt?.toDate ? m.updatedAt.toDate() : null;
    if (bas && g && g < bas) continue;
    if (bit && g && g > bit) continue;
    satis += Math.round((m.fiyat || 0) * 100);
  }
  return { kiraKurus: kira, depozitoKurus: depozito, aidatKurus: aidat, satisKurus: satis, toplamKurus: kira + aidat + satis };
}

/** Gider: 'gider' tipi ödemeler + amortisman tahmini */
export function hesaplaGider({ odemeler, mulkler, bas, bit }) {
  const donem = donemFiltre(odemeler, bas, bit);
  const giderOdeme = donem.filter(o => o.tip === 'gider' || o.tip === 'diger')
    .reduce((a, o) => a + odemeTlKurus(o), 0);

  // Amortisman — %2 yıllık konut üzerinden dönem orantısal
  let amortisman = 0;
  if (bas && bit) {
    const gun = Math.max(1, (bit - bas) / (1000 * 60 * 60 * 24));
    const yilOran = gun / 365;
    for (const m of (mulkler || [])) {
      if (m.isDeleted) continue;
      const fiyat = (m.fiyat || 0) * 100;
      amortisman += Math.round(fiyat * 0.02 * yilOran);
    }
  }

  // Bakım/sigorta/vergi kategorileri — gelecekte ayrı kategori destekler
  return {
    giderOdemeKurus: giderOdeme,
    amortismanKurus: amortisman,
    toplamKurus: giderOdeme + amortisman,
  };
}

export function hesaplaNetKar(params) {
  const gelir = hesaplaGelir(params);
  const gider = hesaplaGider(params);
  return {
    gelir, gider,
    netKarKurus: gelir.toplamKurus - gider.toplamKurus,
  };
}

/* ═══ Vergi Hesaplamaları ═══ */

/** Kira stopajı — %20 (işyeri kiralarında) */
export function hesaplaStopaj(kiraKurus) {
  return Math.round(kiraKurus * 0.20);
}

/** Konut KDV oranı (m² bazlı — net 150m² altı %1) */
export function konutKdvOrani(netM2 = 150, lux = false) {
  if (lux || netM2 > 200) return 20;
  if (netM2 > 150) return 10;
  return 1;
}

export function hesaplaKDV(satisKurus, oran = 10) {
  return Math.round(satisKurus * oran / 100);
}

/** GMSİ beyan — 2026 güncel limitler (tahmini) */
const BEYAN_LIMITI_2026 = 47000 * 100; // 47.000 TL → kuruş
const VERGI_LIMITI_2026 = 74000 * 100; // 74.000 TL → kuruş

export function hesaplaBeyan(yillikKiraKurus) {
  const beyanGerekli = yillikKiraKurus >= BEYAN_LIMITI_2026;
  const vergiGerekli = yillikKiraKurus >= VERGI_LIMITI_2026;
  // Basit gelir vergisi tahmini: kademeli, ama MVP için %15 düz oran üzeri kısım
  const vergiKurus = vergiGerekli
    ? Math.round((yillikKiraKurus - VERGI_LIMITI_2026) * 0.15)
    : 0;
  return {
    beyanGerekli, vergiGerekli,
    beyanLimitKurus: BEYAN_LIMITI_2026,
    vergiLimitKurus: VERGI_LIMITI_2026,
    tahminVergiKurus: vergiKurus,
  };
}

/* ═══ Mülk bazlı performans ═══ */

export function mulkBazliKarZarar({ mulkler, odemeler, bas, bit }) {
  const sonuc = [];
  for (const m of (mulkler || [])) {
    if (m.isDeleted) continue;
    const mOdemeler = (odemeler || []).filter(o => o.mulkId === m.id);
    const gelir = hesaplaGelir({ odemeler: mOdemeler, mulkler: [], bas, bit });
    const gider = hesaplaGider({ odemeler: mOdemeler, mulkler: [m], bas, bit });
    const netKar = gelir.toplamKurus - gider.toplamKurus;
    const maliyet = (m.fiyat || 0) * 100;
    const roi = maliyet > 0 ? (netKar / maliyet) * 100 : 0;
    sonuc.push({
      mulkId: m.id,
      ad: m.ad || '—',
      gelirKurus: gelir.toplamKurus,
      giderKurus: gider.toplamKurus,
      netKarKurus: netKar,
      roi,
      fiyatKurus: maliyet,
    });
  }
  return sonuc.sort((a, b) => b.netKarKurus - a.netKarKurus);
}

/** Kiracı bazlı toplam tahsilat */
export function kiraciBazliGelirler({ kiracilar, odemeler }) {
  const harita = {};
  for (const o of (odemeler || [])) {
    if (o.isDeleted || o.durum !== 'odendi') continue;
    const kId = o.kiraciId || 'bilinmiyor';
    harita[kId] = (harita[kId] || 0) + odemeTlKurus(o);
  }
  return (kiracilar || []).map(k => ({
    kiraciId: k.id,
    adSoyad: k.adSoyad,
    tahsilatKurus: harita[k.id] || 0,
  })).sort((a, b) => b.tahsilatKurus - a.tahsilatKurus);
}

/* ═══ Aylık trend (grafik için) ═══ */
export function aylikTrend({ odemeler, ayAdet = 12 }) {
  const bugun = new Date();
  const aylar = [];
  for (let i = ayAdet - 1; i >= 0; i--) {
    const d = new Date(bugun.getFullYear(), bugun.getMonth() - i, 1);
    const bit = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const donem = donemFiltre(odemeler, d, bit);
    const gelir = donem.filter(o => (o.tip === 'kira' || o.tip === 'aidat') && o.durum === 'odendi')
      .reduce((a, o) => a + odemeTlKurus(o), 0);
    const gider = donem.filter(o => o.tip === 'gider' || o.tip === 'diger')
      .reduce((a, o) => a + odemeTlKurus(o), 0);
    aylar.push({
      ay: d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
      gelirTL: Math.round(gelir / 100),
      giderTL: Math.round(gider / 100),
      netTL: Math.round((gelir - gider) / 100),
    });
  }
  return aylar;
}
