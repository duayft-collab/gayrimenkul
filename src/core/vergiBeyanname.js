/**
 * @file core/vergiBeyanname.js
 * @description GMSİ Beyanname pre-fill — PDF (window.print) + CSV + XML
 * @anayasa K10 kuruş integer, K14 audit
 */
import { portfoyVergiOzeti, ISTISNA_YIL } from './vergiHesap';
import { gmsiVergisi } from './hesaplamalar';
import { logKaydet } from './auditLog';

const fmtTL = (kurus) => '₺' + new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  .format((kurus || 0) / 100);

/**
 * Beyanname taslak objesi — GİB formatına yakın
 */
export async function beyannameTaslakOlustur({ workspaceId, user, yil, mod = 'goturu' }) {
  const ozet = await portfoyVergiOzeti(workspaceId, yil, mod);
  if (!ozet) throw new Error('Vergi özeti hesaplanamadı');

  const istisna = ISTISNA_YIL[yil] || 47_000_00;

  return {
    mukellefBilgileri: {
      ad: user?.name || 'BELİRTİLMEDİ',
      tc: user?.tc || '00000000000',
      adres: user?.adres || '',
      email: user?.email || '',
    },
    yil,
    gelirTuru: 'GMSİ — Gayrimenkul Sermaye İradı',
    mulkler: ozet.mulkBazli.map(m => ({
      ad: m.ad,
      brutKiraKurus: m.brutKurus,
      giderKurus: m.giderKurus,
      matrahKurus: m.matrahKurus,
    })),
    toplamBrutKiraKurus: ozet.yillikBrutKiraKurus,
    toplamGiderKurus: ozet.toplamGiderKurus,
    giderModu: mod,
    istisnaKurus: istisna,
    matrahHamKurus: ozet.matrahKurus,
    istisnaDusuluKurus: ozet.istisnaDusuluKurus,
    kademeliVergi: gmsiVergisi(ozet.istisnaDusuluKurus, 0),
    odenecekVergiKurus: ozet.gmsiVergiKurus,
    olusturulma: new Date().toISOString(),
  };
}

/**
 * PDF üret — window.print, kurumsal stil
 */
export function beyannamePdfUret(taslak, user) {
  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) { alert('Popup engelleyici PDF\'i engelliyor.'); return; }

  const mulkSatir = taslak.mulkler.map((m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${m.ad}</td>
      <td style="text-align:right">${fmtTL(m.brutKiraKurus)}</td>
      <td style="text-align:right">${fmtTL(m.giderKurus)}</td>
      <td style="text-align:right;font-weight:700">${fmtTL(m.matrahKurus)}</td>
    </tr>
  `).join('');

  w.document.write(`
<!doctype html><html><head><meta charset="utf-8"><title>GMSİ Beyanname ${taslak.yil}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: Georgia, serif; color: #0B0B0F; font-size: 11pt; line-height: 1.5; }
  h1 { color: #C9A84C; border-bottom: 3px solid #C9A84C; padding-bottom: 8px; font-size: 22pt; }
  h2 { color: #0B0B0F; border-bottom: 1px solid #C9A84C; padding-bottom: 3px; margin-top: 22px; font-size: 13pt; }
  .info { background: #f5f5f5; padding: 14px; border-radius: 6px; margin: 10px 0; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
  th, td { padding: 7px 10px; border-bottom: 1px solid #ddd; text-align: left; }
  th { background: #0B0B0F; color: #C9A84C; }
  .ozet { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 14px 0; }
  .ozet-card { border: 1px solid #ddd; padding: 10px 14px; border-radius: 4px; }
  .ozet-card b { color: #C9A84C; font-size: 13pt; display: block; margin-top: 3px; }
  .imza { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .imza-box { border-top: 1px solid #999; padding-top: 8px; text-align: center; font-size: 9pt; }
  @media print { button { display: none; } }
</style></head><body>
<button onclick="window.print()" style="position:fixed;top:10px;right:10px;padding:10px 20px;background:#C9A84C;color:#0B0B0F;border:0;border-radius:6px;font-weight:700;cursor:pointer">Yazdır / PDF Kaydet</button>

<h1>📋 GMSİ BEYANNAME ${taslak.yil}</h1>
<div style="color:#666;font-size:9pt">Gayrimenkul Sermaye İradı · Duay Global Trade · ${new Date().toLocaleDateString('tr-TR')}</div>

<h2>Mükellef Bilgileri</h2>
<div class="info">
  <div><b>Ad Soyad:</b> ${taslak.mukellefBilgileri.ad}</div>
  <div><b>TC Kimlik No:</b> ${taslak.mukellefBilgileri.tc}</div>
  <div><b>E-posta:</b> ${taslak.mukellefBilgileri.email}</div>
  <div><b>Vergi Yılı:</b> ${taslak.yil}</div>
  <div><b>Gelir Türü:</b> ${taslak.gelirTuru}</div>
  <div><b>Gider Yöntemi:</b> ${taslak.giderModu === 'goturu' ? 'Götürü Gider (%15)' : 'Gerçek Gider'}</div>
</div>

<h2>Mülk Bazlı Gelir Detayı</h2>
<table>
  <thead><tr><th>#</th><th>Mülk</th><th style="text-align:right">Brüt Kira</th><th style="text-align:right">Gider</th><th style="text-align:right">Matrah</th></tr></thead>
  <tbody>${mulkSatir}</tbody>
  <tfoot>
    <tr style="background:#f5f5f5;font-weight:700">
      <td colspan="2">TOPLAM</td>
      <td style="text-align:right">${fmtTL(taslak.toplamBrutKiraKurus)}</td>
      <td style="text-align:right">${fmtTL(taslak.toplamGiderKurus)}</td>
      <td style="text-align:right;color:#C9A84C">${fmtTL(taslak.matrahHamKurus)}</td>
    </tr>
  </tfoot>
</table>

<h2>Vergi Hesabı</h2>
<div class="ozet">
  <div class="ozet-card"><div>Toplam Brüt Kira</div><b>${fmtTL(taslak.toplamBrutKiraKurus)}</b></div>
  <div class="ozet-card"><div>Toplam Gider</div><b>${fmtTL(taslak.toplamGiderKurus)}</b></div>
  <div class="ozet-card"><div>Matrah</div><b>${fmtTL(taslak.matrahHamKurus)}</b></div>
  <div class="ozet-card"><div>İstisna (${taslak.yil})</div><b>${fmtTL(taslak.istisnaKurus)}</b></div>
  <div class="ozet-card"><div>İstisna Sonrası Matrah</div><b>${fmtTL(taslak.istisnaDusuluKurus)}</b></div>
  <div class="ozet-card" style="border:2px solid #C9A84C;background:#fff8e7"><div><b style="color:#C9A84C">ÖDENECEK VERGİ</b></div><b style="font-size:18pt">${fmtTL(taslak.odenecekVergiKurus)}</b></div>
</div>

<h2>Yasal Uyarı</h2>
<p style="font-size:9pt;color:#666">Bu belge ön taslak niteliğindedir. Resmi GMSİ beyannamesi GİB e-Beyanname sistemi üzerinden lisanslı mali müşavir denetiminde verilmelidir. Hesaplamalarda 1319 sayılı Emlak Vergisi Kanunu, GVK ${taslak.yil} kademeli dilimleri ve mevcut istisna tutarları kullanılmıştır.</p>

<div class="imza">
  <div class="imza-box">Mükellef İmzası</div>
  <div class="imza-box">Mali Müşavir Onayı</div>
</div>

<div style="margin-top:30px;text-align:center;font-size:8pt;color:#666">
  Duay Global Trade · AI Property OS · ${new Date().toLocaleString('tr-TR')}
</div>
</body></html>
  `);
  w.document.close();

  if (user?.workspaceId) {
    logKaydet({
      workspaceId: user.workspaceId, user,
      tip: 'export', entityTip: 'beyanname',
      entityAd: `GMSİ ${taslak.yil} PDF`,
    });
  }
}

/**
 * CSV (Excel uyumlu)
 */
export function beyannameCsvUret(taslak) {
  const rows = [
    ['Tip', 'Değer'],
    ['Mükellef', taslak.mukellefBilgileri.ad],
    ['TC', taslak.mukellefBilgileri.tc],
    ['Yıl', taslak.yil],
    ['Gider Modu', taslak.giderModu],
    [],
    ['#', 'Mülk', 'Brüt Kira', 'Gider', 'Matrah'],
    ...taslak.mulkler.map((m, i) => [
      i + 1, m.ad,
      (m.brutKiraKurus / 100).toFixed(2),
      (m.giderKurus / 100).toFixed(2),
      (m.matrahKurus / 100).toFixed(2),
    ]),
    [],
    ['Toplam Brüt', '', (taslak.toplamBrutKiraKurus / 100).toFixed(2)],
    ['Toplam Gider', '', (taslak.toplamGiderKurus / 100).toFixed(2)],
    ['Matrah', '', (taslak.matrahHamKurus / 100).toFixed(2)],
    ['İstisna', '', (taslak.istisnaKurus / 100).toFixed(2)],
    ['Ödenecek Vergi', '', (taslak.odenecekVergiKurus / 100).toFixed(2)],
  ];
  const csv = rows.map(r => r.map(c => {
    const s = String(c ?? '');
    return s.includes(';') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(';')).join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gmsi_beyanname_${taslak.yil}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Basit XML (muhasebe yazılımı uyumu için)
 */
export function beyannameXmlUret(taslak) {
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const mulkXml = taslak.mulkler.map(m => `
    <Mulk>
      <Ad>${esc(m.ad)}</Ad>
      <BrutKiraKurus>${m.brutKiraKurus}</BrutKiraKurus>
      <GiderKurus>${m.giderKurus}</GiderKurus>
      <MatrahKurus>${m.matrahKurus}</MatrahKurus>
    </Mulk>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<GMSIBeyanname>
  <Yil>${taslak.yil}</Yil>
  <Mukellef>
    <Ad>${esc(taslak.mukellefBilgileri.ad)}</Ad>
    <TC>${esc(taslak.mukellefBilgileri.tc)}</TC>
    <Email>${esc(taslak.mukellefBilgileri.email)}</Email>
  </Mukellef>
  <GiderModu>${taslak.giderModu}</GiderModu>
  <Mulkler>${mulkXml}
  </Mulkler>
  <Toplamlar>
    <BrutKira>${taslak.toplamBrutKiraKurus}</BrutKira>
    <Gider>${taslak.toplamGiderKurus}</Gider>
    <MatrahHam>${taslak.matrahHamKurus}</MatrahHam>
    <Istisna>${taslak.istisnaKurus}</Istisna>
    <IstisnaSonrasi>${taslak.istisnaDusuluKurus}</IstisnaSonrasi>
    <OdenecekVergi>${taslak.odenecekVergiKurus}</OdenecekVergi>
  </Toplamlar>
  <Olusturulma>${taslak.olusturulma}</Olusturulma>
</GMSIBeyanname>`;

  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gmsi_beyanname_${taslak.yil}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}
