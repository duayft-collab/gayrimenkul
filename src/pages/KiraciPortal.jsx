/**
 * @file pages/KiraciPortal.jsx
 * @description Kiracı self-servis portal — public, mobile-first, token bazlı
 */
import { useEffect, useRef, useState } from 'react';
import { kportalKiraciOzet, kportalDekontYukle, kportalOdemeBildir } from '../core/kportalDb';

const fmtTL = (kurus) => '₺' + new Intl.NumberFormat('tr-TR').format(Math.round((kurus || 0) / 100));
const fmtTarih = (ts) => {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return isNaN(d) ? '—' : d.toLocaleDateString('tr-TR');
};

const DURUM_STIL = {
  onaylandi:  { ico: '✓', renk: '#22C55E', bg: 'rgba(34,197,94,.12)', ad: 'Onaylı' },
  beklemede:  { ico: '⏳', renk: '#F59E0B', bg: 'rgba(245,158,11,.12)', ad: 'Beklemede' },
  reddedildi: { ico: '✗', renk: '#EF4444', bg: 'rgba(239,68,68,.12)', ad: 'Reddedildi' },
  bekliyor:   { ico: '⏳', renk: '#F59E0B', bg: 'rgba(245,158,11,.12)', ad: 'Beklemede' },
  gecikmis:   { ico: '⚠', renk: '#EF4444', bg: 'rgba(239,68,68,.12)', ad: 'Gecikmiş' },
};

export default function KiraciPortal({ token }) {
  const [durum, setDurum] = useState('yukleniyor');
  const [hata, setHata] = useState(null);
  const [ozet, setOzet] = useState(null);
  const [bildirimModal, setBildirimModal] = useState(false);
  const [basariModal, setBasariModal] = useState(null);
  const [kopyaladi, setKopyaladi] = useState(false);

  const decodedToken = token ? decodeURIComponent(token) : '';

  const yukle = async () => {
    try {
      setDurum('yukleniyor');
      const o = await kportalKiraciOzet(decodedToken);
      setOzet(o);
      setDurum('ok');
    } catch (e) {
      setHata(e.message);
      setDurum('hata');
    }
  };

  useEffect(() => { yukle(); }, [decodedToken]);

  const ibanKopyala = (iban) => {
    navigator.clipboard.writeText(iban).then(() => {
      setKopyaladi(true);
      setTimeout(() => setKopyaladi(false), 2000);
    });
  };

  /* ═══ RENDER ═══ */

  const BG = {
    minHeight: '100vh',
    background: 'linear-gradient(180deg,#0B0B0F 0%,#151520 100%)',
    color: '#E8ECF4',
    fontFamily: 'system-ui,-apple-system,Segoe UI,sans-serif',
  };

  if (durum === 'yukleniyor') {
    return (
      <div style={{ ...BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, margin: '0 auto 14px',
            border: '3px solid rgba(201,168,76,.2)', borderTopColor: '#C9A84C',
            borderRadius: '50%', animation: 'spin .8s linear infinite',
          }} />
          <div style={{ color: '#C9A84C' }}>Yükleniyor...</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (durum === 'hata') {
    return (
      <div style={{ ...BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: '3rem' }}>🚫</div>
          <div style={{ fontSize: '1.3rem', color: '#EF4444', margin: '12px 0' }}>Erişim Engellendi</div>
          <div style={{ color: '#888', fontSize: '.88rem', lineHeight: 1.6 }}>{hata}</div>
          <div style={{ fontSize: '.72rem', color: '#555', marginTop: 30 }}>
            Yeni bir link için mülk sahibinizle iletişime geçin.
          </div>
        </div>
      </div>
    );
  }

  const borcVar = ozet.bakiyeKurus > 0 || ozet.gecikmisKurus > 0;
  const k = ozet.kiraci;
  const mulk = ozet.mulk;

  return (
    <div style={BG}>
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '16px 14px 100px' }}>
        {/* Üst bar */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            fontFamily: 'Playfair Display,Georgia,serif',
            fontSize: '1.2rem', color: '#C9A84C', fontWeight: 700,
          }}>🏛️ Gayrimenkul Pro</div>
          {mulk && (
            <div style={{ fontSize: '.72rem', color: '#888', marginTop: 4 }}>
              {mulk.ad} · {mulk.il}/{mulk.ilce}
            </div>
          )}
        </div>

        {/* Karşılama */}
        <div style={{
          fontSize: '1.3rem', fontWeight: 600, marginBottom: 8,
          fontFamily: 'Playfair Display,Georgia,serif',
        }}>
          Merhaba {k.adSoyad?.split(' ')[0] || 'değerli kiracı'} 👋
        </div>
        <div style={{ fontSize: '.78rem', color: '#888', marginBottom: 20 }}>
          Kira ödemelerinizi buradan bildirebilirsiniz
        </div>

        {/* Bakiye kartı */}
        <div style={{
          background: borcVar
            ? 'linear-gradient(135deg,rgba(239,68,68,.15),rgba(239,68,68,.05))'
            : 'linear-gradient(135deg,rgba(34,197,94,.15),rgba(34,197,94,.05))',
          border: `1px solid ${borcVar ? '#EF4444' : '#22C55E'}`,
          borderRadius: 16, padding: 20, marginBottom: 14,
        }}>
          <div style={{ fontSize: '.72rem', color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
            {borcVar ? 'Borç Bakiyeniz' : 'Bakiyeniz'}
          </div>
          <div style={{
            fontFamily: 'Playfair Display,Georgia,serif',
            fontSize: '2.2rem', fontWeight: 700,
            color: borcVar ? '#EF4444' : '#22C55E',
            marginTop: 6,
          }}>
            {fmtTL(ozet.bakiyeKurus)}
          </div>
          <div style={{ fontSize: '.72rem', color: '#888', marginTop: 4 }}>
            {borcVar
              ? `${fmtTL(ozet.gecikmisKurus)} gecikmiş`
              : `Toplam ödenen: ${fmtTL(ozet.toplamOdenenKurus)}`}
          </div>
        </div>

        {/* Bu ay kira kartı */}
        <div style={{
          background: '#161a24', border: '1px solid #2a2f3e',
          borderRadius: 14, padding: 18, marginBottom: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: '.68rem', color: '#888', textTransform: 'uppercase' }}>Bu Ay Kira</div>
              <div style={{
                fontSize: '1.6rem', fontWeight: 700, color: '#C9A84C', marginTop: 4,
              }}>
                {fmtTL(ozet.buAyTutarKurus)}
              </div>
              {ozet.buAyVade && (
                <div style={{ fontSize: '.72rem', color: '#888', marginTop: 3 }}>
                  📅 Vade: {fmtTarih(ozet.buAyVade)}
                </div>
              )}
            </div>
            <div style={{
              padding: '4px 10px', borderRadius: 99,
              background: DURUM_STIL[ozet.buAyDurum]?.bg || 'rgba(136,136,136,.12)',
              color: DURUM_STIL[ozet.buAyDurum]?.renk || '#888',
              fontSize: '.65rem', fontWeight: 700,
            }}>
              {DURUM_STIL[ozet.buAyDurum]?.ad || 'Durum yok'}
            </div>
          </div>

          <button
            onClick={() => setBildirimModal(true)}
            style={{
              width: '100%', padding: '14px 18px',
              background: 'linear-gradient(135deg,#E8C96A,#C9A84C)',
              color: '#0B0B0F', border: 0, borderRadius: 10,
              fontSize: '.95rem', fontWeight: 700, cursor: 'pointer',
              minHeight: 48,
            }}
          >
            📤 ÖDEME BİLDİR
          </button>

          {ozet.ibanBilgi && (
            <button
              onClick={() => ibanKopyala(ozet.ibanBilgi)}
              style={{
                width: '100%', marginTop: 8, padding: '10px',
                background: '#0A0F1E', color: '#C9A84C',
                border: '1px solid #2a2f3e', borderRadius: 8,
                fontSize: '.75rem', fontFamily: 'monospace', cursor: 'pointer',
              }}
            >
              {kopyaladi ? '✓ IBAN Kopyalandı' : `📋 ${ozet.ibanBilgi}`}
            </button>
          )}
        </div>

        {/* Geçmiş ödemeler */}
        <div style={{
          background: '#161a24', border: '1px solid #2a2f3e',
          borderRadius: 14, padding: 16, marginBottom: 14,
        }}>
          <div style={{
            fontFamily: 'Playfair Display,Georgia,serif',
            fontSize: '.95rem', color: '#C9A84C', fontWeight: 600, marginBottom: 10,
          }}>
            📋 Geçmiş Ödemeler
          </div>
          {ozet.odemeler.length === 0 ? (
            <div style={{ color: '#666', fontSize: '.78rem', textAlign: 'center', padding: 20 }}>
              Henüz ödeme kaydı yok
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ozet.odemeler.map(o => {
                const stil = DURUM_STIL[o.durum] || DURUM_STIL.onaylandi;
                return (
                  <div key={o.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', background: '#0A0F1E', borderRadius: 8,
                    borderLeft: `3px solid ${stil.renk}`,
                  }}>
                    <div>
                      <div style={{ fontSize: '.78rem', color: '#ccc' }}>
                        {fmtTarih(o.vadeTarihi)}
                      </div>
                      <div style={{ fontSize: '.66rem', color: '#888' }}>
                        {o.tip || 'kira'}{o.aciklama ? ' · ' + o.aciklama.slice(0, 24) : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '.85rem', fontWeight: 600, color: '#C9A84C' }}>
                        {fmtTL(o.tutarKurus)}
                      </div>
                      <div style={{ fontSize: '.65rem', color: stil.renk, fontWeight: 700 }}>
                        {stil.ico} {stil.ad}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cari Hesap */}
        <div style={{
          background: '#161a24', border: '1px solid #2a2f3e',
          borderRadius: 14, padding: 16, marginBottom: 14,
        }}>
          <div style={{
            fontFamily: 'Playfair Display,Georgia,serif',
            fontSize: '.95rem', color: '#C9A84C', fontWeight: 600, marginBottom: 10,
          }}>
            💰 Cari Hesap
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '.82rem' }}>
            <span style={{ color: '#888' }}>Toplam Tahakkuk:</span>
            <b>{fmtTL(ozet.toplamBeklenenKurus + ozet.toplamOdenenKurus)}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '.82rem' }}>
            <span style={{ color: '#888' }}>Toplam Ödenen:</span>
            <b style={{ color: '#22C55E' }}>{fmtTL(ozet.toplamOdenenKurus)}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '.82rem', borderTop: '1px solid #2a2f3e', marginTop: 6 }}>
            <span style={{ color: '#888' }}>Bakiye:</span>
            <b style={{ color: borcVar ? '#EF4444' : '#22C55E' }}>{fmtTL(ozet.bakiyeKurus)}</b>
          </div>
        </div>

        {/* PDF indir */}
        <button
          onClick={() => window.print()}
          style={{
            width: '100%', padding: 12, marginBottom: 14,
            background: 'transparent', color: '#C9A84C',
            border: '1px solid #C9A84C', borderRadius: 10,
            fontSize: '.85rem', cursor: 'pointer', minHeight: 44,
          }}
        >📄 Hesap Özetini İndir (PDF)</button>

        {/* İletişim */}
        {(k.telefon || mulk?.telefon) && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <a href={`tel:${k.telefon || mulk?.telefon}`} style={{
              flex: 1, padding: 12, textAlign: 'center',
              background: '#161a24', color: '#22C55E',
              border: '1px solid #2a2f3e', borderRadius: 10,
              textDecoration: 'none', fontSize: '.82rem',
            }}>📞 Ara</a>
            <a href={`https://wa.me/${(k.telefon || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{
              flex: 1, padding: 12, textAlign: 'center',
              background: '#161a24', color: '#25D366',
              border: '1px solid #2a2f3e', borderRadius: 10,
              textDecoration: 'none', fontSize: '.82rem',
            }}>💬 WhatsApp</a>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', color: '#555', fontSize: '.65rem', marginTop: 24 }}>
          🔒 Güvenli Bağlantı · SSL Korumalı<br />
          Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}<br />
          <span style={{ color: '#333' }}>Duay Global Trade — AI Property OS</span>
        </div>
      </div>

      {/* Bildirim modal */}
      {bildirimModal && (
        <OdemeBildirModal
          token={decodedToken}
          ozet={ozet}
          onClose={() => setBildirimModal(false)}
          onBasarili={(r) => {
            setBildirimModal(false);
            setBasariModal(r);
            yukle(); // listeyi yenile
          }}
        />
      )}

      {/* Başarı ekranı */}
      {basariModal && (
        <BasariEkrani
          referans={basariModal.referans}
          onClose={() => setBasariModal(null)}
        />
      )}
    </div>
  );
}

/* ═══ Ödeme bildir modalı (bottom sheet) ═══ */

function OdemeBildirModal({ token, ozet, onClose, onBasarili }) {
  const [tutar, setTutar] = useState(((ozet.buAyTutarKurus || 0) / 100).toString());
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10));
  const [donem, setDonem] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [aciklama, setAciklama] = useState('');
  const [dosya, setDosya] = useState(null);
  const [dekontUrl, setDekontUrl] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState(null);
  const fileRef = useRef(null);

  const dosyaSec = async (f) => {
    if (!f) return;
    setHata(null);
    setDosya(f);
    setYukleniyor(true);
    try {
      const r = await kportalDekontYukle(token, f);
      setDekontUrl(r.url);
    } catch (e) {
      setHata(e.message);
      setDosya(null);
    } finally {
      setYukleniyor(false);
    }
  };

  const gonder = async () => {
    setHata(null);
    const tutarKurus = Math.round(parseFloat(tutar) * 100);
    if (!tutarKurus || tutarKurus <= 0) { setHata('Geçerli tutar girin'); return; }
    if (!dekontUrl) { setHata('Dekont yüklemeniz gerekli'); return; }

    setGonderiliyor(true);
    try {
      const r = await kportalOdemeBildir(token, {
        donem, tutarKurus, tarih, dekontUrl, aciklama,
      });
      onBasarili(r);
    } catch (e) {
      setHata(e.message);
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.7)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420, margin: '0 auto',
          background: '#161a24',
          borderTop: '2px solid #C9A84C',
          borderRadius: '20px 20px 0 0',
          padding: '20px 18px 30px',
          maxHeight: '92vh', overflowY: 'auto',
          animation: 'slideUp .3s ease',
        }}
      >
        <div style={{
          width: 40, height: 4, background: '#2a2f3e',
          borderRadius: 2, margin: '0 auto 16px',
        }} />
        <div style={{
          fontFamily: 'Playfair Display,Georgia,serif',
          fontSize: '1.2rem', color: '#C9A84C', fontWeight: 700, marginBottom: 14,
        }}>
          📤 Ödeme Bildir
        </div>

        <Alan label="Hangi Dönem">
          <input
            type="month"
            value={donem}
            onChange={e => setDonem(e.target.value)}
            style={giris}
          />
        </Alan>

        <Alan label="Tutar (₺)">
          <input
            type="number"
            step="0.01"
            value={tutar}
            onChange={e => setTutar(e.target.value)}
            style={{ ...giris, fontSize: '1.2rem', fontWeight: 600 }}
          />
        </Alan>

        <Alan label="Ödeme Tarihi">
          <input
            type="date"
            value={tarih}
            max={new Date().toISOString().slice(0, 10)}
            onChange={e => setTarih(e.target.value)}
            style={giris}
          />
        </Alan>

        <Alan label="Dekont *">
          <div
            onClick={() => !yukleniyor && fileRef.current?.click()}
            style={{
              border: `2px dashed ${dekontUrl ? '#22C55E' : '#2a2f3e'}`,
              borderRadius: 10, padding: 16, textAlign: 'center',
              cursor: yukleniyor ? 'default' : 'pointer',
              background: dekontUrl ? 'rgba(34,197,94,.05)' : '#0A0F1E',
            }}
          >
            {yukleniyor ? (
              <div style={{ color: '#888', fontSize: '.78rem' }}>⏳ Yükleniyor...</div>
            ) : dekontUrl ? (
              <>
                <div style={{ fontSize: '1.6rem' }}>✓</div>
                <div style={{ color: '#22C55E', fontSize: '.78rem', marginTop: 4 }}>
                  {dosya?.name || 'Dekont yüklendi'}
                </div>
                <div style={{ color: '#666', fontSize: '.65rem', marginTop: 3 }}>
                  Tekrar seçmek için tıklayın
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '1.8rem' }}>📎</div>
                <div style={{ color: '#ccc', fontSize: '.82rem', marginTop: 4 }}>
                  Dekont seç veya fotoğraf çek
                </div>
                <div style={{ color: '#666', fontSize: '.65rem', marginTop: 3 }}>
                  JPG/PNG/PDF · Max 5 MB
                </div>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            capture="environment"
            style={{ display: 'none' }}
            onChange={e => dosyaSec(e.target.files?.[0])}
          />
        </Alan>

        <Alan label="Açıklama (opsiyonel)">
          <textarea
            rows={2}
            value={aciklama}
            onChange={e => setAciklama(e.target.value)}
            placeholder="Örn: Havale/EFT referansı..."
            style={{ ...giris, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </Alan>

        {hata && (
          <div style={{
            padding: 10, marginBottom: 10,
            background: 'rgba(239,68,68,.08)', borderLeft: '3px solid #EF4444',
            borderRadius: 6, fontSize: '.78rem', color: '#EF4444',
          }}>{hata}</div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: 14, background: 'transparent',
              color: '#888', border: '1px solid #2a2f3e', borderRadius: 10,
              fontSize: '.88rem', cursor: 'pointer', minHeight: 48,
            }}
          >İptal</button>
          <button
            onClick={gonder}
            disabled={gonderiliyor || yukleniyor || !dekontUrl}
            style={{
              flex: 2, padding: 14,
              background: 'linear-gradient(135deg,#E8C96A,#C9A84C)',
              color: '#0B0B0F', border: 0, borderRadius: 10,
              fontSize: '.88rem', fontWeight: 700, cursor: 'pointer',
              minHeight: 48,
              opacity: gonderiliyor || yukleniyor || !dekontUrl ? 0.6 : 1,
            }}
          >{gonderiliyor ? 'Gönderiliyor...' : '✓ ÖDEMEYİ BİLDİR'}</button>
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const giris = {
  width: '100%', background: '#0A0F1E', color: '#fff',
  border: '1px solid #2a2f3e', borderRadius: 8,
  padding: '12px 14px', fontSize: '.88rem',
  boxSizing: 'border-box',
};

function Alan({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{
        fontSize: '.7rem', color: '#888', display: 'block',
        marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px',
      }}>{label}</label>
      {children}
    </div>
  );
}

/* ═══ Başarı ekranı ═══ */

function BasariEkrani({ referans, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(11,11,15,.96)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <div style={{
          width: 90, height: 90, margin: '0 auto 20px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg,#22C55E,#16A34A)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '3rem', color: '#fff',
          animation: 'pop .4s ease',
          boxShadow: '0 10px 40px rgba(34,197,94,.3)',
        }}>✓</div>
        <div style={{
          fontFamily: 'Playfair Display,Georgia,serif',
          fontSize: '1.6rem', color: '#fff', marginBottom: 8,
        }}>Ödemeniz Alındı!</div>
        <div style={{ color: '#888', fontSize: '.88rem', marginBottom: 20 }}>
          Ödemeniz onay için mülk sahibine iletildi. Kısa süre içinde incelenecektir.
        </div>
        <div style={{
          background: '#161a24', border: '1px solid #C9A84C',
          borderRadius: 10, padding: 14, marginBottom: 20,
        }}>
          <div style={{ fontSize: '.65rem', color: '#888', textTransform: 'uppercase' }}>Referans Numarası</div>
          <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: '#C9A84C', marginTop: 4, fontWeight: 700 }}>
            {referans}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: 14,
            background: 'linear-gradient(135deg,#E8C96A,#C9A84C)',
            color: '#0B0B0F', border: 0, borderRadius: 10,
            fontSize: '.95rem', fontWeight: 700, cursor: 'pointer', minHeight: 48,
          }}
        >Ana Sayfaya Dön</button>
      </div>
      <style>{`
        @keyframes pop {
          0% { transform: scale(0); }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
