/**
 * @file components/BildirimMerkezi.jsx
 * @description Topbar 🔔 dropdown + okunmamış badge
 */
import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/app';
import { okunduIsaretle, tumunuOkunduIsaretle, bildirimSil } from '../core/bildirimlerDb';
import { useAuthStore } from '../store/auth';

function zamanFormat(ts) {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const fark = (Date.now() - d.getTime()) / 1000;
  if (fark < 60) return 'şimdi';
  if (fark < 3600) return Math.floor(fark / 60) + ' dk';
  if (fark < 86400) return Math.floor(fark / 3600) + ' sa';
  return Math.floor(fark / 86400) + ' gün';
}

export default function BildirimMerkezi() {
  const { user } = useAuthStore();
  const { bildirimler, setPage } = useStore();
  const [acik, setAcik] = useState(false);
  const [tab, setTab] = useState('okunmamis');
  const ref = useRef(null);
  const ws = user?.workspaceId;

  useEffect(() => {
    const f = (e) => { if (ref.current && !ref.current.contains(e.target)) setAcik(false); };
    document.addEventListener('click', f);
    return () => document.removeEventListener('click', f);
  }, []);

  const liste = bildirimler || [];
  const okunmamis = liste.filter(b => !b.okundu && !b.isDeleted);
  const arsiv = liste.filter(b => b.okundu || b.isDeleted);
  const gosterilen = tab === 'okunmamis' ? okunmamis : tab === 'tumu' ? liste : arsiv;

  const tikla = async (b) => {
    if (!b.okundu) await okunduIsaretle(b.id);
    if (b.link) setPage(b.link);
    setAcik(false);
  };

  const hepsiniOku = async () => {
    if (!ws) return;
    await tumunuOkunduIsaretle(ws);
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setAcik(!acik)}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: '1.15rem', position: 'relative', padding: 6,
        }}
        aria-label="Bildirimler"
      >
        🔔
        {okunmamis.length > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: 'var(--red)', color: '#fff',
            fontSize: '.6rem', fontWeight: 700,
            padding: '1px 5px', borderRadius: 99,
            minWidth: 16, textAlign: 'center',
          }}>
            {okunmamis.length > 99 ? '99+' : okunmamis.length}
          </span>
        )}
      </button>

      {acik && (
        <div style={{
          position: 'absolute', top: '120%', right: 0, width: 360,
          background: 'var(--surface)', border: '1px solid var(--gold)',
          borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,.5)',
          zIndex: 1600, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, color: 'var(--gold)' }}>🔔 Bildirimler</div>
            {okunmamis.length > 0 && (
              <button className="btn btn-sm btn-ghost" onClick={hepsiniOku} style={{ fontSize: '.68rem' }}>Hepsini oku</button>
            )}
          </div>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', fontSize: '.75rem' }}>
            {[['okunmamis', `Okunmamış (${okunmamis.length})`], ['tumu', 'Tümü'], ['arsiv', 'Arşiv']].map(([id, lbl]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, padding: '8px 4px', border: 0, cursor: 'pointer',
                background: tab === id ? 'rgba(201,168,76,.08)' : 'transparent',
                color: tab === id ? 'var(--gold)' : 'var(--muted)',
                fontWeight: tab === id ? 600 : 400,
                borderBottom: tab === id ? '2px solid var(--gold)' : '2px solid transparent',
              }}>{lbl}</button>
            ))}
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {gosterilen.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', fontSize: '.78rem', color: 'var(--muted)' }}>
                {tab === 'okunmamis' ? 'Hepsi okundu ✓' : 'Henüz bildirim yok'}
              </div>
            ) : gosterilen.slice(0, 50).map(b => (
              <div key={b.id}
                onClick={() => tikla(b)}
                style={{
                  display: 'flex', gap: 10, padding: '10px 14px',
                  borderBottom: '1px solid rgba(255,255,255,.03)',
                  cursor: 'pointer', opacity: b.okundu ? 0.6 : 1,
                  background: b.okundu ? 'transparent' : 'rgba(201,168,76,.03)',
                }}>
                <div style={{ fontSize: '1.1rem' }}>{b.icon || '🔔'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '.78rem', fontWeight: 600, color: b.renk || 'var(--text)' }}>{b.baslik}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 2 }}>{b.mesaj}</div>
                  <div style={{ fontSize: '.62rem', color: 'var(--muted)', marginTop: 2 }}>{zamanFormat(b.olusturulma)}</div>
                </div>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={(e) => { e.stopPropagation(); bildirimSil(b.id); }}
                  style={{ padding: '2px 6px', fontSize: '.65rem' }}
                >×</button>
              </div>
            ))}
          </div>
          <div style={{ padding: 10, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <button className="btn btn-sm btn-ghost" onClick={() => { setPage('bildirimler'); setAcik(false); }}>
              Tümünü Gör →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
