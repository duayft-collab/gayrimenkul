/**
 * src/modules/dashboard.js
 * Duay Global Trade Company — Property OS
 * Anayasa: K01, K10, K12
 * v1.0 / 2026-03-28
 */

import { listDocs }         from '../core/db.js';
import { getPiyasaData, formatTL, formatPct } from '../core/piyasa.js';
import { APP_CONFIG }       from '../../config/app-config.js';
import { t }                from '../core/i18n.js';
import { navigate }         from '../ui/router.js';

export async function render(container) {
  const [mulkler, piyasa] = await Promise.all([
    listDocs(APP_CONFIG.collections.mulkler),
    getPiyasaData(),
  ]);

  const toplamDeger   = mulkler.reduce((s, m) => s + (m.curValue || m.buyPrice || 0), 0);
  const toplamAlis    = mulkler.reduce((s, m) => s + (m.buyPrice  || 0), 0);
  const aylikKira     = mulkler.reduce((s, m) => s + (m.monthRent || 0), 0);
  const altinGram     = Math.round(toplamDeger / piyasa.altinGr);
  const usdDeger      = Math.round(toplamDeger / piyasa.usd);
  const getiripct     = toplamAlis > 0 ? ((toplamDeger - toplamAlis) / toplamAlis * 100) : 0;
  const kiradakiSayi  = mulkler.filter(m => m.status === 'kirada').length;

  const statusBadge = (s) => {
    const map = { kirada:'badge-green', bos:'badge-gray', satilik:'badge-amber', satildi:'badge-blue' };
    const lbl = { kirada:'Kirada', bos:'Boş', satilik:'Satılık', satildi:'Satıldı' };
    return `<span class="badge ${map[s]||'badge-gray'}">${lbl[s]||s}</span>`;
  };

  const typeIcon = (tp) => {
    const m = { daire:'🏠', villa:'🏡', arsa:'🌿', tarla:'🌾', isyeri:'🏢', dukkan:'🏪', bina:'🏗' };
    return m[tp] || '🏠';
  };

  const mulkRows = mulkler.slice(0, 5).map(m => `
    <div class="list-row" style="cursor:pointer" onclick="window.openMulk('${m.id}')">
      <div class="list-icon">${typeIcon(m.type)}</div>
      <div style="flex:1">
        <div class="list-name">${m.name}</div>
        <div class="list-sub">${m.location || '—'}</div>
      </div>
      <div style="text-align:right">
        <div class="list-price">${formatTL(m.curValue || m.buyPrice || 0)}</div>
        ${statusBadge(m.status)}
      </div>
    </div>`).join('') || `<div class="empty"><div class="empty-icon">🏠</div><p>${t('ui.noData')}</p></div>`;

  const bars = [40,55,45,62,58,72,68,80,76,88,92,100].map((h,i) =>
    `<div class="hbar${i===11?' lit':''}" style="height:${h}%"></div>`).join('');

  const compareData = [
    { name: 'Gayrimenkul', pct: getiripct, color: '#000', ref: true },
    { name: 'Altın',       pct: getiripct * 1.52, color: '#BA7517' },
    { name: 'USD',         pct: getiripct * 0.8,  color: '#185FA5' },
    { name: 'Bitcoin',     pct: getiripct * 0.3,  color: '#D85A30' },
    { name: 'BIST 100',    pct: getiripct * 0.66, color: '#888780' },
  ];
  const maxPct = Math.max(...compareData.map(c => Math.abs(c.pct)));
  const compareRows = compareData.map(c => {
    const w   = maxPct > 0 ? Math.round(Math.abs(c.pct) / maxPct * 100) : 0;
    const cls = c.ref ? '' : (c.pct > getiripct ? 'c-red' : 'c-green');
    return `
    <div class="compare-row">
      <div class="compare-name">${c.name}</div>
      <div class="compare-bar-wrap"><div class="compare-bar" style="width:${w}%;background:${c.color}"></div></div>
      <div class="compare-pct ${cls}">${formatPct(c.pct)}</div>
    </div>`;
  }).join('');

  const dagilim = [
    { label:'Daire/Villa', pct: 34, color:'#185FA5' },
    { label:'Arsa/Tarla',  pct: 41, color:'#1D9E75' },
    { label:'Ticari',      pct: 25, color:'#D85A30' },
  ];
  const dagilimBars = dagilim.map(d => `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);margin-bottom:4px">
        <span>${d.label}</span><span>%${d.pct}</span>
      </div>
      <div style="height:5px;background:var(--bg);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${d.pct}%;background:${d.color};border-radius:3px"></div>
      </div>
    </div>`).join('');

  container.innerHTML = `
    <div class="hero-card">
      <div class="hero-badge">${formatPct(getiripct)} bu yıl</div>
      <div class="hero-label">${t('dashboard.portfolioValue').toUpperCase()}</div>
      <div class="hero-value">${formatTL(toplamDeger)}</div>
      <div class="hero-sub">${mulkler.length} mülk · ${kiradakiSayi} kiraya verildi · ${formatTL(aylikKira)}/ay gelir</div>
      <div class="hero-bars">${bars}</div>
    </div>

    <div class="metric-grid">
      <div class="metric">
        <div class="metric-label">${t('dashboard.altinBazli')}</div>
        <div class="metric-value">${altinGram.toLocaleString('tr-TR')} gr</div>
        <div class="metric-sub c-muted">1 gr = ${formatTL(piyasa.altinGr)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">${t('dashboard.usdBazli')}</div>
        <div class="metric-value">$${usdDeger.toLocaleString('tr-TR')}</div>
        <div class="metric-sub c-muted">1 USD = ₺${piyasa.usd.toFixed(2)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">${t('dashboard.aylikKira')}</div>
        <div class="metric-value">${formatTL(aylikKira)}</div>
        <div class="metric-sub c-green">${kiradakiSayi}/${mulkler.length} mülk kirada</div>
      </div>
      <div class="metric">
        <div class="metric-label">${t('dashboard.toplamMulk')}</div>
        <div class="metric-value">${mulkler.length}</div>
        <div class="metric-sub c-muted">${formatTL(toplamAlis)} alış toplamı</div>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-header">
          <span class="card-title">${t('dashboard.mulklerim')}</span>
          <button class="btn btn-outline btn-sm" onclick="navigate('#mulkler')">${t('dashboard.tumunu')} →</button>
        </div>
        ${mulkRows}
      </div>

      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="card">
          <div class="card-header"><span class="card-title">${t('dashboard.canliKurlar')}</span></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
            <div style="padding:12px 14px;border-right:0.5px solid var(--border);border-bottom:0.5px solid var(--border)">
              <div style="font-size:11px;color:var(--text3)">USD</div>
              <div style="font-size:16px;font-weight:500;margin-top:2px">₺${piyasa.usd.toFixed(2)}</div>
            </div>
            <div style="padding:12px 14px;border-bottom:0.5px solid var(--border)">
              <div style="font-size:11px;color:var(--text3)">EUR</div>
              <div style="font-size:16px;font-weight:500;margin-top:2px">₺${piyasa.eur.toFixed(2)}</div>
            </div>
            <div style="padding:12px 14px;border-right:0.5px solid var(--border)">
              <div style="font-size:11px;color:var(--text3)">Altın/gr</div>
              <div style="font-size:16px;font-weight:500;margin-top:2px">₺${Math.round(piyasa.altinGr).toLocaleString('tr-TR')}</div>
            </div>
            <div style="padding:12px 14px">
              <div style="font-size:11px;color:var(--text3)">BTC</div>
              <div style="font-size:16px;font-weight:500;margin-top:2px">₺${Math.round(piyasa.btc/1000)}K</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">${t('dashboard.portfoyDagilim')}</span></div>
          <div class="card-body">${dagilimBars}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">${t('dashboard.karsilastirma')} — Aynı parayı başka yerde tutsaydım?</span>
        <button class="btn btn-outline btn-sm" onclick="navigate('#performans')">Detaylı analiz →</button>
      </div>
      ${compareRows}
    </div>`;

  window.openMulk = (id) => navigate(`#mulk-${id}`);
}
