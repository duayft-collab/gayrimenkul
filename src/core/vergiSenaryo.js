/**
 * @file core/vergiSenaryo.js
 * @description What-If simülatörü — sat/al/artış/5 yıl projection
 * @anayasa K10 kuruş integer
 */
import { portfoyVergiOzeti, ISTISNA_YIL, istisnaUygula } from './vergiHesap';
import { gmsiVergisi } from './hesaplamalar';
import { karsilastirma } from './vergiGider';

/**
 * Mülk sat senaryosu — sermaye kazancı + 5 yıl muafiyet kontrolü
 */
export async function senaryoMulkSat({ workspaceId, mulk, satisFiyatKurus, yil }) {
  const alis = (mulk.buyPrice || 0) * 100;
  const satis = satisFiyatKurus;
  const sermayeKazanci = Math.max(0, satis - alis);

  // 5 yıl muafiyet — alış tarihi → satış tarihi 5 yıldan uzunsa muaf
  const alisT = mulk.buyDate?.toDate ? mulk.buyDate.toDate() : (mulk.buyDate ? new Date(mulk.buyDate) : null);
  let muafiyetUyumu = false;
  if (alisT) {
    const fark = (Date.now() - alisT.getTime()) / (1000 * 60 * 60 * 24 * 365);
    muafiyetUyumu = fark >= 5;
  }

  // Vergi: muafiyet yoksa kademeli (basit %20 varsayım)
  const vergiKurus = muafiyetUyumu ? 0 : Math.round(sermayeKazanci * 0.20);

  // Yıllık vergi yükündeki değişim — kira gelirini kaybedecek
  const ozet = await portfoyVergiOzeti(workspaceId, yil);
  const yillikKira = ozet?.mulkBazli?.find(m => m.mulkId === mulk.id)?.brutKurus || 0;
  const yillikVergiKaybi = Math.round(yillikKira * 0.15); // yaklaşık

  return {
    alisKurus: alis,
    satisKurus: satis,
    sermayeKazanciKurus: sermayeKazanci,
    muafiyetUyumu,
    vergiKurus,
    yillikKiraKaybiKurus: yillikKira,
    yillikVergiAzalmasiKurus: yillikVergiKaybi,
    mesaj: muafiyetUyumu
      ? `✓ 5 yıl muafiyet uygun — ${(sermayeKazanci / 100).toFixed(0)}₺ vergisiz kazanç`
      : `⚠️ Sermaye kazancı vergisi: ${(vergiKurus / 100).toFixed(0)}₺`,
  };
}

/**
 * Kira artış senaryosu — yeni vergi yükü + dilim sıçraması
 */
export async function senaryoKiraArtis({ workspaceId, artisYuzde, yil }) {
  const mevcut = await portfoyVergiOzeti(workspaceId, yil);
  if (!mevcut) return null;

  const carpan = 1 + (artisYuzde / 100);
  const yeniBrut = Math.round(mevcut.yillikBrutKiraKurus * carpan);
  const yeniGider = Math.round(mevcut.toplamGiderKurus * carpan); // götürü %15 oranlı
  const yeniMatrah = Math.max(0, yeniBrut - yeniGider);
  const yeniIstisnaSonrasi = istisnaUygula(yeniMatrah, yil);
  const yeniVergi = gmsiVergisi(yeniIstisnaSonrasi, 0).vergi;

  const fark = yeniVergi - mevcut.gmsiVergiKurus;
  // Dilim sıçraması: önceki vs yeni dilime göre
  const eskiOran = mevcut.matrahKurus > 0 ? mevcut.gmsiVergiKurus / mevcut.matrahKurus : 0;
  const yeniOran = yeniMatrah > 0 ? yeniVergi / yeniMatrah : 0;
  const kademeAtladi = yeniOran > eskiOran + 0.02;

  return {
    eskiBrutKurus: mevcut.yillikBrutKiraKurus,
    yeniBrutKurus: yeniBrut,
    eskiVergiKurus: mevcut.gmsiVergiKurus,
    yeniVergiKurus: yeniVergi,
    farkKurus: fark,
    kademeAtladi,
    artisYuzde,
  };
}

/**
 * Yeni mülk al senaryosu
 */
export async function senaryoMulkAl({ workspaceId, alimFiyatKurus, beklenenAylikKiraKurus, yil }) {
  const mevcut = await portfoyVergiOzeti(workspaceId, yil);
  if (!mevcut) return null;

  const ekYillikKira = beklenenAylikKiraKurus * 12;
  const yeniBrut = mevcut.yillikBrutKiraKurus + ekYillikKira;
  const yeniGider = Math.round(yeniBrut * 0.15); // götürü
  const yeniMatrah = Math.max(0, yeniBrut - yeniGider);
  const yeniIstisnaSonrasi = istisnaUygula(yeniMatrah, yil);
  const yeniVergi = gmsiVergisi(yeniIstisnaSonrasi, 0).vergi;
  const ekVergi = yeniVergi - mevcut.gmsiVergiKurus;

  const capRate = alimFiyatKurus > 0 ? (ekYillikKira / alimFiyatKurus) * 100 : 0;
  const geriDonusYil = ekYillikKira > 0 ? alimFiyatKurus / ekYillikKira : 0;

  return {
    alimFiyatKurus,
    ekYillikKiraKurus: ekYillikKira,
    yeniBrutKurus: yeniBrut,
    yeniVergiKurus: yeniVergi,
    ekVergiKurus: ekVergi,
    capRateYuzde: capRate,
    geriDonusYili: geriDonusYil,
    netGetiriKurus: ekYillikKira - ekVergi,
  };
}

/**
 * 5 yıllık projeksiyon
 */
export async function senaryo5Yil({ workspaceId, varsayilanArtis = 25, tufeArtis = 30 }) {
  const bazYil = new Date().getFullYear();
  const baz = await portfoyVergiOzeti(workspaceId, bazYil);
  if (!baz) return [];

  const sonuclar = [];
  let brut = baz.yillikBrutKiraKurus;
  for (let i = 0; i < 5; i++) {
    const yil = bazYil + i;
    if (i > 0) brut = Math.round(brut * (1 + varsayilanArtis / 100));
    const gider = Math.round(brut * 0.15);
    const matrah = Math.max(0, brut - gider);
    const istisnaSonrasi = istisnaUygula(matrah, yil);
    const vergi = gmsiVergisi(istisnaSonrasi, 0).vergi;
    const reelGetiri = brut - vergi;
    // TÜFE düşüşü
    const reelDeger = Math.round(reelGetiri / Math.pow(1 + tufeArtis / 100, i));
    sonuclar.push({
      yil,
      brutKurus: brut,
      vergiKurus: vergi,
      reelGetiriKurus: reelGetiri,
      reelDegerKurus: reelDeger,
    });
  }
  return sonuclar;
}

/**
 * Götürü vs Gerçek 5 yıl karşılaştırma — kırılma yılı
 */
export async function senaryoGoturuVsGercek5Yil({ workspaceId, mulk }) {
  const bazYil = new Date().getFullYear();
  const sonuclar = [];
  let kirilmaYili = null;
  let toplamGoturu = 0, toplamGercek = 0;

  for (let i = 0; i < 5; i++) {
    const yil = bazYil - i; // geçmiş 5 yıl
    const ozet = await portfoyVergiOzeti(workspaceId, yil, 'goturu');
    const mulkRow = ozet?.mulkBazli?.find(m => m.mulkId === mulk.id);
    if (!mulkRow) continue;
    const k = await karsilastirma({
      workspaceId,
      mulkId: mulk.id,
      brutKiraKurus: mulkRow.brutKurus,
      yil,
      mulkDegerKurus: (mulk.fiyat || 0) * 100,
    });
    sonuclar.unshift({
      yil,
      goturu: k.vergiGoturuKurus,
      gercek: k.vergiGercekKurus,
      kazanc: k.tasarrufKurus,
      tavsiye: k.tavsiye,
    });
    toplamGoturu += k.vergiGoturuKurus;
    toplamGercek += k.vergiGercekKurus;
    if (k.tavsiye === 'gercek' && !kirilmaYili) kirilmaYili = yil;
  }

  return {
    sonuclar,
    toplamGoturu,
    toplamGercek,
    toplamTasarruf: Math.abs(toplamGoturu - toplamGercek),
    kirilmaYili,
  };
}
