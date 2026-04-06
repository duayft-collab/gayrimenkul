/**
 * @file core/bildirim.js
 * @description Browser Notification API yönetimi — kira hatırlatıcıları
 */
import { gecikmisFiltre, yaklasanFiltre } from './odemelerDb';

export async function browserBildirimKur() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

function bildir(baslik, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(baslik, { body, icon: '/favicon.ico' });
  } catch (e) {
    console.warn('[bildirim]', e.message);
  }
}

/**
 * Uygulama açılışında ve saat başı çalışır — kira ve sözleşme vadelerini kontrol eder
 */
export function kiraHatirlaticiKontrol({ odemeler, kiralar, kiracilar }) {
  // Session bazlı throttle — aynı saat içinde tekrar bildirim gönderme
  const ks = 'bildirimSonKontrol';
  const son = sessionStorage.getItem(ks);
  const simdi = Date.now();
  if (son && simdi - parseInt(son) < 60 * 60 * 1000) return;
  sessionStorage.setItem(ks, String(simdi));

  const kiraciAdi = (id) => (kiracilar || []).find(k => k.id === id)?.adSoyad || 'Kiracı';

  // Gecikmiş ödemeler
  const gecikmis = gecikmisFiltre(odemeler);
  if (gecikmis.length > 0) {
    bildir(
      `⚠️ ${gecikmis.length} gecikmiş ödeme`,
      gecikmis.slice(0, 3).map(o => `${kiraciAdi(o.kiraciId)}: ${o.aciklama || 'Kira'}`).join(' · '),
    );
  }

  // Yaklaşan (3 gün)
  const yaklasan = yaklasanFiltre(odemeler, 3);
  if (yaklasan.length > 0) {
    bildir(
      `📅 ${yaklasan.length} yaklaşan vade (3 gün)`,
      yaklasan.slice(0, 3).map(o => kiraciAdi(o.kiraciId)).join(', '),
    );
  }

  // Sözleşme bitişi 30 gün içinde
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
  const limit = new Date(bugun); limit.setDate(limit.getDate() + 30);
  const sozBitis = (kiralar || []).filter(k => {
    if (!k.bitisTarihi || k.durum === 'sozlesme_bitti') return false;
    const b = k.bitisTarihi?.toDate ? k.bitisTarihi.toDate() : new Date(k.bitisTarihi);
    return b >= bugun && b <= limit;
  });
  if (sozBitis.length > 0) {
    bildir(
      `📝 ${sozBitis.length} sözleşme bitiyor (30 gün)`,
      sozBitis.slice(0, 3).map(k => kiraciAdi(k.kiraciId)).join(', '),
    );
  }
}
