/**
 * @file pages/Bildirimler.jsx
 * @description Tam sayfa bildirim listesi + ayarlar
 */
import { useState, useMemo } from 'react';
import { useStore } from '../store/app';
import { useAuthStore } from '../store/auth';
import { Topbar } from '../components/Layout';
import { okunduIsaretle, tumunuOkunduIsaretle, bildirimSil, bildirimOlustur, TIP_ICON } from '../core/bildirimlerDb';
import { kportalOdemeOnayla, kportalOdemeReddet } from '../core/kportalDb';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../core/firebase';

const AYAR_KEY = 'bildirimAyarlari';
const VARSAYILAN_AYARLAR = {
  kira_vade: true, sozlesme_bitis: true, yeni_paylasim: true,
  odeme_alindi: true, gecikme: true, alarm: true, yedek_hazir: true, sistem: false,
};

export default function Bildirimler() {
  const { user } = useAuthStore();
  const { bildirimler, setPage, toast } = useStore();
  const [filtre, setFiltre] = useState('tumu');
  const [odemeDetay, setOdemeDetay] = useState({}); // bildirimId -> odeme fetch cache
  const [redModal, setRedModal] = useState(null);
  const [dekontModal, setDekontModal] = useState(null);
  const [islemYap, setIslemYap] = useState(null);
  const [ayarlar, setAyarlar] = useState(() => {
    try { return { ...VARSAYILAN_AYARLAR, ...JSON.parse(localStorage.getItem(AYAR_KEY) || '{}') }; }
    catch { return VARSAYILAN_AYARLAR; }
  });
  const ws = user?.workspaceId;

  const liste = bildirimler || [];
  const gosterilen = useMemo(() => {
    if (filtre === 'okunmamis') return liste.filter(b => !b.okundu && !b.isDeleted);
    if (filtre === 'arsiv') return liste.filter(b => b.isDeleted);
    return liste.filter(b => !b.isDeleted);
  }, [liste, filtre]);

  const ayarDegistir = (k, v) => {
    const yeni = { ...ayarlar, [k]: v };
    setAyarlar(yeni);
    localStorage.setItem(AYAR_KEY, JSON.stringify(yeni));
  };

  const zamanFormat = (ts) => {
    if (!ts) return '';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return isNaN(d) ? '' : d.toLocaleString('tr-TR');
  };

  /* Ödeme bildirimine bağlı ödeme dokümanını çek (cache) */
  const odemeYukle = async (bildirim) => {
    if (odemeDetay[bildirim.id]) return odemeDetay[bildirim.id];
    if (!bildirim.odemeId && bildirim.tip !== 'kiraci_odeme_bekliyor') return null;
    try {
      // Bildirim mesajı içinden referansla ödemeyi bul — en son beklemede olan
      // Alternatif: yeni bildirimOlustur'a odemeId eklenebilir
      const q = await import('firebase/firestore').then(async f => {
        const snap = await f.getDocs(f.query(
          f.collection(db, 'odemeler'),
          f.where('workspaceId', '==', bildirim.workspaceId),
          f.where('durum', '==', 'beklemede'),
          f.where('kaynak', '==', 'kiraci_self'),
        ));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      });
      // En yakın zamanda oluşan
      q.sort((a, b) => (b.olusturulma?.seconds || 0) - (a.olusturulma?.seconds || 0));
      const yakin = q[0];
      if (yakin) {
        setOdemeDetay(s => ({ ...s, [bildirim.id]: yakin }));
        return yakin;
      }
    } catch (e) { console.warn('[odeme yukle]', e); }
    return null;
  };

  const onayla = async (bildirim) => {
    const odeme = odemeDetay[bildirim.id] || await odemeYukle(bildirim);
    if (!odeme) { toast('error', 'Ödeme bulunamadı'); return; }
    try {
      setIslemYap(bildirim.id);
      await kportalOdemeOnayla(bildirim.workspaceId, user, odeme.id);
      await okunduIsaretle(bildirim.id);
      await bildirimOlustur({
        workspaceId: bildirim.workspaceId,
        tip: 'odeme_alindi',
        baslik: '✓ Ödeme onaylandı',
        mesaj: `${odeme.referans || ''} referanslı ödeme onaylandı`,
        link: 'odemeler',
      });
      toast('success', 'Ödeme onaylandı');
    } catch (e) {
      toast('error', e.message);
    } finally {
      setIslemYap(null);
    }
  };

  const reddetAc = async (bildirim) => {
    const odeme = odemeDetay[bildirim.id] || await odemeYukle(bildirim);
    if (!odeme) { toast('error', 'Ödeme bulunamadı'); return; }
    setRedModal({ bildirim, odeme, sebep: '' });
  };

  const reddetOnay = async () => {
    if (!redModal?.sebep?.trim()) { toast('error', 'Red sebebi zorunlu'); return; }
    try {
      await kportalOdemeReddet(
        redModal.bildirim.workspaceId, user,
        redModal.odeme.id, redModal.sebep
      );
      await okunduIsaretle(redModal.bildirim.id);
      toast('success', 'Ödeme reddedildi');
      setRedModal(null);
    } catch (e) {
      toast('error', e.message);
    }
  };

  const dekontAc = async (bildirim) => {
    const odeme = odemeDetay[bildirim.id] || await odemeYukle(bildirim);
    if (!odeme?.dekontUrl) { toast('error', 'Dekont bulunamadı'); return; }
    setDekontModal({ url: odeme.dekontUrl, tip: (odeme.dekontUrl || '').includes('.pdf') ? 'pdf' : 'image' });
  };

  return (
    <div>
      <Topbar title="🔔 Bildirimler" />
      <div className="page" style={{ paddingBottom: 90 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>
          {/* Liste */}
          <div>
            <div className="card" style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              {[['tumu', `Tümü (${liste.filter(b => !b.isDeleted).length})`], ['okunmamis', 'Okunmamış'], ['arsiv', 'Arşiv']].map(([id, lbl]) => (
                <button key={id} className={`btn btn-sm ${filtre === id ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setFiltre(id)}>{lbl}</button>
              ))}
              <button
                className="btn btn-sm btn-ghost"
                style={{ marginLeft: 'auto' }}
                onClick={async () => { if (ws) { await tumunuOkunduIsaretle(ws); toast('success', 'Hepsi okundu'); } }}
              >Hepsini Oku</button>
            </div>

            <div className="card" style={{ padding: 0 }}>
              {gosterilen.length === 0 ? (
                <div className="empty">
                  <div className="empty-ico">🔔</div>
                  <div className="empty-title">Bildirim yok</div>
                </div>
              ) : (
                gosterilen.map(b => {
                  const kportalOdeme = b.tip === 'kiraci_odeme_bekliyor' && !b.okundu;
                  return (
                    <div key={b.id} style={{
                      display: 'flex', gap: 12, padding: '14px 16px',
                      borderBottom: '1px solid rgba(255,255,255,.03)',
                      background: b.okundu ? 'transparent' : 'rgba(201,168,76,.03)',
                      cursor: b.link && !kportalOdeme ? 'pointer' : 'default',
                      flexWrap: 'wrap',
                    }} onClick={async () => {
                      if (kportalOdeme) return; // aksiyonlar var, açma
                      if (!b.okundu) await okunduIsaretle(b.id);
                      if (b.link) setPage(b.link);
                    }}>
                      <div style={{ fontSize: '1.4rem' }}>
                        {b.tip === 'kiraci_odeme_bekliyor' ? '💰' : (b.icon || '🔔')}
                      </div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: '.9rem', fontWeight: 600, color: b.renk || 'var(--text)' }}>{b.baslik}</div>
                        <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 3 }}>{b.mesaj}</div>
                        <div style={{ fontSize: '.65rem', color: 'var(--muted)', marginTop: 4 }}>{zamanFormat(b.olusturulma)}</div>
                      </div>
                      {kportalOdeme && (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button
                            className="btn btn-sm btn-ghost"
                            disabled={islemYap === b.id}
                            onClick={(e) => { e.stopPropagation(); dekontAc(b); }}
                            title="Dekontu büyüt"
                          >🔍</button>
                          <button
                            className="btn btn-sm btn-primary"
                            disabled={islemYap === b.id}
                            onClick={(e) => { e.stopPropagation(); onayla(b); }}
                          >✓ Onayla</button>
                          <button
                            className="btn btn-sm btn-danger"
                            disabled={islemYap === b.id}
                            onClick={(e) => { e.stopPropagation(); reddetAc(b); }}
                          >✗ Reddet</button>
                        </div>
                      )}
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={(e) => { e.stopPropagation(); bildirimSil(b.id); }}
                      >×</button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Ayarlar */}
          <div className="card" style={{ alignSelf: 'start' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 12 }}>
              ⚙️ Bildirim Ayarları
            </div>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 10 }}>
              Hangi bildirimleri almak istediğini seç:
            </div>
            {Object.entries(TIP_ICON).map(([k, v]) => (
              <label key={k} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.03)',
                cursor: 'pointer', fontSize: '.82rem',
              }}>
                <input type="checkbox" checked={!!ayarlar[k]} onChange={e => ayarDegistir(k, e.target.checked)} />
                <span>{v.icon}</span>
                <span style={{ flex: 1, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Red sebep modalı */}
      {redModal && (
        <div className="modal-bg" onClick={() => setRedModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
            <div className="modal-head">
              <div className="modal-title">✗ Ödemeyi Reddet</div>
              <button className="btn btn-sm btn-ghost" onClick={() => setRedModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: 10 }}>
                Kiracıya iletilecek sebep:
              </div>
              <textarea
                className="textarea" rows={4}
                value={redModal.sebep}
                onChange={e => setRedModal({ ...redModal, sebep: e.target.value })}
                placeholder="Örn: Dekont okunamıyor, tutar eksik..."
                autoFocus
              />
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setRedModal(null)}>Vazgeç</button>
              <button className="btn btn-danger" onClick={reddetOnay}>Reddet</button>
            </div>
          </div>
        </div>
      )}

      {/* Dekont lightbox */}
      {dekontModal && (
        <div className="modal-bg" onClick={() => setDekontModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 900, maxHeight: '92vh' }}>
            <div className="modal-head">
              <div className="modal-title">🔍 Dekont Önizleme</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <a href={dekontModal.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-gold">📥 İndir</a>
                <button className="btn btn-sm btn-ghost" onClick={() => setDekontModal(null)}>×</button>
              </div>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              {dekontModal.tip === 'pdf' ? (
                <iframe src={dekontModal.url} style={{ width: '100%', height: '75vh', border: 0 }} title="dekont" />
              ) : (
                <img src={dekontModal.url} alt="dekont" style={{ maxWidth: '100%', maxHeight: '75vh' }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
