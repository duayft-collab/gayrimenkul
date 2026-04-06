/**
 * @file core/vergiHesap.js
 * @description Vergi hesaplama motoru — portföy + mülk bazlı yıllık özet
 * @anayasa K10 kuruş integer · K11 workspace
 *
 * 2026 GMSİ istisna: 47.000 TL = 4.700.000 kuruş (parametrik)
 * Götürü gider oranı: %15 (mevzuat)
 */
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { gmsiVergisi, kiraStopaji, emlakVergisi, gecikmeFaizi as hGecikmeFaizi } from './hesaplamalar';
import { odemeTlKurus } from './odemelerDb';

/* ════ Yıl bazlı GMSİ istisnası ════ */
export const ISTISNA_YIL = {
  2023: 21_000_00,
  2024: 33_000_00,
  2025: 47_000_00,
  2026: 47_000_00,
  2027: 55_000_00,
};

export function istisnaUygula(toplamGmsiKurus, yil) {
  const istisna = ISTISNA_YIL[yil] || 47_000_00;
  return Math.max(0, toplamGmsiKurus - istisna);
}

/* ════ Gecikme faizi (Tahsilat Genel Tebliği) ════ */
export function gecikmeFaizi(odenmemisTutarKurus, gecikmeGun, yillikYuzde = 42) {
  return hGecikmeFaizi(odenmemisTutarKurus, gecikmeGun, yillikYuzde);
}

/* ════ Tarih yardımcıları ════ */
function tarihAl(v) {
  if (!v) return null;
  if (v.toDate) return v.toDate();
  const d = new Date(v);
  return isNaN(d) ? null : d;
}
const yilCheck = (d, yil) => d && d.getFullYear() === yil;

/* ════ Yıllık brüt kira hesabı (kira + tahsil edilen) ════ */
function yillikBrutKira(odemeler, mulkId, yil) {
  return (odemeler || [])
    .filter(o => !o.isDeleted && o.mulkId === mulkId && o.tip === 'kira')
    .filter(o => {
      const t = tarihAl(o.odemeTarihi || o.vadeTarihi);
      return yilCheck(t, yil);
    })
    .reduce((a, o) => a + odemeTlKurus(o), 0);
}

/* ════ Gider toplamı (giderler collection) ════ */
async function gercekGiderTopla(workspaceId, mulkId, yil) {
  try {
    const q = query(
      collection(db, 'giderler'),
      where('workspaceId', '==', workspaceId),
      where('mulkId', '==', mulkId),
      where('isDeleted', '==', false),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => d.data())
      .filter(g => {
        const t = tarihAl(g.tarih);
        return yilCheck(t, yil);
      })
      .reduce((a, g) => a + (g.tutarKurus || 0), 0);
  } catch {
    return 0;
  }
}

/* ════ Mülk bazlı vergi kartı ════ */
export async function mulkBazliVergi(mulk, kiralar, odemeler, yil, mod = 'goturu') {
  const brut = yillikBrutKira(odemeler, mulk.id, yil);
  let gider;
  if (mod === 'goturu') {
    gider = Math.round(brut * 0.15); // %15 götürü
  } else {
    const gercek = await gercekGiderTopla(mulk.workspaceId || mulk.ws, mulk.id, yil);
    // + amortisman %2/yıl
    const fiyatKurus = (mulk.fiyat || mulk.currentPrice || 0) * 100;
    const amortisman = Math.round(fiyatKurus * 0.02);
    // + emlak vergisi (mülk türüne göre)
    const emlak = emlakVergisi(fiyatKurus, mulk.tur || 'konut');
    gider = gercek + amortisman + emlak;
  }
  const matrah = Math.max(0, brut - gider);
  const gmsiResult = gmsiVergisi(matrah, 0); // istisna ayrıca uygulanacak
  const fiyatKurus = (mulk.fiyat || mulk.currentPrice || 0) * 100;
  const emlakV = emlakVergisi(fiyatKurus, mulk.tur || 'konut');
  return {
    mulkId: mulk.id,
    ad: mulk.ad || '—',
    brutKurus: brut,
    giderKurus: gider,
    matrahKurus: matrah,
    gmsiVergiKurus: gmsiResult.vergi,
    emlakVergiKurus: emlakV,
    toplamKurus: gmsiResult.vergi + emlakV,
    mod,
  };
}

/* ════ Portföy yıllık vergi özeti ════ */
export async function portfoyVergiOzeti(workspaceId, yil, mod = 'goturu') {
  if (!workspaceId) return null;
  // 1) Mülkleri çek
  let mulkler = [];
  try {
    const q = query(
      collection(db, 'mulkler'),
      where('workspaceId', '==', workspaceId),
      where('isDeleted', '==', false),
    );
    const snap = await getDocs(q);
    mulkler = snap.docs.map(d => ({ id: d.id, ws: workspaceId, ...d.data() }));
  } catch (e) { console.warn('[vergiHesap mulk]', e); }

  // 2) Kira sözleşmeleri
  let kiralar = [];
  try {
    const q = query(
      collection(db, 'kiralar'),
      where('workspaceId', '==', workspaceId),
      where('isDeleted', '==', false),
    );
    const snap = await getDocs(q);
    kiralar = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { console.warn('[vergiHesap kira]', e); }

  // 3) Ödemeler (yıl)
  let odemeler = [];
  try {
    const q = query(
      collection(db, 'odemeler'),
      where('workspaceId', '==', workspaceId),
      where('isDeleted', '==', false),
    );
    const snap = await getDocs(q);
    odemeler = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { console.warn('[vergiHesap odeme]', e); }

  // 4) Mülk bazlı detaylı tablo
  const mulkBazli = [];
  for (const m of mulkler) {
    const r = await mulkBazliVergi(m, kiralar, odemeler, yil, mod);
    if (r.brutKurus > 0 || r.emlakVergiKurus > 0) mulkBazli.push(r);
  }

  const yillikBrutKiraKurus = mulkBazli.reduce((a, m) => a + m.brutKurus, 0);
  const toplamGiderKurus = mulkBazli.reduce((a, m) => a + m.giderKurus, 0);
  const matrahHam = Math.max(0, yillikBrutKiraKurus - toplamGiderKurus);
  const istisnaDusuluKurus = istisnaUygula(matrahHam, yil);
  const gmsiResult = gmsiVergisi(istisnaDusuluKurus, 0);
  const stopajResult = kiraStopaji(yillikBrutKiraKurus, 20);
  const emlakVergiKurus = mulkBazli.reduce((a, m) => a + m.emlakVergiKurus, 0);
  const toplamVergi = gmsiResult.vergi + emlakVergiKurus;

  // Aylık dağılım
  const aylikDagilim = new Array(12).fill(0);
  for (const o of odemeler) {
    if (o.isDeleted || o.tip !== 'kira') continue;
    const t = tarihAl(o.odemeTarihi || o.vadeTarihi);
    if (!yilCheck(t, yil)) continue;
    aylikDagilim[t.getMonth()] += odemeTlKurus(o);
  }

  // Geçen yılla karşılaştırma
  let gecenYilFark = 0;
  try {
    const gecen = await portfoyVergiOzetiQuick(workspaceId, yil - 1, mod);
    gecenYilFark = toplamVergi - (gecen?.toplamVergiKurus || 0);
  } catch {}

  return {
    yil,
    yillikBrutKiraKurus,
    toplamGiderKurus,
    istisnaDusuluKurus,
    matrahKurus: matrahHam,
    gmsiVergiKurus: gmsiResult.vergi,
    stopajKurus: stopajResult.stopaj,
    emlakVergiKurus,
    toplamVergiKurus: toplamVergi,
    mulkBazli,
    aylikDagilim,
    gecenYilFark,
    mulkSayisi: mulkler.length,
    aktifKira: kiralar.filter(k => k.durum === 'dolu').length,
  };
}

/* Hızlı versiyon — geçen yıl karşılaştırma için (sadece toplam, mulk listesi okuma yok) */
async function portfoyVergiOzetiQuick(workspaceId, yil, mod) {
  // Recursive olmaması için basit hesap
  let odemeler = [];
  try {
    const q = query(
      collection(db, 'odemeler'),
      where('workspaceId', '==', workspaceId),
      where('isDeleted', '==', false),
    );
    const snap = await getDocs(q);
    odemeler = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { return null; }
  let brut = 0;
  for (const o of odemeler) {
    if (o.isDeleted || o.tip !== 'kira') continue;
    const t = tarihAl(o.odemeTarihi || o.vadeTarihi);
    if (!yilCheck(t, yil)) continue;
    brut += odemeTlKurus(o);
  }
  const gider = Math.round(brut * (mod === 'goturu' ? 0.15 : 0.20));
  const matrah = Math.max(0, brut - gider);
  const istisnaDusulu = istisnaUygula(matrah, yil);
  const v = gmsiVergisi(istisnaDusulu, 0);
  return { toplamVergiKurus: v.vergi };
}
