/**
 * @file pages/Karsilastir.jsx
 * @description Mülk karşılaştırma tablosu — seçimler sessionStorage'dan
 */
import { useMemo } from 'react';
import { useStore } from '../store/app';
import { Topbar } from '../components/Layout';
import { mulklerCsvExport } from '../core/export';

const fmtTL = (v) => '₺' + new Intl.NumberFormat('tr-TR').format(v || 0);

export default function Karsilastir() {
  const { mulkler, setPage } = useStore();
  const secimler = (() => {
    try { return JSON.parse(sessionStorage.getItem('karsiSecimler') || '[]'); }
    catch { return []; }
  })();
  const secili = useMemo(() => (mulkler || []).filter(m => secimler.includes(m.id)), [mulkler]);

  if (secili.length < 2) {
    return (
      <div>
        <Topbar title="⚖️ Karşılaştır" />
        <div className="page">
          <div className="empty">
            <div className="empty-ico">⚖️</div>
            <div className="empty-title">Mülkler sayfasında checkbox ile 2-4 mülk seç → "Karşılaştır" butonuna tıkla</div>
            <button className="btn btn-gold" style={{ marginTop: 16 }} onClick={() => setPage('portfolio')}>Mülklere Git</button>
          </div>
        </div>
      </div>
    );
  }

  const satirlar = [
    { lbl: 'Tür',           deger: m => m.tur || '—' },
    { lbl: 'Konum',         deger: m => `${m.il || '—'} / ${m.ilce || '—'}` },
    { lbl: 'Alan (m²)',     deger: m => (m.alan || 0).toLocaleString('tr-TR'), nsayi: m => m.alan || 0, iyiYuksek: true },
    { lbl: 'Fiyat',         deger: m => fmtTL(m.fiyat), nsayi: m => m.fiyat || 0, iyiYuksek: false },
    { lbl: 'm² Fiyat',      deger: m => fmtTL(m.alan > 0 ? Math.round((m.fiyat || 0) / m.alan) : 0), nsayi: m => m.alan > 0 ? (m.fiyat || 0) / m.alan : 0, iyiYuksek: false },
    { lbl: 'Aylık Kira',    deger: m => fmtTL(m.aylikKira), nsayi: m => m.aylikKira || 0, iyiYuksek: true },
    { lbl: 'Kira Verimi',   deger: m => {
        const yil = (m.aylikKira || 0) * 12;
        return m.fiyat > 0 ? '%' + (yil / m.fiyat * 100).toFixed(2) : '—';
      }, nsayi: m => m.fiyat > 0 ? ((m.aylikKira || 0) * 12) / m.fiyat : 0, iyiYuksek: true },
    { lbl: 'Durum',         deger: m => m.durum || '—' },
    { lbl: 'Notlar',        deger: m => m.notlar || '—' },
  ];

  // Her satır için en iyi değeri bul (renk vurgu)
  const enIyiIndex = (satir) => {
    if (!satir.nsayi) return -1;
    const degerler = secili.map(satir.nsayi);
    const hedef = satir.iyiYuksek ? Math.max(...degerler) : Math.min(...degerler.filter(v => v > 0));
    return degerler.indexOf(hedef);
  };

  // Özet: hangi mülk kaç kriterde lider
  const liderSayaci = secili.map(() => 0);
  satirlar.forEach(s => {
    const i = enIyiIndex(s);
    if (i >= 0) liderSayaci[i]++;
  });
  const maksLider = Math.max(...liderSayaci);
  const kriterSayisi = satirlar.filter(s => s.nsayi).length;
  const lider = secili[liderSayaci.indexOf(maksLider)];

  return (
    <div>
      <Topbar title="⚖️ Karşılaştır" />
      <div className="page" style={{ paddingBottom: 90 }}>
        <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: '.82rem', color: 'var(--muted)' }}>En güçlü aday:</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)' }}>
              🏆 {lider?.ad || '—'}
            </div>
            <div style={{ fontSize: '.72rem', color: 'var(--green)' }}>
              {maksLider}/{kriterSayisi} kriterde lider
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => mulklerCsvExport(secili)}>📥 CSV</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage('portfolio')}>← Listeye Dön</button>
          </div>
        </div>

        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '.82rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: 10, color: 'var(--muted)', minWidth: 120 }}>Kriter</th>
                  {secili.map(m => (
                    <th key={m.id} style={{ textAlign: 'left', padding: 10, color: 'var(--gold)' }}>{m.ad || '—'}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {satirlar.map((s, si) => {
                  const iyiIdx = enIyiIndex(s);
                  return (
                    <tr key={si} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                      <td style={{ padding: 10, color: 'var(--muted)', fontWeight: 500 }}>{s.lbl}</td>
                      {secili.map((m, mi) => (
                        <td key={m.id} style={{
                          padding: 10,
                          color: mi === iyiIdx ? 'var(--green)' : 'var(--text)',
                          fontWeight: mi === iyiIdx ? 700 : 400,
                          background: mi === iyiIdx ? 'rgba(34,197,94,.05)' : 'transparent',
                        }}>
                          {s.deger(m)}
                          {mi === iyiIdx && s.nsayi && ' ✓'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
