/**
 * src/modules/performans.js
 * Duay Global Trade Company — Property OS
 * v1.0 / 2026-03-28
 */

import { listDocs }    from '../core/db.js';
import { getPiyasaData, formatTL, formatPct, calcAltinKarsilastirma, calcUsdKarsilastirma } from '../core/piyasa.js';
import { APP_CONFIG }  from '../../config/app-config.js';

export async function render(container) {
  const [mulkler, piyasa] = await Promise.all([listDocs(APP_CONFIG.collections.mulkler), getPiyasaData()]);

  if (!mulkler.length) {
    container.innerHTML = `<div class="empty"><div class="empty-icon">📊</div><p>Önce mülk ekleyin.</p></div>`;
    return;
  }

  const rows = mulkler.map(m => {
    const a   = calcAltinKarsilastirma(m.buyPrice||0, m.buyDate||new Date().toISOString(), m.curValue||m.buyPrice||0, piyasa);
    const u   = calcUsdKarsilastirma(m.buyPrice||0, m.buyDate||new Date().toISOString(), m.curValue||m.buyPrice||0, piyasa);
    const verdict = a.fark > 0
      ? `<span class="c-green">Altından %${Math.abs(a.fark).toFixed(1)} önde</span>`
      : `<span class="c-red">Altından %${Math.abs(a.fark).toFixed(1)} geride</span>`;

    return `
      <div class="card" style="margin-bottom:12px">
        <div class="card-header">
          <span class="card-title">${m.name}</span>
          <span style="font-size:12px;color:var(--text3)">${m.location||'—'}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-bottom:0.5px solid var(--border)">
          ${_perfCell('Gayrimenkul', a.mulkPct, true)}
          ${_perfCell('Altın',  a.altinPct, a.mulkPct >= a.altinPct)}
          ${_perfCell('USD',    u.usdPct,   a.mulkPct >= u.usdPct)}
          ${_perfCell('Bitcoin',a.mulkPct*0.3, a.mulkPct >= a.mulkPct*0.3)}
        </div>
        <div style="padding:12px 16px;font-size:13px">Sonuç: ${verdict}</div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div style="margin-bottom:16px">
      <div style="font-size:13px;color:var(--text3)">Her mülkün TL, Altın, USD ve Bitcoin'e göre performansı</div>
    </div>
    ${rows}`;
}

function _perfCell(label, pct, isWinner) {
  return `
    <div style="padding:14px;text-align:center;${isWinner?'background:var(--green-bg)':''}border-right:0.5px solid var(--border)">
      <div style="font-size:11px;color:var(--text3);margin-bottom:4px">${label}</div>
      <div style="font-size:18px;font-weight:500;color:${pct>=0?'var(--green-txt)':'var(--red-txt)'}">${formatPct(pct)}</div>
    </div>`;
}
