/**
 * @file components/PaylasimModal.jsx
 * @description Mülk paylaşım modalı — link + kullanıcı
 */
import { useEffect, useState } from 'react';
import {
  paylasimLinkOlustur, paylasimKullaniciEkle, paylasimListele, paylasimIptal, paylasimLinkUrl
} from '../core/paylasim';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';

export default function PaylasimModal({ mulk, onClose }) {
  const { user } = useAuthStore();
  const { toast } = useStore();
  const [tab, setTab] = useState('link');
  const [paylasimlar, setPaylasimlar] = useState([]);
  const [sureGun, setSureGun] = useState(30);
  const [yetki, setYetki] = useState('view');
  const [email, setEmail] = useState('');
  const [sonLink, setSonLink] = useState(null);
  const ws = user?.workspaceId || 'ws_001';

  const yukle = async () => {
    if (!mulk?.id) return;
    const list = await paylasimListele(ws, mulk.id);
    setPaylasimlar(list);
  };
  useEffect(() => { yukle(); }, [mulk?.id]);

  const linkOlustur = async () => {
    try {
      const { token } = await paylasimLinkOlustur({
        workspaceId: ws, mulkId: mulk.id, yetki, sureGun, olusturan: user?.name,
      });
      const url = paylasimLinkUrl(token);
      setSonLink(url);
      toast('success', 'Link oluşturuldu');
      yukle();
    } catch (e) {
      toast('error', e.message);
    }
  };

  const kullaniciEkle = async () => {
    if (!email.trim()) { toast('error', 'E-posta gerekli'); return; }
    try {
      await paylasimKullaniciEkle({
        workspaceId: ws, mulkId: mulk.id, email, yetki, olusturan: user?.name,
      });
      setEmail('');
      toast('success', `${email} eklendi`);
      yukle();
    } catch (e) {
      toast('error', e.message);
    }
  };

  const iptal = async (id) => {
    try {
      await paylasimIptal(id);
      toast('success', 'Paylaşım iptal edildi');
      yukle();
    } catch (e) {
      toast('error', e.message);
    }
  };

  const kopyala = (url) => {
    navigator.clipboard.writeText(url).then(() => toast('success', 'Link kopyalandı'));
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 560 }}>
        <div className="modal-head">
          <div className="modal-title">🔗 Paylaş — {mulk?.ad || 'Mülk'}</div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
            <button className={`btn btn-sm ${tab === 'link' ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setTab('link')}>🔗 Link</button>
            <button className={`btn btn-sm ${tab === 'user' ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setTab('user')}>👤 Kullanıcı</button>
          </div>

          {tab === 'link' && (
            <div>
              <div className="fgrid2">
                <div className="fgroup">
                  <label className="flbl">Süre</label>
                  <select className="select" value={sureGun} onChange={e => setSureGun(parseInt(e.target.value))}>
                    <option value={1}>1 gün</option>
                    <option value={7}>7 gün</option>
                    <option value={30}>30 gün</option>
                  </select>
                </div>
                <div className="fgroup">
                  <label className="flbl">Yetki</label>
                  <select className="select" value={yetki} onChange={e => setYetki(e.target.value)}>
                    <option value="view">Görüntüleme</option>
                    <option value="edit">Düzenleme (notlar)</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-gold" onClick={linkOlustur} style={{ width: '100%' }}>🔗 Link Oluştur</button>
              {sonLink && (
                <div style={{ marginTop: 12, padding: 10, background: 'rgba(201,168,76,.1)', borderRadius: 8 }}>
                  <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 4 }}>Yeni link:</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input className="input" value={sonLink} readOnly style={{ fontSize: '.72rem' }} />
                    <button className="btn btn-sm btn-gold" onClick={() => kopyala(sonLink)}>Kopyala</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'user' && (
            <div>
              <div className="fgroup">
                <label className="flbl">E-posta</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ornek@domain.com" />
              </div>
              <div className="fgroup">
                <label className="flbl">Yetki</label>
                <select className="select" value={yetki} onChange={e => setYetki(e.target.value)}>
                  <option value="view">Görüntüleme</option>
                  <option value="edit">Düzenleme</option>
                </select>
              </div>
              <button className="btn btn-gold" onClick={kullaniciEkle} style={{ width: '100%' }}>+ Kullanıcıyı Ekle</button>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: '.82rem', fontWeight: 600, marginBottom: 8 }}>Aktif Paylaşımlar ({paylasimlar.length})</div>
            {paylasimlar.length === 0 ? (
              <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>Henüz paylaşım yok</div>
            ) : (
              paylasimlar.map(p => (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', background: 'var(--surface2)', borderRadius: 6, marginBottom: 5, fontSize: '.75rem',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>
                      {p.tip === 'link' ? '🔗 Link' : `👤 ${p.userEmail}`}
                    </div>
                    <div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>
                      {p.yetki === 'view' ? 'Görüntüleme' : 'Düzenleme'}
                      {p.tip === 'link' && p.token && ' · ' + p.token.slice(0, 8) + '...'}
                    </div>
                  </div>
                  {p.tip === 'link' && (
                    <button className="btn btn-sm btn-ghost" onClick={() => kopyala(paylasimLinkUrl(p.token))}>📋</button>
                  )}
                  <button className="btn btn-sm btn-danger" onClick={() => iptal(p.id)}>İptal</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
