/**
 * @file core/bildirimlerDb.js
 * @description Bildirim Merkezi — Firestore bildirimler collection + browser push
 * @anayasa K11 workspace · K14 PII yok
 */
import {
  collection, addDoc, updateDoc, doc, query, where, onSnapshot,
  serverTimestamp, getDocs, writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

const COL = 'bildirimler';

export const TIP_ICON = {
  kira_vade:      { icon: '📅', renk: '#F59E0B' },
  sozlesme_bitis: { icon: '📝', renk: '#1B4F8A' },
  yeni_paylasim:  { icon: '🔗', renk: '#C9A84C' },
  odeme_alindi:   { icon: '💰', renk: '#22C55E' },
  gecikme:        { icon: '⚠️', renk: '#EF4444' },
  alarm:          { icon: '🔔', renk: '#EF4444' },
  yedek_hazir:    { icon: '💾', renk: '#1B4F8A' },
  sistem:         { icon: 'ℹ️', renk: '#888888' },
};

export async function bildirimOlustur({
  workspaceId, kullaniciId, tip, baslik, mesaj, link = null
}) {
  try {
    const ref = await addDoc(collection(db, COL), {
      workspaceId,
      kullaniciId: kullaniciId || null,
      tip, baslik, mesaj,
      link,
      icon: TIP_ICON[tip]?.icon || 'ℹ️',
      renk: TIP_ICON[tip]?.renk || '#888',
      okundu: false,
      okunmaTarihi: null,
      olusturulma: serverTimestamp(),
      isDeleted: false,
    });

    // Browser push
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(baslik, { body: mesaj, icon: '/favicon.ico' });
      } catch {}
    }
    return ref.id;
  } catch (e) {
    console.warn('[bildirimOlustur]', e.message);
  }
}

export function bildirimleriDinle(workspaceId, kullaniciId, callback) {
  const q = query(
    collection(db, COL),
    where('workspaceId', '==', workspaceId),
    where('isDeleted', '==', false),
  );
  return onSnapshot(q, snap => {
    const liste = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.olusturulma?.seconds || 0) - (a.olusturulma?.seconds || 0));
    callback(liste);
  }, err => {
    console.error('[bildirimler]', err);
    callback([]);
  });
}

export async function okunduIsaretle(id) {
  try {
    await updateDoc(doc(db, COL, id), {
      okundu: true,
      okunmaTarihi: serverTimestamp(),
    });
  } catch (e) { console.warn(e); }
}

export async function tumunuOkunduIsaretle(workspaceId) {
  try {
    const q = query(
      collection(db, COL),
      where('workspaceId', '==', workspaceId),
      where('okundu', '==', false),
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, {
      okundu: true, okunmaTarihi: serverTimestamp(),
    }));
    await batch.commit();
  } catch (e) {
    console.warn('[tumunuOkunduIsaretle]', e.message);
  }
}

export async function bildirimSil(id) {
  try {
    await updateDoc(doc(db, COL, id), {
      isDeleted: true, deletedAt: serverTimestamp(),
    });
  } catch (e) { console.warn(e); }
}

/** Tekil Hızlı — kira vadesi yaklaşan bildirimleri otomatik oluştur */
export async function otomatikKiraBildirim(workspaceId, odemeler, kiracilar) {
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
  const limit = new Date(bugun); limit.setDate(limit.getDate() + 3);

  // Throttle — aynı gün tekrar kontrol etme
  const ks = 'bildirim_son_oto_' + workspaceId;
  const son = sessionStorage.getItem(ks);
  if (son && Date.now() - parseInt(son) < 60 * 60 * 1000) return;
  sessionStorage.setItem(ks, String(Date.now()));

  for (const o of (odemeler || [])) {
    if (o.isDeleted || o.durum !== 'bekliyor') continue;
    const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi || 0);
    if (v >= bugun && v <= limit) {
      const k = (kiracilar || []).find(x => x.id === o.kiraciId);
      await bildirimOlustur({
        workspaceId,
        tip: 'kira_vade',
        baslik: `Kira vadesi: ${k?.adSoyad || 'Kiracı'}`,
        mesaj: `${v.toLocaleDateString('tr-TR')} tarihinde ödeme vadesi geliyor`,
        link: 'odemeler',
      });
    }
  }
}
