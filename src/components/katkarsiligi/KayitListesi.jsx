/**
 * @file components/katkarsiligi/KayitListesi.jsx
 * @description Kayıtlı hesapları listele, yükle, sil, karşılaştır için seç
 */
import { formatKisa } from '../../core/finansal';

export default function KayitListesi({ hesaplar, yukleyen, silinen, karsiSecim, setKarsiSecim, aktifId }) {
  if (!hesaplar || hesaplar.length === 0) {
    return (
      <div className="card">
        <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 600, color: 'var(--gold)', marginBottom: 10 }}>
          💾 Kayıtlar
        </div>
        <div className="empty">
          <div className="empty-ico">📂</div>
          <div className="empty-title">Henüz kayıt yok</div>
          <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>Hesabı doldurun ve "Kaydet" tıklayın.</div>
        </div>
      </div>
    );
  }

  const toggleKarsi = (id) => {
    if (karsiSecim.includes(id)) {
      setKarsiSecim(karsiSecim.filter(x => x !== id));
    } else if (karsiSecim.length < 4) {
      setKarsiSecim([...karsiSecim, id]);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 600, color: 'var(--gold)' }}>
          💾 Kayıtlar ({hesaplar.length})
        </div>
        <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>
          Karşılaştırma için en fazla 4 seçin
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {hesaplar.map(h => (
          <div key={h.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: aktifId === h.id ? 'rgba(201,168,76,.1)' : 'var(--surface2)',
            border: aktifId === h.id ? '1px solid var(--gold)' : '1px solid var(--border)',
            borderRadius: 8, padding: 10,
          }}>
            <input
              type="checkbox"
              checked={karsiSecim.includes(h.id)}
              onChange={() => toggleKarsi(h.id)}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {h.ad || 'Taslak'}
              </div>
              <div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>
                {h.parseller?.length || 0} parsel · Net Kâr: {formatKisa(h.sonuclar?.netKarKurus || 0)}
              </div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => yukleyen(h)}>📂</button>
            <button className="btn btn-sm btn-danger" onClick={() => silinen(h)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
