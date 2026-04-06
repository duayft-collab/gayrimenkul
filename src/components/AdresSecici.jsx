/**
 * @file components/AdresSecici.jsx
 * @description İl/İlçe/Mahalle cascade — imar-durumu.json'dan il/ilçe kaynağı
 */
import imarDb from '../data/imar-durumu.json';

export default function AdresSecici({ deger, setDeger }) {
  const d = deger || {};
  const iller = Object.keys(imarDb);
  const ilceler = d.il ? Object.keys(imarDb[d.il] || {}) : [];

  const set = (k) => (e) => {
    const v = e.target.value;
    if (k === 'il') setDeger({ ...d, il: v, ilce: '' });
    else setDeger({ ...d, [k]: v });
  };

  return (
    <div>
      <div className="fgrid2">
        <div className="fgroup">
          <label className="flbl">İl</label>
          <select className="select" value={d.il || ''} onChange={set('il')}>
            <option value="">— Seçiniz —</option>
            {iller.map(il => <option key={il} value={il}>{il}</option>)}
          </select>
        </div>
        <div className="fgroup">
          <label className="flbl">İlçe</label>
          <select className="select" value={d.ilce || ''} onChange={set('ilce')} disabled={!d.il}>
            <option value="">— Seçiniz —</option>
            {ilceler.map(il => <option key={il} value={il}>{il}</option>)}
          </select>
        </div>
      </div>
      <div className="fgrid2">
        <div className="fgroup">
          <label className="flbl">Mahalle</label>
          <input className="input" value={d.mahalle || ''} onChange={set('mahalle')} />
        </div>
        <div className="fgroup">
          <label className="flbl">Ada / Parsel</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="input" value={d.ada || ''} onChange={set('ada')} placeholder="Ada" />
            <input className="input" value={d.parsel || ''} onChange={set('parsel')} placeholder="Parsel" />
          </div>
        </div>
      </div>
      <div className="fgroup">
        <label className="flbl">Açık Adres</label>
        <input className="input" value={d.fullAdres || ''} onChange={set('fullAdres')} placeholder="Sokak, kapı no, daire no" />
      </div>
      <div className="fgrid2">
        <div className="fgroup">
          <label className="flbl">Enlem (lat)</label>
          <input type="number" step="0.0001" className="input" value={d.lat || ''} onChange={e => setDeger({ ...d, lat: parseFloat(e.target.value) || null })} />
        </div>
        <div className="fgroup">
          <label className="flbl">Boylam (lng)</label>
          <input type="number" step="0.0001" className="input" value={d.lng || ''} onChange={e => setDeger({ ...d, lng: parseFloat(e.target.value) || null })} />
        </div>
      </div>
    </div>
  );
}
