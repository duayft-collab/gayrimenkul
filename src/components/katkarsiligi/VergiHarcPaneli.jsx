/**
 * @file components/katkarsiligi/VergiHarcPaneli.jsx
 * @description KDV, tapu harcı, damga, kat irtifakı, kurumlar vergisi
 */
import { formatKisa, kdvOrani } from '../../core/finansal';

export default function VergiHarcPaneli({ vergi, vergiParam, setVergiParam }) {
  const otoKdv = kdvOrani(vergiParam.ortDaireM2 || 120, vergiParam.lux);

  return (
    <div className="card">
      <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 600, color: 'var(--gold)', marginBottom: 14 }}>
        ⚖️ Vergi & Harç
      </div>

      <div className="fgrid2">
        <div className="fgroup">
          <label className="flbl">Ortalama Daire m² (KDV için)</label>
          <input type="number" className="input" value={vergiParam.ortDaireM2} onChange={e => setVergiParam({ ...vergiParam, ortDaireM2: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="fgroup">
          <label className="flbl">Lüks Segment</label>
          <select className="select" value={vergiParam.lux ? '1' : '0'} onChange={e => setVergiParam({ ...vergiParam, lux: e.target.value === '1' })}>
            <option value="0">Hayır — Otomatik KDV</option>
            <option value="1">Evet — %20 zorunlu</option>
          </select>
        </div>
      </div>

      <div style={{
        background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.2)',
        borderRadius: 6, padding: 8, marginBottom: 14, fontSize: '.72rem'
      }}>
        📌 Otomatik KDV oranı: <b style={{ color: 'var(--gold)' }}>%{otoKdv}</b>
        {' '}(net ≤150m² & lüks değil → %1 | 150-200 → %10 | &gt;200 veya lüks → %20)
      </div>

      <table style={{ width: '100%', fontSize: '.78rem', borderCollapse: 'collapse' }}>
        <tbody>
          {[
            ['KDV',                   vergi.kdvKurus,          'Daire m²\'ye göre otomatik'],
            ['Tapu Harcı (%2)',       vergi.tapuHarciKurus,    'Müteahhit payı'],
            ['Damga Vergisi (‰9.48)', vergi.damgaKurus,        'Arsa payı sözleşmesi'],
            ['Kat İrtifakı (‰5)',     vergi.katIrtifakiKurus,  ''],
            ['Emlak Beyanı (‰2)',     vergi.emlakKurus,        'Tahmini'],
            ['Kurumlar Vergisi (%25)', vergi.kurumlarKurus,    'Müteahhit karı üzerinden'],
          ].map(([lbl, val, sub]) => (
            <tr key={lbl} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              <td style={{ padding: '8px 4px' }}>
                <div>{lbl}</div>
                {sub && <div style={{ fontSize: '.65rem', color: 'var(--muted)' }}>{sub}</div>}
              </td>
              <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600, color: 'var(--red)' }}>
                {formatKisa(val)}
              </td>
            </tr>
          ))}
          <tr>
            <td style={{ padding: '10px 4px', fontWeight: 700, color: 'var(--red)' }}>TOPLAM VERGİ & HARÇ</td>
            <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 700, color: 'var(--red)', fontSize: '.95rem' }}>
              {formatKisa(vergi.toplamKurus)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
