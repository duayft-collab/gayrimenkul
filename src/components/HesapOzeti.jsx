/**
 * @file components/HesapOzeti.jsx
 * @description Kiracı hesap özeti — borç/alacak/bakiye + PDF/CSV/paylaşım
 */
import { useMemo, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';
import { odemeTlKurus, kiraciBakiyeHesapla } from '../core/odemelerDb';
import { paylasimLinkOlustur, paylasimLinkUrl } from '../core/paylasim';

const fmtTL = (kurus) => '₺' + new Intl.NumberFormat('tr-TR').format(Math.round((kurus || 0) / 100));

export default function HesapOzeti({ kiraci, onClose }) {
  const { user } = useAuthStore();
  const { odemeler, toast, mulkler } = useStore();
  const [bas, setBas] = useState('');
  const [bit, setBit] = useState('');
  const ws = user?.workspaceId || 'ws_001';

  const kiraciOdemeler = useMemo(() =>
    (odemeler || []).filter(o => o.kiraciId === kiraci.id && !o.isDeleted),
  [odemeler, kiraci.id]);

  const donem = useMemo(() => {
    return kiraciOdemeler.filter(o => {
      const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : (o.vadeTarihi ? new Date(o.vadeTarihi) : null);
      if (!v) return true;
      if (bas && v < new Date(bas)) return false;
      if (bit && v > new Date(bit + 'T23:59:59')) return false;
      return true;
    }).sort((a, b) => {
      const va = a.vadeTarihi?.toDate ? a.vadeTarihi.toDate() : new Date(a.vadeTarihi || 0);
      const vb = b.vadeTarihi?.toDate ? b.vadeTarihi.toDate() : new Date(b.vadeTarihi || 0);
      return va - vb;
    });
  }, [kiraciOdemeler, bas, bit]);

  const bakiye = kiraciBakiyeHesapla(donem);

  // Tablo: tarih | açıklama | borç | alacak | kümülatif bakiye
  let kumBakiye = 0;
  const satirlar = donem.map(o => {
    const tl = odemeTlKurus(o);
    const borc = o.durum === 'bekliyor' || o.durum === 'gecikmis' ? tl : 0;
    const alacak = o.durum === 'odendi' ? tl : 0;
    kumBakiye += borc - alacak;
    const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi || 0);
    const mulk = (mulkler || []).find(m => m.id === o.mulkId);
    return {
      tarih: isNaN(v.getTime()) ? '—' : v.toLocaleDateString('tr-TR'),
      aciklama: `${o.tip}${o.aciklama ? ' — ' + o.aciklama : ''}${mulk ? ' · ' + mulk.ad : ''}`,
      borcKurus: borc,
      alacakKurus: alacak,
      bakiyeKurus: kumBakiye,
      durum: o.durum,
    };
  });

  const pdfYazdir = () => {
    const w = window.open('', '_blank', 'width=900,height=1200');
    if (!w) { toast('error', 'Popup engellenmiş'); return; }
    const satirlarHtml = satirlar.map(s => `
      <tr>
        <td>${s.tarih}</td>
        <td>${s.aciklama}</td>
        <td style="text-align:right;color:#EF4444">${s.borcKurus ? fmtTL(s.borcKurus) : '—'}</td>
        <td style="text-align:right;color:#22C55E">${s.alacakKurus ? fmtTL(s.alacakKurus) : '—'}</td>
        <td style="text-align:right;font-weight:700">${fmtTL(s.bakiyeKurus)}</td>
      </tr>
    `).join('');
    w.document.write(`
      <!doctype html><html><head><meta charset="utf-8"><title>Hesap Özeti</title>
      <style>
        @page { size: A4; margin: 18mm; }
        body { font-family: Georgia, serif; color: #0B0B0F; font-size: 11pt; }
        h1 { color: #C9A84C; border-bottom: 3px solid #C9A84C; padding-bottom: 8px; }
        .info { background: #f5f5f5; padding: 12px; border-radius: 6px; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }
        th, td { padding: 6px 10px; border-bottom: 1px solid #ddd; text-align: left; }
        th { background: #0B0B0F; color: #C9A84C; }
        .ozet { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 14px 0; }
        .ozet div { border: 1px solid #ddd; padding: 10px; border-radius: 4px; text-align: center; }
        .ozet b { color: #C9A84C; font-size: 14pt; display: block; margin-top: 3px; }
        @media print { button { display: none; } }
      </style></head><body>
      <button onclick="window.print()" style="position:fixed;top:10px;right:10px;padding:8px 16px;background:#C9A84C;border:0;border-radius:6px;font-weight:700;cursor:pointer">Yazdır</button>
      <h1>📑 Hesap Özeti</h1>
      <div class="info">
        <div><b>Kiracı:</b> ${kiraci.adSoyad || '—'}</div>
        ${kiraci.telefon ? `<div><b>Telefon:</b> ${kiraci.telefon}</div>` : ''}
        ${kiraci.email ? `<div><b>E-posta:</b> ${kiraci.email}</div>` : ''}
        <div><b>Dönem:</b> ${bas || 'Başlangıç'} — ${bit || 'Bugün'}</div>
        <div><b>Tarih:</b> ${new Date().toLocaleDateString('tr-TR')}</div>
      </div>
      <div class="ozet">
        <div><div>Toplam Alacak</div><b>${fmtTL(bakiye.toplamOdenenKurus)}</b></div>
        <div><div>Bekleyen Borç</div><b>${fmtTL(bakiye.toplamBeklenenKurus)}</b></div>
        <div><div>Gecikmiş</div><b style="color:#EF4444">${fmtTL(bakiye.gecikmisKurus)}</b></div>
      </div>
      <table><thead><tr>
        <th>Tarih</th><th>Açıklama</th><th style="text-align:right">Borç</th><th style="text-align:right">Alacak</th><th style="text-align:right">Bakiye</th>
      </tr></thead><tbody>${satirlarHtml}</tbody></table>
      <div style="margin-top:30px;text-align:center;font-size:8pt;color:#666">Duay Global Trade — AI Property OS</div>
      </body></html>
    `);
    w.document.close();
  };

  const csvIndir = () => {
    const rows = [
      ['Tarih', 'Açıklama', 'Borç', 'Alacak', 'Bakiye'],
      ...satirlar.map(s => [s.tarih, s.aciklama, s.borcKurus / 100, s.alacakKurus / 100, s.bakiyeKurus / 100]),
    ];
    const csv = rows.map(r => r.map(c => String(c).includes(';') ? `"${c}"` : c).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `hesap_ozeti_${kiraci.adSoyad || 'kiraci'}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const linkPaylas = async () => {
    try {
      // Paylaşım için kiracıya özel link — mulk üzerinden değil, bakiye view-only
      const { token } = await paylasimLinkOlustur({
        workspaceId: ws,
        mulkId: `kiraci_${kiraci.id}`, // Özel id — public route handle eder
        yetki: 'view',
        sureGun: 30,
        olusturan: user?.name,
      });
      const url = paylasimLinkUrl(token);
      await navigator.clipboard.writeText(url);
      toast('success', 'Hesap özeti linki kopyalandı (30 gün)');
    } catch (e) {
      toast('error', e.message);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 800, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-head">
          <div className="modal-title">📑 Hesap Özeti — {kiraci.adSoyad}</div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="g3" style={{ marginBottom: 14 }}>
            <div className="kpi" style={{ '--kc': 'var(--green)' }}>
              <div className="kpi-lbl">Toplam Alacak (Tahsil)</div>
              <div className="kpi-val" style={{ color: 'var(--green)', fontSize: '1.1rem' }}>{fmtTL(bakiye.toplamOdenenKurus)}</div>
            </div>
            <div className="kpi" style={{ '--kc': 'var(--amber)' }}>
              <div className="kpi-lbl">Bekleyen Borç</div>
              <div className="kpi-val" style={{ color: 'var(--amber)', fontSize: '1.1rem' }}>{fmtTL(bakiye.toplamBeklenenKurus)}</div>
            </div>
            <div className="kpi" style={{ '--kc': 'var(--red)' }}>
              <div className="kpi-lbl">Gecikmiş</div>
              <div className="kpi-val" style={{ color: 'var(--red)', fontSize: '1.1rem' }}>{fmtTL(bakiye.gecikmisKurus)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'end', marginBottom: 12 }}>
            <div className="fgroup" style={{ marginBottom: 0 }}>
              <label className="flbl">Başlangıç</label>
              <input type="date" className="input" value={bas} onChange={e => setBas(e.target.value)} />
            </div>
            <div className="fgroup" style={{ marginBottom: 0 }}>
              <label className="flbl">Bitiş</label>
              <input type="date" className="input" value={bit} onChange={e => setBit(e.target.value)} />
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setBas(''); setBit(''); }}>Temizle</button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button className="btn btn-sm btn-gold" onClick={pdfYazdir}>📄 PDF</button>
              <button className="btn btn-sm btn-ghost" onClick={csvIndir}>📊 CSV</button>
              <button className="btn btn-sm btn-ghost" onClick={linkPaylas}>🔗 Paylaş</button>
            </div>
          </div>

          <table style={{ width: '100%', fontSize: '.78rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: 8 }}>Tarih</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Açıklama</th>
                <th style={{ textAlign: 'right', padding: 8 }}>Borç</th>
                <th style={{ textAlign: 'right', padding: 8 }}>Alacak</th>
                <th style={{ textAlign: 'right', padding: 8 }}>Bakiye</th>
              </tr>
            </thead>
            <tbody>
              {satirlar.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Kayıt yok</td></tr>
              ) : satirlar.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                  <td style={{ padding: 8 }}>{s.tarih}</td>
                  <td style={{ padding: 8 }}>{s.aciklama}</td>
                  <td style={{ padding: 8, textAlign: 'right', color: 'var(--red)' }}>{s.borcKurus ? fmtTL(s.borcKurus) : '—'}</td>
                  <td style={{ padding: 8, textAlign: 'right', color: 'var(--green)' }}>{s.alacakKurus ? fmtTL(s.alacakKurus) : '—'}</td>
                  <td style={{ padding: 8, textAlign: 'right', fontWeight: 700 }}>{fmtTL(s.bakiyeKurus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
