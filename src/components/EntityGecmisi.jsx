/**
 * @file components/EntityGecmisi.jsx
 * @description Entity için audit log timeline (son 30 işlem)
 */
import { useEffect, useState } from 'react';
import { logEntityIcin } from '../core/auditLog';
import { useAuthStore } from '../store/auth';

function zamanFark(ts) {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const f = (Date.now() - d.getTime()) / 1000;
  if (f < 60) return 'az önce';
  if (f < 3600) return Math.floor(f / 60) + ' dk önce';
  if (f < 86400) return Math.floor(f / 3600) + ' sa önce';
  return Math.floor(f / 86400) + ' gün önce';
}

const TIP_RENK = {
  create: '#22C55E', update: '#C9A84C', delete: '#EF4444',
  share:  '#1B4F8A', export: '#8B5CF6', login: '#888',
};

export default function EntityGecmisi({ entityTip, entityId }) {
  const { user } = useAuthStore();
  const [liste, setListe] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user?.workspaceId || !entityId) return;
      setYukleniyor(true);
      const l = await logEntityIcin(user.workspaceId, entityTip, entityId);
      setListe(l.slice(0, 30));
      setYukleniyor(false);
    })();
  }, [entityTip, entityId, user?.workspaceId]);

  if (yukleniyor) return <div style={{ padding: 20, color: 'var(--muted)', fontSize: '.78rem' }}>Yükleniyor...</div>;

  if (liste.length === 0) {
    return (
      <div className="empty">
        <div className="empty-ico">📋</div>
        <div className="empty-title">İşlem geçmişi yok</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 8 }}>
      {liste.map((l, i) => {
        const degisenAlanlar = l.fark?.yeni ? Object.keys(l.fark.yeni) : [];
        return (
          <div key={l.id} style={{
            display: 'flex', gap: 10, padding: '10px 0',
            borderBottom: '1px solid rgba(255,255,255,.03)',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: TIP_RENK[l.tip] || '#888',
              marginTop: 6, flexShrink: 0,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '.82rem' }}>
                <b>{l.kullaniciAd || l.kullaniciEmail || '—'}</b>
                {' '}<span style={{ color: TIP_RENK[l.tip] || 'var(--muted)' }}>{l.tip}</span>
                {degisenAlanlar.length > 0 && (
                  <span style={{ color: 'var(--muted)' }}> · {degisenAlanlar.slice(0, 3).join(', ')}{degisenAlanlar.length > 3 ? '...' : ''}</span>
                )}
              </div>
              {degisenAlanlar.length > 0 && (
                <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 3 }}>
                  {degisenAlanlar.slice(0, 3).map(k => (
                    <div key={k}>
                      <b>{k}:</b>{' '}
                      <span style={{ color: 'var(--red)', textDecoration: 'line-through' }}>
                        {JSON.stringify(l.fark.onceki[k]).slice(0, 30)}
                      </span>
                      {' → '}
                      <span style={{ color: 'var(--green)' }}>
                        {JSON.stringify(l.fark.yeni[k]).slice(0, 30)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: '.65rem', color: 'var(--muted)', marginTop: 2 }}>{zamanFark(l.zaman)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
