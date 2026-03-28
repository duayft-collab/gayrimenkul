/**
 * src/modules/hesap.js
 * Duay Global Trade Company — Property OS
 * v1.0 / 2026-03-28
 */

import { formatTL } from '../core/piyasa.js';

export async function render(container) {
  container.innerHTML = `
    <div style="max-width:560px">
      <div class="card">
        <div class="card-header"><span class="card-title">Kredi & Yatırım Hesaplayıcı</span></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Toplam fiyat (₺)</label>
              <input class="form-control" id="h-fiyat" type="number" value="4000000" oninput="window._hesapla()">
            </div>
            <div class="form-group">
              <label class="form-label">Peşinat (₺)</label>
              <input class="form-control" id="h-pesinat" type="number" value="1000000" oninput="window._hesapla()">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Faiz oranı (% yıllık)</label>
              <input class="form-control" id="h-faiz" type="number" value="3.5" step="0.1" oninput="window._hesapla()">
            </div>
            <div class="form-group">
              <label class="form-label">Süre (ay)</label>
              <input class="form-control" id="h-sure" type="number" value="120" oninput="window._hesapla()">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Beklenen aylık kira (₺)</label>
            <input class="form-control" id="h-kira" type="number" value="18000" oninput="window._hesapla()">
          </div>
        </div>
      </div>

      <div id="hesap-sonuc" style="margin-top:12px"></div>
    </div>`;

  window._hesapla = () => {
    const fiyat   = parseInt(document.getElementById('h-fiyat').value)   || 0;
    const pesinat = parseInt(document.getElementById('h-pesinat').value)  || 0;
    const faiz    = parseFloat(document.getElementById('h-faiz').value)   || 0;
    const sure    = parseInt(document.getElementById('h-sure').value)     || 1;
    const kira    = parseInt(document.getElementById('h-kira').value)     || 0;

    const kredi        = fiyat - pesinat;
    const aylikFaiz    = faiz / 100 / 12;
    const aylikOdeme   = kredi > 0 && aylikFaiz > 0
      ? Math.round(kredi * (aylikFaiz * Math.pow(1+aylikFaiz, sure)) / (Math.pow(1+aylikFaiz, sure)-1))
      : Math.round(kredi / sure);
    const toplamOdeme  = aylikOdeme * sure;
    const toplamFaiz   = toplamOdeme - kredi;
    const netkira      = kira - aylikOdeme;
    const amortisman   = netkira > 0 ? Math.ceil(fiyat / (kira * 12)) : null;

    const sonuc = document.getElementById('hesap-sonuc');
    if (!sonuc) return;
    sonuc.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div class="metric">
          <div class="metric-label">Aylık kredi ödemesi</div>
          <div class="metric-value">${formatTL(aylikOdeme)}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Net kira geliri</div>
          <div class="metric-value ${netkira>=0?'':'c-red'}">${formatTL(netkira)}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Toplam maliyet</div>
          <div class="metric-value">${formatTL(toplamOdeme + pesinat)}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Amortisman süresi</div>
          <div class="metric-value">${amortisman ? amortisman+' yıl' : '—'}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-body">
          <div style="font-size:13px;color:var(--text2);line-height:1.7">
            <strong>${formatTL(fiyat)}</strong> değerindeki mülk için
            <strong>${formatTL(pesinat)}</strong> peşinat ve
            <strong>${formatTL(aylikOdeme)}/ay</strong> kredi ödemesiyle,
            aylık <strong>${formatTL(kira)}</strong> kira geliriyle
            ${amortisman ? `<strong>${amortisman} yılda</strong> amorti edersiniz.` : 'kira krediyi karşılamıyor.'}
          </div>
        </div>
      </div>`;
  };
  window._hesapla();
}
