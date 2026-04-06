/**
 * @file pages/Raporlar.jsx
 * @description Kâr/Zarar + vergi + mülk performans + yıl sonu raporu
 */
import { useMemo, useState } from 'react';
import { useStore } from '../store/app';
import { useAuthStore } from '../store/auth';
import { Topbar } from '../components/Layout';
import {
  hesaplaNetKar, hesaplaStopaj, hesaplaBeyan, mulkBazliKarZarar, aylikTrend
} from '../core/karZarar';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const fmtTL = (kurus) => '₺' + new Intl.NumberFormat('tr-TR').format(Math.round((kurus || 0) / 100));

function donemAraligi(tip) {
  const bugun = new Date();
  if (tip === 'buAy') {
    return { bas: new Date(bugun.getFullYear(), bugun.getMonth(), 1), bit: new Date(bugun.getFullYear(), bugun.getMonth() + 1, 0, 23, 59, 59) };
  }
  if (tip === 'buCeyrek') {
    const c = Math.floor(bugun.getMonth() / 3);
    return { bas: new Date(bugun.getFullYear(), c * 3, 1), bit: new Date(bugun.getFullYear(), (c + 1) * 3, 0, 23, 59, 59) };
  }
  if (tip === 'buYil') {
    return { bas: new Date(bugun.getFullYear(), 0, 1), bit: new Date(bugun.getFullYear(), 11, 31, 23, 59, 59) };
  }
  return { bas: null, bit: null };
}

export default function Raporlar() {
  const { user } = useAuthStore();
  const { odemeler, mulkler } = useStore();
  const [tab, setTab] = useState('kar');
  const [donem, setDonem] = useState('buYil');
  const [ozelBas, setOzelBas] = useState('');
  const [ozelBit, setOzelBit] = useState('');
  const [vergiNotu, setVergiNotu] = useState('');

  const { bas, bit } = useMemo(() => {
    if (donem === 'ozel') {
      return {
        bas: ozelBas ? new Date(ozelBas) : null,
        bit: ozelBit ? new Date(ozelBit + 'T23:59:59') : null,
      };
    }
    return donemAraligi(donem);
  }, [donem, ozelBas, ozelBit]);

  const karSonuc = useMemo(() => hesaplaNetKar({ odemeler, mulkler, bas, bit }), [odemeler, mulkler, bas, bit]);
  const mulkPerformans = useMemo(() => mulkBazliKarZarar({ mulkler, odemeler, bas, bit }), [mulkler, odemeler, bas, bit]);
  const trend = useMemo(() => aylikTrend({ odemeler, ayAdet: 12 }), [odemeler]);

  const stopaj = hesaplaStopaj(karSonuc.gelir.kiraKurus);
  const beyan = hesaplaBeyan(karSonuc.gelir.kiraKurus);

  const yilSonuPdf = () => {
    const w = window.open('', '_blank', 'width=900,height=1200');
    if (!w) return;
    const tarih = new Date().toLocaleDateString('tr-TR');
    const mulkSatir = mulkPerformans.map(m => `
      <tr>
        <td>${m.ad}</td>
        <td style="text-align:right">${fmtTL(m.gelirKurus)}</td>
        <td style="text-align:right">${fmtTL(m.giderKurus)}</td>
        <td style="text-align:right;font-weight:700">${fmtTL(m.netKarKurus)}</td>
        <td style="text-align:right">%${m.roi.toFixed(1)}</td>
      </tr>
    `).join('');
    w.document.write(`
<!doctype html><html><head><meta charset="utf-8"><title>Yıl Sonu Raporu</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: Georgia, serif; color: #0B0B0F; font-size: 11pt; }
  h1 { color: #C9A84C; border-bottom: 3px solid #C9A84C; padding-bottom: 8px; }
  h2 { color: #0B0B0F; border-bottom: 1px solid #C9A84C; padding-bottom: 3px; margin-top: 20px; font-size: 13pt; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10pt; }
  th, td { padding: 6px 10px; border-bottom: 1px solid #ddd; text-align: left; }
  th { background: #0B0B0F; color: #C9A84C; }
  .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 12px 0; }
  .kpi { border: 1px solid #ddd; padding: 10px; border-radius: 4px; text-align: center; }
  .kpi b { color: #C9A84C; font-size: 14pt; display: block; margin-top: 3px; }
  @media print { button { display: none; } }
</style></head><body>
<button onclick="window.print()" style="position:fixed;top:10px;right:10px;padding:10px 20px;background:#C9A84C;border:0;border-radius:6px;font-weight:700;cursor:pointer">Yazdır</button>
<h1>📊 Yıl Sonu Finansal Raporu</h1>
<div style="color:#666;font-size:9pt">${tarih} · Duay Global Trade · ${user?.workspaceId || ''} · Dönem: ${bas?.toLocaleDateString('tr-TR') || '—'} – ${bit?.toLocaleDateString('tr-TR') || '—'}</div>
<h2>Finansal Özet</h2>
<div class="grid4">
  <div class="kpi"><div>Toplam Gelir</div><b>${fmtTL(karSonuc.gelir.toplamKurus)}</b></div>
  <div class="kpi"><div>Toplam Gider</div><b>${fmtTL(karSonuc.gider.toplamKurus)}</b></div>
  <div class="kpi"><div>Net Kâr</div><b style="color:${karSonuc.netKarKurus >= 0 ? 'green' : 'red'}">${fmtTL(karSonuc.netKarKurus)}</b></div>
  <div class="kpi"><div>Stopaj (%20)</div><b>${fmtTL(stopaj)}</b></div>
</div>
<h2>Gelir Kırılımı</h2>
<table><tbody>
<tr><td>Kira Geliri</td><td style="text-align:right">${fmtTL(karSonuc.gelir.kiraKurus)}</td></tr>
<tr><td>Depozito</td><td style="text-align:right">${fmtTL(karSonuc.gelir.depozitoKurus)}</td></tr>
<tr><td>Aidat/Diğer</td><td style="text-align:right">${fmtTL(karSonuc.gelir.aidatKurus)}</td></tr>
<tr><td>Satış Geliri</td><td style="text-align:right">${fmtTL(karSonuc.gelir.satisKurus)}</td></tr>
</tbody></table>
<h2>Gider Kırılımı</h2>
<table><tbody>
<tr><td>İşletme Giderleri</td><td style="text-align:right">${fmtTL(karSonuc.gider.giderOdemeKurus)}</td></tr>
<tr><td>Amortisman (%2 yıllık)</td><td style="text-align:right">${fmtTL(karSonuc.gider.amortismanKurus)}</td></tr>
</tbody></table>
<h2>Vergi Yükümlülükleri</h2>
<table><tbody>
<tr><td>GMSİ Beyan Limiti (2026)</td><td style="text-align:right">${fmtTL(beyan.beyanLimitKurus)}</td></tr>
<tr><td>Beyan Gerekli Mi?</td><td style="text-align:right">${beyan.beyanGerekli ? 'EVET' : 'Hayır'}</td></tr>
<tr><td>Vergi Limiti Aşıldı Mı?</td><td style="text-align:right">${beyan.vergiGerekli ? 'EVET' : 'Hayır'}</td></tr>
<tr><td>Tahmini Vergi (%15)</td><td style="text-align:right"><b>${fmtTL(beyan.tahminVergiKurus)}</b></td></tr>
</tbody></table>
<h2>Mülk Bazlı Performans</h2>
<table><thead><tr><th>Mülk</th><th style="text-align:right">Gelir</th><th style="text-align:right">Gider</th><th style="text-align:right">Net Kâr</th><th style="text-align:right">ROI</th></tr></thead>
<tbody>${mulkSatir}</tbody></table>
${vergiNotu ? `<h2>Vergi Danışmanı Notu</h2><p>${vergiNotu}</p>` : ''}
<div style="margin-top:30px;text-align:center;font-size:8pt;color:#666">Duay Global Trade — AI Property OS · Bu rapor muhasebe beyanı için kullanılabilir. Nihai vergi hesabı için lisanslı muhasebeci onayı önerilir.</div>
</body></html>
    `);
    w.document.close();
  };

  return (
    <div>
      <Topbar title="📊 Raporlar" />
      <div className="page" style={{ paddingBottom: 90 }}>
        {/* Dönem seçici */}
        <div className="card" style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {[['buAy', 'Bu Ay'], ['buCeyrek', 'Bu Çeyrek'], ['buYil', 'Bu Yıl'], ['ozel', 'Özel']].map(([id, lbl]) => (
            <button key={id} className={`btn btn-sm ${donem === id ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setDonem(id)}>{lbl}</button>
          ))}
          {donem === 'ozel' && (
            <>
              <input type="date" className="input" style={{ width: 140 }} value={ozelBas} onChange={e => setOzelBas(e.target.value)} />
              <input type="date" className="input" style={{ width: 140 }} value={ozelBit} onChange={e => setOzelBit(e.target.value)} />
            </>
          )}
          <button className="btn btn-gold btn-sm" style={{ marginLeft: 'auto' }} onClick={yilSonuPdf}>📄 PDF Rapor</button>
        </div>

        {/* Tablar */}
        <div className="tabs">
          {[['kar', '💰 Kâr/Zarar'], ['vergi', '⚖️ Vergi'], ['mulk', '🏠 Mülk Performans'], ['trend', '📈 Trend']].map(([id, lbl]) => (
            <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{lbl}</button>
          ))}
        </div>

        {tab === 'kar' && (
          <>
            <div className="g4" style={{ marginBottom: 14 }}>
              <div className="kpi" style={{ '--kc': 'var(--green)' }}>
                <div className="kpi-lbl">Toplam Gelir</div>
                <div className="kpi-val" style={{ color: 'var(--green)' }}>{fmtTL(karSonuc.gelir.toplamKurus)}</div>
              </div>
              <div className="kpi" style={{ '--kc': 'var(--red)' }}>
                <div className="kpi-lbl">Toplam Gider</div>
                <div className="kpi-val" style={{ color: 'var(--red)' }}>{fmtTL(karSonuc.gider.toplamKurus)}</div>
              </div>
              <div className="kpi" style={{ '--kc': 'var(--gold)' }}>
                <div className="kpi-lbl">Net Kâr</div>
                <div className="kpi-val" style={{ color: karSonuc.netKarKurus >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {fmtTL(karSonuc.netKarKurus)}
                </div>
              </div>
              <div className="kpi" style={{ '--kc': 'var(--blue2)' }}>
                <div className="kpi-lbl">Kâr Marjı</div>
                <div className="kpi-val" style={{ color: 'var(--blue2)' }}>
                  %{karSonuc.gelir.toplamKurus > 0 ? (karSonuc.netKarKurus / karSonuc.gelir.toplamKurus * 100).toFixed(1) : 0}
                </div>
              </div>
            </div>

            <div className="g2">
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--green)' }}>Gelir Kırılımı</div>
                <table style={{ width: '100%', fontSize: '.82rem' }}>
                  <tbody>
                    <tr><td style={{ padding: 6 }}>Kira</td><td style={{ padding: 6, textAlign: 'right' }}>{fmtTL(karSonuc.gelir.kiraKurus)}</td></tr>
                    <tr><td style={{ padding: 6 }}>Depozito</td><td style={{ padding: 6, textAlign: 'right' }}>{fmtTL(karSonuc.gelir.depozitoKurus)}</td></tr>
                    <tr><td style={{ padding: 6 }}>Aidat</td><td style={{ padding: 6, textAlign: 'right' }}>{fmtTL(karSonuc.gelir.aidatKurus)}</td></tr>
                    <tr><td style={{ padding: 6 }}>Satış</td><td style={{ padding: 6, textAlign: 'right' }}>{fmtTL(karSonuc.gelir.satisKurus)}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--red)' }}>Gider Kırılımı</div>
                <table style={{ width: '100%', fontSize: '.82rem' }}>
                  <tbody>
                    <tr><td style={{ padding: 6 }}>İşletme Giderleri</td><td style={{ padding: 6, textAlign: 'right' }}>{fmtTL(karSonuc.gider.giderOdemeKurus)}</td></tr>
                    <tr><td style={{ padding: 6 }}>Amortisman (%2/yıl)</td><td style={{ padding: 6, textAlign: 'right' }}>{fmtTL(karSonuc.gider.amortismanKurus)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'vergi' && (
          <div className="card">
            <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 14 }}>⚖️ Vergi Özeti</div>
            <table style={{ width: '100%', fontSize: '.85rem' }}>
              <tbody>
                <tr><td style={{ padding: 10 }}>Stopaj (%20) — Kira</td><td style={{ padding: 10, textAlign: 'right', fontWeight: 700 }}>{fmtTL(stopaj)}</td></tr>
                <tr><td style={{ padding: 10 }}>GMSİ Beyan Limiti (2026)</td><td style={{ padding: 10, textAlign: 'right' }}>{fmtTL(beyan.beyanLimitKurus)}</td></tr>
                <tr><td style={{ padding: 10 }}>Beyan Zorunluluğu</td><td style={{ padding: 10, textAlign: 'right' }}>
                  <span className={`badge ${beyan.beyanGerekli ? 'b-red' : 'b-green'}`}>{beyan.beyanGerekli ? 'EVET' : 'Hayır'}</span>
                </td></tr>
                <tr><td style={{ padding: 10 }}>Vergi Limiti Aşıldı mı?</td><td style={{ padding: 10, textAlign: 'right' }}>
                  <span className={`badge ${beyan.vergiGerekli ? 'b-red' : 'b-green'}`}>{beyan.vergiGerekli ? 'EVET' : 'Hayır'}</span>
                </td></tr>
                <tr><td style={{ padding: 10 }}><b>Tahmini Vergi (%15)</b></td><td style={{ padding: 10, textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>{fmtTL(beyan.tahminVergiKurus)}</td></tr>
              </tbody>
            </table>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: '.82rem', fontWeight: 600, marginBottom: 6 }}>Vergi Danışmanı Notu</div>
              <textarea className="textarea" rows={4} value={vergiNotu} onChange={e => setVergiNotu(e.target.value)} placeholder="Muhasebecinize özel notlar..." />
            </div>
            <div style={{ marginTop: 10, padding: 10, background: 'rgba(245,158,11,.08)', borderLeft: '3px solid var(--amber)', borderRadius: 6, fontSize: '.72rem' }}>
              ⚠️ Bu hesaplamalar tahminidir. Nihai beyan ve ödeme için lisanslı muhasebeci/mali müşavir onayı gereklidir.
            </div>
          </div>
        )}

        {tab === 'mulk' && (
          <div className="card">
            <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 14 }}>🏠 Mülk Bazlı Performans (ROI Sıralı)</div>
            {mulkPerformans.length === 0 ? (
              <div className="empty"><div className="empty-ico">🏠</div><div className="empty-title">Veri yok</div></div>
            ) : (
              <table style={{ width: '100%', fontSize: '.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: 8, textAlign: 'left' }}>#</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Mülk</th>
                    <th style={{ padding: 8, textAlign: 'right' }}>Gelir</th>
                    <th style={{ padding: 8, textAlign: 'right' }}>Gider</th>
                    <th style={{ padding: 8, textAlign: 'right' }}>Net Kâr</th>
                    <th style={{ padding: 8, textAlign: 'right' }}>ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {mulkPerformans.map((m, i) => (
                    <tr key={m.mulkId} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                      <td style={{ padding: 8 }}>{i + 1}</td>
                      <td style={{ padding: 8, fontWeight: 500 }}>{m.ad}</td>
                      <td style={{ padding: 8, textAlign: 'right', color: 'var(--green)' }}>{fmtTL(m.gelirKurus)}</td>
                      <td style={{ padding: 8, textAlign: 'right', color: 'var(--red)' }}>{fmtTL(m.giderKurus)}</td>
                      <td style={{ padding: 8, textAlign: 'right', fontWeight: 700, color: m.netKarKurus >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtTL(m.netKarKurus)}</td>
                      <td style={{ padding: 8, textAlign: 'right', color: 'var(--gold)' }}>%{m.roi.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'trend' && (
          <div className="card">
            <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 14 }}>📈 Aylık Trend (Son 12 Ay)</div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid stroke="rgba(255,255,255,.05)" />
                  <XAxis dataKey="ay" tick={{ fontSize: 10, fill: '#888' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => (v / 1000).toFixed(0) + 'K'} />
                  <Tooltip contentStyle={{ background: '#161616', border: '1px solid #333' }} formatter={(v) => '₺' + v.toLocaleString('tr-TR')} />
                  <Line dataKey="gelirTL" stroke="#22C55E" strokeWidth={2} name="Gelir" />
                  <Line dataKey="giderTL" stroke="#EF4444" strokeWidth={2} name="Gider" />
                  <Line dataKey="netTL" stroke="#C9A84C" strokeWidth={2} name="Net" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
