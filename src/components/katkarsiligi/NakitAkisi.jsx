/**
 * @file components/katkarsiligi/NakitAkisi.jsx
 * @description Faz tablosu + aylık nakit akışı + NPV/IRR/Payback
 */
import { formatKisa, npv, irr, payback } from '../../core/finansal';
import { Bar, Line, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function NakitAkisi({ fazlar, setFazlar, akis, iskontoAylik, setIskontoAylik }) {
  const npvVal = npv(iskontoAylik / 100, akis);
  const irrAylik = irr(akis);
  const irrYillik = irrAylik != null ? ((Math.pow(1 + irrAylik, 12) - 1) * 100) : null;
  const pbp = payback(akis);

  // Kümülatif
  let kum = 0;
  const grafikData = akis.map((a, i) => {
    kum += a;
    return { ay: i, aylik: a / 100, kumulatif: kum / 100 };
  });

  const guncelleFaz = (i, key, val) => {
    const yeni = [...fazlar];
    yeni[i] = { ...yeni[i], [key]: val };
    setFazlar(yeni);
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 600, color: 'var(--gold)' }}>
          📈 Nakit Akışı & Fazlar
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: '.72rem', color: 'var(--muted)' }}>İskonto Aylık %</label>
          <input type="number" step="0.1" value={iskontoAylik} onChange={e => setIskontoAylik(parseFloat(e.target.value) || 0)} className="input" style={{ width: 70, padding: '4px 8px', fontSize: '.78rem' }} />
        </div>
      </div>

      <table style={{ width: '100%', fontSize: '.75rem', marginBottom: 12 }}>
        <thead>
          <tr style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: 4 }}>Faz</th>
            <th style={{ textAlign: 'right', padding: 4 }}>Süre (ay)</th>
            <th style={{ textAlign: 'right', padding: 4 }}>Maliyet %</th>
          </tr>
        </thead>
        <tbody>
          {fazlar.map((f, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
              <td style={{ padding: 4 }}>
                <input className="input" value={f.faz} onChange={e => guncelleFaz(i, 'faz', e.target.value)} style={{ padding: '4px 6px', fontSize: '.75rem' }} />
              </td>
              <td style={{ padding: 4, width: 80 }}>
                <input type="number" className="input" value={f.ay} onChange={e => guncelleFaz(i, 'ay', parseInt(e.target.value) || 0)} style={{ padding: '4px 6px', fontSize: '.75rem', textAlign: 'right' }} />
              </td>
              <td style={{ padding: 4, width: 90 }}>
                <input type="number" className="input" value={f.maliyetOran} onChange={e => guncelleFaz(i, 'maliyetOran', parseFloat(e.target.value) || 0)} style={{ padding: '4px 6px', fontSize: '.75rem', textAlign: 'right' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        <div className="kpi" style={{ '--kc': 'var(--gold)' }}>
          <div className="kpi-lbl">NPV</div>
          <div className="kpi-val" style={{ color: npvVal >= 0 ? 'var(--green)' : 'var(--red)', fontSize: '1.1rem' }}>
            {formatKisa(npvVal)}
          </div>
        </div>
        <div className="kpi" style={{ '--kc': 'var(--blue2)' }}>
          <div className="kpi-lbl">IRR (Yıllık)</div>
          <div className="kpi-val" style={{ color: 'var(--blue2)', fontSize: '1.1rem' }}>
            {irrYillik != null ? '%' + irrYillik.toFixed(1) : '—'}
          </div>
        </div>
        <div className="kpi" style={{ '--kc': 'var(--amber)' }}>
          <div className="kpi-lbl">Payback</div>
          <div className="kpi-val" style={{ color: 'var(--amber)', fontSize: '1.1rem' }}>
            {pbp != null ? pbp + ' ay' : '—'}
          </div>
        </div>
      </div>

      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={grafikData}>
            <CartesianGrid stroke="rgba(255,255,255,.05)" />
            <XAxis dataKey="ay" tick={{ fontSize: 10, fill: '#888' }} />
            <YAxis tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => (v / 1e6).toFixed(0) + 'M'} />
            <Tooltip
              contentStyle={{ background: '#161616', border: '1px solid #333', fontSize: 11 }}
              formatter={(v) => '₺' + new Intl.NumberFormat('tr-TR').format(Math.round(v))}
            />
            <Bar dataKey="aylik" fill="#C9A84C" name="Aylık" />
            <Line dataKey="kumulatif" stroke="#1B4F8A" strokeWidth={2} dot={false} name="Kümülatif" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
