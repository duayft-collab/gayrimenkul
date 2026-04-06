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

const fmtTL = (kurus) => '₺' + new Intl.NumberFormat('tr-TR').format(Math.round((kurus || 0) / 100));

export default function Kiracilar() {
  const { user } = useAuthStore();
  const { kiracilar, kiralar, odemeler, toast } = useStore();
  const [ara, setAra] = useState('');
  const [filtre, setFiltre] = useState('tumu'); // tumu | aktif | pasif | borclu
  const [detay, setDetay] = useState(null);
  const [yeni, setYeni] = useState(null);
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
                    <td style={{ padding: 10, textAlign: 'right' }}>
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
