/**
 * @file pages/Guvenlik.jsx
 * @description Şifre değiştirme + 2FA TOTP + oturum yönetimi + giriş geçmişi
 */
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';
import { Topbar } from '../components/Layout';
import {
  ikiFaKurulumBaslat, ikiFaAktifEt, ikiFaKapat, kullaniciIkiFaProfili
} from '../core/twoFA';
import { logListele } from '../core/auditLog';
import { auth } from '../core/firebase';
import {
  EmailAuthProvider, reauthenticateWithCredential, updatePassword, signOut
} from 'firebase/auth';

export default function Guvenlik() {
  const { user, logout } = useAuthStore();
  const { toast } = useStore();
  const [profil, setProfil] = useState(null);
  const [kurulum, setKurulum] = useState(null);
  const [kod, setKod] = useState('');
  const [kurtarma, setKurtarma] = useState(null);
  const [girisGecmisi, setGirisGecmisi] = useState([]);
  const [sifre, setSifre] = useState({ mevcut: '', yeni: '', tekrar: '' });

  useEffect(() => {
    (async () => {
      if (!user?.uid) return;
      const p = await kullaniciIkiFaProfili(user.uid);
      setProfil(p);
      const logs = await logListele(user.workspaceId, { tip: 'login', limit: 30 });
      setGirisGecmisi(logs);
    })();
  }, [user?.uid]);

  const kurulumBaslat = async () => {
    try {
      const k = await ikiFaKurulumBaslat(user);
      setKurulum(k);
    } catch (e) {
      toast('error', e.message);
    }
  };

  const kurulumBitir = async () => {
    try {
      const kurtarmaKodlari = await ikiFaAktifEt(user, kurulum.secret, kod);
      setKurtarma(kurtarmaKodlari);
      setKurulum(null);
      setKod('');
      toast('success', '2FA aktif edildi — kurtarma kodlarını kaydet!');
      // Profili yenile
      const p = await kullaniciIkiFaProfili(user.uid);
      setProfil(p);
    } catch (e) {
      toast('error', e.message);
    }
  };

  const kapat = async () => {
    if (!confirm('2FA\'yı kapatmak istediğine emin misin? Bu güvenliğini azaltır.')) return;
    try {
      await ikiFaKapat(user);
      toast('success', '2FA kapatıldı');
      const p = await kullaniciIkiFaProfili(user.uid);
      setProfil(p);
    } catch (e) {
      toast('error', e.message);
    }
  };

  const kurtarmaIndir = () => {
    if (!kurtarma) return;
    const text = '# Gayrimenkul Pro - 2FA Kurtarma Kodları\n# Her kod tek kullanımlıktır. Güvenli yerde sakla.\n\n' + kurtarma.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `2fa_kurtarma_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sifreDegistir = async () => {
    if (sifre.yeni !== sifre.tekrar) { toast('error', 'Yeni şifreler eşleşmiyor'); return; }
    if (sifre.yeni.length < 8) { toast('error', 'En az 8 karakter'); return; }
    try {
      const u = auth.currentUser;
      const cred = EmailAuthProvider.credential(u.email, sifre.mevcut);
      await reauthenticateWithCredential(u, cred);
      await updatePassword(u, sifre.yeni);
      toast('success', 'Şifre güncellendi');
      setSifre({ mevcut: '', yeni: '', tekrar: '' });
    } catch (e) {
      toast('error', 'Şifre değiştirilemedi: ' + e.message);
    }
  };

  const tumOturumlar = async () => {
    if (!confirm('Tüm cihazlarda çıkış yapılacak. Devam?')) return;
    try {
      await signOut(auth);
      logout();
      toast('success', 'Tüm oturumlar sonlandırıldı');
    } catch (e) {
      toast('error', e.message);
    }
  };

  return (
    <div>
      <Topbar title="🔐 Güvenlik" />
      <div className="page" style={{ paddingBottom: 90 }}>
        {/* Şifre Değiştir */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 12 }}>
            🔑 Şifre Değiştir
          </div>
          <div className="fgrid3">
            <div className="fgroup">
              <label className="flbl">Mevcut Şifre</label>
              <input type="password" className="input" value={sifre.mevcut} onChange={e => setSifre({ ...sifre, mevcut: e.target.value })} />
            </div>
            <div className="fgroup">
              <label className="flbl">Yeni Şifre</label>
              <input type="password" className="input" value={sifre.yeni} onChange={e => setSifre({ ...sifre, yeni: e.target.value })} />
            </div>
            <div className="fgroup">
              <label className="flbl">Tekrar</label>
              <input type="password" className="input" value={sifre.tekrar} onChange={e => setSifre({ ...sifre, tekrar: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-gold btn-sm" onClick={sifreDegistir}>Şifreyi Değiştir</button>
        </div>

        {/* 2FA */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--gold)' }}>
              📱 İki Faktörlü Kimlik (TOTP)
            </div>
            {profil?.twoFA?.aktif ? (
              <span className="badge b-green">✓ AKTİF</span>
            ) : (
              <span className="badge b-muted">KAPALI</span>
            )}
          </div>

          {!profil?.twoFA?.aktif && !kurulum && (
            <>
              <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
                Google Authenticator, Authy, 1Password gibi bir authenticator uygulaması ile hesabınıza ekstra güvenlik katmanı ekleyin.
              </div>
              <button className="btn btn-gold" onClick={kurulumBaslat}>🔐 2FA Aktif Et</button>
            </>
          )}

          {kurulum && (
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>
              <div>
                <img src={kurulum.qrUrl} alt="2FA QR" style={{ width: 220, border: '1px solid var(--border)', borderRadius: 8 }} />
                <div style={{ fontSize: '.65rem', color: 'var(--muted)', marginTop: 6 }}>
                  ⚠️ QR kod qrserver.com API üzerinden render ediliyor — secret 3. parti servise gönderiliyor (MVP). Manuel kurulum için aşağıdaki secret'ı kullan:
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '.75rem', background: 'var(--surface2)', padding: 8, borderRadius: 4, marginTop: 8, wordBreak: 'break-all' }}>
                  {kurulum.secret}
                </div>
              </div>
              <div>
                <ol style={{ fontSize: '.82rem', paddingLeft: 20, lineHeight: 1.8, color: 'var(--muted)' }}>
                  <li>Authenticator uygulamasını aç</li>
                  <li>"+" ile yeni hesap ekle</li>
                  <li>QR kodu tara veya secret'ı manuel gir</li>
                  <li>Uygulamadaki 6 haneli kodu aşağı gir</li>
                </ol>
                <div className="fgroup">
                  <label className="flbl">6 Haneli Kod</label>
                  <input className="input" value={kod} onChange={e => setKod(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" style={{ fontSize: '1.2rem', letterSpacing: 4, textAlign: 'center' }} />
                </div>
                <button className="btn btn-gold" onClick={kurulumBitir} disabled={kod.length !== 6}>Doğrula ve Aktif Et</button>
                <button className="btn btn-ghost" onClick={() => { setKurulum(null); setKod(''); }}>Vazgeç</button>
              </div>
            </div>
          )}

          {profil?.twoFA?.aktif && (
            <div>
              <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 10 }}>
                2FA aktif. Her girişte authenticator uygulamanızdan 6 haneli kod gireceksiniz.
              </div>
              <button className="btn btn-danger btn-sm" onClick={kapat}>2FA Kapat</button>
            </div>
          )}

          {kurtarma && (
            <div style={{ marginTop: 14, padding: 12, background: 'rgba(245,158,11,.08)', borderLeft: '3px solid var(--amber)', borderRadius: 6 }}>
              <div style={{ fontWeight: 700, color: 'var(--amber)', marginBottom: 8 }}>⚠️ Kurtarma Kodlarını Kaydet</div>
              <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: 8 }}>
                Authenticator erişimini kaybedersen bu kodlarla giriş yapabilirsin. Her kod tek kullanımlıktır.
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '.78rem', background: 'var(--surface2)', padding: 12, borderRadius: 6, columnCount: 2, gap: 10 }}>
                {kurtarma.map((k, i) => <div key={i}>{k}</div>)}
              </div>
              <button className="btn btn-gold btn-sm" onClick={kurtarmaIndir} style={{ marginTop: 8 }}>📥 Kodları İndir</button>
            </div>
          )}
        </div>

        {/* Oturumlar */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 12 }}>
            📱 Aktif Oturum
          </div>
          <div style={{ padding: 10, background: 'var(--surface2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '.88rem' }}>Bu Cihaz</div>
              <div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>{navigator.userAgent.slice(0, 80)}...</div>
            </div>
            <span className="badge b-green">AKTİF</span>
          </div>
          <button className="btn btn-danger btn-sm" onClick={tumOturumlar} style={{ marginTop: 10 }}>
            Tüm Oturumları Sonlandır
          </button>
        </div>

        {/* Giriş Geçmişi */}
        <div className="card">
          <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 12 }}>
            📋 Son Girişler ({girisGecmisi.length})
          </div>
          {girisGecmisi.length === 0 ? (
            <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>Kayıt yok</div>
          ) : (
            <table style={{ width: '100%', fontSize: '.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>Zaman</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Kullanıcı</th>
                </tr>
              </thead>
              <tbody>
                {girisGecmisi.slice(0, 20).map(l => {
                  const t = l.zaman?.toDate ? l.zaman.toDate() : null;
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                      <td style={{ padding: 8 }}>{t ? t.toLocaleString('tr-TR') : '—'}</td>
                      <td style={{ padding: 8 }}>{l.kullaniciEmail || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
