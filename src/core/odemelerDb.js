/**
 * @file core/odemelerDb.js
 * @description Ödemeler CRUD + sorgulama yardımcıları
 * @anayasa K06 soft delete · K10 kuruş integer · K11 workspace · K12 RBAC
 */
import {
  collection, doc, addDoc, updateDoc, query, where, onSnapshot,
  serverTimestamp, getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { yetkiZorunlu } from './rbac';

const COL = 'odemeler';
const LOG = 'activity_logs';

const col = () => collection(db, COL);

async function log(workspaceId, user, action, targetId, meta = {}) {
  try {
    await addDoc(collection(db, LOG), {
      workspaceId, module: 'odemeler', action, targetId,
      user: user?.name || 'bilinmiyor', meta, ts: serverTimestamp(),
    });
  } catch {}
}

export function odemeleriDinle(workspaceId, callback) {
  const q = query(col(),
    where('workspaceId', '==', workspaceId),
    where('isDeleted', '==', false),
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, err => {
    console.error('[odemeler] listener:', err);
    callback([]);
  });
}

export async function odemeEkle(workspaceId, user, veri) {
  yetkiZorunlu(user, 'user');
  try {
    const ref = await addDoc(col(), {
      workspaceId,
      mulkId: veri.mulkId || null,
      kiraciId: veri.kiraciId || null,
      kiraId: veri.kiraId || null,
      tip: veri.tip || 'kira',
      tutarKurus: Math.round(veri.tutarKurus || 0),
      paraBirim: veri.paraBirim || 'TRY',
      kurDegeri: veri.kurDegeri || null,
      vadeTarihi: veri.vadeTarihi || null,
      odemeTarihi: veri.odemeTarihi || null,
      durum: veri.durum || 'bekliyor',
      odemeYontemi: veri.odemeYontemi || 'havale',
      aciklama: veri.aciklama || '',
      makbuzUrl: veri.makbuzUrl || null,
      olusturan: user?.name || 'bilinmiyor',
      olusturulma: serverTimestamp(),
      guncellenme: serverTimestamp(),
      isDeleted: false,
      deletedAt: null,
    });
    log(workspaceId, user, 'create', ref.id, { tip: veri.tip, tutarKurus: veri.tutarKurus });
    return ref.id;
  } catch (e) {
    throw new Error('Ödeme eklenemedi: ' + e.message);
  }
}

export async function odemeGuncelle(workspaceId, user, id, veri) {
  yetkiZorunlu(user, 'user');
  await updateDoc(doc(db, COL, id), { ...veri, guncellenme: serverTimestamp() });
  log(workspaceId, user, 'update', id, {});
}

export async function odemeOdendiIsaretle(workspaceId, user, id, { odemeYontemi, odemeTarihi, kurDegeri }) {
  yetkiZorunlu(user, 'user');
  await updateDoc(doc(db, COL, id), {
    durum: 'odendi',
    odemeTarihi: odemeTarihi || new Date(),
    odemeYontemi: odemeYontemi || 'havale',
    kurDegeri: kurDegeri || null,
    guncellenme: serverTimestamp(),
  });
  log(workspaceId, user, 'odendi', id, {});
}

export async function odemeSil(workspaceId, user, id) {
  yetkiZorunlu(user, 'manager');
  await updateDoc(doc(db, COL, id), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: user?.name || 'bilinmiyor',
    guncellenme: serverTimestamp(),
  });
  log(workspaceId, user, 'delete', id, {});
}

export async function kiraciOdemeleri(workspaceId, kiraciId) {
  const q = query(col(),
    where('workspaceId', '==', workspaceId),
    where('kiraciId', '==', kiraciId),
    where('isDeleted', '==', false),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Gecikmiş: vadesi bugünden önce + durum 'bekliyor' */
export function gecikmisFiltre(odemeler) {
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
  return (odemeler || []).filter(o => {
    if (o.durum !== 'bekliyor') return false;
    if (!o.vadeTarihi) return false;
    const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi);
    return v < bugun;
  });
}

/** Önümüzdeki n gün içinde vadesi gelen */
export function yaklasanFiltre(odemeler, gun = 7) {
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
  const limit = new Date(bugun); limit.setDate(limit.getDate() + gun);
  return (odemeler || []).filter(o => {
    if (o.durum !== 'bekliyor') return false;
    if (!o.vadeTarihi) return false;
    const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi);
    return v >= bugun && v <= limit;
  });
}

/** TL'ye çevrilmiş tutar (kurus integer) */
export function odemeTlKurus(o) {
  const k = o.tutarKurus || 0;
  if (o.paraBirim === 'TRY') return k;
  return Math.round(k * (o.kurDegeri || 1));
}

/** Kiracı bakiyesi (kuruş) — alacak - tahsil */
export function kiraciBakiyeHesapla(odemeler) {
  let beklenen = 0, odenen = 0, gecikmis = 0;
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
  for (const o of (odemeler || [])) {
    const tl = odemeTlKurus(o);
    if (o.durum === 'odendi') odenen += tl;
    else {
      beklenen += tl;
      const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi || 0);
      if (v < bugun) gecikmis += tl;
    }
  }
  return {
    toplamBeklenenKurus: beklenen,
    toplamOdenenKurus:   odenen,
    gecikmisKurus:       gecikmis,
    bakiyeKurus:         beklenen - 0, // kalan borç
  };
}
