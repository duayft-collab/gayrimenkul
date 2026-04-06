/**
 * @file core/finansal.js
 * @description Finansal formüller — IRR, NPV, Monte Carlo, vergi, kredi
 * @anayasa K10 — TÜM para değerleri KURUŞ (integer) olarak hesaplanır.
 *              TL'ye çevirmek için `formatTL(kurus)` kullan.
 *
 * Akış dizileri (akislar[]) aylık kuruş cinsinden integer olmalıdır.
 * Negatif = nakit çıkışı, pozitif = nakit girişi.
 */

/* ════════════ Para formatlama ════════════ */
export const formatTL = (kurus) => {
  if (kurus == null || isNaN(kurus)) return '₺0';
  const tl = Math.round(kurus / 100);
  return '₺' + new Intl.NumberFormat('tr-TR').format(tl);
};

export const formatKisa = (kurus) => {
  if (kurus == null || isNaN(kurus)) return '₺0';
  const tl = kurus / 100;
  if (Math.abs(tl) >= 1e9) return '₺' + (tl / 1e9).toFixed(2) + 'Mr';
  if (Math.abs(tl) >= 1e6) return '₺' + (tl / 1e6).toFixed(2) + 'M';
  if (Math.abs(tl) >= 1e3) return '₺' + (tl / 1e3).toFixed(1) + 'K';
  return '₺' + Math.round(tl);
};

export const tlToKurus = (tl) => Math.round((Number(tl) || 0) * 100);
export const kurusToTl = (kurus) => (Number(kurus) || 0) / 100;

/* ════════════ NPV / IRR / Payback ════════════ */

/**
 * NPV — Net Present Value
 * @param {number} iskontoAylik — ondalık (ör. 0.05 = %5)
 * @param {number[]} akislar — aylık nakit akışı, kuruş (akislar[0] = bugün)
 * @returns {number} NPV (kuruş, integer)
 */
export function npv(iskontoAylik, akislar) {
  if (!Array.isArray(akislar) || akislar.length === 0) return 0;
  let toplam = 0;
  for (let t = 0; t < akislar.length; t++) {
    toplam += akislar[t] / Math.pow(1 + iskontoAylik, t);
  }
  return Math.round(toplam);
}

/**
 * IRR — Internal Rate of Return (Newton-Raphson)
 * @param {number[]} akislar — aylık kuruş
 * @returns {number|null} aylık IRR ondalık (null = yakınsama yok)
 */
export function irr(akislar, guess = 0.01) {
  if (!Array.isArray(akislar) || akislar.length < 2) return null;
  // En az bir pozitif, bir negatif gerekli
  let pos = false, neg = false;
  for (const a of akislar) { if (a > 0) pos = true; if (a < 0) neg = true; }
  if (!pos || !neg) return null;

  let rate = guess;
  for (let iter = 0; iter < 200; iter++) {
    let f = 0, df = 0;
    for (let t = 0; t < akislar.length; t++) {
      const denom = Math.pow(1 + rate, t);
      f += akislar[t] / denom;
      if (t > 0) df += -t * akislar[t] / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(df) < 1e-15) break;
    const yeni = rate - f / df;
    if (!isFinite(yeni)) return null;
    if (Math.abs(yeni - rate) < 1e-8) return yeni;
    rate = yeni;
    if (rate < -0.999) rate = -0.99; // alt sınır
  }
  return rate;
}

/** Payback — kaç ayda geri döner */
export function payback(akislar) {
  let kum = 0;
  for (let t = 0; t < akislar.length; t++) {
    kum += akislar[t];
    if (kum >= 0) return t;
  }
  return null;
}

/* ════════════ Vergi & Harç ════════════ */

/** KDV oranı — daire m² ve lüks durumuna göre (%) */
export function kdvOrani(netM2, lux = false) {
  if (lux) return 20;
  if (netM2 <= 150) return 1;
  if (netM2 <= 200) return 10;
  return 20;
}

/**
 * Tüm vergi ve harçları hesapla (kuruş)
 * @param {object} g — { satisGeliriKurus, arsaPayiKurus, muteahhitKarKurus, daireList: [{netM2}] }
 */
export function vergiHesapla(g) {
  const satis = g.satisGeliriKurus || 0;
  const arsaPayi = g.arsaPayiKurus || 0;
  const muteahhitKar = g.muteahhitKarKurus || 0;
  const lux = g.lux || false;

  // KDV — daire bazında ortalama (basitleştirilmiş)
  let toplamKdv = 0;
  if (g.daireList && g.daireList.length) {
    const daireGeliri = Math.round(satis / g.daireList.length);
    for (const d of g.daireList) {
      const oran = kdvOrani(d.netM2 || 120, lux);
      toplamKdv += Math.round((daireGeliri * oran) / 100);
    }
  } else {
    toplamKdv = Math.round((satis * (lux ? 20 : 10)) / 100);
  }

  // Tapu harcı — müteahhit %2
  const tapuHarci = Math.round((arsaPayi * 2) / 100);
  // Damga vergisi binde 9.48 (arsa payı sözleşmesi)
  const damga = Math.round((arsaPayi * 9.48) / 1000);
  // Kat irtifakı binde 5
  const katIrtifaki = Math.round((satis * 5) / 1000);
  // Emlak beyanı tahmini binde 2
  const emlak = Math.round((satis * 2) / 1000);
  // Kurumlar vergisi %25
  const kurumlar = Math.max(0, Math.round((muteahhitKar * 25) / 100));

  const toplam = toplamKdv + tapuHarci + damga + katIrtifaki + emlak + kurumlar;

  return {
    kdvKurus: toplamKdv,
    tapuHarciKurus: tapuHarci,
    damgaKurus: damga,
    katIrtifakiKurus: katIrtifaki,
    emlakKurus: emlak,
    kurumlarKurus: kurumlar,
    toplamKurus: toplam,
  };
}

/* ════════════ Kredi & Finansman ════════════ */

/**
 * Kredi & kapitalize faiz hesabı — S-eğrisi çekiliş varsayımı
 * @param {object} k — { toplamMaliyetKurus, ozkaynakOran, aylikFaiz, sure, kkdf, bsmv }
 */
export function krediHesapla(k) {
  const toplam = k.toplamMaliyetKurus || 0;
  const ozkaynakOran = (k.ozkaynakOran || 30) / 100;
  const aylikFaiz = (k.aylikFaiz || 3.5) / 100;
  const kkdf = (k.kkdf || 15) / 100;
  const bsmv = (k.bsmv || 5) / 100;
  const sure = k.sure || 24;

  const ozkaynak = Math.round(toplam * ozkaynakOran);
  const krediTutari = toplam - ozkaynak;

  // S-eğrisi: aylık çekiliş dağılımı (normal distr approx)
  const cekilis = [];
  let toplamAgirlik = 0;
  for (let t = 0; t < sure; t++) {
    const x = (t - sure / 2) / (sure / 4);
    const w = Math.exp(-0.5 * x * x); // gaussian
    cekilis.push(w);
    toplamAgirlik += w;
  }
  const aylikCekilis = cekilis.map(w =>
    Math.round((krediTutari * w) / toplamAgirlik)
  );

  // Kapitalize faiz: her ay birikmiş bakiye × (faiz + kkdf×faiz + bsmv×faiz)
  const efektifFaiz = aylikFaiz * (1 + kkdf + bsmv);
  let bakiye = 0;
  let toplamFaiz = 0;
  const faizProfili = [];
  for (let t = 0; t < sure; t++) {
    bakiye += aylikCekilis[t];
    const faiz = Math.round(bakiye * efektifFaiz);
    toplamFaiz += faiz;
    faizProfili.push(faiz);
    bakiye += faiz; // kapitalize
  }

  return {
    ozkaynakKurus: ozkaynak,
    krediTutariKurus: krediTutari,
    toplamFaizKurus: toplamFaiz,
    efektifFaiz,
    aylikCekilisKurus: aylikCekilis,
    faizProfiliKurus: faizProfili,
    toplamGeriOdemeKurus: krediTutari + toplamFaiz,
  };
}

/* ════════════ Nakit Akışı (Faz Tablosu) ════════════ */

export const VARSAYILAN_FAZLAR = [
  { faz: 'Ruhsat/Proje',    ay: 3, maliyetOran: 5  },
  { faz: 'Temel/Kaba',      ay: 6, maliyetOran: 35 },
  { faz: 'Kaba Bitiş',      ay: 4, maliyetOran: 25 },
  { faz: 'İnce İşler',      ay: 6, maliyetOran: 25 },
  { faz: 'İskan & Teslim',  ay: 3, maliyetOran: 10 },
];

/**
 * Aylık nakit akışı üret (kuruş)
 * @returns {number[]} [ay0, ay1, ..., ayN]
 */
export function nakitAkisiUret({ toplamMaliyetKurus, satisGeliriKurus, fazlar, satisHiziAy }) {
  const f = fazlar || VARSAYILAN_FAZLAR;
  const toplamAy = f.reduce((a, x) => a + x.ay, 0);
  const akis = new Array(toplamAy + 1).fill(0);

  // Maliyet dağıt
  let ay = 0;
  for (const faz of f) {
    const fazTutar = Math.round((toplamMaliyetKurus * faz.maliyetOran) / 100);
    const aylikPay = Math.round(fazTutar / faz.ay);
    for (let i = 0; i < faz.ay; i++) {
      akis[ay + i] -= aylikPay;
    }
    ay += faz.ay;
  }

  // Satış geliri — son 1/3 faz boyunca lineer dağılım + satış hızı ile teslim sonrası
  const satisBaslangic = Math.floor(toplamAy * 0.55);
  const satisSure = (satisHiziAy || 12);
  const satisBitis = Math.min(satisBaslangic + satisSure, toplamAy);
  const satisAy = Math.max(1, satisBitis - satisBaslangic);
  const aylikSatis = Math.round(satisGeliriKurus / satisAy);
  for (let t = satisBaslangic; t < satisBitis; t++) {
    akis[t] += aylikSatis;
  }
  // Kalan bakiye son aya
  const toplamDagitilan = aylikSatis * satisAy;
  akis[toplamAy] += satisGeliriKurus - toplamDagitilan;

  return akis;
}

/* ════════════ Monte Carlo ════════════ */

/**
 * Monte Carlo simülasyon
 * @param {object} cfg — {
 *   baz: {...hesap girdileri},
 *   bantlar: { satisFiyati: 0.20, maliyet: 0.15, ... },
 *   iter: 10000,
 *   hesapla: (p) => ({ netKarKurus })
 * }
 */
export function monteCarlo({ baz, bantlar, iter = 10000, hesapla }) {
  const sonuclar = new Array(iter);
  const tornadoKayit = {}; // değişken → [{delta, karDelta}]
  const baseKar = hesapla(baz).netKarKurus || 0;

  // Tornado için baz±1σ koşumları
  const tornadoDegiskenler = Object.keys(bantlar);
  const tornadoSonuc = {};
  for (const k of tornadoDegiskenler) {
    const bant = bantlar[k];
    const artiP = { ...baz, [k]: baz[k] * (1 + bant) };
    const eksiP = { ...baz, [k]: baz[k] * (1 - bant) };
    const arti = hesapla(artiP).netKarKurus || 0;
    const eksi = hesapla(eksiP).netKarKurus || 0;
    tornadoSonuc[k] = {
      arti: arti - baseKar,
      eksi: eksi - baseKar,
      araligi: Math.abs(arti - eksi),
    };
  }

  // Ana Monte Carlo
  for (let i = 0; i < iter; i++) {
    const p = { ...baz };
    for (const k in bantlar) {
      const bant = bantlar[k];
      // Triangular dağılım (mode = baz)
      const u = Math.random();
      const c = 0.5;
      const delta = u < c
        ? -bant + Math.sqrt(u * 2 * bant * bant)
        :  bant - Math.sqrt((1 - u) * 2 * bant * bant);
      p[k] = baz[k] * (1 + delta);
    }
    const r = hesapla(p);
    sonuclar[i] = r.netKarKurus || 0;
  }

  sonuclar.sort((a, b) => a - b);
  const p10 = sonuclar[Math.floor(iter * 0.10)];
  const p50 = sonuclar[Math.floor(iter * 0.50)];
  const p90 = sonuclar[Math.floor(iter * 0.90)];
  const zararSayisi = sonuclar.filter(x => x < 0).length;
  const zararOlasi = (zararSayisi / iter) * 100;

  // Histogram — 20 bucket
  const min = sonuclar[0], max = sonuclar[iter - 1];
  const binSayi = 20;
  const binSize = (max - min) / binSayi || 1;
  const histogram = new Array(binSayi).fill(0).map((_, i) => ({
    x0: min + i * binSize,
    x1: min + (i + 1) * binSize,
    count: 0,
  }));
  for (const s of sonuclar) {
    let idx = Math.floor((s - min) / binSize);
    if (idx >= binSayi) idx = binSayi - 1;
    if (idx < 0) idx = 0;
    histogram[idx].count++;
  }

  return { p10, p50, p90, zararOlasi, histogram, tornado: tornadoSonuc, baseKar };
}

/* ════════════ Reel Getiri (TÜFE/USD/Altın) ════════════ */

export function reelGetiri({ nominalKarKurus, tufeYillik, usdBas, usdBit, altinBas, altinBit }) {
  const tufe = (tufeYillik || 0) / 100;
  const reelTL = Math.round(nominalKarKurus / (1 + tufe));
  const karUSD = usdBit > 0 ? (nominalKarKurus / 100) / usdBit : 0;
  const karAltin = altinBit > 0 ? (nominalKarKurus / 100) / altinBit : 0;
  return {
    reelTLKurus: reelTL,
    karUSD: Math.round(karUSD),
    karAltinGram: Math.round(karAltin),
  };
}

/* ════════════ Gelişmiş Risk Skoru (10 Faktör Ağırlıklı) ════════════ */

export const RISK_AGIRLIKLAR = {
  karMarji: 20, irr: 15, dscr: 10, breakEvenGuvenlik: 10,
  arsaBedelOrani: 10, satisHizi: 8, bolgeLikidite: 7,
  imarBelirsizlik: 7, dovizKur: 7, enflasyon: 6,
};

/** Her faktör 0-100 (yüksek = iyi). Ağırlıklı ortalamanın 100'den çıkarılmışı risk skoru. */
export function riskSkoru(f) {
  const n = (v, iyiMin, iyiMax) => {
    if (v >= iyiMax) return 100;
    if (v <= iyiMin) return 0;
    return ((v - iyiMin) / (iyiMax - iyiMin)) * 100;
  };
  const puanlar = {
    karMarji:          n(f.karMarji || 0, 5, 35),
    irr:               n((f.irrAylik || 0) * 12 * 100, 5, 40),
    dscr:              n(f.dscr || 0, 1, 2.5),
    breakEvenGuvenlik: n(f.breakEvenGuvenlik || 0, 0, 40),
    arsaBedelOrani:    100 - n(f.arsaBedelOrani || 0, 20, 55),
    satisHizi:         n(f.satisHizi || 50, 20, 100),
    bolgeLikidite:     f.bolgeLikidite || 50,
    imarBelirsizlik:   100 - (f.imarBelirsizlik || 30),
    dovizKur:          100 - (f.dovizKur || 40),
    enflasyon:         100 - (f.enflasyon || 50),
  };

  let toplamAgirlik = 0, toplamPuan = 0;
  for (const k in RISK_AGIRLIKLAR) {
    toplamAgirlik += RISK_AGIRLIKLAR[k];
    toplamPuan += RISK_AGIRLIKLAR[k] * (puanlar[k] || 0);
  }
  const iyilik = toplamPuan / toplamAgirlik;
  const risk = Math.round(100 - iyilik);
  return { skor: risk, puanlar };
}
