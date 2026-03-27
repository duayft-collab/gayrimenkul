/**
 * src/modules/raporlar.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.1 / 2026-03-27
 *
 * Raporlar modülü — Yıllık gelir/gider özeti, aylık grafik,
 * gider kırılımı, mülk tipi gelir dağılımı, CSV/JSON export.
 */

import { getMulkler }  from '../core/database.js';
import { getOdemeler } from '../core/database.js';
import { getIslemler } from '../core/database.js';
import { requirePermission } from '../core/auth.js';
import { t }           from '../core/i18n.js';
import { showToast }   from '../ui/toast.js';
import { handleError } from '../core/error-handler.js';

let _mulkler  = [];
let _odemeler = [];
let _islemler = [];
let _yil      = new Date().getFullYear();

// ─── Render ───────────────────────────────────────────────
export async function render(container) {
  container.innerHTML = `<div class="empty"><div class="empty-icon">⏳</div><div class="empty-text">${t('ui.loading')}</div></div>`;
  try {
    [_mulkler, _odemeler, _islemler] = await Promise.all([getMulkler(), getOdemeler(), getIslemler([], 'createdAt', null)]);
    container.innerHTML = _buildHTML();
    _drawChart();
    _bindEvents();
  } catch (err) { handleError(err, 'raporlar.render'); }
}

// ─── HTML ─────────────────────────────────────────────────
function _buildHTML() {
  const yilStr  = String(_yil);
  const yilOde  = _odemeler.filter(o => (o.donem||'').startsWith(yilStr) && o.durum === 'Ödendi');
  const yilSat  = _islemler.filter(i => (i.tarih||'').startsWith(yilStr) && i.tur === 'Satış' && i.durum === 'Tamamlandı');

  const kiraGelir = yilOde.reduce((s, o) => s + (o.tutar||0), 0);
  const satisGelir = yilSat.reduce((s, i) => s + (i.satisFiyati||0), 0);
  const toplamGelir = kiraGelir + satisGelir;

  // Tahmini giderler (vergi, bakım, sigorta — %15 tahmini)
  const toplamGider = Math.round(toplamGelir * 0.15);
  const netKar      = toplamGelir - toplamGider;

  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px">
    <div style="display:flex;align-items:center;gap:8px">
      <button class="btn btn-outline btn-sm" onclick="window._raporYilChange(-1)">‹</button>
      <span style="font-size:14px;font-weight:600" id="rapor-yil-label">${_yil} Yılı</span>
      <button class="btn btn-outline btn-sm" onclick="window._raporYilChange(1)">›</button>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-outline btn-sm" onclick="window._raporExportCSV()">📊 CSV İndir</button>
      <button class="btn btn-outline btn-sm" onclick="window._raporExportJSON()">📄 JSON İndir</button>
    </div>
  </div>

  <!-- Özet Metrikler -->
  <div class="metrics-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
    <div class="metric-card">
      <div class="metric-label">${t('raporlar.annualIncome')}</div>
      <div class="metric-value" style="color:var(--color-success-text)">₺${_fmtM(toplamGelir)}</div>
      <div class="metric-sub">${t('raporlar.rentPlusSales')}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">${t('raporlar.annualExpense')}</div>
      <div class="metric-value" style="color:var(--color-error-text)">₺${_fmtM(toplamGider)}</div>
      <div class="metric-sub">${t('raporlar.maintenanceTaxIns')}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">${t('raporlar.netProfit')}</div>
      <div class="metric-value">₺${_fmtM(netKar)}</div>
      <div class="metric-sub">${t('raporlar.preTax')}</div>
    </div>
  </div>

  <div class="two-col">
    <div>
      <!-- Aylık Gelir Grafiği -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><span class="card-title">${t('raporlar.monthlyChart')}</span></div>
        <div class="card-body-padded">
          <canvas id="rapor-chart" height="180"></canvas>
        </div>
      </div>

      <!-- Gelir Kalemi Tablosu -->
      <div class="card">
        <div class="card-header"><span class="card-title">Gelir & Gider Tablosu</span></div>
        <div class="card-body">
          ${_buildIncomeTable(kiraGelir, satisGelir, toplamGider)}
        </div>
      </div>
    </div>

    <div class="col-stack">
      <!-- Gider Kırılımı -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><span class="card-title">${t('raporlar.expenseBreakdown')}</span></div>
        <div class="card-body-padded">
          ${_buildExpenseBreakdown(toplamGelir)}
        </div>
      </div>

      <!-- Mülk Tipi Gelir Dağılımı -->
      <div class="card">
        <div class="card-header"><span class="card-title">${t('raporlar.incomeByType')}</span></div>
        <div class="card-body-padded">
          ${_buildIncomeByType()}
        </div>
      </div>
    </div>
  </div>`;
}

// ─── Aylık Grafik (Canvas) ────────────────────────────────
function _drawChart() {
  const canvas = document.getElementById('rapor-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const months = t('raporlar.months');
  const yilStr = String(_yil);

  const aylikGelir = months.map((_, i) => {
    const donem = yilStr + '-' + String(i + 1).padStart(2, '0');
    return _odemeler.filter(o => o.donem === donem && o.durum === 'Ödendi').reduce((s, o) => s + (o.tutar||0), 0);
  });

  const maxVal = Math.max(...aylikGelir, 1);
  const W = canvas.offsetWidth || 500;
  const H = 180;
  canvas.width  = W;
  canvas.height = H;

  const pad = { top: 20, right: 20, bottom: 30, left: 55 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const barW   = Math.floor(chartW / 12) - 4;

  // CSS değişkenlerinden renkleri al
  const style   = getComputedStyle(document.documentElement);
  const primary = style.getPropertyValue('--btn-primary-bg').trim() || '#2563eb';
  const textCol = style.getPropertyValue('--text-tertiary').trim() || '#9ca3af';
  const gridCol = style.getPropertyValue('--border-light').trim() || '#e5e7eb';

  // Grid çizgileri
  ctx.strokeStyle = gridCol;
  ctx.lineWidth   = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(ratio => {
    const y = pad.top + chartH * (1 - ratio);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
    ctx.fillStyle = textCol;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('₺' + _fmtK(maxVal * ratio), pad.left - 4, y + 3);
  });

  // Barlar
  aylikGelir.forEach((val, i) => {
    const x  = pad.left + i * (chartW / 12) + 2;
    const bh = chartH * (val / maxVal);
    const y  = pad.top + chartH - bh;

    ctx.fillStyle = primary;
    ctx.globalAlpha = 0.85;
    _roundedRect(ctx, x, y, barW, bh, 3);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Ay etiketi
    ctx.fillStyle = textCol;
    ctx.font = '9.5px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(months[i], x + barW / 2, H - 8);
  });
}

function _roundedRect(ctx, x, y, w, h, r) {
  if (h < r) r = h;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Gelir Tablosu ────────────────────────────────────────
function _buildIncomeTable(kira, satis, gider) {
  const rows = [
    ['Kira Gelirleri',   kira,    'tag-green'],
    ['Satış Gelirleri',  satis,   'tag-green'],
    ['Tahmini Giderler', -gider,  'tag-red'],
    ['Net Kâr',          kira + satis - gider, 'tag-info'],
  ];
  return rows.map(([k, v, cls]) => `
    <div class="list-row" style="cursor:default">
      <div class="list-main" style="flex:1"><div class="list-name">${k}</div></div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;font-weight:600;color:${v>=0?'var(--color-success-text)':'var(--color-error-text)'}">
          ${v<0?'-':''}₺${_fmtM(Math.abs(v))}
        </span>
        <span class="tag ${cls}">${v>=0?'Gelir':'Gider'}</span>
      </div>
    </div>`).join('');
}

// ─── Gider Kırılımı ───────────────────────────────────────
function _buildExpenseBreakdown(gelir) {
  const items = [
    { k: 'Bakım & Onarım', oran: 6 },
    { k: 'Vergi & Harçlar', oran: 5 },
    { k: 'Sigorta',         oran: 2 },
    { k: 'Yönetim Gideri', oran: 2 },
  ];
  return items.map(({ k, oran }) => {
    const tutar = Math.round(gelir * oran / 100);
    return `<div class="dagil-row">
      <span class="dagil-name" style="width:130px">${k}</span>
      <div class="dagil-bar"><div class="dagil-fill" style="width:${Math.min(oran*6.6, 100)}%"></div></div>
      <span class="dagil-pct" style="width:70px;text-align:right">%${oran} · ₺${_fmtK(tutar)}</span>
    </div>`;
  }).join('');
}

// ─── Mülk Tipi Gelir ─────────────────────────────────────
function _buildIncomeByType() {
  const types  = ['Konut', 'Ticari', 'Arsa', 'Bina'];
  const toplam = _mulkler.reduce((s, m) => s + (m.aylikKira||0), 0) * 12 || 1;
  return types.map(tur => {
    const yillik = _mulkler.filter(m => m.tur === tur).reduce((s, m) => s + (m.aylikKira||0), 0) * 12;
    const pct    = Math.round(yillik / toplam * 100);
    return `<div class="dagil-row">
      <span class="dagil-name">${_emoji(tur)} ${tur}</span>
      <div class="dagil-bar"><div class="dagil-fill" style="width:${pct}%"></div></div>
      <span class="dagil-pct">%${pct}</span>
    </div>`;
  }).join('');
}

// ─── Export ───────────────────────────────────────────────
function _exportCSV() {
  try { requirePermission('raporlar', 'export'); } catch { return; }
  const yilStr = String(_yil);
  const rows   = [['Dönem','Mülk','Kiracı','Tutar','Durum']];
  _odemeler.filter(o => (o.donem||'').startsWith(yilStr)).forEach(o => {
    rows.push([o.donem||'', o.mulkAd||'', o.taraf||'', o.tutar||0, o.durum||'']);
  });
  const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  _download(`rapor-${_yil}.csv`, 'text/csv', csv);
  showToast('success', `${_yil} raporu CSV olarak indirildi.`);
}

function _exportJSON() {
  try { requirePermission('raporlar', 'export'); } catch { return; }
  const payload = { yil: _yil, mulkler: _mulkler, odemeler: _odemeler, islemler: _islemler };
  _download(`rapor-${_yil}.json`, 'application/json', JSON.stringify(payload, null, 2));
  showToast('success', `${_yil} raporu JSON olarak indirildi.`);
}

function _download(filename, mime, content) {
  const a = document.createElement('a');
  a.href  = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Yıl Değiştir ─────────────────────────────────────────
async function _yilChange(delta) {
  _yil += delta;
  const label = document.getElementById('rapor-yil-label');
  if (label) label.textContent = `${_yil} Yılı`;
  // Grafik ve içeriği güncelle (basit yeniden render)
  const content = document.querySelector('.content') || document.getElementById('page-content');
  if (content) {
    const tmp = document.createElement('div');
    await render(tmp);
    content.innerHTML = tmp.innerHTML;
    _drawChart();
    _bindEvents();
  }
}

// ─── Olayları Bağla ───────────────────────────────────────
function _bindEvents() {
  window._raporYilChange  = _yilChange;
  window._raporExportCSV  = _exportCSV;
  window._raporExportJSON = _exportJSON;
}

// ─── Yardımcılar ──────────────────────────────────────────
function _fmtM(n) {
  if (!n) return '0';
  const m = n / 1_000_000;
  return m >= 1 ? m.toFixed(2).replace(/\.?0+$/, '') + 'M' : Number(n).toLocaleString('tr-TR');
}
function _fmtK(n) {
  if (!n) return '0';
  return n >= 1000 ? (n / 1000).toFixed(0) + 'K' : String(n);
}
function _emoji(tur) { return { Konut:'🏠', Ticari:'🏢', Arsa:'🌾', Bina:'🏗️' }[tur] || '🏠'; }
