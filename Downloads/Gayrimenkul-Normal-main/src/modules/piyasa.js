/**
 * src/modules/piyasa.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * Anayasa: K01, K03, K07, K10
 * v1.2 / 2026-03-27
 *
 * Piyasa Endeksleri — Mülk değerini USD, EUR, Altın (gram/ons),
 * Gümüş, Bitcoin, Ethereum, TÜFE bazlı göster.
 * Kira verimini kur bazlı hesapla.
 * Trend grafikleri (canvas).
 *
 * Veri kaynağı:
 *   - Döviz: api.exchangerate-api.com (ücretsiz, no key)
 *   - Kripto: api.coingecko.com (ücretsiz, no key)
 *   - Altın/Gümüş: metals.live (fallback: statik)
 */

import { getMulkler }  from '../core/database.js';
import { t }           from '../core/i18n.js';
import { handleError } from '../core/error-handler.js';
import { showToast }   from '../ui/toast.js';

let _mulkler = [];
let _kurlar  = {
  USD: null, EUR: null, GBP: null,
  ALTIN_GRAM: null, ALTIN_ONS: null, GUMUS: null,
  BTC: null, ETH: null,
  TUFE: 48.6, // Son 12 aylık TÜFE (%) — manuel güncelleme
};
let _yukleniyor = false;

// ─── Render ───────────────────────────────────────────────
export async function render(container) {
  container.innerHTML = `<div class="empty"><div class="empty-icon">⏳</div><div class="empty-text">Kurlar yükleniyor...</div></div>`;
  try {
    _mulkler = await getMulkler();
    await _kurlarCek();
    container.innerHTML = _buildHTML();
    _drawTrendChart();
    _bindEvents();
  } catch (err) {
    handleError(err, 'piyasa.render');
  }
}

// ─── Kur Çekimi ───────────────────────────────────────────
async function _kurlarCek() {
  if (_yukleniyor) return;
  _yukleniyor = true;

  // 1. Döviz kurları (TRY bazlı)
  try {
    const r = await fetch('https://api.exchangerate-api.com/v4/latest/TRY', { signal: AbortSignal.timeout(6000) });
    if (r.ok) {
      const d = await r.json();
      // API TRY bazlı verirse 1/rate
      if (d.rates) {
        _kurlar.USD = d.rates.USD ? +(1 / d.rates.USD).toFixed(2) : null;
        _kurlar.EUR = d.rates.EUR ? +(1 / d.rates.EUR).toFixed(2) : null;
        _kurlar.GBP = d.rates.GBP ? +(1 / d.rates.GBP).toFixed(2) : null;
      }
    }
  } catch (_) {
    // Fallback statik kurlar (son bilinen)
    _kurlar.USD = 38.50;
    _kurlar.EUR = 41.80;
    _kurlar.GBP = 48.90;
  }

  // 2. Kripto (CoinGecko — ücretsiz endpoint)
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=try', { signal: AbortSignal.timeout(6000) });
    if (r.ok) {
      const d = await r.json();
      _kurlar.BTC = d?.bitcoin?.try || null;
      _kurlar.ETH = d?.ethereum?.try || null;
    }
  } catch (_) {
    _kurlar.BTC = 3_800_000;
    _kurlar.ETH = 195_000;
  }

  // 3. Altın / Gümüş (gram fiyatı TRY)
  // metals.live ücretsiz endpoint deniyoruz, yoksa hesaplıyoruz
  try {
    const r = await fetch('https://api.metals.live/v1/spot/gold,silver', { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const d = await r.json();
      // USD/ons → TRY/gram (1 troy ons = 31.1035 gram)
      const goldUsd = d?.[0]?.price || d?.gold || 3400;
      const silvUsd = d?.[1]?.price || d?.silver || 33;
      const usd     = _kurlar.USD || 38.5;
      _kurlar.ALTIN_ONS  = Math.round(goldUsd * usd);
      _kurlar.ALTIN_GRAM = Math.round((goldUsd / 31.1035) * usd);
      _kurlar.GUMUS      = Math.round((silvUsd / 31.1035) * usd);
    }
  } catch (_) {
    // Fallback: USD/ons × kur / 31.1035
    const usd = _kurlar.USD || 38.5;
    _kurlar.ALTIN_ONS  = Math.round(3400 * usd);
    _kurlar.ALTIN_GRAM = Math.round((3400 / 31.1035) * usd);
    _kurlar.GUMUS      = Math.round((33 / 31.1035) * usd);
  }

  _yukleniyor = false;
}

// ─── HTML ─────────────────────────────────────────────────
function _buildHTML() {
  const toplam    = _mulkler.reduce((s, m) => s + (m.guncelDeger||0), 0);
  const kira12    = _mulkler.reduce((s, m) => s + (m.aylikKira||0), 0) * 12;
  const maliyet   = _mulkler.reduce((s, m) => s + (m.alisFiyati||0), 0);

  return `
  <!-- Canlı Kurlar -->
  <div class="card" style="margin-bottom:16px">
    <div class="card-header">
      <span class="card-title">📡 Canlı Piyasa Verileri</span>
      <button class="btn btn-outline btn-sm" onclick="window._piyasaYenile()" id="piyasa-yenile-btn">🔄 Yenile</button>
    </div>
    <div class="card-body-padded">
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">
        ${_buildKurCard('🇺🇸 USD', _kurlar.USD, '₺', '')}
        ${_buildKurCard('🇪🇺 EUR', _kurlar.EUR, '₺', '')}
        ${_buildKurCard('🇬🇧 GBP', _kurlar.GBP, '₺', '')}
        ${_buildKurCard('🥇 Altın/g', _kurlar.ALTIN_GRAM, '₺', '')}
        ${_buildKurCard('🥈 Gümüş/g', _kurlar.GUMUS, '₺', '')}
        ${_buildKurCard('₿ Bitcoin', _kurlar.BTC, '₺', 'M')}
        ${_buildKurCard('Ξ Ethereum', _kurlar.ETH, '₺', 'K')}
        ${_buildKurCard('📈 TÜFE/yıl', _kurlar.TUFE, '%', '')}
      </div>
      <div style="margin-top:10px;font-size:10.5px;color:var(--text-tertiary);text-align:right">
        Kaynak: ExchangeRate-API, CoinGecko · Son güncelleme: ${new Date().toLocaleTimeString('tr-TR')}
      </div>
    </div>
  </div>

  <!-- Portföy Kur Bazlı Değer -->
  <div class="two-col" style="margin-bottom:16px">
    <div class="card">
      <div class="card-header"><span class="card-title">💼 Portföy Değeri — Kur Bazlı</span></div>
      <div class="card-body-padded">
        ${_buildPortfoyKur(toplam, maliyet)}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">🏠 Mülk Bazında Analiz</span></div>
      <div class="card-body" style="max-height:280px;overflow-y:auto">
        ${_buildMulkTable()}
      </div>
    </div>
  </div>

  <!-- Altın Endeksi -->
  <div class="two-col">
    <div class="card">
      <div class="card-header"><span class="card-title">🥇 Altın Endeksi Karşılaştırması</span></div>
      <div class="card-body-padded">
        ${_buildAltinEndeks(toplam, maliyet)}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">📊 Kira Getirisi Kur Bazlı</span></div>
      <div class="card-body-padded">
        ${_buildKiraGetiri(toplam, kira12)}
      </div>
    </div>
  </div>

  <!-- Trend Grafik -->
  <div class="card" style="margin-top:16px">
    <div class="card-header">
      <span class="card-title">📈 Portföy Değer Trendi (Altın Bazlı Simülasyon)</span>
      <div style="display:flex;gap:6px">
        ${['3A','6A','1Y','3Y'].map(p => 
          `<button class="filter-chip${p==='1Y'?' active':''}" onclick="window._piyasaTrend('${p}')" data-trend="${p}">${p}</button>`
        ).join('')}
      </div>
    </div>
    <div class="card-body-padded">
      <canvas id="trend-chart" height="160"></canvas>
    </div>
  </div>

  <!-- TÜFE Reel Değer -->
  <div class="card" style="margin-top:16px">
    <div class="card-header"><span class="card-title">📉 TÜFE — Reel Değer Analizi</span></div>
    <div class="card-body-padded">
      ${_buildTufeAnaliz(toplam, maliyet)}
    </div>
  </div>`;
}

// ─── Kur Kartı ────────────────────────────────────────────
function _buildKurCard(label, deger, birim, suffix) {
  let display = '—';
  if (deger !== null && deger !== undefined) {
    if (suffix === 'M') display = birim + (deger/1_000_000).toFixed(2) + 'M';
    else if (suffix === 'K') display = birim + (deger/1000).toFixed(0) + 'K';
    else display = birim + Number(deger).toLocaleString('tr-TR');
  }
  return `
    <div style="background:var(--bg-secondary);border-radius:8px;padding:12px;text-align:center">
      <div style="font-size:11px;color:var(--text-tertiary);margin-bottom:4px">${label}</div>
      <div style="font-size:14px;font-weight:700;color:var(--text-primary)">${display}</div>
    </div>`;
}

// ─── Portföy Kur Bazlı ───────────────────────────────────
function _buildPortfoyKur(toplam, maliyet) {
  const rows = [
    ['₺ TRY', toplam, '₺'],
    ['🇺🇸 USD', _kurlar.USD ? toplam / _kurlar.USD : null, '$'],
    ['🇪🇺 EUR', _kurlar.EUR ? toplam / _kurlar.EUR : null, '€'],
    ['🥇 Altın (gram)', _kurlar.ALTIN_GRAM ? toplam / _kurlar.ALTIN_GRAM : null, 'gr'],
    ['🥇 Altın (ons)', _kurlar.ALTIN_ONS ? toplam / _kurlar.ALTIN_ONS : null, 'oz'],
    ['₿ Bitcoin', _kurlar.BTC ? toplam / _kurlar.BTC : null, '₿'],
    ['Ξ Ethereum', _kurlar.ETH ? toplam / _kurlar.ETH : null, 'ETH'],
  ];
  return rows.map(([k, v, b]) => `
    <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border-light);font-size:12px">
      <span style="color:var(--text-secondary)">${k}</span>
      <span style="font-weight:600">${v !== null && v !== undefined ? b + ' ' + _fmtSmart(v, b) : '—'}</span>
    </div>`).join('');
}

// ─── Mülk Tablosu ─────────────────────────────────────────
function _buildMulkTable() {
  if (!_mulkler.length) return `<div class="empty"><div class="empty-text">Mülk yok.</div></div>`;
  return _mulkler.map(m => {
    const usd = _kurlar.USD && m.guncelDeger ? Math.round(m.guncelDeger / _kurlar.USD) : null;
    const gr  = _kurlar.ALTIN_GRAM && m.guncelDeger ? (m.guncelDeger / _kurlar.ALTIN_GRAM).toFixed(0) : null;
    return `
    <div class="list-row" style="cursor:default">
      <div class="list-main" style="flex:1">
        <div class="list-name" style="font-size:12px">${m.ad}</div>
        <div class="list-sub">${m.sehir} · ${m.tur}</div>
      </div>
      <div style="text-align:right;font-size:11.5px">
        <div style="font-weight:600">₺${_fmtM(m.guncelDeger)}</div>
        ${usd ? `<div style="color:var(--text-tertiary)">$${usd.toLocaleString('tr-TR')}</div>` : ''}
        ${gr ? `<div style="color:#d97706">${gr}gr altın</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ─── Altın Endeksi ────────────────────────────────────────
function _buildAltinEndeks(toplam, maliyet) {
  const altinGram = _kurlar.ALTIN_GRAM || 1;
  const toplamGr  = Math.round(toplam  / altinGram);
  const maliyetGr = Math.round(maliyet / altinGram);
  const farkGr    = toplamGr - maliyetGr;
  const pct       = maliyetGr > 0 ? ((farkGr / maliyetGr) * 100).toFixed(1) : 0;

  return `
  <div style="font-size:12px;margin-bottom:12px;color:var(--text-secondary)">
    1 gram altın = ₺${Number(altinGram).toLocaleString('tr-TR')} (anlık)
  </div>
  ${[
    ['Alış (Maliyet)', maliyetGr, 'gram', ''],
    ['Güncel Değer',   toplamGr,  'gram', ''],
    ['Değer Artışı',   farkGr,    'gram', farkGr >= 0 ? 'color:var(--color-success-text)' : 'color:var(--color-error-text)'],
    ['Altın ROI',      null, `%${pct}`, farkGr >= 0 ? 'color:var(--color-success-text);font-weight:700' : 'color:var(--color-error-text)'],
  ].map(([k, v, suf, style]) => `
    <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border-light);font-size:12px">
      <span style="color:var(--text-secondary)">${k}</span>
      <span style="${style}">${v !== null ? Number(v).toLocaleString('tr-TR') + ' ' + suf : suf}</span>
    </div>`).join('')}
  <div style="margin-top:12px;padding:10px;background:var(--bg-secondary);border-radius:8px;font-size:11.5px;color:var(--text-secondary)">
    💡 Portföyünüz altın bazında <strong style="color:${farkGr>=0?'var(--color-success-text)':'var(--color-error-text)'}">${farkGr>=0?'kazandı':'kaybetti'}</strong>: ${Math.abs(farkGr).toLocaleString('tr-TR')} gram altın eşdeğeri
  </div>`;
}

// ─── Kira Getirisi ────────────────────────────────────────
function _buildKiraGetiri(toplam, kira12) {
  const usd = _kurlar.USD || 1;
  const eur = _kurlar.EUR || 1;
  const gr  = _kurlar.ALTIN_GRAM || 1;
  const yillikKiraUSD = Math.round(kira12 / usd);
  const yillikKiraEUR = Math.round(kira12 / eur);
  const yillikKiraGr  = (kira12 / gr).toFixed(1);
  const kiraVerimi    = toplam > 0 ? (kira12 / toplam * 100).toFixed(2) : 0;

  return [
    ['Yıllık Kira (₺)', kira12, '₺'],
    ['Yıllık Kira (USD)', yillikKiraUSD, '$'],
    ['Yıllık Kira (EUR)', yillikKiraEUR, '€'],
    ['Yıllık Kira (Altın)', yillikKiraGr, 'gr'],
    ['Kira Verimi', null, `%${kiraVerimi}`],
    [`TÜFE'ye göre reel verim`, null, `%${Math.max(0, kiraVerimi - _kurlar.TUFE).toFixed(2)}`],
  ].map(([k, v, suf]) => `
    <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border-light);font-size:12px">
      <span style="color:var(--text-secondary)">${k}</span>
      <span style="font-weight:500">${v !== null ? suf + ' ' + Number(v).toLocaleString('tr-TR') : suf}</span>
    </div>`).join('');
}

// ─── TÜFE Reel Değer ─────────────────────────────────────
function _buildTufeAnaliz(toplam, maliyet) {
  const tufe = _kurlar.TUFE / 100;
  const reel = maliyet > 0 ? ((toplam - maliyet) / maliyet * 100).toFixed(1) : 0;
  const reelNet = (reel - _kurlar.TUFE).toFixed(1);

  return `
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px">
    <div style="background:var(--bg-secondary);border-radius:8px;padding:12px;text-align:center">
      <div style="font-size:11px;color:var(--text-tertiary)">Nominal ROI</div>
      <div style="font-size:18px;font-weight:700;color:var(--color-success-text)">%${reel}</div>
    </div>
    <div style="background:var(--bg-secondary);border-radius:8px;padding:12px;text-align:center">
      <div style="font-size:11px;color:var(--text-tertiary)">TÜFE (Yıllık)</div>
      <div style="font-size:18px;font-weight:700;color:var(--color-error-text)">%${_kurlar.TUFE}</div>
    </div>
    <div style="background:var(--bg-secondary);border-radius:8px;padding:12px;text-align:center">
      <div style="font-size:11px;color:var(--text-tertiary)">Reel Getiri</div>
      <div style="font-size:18px;font-weight:700;color:${reelNet >= 0 ? 'var(--color-success-text)' : 'var(--color-error-text)'}">%${reelNet}</div>
    </div>
  </div>
  <div style="font-size:11.5px;color:var(--text-secondary);padding:10px;background:var(--bg-secondary);border-radius:8px">
    📌 <strong>Reel Getiri</strong> = Nominal ROI − TÜFE<br>
    Portföyünüz enflasyon karşısında <strong style="color:${reelNet>=0?'var(--color-success-text)':'var(--color-error-text)'}">
    ${reelNet>=0?'değer kazandı':'değer kaybetti'}</strong>. TÜFE oranını manuel güncelleyebilirsiniz.
    <br><br>
    <label style="display:flex;align-items:center;gap:8px">
      <span>TÜFE (%):</span>
      <input type="number" id="tufe-input" value="${_kurlar.TUFE}" step="0.1" min="0" max="200"
        style="width:70px;padding:4px 6px;border:1px solid var(--border);border-radius:4px;background:var(--bg-primary);color:var(--text-primary);font-size:12px"
        onchange="window._piyasaTufeGuncelle(this.value)">
      <span style="color:var(--text-tertiary)">son 12 aylık TÜFE</span>
    </label>
  </div>`;
}

// ─── Trend Grafik ─────────────────────────────────────────
let _trendPeriod = '1Y';

function _drawTrendChart() {
  const canvas = document.getElementById('trend-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 600;
  const H = 160;
  canvas.width = W; canvas.height = H;

  // Simüle edilmiş trend (gerçek tarihsel veri yok — gösterim amaçlı)
  const periods = { '3A': 3, '6A': 6, '1Y': 12, '3Y': 36 };
  const ayCount = periods[_trendPeriod] || 12;
  const toplam  = _mulkler.reduce((s, m) => s + (m.guncelDeger||0), 0);
  const altinGr = _kurlar.ALTIN_GRAM || 5000;

  // Altın bazlı değer simülasyonu: hafif salınım + trend
  const points = Array.from({ length: ayCount + 1 }, (_, i) => {
    const ratio = i / ayCount;
    // Basit sine wave + upward trend
    const noise = Math.sin(i * 1.3) * 0.04 + Math.cos(i * 0.8) * 0.025;
    const trend = ratio * 0.15;
    return toplam / altinGr * (0.85 + trend + noise);
  });

  const maxP = Math.max(...points);
  const minP = Math.min(...points);
  const range = maxP - minP || 1;

  const pad = { top: 20, right: 20, bottom: 30, left: 60 };
  const cW   = W - pad.left - pad.right;
  const cH   = H - pad.top  - pad.bottom;

  const style   = getComputedStyle(document.documentElement);
  const primary = style.getPropertyValue('--btn-primary-bg').trim() || '#2563eb';
  const textCol = style.getPropertyValue('--text-tertiary').trim() || '#9ca3af';
  const gridCol = style.getPropertyValue('--border-light').trim() || '#e5e7eb';

  ctx.clearRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = gridCol; ctx.lineWidth = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(r => {
    const y = pad.top + cH * (1 - r);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
    ctx.fillStyle = textCol; ctx.font = '9.5px Inter,sans-serif'; ctx.textAlign = 'right';
    ctx.fillText((minP + range * r).toFixed(0) + 'gr', pad.left - 4, y + 3);
  });

  // Alan dolgu
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = pad.left + (i / ayCount) * cW;
    const y = pad.top  + cH * (1 - (p - minP) / range);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.left + cW, pad.top + cH);
  ctx.lineTo(pad.left, pad.top + cH);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
  grad.addColorStop(0, primary + '44');
  grad.addColorStop(1, primary + '00');
  ctx.fillStyle = grad; ctx.fill();

  // Çizgi
  ctx.beginPath(); ctx.strokeStyle = primary; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  points.forEach((p, i) => {
    const x = pad.left + (i / ayCount) * cW;
    const y = pad.top  + cH * (1 - (p - minP) / range);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // X ekseni ay etiketleri
  const step = Math.max(1, Math.floor(ayCount / 6));
  const now  = new Date();
  ctx.fillStyle = textCol; ctx.font = '9px Inter,sans-serif'; ctx.textAlign = 'center';
  for (let i = 0; i <= ayCount; i += step) {
    const d = new Date(now); d.setMonth(d.getMonth() - (ayCount - i));
    const label = d.toLocaleString('tr-TR', { month: 'short', year: ayCount > 12 ? '2-digit' : undefined });
    const x = pad.left + (i / ayCount) * cW;
    ctx.fillText(label, x, H - 8);
  }
}

// ─── Olayları Bağla ───────────────────────────────────────
function _bindEvents() {
  window._piyasaYenile = async () => {
    const btn = document.getElementById('piyasa-yenile-btn');
    if (btn) btn.textContent = '⏳ Yükleniyor...';
    _yukleniyor = false;
    await _kurlarCek();
    const container = document.getElementById('page-content');
    if (container) {
      const tmp = document.createElement('div');
      await render(tmp);
      container.innerHTML = tmp.innerHTML;
      _drawTrendChart();
      _bindEvents();
    }
    showToast('success', 'Kurlar güncellendi.');
  };

  window._piyasaTrend = (period) => {
    _trendPeriod = period;
    document.querySelectorAll('[data-trend]').forEach(b => b.classList.toggle('active', b.dataset.trend === period));
    _drawTrendChart();
  };

  window._piyasaTufeGuncelle = (val) => {
    _kurlar.TUFE = parseFloat(val) || 0;
    const container = document.getElementById('page-content');
    if (container) {
      const toplam  = _mulkler.reduce((s, m) => s + (m.guncelDeger||0), 0);
      const maliyet = _mulkler.reduce((s, m) => s + (m.alisFiyati||0), 0);
      const kira12  = _mulkler.reduce((s, m) => s + (m.aylikKira||0), 0) * 12;
      // Sadece TÜFE bölümünü yeniden render et
      const tufeSec = document.querySelector('.card:last-child .card-body-padded');
      if (tufeSec) tufeSec.innerHTML = _buildTufeAnaliz(toplam, maliyet);
    }
  };
}

// ─── Yardımcılar ──────────────────────────────────────────
function _fmtM(n) {
  if (!n) return '0';
  const m = n / 1_000_000;
  return m >= 1 ? m.toFixed(2).replace(/\.?0+$/, '') + 'M' : Number(n).toLocaleString('tr-TR');
}

function _fmtSmart(n, birim) {
  if (n === null || n === undefined) return '—';
  if (birim === '₿') return n.toFixed(4);
  if (birim === 'ETH') return n.toFixed(2);
  if (birim === 'gr' || birim === 'oz') return n.toFixed(0);
  return Number(Math.round(n)).toLocaleString('tr-TR');
}
