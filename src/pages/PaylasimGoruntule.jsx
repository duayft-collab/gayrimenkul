/**
 * @file pages/PaylasimGoruntule.jsx
 * @description Public paylaşım görüntüleme — token ile
 */
import { useEffect, useState } from 'react';
import { paylasimTokenCoz } from '../core/paylasim';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../core/firebase';
import HesapOzetiPublic from '../components/HesapOzetiPublic';

const fmtTL = (v) => '₺' + new Intl.NumberFormat('tr-TR').format(v || 0);

export default function PaylasimGoruntule({ token }) {
  const [pay, setPay] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState(null);
  const [notlar, setNotlar] = useState('');
  const [kaydetmeDurum, setKaydetmeDurum] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const p = await paylasimTokenCoz(token);
        if (!p) { setHata('Paylaşım bulunamadı veya iptal edildi.'); setYukleniyor(false); return; }
        if (p.suresiGecti) { setHata('Bu paylaşım linkinin süresi geçti.'); setYukleniyor(false); return; }
        setPay(p);
        setNotlar(p.mulk?.notlar || '');
      } catch (e) {
        setHata('Yükleme hatası: ' + e.message);
      } finally {
        setYukleniyor(false);
      }
    })();
  }, [token]);

  const notlariKaydet = async () => {
    if (pay.yetki !== 'edit') return;
    try {
      setKaydetmeDurum('kaydediliyor...');
      await updateDoc(doc(db, 'mulkler', pay.mulkId), { notlar });
      setKaydetmeDurum('✓ kaydedildi');
      setTimeout(() => setKaydetmeDurum(''), 2000);
    } catch (e) {
      setKaydetmeDurum('hata: ' + e.message);
    }
  };

  if (yukleniyor) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0F1E', color: '#E8ECF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem' }}>🏠</div>
          <div style={{ color: '#C9A84C', fontFamily: 'Playfair Display,Georgia,serif', fontSize: '1.2rem' }}>Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (hata) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0F1E', color: '#E8ECF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: '3rem', marginBottom: 10 }}>🚫</div>
          <div style={{ fontSize: '1.2rem', color: '#EF4444', marginBottom: 8 }}>Erişilemez</div>
          <div style={{ color: '#888' }}>{hata}</div>
        </div>
      </div>
    );
  }

  // Kiracı hesap özeti paylaşımı
  if (pay.tipKiraci) {
    if (!pay.kiraci) {
      return (
        <div style={{ minHeight: '100vh', background: '#0A0F1E', color: '#E8ECF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem' }}>🚫</div>
            <div style={{ color: '#EF4444' }}>Kiracı bilgisi bulunamadı</div>
          </div>
        </div>
      );
    }
    return (
      <HesapOzetiPublic
        kiraci={pay.kiraci}
        kiralar={pay.kiralar || []}
        odemeler={pay.odemeler || []}
        workspaceId={pay.workspaceId}
      />
    );
  }

  const m = pay.mulk || {};

  return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', color: '#E8ECF4', padding: 20 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,rgba(27,79,138,.2),rgba(201,168,76,.1))',
          border: '1px solid rgba(201,168,76,.3)', borderRadius: 12, padding: 20, marginBottom: 20,
        }}>
          <div style={{ fontSize: '.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
            🔗 Paylaşılan Mülk · {pay.yetki === 'edit' ? 'Düzenlenebilir' : 'Salt Okunur'}
          </div>
          <div style={{ fontFamily: 'Playfair Display,Georgia,serif', fontSize: '1.8rem', color: '#C9A84C', marginTop: 4 }}>
            {m.ad || 'İsimsiz Mülk'}
          </div>
          <div style={{ fontSize: '.85rem', color: '#888', marginTop: 2 }}>
            {m.tur || ''} · {m.il || '—'} / {m.ilce || '—'}
          </div>
        </div>

        {/* KPI'lar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            ['Alan', (m.alan || 0).toLocaleString('tr-TR') + ' m²'],
            ['Fiyat', fmtTL(m.fiyat)],
            ['Aylık Kira', fmtTL(m.aylikKira)],
            ['Durum', m.durum || '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ background: '#161a24', border: '1px solid #2a2f3e', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: '.65rem', color: '#888', textTransform: 'uppercase' }}>{k}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#C9A84C', marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Detaylar */}
        <div style={{ background: '#161a24', border: '1px solid #2a2f3e', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ fontFamily: 'Playfair Display,Georgia,serif', fontSize: '1rem', color: '#C9A84C', marginBottom: 10 }}>
            📍 Konum
          </div>
          <div style={{ fontSize: '.85rem', lineHeight: 1.7 }}>
            <div><span style={{ color: '#888' }}>Mahalle:</span> {m.mahalle || '—'}</div>
            <div><span style={{ color: '#888' }}>Ada/Parsel:</span> {m.ada || '—'} / {m.parsel || '—'}</div>
            <div><span style={{ color: '#888' }}>Açık Adres:</span> {m.fullAdres || '—'}</div>
          </div>
        </div>

        {/* Notlar */}
        <div style={{ background: '#161a24', border: '1px solid #2a2f3e', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontFamily: 'Playfair Display,Georgia,serif', fontSize: '1rem', color: '#C9A84C' }}>
              📝 Notlar
            </div>
            {pay.yetki === 'edit' && (
              <button
                onClick={notlariKaydet}
                style={{ background: '#C9A84C', color: '#0B0B0F', border: 0, borderRadius: 6, padding: '6px 14px', fontWeight: 700, cursor: 'pointer', fontSize: '.78rem' }}
              >Kaydet {kaydetmeDurum && `· ${kaydetmeDurum}`}</button>
            )}
          </div>
          {pay.yetki === 'edit' ? (
            <textarea
              value={notlar}
              onChange={e => setNotlar(e.target.value)}
              rows={5}
              style={{ width: '100%', background: '#0A0F1E', border: '1px solid #2a2f3e', borderRadius: 6, padding: 10, color: '#E8ECF4', fontSize: '.85rem' }}
            />
          ) : (
            <div style={{ fontSize: '.85rem', color: '#aaa', whiteSpace: 'pre-wrap' }}>
              {notlar || 'Not yok'}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', fontSize: '.7rem', color: '#555', marginTop: 30 }}>
          Duay Global Trade — AI Property OS · Bu link güvenli paylaşım protokolü ile oluşturulmuştur
        </div>
      </div>
    </div>
  );
}
