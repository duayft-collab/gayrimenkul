/**
 * @file components/katkarsiligi/ImarSecici.jsx
 * @description İmar durumu — il/ilçeden otomatik yükler, manuel override
 */
import { useEffect, useState } from 'react';
import imarDb from '../../data/imar-durumu.json';

export default function ImarSecici({ parseller, imar, setImar }) {
  const [kilit, setKilit] = useState(true);

  // İlk parselin il/ilçesinden otomatik yükle
  useEffect(() => {
    if (!kilit) return;
    const p = parseller[0];
    if (!p || !p.il || !p.ilce) return;
    const ilce = imarDb[p.il]?.[p.ilce];
    if (!ilce) return;
    const def = ilce[p.mahalle] || ilce._default;
    if (def) {
      setImar({
        emsal: def.emsal,
        taks: def.taks,
        maksKatSayisi: def.maksKat,
        cepheCekme: def.cepheCekme,
        yanCekme: def.yanCekme,
        arkaCekme: def.arkaCekme,
        yapiNizami: def.yapiNizami,
      });
    }
  }, [parseller, kilit]);

  const set = (k) => (e) => setImar({ ...imar, [k]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value });

  const input = (label, key, type = 'number', suffix = '') => (
    <div className="fgroup">
      <label className="flbl">{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type={type}
          className="input"
          value={imar[key] ?? ''}
          onChange={set(key)}
          disabled={kilit}
          style={{ flex: 1, opacity: kilit ? 0.65 : 1 }}
        />
        {suffix && <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 600, color: 'var(--gold)' }}>
          🏛️ İmar Durumu
        </div>
        <button className="btn btn-sm btn-ghost" onClick={() => setKilit(!kilit)}>
          {kilit ? '🔒 Kilitli' : '🔓 Açık'}
        </button>
      </div>

      <div style={{
        background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.2)',
        borderRadius: 6, padding: 8, marginBottom: 14, fontSize: '.72rem', color: 'var(--muted)'
      }}>
        İlk parselin il/ilçesinden otomatik yüklenir. Manuel düzenlemek için "Kilidi Aç".
      </div>

      <div className="fgrid2">
        {input('Emsal (KAKS)', 'emsal', 'number', '×')}
        {input('TAKS', 'taks', 'number', '×')}
      </div>
      <div className="fgrid2">
        {input('Maks Kat Sayısı', 'maksKatSayisi', 'number', 'kat')}
        <div className="fgroup">
          <label className="flbl">Yapı Nizamı</label>
          <select className="select" value={imar.yapiNizami || 'ayrık'} onChange={set('yapiNizami')} disabled={kilit} style={{ opacity: kilit ? 0.65 : 1 }}>
            <option value="ayrık">Ayrık</option>
            <option value="ikiz">İkiz</option>
            <option value="bitişik">Bitişik</option>
            <option value="blok">Blok</option>
          </select>
        </div>
      </div>
      <div className="fgrid3">
        {input('Cephe Çekme', 'cepheCekme', 'number', 'm')}
        {input('Yan Çekme', 'yanCekme', 'number', 'm')}
        {input('Arka Çekme', 'arkaCekme', 'number', 'm')}
      </div>
    </div>
  );
}
