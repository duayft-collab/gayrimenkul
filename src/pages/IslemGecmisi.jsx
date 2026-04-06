/**
 * @file pages/IslemGecmisi.jsx
 * @description Tüm audit log — filtre, detay diff, CSV export
 */
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { Topbar } from '../components/Layout';
import { logListele } from '../core/auditLog';

const TIP_RENK = {
  create: '#22C55E', update: '#C9A84C', delete: '#EF4444',
  share: '#1B4F8A', export: '#8B5CF6', login: '#888', import: '#8B5CF6',
};

export default function IslemGecmisi() {
  const { user } = useAuthStore();
  const [liste, setListe] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [filtre, setFiltre] = useState({ tip: '', entityTip: '', q: '', bas: '', bit: '' });
  const [detay, setDetay] = useState(null);

  useEffect(() => {
    (async () => {
      if (!user?.workspaceId) return;
      setYukleniyor(true);
      const l = await logListele(user.workspaceId, { limit: 500 });
      setListe(l);
      setYukleniyor(false);
    })();
  }, [user?.workspaceId]);

  const filtreli = useMemo(() => {
    let l = [...liste];
    if (filtre.tip) l = l.filter(x => x.tip === filtre.tip);
    if (filtre.entityTip) l = l.filter(x => x.entityTip === filtre.entityTip);
    if (filtre.q) {
      const q = filtre.q.toLowerCase();
      l = l.filter(x =>
        (x.kullaniciAd || '').toLowerCase().includes(q) ||
        (x.kullaniciEmail || '').toLowerCase().includes(q) ||
        (x.entityAd || '').toLowerCase().includes(q)
      );
    }
    if (filtre.bas) {
      const d = new Date(filtre.bas);
      l = l.filter(x => {
        const t = x.zaman?.toDate ? x.zaman.toDate() : new Date(0);
        return t >= d;
      });
    }
    if (filtre.bit) {
      const d = new Date(filtre.bit + 'T23:59:59');
      l = l.filter(x => {
        const t = x.zaman?.toDate ? x.zaman.toDate() : new Date(0);
        return t <= d;
      });
    }
    return l;
  }, [liste, filtre]);

  const csvIndir = () => {
    const rows = [
      ['Zaman', 'Kullanıcı', 'Tip', 'Entity', 'Ad', 'Değişen Alanlar'],
      ...filtreli.map(l => {
        const t = l.zaman?.toDate ? l.zaman.toDate() : new Date(0);
        const alanlar = l.fark?.yeni ? Object.keys(l.fark.yeni).join(',') : '';
        return [
          isNaN(t) ? '' : t.toLocaleString('tr-TR'),
          l.kullaniciAd || l.kullaniciEmail || '',
          l.tip, l.entityTip || '', l.entityAd || '', alanlar,
        ];
      }),
    ];
    const csv = rows.map(r => r.map(c => String(c).includes(';') ? `"${c}"` : c).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `islem_gecmisi_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Topbar title="📋 İşlem Geçmişi" />
      <div className="page" style={{ paddingBottom: 90 }}>
        <div className="card" style={{ marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto auto', gap: 8, alignItems: 'end' }}>
          <div className="fgroup" style={{ marginBottom: 0 }}>
            <label className="flbl">Arama</label>
            <input className="input" value={filtre.q} onChange={e => setFiltre({ ...filtre, q: e.target.value })} placeholder="Kullanıcı, kayıt adı..." />
          </div>
          <div className="fgroup" style={{ marginBottom: 0 }}>
            <label className="flbl">İşlem Tipi</label>
            <select className="select" value={filtre.tip} onChange={e => setFiltre({ ...filtre, tip: e.target.value })}>
              <option value="">Tümü</option>
              <option value="create">Oluştur</option>
              <option value="update">Güncelle</option>
              <option value="delete">Sil</option>
              <option value="share">Paylaş</option>
              <option value="export">Dışa Aktar</option>
              <option value="import">İçe Aktar</option>
            </select>
          </div>
          <div className="fgroup" style={{ marginBottom: 0 }}>
            <label className="flbl">Entity</label>
            <select className="select" value={filtre.entityTip} onChange={e => setFiltre({ ...filtre, entityTip: e.target.value })}>
              <option value="">Tümü</option>
              <option value="mulk">Mülk</option>
              <option value="kira">Kira</option>
              <option value="kiraci">Kiracı</option>
              <option value="odeme">Ödeme</option>
              <option value="yedek">Yedek</option>
            </select>
          </div>
          <div className="fgroup" style={{ marginBottom: 0 }}>
            <label className="flbl">Başlangıç</label>
            <input type="date" className="input" value={filtre.bas} onChange={e => setFiltre({ ...filtre, bas: e.target.value })} />
          </div>
          <div className="fgroup" style={{ marginBottom: 0 }}>
            <label className="flbl">Bitiş</label>
            <input type="date" className="input" value={filtre.bit} onChange={e => setFiltre({ ...filtre, bit: e.target.value })} />
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setFiltre({ tip: '', entityTip: '', q: '', bas: '', bit: '' })}>Temizle</button>
          <button className="btn btn-gold btn-sm" onClick={csvIndir}>📥 CSV</button>
        </div>

        <div className="card" style={{ padding: 0 }}>
          {yukleniyor ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>Yükleniyor...</div>
          ) : filtreli.length === 0 ? (
            <div className="empty">
              <div className="empty-ico">📋</div>
              <div className="empty-title">İşlem kaydı yok</div>
            </div>
          ) : (
            <table style={{ width: '100%', fontSize: '.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: 10 }}>Zaman</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Kullanıcı</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Tip</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Entity</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Değişiklik</th>
                </tr>
              </thead>
              <tbody>
                {filtreli.slice(0, 200).map(l => {
                  const t = l.zaman?.toDate ? l.zaman.toDate() : new Date(0);
                  const alanlar = l.fark?.yeni ? Object.keys(l.fark.yeni) : [];
                  return (
                    <tr key={l.id}
                      style={{ borderBottom: '1px solid rgba(255,255,255,.03)', cursor: 'pointer' }}
                      onClick={() => setDetay(l)}>
                      <td style={{ padding: 10, fontSize: '.72rem' }}>{isNaN(t) ? '—' : t.toLocaleString('tr-TR')}</td>
                      <td style={{ padding: 10 }}>{l.kullaniciAd || l.kullaniciEmail || '—'}</td>
                      <td style={{ padding: 10 }}>
                        <span style={{ color: TIP_RENK[l.tip] || '#888', fontWeight: 600 }}>{l.tip}</span>
                      </td>
                      <td style={{ padding: 10, fontSize: '.72rem' }}>
                        {l.entityTip && <span className="badge b-muted">{l.entityTip}</span>}
                        <span style={{ marginLeft: 6, color: 'var(--muted)' }}>{l.entityAd || ''}</span>
                      </td>
                      <td style={{ padding: 10, fontSize: '.72rem', color: 'var(--muted)' }}>
                        {alanlar.slice(0, 3).join(', ')}{alanlar.length > 3 ? '...' : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {filtreli.length > 200 && (
            <div style={{ padding: 10, textAlign: 'center', fontSize: '.72rem', color: 'var(--muted)' }}>
              İlk 200 kayıt gösteriliyor — daha fazlası için filtre uygulayın
            </div>
          )}
        </div>
      </div>

      {detay && (
        <div className="modal-bg" onClick={() => setDetay(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 720, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-head">
              <div className="modal-title">🔍 İşlem Detayı</div>
              <button className="btn btn-sm btn-ghost" onClick={() => setDetay(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 14, fontSize: '.78rem' }}>
                <div><b>Kullanıcı:</b> {detay.kullaniciAd} ({detay.kullaniciEmail})</div>
                <div><b>İşlem:</b> {detay.tip} {detay.entityTip ? '· ' + detay.entityTip : ''}</div>
                <div><b>Entity:</b> {detay.entityAd || detay.entityId || '—'}</div>
                <div><b>Zaman:</b> {detay.zaman?.toDate ? detay.zaman.toDate().toLocaleString('tr-TR') : '—'}</div>
                {detay.notlar && <div><b>Not:</b> {detay.notlar}</div>}
              </div>
              {detay.fark && Object.keys(detay.fark.yeni || {}).length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--gold)' }}>Değişiklikler</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: '.68rem', color: 'var(--red)', marginBottom: 4 }}>ÖNCEKİ</div>
                      <pre style={{ background: 'rgba(239,68,68,.05)', padding: 10, borderRadius: 6, fontSize: '.68rem', overflowX: 'auto', maxHeight: 300 }}>
{JSON.stringify(detay.fark.onceki, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div style={{ fontSize: '.68rem', color: 'var(--green)', marginBottom: 4 }}>YENİ</div>
                      <pre style={{ background: 'rgba(34,197,94,.05)', padding: 10, borderRadius: 6, fontSize: '.68rem', overflowX: 'auto', maxHeight: 300 }}>
{JSON.stringify(detay.fark.yeni, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
