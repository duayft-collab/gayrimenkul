/**
 * @file components/katkarsiligi/MuteahhitGozu.jsx
 * @description "Deneyimli Müteahhit Kontrol Listesi" — gizli kalemler
 */
import { useState } from 'react';
import { formatKisa } from '../../core/finansal';

export const MUTEAHHIT_KALEMLERI = [
  { id: 'tasinma',     ad: 'Taşınma/Kira Yardımı',        aciklama: '18 ay × daire × aylık kira', tipi: 'hesaplama', varsayilan: { ay: 18, aylikKira: 15000 } },
  { id: 'ortakAlan',   ad: 'Ortak Alan Kaybı',             aciklama: 'Satılabilir alan düşer',      tipi: 'yuzde',     varsayilan: 15 },
  { id: 'satisKom',    ad: 'Satış Komisyonu',              aciklama: 'Satış gelirinden',             tipi: 'yuzde',     varsayilan: 2 },
  { id: 'reklam',      ad: 'Reklam / Maket / Ofis',        aciklama: 'Satış gelirinden',             tipi: 'yuzde',     varsayilan: 1 },
  { id: 'garanti',     ad: 'Garanti Rezervi',              aciklama: 'Maliyetten',                   tipi: 'yuzde',     varsayilan: 0.5 },
  { id: 'enflasyon',   ad: 'Enflasyon Maliyet Rezervi',    aciklama: 'Maliyetten',                   tipi: 'yuzde',     varsayilan: 10 },
  { id: 'zeminSurpriz',ad: 'Zemin Etüdü Sürprizleri',      aciklama: 'Sabit rezerv (kuruş)',         tipi: 'sabit',     varsayilan: 30000000 /* 300K TL */ },
  { id: 'bld',         ad: 'Belediye Cezaları Rezervi',    aciklama: 'Maliyetten',                   tipi: 'yuzde',     varsayilan: 1 },
  { id: 'hukuk',       ad: 'Hukuk / Noter / Avukat',       aciklama: 'Sabit (kuruş)',                tipi: 'sabit',     varsayilan: 20000000 },
  { id: 'pazarlik',    ad: 'Pazarlık Marjı Kaybı',         aciklama: 'Satış fiyatından',             tipi: 'yuzde',     varsayilan: 3 },
];

export const ON_AYAR = {
  naif: {},
  standart: { tasinma: true, ortakAlan: true, satisKom: true, reklam: true, garanti: true, enflasyon: true },
  seytani: MUTEAHHIT_KALEMLERI.reduce((a, k) => ({ ...a, [k.id]: true }), {}),
};

/**
 * Müteahhit Gözü toplam ek yük hesapla (kuruş)
 * @returns { toplamEkMaliyetKurus, satisKesintiKurus, satilabilirDusus }
 */
export function muteahhitHesapla(ayarlar, baz) {
  let ekMaliyet = 0;
  let satisKesinti = 0;
  let satilabilirDusus = 0; // yüzde

  for (const k of MUTEAHHIT_KALEMLERI) {
    const a = ayarlar[k.id];
    if (!a || !a.aktif) continue;
    if (k.id === 'tasinma') {
      const ay = a.deger?.ay ?? k.varsayilan.ay;
      const aylikKira = a.deger?.aylikKira ?? k.varsayilan.aylikKira;
      ekMaliyet += Math.round(ay * (baz.daireSayisi || 0) * aylikKira * 100);
    } else if (k.id === 'ortakAlan') {
      satilabilirDusus += a.deger ?? k.varsayilan;
    } else if (k.id === 'satisKom' || k.id === 'reklam' || k.id === 'pazarlik') {
      satisKesinti += Math.round((baz.satisGeliriKurus || 0) * (a.deger ?? k.varsayilan) / 100);
    } else if (k.id === 'garanti' || k.id === 'enflasyon' || k.id === 'bld') {
      ekMaliyet += Math.round((baz.toplamMaliyetKurus || 0) * (a.deger ?? k.varsayilan) / 100);
    } else if (k.tipi === 'sabit') {
      ekMaliyet += a.deger ?? k.varsayilan;
    }
  }

  return { ekMaliyetKurus: ekMaliyet, satisKesintiKurus: satisKesinti, satilabilirDusus };
}

export default function MuteahhitGozu({ ayarlar, setAyarlar, baz }) {
  const [acik, setAcik] = useState(false);

  const set = (id, key, val) => {
    setAyarlar({
      ...ayarlar,
      [id]: { ...(ayarlar[id] || {}), [key]: val },
    });
  };

  const uygulaOnAyar = (tip) => {
    const yeni = {};
    const k = ON_AYAR[tip];
    for (const id in k) yeni[id] = { aktif: true };
    setAyarlar(yeni);
  };

  const hesap = muteahhitHesapla(ayarlar, baz);

  return (
    <div className="card" style={{ borderColor: acik ? 'var(--gold)' : 'var(--border)' }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setAcik(!acik)}
      >
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 600, color: 'var(--gold)' }}>
            🦹 Müteahhit Gözü — Gizli Kalemler
          </div>
          <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 2 }}>
            Ek yük: <b style={{ color: 'var(--red)' }}>{formatKisa(hesap.ekMaliyetKurus + hesap.satisKesintiKurus)}</b>
            {' · '}Satılabilir −%{hesap.satilabilirDusus}
          </div>
        </div>
        <div style={{ fontSize: '1.1rem' }}>{acik ? '▲' : '▼'}</div>
      </div>

      {acik && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button className="btn btn-sm btn-ghost" onClick={() => uygulaOnAyar('naif')}>😇 Naif</button>
            <button className="btn btn-sm btn-ghost" onClick={() => uygulaOnAyar('standart')}>⚖️ Standart</button>
            <button className="btn btn-sm btn-ghost" onClick={() => uygulaOnAyar('seytani')}>😈 Şeytani</button>
          </div>

          {MUTEAHHIT_KALEMLERI.map(k => {
            const a = ayarlar[k.id] || {};
            return (
              <div key={k.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.04)',
              }}>
                <input type="checkbox" checked={!!a.aktif} onChange={e => set(k.id, 'aktif', e.target.checked)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '.8rem', fontWeight: 600 }}>{k.ad}</div>
                  <div style={{ fontSize: '.66rem', color: 'var(--muted)' }}>{k.aciklama}</div>
                </div>
                {k.tipi === 'yuzde' && (
                  <input
                    type="number" step="0.5"
                    value={a.deger ?? k.varsayilan}
                    onChange={e => set(k.id, 'deger', parseFloat(e.target.value) || 0)}
                    className="input"
                    style={{ width: 70, padding: '4px 6px', fontSize: '.75rem' }}
                    disabled={!a.aktif}
                  />
                )}
                {k.tipi === 'sabit' && (
                  <input
                    type="number"
                    value={(a.deger ?? k.varsayilan) / 100}
                    onChange={e => set(k.id, 'deger', Math.round((parseFloat(e.target.value) || 0) * 100))}
                    className="input"
                    style={{ width: 110, padding: '4px 6px', fontSize: '.75rem' }}
                    disabled={!a.aktif}
                  />
                )}
                {k.tipi === 'hesaplama' && a.aktif && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input type="number" placeholder="Ay"
                      value={a.deger?.ay ?? k.varsayilan.ay}
                      onChange={e => set(k.id, 'deger', { ...(a.deger || k.varsayilan), ay: parseInt(e.target.value) || 0 })}
                      className="input" style={{ width: 50, padding: '4px 6px', fontSize: '.75rem' }} />
                    <input type="number" placeholder="Kira"
                      value={a.deger?.aylikKira ?? k.varsayilan.aylikKira}
                      onChange={e => set(k.id, 'deger', { ...(a.deger || k.varsayilan), aylikKira: parseInt(e.target.value) || 0 })}
                      className="input" style={{ width: 80, padding: '4px 6px', fontSize: '.75rem' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
