/**
 * @file pages/Odemeler.jsx
 * @description Ödeme listesi — filtre, toplu işlemler, KPI özet, export
 */
import { useState, useMemo } from 'react';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';
import { Topbar } from '../components/Layout';
import OdemeFormu from '../components/OdemeFormu';
import {
  odemeTlKurus, odemeOdendiIsaretle, gecikmisFiltre, yaklasanFiltre, odemeSil
} from '../core/odemelerDb';

const fmtTL = (kurus) => '₺' + new Intl.NumberFormat('tr-TR').format(Math.round((kurus || 0) / 100));

const DURUM_RENK = {
  odendi:   'var(--green)',
  bekliyor: 'var(--amber)',
  gecikmis: 'var(--red)',
  kismi:    'var(--blue2)',
};

export default function Odemeler() {
  const { user } = useAuthStore();
  const { odemeler, kiracilar, mulkler, toast } = useStore();
  const ws = user?.workspaceId || 'ws_001';
  const [filtre, setFiltre] = useState({ tip: '', durum: '', kiraci: '', mulk: '', bas: '', bit: '' });
  const [secimler, setSecimler] = useState([]);
  const [duzenle, setDuzenle] = useState(null);
  const [yeni, setYeni] = useState(false);

  const aktif = useMemo(() => (odemeler || []).filter(o => !o.isDeleted), [odemeler]);

  // Gecikmis auto-update — bekliyor + vadesi geçmiş olanları 'gecikmis' göster
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
  const statusHesap = (o) => {
    if (o.durum === 'odendi' || o.durum === 'kismi') return o.durum;
    const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi || 0);
    if (v < bugun) return 'gecikmis';
    return 'bekliyor';
  };

  const filtreli = useMemo(() => {
    let l = [...aktif];
    if (filtre.tip) l = l.filter(o => o.tip === filtre.tip);
    if (filtre.durum) l = l.filter(o => statusHesap(o) === filtre.durum);
    if (filtre.kiraci) l = l.filter(o => o.kiraciId === filtre.kiraci);
    if (filtre.mulk) l = l.filter(o => o.mulkId === filtre.mulk);
    if (filtre.bas) {
      const d = new Date(filtre.bas);
      l = l.filter(o => {
        const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi || 0);
        return v >= d;
      });
    }
    if (filtre.bit) {
      const d = new Date(filtre.bit + 'T23:59:59');
      l = l.filter(o => {
        const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi || 0);
        return v <= d;
      });
    }
    return l.sort((a, b) => {
      const va = a.vadeTarihi?.toDate ? a.vadeTarihi.toDate() : new Date(a.vadeTarihi || 0);
      const vb = b.vadeTarihi?.toDate ? b.vadeTarihi.toDate() : new Date(b.vadeTarihi || 0);
      return vb - va;
    });
  }, [aktif, filtre]);

  // KPI özet
  const ayBaslangic = new Date(); ayBaslangic.setDate(1); ayBaslangic.setHours(0, 0, 0, 0);
  const ayBitis = new Date(ayBaslangic); ayBitis.setMonth(ayBitis.getMonth() + 1);
  const buAy = aktif.filter(o => {
    const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi || 0);
    return v >= ayBaslangic && v < ayBitis;
  });
  const beklenen = buAy.reduce((a, o) => a + odemeTlKurus(o), 0);
  const tahsil = buAy.filter(o => o.durum === 'odendi').reduce((a, o) => a + odemeTlKurus(o), 0);
  const gecikmis = gecikmisFiltre(aktif).reduce((a, o) => a + odemeTlKurus(o), 0);
  const toplamAlacak = aktif.filter(o => o.durum !== 'odendi').reduce((a, o) => a + odemeTlKurus(o), 0);

  const toggleSec = (id) => {
    setSecimler(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const topluOdendi = async () => {
    if (secimler.length === 0) { toast('error', 'Seçim yok'); return; }
    try {
      for (const id of secimler) {
        await odemeOdendiIsaretle(ws, user, id, { odemeYontemi: 'havale', odemeTarihi: new Date() });
      }
      toast('success', `${secimler.length} ödeme ödendi işaretlendi`);
      setSecimler([]);
    } catch (e) {
      toast('error', e.message);
    }
  };

  const tekOdendi = async (o) => {
    try {
      await odemeOdendiIsaretle(ws, user, o.id, { odemeYontemi: 'havale', odemeTarihi: new Date() });
      toast('success', 'Ödendi işaretlendi');
    } catch (e) {
      toast('error', e.message);
    }
  };

  const sil = async (o) => {
    try {
      await odemeSil(ws, user, o.id);
      toast('warning', 'Ödeme silindi');
    } catch (e) {
      toast('error', e.message);
    }
  };

  const kiraciAdi = (id) => (kiracilar || []).find(k => k.id === id)?.adSoyad || '—';
  const mulkAdi = (id) => (mulkler || []).find(m => m.id === id)?.ad || '—';

  const csvIndir = () => {
    const satirlar = [
      ['Vade', 'Kiracı', 'Mülk', 'Tip', 'Tutar (TL)', 'Durum', 'Yöntem'],
      ...filtreli.map(o => {
        const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi || 0);
        return [
          isNaN(v) ? '' : v.toLocaleDateString('tr-TR'),
          kiraciAdi(o.kiraciId), mulkAdi(o.mulkId),
          o.tip, (odemeTlKurus(o) / 100).toFixed(2),
          statusHesap(o), o.odemeYontemi,
        ];
      }),
    ];
    const csv = satirlar.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `odemeler_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Topbar title="💰 Ödemeler" />
      <div className="page" style={{ paddingBottom: 90 }}>
        {/* KPI */}
        <div className="g4" style={{ marginBottom: 14 }}>
          <div className="kpi" style={{ '--kc': 'var(--blue2)' }}>
            <div className="kpi-lbl">Bu Ay Beklenen</div>
            <div className="kpi-val" style={{ color: 'var(--blue2)' }}>{fmtTL(beklenen)}</div>
          </div>
          <div className="kpi" style={{ '--kc': 'var(--green)' }}>
            <div className="kpi-lbl">Bu Ay Tahsil</div>
            <div className="kpi-val" style={{ color: 'var(--green)' }}>{fmtTL(tahsil)}</div>
            <div className="kpi-sub" style={{ color: 'var(--muted)' }}>%{beklenen > 0 ? Math.round(tahsil / beklenen * 100) : 0}</div>
          </div>
          <div className="kpi" style={{ '--kc': 'var(--red)' }}>
            <div className="kpi-lbl">Gecikmiş</div>
            <div className="kpi-val" style={{ color: 'var(--red)' }}>{fmtTL(gecikmis)}</div>
          </div>
          <div className="kpi" style={{ '--kc': 'var(--amber)' }}>
            <div className="kpi-lbl">Toplam Alacak</div>
            <div className="kpi-val" style={{ color: 'var(--amber)' }}>{fmtTL(toplamAlacak)}</div>
          </div>
        </div>

        {/* Filtre */}
        <div className="card" style={{ marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr) auto', gap: 8, alignItems: 'end' }}>
          <div className="fgroup" style={{ marginBottom: 0 }}>
            <label className="flbl">Tip</label>
            <select className="select" value={filtre.tip} onChange={e => setFiltre({ ...filtre, tip: e.target.value })}>
              <option value="">Tümü</option>
              <option value="kira">Kira</option>
              <option value="depozito">Depozito</option>
              <option value="aidat">Aidat</option>
              <option value="gider">Gider</option>
              <option value="diger">Diğer</option>
            </select>
          </div>
          <div className="fgroup" style={{ marginBottom: 0 }}>
            <label className="flbl">Durum</label>
            <select className="select" value={filtre.durum} onChange={e => setFiltre({ ...filtre, durum: e.target.value })}>
              <option value="">Tümü</option>
              <option value="bekliyor">Bekliyor</option>
              <option value="odendi">Ödendi</option>
              <option value="gecikmis">Gecikmiş</option>
              <option value="kismi">Kısmi</option>
            </select>
          </div>
          <div className="fgroup" style={{ marginBottom: 0 }}>
            <label className="flbl">Kiracı</label>
            <select className="select" value={filtre.kiraci} onChange={e => setFiltre({ ...filtre, kiraci: e.target.value })}>
              <option value="">Tümü</option>
              {(kiracilar || []).filter(k => !k.isDeleted).map(k => <option key={k.id} value={k.id}>{k.adSoyad}</option>)}
            </select>
          </div>
          <div className="fgroup" style={{ marginBottom: 0 }}>
            <label className="flbl">Mülk</label>
            <select className="select" value={filtre.mulk} onChange={e => setFiltre({ ...filtre, mulk: e.target.value })}>
              <option value="">Tümü</option>
              {(mulkler || []).filter(m => !m.isDeleted).map(m => <option key={m.id} value={m.id}>{m.ad}</option>)}
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
          <button className="btn btn-ghost btn-sm" onClick={() => setFiltre({ tip: '', durum: '', kiraci: '', mulk: '', bas: '', bit: '' })}>Temizle</button>
        </div>

        {/* Aksiyon bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <button className="btn btn-gold btn-sm" onClick={() => setYeni(true)}>+ Ödeme Ekle</button>
          <button className="btn btn-primary btn-sm" onClick={topluOdendi} disabled={secimler.length === 0}>
            ✓ Seçilileri Ödendi ({secimler.length})
          </button>
          <button className="btn btn-ghost btn-sm" onClick={csvIndir} style={{ marginLeft: 'auto' }}>📥 CSV</button>
        </div>

        {/* Liste */}
        <div className="card" style={{ padding: 0 }}>
          {filtreli.length === 0 ? (
            <div className="empty">
              <div className="empty-ico">💰</div>
              <div className="empty-title">Ödeme kaydı yok</div>
            </div>
          ) : (
            <table style={{ width: '100%', fontSize: '.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 10, width: 30 }}>
                    <input type="checkbox"
                      checked={secimler.length === filtreli.length && filtreli.length > 0}
                      onChange={e => setSecimler(e.target.checked ? filtreli.map(o => o.id) : [])}
                    />
                  </th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Vade</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Kiracı</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Mülk</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Tip</th>
                  <th style={{ textAlign: 'right', padding: 10 }}>Tutar</th>
                  <th style={{ padding: 10 }}>Durum</th>
                  <th style={{ padding: 10 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtreli.map(o => {
                  const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi || 0);
                  const durum = statusHesap(o);
                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                      <td style={{ padding: 10 }}>
                        <input type="checkbox" checked={secimler.includes(o.id)} onChange={() => toggleSec(o.id)} />
                      </td>
                      <td style={{ padding: 10, color: durum === 'gecikmis' ? 'var(--red)' : 'var(--text)' }}>
                        {isNaN(v) ? '—' : v.toLocaleDateString('tr-TR')}
                      </td>
                      <td style={{ padding: 10 }}>{kiraciAdi(o.kiraciId)}</td>
                      <td style={{ padding: 10, fontSize: '.72rem', color: 'var(--muted)' }}>{mulkAdi(o.mulkId)}</td>
                      <td style={{ padding: 10, fontSize: '.72rem' }}>{o.tip}</td>
                      <td style={{ padding: 10, textAlign: 'right', fontWeight: 600 }}>{fmtTL(odemeTlKurus(o))}</td>
                      <td style={{ padding: 10 }}>
                        <span style={{ color: DURUM_RENK[durum], fontWeight: 600, fontSize: '.72rem' }}>{durum}</span>
                      </td>
                      <td style={{ padding: 10, textAlign: 'right' }}>
                        {durum !== 'odendi' && <button className="btn btn-sm btn-gold" onClick={() => tekOdendi(o)} style={{ padding: '3px 8px' }}>✓</button>}
                        <button className="btn btn-sm btn-ghost" onClick={() => setDuzenle(o)} style={{ padding: '3px 6px' }}>✏️</button>
                        <button className="btn btn-sm btn-danger" onClick={() => sil(o)} style={{ padding: '3px 6px' }}>×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {yeni && <OdemeFormu onClose={() => setYeni(false)} />}
      {duzenle && <OdemeFormu mevcut={duzenle} onClose={() => setDuzenle(null)} />}
    </div>
  );
}
