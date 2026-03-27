/**
 * src/modules/dashboard.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.0 / 2026-03-23
 *
 * Ana Pano modülü.
 * app.html'deki #page-content div'ine render edilir.
 */

import { getMulkler }        from '../core/database.js';
import { getOdemelerByDonem }from '../core/database.js';
import { getIslemler }       from '../core/database.js';
import { t }                 from '../core/i18n.js';
import { handleError }       from '../core/error-handler.js';

// ─── Render ───────────────────────────────────────────────
export async function render(container, profile) {
  container.innerHTML = `<div class="empty"><div class="empty-icon">⏳</div></div>`;
  try {
    const [mulkler, islemler] = await Promise.all([
      getMulkler(),
      getIslemler([], 'createdAt', null),
    ]);

    const buAy    = new Date().toISOString().slice(0, 7);
    const odemeler = await getOdemelerByDonem(buAy);

    container.innerHTML = _buildHTML(mulkler, odemeler, islemler, profile);
    _bindEvents(container, mulkler, odemeler, islemler);
  } catch (err) {
    handleError(err, 'dashboard.render');
  }
}

// ─── HTML Üretici ─────────────────────────────────────────
function _buildHTML(mulkler, odemeler, islemler, profile) {
  const toplam     = mulkler.reduce((s, m) => s + (m.guncelDeger || 0), 0);
  const kiraToplam = mulkler.reduce((s, m) => s + (m.aylikKira  || 0), 0);
  const kiralik    = mulkler.filter(m => m.durum === 'Kirada').length;
  const tahsil     = odemeler.filter(o => o.durum === 'Ödendi').reduce((s, o) => s + o.tutar, 0);
  const gecik      = odemeler.filter(o => o.durum === 'Gecikmiş').reduce((s, o) => s + o.tutar, 0);
  const pct        = kiraToplam > 0 ? Math.round(tahsil / kiraToplam * 100) : 0;
  const maliyet    = mulkler.reduce((s, m) => s + (m.alisFiyati || 0), 0);
  const artis      = toplam - maliyet;
  const roi        = maliyet > 0 ? Math.round(artis / maliyet * 100) : 0;

  return `
  <!-- Metrik Kartlar -->
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-label" data-i18n="dashboard.portfolioValue">${t('dashboard.portfolioValue')}</div>
      <div class="metric-value">${_fmtM(toplam)}</div>
      <div class="metric-sub"><span class="up">▲ %${roi}</span> ${t('dashboard.thisYear')}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label" data-i18n="dashboard.monthlyRent">${t('dashboard.monthlyRent')}</div>
      <div class="metric-value">${_fmtM(kiraToplam)}</div>
      <div class="metric-sub">${kiralik} ${t('dashboard.occupied')}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label" data-i18n="dashboard.totalProperties">${t('dashboard.totalProperties')}</div>
      <div class="metric-value">${mulkler.length}</div>
      <div class="metric-sub">${kiralik} ${t('dashboard.occupied')} · ${mulkler.length - kiralik} ${t('dashboard.vacant')}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label" data-i18n="dashboard.overdueRent">${t('dashboard.overdueRent')}</div>
      <div class="metric-value">${_fmt(gecik)}</div>
      <div class="metric-sub"><span class="${gecik > 0 ? 'dn' : 'up'}">${odemeler.filter(o => o.durum === 'Gecikmiş').length} ${t('dashboard.tenants')}</span></div>
    </div>
  </div>

  <!-- İki Kolon -->
  <div class="two-col">
    <div>
      <!-- Portföy Özeti -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">${t('dashboard.portfolioSummary')}</span>
          <button class="btn btn-outline btn-sm" onclick="navigate('mulkler')">${t('dashboard.viewAll')}</button>
        </div>
        <div class="card-body" id="dash-list">
          ${mulkler.slice(0, 6).map(m => `
            <div class="list-row" onclick="document.dispatchEvent(new CustomEvent('showMulkDetail',{detail:'${m.id}'}))">
              <div class="list-icon">${_emoji(m.tur)}</div>
              <div class="list-main">
                <div class="list-name">${m.ad}</div>
                <div class="list-sub">${m.tur} · ${m.sehir}, ${m.ilce}</div>
              </div>
              <div class="list-right">
                <div class="list-price">${m.aylikKira ? _fmt(m.aylikKira) + '/ay' : _fmtM(m.guncelDeger)}</div>
                <div style="margin-top:2px">${_durumTag(m.durum)}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>

      <!-- Son İşlemler -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">${t('dashboard.recentActivity')}</span>
          <button class="btn btn-outline btn-sm" onclick="navigate('alisatis')">${t('dashboard.viewAll')}</button>
        </div>
        <div class="card-body">
          ${islemler.slice(0, 4).map(i => `
            <div class="list-row">
              <div class="list-icon">${i.tur === 'Alım' ? '📥' : '📤'}</div>
              <div class="list-main">
                <div class="list-name">${i.mulkAd || '—'}</div>
                <div class="list-sub">${i.taraf} · ${i.tarih || '—'}</div>
              </div>
              <div class="list-right">
                <div class="list-price">${i.tur === 'Satış' ? _fmt(i.satisFiyati) : _fmt(i.alisFiyati)}</div>
                <div style="margin-top:2px">${_turTag(i.tur)} ${_durumTag(i.durum)}</div>
              </div>
            </div>`).join('') || `<div class="empty"><div class="empty-text">${t('ui.noData')}</div></div>`}
        </div>
      </div>
    </div>

    <!-- Sağ Kolon -->
    <div class="col-stack">
      <!-- Tahsilat -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">${t('dashboard.monthlyCollection')} (${new Date().toLocaleString('tr-TR',{month:'long'})})</span>
        </div>
        <div class="card-body-padded">
          <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:12px;color:var(--text-secondary)">
            <span>${_fmt(tahsil)} / ${_fmt(kiraToplam)}</span>
            <span style="font-weight:600">${pct}%</span>
          </div>
          <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div style="margin-top:12px">
            ${odemeler.slice(0, 4).map(o => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border-light)">
                <div>
                  <div style="font-size:12px;font-weight:500">${o._taraf || '—'}</div>
                  <div style="font-size:10.5px;color:var(--text-tertiary)">${o._mulkAd || '—'}</div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:12px;font-weight:600;color:${o.durum === 'Ödendi' ? 'var(--color-success-text)' : 'var(--color-error-text)'}">
                    ${o.durum === 'Ödendi' ? '✓' : '✗'} ${_fmt(o.tutar)}
                  </div>
                  <div style="font-size:10.5px;color:var(--text-tertiary)">${o.odemeTarihi || t('kira.statuses.gecikti')}</div>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Yatırım Özeti -->
      <div class="card">
        <div class="card-header"><span class="card-title">${t('dashboard.investmentSummary')}</span></div>
        <div class="card-body-padded">
          ${[
            [t('yatirim.costBasis'),   _fmtM(maliyet), ''],
            [t('yatirim.currentValue'),_fmtM(toplam),  ''],
            [t('yatirim.valueIncrease'),_fmtM(artis),  'color:var(--color-success-text)'],
            [t('yatirim.totalROI'),    `<span class="roi">${roi}%</span>`, ''],
          ].map(([k, v, s]) => `
            <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border-light);font-size:12px">
              <span style="color:var(--text-secondary)">${k}</span>
              <span style="font-weight:500;${s}">${v}</span>
            </div>`).join('')}
        </div>
      </div>

      <!-- Portföy Dağılımı -->
      <div class="card">
        <div class="card-header"><span class="card-title">${t('dashboard.portfolioDist')}</span></div>
        <div class="card-body-padded" id="dash-dagil">
          ${_buildDagilim(mulkler, toplam)}
        </div>
      </div>
    </div>
  </div>
  `;
}

function _buildDagilim(mulkler, toplam) {
  const types = ['Konut', 'Ticari', 'Arsa', 'Bina'];
  const topD  = toplam || 1;
  return types.map(t_ => {
    const val = mulkler.filter(m => m.tur === t_).reduce((s, m) => s + (m.guncelDeger || 0), 0);
    const pct = Math.round(val / topD * 100);
    return `<div class="dagil-row">
      <span class="dagil-name">${_emoji(t_)} ${t_}</span>
      <div class="dagil-bar"><div class="dagil-fill" style="width:${pct}%"></div></div>
      <span class="dagil-pct">${pct}%</span>
    </div>`;
  }).join('');
}

function _bindEvents(container, mulkler) {
  // Mülk detayı custom event — mulkler modülü dinler
}

// ─── Yardımcılar ──────────────────────────────────────────
function _fmt(n)  { return n ? '₺' + Number(n).toLocaleString('tr-TR') : '—'; }
function _fmtM(n) {
  if (!n) return '—';
  const m = n / 1_000_000;
  return m >= 1 ? '₺' + m.toFixed(2).replace(/\.?0+$/, '') + 'M' : _fmt(n);
}
function _emoji(tur) { return { Konut:'🏠', Ticari:'🏢', Arsa:'🌾', Bina:'🏗️' }[tur] || '🏠'; }
function _durumTag(d) {
  const map = { Kirada:'tag-green', Boş:'tag-red', Satılık:'tag-warning', Satıldı:'tag-gray', Tamamlandı:'tag-green', Müzakere:'tag-warning', İptal:'tag-red' };
  return `<span class="tag ${map[d] || 'tag-gray'}">${d}</span>`;
}
function _turTag(d) {
  return `<span class="tag ${d === 'Alım' ? 'tag-info' : 'tag-green'}">${d}</span>`;
}
