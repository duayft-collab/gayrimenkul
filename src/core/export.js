/**
 * @file core/export.js
 * @description Portföy export — PDF (window.print HTML) + Excel CSV + JSON yedek
 * @anayasa K10 kuruş integer · K14 PII dışa aktarım sadece admin
 */

const fmtTL = (v) => v == null ? '—' : '₺' + new Intl.NumberFormat('tr-TR').format(Math.round(v));

export function mulklerCsvExport(mulkler) {
  const basliklar = [
    'ID', 'Ad', 'Tür', 'Durum', 'İl', 'İlçe', 'Mahalle', 'Adres',
    'Alan (m²)', 'Fiyat (TL)', 'm² Fiyat', 'Kira (TL)', 'Kap Rate (%)',
    'Eklenme'
  ];
  const satirlar = mulkler.map(m => [
    m.id || '',
    (m.ad || '').replace(/;/g, ','),
    m.tur || '',
    m.durum || '',
    m.il || '',
    m.ilce || '',
    m.mahalle || '',
    (m.fullAdres || m.adres || '').replace(/;/g, ','),
    m.alan || 0,
    m.fiyat || 0,
    m.alan > 0 ? Math.round((m.fiyat || 0) / m.alan) : 0,
    m.aylikKira || 0,
    m.fiyat > 0 ? (((m.aylikKira || 0) * 12 / m.fiyat) * 100).toFixed(2) : '',
    m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString('tr-TR') : '',
  ]);

  const csv = [basliklar, ...satirlar]
    .map(r => r.map(c => {
      const s = String(c);
      return s.includes(';') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(';'))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portfoy_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function mulklerJsonExport(mulkler) {
  const blob = new Blob([JSON.stringify(mulkler, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portfoy_yedek_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function mulklerPdfExport(mulkler, ozet = {}) {
  const w = window.open('', '_blank', 'width=1000,height=1200');
  if (!w) {
    alert('Popup engelleyici PDF raporunu engelliyor.');
    return;
  }
  const tarih = new Date().toLocaleDateString('tr-TR');
  const toplamDeger = mulkler.reduce((a, m) => a + (m.fiyat || 0), 0);
  const toplamAlan = mulkler.reduce((a, m) => a + (m.alan || 0), 0);
  const toplamKira = mulkler.reduce((a, m) => a + ((m.aylikKira || 0) * 12), 0);
  const ortKapRate = toplamDeger > 0 ? (toplamKira / toplamDeger * 100).toFixed(2) : '—';

  const durumKirilim = mulkler.reduce((acc, m) => {
    const k = m.durum || 'bilinmiyor';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const satirlar = mulkler.map(m => `
    <tr>
      <td>${(m.ad || '—').replace(/</g, '&lt;')}</td>
      <td>${m.tur || '—'}</td>
      <td>${m.il || '—'} / ${m.ilce || '—'}</td>
      <td style="text-align:right">${(m.alan || 0).toLocaleString('tr-TR')} m²</td>
      <td style="text-align:right">${fmtTL(m.fiyat)}</td>
      <td style="text-align:right">${fmtTL(m.aylikKira)}</td>
      <td>${m.durum || '—'}</td>
    </tr>
  `).join('');

  w.document.write(`
<!doctype html><html><head><meta charset="utf-8"><title>Portföy Raporu</title>
<style>
  @page { size: A4 landscape; margin: 15mm; }
  body { font-family: Georgia, serif; color: #0B0B0F; font-size: 10pt; line-height: 1.4; }
  h1 { color: #C9A84C; border-bottom: 3px solid #C9A84C; padding-bottom: 8px; }
  h2 { color: #0B0B0F; border-bottom: 1px solid #C9A84C; padding-bottom: 3px; margin-top: 20px; font-size: 12pt; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 9pt; }
  th, td { padding: 5px 7px; border-bottom: 1px solid #ddd; text-align: left; }
  th { background: #0B0B0F; color: #C9A84C; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0; }
  .kpi { border: 1px solid #ddd; padding: 10px; border-radius: 4px; text-align: center; }
  .kpi-lbl { font-size: 8pt; color: #666; text-transform: uppercase; }
  .kpi-val { font-size: 14pt; color: #C9A84C; font-weight: 700; margin-top: 3px; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 8pt; color: #666; text-align: center; }
  @media print { button { display: none; } }
</style></head><body>
<button onclick="window.print()" style="position:fixed;top:10px;right:10px;padding:10px 20px;background:#C9A84C;border:0;border-radius:6px;font-weight:700;cursor:pointer">Yazdır / PDF Kaydet</button>
<h1>📋 Portföy Raporu</h1>
<div style="color:#666;font-size:9pt">${tarih} · Duay Global Trade · ${ozet.workspace || ''}</div>
<div class="kpis">
  <div class="kpi"><div class="kpi-lbl">Toplam Mülk</div><div class="kpi-val">${mulkler.length}</div></div>
  <div class="kpi"><div class="kpi-lbl">Toplam Değer</div><div class="kpi-val">${fmtTL(toplamDeger)}</div></div>
  <div class="kpi"><div class="kpi-lbl">Toplam Alan</div><div class="kpi-val">${toplamAlan.toLocaleString('tr-TR')} m²</div></div>
  <div class="kpi"><div class="kpi-lbl">Ort. Kap Rate</div><div class="kpi-val">%${ortKapRate}</div></div>
</div>
<h2>Durum Kırılımı</h2>
<div style="display:flex;gap:20px;margin:8px 0;font-size:10pt">
  ${Object.entries(durumKirilim).map(([k, v]) => `<span><b>${k}:</b> ${v}</span>`).join('')}
</div>
<h2>Mülk Detayları (${mulkler.length})</h2>
<table><thead><tr>
  <th>Ad</th><th>Tür</th><th>Konum</th><th>Alan</th><th>Fiyat</th><th>Aylık Kira</th><th>Durum</th>
</tr></thead><tbody>${satirlar}</tbody></table>
<div class="footer">Duay Global Trade — AI Property OS · ${tarih} · Bu rapor gizlidir, yetkisiz paylaşım yasaktır.</div>
</body></html>`);
  w.document.close();
}
