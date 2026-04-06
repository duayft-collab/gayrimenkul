/**
 * @file core/kiralarDb.js
 * @description Kira sözleşmeleri CRUD (db.js'deki listener'ı korur, CRUD ekler)
 * @anayasa K06 soft delete · K10 kuruş · K11 workspace · K12 RBAC · K14 log
 */
import {
  collection, doc, addDoc, updateDoc, serverTimestamp, query, where, getDocs, getDoc, onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { yetkiZorunlu } from './rbac';
import { kiraTakvimeYaz, kiradanOlaylariSil } from './kiraTakvimSync';

const COL = 'kiralar';
const LOG = 'activity_logs';

const col = () => collection(db, COL);

async function log(workspaceId, user, action, targetId, meta = {}) {
  try {
    await addDoc(collection(db, LOG), {
      workspaceId, module: 'kiralar', action, targetId,
      user: user?.name || 'bilinmiyor', meta, ts: serverTimestamp(),
    });
  } catch {}
}

/** K10 — tüm para alanları kurus integer */
export async function kiraEkle(workspaceId, user, veri) {
  yetkiZorunlu(user, 'user');
  try {
    const ref = await addDoc(col(), {
      workspaceId,
      mulkId: veri.mulkId || null,
      kiraciId: veri.kiraciId || null,
      durum: veri.durum || 'dolu',
      baslangicTarihi: veri.baslangicTarihi || null,
      bitisTarihi: veri.bitisTarihi || null,
      aylikKiraKurus: Math.round(veri.aylikKiraKurus || 0),
      paraBirim: veri.paraBirim || 'TRY',
      odemeSikligi: veri.odemeSikligi || 'aylik',
      ozelGun: veri.ozelGun || null,
      depozitoKurus: Math.round(veri.depozitoKurus || 0),
      depozitoIadeEdildi: false,
      artisKosulu: veri.artisKosulu || 'TUFE',
      artisOrani: veri.artisOrani || 0,
      sonArtisTarihi: veri.sonArtisTarihi || null,
      sonrakiArtisTarihi: veri.sonrakiArtisTarihi || null,
      sozlesmeNo: veri.sozlesmeNo || '',
      sozlesmeDosyaUrl: veri.sozlesmeDosyaUrl || null,
      yenilemeDurumu: 'bekliyor',
      notlar: veri.notlar || '',
      olusturan: user?.name || 'bilinmiyor',
      olusturulma: serverTimestamp(),
      guncellenme: serverTimestamp(),
      isDeleted: false,
      deletedAt: null,
    });
    log(workspaceId, user, 'create', ref.id, { mulkId: veri.mulkId });
    // Takvim sync (best-effort, hata varsa kira kaydı bozulmaz)
    try { await kiraTakvimeYaz(workspaceId, { id: ref.id, ...veri }); }
    catch (e) { console.warn('[kiraEkle] takvim sync:', e.message); }
    return ref.id;
  } catch (e) {
    throw new Error('Kira kaydedilemedi: ' + e.message);
  }
}

export async function kiraGuncelle(workspaceId, user, id, veri) {
  yetkiZorunlu(user, 'user');
  await updateDoc(doc(db, COL, id), {
    ...veri,
    guncellenme: serverTimestamp(),
  });
  log(workspaceId, user, 'update', id, {});
  // Güncel snapshot ile takvim sync
  try {
    const snap = await getDoc(doc(db, COL, id));
    if (snap.exists()) await kiraTakvimeYaz(workspaceId, { id, ...snap.data() });
  } catch (e) { console.warn('[kiraGuncelle] takvim sync:', e.message); }
}

export async function kiraSil(workspaceId, user, id) {
  yetkiZorunlu(user, 'manager');
  await updateDoc(doc(db, COL, id), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: user?.name || 'bilinmiyor',
    guncellenme: serverTimestamp(),
  });
  log(workspaceId, user, 'delete', id, {});
  // Takvim olaylarını temizle
  try { await kiradanOlaylariSil(workspaceId, id); }
  catch (e) { console.warn('[kiraSil] takvim temizlik:', e.message); }
}

export async function kiralarListele(workspaceId) {
  const q = query(col(),
    where('workspaceId', '==', workspaceId),
    where('isDeleted', '==', false),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function kiracininKiralari(workspaceId, kiraciId) {
  const q = query(col(),
    where('workspaceId', '==', workspaceId),
    where('kiraciId', '==', kiraciId),
    where('isDeleted', '==', false),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function kiraGeliriTL(kira) {
  if (!kira) return 0;
  const kurus = kira.aylikKiraKurus || 0;
  if (kira.paraBirim === 'TRY') return kurus / 100;
  const kur = kira.kurDegeri || 1;
  return (kurus / 100) * kur;
}
