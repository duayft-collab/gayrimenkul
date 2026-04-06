/**
 * @file components/katkarsiligi/PdfRapor.jsx
 * @description PDF fizibilite raporu — window.print() ile HTML → PDF
 *              Ek bir bağımlılık gerekmez; kullanıcı "Save as PDF" seçer.
 */
import { formatKisa } from '../../core/finansal';

export function pdfYazdir(hesap) {
  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) {
    alert('Popup engelleyici PDF raporunu engelliyor. Lütfen bu siteye izin verin.');
    return;
  }
  const h = hesap;
  const tarih = new Date().toLocaleDateString('tr-TR');
  const parselSatir = (h.parseller || []).map(p =>
    `<tr><td>${p.il || ''}</td><td>${p.ilce || ''}</td><td>${p.mahalle || ''}</td><td>${p.ada || ''}</td><td>${p.parsel || ''}</td><td style="text-align:right">${(p.alan || 0).toLocaleString('tr-TR')} m²</td></tr>`
  ).join('');
  const maliyetSatir = (h.maliyetKalemleri || []).filter(k => k.aktif).map(k =>
    `<tr><td>${k.ad}</td><td style="text-align:right">${formatKisa(Math.round((k.tutarTL || 0) * 100))}</td></tr>`
  ).join('');
  const s = h.sonuclar || {};

  w.document.write(`
<!doctype html>
<html><head><meta charset="utf-8"><title>${h.ad || 'Fizibilite Raporu'}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: Georgia, serif; color: #0B0B0F; font-size: 11pt; line-height: 1.45; }
  h1 { color: #C9A84C; border-bottom: 3px solid #C9A84C; padding-bottom: 8px; font-size: 22pt; }
  h2 { color: #0B0B0F; border-bottom: 1px solid #C9A84C; padding-bottom: 4px; margin-top: 24px; font-size: 14pt; }
  h3 { color: #C9A84C; margin-top: 16px; font-size: 11pt; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10pt; }
  th, td { padding: 5px 8px; border-bottom: 1px solid #ddd; text-align: left; }
  th { background: #0B0B0F; color: #C9A84C; }
  .kpi-row { display: flex; gap: 10px; margin: 12px 0; }
  .kpi { flex: 1; border: 1px solid #ddd; padding: 10px; border-radius: 4px; text-align: center; }
  .kpi-lbl { font-size: 8pt; color: #666; text-transform: uppercase; }
  .kpi-val { font-size: 14pt; color: #C9A84C; font-weight: 700; margin-top: 4px; }
  .cover { text-align: center; margin-bottom: 40px; }
  .cover .proje { font-size: 28pt; color: #C9A84C; font-weight: 700; margin: 20px 0; }
  .cover .tarih { color: #666; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 8pt; color: #666; text-align: center; }
  @media print { button { display: none; } }
</style>
</head>
<body>
<button onclick="window.print()" style="position:fixed;top:10px;right:10px;padding:10px 20px;background:#C9A84C;color:#0B0B0F;border:0;border-radius:6px;font-weight:700;cursor:pointer">Yazdır / PDF Kaydet</button>

<div class="cover">
  <div style="color:#C9A84C;font-size:10pt;letter-spacing:3px">FIZIBILITE RAPORU</div>
  <div class="proje">${h.ad || 'İsimsiz Proje'}</div>
  <div class="tarih">${tarih}</div>
  <div style="margin-top:20px;font-size:9pt;color:#666">Hazırlayan: ${h.olusturan || 'Kat Karşılığı Fizibilite Motoru'}</div>
</div>

<h2>1. Yönetici Özeti</h2>
<div class="kpi-row">
  <div class="kpi"><div class="kpi-lbl">Toplam Alan</div><div class="kpi-val">${(h.parseller || []).reduce((a,p)=>a+(p.alan||0),0).toLocaleString('tr-TR')} m²</div></div>
  <div class="kpi"><div class="kpi-lbl">İnşaat m²</div><div class="kpi-val">${Math.round(s.toplamInsaatM2 || 0).toLocaleString('tr-TR')}</div></div>
  <div class="kpi"><div class="kpi-lbl">Net Kâr</div><div class="kpi-val">${formatKisa(s.netKarKurus || 0)}</div></div>
  <div class="kpi"><div class="kpi-lbl">ROI</div><div class="kpi-val">${s.roi != null ? '%' + s.roi.toFixed(1) : '—'}</div></div>
</div>
${h.notlar ? `<p>${h.notlar}</p>` : ''}

<h2>2. Parsel Bilgileri</h2>
<table><thead><tr><th>İl</th><th>İlçe</th><th>Mahalle</th><th>Ada</th><th>Parsel</th><th style="text-align:right">Alan</th></tr></thead>
<tbody>${parselSatir}</tbody></table>

<h2>3. İmar Durumu</h2>
<table><tbody>
<tr><th>Emsal</th><td>${h.imar?.emsal ?? '—'}</td><th>TAKS</th><td>${h.imar?.taks ?? '—'}</td></tr>
<tr><th>Maks Kat</th><td>${h.imar?.maksKatSayisi ?? '—'}</td><th>Yapı Nizamı</th><td>${h.imar?.yapiNizami ?? '—'}</td></tr>
<tr><th>Cephe Çekme</th><td>${h.imar?.cepheCekme ?? '—'} m</td><th>Yan/Arka</th><td>${h.imar?.yanCekme ?? '—'} / ${h.imar?.arkaCekme ?? '—'} m</td></tr>
</tbody></table>

<h2>4. Maliyet Kalemleri</h2>
<table><thead><tr><th>Kalem</th><th style="text-align:right">Tutar</th></tr></thead>
<tbody>${maliyetSatir}
<tr style="font-weight:700;background:#f5f5f5"><td>TOPLAM MALİYET</td><td style="text-align:right">${formatKisa(s.toplamMaliyetKurus || 0)}</td></tr>
</tbody></table>

<h2>5. Vergi & Harç</h2>
<table><tbody>
<tr><td>KDV</td><td style="text-align:right">${formatKisa(h.vergi?.kdvKurus || 0)}</td></tr>
<tr><td>Tapu Harcı</td><td style="text-align:right">${formatKisa(h.vergi?.tapuHarciKurus || 0)}</td></tr>
<tr><td>Damga Vergisi</td><td style="text-align:right">${formatKisa(h.vergi?.damgaKurus || 0)}</td></tr>
<tr><td>Kat İrtifakı</td><td style="text-align:right">${formatKisa(h.vergi?.katIrtifakiKurus || 0)}</td></tr>
<tr><td>Kurumlar Vergisi</td><td style="text-align:right">${formatKisa(h.vergi?.kurumlarKurus || 0)}</td></tr>
<tr style="font-weight:700"><td>TOPLAM</td><td style="text-align:right">${formatKisa(h.vergi?.toplamKurus || 0)}</td></tr>
</tbody></table>

<h2>6. Finansal Analiz</h2>
<table><tbody>
<tr><th>NPV</th><td>${formatKisa(s.npvKurus || 0)}</td><th>IRR (Yıllık)</th><td>${s.irrYillik != null ? '%' + s.irrYillik.toFixed(1) : '—'}</td></tr>
<tr><th>ROI</th><td>${s.roi != null ? '%' + s.roi.toFixed(1) : '—'}</td><th>Payback</th><td>${s.payback != null ? s.payback + ' ay' : '—'}</td></tr>
<tr><th>DSCR</th><td>${s.dscr != null ? s.dscr.toFixed(2) : '—'}</td><th>Kâr Marjı</th><td>${s.karMarji != null ? '%' + s.karMarji.toFixed(1) : '—'}</td></tr>
</tbody></table>

<h2>7. Monte Carlo Sonuçları</h2>
${h.monteCarlo ? `
<div class="kpi-row">
  <div class="kpi"><div class="kpi-lbl">P10</div><div class="kpi-val">${formatKisa(h.monteCarlo.p10)}</div></div>
  <div class="kpi"><div class="kpi-lbl">P50</div><div class="kpi-val">${formatKisa(h.monteCarlo.p50)}</div></div>
  <div class="kpi"><div class="kpi-lbl">P90</div><div class="kpi-val">${formatKisa(h.monteCarlo.p90)}</div></div>
  <div class="kpi"><div class="kpi-lbl">Zarar Olasılığı</div><div class="kpi-val">%${(h.monteCarlo.zararOlasi || 0).toFixed(1)}</div></div>
</div>` : '<p style="color:#999">Monte Carlo henüz çalıştırılmadı.</p>'}

<h2>8. Risk Skoru</h2>
<p>Ağırlıklı risk skoru: <b style="color:${(h.risk?.skor || 0) < 30 ? 'green' : (h.risk?.skor || 0) < 60 ? 'orange' : 'red'}">${h.risk?.skor ?? '—'}/100</b></p>

<h2>9. Sonuç ve Tavsiye</h2>
<p>${(s.netKarKurus || 0) > 0
  ? 'Proje pozitif kârlılık göstermekte olup, risk skoru ve nakit akışı analizine göre yatırım yapılabilir niteliktedir.'
  : 'Proje mevcut varsayımlarla negatif kârlılık göstermektedir. Maliyet optimizasyonu veya fiyat revizyonu gereklidir.'}</p>

<div class="footer">
  Duay Global Trade — Kat Karşılığı Fizibilite Motoru · ${tarih}
</div>

</body></html>
  `);
  w.document.close();
}

export default function PdfRapor({ hesap }) {
  return (
    <button className="btn btn-gold btn-sm" onClick={() => pdfYazdir(hesap)}>
      📄 PDF Rapor
    </button>
  );
}
