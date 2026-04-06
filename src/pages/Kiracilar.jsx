/**
 * @file pages/Kiracilar.jsx
 * @description Kiracı listesi + ekleme + detay
 */
import { useState, useMemo } from 'react';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';
import { Topbar } from '../components/Layout';
import { kiraciEkle, kiraciSil, kiraciGeriAl } from '../core/kiracilarDb';
import { kiraciBakiyeHesapla } from '../core/odemelerDb';
import KiraciDetay from '../components/KiraciDetay';
import { kiraciPortalTokenUret, kportalTokenIptal } from '../core/paylasim';

function PortalLinkModal({ kiraci, ws, onClose, toast }) {
  const mevcut = kiraci.portalToken && kiraci.portalAktif !== false;
  const mevcutUrl = mevcut
    ? `${window.location.origin}${window.location.pathname}#/kportal/${kiraci.portalToken}`
    : null;

  const [url, setUrl] = useState(mevcutUrl);
  const [calisiyor, setCalisiyor] = useState(false);

  const uret = async () => {
    setCalisiyor(true);
    try {
      const r = await kiraciPortalTokenUret(kiraci.id, ws);
      setUrl(r.url);
      toast('success', mevcut ? 'Yeni link oluşturuldu (eski iptal)' : 'Portal linki oluşturuldu');
    } catch (e) {
      toast('error', e.message);
    } finally {
      setCalisiyor(false);
    }
  };

  const iptal = async () => {
    if (!confirm('Portal linki iptal edilsin mi? Kiracı erişemeyecek.')) return;
    setCalisiyor(true);
    try {
      await kportalTokenIptal(kiraci.id);
      setUrl(null);
      toast('success', 'Link iptal edildi');
    } catch (e) {
      toast('error', e.message);
    } finally {
      setCalisiyor(false);
    }
  };

  const kopyala = () => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => toast('success', 'Kopyalandı'));
  };

  const waMetin = `Merhaba ${kiraci.adSoyad || ''}, kira ödemenizi kolayca bildirebileceğiniz özel linkiniz hazır:\n\n${url}\n\nBu link üzerinden:\n✓ Bu ay kira tutarınızı görebilir\n✓ Ödeme dekontunuzu yükleyebilir\n✓ Hesap özetinizi indirebilirsiniz\n\nİyi günler.`;

  const telTemiz = (kiraci.telefon || '').replace(/\D/g, '');
  const waUrl = telTemiz
    ? `https://wa.me/${telTemiz}?text=${encodeURIComponent(waMetin)}`
    : `https://wa.me/?text=${encodeURIComponent(waMetin)}`;
  const smsUrl = telTemiz
    ? `sms:${telTemiz}?body=${encodeURIComponent('Ödeme portalınız: ' + url)}`
    : `sms:?body=${encodeURIComponent('Ödeme portalınız: ' + url)}`;
  const mailUrl = `mailto:${kiraci.email || ''}?subject=${encodeURIComponent('Kira Ödeme Portalınız')}&body=${encodeURIComponent(waMetin)}`;
  const qrUrl = url ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}` : null;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-head">
          <div className="modal-title">🔗 Portal Linki — {kiraci.adSoyad}</div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {!url ? (
            <>
              <div style={{ padding: 14, background: 'rgba(201,168,76,.08)', borderLeft: '3px solid var(--gold)', borderRadius: 8, fontSize: '.82rem', marginBottom: 14 }}>
                Kiracı için özel bir self-servis ödeme bildirim portalı linki oluşturun. Kiracı bu link üzerinden:
                <ul style={{ margin: '6px 0 0 20px', padding: 0, fontSize: '.78rem', color: 'var(--muted)' }}>
                  <li>Bakiyesini görebilir</li>
                  <li>Ödeme dekontu yükleyebilir</li>
                  <li>Hesap özetini indirebilir</li>
                </ul>
              </div>
              <button className="btn btn-gold" onClick={uret} disabled={calisiyor} style={{ width: '100%' }}>
                {calisiyor ? 'Oluşturuluyor...' : '🔗 Portal Linki Oluştur'}
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14, marginBottom: 14 }}>
                {qrUrl && <img src={qrUrl} alt="QR" style={{ width: '100%', borderRadius: 8, background: '#fff' }} />}
                <div>
                  <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginBottom: 4 }}>Link:</div>
                  <div style={{
                    fontFamily: 'monospace', fontSize: '.68rem',
                    padding: 10, background: 'var(--surface2)',
                    borderRadius: 6, wordBreak: 'break-all', marginBottom: 10,
                  }}>{url}</div>
                  <button className="btn btn-sm btn-gold" onClick={kopyala} style={{ width: '100%' }}>📋 Kopyala</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
                <a href={waUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ textAlign: 'center', justifyContent: 'center' }}>💬 WhatsApp</a>
                <a href={smsUrl} className="btn btn-ghost btn-sm" style={{ textAlign: 'center', justifyContent: 'center' }}>📱 SMS</a>
                <a href={mailUrl} className="btn btn-ghost btn-sm" style={{ textAlign: 'center', justifyContent: 'center' }}>📧 E-posta</a>
              </div>

              <button className="btn btn-ghost" onClick={uret} disabled={calisiyor} style={{ width: '100%', marginBottom: 6 }}>
                🔄 Yeni Link Üret (eskisi iptal olur)
              </button>
              <button className="btn btn-danger" onClick={iptal} disabled={calisiyor} style={{ width: '100%' }}>
                ⚠ Linki İptal Et
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const fmtTL = (kurus) => '₺' + new Intl.NumberFormat('tr-TR').format(Math.round((kurus || 0) / 100));

export default function Kiracilar() {
  const { user } = useAuthStore();
  const { kiracilar, kiralar, odemeler, toast } = useStore();
  const [ara, setAra] = useState('');
  const [filtre, setFiltre] = useState('tumu'); // tumu | aktif | pasif | borclu
  const [detay, setDetay] = useState(null);
  const [yeni, setYeni] = useState(null);
  const [portalModal, setPortalModal] = useState(null);
  const ws = user?.workspaceId || 'ws_001';

  const aktif = useMemo(() => (kiracilar || []).filter(k => !k.isDeleted), [kiracilar]);

  const genisletilmis = useMemo(() => {
    return aktif.map(k => {
      const mulkSayisi = (kiralar || []).filter(x => x.kiraciId === k.id && !x.isDeleted).length;
      const kiraciOdeme = (odemeler || []).filter(o => o.kiraciId === k.id && !o.isDeleted);
      const bakiye = kiraciBakiyeHesapla(kiraciOdeme);
      return { ...k, mulkSayisi, bakiyeKurus: bakiye.toplamBeklenenKurus, gecikmisKurus: bakiye.gecikmisKurus };
    });
  }, [aktif, kiralar, odemeler]);

  const gosterilen = useMemo(() => {
    let l = [...genisletilmis];
    if (ara) {
      const q = ara.toLowerCase();
      l = l.filter(k =>
        (k.adSoyad || '').toLowerCase().includes(q) ||
        (k.telefon || '').includes(q) ||
        (k.email || '').toLowerCase().includes(q)
      );
    }
    if (filtre === 'aktif') l = l.filter(k => k.aktif);
    else if (filtre === 'pasif') l = l.filter(k => !k.aktif);
    else if (filtre === 'borclu') l = l.filter(k => k.bakiyeKurus > 0);
    return l;
  }, [genisletilmis, ara, filtre]);

  const yeniEkle = () => setYeni({ adSoyad: '', firmaAdi: '', telefon: '', email: '', tcNo: '', vergiNo: '', notlar: '', aktif: true });

  const kaydet = async () => {
    if (!yeni.adSoyad) { toast('error', 'Ad Soyad zorunlu'); return; }
    try {
      await kiraciEkle(ws, user, yeni);
      toast('success', 'Kiracı eklendi');
      setYeni(null);
    } catch (e) {
      toast('error', e.message);
    }
  };

  const sil = async (k) => {
    try {
      await kiraciSil(ws, user, k.id);
      toast('warning', `"${k.adSoyad}" silindi`, {
        undoLabel: 'Geri Al',
        onUndo: () => kiraciGeriAl(ws, user, k.id),
        sure: 30000,
      });
    } catch (e) {
      toast('error', e.message);
    }
  };

  return (
    <div>
      <Topbar title="👤 Kiracılar" />
      <div className="page" style={{ paddingBottom: 90 }}>
        {/* KPI */}
        <div className="g4" style={{ marginBottom: 14 }}>
          <div className="kpi" style={{ '--kc': 'var(--blue2)' }}>
            <div className="kpi-lbl">Toplam Kiracı</div>
            <div className="kpi-val">{aktif.length}</div>
          </div>
          <div className="kpi" style={{ '--kc': 'var(--green)' }}>
            <div className="kpi-lbl">Aktif</div>
            <div className="kpi-val" style={{ color: 'var(--green)' }}>{aktif.filter(k => k.aktif).length}</div>
          </div>
          <div className="kpi" style={{ '--kc': 'var(--amber)' }}>
            <div className="kpi-lbl">Bekleyen Borç</div>
            <div className="kpi-val" style={{ color: 'var(--amber)', fontSize: '1.15rem' }}>
              {fmtTL(genisletilmis.reduce((a, k) => a + k.bakiyeKurus, 0))}
            </div>
          </div>
          <div className="kpi" style={{ '--kc': 'var(--red)' }}>
            <div className="kpi-lbl">Gecikmiş</div>
            <div className="kpi-val" style={{ color: 'var(--red)', fontSize: '1.15rem' }}>
              {fmtTL(genisletilmis.reduce((a, k) => a + k.gecikmisKurus, 0))}
            </div>
          </div>
        </div>

        {/* Filtre bar */}
        <div className="card" style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
          <input className="input" placeholder="🔍 Ad, telefon, e-posta" value={ara} onChange={e => setAra(e.target.value)} style={{ maxWidth: 300 }} />
          <div style={{ display: 'flex', gap: 4 }}>
            {[['tumu','Tümü'],['aktif','Aktif'],['pasif','Pasif'],['borclu','Borçlu']].map(([id, lbl]) => (
              <button key={id} className={`btn btn-sm ${filtre === id ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setFiltre(id)}>{lbl}</button>
            ))}
          </div>
          <button className="btn btn-gold btn-sm" style={{ marginLeft: 'auto' }} onClick={yeniEkle}>+ Yeni Kiracı</button>
        </div>

        {/* Liste */}
        {gosterilen.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">👤</div>
            <div className="empty-title">Kiracı yok</div>
          </div>
        ) : (
          <div className="card">
            <table style={{ width: '100%', fontSize: '.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: 10, color: 'var(--muted)' }}>Ad Soyad</th>
                  <th style={{ textAlign: 'left', padding: 10, color: 'var(--muted)' }}>İletişim</th>
                  <th style={{ textAlign: 'right', padding: 10, color: 'var(--muted)' }}>Mülk</th>
                  <th style={{ textAlign: 'right', padding: 10, color: 'var(--muted)' }}>Bekleyen</th>
                  <th style={{ textAlign: 'right', padding: 10, color: 'var(--muted)' }}>Gecikmiş</th>
                  <th style={{ padding: 10 }}></th>
                </tr>
              </thead>
              <tbody>
                {gosterilen.map(k => (
                  <tr key={k.id} style={{ borderBottom: '1px solid rgba(255,255,255,.03)', cursor: 'pointer' }} onClick={() => setDetay(k)}>
                    <td style={{ padding: 10 }}>
                      <div style={{ fontWeight: 600 }}>{k.adSoyad}</div>
                      {k.firmaAdi && <div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>{k.firmaAdi}</div>}
                    </td>
                    <td style={{ padding: 10, fontSize: '.75rem', color: 'var(--muted)' }}>
                      {k.telefon || '—'}<br />{k.email || ''}
                    </td>
                    <td style={{ padding: 10, textAlign: 'right' }}>{k.mulkSayisi}</td>
                    <td style={{ padding: 10, textAlign: 'right', color: k.bakiyeKurus > 0 ? 'var(--amber)' : 'var(--muted)' }}>
                      {fmtTL(k.bakiyeKurus)}
                    </td>
                    <td style={{ padding: 10, textAlign: 'right', color: k.gecikmisKurus > 0 ? 'var(--red)' : 'var(--muted)', fontWeight: k.gecikmisKurus > 0 ? 700 : 400 }}>
                      {fmtTL(k.gecikmisKurus)}
                    </td>
                    <td style={{ padding: 10, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-sm btn-ghost"
                        title="Portal Linki"
                        onClick={(e) => { e.stopPropagation(); setPortalModal(k); }}
                      >🔗</button>
                      <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); sil(k); }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detay && <KiraciDetay kiraci={detay} onClose={() => setDetay(null)} onSaved={() => {}} />}

      {portalModal && (
        <PortalLinkModal
          kiraci={portalModal}
          ws={ws}
          onClose={() => setPortalModal(null)}
          toast={toast}
        />
      )}

      {yeni && (
        <div className="modal-bg" onClick={() => setYeni(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 500 }}>
            <div className="modal-head">
              <div className="modal-title">+ Yeni Kiracı</div>
              <button className="btn btn-sm btn-ghost" onClick={() => setYeni(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="fgroup">
                <label className="flbl">Ad Soyad *</label>
                <input className="input" value={yeni.adSoyad} onChange={e => setYeni({ ...yeni, adSoyad: e.target.value })} autoFocus />
              </div>
              <div className="fgrid2">
                <div className="fgroup">
                  <label className="flbl">Telefon</label>
                  <input className="input" value={yeni.telefon} onChange={e => setYeni({ ...yeni, telefon: e.target.value })} />
                </div>
                <div className="fgroup">
                  <label className="flbl">E-posta</label>
                  <input className="input" type="email" value={yeni.email} onChange={e => setYeni({ ...yeni, email: e.target.value })} />
                </div>
              </div>
              <div className="fgroup">
                <label className="flbl">Firma Adı</label>
                <input className="input" value={yeni.firmaAdi} onChange={e => setYeni({ ...yeni, firmaAdi: e.target.value })} />
              </div>
              <div className="fgrid2">
                <div className="fgroup">
                  <label className="flbl">TC No</label>
                  <input className="input" value={yeni.tcNo} onChange={e => setYeni({ ...yeni, tcNo: e.target.value })} />
                </div>
                <div className="fgroup">
                  <label className="flbl">Vergi No</label>
                  <input className="input" value={yeni.vergiNo} onChange={e => setYeni({ ...yeni, vergiNo: e.target.value })} />
                </div>
              </div>
              <div className="fgroup">
                <label className="flbl">Notlar</label>
                <textarea className="textarea" rows={2} value={yeni.notlar} onChange={e => setYeni({ ...yeni, notlar: e.target.value })} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setYeni(null)}>Vazgeç</button>
              <button className="btn btn-gold" onClick={kaydet}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
