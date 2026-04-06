/**
 * @file components/katkarsiligi/MonteCarlo.jsx
 * @description Monte Carlo 10k iterasyon — histogram + tornado
 */
import { useState } from 'react';
import { monteCarlo, formatKisa } from '../../core/finansal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const ETIKET = {
  satisFiyati: 'Satış Fiyatı',
  maliyet:     'Maliyet',
  emsal:       'Emsal',
  satisHizi:   'Satış Hızı',
  krediFaiz:   'Kredi Faiz',
  iskonto:     'İskonto',
};

export default function MonteCarlo({ baz, hesapla }) {
  const [bantlar, setBantlar] = useState({
    satisFiyati: 0.20,
    maliyet: 0.15,
    satisHizi: 0.30,
    krediFaiz: 0.05,
    iskonto: 0.03,
  });
  const [iter, setIter] = useState(10000);
  const [calisiyor, setCalisiyor] = useState(false);
  const [sonuc, setSonuc] = useState(null);
  const [sure, setSure] = useState(null);

  const calistir = () => {
    setCalisiyor(true);
    setTimeout(() => {
      const t0 = performance.now();
      const r = monteCarlo({ baz, bantlar, iter, hesapla });
      const t1 = performance.now();
      setSonuc(r);
      setSure(Math.round(t1 - t0));
      setCalisiyor(false);
    }, 20);
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 600, color: 'var(--gold)' }}>
          🎲 Monte Carlo Simülasyon
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="number" value={iter} onChange={e => setIter(parseInt(e.target.value) || 1000)} className="input" style={{ width: 90, padding: '4px 8px', fontSize: '.78rem' }} />
          <button className="btn btn-gold btn-sm" onClick={calistir} disabled={calisiyor}>
            {calisiyor ? 'Hesaplanıyor...' : '▶ Çalıştır'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
        {Object.keys(bantlar).map(k => (
          <div key={k}>
            <label style={{ fontSize: '.72rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{ETIKET[k] || k} bandı</span>
              <span style={{ color: 'var(--gold)', fontWeight: 600 }}>±%{(bantlar[k] * 100).toFixed(0)}</span>
            </label>
            <input
              type="range" min="0" max="0.5" step="0.01" value={bantlar[k]}
              onChange={e => setBantlar({ ...bantlar, [k]: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
        ))}
      </div>

      {sonuc && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
            <div className="kpi" style={{ '--kc': 'var(--red)' }}>
              <div className="kpi-lbl">P10 (Kötü)</div>
              <div className="kpi-val" style={{ color: 'var(--red)', fontSize: '1rem' }}>{formatKisa(sonuc.p10)}</div>
            </div>
            <div className="kpi" style={{ '--kc': 'var(--gold)' }}>
              <div className="kpi-lbl">P50 (Medyan)</div>
              <div className="kpi-val" style={{ color: 'var(--gold)', fontSize: '1rem' }}>{formatKisa(sonuc.p50)}</div>
            </div>
            <div className="kpi" style={{ '--kc': 'var(--green)' }}>
              <div className="kpi-lbl">P90 (İyi)</div>
              <div className="kpi-val" style={{ color: 'var(--green)', fontSize: '1rem' }}>{formatKisa(sonuc.p90)}</div>
            </div>
            <div className="kpi" style={{ '--kc': 'var(--amber)' }}>
              <div className="kpi-lbl">Zarar Olasılığı</div>
              <div className="kpi-val" style={{ color: sonuc.zararOlasi > 20 ? 'var(--red)' : 'var(--amber)', fontSize: '1rem' }}>
                %{sonuc.zararOlasi.toFixed(1)}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 6 }}>
            Kar Dağılımı ({iter.toLocaleString()} iter, {sure}ms)
          </div>
          <div style={{ height: 160, marginBottom: 14 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sonuc.histogram}>
                <CartesianGrid stroke="rgba(255,255,255,.05)" />
                <XAxis dataKey="x0" tick={{ fontSize: 9, fill: '#888' }} tickFormatter={(v) => (v / 1e8).toFixed(1) + 'M'} />
                <YAxis tick={{ fontSize: 9, fill: '#888' }} />
                <Tooltip contentStyle={{ background: '#161616', border: '1px solid #333', fontSize: 11 }} />
                <Bar dataKey="count">
                  {sonuc.histogram.map((b, i) => (
                    <Cell key={i} fill={b.x0 < 0 ? '#EF4444' : '#C9A84C'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 6 }}>
            Tornado — Varyans Katkısı
          </div>
          <div>
            {Object.entries(sonuc.tornado)
              .sort((a, b) => b[1].araligi - a[1].araligi)
              .map(([k, v]) => {
                const maks = Math.max(...Object.values(sonuc.tornado).map(x => x.araligi));
                const w = (v.araligi / maks) * 100;
                return (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 90, fontSize: '.72rem', color: 'var(--muted)' }}>{ETIKET[k] || k}</div>
                    <div style={{ flex: 1, height: 14, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: w + '%', height: '100%', background: 'var(--blue2)' }} />
                    </div>
                    <div style={{ width: 80, fontSize: '.7rem', textAlign: 'right', color: 'var(--gold)' }}>
                      ±{formatKisa(v.araligi / 2)}
                    </div>
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}
