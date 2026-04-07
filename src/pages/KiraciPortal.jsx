/**
 * @file pages/KiraciPortal.jsx
 * @description Kiracı self-servis portal — public, mobile-first, token bazlı
 */
import { useEffect, useRef, useState } from 'react';
import { kportalKiraciOzet, kportalDekontYukle, kportalOdemeBildir } from '../core/kportalDb';
import '../styles/kportal.css';

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
  const kiraciAdi = (k.adSoyad || '').split(/\s+/)[0] || 'Sayın Kiracı';
  const mulkAdi = mulk?.ad || (mulk ? `${mulk.il || ''} ${mulk.ilce || ''}`.trim() : 'Mülk');
  const bekleyenler = (ozet.odemeler || []).filter(o => o.durum !== 'odendi' && o.durum !== 'onaylandi');
  const odemeSayisi = bekleyenler.length;
  const basariMesaji = !!basariModal;

  return (
    <div className="kp">
      <div className={`kp-aurora ${basariMesaji ? 'basari' : ''}`} />
      <div className={`kp-orb kp-orb-1 ${basariMesaji ? 'basari' : ''}`} />
      <div className="kp-orb kp-orb-2" />
      <div className="kp-grain" />

      <div className="kp-shell">
        {/* Header */}
        <div className="kp-head">
          <div className="kp-marka">
            <div className="kp-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01"/>
              </svg>
            </div>
            <div className="kp-marka-ad">Emlak<em>Pro</em></div>
          </div>
          <div className="kp-secure"><span className="dot" />SSL</div>
        </div>

        {!basariMesaji && (
          <>
            {/* Hero */}
            <div className="kp-hero">
              <div className="kp-greeting">Hoş geldiniz</div>
              <h1 className="kp-baslik">{kiraciAdi},<br />ödemeniz <em>hazır</em></h1>
              <p className="kp-altyazi"><b>{mulkAdi}</b> için bekleyen {odemeSayisi} ödemeniz var. Dekontunuzu yükleyin, dakikalar içinde onaylansın.</p>
            </div>

            {hata && (
              <div className="kp-mesaj hata">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                <span>{hata}</span>
              </div>
            )}

            {/* Total tutar */}
            {ozet.bakiyeKurus > 0 && (
              <div className="kp-total">
                <div className="kp-total-row">
                  <div>
                    <div className="kp-total-label">{borcVar ? 'Borç Bakiyeniz' : 'Bakiyeniz'}</div>
                    <div className="kp-total-amount">
                      <span className="kp-total-currency">₺</span>{Math.round(ozet.bakiyeKurus / 100).toLocaleString('tr-TR')}
                    </div>
                  </div>
                  <div className="kp-total-meta">
                    <div className="kp-total-count">{odemeSayisi} ÖDEME</div>
                    {ozet.gecikmisKurus > 0 && (
                      <div className="kp-total-due">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                        </svg>
                        Gecikmiş
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Ödeme listesi */}
            {bekleyenler.length > 0 && (
              <div className="kp-list">
                {bekleyenler.slice(0, 6).map(o => {
                  const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi || 0);
                  const tarihStr = isNaN(v.getTime()) ? '—' : v.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
                  const gecikti = o.durum === 'gecikmis' || (v.getTime() < Date.now() - 86400000);
                  return (
                    <div className={`kp-item ${gecikti ? 'gecikti' : ''}`} key={o.id}>
                      <div className="kp-item-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21V11h6v10"/>
                        </svg>
                      </div>
                      <div className="kp-item-mid">
                        <div className="kp-item-title">{o.tip === 'kira' ? 'Kira' : (o.tip || 'Ödeme')}{o.aciklama ? ' · ' + o.aciklama.slice(0, 24) : ''}</div>
                        <div className="kp-item-sub">Vade · {tarihStr}</div>
                      </div>
                      <div className="kp-item-amount">₺{Math.round((o.tutarKurus || 0) / 100).toLocaleString('tr-TR')}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upload CTA — modal'ı açar */}
            <div className="kp-upload" onClick={() => setBildirimModal(true)}>
              <div className="kp-upload-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
              </div>
              <div className="kp-upload-baslik">Dekontu Yükle</div>
              <div className="kp-upload-altyazi">PDF · JPG · PNG · MAKS 5MB</div>
            </div>

            <button className="kp-btn" onClick={() => setBildirimModal(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
              Ödeme Bildir
            </button>
          </>
        )}

        {basariMesaji && (
          <div className="kp-success-card">
            <div className="kp-check">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h2 className="kp-success-title">Dekont <em>alındı</em></h2>
            <p className="kp-success-msg">Teşekkürler {kiraciAdi}. Ev sahibinizin onayı dakikalar içinde gelecek.</p>
            {basariModal?.referans && (
              <div className="kp-success-ref">{basariModal.referans}</div>
            )}
            <button
              className="kp-btn"
              style={{ marginTop: 18 }}
              onClick={() => setBasariModal(null)}
            >Ana Sayfa</button>
          </div>
        )}

        {/* Footer */}
        <div className="kp-foot">
          <div className="kp-foot-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            256-BIT ŞIFRELI
          </div>
          <div className="kp-foot-right">EmlakPro · v1</div>
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
