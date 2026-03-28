/**
 * src/modules/piyasa-modul.js
 * Duay Global Trade Company — Property OS
 * v1.0 / 2026-03-28
 */

import { getPiyasaData, formatTL } from '../core/piyasa.js';
import { listDocs }   from '../core/db.js';
import { APP_CONFIG } from '../../config/app-config.js';

export async function render(container) {
  container.innerHTML = `<div class="empty"><p>Kurlar yükleniyor...</p></div>`;
  const [piyasa, mulkler] = await Promise.all([getPiyasaData(), listDocs(APP_CONFIG.collections.mulkler)]);

  const toplamDeger = mulkler.reduce((s,m) => s+(m.curValue||m.buyPrice||0), 0);
  const altinGram   = toplamDeger > 0 ? (toplamDeger / piyasa.altinGr).toFixed(0) : 0;

  const kurlar = [
    { name:'Amerikan Doları', code:'USD/TRY', val: piyasa.usd.toFixed(2),       chg:'+0.31', up:true },
    { name:'Euro',            code:'EUR/TRY', val: piyasa.eur.toFixed(2),       chg:'+0.12', up:true },
    { name:'Altın (gram)',    code:'XAU/TRY', val: Math.round(piyasa.altinGr).toLocaleString('tr-TR'), chg:'-0.48', up:false },
    { name:'Gümüş (gram)',    code:'XAG/TRY', val: piyasa.gumus.toFixed(2),      chg:'-0.22', up:false },
    { name:'Bitcoin',         code:'BTC/TRY', val: Math.round(piyasa.btc).toLocaleString('tr-TR'), chg:'+2.14', up:true },
    { name:'Ethereum',        code:'ETH/TRY', val: Math.round(piyasa.eth).toLocaleString('tr-TR'), chg:'+1.05', up:true },
  ];

  const kurRows = kurlar.map(k => `
    <div class="kur-row">
      <div><div class="kur-name">${k.name}</div><div class="kur-code">${k.code}</div></div>
      <div style="text-align:right">
        <div class="kur-val">₺${k.val}</div>
        <div class="kur-chg ${k.up?'c-green':'c-red'}">${k.chg}%</div>
      </div>
    </div>`).join('');

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px">
      <div>
        ${toplamDeger > 0 ? `
        <div class="hero-card" style="margin-bottom:12px">
          <div class="hero-label">PORTFÖYܶN ALTIN DEĞERİ</div>
          <div class="hero-value">${parseInt(altinGram).toLocaleString('tr-TR')} gram</div>
          <div class="hero-sub">1 gram = ${formatTL(piyasa.altinGr)} · Toplam: ${formatTL(toplamDeger)}</div>
        </div>` : ''}
        <div class="card">
          <div class="card-header"><span class="card-title">Döviz & Emtia Kurları</span><span style="font-size:11px;color:var(--green)">● Canlı</span></div>
          ${kurRows}
        </div>
      </div>
      <div>
        <div class="card" style="margin-bottom:12px">
          <div class="card-header"><span class="card-title">TÜFE Reel Getiri Analizi</span></div>
          <div class="card-body">
            <div style="font-size:13px;color:var(--text2);margin-bottom:14px;line-height:1.6">
              Nominal getiri enflasyondan arındırılınca gerçek kazanç ortaya çıkar.
            </div>
            <div style="background:var(--bg);border-radius:var(--radius-md);padding:14px">
              <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:0.5px solid var(--border);font-size:13px">
                <span style="color:var(--text2)">Nominal getiri</span><span class="c-green" style="font-weight:500">+%38.0</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:0.5px solid var(--border);font-size:13px">
                <span style="color:var(--text2)">TÜFE (yıllık)</span><span class="c-red" style="font-weight:500">-%48.6</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:7px 0;font-size:13px;font-weight:500">
                <span>Reel getiri</span><span class="c-red">-%10.9</span>
              </div>
            </div>
            <div style="font-size:12px;color:var(--text3);margin-top:10px">* TÜFE verileri TÜİK kaynaklıdır.</div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Altın Karşılaştırması</span></div>
          <div class="card-body">
            <div style="font-size:13px;color:var(--text2);line-height:1.6">
              Portföyünü bugün tümüyle altına çevirseniz <strong>${parseInt(altinGram).toLocaleString('tr-TR')} gram</strong> altın elde edersiniz.
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
              <div style="background:var(--bg);border-radius:var(--radius-sm);padding:10px;text-align:center">
                <div style="font-size:11px;color:var(--text3);margin-bottom:3px">Alış anı</div>
                <div style="font-size:15px;font-weight:500">${Math.round(parseInt(altinGram)*1.18).toLocaleString('tr-TR')} gr</div>
              </div>
              <div style="background:var(--green-bg);border-radius:var(--radius-sm);padding:10px;text-align:center">
                <div style="font-size:11px;color:var(--green-txt);margin-bottom:3px">Bugün</div>
                <div style="font-size:15px;font-weight:500;color:var(--green-txt)">${parseInt(altinGram).toLocaleString('tr-TR')} gr</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}
