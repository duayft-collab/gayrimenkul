/**
 * @file components/katkarsiligi/MaliyetKalemleri.jsx
 * @description 14 kalem maliyet tablosu — şablon, ekle/sil/deaktif
 */
import { formatKisa } from '../../core/finansal';

export const SABLON_STANDART = [
  { ad: 'Kaba İnşaat',          m2Birim: 8500,  aktif: true },
  { ad: 'İnce İşler',           m2Birim: 6500,  aktif: true },
  { ad: 'Mekanik Tesisat',      m2Birim: 2200,  aktif: true },
  { ad: 'Elektrik Tesisat',     m2Birim: 1400,  aktif: true },
  { ad: 'Asansör',              toplamSabit: 850000, aktif: true },
  { ad: 'Peyzaj & Çevre',       oranToplam: 2, aktif: true },
  { ad: 'Altyapı Bağlantıları', toplamSabit: 450000, aktif: true },
  { ad: 'Proje & Müşavirlik',   oranToplam: 4, aktif: true },
  { ad: 'Şantiye Yönetimi',     oranToplam: 3, aktif: true },
  { ad: 'İşçi SGK & Sigorta',   oranToplam: 2, aktif: true },
  { ad: 'İskele & Vinç',        toplamSabit: 380000, aktif: true },
  { ad: 'Zemin İyileştirme',    toplamSabit: 0, aktif: false },
  { ad: 'Hafriyat & Nakliye',   m2Birim: 180,  aktif: true },
  { ad: 'Müteahhit Kar Marjı',  oranToplam: 10, aktif: true },
];

export const SABLON_NAIF = SABLON_STANDART.map(k => ({
  ...k,
  ...(k.m2Birim   ? { m2Birim: Math.round(k.m2Birim * 0.85) } : {}),
  ...(k.oranToplam ? { oranToplam: Math.max(1, k.oranToplam - 1) } : {}),
}));

export const SABLON_SEYTANI = SABLON_STANDART.map(k => ({
  ...k,
  ...(k.m2Birim   ? { m2Birim: Math.round(k.m2Birim * 1.20) } : {}),
  ...(k.oranToplam ? { oranToplam: k.oranToplam + 2 } : {}),
  aktif: true,
}));

/**
 * Kalemleri hesapla — toplam kuruş, kırılım
 */
export function maliyetHesapla(kalemler, toplamInsaatM2) {
  // 1. pass: sabit ve m² kalemleri
  let baseTL = 0;
  const kirilim = kalemler.map(k => {
    if (!k.aktif) return { ...k, tutarTL: 0 };
    if (k.m2Birim) {
      const t = toplamInsaatM2 * k.m2Birim;
      baseTL += t;
      return { ...k, tutarTL: t };
    }
    if (k.toplamSabit) {
      baseTL += k.toplamSabit;
      return { ...k, tutarTL: k.toplamSabit };
    }
    return { ...k, tutarTL: 0 };
  });
  // 2. pass: oran kalemleri base üstüne
  const nihai = kirilim.map(k => {
    if (!k.aktif) return k;
    if (k.oranToplam) {
      const t = (baseTL * k.oranToplam) / 100;
      return { ...k, tutarTL: t };
    }
    return k;
  });
  const toplamTL = nihai.reduce((a, k) => a + (k.aktif ? k.tutarTL : 0), 0);
  return {
    kirilim: nihai,
    toplamKurus: Math.round(toplamTL * 100),
  };
}

export default function MaliyetKalemleri({ kalemler, setKalemler, toplamInsaatM2 }) {
  const { kirilim, toplamKurus } = maliyetHesapla(kalemler, toplamInsaatM2);

  const guncelle = (i, key, val) => {
    const yeni = [...kalemler];
    yeni[i] = { ...yeni[i], [key]: val };
    setKalemler(yeni);
  };

  const sil = (i) => setKalemler(kalemler.filter((_, idx) => idx !== i));

  const ekle = () => setKalemler([...kalemler, { ad: 'Yeni Kalem', m2Birim: 0, aktif: true }]);

  const sablonYukle = (s) => setKalemler(JSON.parse(JSON.stringify(s)));

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 600, color: 'var(--gold)' }}>
          💰 Maliyet Kalemleri ({kalemler.filter(k => k.aktif).length}/{kalemler.length} aktif)
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-sm btn-ghost" onClick={() => sablonYukle(SABLON_NAIF)}>😇 Naif</button>
          <button className="btn btn-sm btn-ghost" onClick={() => sablonYukle(SABLON_STANDART)}>⚖️ Standart</button>
          <button className="btn btn-sm btn-ghost" onClick={() => sablonYukle(SABLON_SEYTANI)}>😈 Şeytani</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: '.78rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '6px 4px', width: 30 }}></th>
              <th style={{ textAlign: 'left', padding: '6px 4px' }}>Kalem</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>m² Birim</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>Sabit</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>% Oran</th>
              <th style={{ textAlign: 'right', padding: '6px 4px' }}>Tutar</th>
              <th style={{ padding: '6px 4px' }}></th>
            </tr>
          </thead>
          <tbody>
            {kirilim.map((k, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,.03)', opacity: k.aktif ? 1 : 0.4 }}>
                <td style={{ padding: '4px' }}>
                  <input type="checkbox" checked={k.aktif} onChange={e => guncelle(i, 'aktif', e.target.checked)} />
                </td>
                <td style={{ padding: '4px' }}>
                  <input className="input" value={k.ad} onChange={e => guncelle(i, 'ad', e.target.value)} style={{ padding: '4px 6px', fontSize: '.75rem' }} />
                </td>
                <td style={{ padding: '4px', width: 90 }}>
                  <input type="number" className="input" value={k.m2Birim || ''} onChange={e => guncelle(i, 'm2Birim', parseFloat(e.target.value) || 0)} style={{ padding: '4px 6px', fontSize: '.75rem', textAlign: 'right' }} />
                </td>
                <td style={{ padding: '4px', width: 110 }}>
                  <input type="number" className="input" value={k.toplamSabit || ''} onChange={e => guncelle(i, 'toplamSabit', parseFloat(e.target.value) || 0)} style={{ padding: '4px 6px', fontSize: '.75rem', textAlign: 'right' }} />
                </td>
                <td style={{ padding: '4px', width: 70 }}>
                  <input type="number" className="input" value={k.oranToplam || ''} onChange={e => guncelle(i, 'oranToplam', parseFloat(e.target.value) || 0)} style={{ padding: '4px 6px', fontSize: '.75rem', textAlign: 'right' }} />
                </td>
                <td style={{ padding: '4px', textAlign: 'right', fontWeight: 600, color: 'var(--gold)', whiteSpace: 'nowrap' }}>
                  {formatKisa(Math.round(k.tutarTL * 100))}
                </td>
                <td style={{ padding: '4px', textAlign: 'center' }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => sil(i)} style={{ padding: '2px 6px' }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="5" style={{ padding: '10px 4px', fontWeight: 700, color: 'var(--gold)' }}>TOPLAM MALİYET</td>
              <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 700, color: 'var(--gold)', fontSize: '.95rem' }}>
                {formatKisa(toplamKurus)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button className="btn btn-sm btn-ghost" onClick={ekle} style={{ marginTop: 10 }}>+ Kalem Ekle</button>
    </div>
  );
}
