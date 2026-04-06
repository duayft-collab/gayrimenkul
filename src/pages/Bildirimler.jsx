/**
 * @file pages/Bildirimler.jsx
 * @description Tam sayfa bildirim listesi + ayarlar
 */
import { useState, useMemo } from 'react';
import { useStore } from '../store/app';
import { useAuthStore } from '../store/auth';
import { Topbar } from '../components/Layout';
import { okunduIsaretle, tumunuOkunduIsaretle, bildirimSil, TIP_ICON } from '../core/bildirimlerDb';

const AYAR_KEY = 'bildirimAyarlari';
const VARSAYILAN_AYARLAR = {
  kira_vade: true, sozlesme_bitis: true, yeni_paylasim: true,
  odeme_alindi: true, gecikme: true, alarm: true, yedek_hazir: true, sistem: false,
};

export default function Bildirimler() {
  const { user } = useAuthStore();
  const { bildirimler, setPage, toast } = useStore();
  const [filtre, setFiltre] = useState('tumu');
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
                gosterilen.map(b => (
                  <div key={b.id} style={{
                    display: 'flex', gap: 12, padding: '14px 16px',
                    borderBottom: '1px solid rgba(255,255,255,.03)',
                    background: b.okundu ? 'transparent' : 'rgba(201,168,76,.03)',
                    cursor: b.link ? 'pointer' : 'default',
                  }} onClick={async () => {
                    if (!b.okundu) await okunduIsaretle(b.id);
                    if (b.link) setPage(b.link);
                  }}>
                    <div style={{ fontSize: '1.4rem' }}>{b.icon || '🔔'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '.9rem', fontWeight: 600, color: b.renk || 'var(--text)' }}>{b.baslik}</div>
                      <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 3 }}>{b.mesaj}</div>
                      <div style={{ fontSize: '.65rem', color: 'var(--muted)', marginTop: 4 }}>{zamanFormat(b.olusturulma)}</div>
                    </div>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={(e) => { e.stopPropagation(); bildirimSil(b.id); }}
                    >×</button>
                  </div>
                ))
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
    </div>
  );
}
