/**
 * src/modules/yatirim-analizi.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.1 / 2026-03-27
 *
 * Yatırım Analizi modülü — ROI, kira verimi, doluluk oranı,
 * geri ödeme süresi, mülk bazında kârlılık tablosu.
 */

import { getMulkler }   from '../core/database.js';
import { getOdemeler }  from '../core/database.js';
import { t }            from '../core/i18n.js';
import { handleError }  from '../core/error-handler.js';

let _mulkler  = [];
let _odemeler = [];

// ─── Render ───────────────────────────────────────────────
export async function render(container) {
  container.innerHTML = `<div class="empty"><div class="empty-icon">⏳</div><div class="empty-text">${t('ui.loading')}</div></div>`;
  try {
    [_mulkler, _odemeler] = await Promise.all([getMulkler(), getOdemeler()]);
    container.innerHTML = _buildHTML();
  } catch (err) { handleError(err, 'yatirim-analizi.render'); }
}

// ─── HTML ─────────────────────────────────────────────────
function _buildHTML() {
  const maliyet     = _mulkler.reduce((s, m) => s + (m.alisFiyati||0), 0);
  const guncelDeger = _mulkler.reduce((s, m) => s + (m.guncelDeger||0), 0);
  const aylikKira   = _mulkler.reduce((s, m) => s + (m.aylikKira||0), 0);
  const kiralik     = _mulkler.filter(m => m.durum === 'Kirada').length;
  const doluluk     = _mulkler.length > 0 ? Math.round(kiralik / _mulkler.length * 100) : 0;
  const artis       = guncelDeger - maliyet;
  const roi         = maliyet > 0 ? (artis / maliyet * 100).toFixed(1) : 0;
  const brutYillik  = aylikKira * 12;
  const kiraVerimi  = guncelDeger > 0 ? (brutYillik / guncelDeger * 100).toFixed(2) : 0;
  const geriOdeme   = brutYillik > 0 ? (maliyet / brutYillik).toFixed(1) : '—';

  // Tahsilat oranı
  const odendi   = _odemeler.filter(o => o.durum === 'Ödendi').reduce((s,o)=>s+(o.tutar||0), 0);
  const beklenen = _odemeler.reduce((s,o)=>s+(o.tutar||0), 0);
  const tahsilat = beklenen > 0 ? Math.round(odendi/beklenen*100) : 0;

  return `
  <!-- Temel Göstergeler -->
  <div class="metrics-grid" style="margin-bottom:20px">
    <div class="metric-card">
      <div class="metric-label">${t('yatirim.totalInvestment')}</div>
      <div class="metric-value">₺${_fmtM(maliyet)}</div>
      <div class="metric-sub">${_mulkler.length} mülk</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">${t('yatirim.currentValue')}</div>
      <div class="metric-value">₺${_fmtM(guncelDeger)}</div>
      <div class="metric-sub"><span class="${artis>=0?'up':'dn'}">▲ ₺${_fmtM(artis)} artış</span></div>
    </div>
    <div class="metric-card">
      <div class="metric-label">${t('yatirim.rentalYield')}</div>
      <div class="metric-value">%${kiraVerimi}</div>
      <div class="metric-sub">brüt yıllık verim</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">${t('yatirim.totalROI')}</div>
      <div class="metric-value" style="color:${artis>=0?'var(--color-success-text)':'var(--color-error-text)'}">%${roi}</div>
      <div class="metric-sub">değer artışı bazında</div>
    </div>
  </div>

  <div class="two-col">
    <div>
      <!-- Mülk Bazında Kârlılık -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><span class="card-title">${t('yatirim.profitTable')}</span></div>
        <div class="card-body">
          ${_buildProfitTable()}
        </div>
      </div>

      <!-- Portföy Dağılımı -->
      <div class="card">
        <div class="card-header"><span class="card-title">${t('yatirim.distribution')}</span></div>
        <div class="card-body-padded">
          ${_buildDagilim(guncelDeger)}
        </div>
      </div>
    </div>

    <div class="col-stack">
      <!-- Temel Göstergeler -->
      <div class="card">
        <div class="card-header"><span class="card-title">${t('yatirim.indicators')}</span></div>
        <div class="card-body-padded">
          ${[
            [t('yatirim.occupancyRate'),    `<span class="roi">%${doluluk}</span>`],
            [t('yatirim.activeTenants'),    kiralik + ' mülk'],
            [t('yatirim.vacantProperties'), (_mulkler.length - kiralik) + ' mülk'],
            ['Aylık Kira Geliri',           '₺' + Number(aylikKira).toLocaleString('tr-TR')],
            [t('yatirim.grossAnnual'),      '₺' + Number(brutYillik).toLocaleString('tr-TR')],
            [t('yatirim.annualNetIncome'),  '₺' + Number(Math.round(brutYillik * 0.85)).toLocaleString('tr-TR') + ' (tahmini)'],
            [t('yatirim.paybackPeriod'),    geriOdeme + ' ' + t('yatirim.years')],
            ['Tahsilat Oranı',              `<span class="roi">%${tahsilat}</span>`],
          ].map(([k, v]) => `
            <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border-light);font-size:12px">
              <span style="color:var(--text-secondary)">${k}</span>
              <span style="font-weight:500">${v}</span>
            </div>`).join('')}
        </div>
      </div>

      <!-- Durum Dağılımı -->
      <div class="card">
        <div class="card-header"><span class="card-title">Mülk Durum Dağılımı</span></div>
        <div class="card-body-padded">
          ${['Kirada','Boş','Satılık','Satıldı'].map(durum => {
            const count = _mulkler.filter(m => m.durum === durum).length;
            const pct   = _mulkler.length > 0 ? Math.round(count / _mulkler.length * 100) : 0;
            return `<div class="dagil-row">
              <span class="dagil-name">${_durumEmoji(durum)} ${durum}</span>
              <div class="dagil-bar"><div class="dagil-fill" style="width:${pct}%"></div></div>
              <span class="dagil-pct">${count} mülk</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

// ─── Kârlılık Tablosu ─────────────────────────────────────
function _buildProfitTable() {
  if (!_mulkler.length) return `<div class="empty"><div class="empty-text">Mülk bulunamadı.</div></div>`;

  const sorted = [..._mulkler].sort((a, b) => {
    const roiA = a.alisFiyati > 0 ? ((a.guncelDeger||0) - a.alisFiyati) / a.alisFiyati : 0;
    const roiB = b.alisFiyati > 0 ? ((b.guncelDeger||0) - b.alisFiyati) / b.alisFiyati : 0;
    return roiB - roiA;
  });

  return `<table style="width:100%;border-collapse:collapse;font-size:11.5px">
    <thead>
      <tr style="color:var(--text-tertiary);border-bottom:1px solid var(--border-light)">
        <th style="text-align:left;padding:5px 8px;font-weight:500">Mülk</th>
        <th style="text-align:right;padding:5px 8px;font-weight:500">${t('yatirim.cost')}</th>
        <th style="text-align:right;padding:5px 8px;font-weight:500">${t('yatirim.value')}</th>
        <th style="text-align:right;padding:5px 8px;font-weight:500">${t('yatirim.rentPct')}</th>
        <th style="text-align:right;padding:5px 8px;font-weight:500">ROI</th>
      </tr>
    </thead>
    <tbody>
      ${sorted.map(m => {
        const kar  = (m.guncelDeger||0) - (m.alisFiyati||0);
        const roi  = m.alisFiyati > 0 ? ((kar / m.alisFiyati) * 100).toFixed(1) : '—';
        const kira = m.guncelDeger > 0 && m.aylikKira ? ((m.aylikKira * 12 / m.guncelDeger) * 100).toFixed(2) : '—';
        return `<tr style="border-bottom:1px solid var(--border-light)">
          <td style="padding:7px 8px">
            <div style="font-weight:500">${m.ad}</div>
            <div style="color:var(--text-tertiary);font-size:10.5px">${m.sehir} · ${m.tur}</div>
          </td>
          <td style="text-align:right;padding:7px 8px">₺${_fmtM(m.alisFiyati)}</td>
          <td style="text-align:right;padding:7px 8px">₺${_fmtM(m.guncelDeger)}</td>
          <td style="text-align:right;padding:7px 8px">${kira !== '—' ? '%' + kira : '—'}</td>
          <td style="text-align:right;padding:7px 8px;font-weight:600;color:${kar>=0?'var(--color-success-text)':'var(--color-error-text)'}">${roi !== '—' ? '%' + roi : '—'}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

// ─── Portföy Dağılımı ─────────────────────────────────────
function _buildDagilim(toplam) {
  const types = ['Konut', 'Ticari', 'Arsa', 'Bina'];
  const topD  = toplam || 1;
  return types.map(tur => {
    const val = _mulkler.filter(m => m.tur === tur).reduce((s, m) => s + (m.guncelDeger||0), 0);
    const pct = Math.round(val / topD * 100);
    return `<div class="dagil-row">
      <span class="dagil-name">${_emoji(tur)} ${tur}</span>
      <div class="dagil-bar"><div class="dagil-fill" style="width:${pct}%"></div></div>
      <span class="dagil-pct">${pct}%</span>
    </div>`;
  }).join('');
}

// ─── Yardımcılar ──────────────────────────────────────────
function _fmtM(n) {
  if (!n) return '0';
  const m = n / 1_000_000;
  return m >= 1 ? m.toFixed(2).replace(/\.?0+$/, '') + 'M' : Number(n).toLocaleString('tr-TR');
}
function _emoji(tur) { return { Konut:'🏠', Ticari:'🏢', Arsa:'🌾', Bina:'🏗️' }[tur] || '🏠'; }
function _durumEmoji(d) { return { Kirada:'✅', Boş:'⬜', Satılık:'🏷️', Satıldı:'✔️' }[d] || '⬜'; }
