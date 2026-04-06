/**
 * @file components/katkarsiligi/KrediFinansman.jsx
 * @description Kredi, özkaynak, kapitalize faiz, DSCR
 */
import { formatKisa } from '../../core/finansal';

export default function KrediFinansman({ kredi, setKredi, krediSonuc, dscr, ozkaynakRoi, kaldiracliRoi }) {
  const set = (k) => (e) => setKredi({ ...kredi, [k]: parseFloat(e.target.value) || 0 });

  return (
    <div className="card">
      <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 600, color: 'var(--gold)', marginBottom: 14 }}>
        🏦 Kredi & Finansman
      </div>

      <div className="fgrid2">
        <div className="fgroup">
          <label className="flbl">Özkaynak Oranı (%)</label>
          <input type="number" className="input" value={kredi.ozkaynakOran} onChange={set('ozkaynakOran')} />
        </div>
        <div className="fgroup">
          <label className="flbl">Kredi Aylık Faiz (%)</label>
          <input type="number" step="0.1" className="input" value={kredi.aylikFaiz} onChange={set('aylikFaiz')} />
        </div>
      </div>
      <div className="fgrid3">
        <div className="fgroup">
          <label className="flbl">Kullanım (ay)</label>
          <input type="number" className="input" value={kredi.sure} onChange={set('sure')} />
        </div>
        <div className="fgroup">
          <label className="flbl">KKDF (%)</label>
          <input type="number" className="input" value={kredi.kkdf} onChange={set('kkdf')} />
        </div>
        <div className="fgroup">
          <label className="flbl">BSMV (%)</label>
          <input type="number" className="input" value={kredi.bsmv} onChange={set('bsmv')} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 10 }}>
        <div className="kpi" style={{ '--kc': 'var(--blue2)' }}>
          <div className="kpi-lbl">Özkaynak</div>
          <div className="kpi-val" style={{ color: 'var(--blue2)' }}>{formatKisa(krediSonuc.ozkaynakKurus)}</div>
        </div>
        <div className="kpi" style={{ '--kc': 'var(--gold)' }}>
          <div className="kpi-lbl">Kredi Tutarı</div>
          <div className="kpi-val" style={{ color: 'var(--gold)' }}>{formatKisa(krediSonuc.krediTutariKurus)}</div>
        </div>
        <div className="kpi" style={{ '--kc': 'var(--red)' }}>
          <div className="kpi-lbl">Toplam Faiz (Kapitalize)</div>
          <div className="kpi-val" style={{ color: 'var(--red)' }}>{formatKisa(krediSonuc.toplamFaizKurus)}</div>
        </div>
        <div className="kpi" style={{ '--kc': 'var(--amber)' }}>
          <div className="kpi-lbl">Toplam Geri Ödeme</div>
          <div className="kpi-val" style={{ color: 'var(--amber)' }}>{formatKisa(krediSonuc.toplamGeriOdemeKurus)}</div>
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>Özkaynak ROI</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--green)' }}>%{ozkaynakRoi.toFixed(1)}</div>
        </div>
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>Kaldıraçlı ROI</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)' }}>%{kaldiracliRoi.toFixed(1)}</div>
        </div>
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>DSCR</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: dscr >= 1.5 ? 'var(--green)' : dscr >= 1 ? 'var(--amber)' : 'var(--red)' }}>
            {dscr.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
