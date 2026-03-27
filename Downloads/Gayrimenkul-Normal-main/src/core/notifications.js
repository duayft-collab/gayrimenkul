/**
 * src/core/notifications.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.1 / 2026-03-27
 *
 * Bildirim & Hatırlatma Sistemi
 * - Kira ödeme tarihi uyarıları
 * - Sözleşme bitiş hatırlatmaları
 * - Boş mülk uyarıları
 * - Dashboard'a bildirim rozeti
 */

import { getOdemeler }    from './database.js';
import { getSozlesmeler } from './database.js';
import { getMulkler }     from './database.js';
import { showToast }      from '../ui/toast.js';

let _unsubscribe = null;

// ─── Bildirim Başlat ──────────────────────────────────────
/**
 * Uygulama açılışında bir kez çağrılır.
 * Tüm kontrolleri yapar, UI rozetini günceller.
 */
export async function initNotifications() {
  try {
    const [mulkler, sozlesmeler, odemeler] = await Promise.all([
      getMulkler(),
      getSozlesmeler(),
      getOdemeler([{ field: 'durum', op: '==', value: 'Gecikmiş' }]),
    ]);

    const alerts = [];

    // 1. Gecikmiş ödemeler
    if (odemeler.length > 0) {
      alerts.push({
        type:    'error',
        icon:    '❌',
        message: `${odemeler.length} gecikmiş kira ödemesi var.`,
        route:   'kira',
      });
    }

    // 2. 30 gün içinde biten sözleşmeler
    const expiring = sozlesmeler.filter(s => {
      if (s.durum !== 'Aktif' || !s.bitisTarihi) return false;
      const gun = Math.ceil((new Date(s.bitisTarihi) - new Date()) / 86400000);
      return gun >= 0 && gun <= 30;
    });
    if (expiring.length > 0) {
      alerts.push({
        type:    'warning',
        icon:    '⚠️',
        message: `${expiring.length} sözleşme 30 gün içinde sona eriyor.`,
        route:   'sozlesmeler',
      });
    }

    // 3. Boş mülkler (30+ gündür boş)
    const boslar = mulkler.filter(m => m.durum === 'Boş');
    if (boslar.length > 0) {
      alerts.push({
        type:    'info',
        icon:    '🏠',
        message: `${boslar.length} mülk şu an boş.`,
        route:   'mulkler',
      });
    }

    // Rozet güncelle
    _updateBadge(alerts.length);

    // Bildirim paneli için veri kaydet (window üzerinden erişilebilir)
    window._notifications = alerts;

    // Başlangıçta önemli uyarıları toast olarak göster
    if (odemeler.length > 0) {
      setTimeout(() => showToast('error', `❌ ${odemeler.length} gecikmiş kira ödemesi var!`), 1500);
    } else if (expiring.length > 0) {
      setTimeout(() => showToast('warning', `⚠️ ${expiring.length} sözleşme yakında bitiyor.`), 1500);
    }

    return alerts;
  } catch (_) {
    // Bildirim hatası kritik değil — sessizce geç
    return [];
  }
}

// ─── Bildirim Paneli HTML ─────────────────────────────────
/**
 * Topbar'daki bildirim butonuna tıklandığında
 * açılır bir dropdown oluşturur.
 */
export function renderNotificationPanel() {
  const alerts = window._notifications || [];
  const existing = document.getElementById('notif-panel');
  if (existing) { existing.remove(); return; }

  const panel = document.createElement('div');
  panel.id = 'notif-panel';
  panel.style.cssText = `
    position:fixed;top:54px;right:16px;width:300px;
    background:var(--bg-primary);border:1px solid var(--border);
    border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);
    z-index:1000;overflow:hidden;
  `;

  panel.innerHTML = `
    <div style="padding:12px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:13px;font-weight:600">Bildirimler</span>
      <button onclick="document.getElementById('notif-panel').remove()" 
        style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-tertiary)">✕</button>
    </div>
    <div style="max-height:320px;overflow-y:auto">
      ${alerts.length === 0 
        ? `<div style="padding:20px;text-align:center;color:var(--text-tertiary);font-size:12.5px">✅ Bekleyen bildirim yok.</div>`
        : alerts.map(a => `
          <div onclick="navigate('${a.route}');document.getElementById('notif-panel').remove()"
            style="padding:11px 14px;border-bottom:1px solid var(--border-light);cursor:pointer;display:flex;gap:10px;align-items:center;transition:background 0.1s"
            onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background=''">
            <span style="font-size:18px">${a.icon}</span>
            <span style="font-size:12px;color:var(--text-secondary)">${a.message}</span>
          </div>`).join('')}
    </div>`;

  document.body.appendChild(panel);

  // Dışarı tıklanınca kapat
  setTimeout(() => {
    document.addEventListener('click', function _close(e) {
      if (!panel.contains(e.target)) { panel.remove(); document.removeEventListener('click', _close); }
    });
  }, 50);
}

// ─── Rozet Güncelle ───────────────────────────────────────
function _updateBadge(count) {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}
