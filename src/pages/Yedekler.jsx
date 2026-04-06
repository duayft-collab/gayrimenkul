/**
 * @file pages/Yedekler.jsx
 * @description Manuel + otomatik yedekleme UI
 */
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';
import { Topbar } from '../components/Layout';
import { yedekIndir, yedekYukle, yedeklerListesi, otomatikYedekKontrol } from '../core/yedek';

const OTO_KEY = 'otoYedekAktif';

export default function Yedekler() {
  const { user } = useAuthStore();
  const { toast } = useStore();
  const ws = user?.workspaceId;
  const [liste, setListe] = useState([]);
  const [islemde, setIslemde] = useState(false);
  const [otoAktif, setOtoAktif] = useState(() => localStorage.getItem(OTO_KEY) !== 'off');
  const [yuklemeOnay, setYuklemeOnay] = useState(null);
  const fileRef = useRef(null);
  const [durum, setDurum] = useState(null);

  const yukle = async () => {
    if (!ws) return;
    const l = await yedeklerListesi(ws);
    setListe(l);
    const kontrol = await otomatikYedekKontrol(ws, user, { enabled: otoAktif });
    setDurum(kontrol);
  };

  useEffect(() => { yukle(); }, [ws]);

  const indir = async () => {
    if (!ws) return;
    setIslemde(true);
    try {
      const yedek = await yedekIndir(ws, user);
      const sayi = Object.values(yedek.ozet).reduce((a, b) => a + b, 0);
      toast('success', `${sayi} kayıt yedeklendi`);
      yukle();
    } catch (e) {
      toast('error', e.message);
    } finally {
      setIslemde(false);
    }
  };

  const dosyaSec = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setYuklemeOnay({ file });
  };

  const yuklemeOnayla = async ({ uzeriniYaz }) => {
    if (!yuklemeOnay?.file || !ws) return;
    setIslemde(true);
    try {
      const sonuc = await yedekYukle(ws, user, yuklemeOnay.file, { uzeriniYaz });
      toast('success', `${sonuc.yuklenen} kayıt yüklendi${sonuc.hata ? ` (${sonuc.hata} hata)` : ''}`);
      setYuklemeOnay(null);
      yukle();
    } catch (e) {
      toast('error', e.message);
    } finally {
      setIslemde(false);
    }
  };

  const otoToggle = (aktif) => {
    setOtoAktif(aktif);
    localStorage.setItem(OTO_KEY, aktif ? 'on' : 'off');
  };

  const formatBoyut = (b) => {
    if (!b) return '—';
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1024 / 1024).toFixed(1) + ' MB';
  };

  return (
    <div>
      <Topbar title="💾 Yedekler" />
      <div className="page" style={{ paddingBottom: 90 }}>
        {/* Üst aksiyon */}
        <div className="card" style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-gold" onClick={indir} disabled={islemde}>
            {islemde ? 'İşleniyor...' : '💾 Şimdi Yedek Al'}
          </button>
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={islemde}>
            📤 Yedek Yükle
          </button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={dosyaSec} />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: '.82rem' }}>
            <span style={{ color: 'var(--muted)' }}>Otomatik haftalık yedek:</span>
            <button
              className={`btn btn-sm ${otoAktif ? 'btn-gold' : 'btn-ghost'}`}
              onClick={() => otoToggle(!otoAktif)}
            >
              {otoAktif ? '✓ AKTİF' : '○ KAPALI'}
            </button>
          </div>
        </div>

        {/* Durum */}
        {durum && (
          <div style={{
            padding: 12, marginBottom: 14, borderRadius: 8,
            background: durum.gerekli ? 'rgba(245,158,11,.08)' : 'rgba(34,197,94,.05)',
            borderLeft: `3px solid ${durum.gerekli ? 'var(--amber)' : 'var(--green)'}`,
            fontSize: '.82rem',
          }}>
            {durum.gerekli ? (
              <>⚠️ Son yedek 7 günden eski. <b>Şimdi yedek alman önerilir.</b></>
            ) : (
              <>✓ Yedekleme güncel. Son yedek: {durum.sonZaman ? new Date(durum.sonZaman).toLocaleString('tr-TR') : '—'}</>
            )}
          </div>
        )}

        {/* Liste */}
        <div className="card">
          <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 700, marginBottom: 12 }}>
            📦 Yedek Geçmişi ({liste.length})
          </div>
          {liste.length === 0 ? (
            <div className="empty">
              <div className="empty-ico">📦</div>
              <div className="empty-title">Henüz yedek yok</div>
              <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>"Şimdi Yedek Al" tıklayarak başla</div>
            </div>
          ) : (
            <table style={{ width: '100%', fontSize: '.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: 10 }}>Tarih</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Kullanıcı</th>
                  <th style={{ textAlign: 'right', padding: 10 }}>Kayıt</th>
                  <th style={{ textAlign: 'right', padding: 10 }}>Boyut</th>
                </tr>
              </thead>
              <tbody>
                {liste.map(y => {
                  const t = y.olusturulma?.toDate ? y.olusturulma.toDate() : null;
                  return (
                    <tr key={y.id} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                      <td style={{ padding: 10 }}>{t ? t.toLocaleString('tr-TR') : '—'}</td>
                      <td style={{ padding: 10 }}>{y.olusturan}</td>
                      <td style={{ padding: 10, textAlign: 'right' }}>{y.kayitSayisi || 0}</td>
                      <td style={{ padding: 10, textAlign: 'right' }}>{formatBoyut(y.boyutByte)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {yuklemeOnay && (
        <div className="modal-bg" onClick={() => setYuklemeOnay(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
            <div className="modal-head">
              <div className="modal-title">⚠️ Yedek Yükleme Modu</div>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '.88rem' }}>Dosya: <b>{yuklemeOnay.file.name}</b></p>
              <p style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
                Yükleme modunu seçin:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>➕ Ekle (Güvenli)</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>
                    Mevcut veriler korunur, yedekteki kayıtlar yeni olarak eklenir. Çakışmalar manuel çözülür.
                  </div>
                </div>
                <div style={{ padding: 12, border: '1px solid var(--red)', borderRadius: 8, background: 'rgba(239,68,68,.05)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--red)' }}>⚠️ Üzerine Yaz (Tehlikeli)</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>
                    Mevcut tüm kayıtlar soft delete edilir (K06 — geri alınabilir), sadece yedek içeriği kalır.
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setYuklemeOnay(null)}>Vazgeç</button>
              <button className="btn btn-primary" onClick={() => yuklemeOnayla({ uzeriniYaz: false })} disabled={islemde}>➕ Ekle</button>
              <button className="btn btn-danger" onClick={() => yuklemeOnayla({ uzeriniYaz: true })} disabled={islemde}>⚠️ Üzerine Yaz</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
