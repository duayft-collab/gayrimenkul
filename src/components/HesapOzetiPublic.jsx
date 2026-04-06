/**
 * @file components/HesapOzetiPublic.jsx
 * @description Kiracı hesap özeti — public (paylaşım token ile) salt okunur
 */
import { useMemo } from 'react';
import { odemeTlKurus, kiraciBakiyeHesapla } from '../core/odemelerDb';

const fmtTL = (kurus) => '₺' + new Intl.NumberFormat('tr-TR').format(Math.round((kurus || 0) / 100));

export default function HesapOzetiPublic({ kiraci, kiralar, odemeler, workspaceId }) {
  const bakiye = useMemo(() => kiraciBakiyeHesapla(odemeler || []), [odemeler]);

  // Tablo satırlarını hazırla
  let kum = 0;
  const siraliOdemeler = [...(odemeler || [])].sort((a, b) => {
    const va = a.vadeTarihi?.toDate ? a.vadeTarihi.toDate() : new Date(a.vadeTarihi || 0);
    const vb = b.vadeTarihi?.toDate ? b.vadeTarihi.toDate() : new Date(b.vadeTarihi || 0);
    return va - vb;
  });
  const satirlar = siraliOdemeler.map(o => {
    const tl = odemeTlKurus(o);
    const borc = (o.durum === 'bekliyor' || o.durum === 'gecikmis') ? tl : 0;
    const alacak = o.durum === 'odendi' ? tl : 0;
    kum += borc - alacak;
    const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi || 0);
    return {
      id: o.id,
      tarih: isNaN(v) ? '—' : v.toLocaleDateString('tr-TR'),
      aciklama: `${o.tip}${o.aciklama ? ' — ' + o.aciklama : ''}`,
      durum: o.durum,
      borcKurus: borc,
      alacakKurus: alacak,
      bakiyeKurus: kum,
    };
  });

  const yazdir = () => window.print();

  return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', color: '#E8ECF4', padding: 20 }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,rgba(27,79,138,.2),rgba(201,168,76,.1))',
          border: '1px solid rgba(201,168,76,.3)', borderRadius: 12, padding: 20, marginBottom: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: '.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
              🔒 Salt Okunur · Hesap Özeti
            </div>
            <div style={{ fontFamily: 'Playfair Display,Georgia,serif', fontSize: '1.8rem', color: '#C9A84C', marginTop: 4 }}>
              {kiraci?.adSoyad || 'Kiracı'}
            </div>
            {kiraci?.firmaAdi && <div style={{ fontSize: '.85rem', color: '#888' }}>{kiraci.firmaAdi}</div>}
          </div>
          <button
            onClick={yazdir}
            className="no-print"
            style={{
              background: '#C9A84C', color: '#0B0B0F', border: 0,
              borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer',
            }}>📄 PDF İndir</button>
        </div>

        {/* İki kolon: özet + bilgi */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* KPI'lar */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              <div style={{ background: '#161a24', border: '1px solid #2a2f3e', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: '.65rem', color: '#888', textTransform: 'uppercase' }}>Toplam Tahsil</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#22C55E', marginTop: 4 }}>
                  {fmtTL(bakiye.toplamOdenenKurus)}
                </div>
              </div>
              <div style={{ background: '#161a24', border: '1px solid #2a2f3e', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: '.65rem', color: '#888', textTransform: 'uppercase' }}>Bekleyen Borç</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F59E0B', marginTop: 4 }}>
                  {fmtTL(bakiye.toplamBeklenenKurus)}
                </div>
              </div>
              <div style={{ background: '#161a24', border: '1px solid #2a2f3e', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: '.65rem', color: '#888', textTransform: 'uppercase' }}>Gecikmiş</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#EF4444', marginTop: 4 }}>
                  {fmtTL(bakiye.gecikmisKurus)}
                </div>
              </div>
            </div>
          </div>
          {/* Kiracı kartı */}
          <div style={{ background: '#161a24', border: '1px solid #2a2f3e', borderRadius: 10, padding: 14 }}>
            <div style={{ fontFamily: 'Playfair Display,Georgia,serif', fontSize: '.95rem', color: '#C9A84C', marginBottom: 8 }}>👤 Bilgi</div>
            <div style={{ fontSize: '.78rem', lineHeight: 1.8 }}>
              {kiraci?.telefon && <div><span style={{ color: '#888' }}>Tel:</span> {kiraci.telefon}</div>}
              {kiraci?.email && <div><span style={{ color: '#888' }}>Mail:</span> {kiraci.email}</div>}
              <div><span style={{ color: '#888' }}>Sözleşme:</span> {(kiralar || []).length}</div>
            </div>
          </div>
        </div>

        {/* Kira sözleşmeleri özet */}
        {(kiralar || []).length > 0 && (
          <div style={{ background: '#161a24', border: '1px solid #2a2f3e', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontFamily: 'Playfair Display,Georgia,serif', fontSize: '1rem', color: '#C9A84C', marginBottom: 10 }}>
              🔑 Kira Sözleşmeleri
            </div>
            {kiralar.map(k => {
              const b = k.baslangicTarihi?.toDate ? k.baslangicTarihi.toDate() : (k.baslangicTarihi ? new Date(k.baslangicTarihi) : null);
              const bi = k.bitisTarihi?.toDate ? k.bitisTarihi.toDate() : (k.bitisTarihi ? new Date(k.bitisTarihi) : null);
              return (
                <div key={k.id} style={{ padding: 10, background: '#0A0F1E', borderRadius: 6, marginBottom: 6, fontSize: '.8rem' }}>
                  <div style={{ color: '#C9A84C', fontWeight: 600 }}>
                    {k.paraBirim} {((k.aylikKiraKurus || 0) / 100).toLocaleString('tr-TR')}/ay
                    <span style={{ marginLeft: 8, fontSize: '.7rem', color: '#888' }}>({k.durum})</span>
                  </div>
                  <div style={{ fontSize: '.7rem', color: '#888', marginTop: 2 }}>
                    {b ? b.toLocaleDateString('tr-TR') : '—'}
                    {bi && ' → ' + bi.toLocaleDateString('tr-TR')}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tablo */}
        <div style={{ background: '#161a24', border: '1px solid #2a2f3e', borderRadius: 10, padding: 16 }}>
          <div style={{ fontFamily: 'Playfair Display,Georgia,serif', fontSize: '1rem', color: '#C9A84C', marginBottom: 10 }}>
            📑 Hesap Hareketleri
          </div>
          {satirlar.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#666' }}>Henüz ödeme kaydı yok</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '.78rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2f3e' }}>
                    <th style={{ textAlign: 'left', padding: 8, color: '#888' }}>Tarih</th>
                    <th style={{ textAlign: 'left', padding: 8, color: '#888' }}>Açıklama</th>
                    <th style={{ textAlign: 'right', padding: 8, color: '#888' }}>Borç</th>
                    <th style={{ textAlign: 'right', padding: 8, color: '#888' }}>Alacak</th>
                    <th style={{ textAlign: 'right', padding: 8, color: '#888' }}>Bakiye</th>
                  </tr>
                </thead>
                <tbody>
                  {satirlar.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                      <td style={{ padding: 8 }}>{s.tarih}</td>
                      <td style={{ padding: 8 }}>{s.aciklama}</td>
                      <td style={{ padding: 8, textAlign: 'right', color: '#EF4444' }}>
                        {s.borcKurus ? fmtTL(s.borcKurus) : '—'}
                      </td>
                      <td style={{ padding: 8, textAlign: 'right', color: '#22C55E' }}>
                        {s.alacakKurus ? fmtTL(s.alacakKurus) : '—'}
                      </td>
                      <td style={{ padding: 8, textAlign: 'right', fontWeight: 700 }}>
                        {fmtTL(s.bakiyeKurus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', fontSize: '.7rem', color: '#555', marginTop: 30 }}>
          Duay Global Trade — AI Property OS · {new Date().toLocaleDateString('tr-TR')}
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
