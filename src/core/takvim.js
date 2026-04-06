/**
 * @file core/takvim.js
 * @description Takvim olayları — Firestore CRUD + bildirim yardımcıları
 * @anayasa K06 soft delete · K11 workspace izolasyonu · K14 log
 */
import {
  collection, doc, addDoc, updateDoc, getDocs, query, where, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const COL = 'takvimOlaylari';

export const OLAY_TIPI = {
  kira:      { ad: 'Kira Vadesi',     emoji: '🏠', renk: '#22C55E' },
  sozlesme:  { ad: 'Sözleşme Bitiş',  emoji: '📝', renk: '#1B4F8A' },
  bakim:     { ad: 'Bakım',            emoji: '🔧', renk: '#F59E0B' },
  odeme:     { ad: 'Ödeme Vadesi',    emoji: '💰', renk: '#EF4444' },
  not:       { ad: 'Özel Not',         emoji: '📌', renk: '#C9A84C' },
};

export async function olayEkle(workspaceId, veri) {
  return addDoc(collection(db, COL), {
    ...veri,
    workspaceId,
    tamamlandi: false,
    isDeleted: false,
    olusturulma: serverTimestamp(),
  });
}

export async function olayGuncelle(id, veri) {
  return updateDoc(doc(db, COL, id), { ...veri, guncellenme: serverTimestamp() });
}

export async function olaySil(id, kullanici) {
  return updateDoc(doc(db, COL, id), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: kullanici || 'bilinmiyor',
  });
}

export async function olayListele(workspaceId) {
  try {
    const q = query(
      collection(db, COL),
      where('workspaceId', '==', workspaceId),
      where('isDeleted', '==', false),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('[takvim]', e);
    return [];
  }
}

/** Bir ayın tüm günleri için olayları grupla */
export function olaylariGrupla(olaylar, yil, ay /* 0-11 */) {
  const sonuc = {};
  for (const o of olaylar) {
    if (!o.tarih) continue;
    const d = o.tarih.toDate ? o.tarih.toDate() : new Date(o.tarih);
    if (o.tekrar === 'monthly') {
      // Her ay aynı gün
      const gun = d.getDate();
      const anahtar = `${yil}-${ay}-${gun}`;
      (sonuc[anahtar] = sonuc[anahtar] || []).push(o);
    } else if (o.tekrar === 'yearly') {
      if (d.getMonth() === ay) {
        const anahtar = `${yil}-${ay}-${d.getDate()}`;
        (sonuc[anahtar] = sonuc[anahtar] || []).push(o);
      }
    } else {
      if (d.getFullYear() === yil && d.getMonth() === ay) {
        const anahtar = `${yil}-${ay}-${d.getDate()}`;
        (sonuc[anahtar] = sonuc[anahtar] || []).push(o);
      }
    }
  }
  return sonuc;
}

export function olayDurum(o) {
  if (o.tamamlandi) return 'tamamlandi';
  const d = o.tarih?.toDate ? o.tarih.toDate() : new Date(o.tarih);
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
  const hedef = new Date(d); hedef.setHours(0, 0, 0, 0);
  const fark = (hedef - bugun) / (1000 * 60 * 60 * 24);
  if (fark < 0) return 'gecmis';
  if (fark === 0) return 'bugun';
  if (fark <= 7) return 'yakin';
  return 'ileride';
}

/** Tarayıcı bildirimi iste */
export async function bildirimIzniIste() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

/** Yarın vadeli olayları bildir */
export function yakinOlaylariBildir(olaylar) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const yarin = new Date(); yarin.setDate(yarin.getDate() + 1); yarin.setHours(0, 0, 0, 0);
  const sonrakiGun = new Date(yarin); sonrakiGun.setDate(sonrakiGun.getDate() + 1);
  const hedefler = olaylar.filter(o => {
    if (o.tamamlandi) return false;
    const d = o.tarih?.toDate ? o.tarih.toDate() : new Date(o.tarih);
    return d >= yarin && d < sonrakiGun;
  });
  for (const o of hedefler) {
    const tip = OLAY_TIPI[o.tip] || OLAY_TIPI.not;
    new Notification(`${tip.emoji} ${tip.ad}: ${o.baslik}`, {
      body: o.not || 'Yarın vadesi geliyor',
      icon: '/favicon.ico',
    });
  }
}
