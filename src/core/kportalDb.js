/**
 * @file core/kportalDb.js
 * @description Kiracı Self-Servis Portal — public (auth'suz) yazma operasyonları
 * @anayasa K02 auth yok, token bazlı · K06 soft cancel · K10 kuruş integer
 *          K11 workspace (token→kiraci→workspaceId) · K14 islemLogu audit
 */
import {
  collection, doc, addDoc, getDoc, getDocs, query, where,
  serverTimestamp, Timestamp
} from 'firebase/firestore';
import { ref as sref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { kportalTokenCoz } from './paylasim';
import { odemeTlKurus, kiraciBakiyeHesapla } from './odemelerDb';
import { bildirimOlustur } from './bildirimlerDb';

/* ════ Rate limit helpers ════ */
const COOLDOWN_MS = 60 * 1000;

function rateLimitCheck(token) {
  try {
    const key = 'kportal_last_submit_' + token.slice(0, 20);
    const son = parseInt(localStorage.getItem(key) || '0', 10);
    const fark = Date.now() - son;
    if (fark < COOLDOWN_MS) {
      const kalanSn = Math.ceil((COOLDOWN_MS - fark) / 1000);
      throw new Error(`Çok hızlı denediniz, ${kalanSn} saniye bekleyin`);
    }
  } catch (e) {
    if (e.message.includes('bekleyin')) throw e;
  }
}

function rateLimitSet(token) {
  try {
    const key = 'kportal_last_submit_' + token.slice(0, 20);
    localStorage.setItem(key, String(Date.now()));
  } catch {}
}

/* ════ IP / UA yardımcıları ════ */
async function ipAl() {
  try {
    const r = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.ip || null;
  } catch { return null; }
}

/* ════ Ana fonksiyonlar ════ */

/**
 * Kiracı özet — bakiye, bu ay kira, ödeme geçmişi (son 12)
 */
export async function kportalKiraciOzet(token) {
  const kiraci = await kportalTokenCoz(token);
  const ws = kiraci.workspaceId;

  // Aktif kira sözleşmesi
  let aktifKira = null;
  try {
    const kiraQ = query(
      collection(db, 'kiralar'),
      where('workspaceId', '==', ws),
      where('kiraciId', '==', kiraci.id),
      where('isDeleted', '==', false),
    );
    const kiraSnap = await getDocs(kiraQ);
    const kiralar = kiraSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    aktifKira = kiralar.find(k => k.durum === 'dolu') || kiralar[0] || null;
  } catch (e) {
    console.warn('[kportal kira]', e.message);
  }

  // Mülk bilgisi
  let mulk = null;
  if (aktifKira?.mulkId) {
    try {
      const mSnap = await getDoc(doc(db, 'mulkler', aktifKira.mulkId));
      if (mSnap.exists()) mulk = { id: mSnap.id, ...mSnap.data() };
    } catch {}
  }

  // Ödemeler — son 12
  let odemeler = [];
  try {
    const oQ = query(
      collection(db, 'odemeler'),
      where('workspaceId', '==', ws),
      where('kiraciId', '==', kiraci.id),
      where('isDeleted', '==', false),
    );
    const oSnap = await getDocs(oQ);
    odemeler = oSnap.docs.map(d => {
      const veri = { id: d.id, ...d.data() };
      // Backward compat: durum yoksa 'onaylandi'
      if (!veri.durum) veri.durum = 'onaylandi';
      return veri;
    });
    // Tarih bazlı sırala (yeni önce)
    odemeler.sort((a, b) => {
      const va = a.vadeTarihi?.toDate ? a.vadeTarihi.toDate() : new Date(a.vadeTarihi || 0);
      const vb = b.vadeTarihi?.toDate ? b.vadeTarihi.toDate() : new Date(b.vadeTarihi || 0);
      return vb - va;
    });
  } catch (e) {
    console.warn('[kportal odemeler]', e.message);
  }

  // Bakiye — sadece onaylandı olanları say
  const onaylanan = odemeler.filter(o => o.durum === 'onaylandi');
  const bekleme = odemeler.filter(o => o.durum !== 'onaylandi' && o.durum !== 'reddedildi');
  const bakiye = kiraciBakiyeHesapla(onaylanan);

  // Bu ay kira
  const bugun = new Date();
  const ayIlk = new Date(bugun.getFullYear(), bugun.getMonth(), 1);
  const aySon = new Date(bugun.getFullYear(), bugun.getMonth() + 1, 0, 23, 59, 59);
  const buAyOdemeler = odemeler.filter(o => {
    if (o.tip !== 'kira') return false;
    const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi || 0);
    return v >= ayIlk && v <= aySon;
  });
  const buAyKira = buAyOdemeler[0] || null;

  // IBAN bilgi (aktif kiradan)
  const ibanBilgi = aktifKira?.iban || mulk?.iban || null;

  return {
    kiraci,
    kira: aktifKira,
    mulk,
    odemeler: odemeler.slice(0, 12),
    bekleme,
    bakiyeKurus: bakiye.bakiyeKurus,
    toplamOdenenKurus: bakiye.toplamOdenenKurus,
    toplamBeklenenKurus: bakiye.toplamBeklenenKurus,
    gecikmisKurus: bakiye.gecikmisKurus,
    buAyKira,
    buAyTutarKurus: buAyKira?.tutarKurus || aktifKira?.aylikKiraKurus || 0,
    buAyVade: buAyKira?.vadeTarihi || null,
    buAyDurum: buAyKira?.durum || 'yok',
    ibanBilgi,
    workspaceId: ws,
  };
}

/**
 * Kiracı dekont yükle — Storage'a yazar
 */
export async function kportalDekontYukle(token, file) {
  if (!file) throw new Error('Dosya seçilmedi');

  const MAX = 5 * 1024 * 1024;
  const IZINLI = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (file.size > MAX) throw new Error(`Dosya 5 MB'dan büyük (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
  if (!IZINLI.includes(file.type)) throw new Error('Sadece JPG, PNG, WEBP veya PDF yükleyebilirsiniz');

  const kiraci = await kportalTokenCoz(token);
  const ws = kiraci.workspaceId;

  const temizAd = (file.name || 'dekont').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const yol = `kportal/${ws}/${kiraci.id}/${Date.now()}_${temizAd}`;
  const r = sref(storage, yol);
  const snap = await uploadBytes(r, file, {
    customMetadata: { kaynak: 'kportal', kiraciId: kiraci.id, orijinalAd: file.name },
  });
  const url = await getDownloadURL(snap.ref);
  return {
    url,
    yol,
    ad: file.name,
    boyut: file.size,
    tip: file.type,
  };
}

/**
 * Kiracı ödeme bildirimi gönder
 */
export async function kportalOdemeBildir(token, { donem, tutarKurus, tarih, dekontUrl, aciklama }) {
  // 1) Validasyon
  if (!token) throw new Error('Token yok');
  if (!tutarKurus || tutarKurus <= 0) throw new Error('Tutar geçersiz');
  if (!tarih) throw new Error('Ödeme tarihi zorunlu');
  const tarihD = new Date(tarih);
  if (isNaN(tarihD.getTime())) throw new Error('Tarih geçersiz');
  const bugun = new Date(); bugun.setHours(23, 59, 59, 999);
  if (tarihD > bugun) throw new Error('Gelecek tarih girilemez');
  if (!dekontUrl) throw new Error('Dekont zorunlu — önce dosya yükleyin');

  // 2) Rate limit
  rateLimitCheck(token);

  // 3) Kiracı + workspace doğrula
  const kiraci = await kportalTokenCoz(token);
  const ws = kiraci.workspaceId;

  // 4) Aktif kirayı bul (kira/mülk referansı için)
  let kiraId = null, mulkId = null;
  try {
    const kiraQ = query(
      collection(db, 'kiralar'),
      where('workspaceId', '==', ws),
      where('kiraciId', '==', kiraci.id),
      where('isDeleted', '==', false),
    );
    const kiraSnap = await getDocs(kiraQ);
    const aktif = kiraSnap.docs.map(d => ({ id: d.id, ...d.data() })).find(k => k.durum === 'dolu');
    if (aktif) {
      kiraId = aktif.id;
      mulkId = aktif.mulkId;
    }
  } catch {}

  // 5) IP + UA
  const ip = await ipAl();
  const ua = navigator?.userAgent?.slice(0, 250) || null;

  // 6) Referans numarası
  const rnd = Math.floor(Math.random() * 0x10000).toString(16).toUpperCase().padStart(4, '0');
  const referans = `ODM-${Date.now()}-${rnd}`;

  // 7) Ödeme kaydı — durum 'beklemede'
  let odemeId = null;
  try {
    const ref = await addDoc(collection(db, 'odemeler'), {
      workspaceId: ws,
      kiraciId: kiraci.id,
      kiraId,
      mulkId,
      tip: 'kira',
      donem: donem || '',
      tutarKurus: Math.round(tutarKurus),
      paraBirim: 'TRY',
      vadeTarihi: Timestamp.fromDate(tarihD),
      odemeTarihi: Timestamp.fromDate(tarihD),
      odemeYontemi: 'havale',
      dekontUrl,
      aciklama: aciklama || '',
      durum: 'beklemede',       // YENİ alan
      kaynak: 'kiraci_self',    // YENİ alan
      referans,
      olusturmaKullanici: 'kiraci_portal',
      olusturmaIp: ip,
      olusturmaUA: ua,
      isDeleted: false,
      olusturulma: serverTimestamp(),
      guncellenme: serverTimestamp(),
    });
    odemeId = ref.id;
  } catch (e) {
    throw new Error('Ödeme kaydedilemedi: ' + e.message);
  }

  // 8) Bildirim oluştur
  try {
    await bildirimOlustur({
      workspaceId: ws,
      tip: 'kiraci_odeme_bekliyor',
      baslik: `${kiraci.adSoyad || 'Kiracı'} ödeme bildirdi`,
      mesaj: `${(tutarKurus / 100).toLocaleString('tr-TR')}₺ · ${donem || 'kira'}${dekontUrl ? ' · dekont eklendi' : ''}`,
      link: 'bildirimler',
    });
  } catch (e) { console.warn('[kportal bildirim]', e.message); }

  // 9) islemLogu audit
  try {
    await addDoc(collection(db, 'islemLogu'), {
      workspaceId: ws,
      tip: 'create',
      entityTip: 'odeme',
      entityId: odemeId,
      entityAd: referans,
      kullaniciEmail: 'kiraci_portal',
      kullaniciAd: kiraci.adSoyad || 'Kiracı',
      yeniDeger: { tutarKurus, donem, dekontUrl, durum: 'beklemede' },
      ip,
      userAgent: ua,
      zaman: serverTimestamp(),
      isDeleted: false,
    });
  } catch {}

  // 10) Rate limit mark
  rateLimitSet(token);

  return { basarili: true, referans, odemeId };
}

/**
 * Kiracı portal odemeyi onayla (admin tarafı — Bildirimler sayfasından çağrılır)
 */
export async function kportalOdemeOnayla(workspaceId, user, odemeId) {
  const { updateDoc, doc: docRef } = await import('firebase/firestore');
  await updateDoc(docRef(db, 'odemeler', odemeId), {
    durum: 'onaylandi',
    onaylayanAd: user?.name || 'admin',
    onaylayanId: user?.uid || null,
    onayZaman: serverTimestamp(),
    guncellenme: serverTimestamp(),
  });
  try {
    await addDoc(collection(db, 'islemLogu'), {
      workspaceId, tip: 'update', entityTip: 'odeme', entityId: odemeId,
      kullaniciAd: user?.name, yeniDeger: { durum: 'onaylandi' },
      zaman: serverTimestamp(), isDeleted: false,
    });
  } catch {}
}

/**
 * Kiracı portal odemeyi reddet
 */
export async function kportalOdemeReddet(workspaceId, user, odemeId, redSebep) {
  const { updateDoc, doc: docRef } = await import('firebase/firestore');
  await updateDoc(docRef(db, 'odemeler', odemeId), {
    durum: 'reddedildi',
    redSebep: redSebep || '',
    reddedenAd: user?.name || 'admin',
    reddedenId: user?.uid || null,
    redZaman: serverTimestamp(),
    guncellenme: serverTimestamp(),
  });
  try {
    await addDoc(collection(db, 'islemLogu'), {
      workspaceId, tip: 'update', entityTip: 'odeme', entityId: odemeId,
      kullaniciAd: user?.name, yeniDeger: { durum: 'reddedildi', redSebep },
      zaman: serverTimestamp(), isDeleted: false,
    });
  } catch {}
}
