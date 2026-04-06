/**
 * @file components/katkarsiligi/KarsilastirmaTablosu.jsx
 * @description Kayıtlı hesapları yan yana karşılaştır — CSV export
 */
import { formatKisa } from '../../core/finansal';

export default function KarsilastirmaTablosu({ hesaplar }) {
  if (!hesaplar || hesaplar.length === 0) {
    return (
      <div className="empty">
        <div className="empty-ico">📊</div>
        <div className="empty-title">Karşılaştırmak için 2-4 kayıt seçin</div>
      </div>
    );
  }

  const satirlar = [
    ['Parsel Sayısı', h => h.parseller?.length || 0],
    ['Toplam Alan (m²)', h => (h.parseller || []).reduce((a, p) => a + (p.alan || 0), 0).toLocaleString('tr-TR')],
    ['Emsal', h => h.imar?.emsal ?? '—'],
    ['İnşaat m²', h => h.sonuclar?.toplamInsaatM2 ? Math.round(h.sonuclar.toplamInsaatM2).toLocaleString('tr-TR') : '—'],
    ['Net Kâr', h => formatKisa(h.sonuclar?.netKarKurus || 0)],
    ['ROI', h => (h.sonuclar?.roi != null ? '%' + h.sonuclar.roi.toFixed(1) : '—')],
    ['IRR (Yıl)', h => (h.sonuclar?.irrYillik != null ? '%' + h.sonuclar.irrYillik.toFixed(1) : '—')],
    ['NPV', h => formatKisa(h.sonuclar?.npvKurus || 0)],
    ['Risk Skoru', h => h.risk?.skor != null ? h.risk.skor + '/100' : '—'],
    ['MC P50 Kâr', h => formatKisa(h.monteCarlo?.p50 || 0)],
  ];

  // En iyi değer (yeşil) — sayısal satırlar için
  const enIyi = (satirIdx) => {
    const fn = satirlar[satirIdx][1];
    const degerler = hesaplar.map(h => {
      const ham = {
        'Net Kâr': h.sonuclar?.netKarKurus,
        'ROI': h.sonuclar?.roi,
        'IRR (Yıl)': h.sonuclar?.irrYillik,
        'NPV': h.sonuclar?.npvKurus,
        'MC P50 Kâr': h.monteCarlo?.p50,
        'Risk Skoru': h.risk?.skor != null ? -h.risk.skor : null, // düşük risk iyi
      }[satirlar[satirIdx][0]];
      return ham;
    });
    const valid = degerler.filter(d => d != null);
    if (!valid.length) return -1;
    const max = Math.max(...valid);
    return degerler.indexOf(max);
  };

  const csvIndir = () => {
    const satirStr = [
      ['Metrik', ...hesaplar.map(h => h.ad || 'Taslak')].join(','),
      ...satirlar.map(([lbl, fn]) => [lbl, ...hesaplar.map(h => String(fn(h)).replace(/,/g, '.'))].join(',')),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + satirStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `karsilastirma_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 600, color: 'var(--gold)' }}>
          📈 Karşılaştırma ({hesaplar.length} hesap)
        </div>
        <button className="btn btn-sm btn-ghost" onClick={csvIndir}>📥 CSV</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: '.78rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: 8, color: 'var(--muted)' }}>Metrik</th>
              {hesaplar.map(h => (
                <th key={h.id} style={{ textAlign: 'right', padding: 8, color: 'var(--gold)' }}>{h.ad || 'Taslak'}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {satirlar.map(([lbl, fn], i) => {
              const iyiIdx = enIyi(i);
              return (
                <tr key={lbl} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                  <td style={{ padding: 8, color: 'var(--muted)' }}>{lbl}</td>
                  {hesaplar.map((h, hi) => (
                    <td key={h.id} style={{
                      padding: 8, textAlign: 'right',
                      color: hi === iyiIdx ? 'var(--green)' : 'var(--text)',
                      fontWeight: hi === iyiIdx ? 700 : 400,
                    }}>
                      {fn(h)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
