/**
 * @file components/KiraciDetay.jsx
 * @description Kiracı detay modalı — bilgi, mülkler, ödemeler, hesap özeti tabları
 */
import { useState, useMemo } from 'react';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';
import { kiraciGuncelle } from '../core/kiracilarDb';
import { odemeTlKurus, kiraciBakiyeHesapla } from '../core/odemelerDb';
import HesapOzeti from './HesapOzeti';
import OdemeFormu from './OdemeFormu';

const fmtTL = (kurus) => '₺' + new Intl.NumberFormat('tr-TR').format(Math.round((kurus || 0) / 100));

export default function KiraciDetay({ kiraci, onClose, onSaved }) {
  const { user } = useAuthStore();
  const { kiralar, odemeler, mulkler, toast } = useStore();
  const [tab, setTab] = useState('bilgi');
  const [duzenle, setDuzenle] = useState(false);
  const [form, setForm] = useState(kiraci);
  const [hesapOzeti, setHesapOzeti] = useState(false);
  const [yeniOdeme, setYeniOdeme] = useState(false);
  const ws = user?.workspaceId || 'ws_001';

  const kiraciKiralar = (kiralar || []).filter(k => k.kiraciId === kiraci.id && !k.isDeleted);
  const kiraciOdemeler = (odemeler || []).filter(o => o.kiraciId === kiraci.id && !o.isDeleted);
  const bakiye = useMemo(() => kiraciBakiyeHesapla(kiraciOdemeler), [kiraciOdemeler]);

  const kaydet = async () => {
    try {
      await kiraciGuncelle(ws, user, kiraci.id, form);
      toast('success', 'Kiracı güncellendi');
      setDuzenle(false);
      onSaved?.();
    } catch (e) {
      toast('error', e.message);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const TAB = (id, lbl, ico) => (
    <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{ico} {lbl}</button>
  );

  return (
    <>
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 780, maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-head">
          <div className="modal-title">👤 {kiraci.adSoyad}</div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>×</button>
        </div>

        {/* Bakiye özet bar */}
        <div style={{ padding: '12px 22px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 14 }}>
          <div>
            <div style={{ fontSize: '.66rem', color: 'var(--muted)' }}>Toplam Ödenen</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--green)' }}>{fmtTL(bakiye.toplamOdenenKurus)}</div>
          </div>
          <div>
            <div style={{ fontSize: '.66rem', color: 'var(--muted)' }}>Bekleyen</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--amber)' }}>{fmtTL(bakiye.toplamBeklenenKurus)}</div>
          </div>
          <div>
            <div style={{ fontSize: '.66rem', color: 'var(--muted)' }}>Gecikmiş</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--red)' }}>{fmtTL(bakiye.gecikmisKurus)}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="btn btn-sm btn-gold" onClick={() => setHesapOzeti(true)}>📑 Hesap Özeti</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setYeniOdeme(true)}>+ Ödeme</button>
          </div>
        </div>

        <div className="tabs" style={{ margin: 16 }}>
          {TAB('bilgi', 'Bilgiler', '👤')}
          {TAB('mulk', `Mülkler (${kiraciKiralar.length})`, '🏠')}
          {TAB('odeme', `Ödemeler (${kiraciOdemeler.length})`, '💰')}
        </div>

        <div className="modal-body">
          {tab === 'bilgi' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                {!duzenle ? (
                  <button className="btn btn-sm btn-ghost" onClick={() => setDuzenle(true)}>✏️ Düzenle</button>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => { setForm(kiraci); setDuzenle(false); }}>Vazgeç</button>
                    <button className="btn btn-sm btn-gold" onClick={kaydet}>Kaydet</button>
                  </div>
                )}
              </div>
              {[
                ['adSoyad', 'Ad Soyad'],
                ['firmaAdi', 'Firma Adı'],
                ['telefon', 'Telefon'],
                ['email', 'E-posta'],
                ['tcNo', 'TC Kimlik No'],
                ['vergiNo', 'Vergi No'],
                ['notlar', 'Notlar'],
              ].map(([k, lbl]) => (
                <div className="fgroup" key={k}>
                  <label className="flbl">{lbl}</label>
                  {duzenle ? (
                    k === 'notlar' ? (
                      <textarea className="textarea" rows={3} value={form[k] || ''} onChange={e => set(k, e.target.value)} />
                    ) : (
                      <input className="input" value={form[k] || ''} onChange={e => set(k, e.target.value)} />
                    )
                  ) : (
                    <div style={{ padding: '8px 0', fontSize: '.85rem', color: 'var(--text)' }}>{kiraci[k] || '—'}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'mulk' && (
            kiraciKiralar.length === 0 ? (
              <div className="empty">
                <div className="empty-ico">🏠</div>
                <div className="empty-title">Bu kiracının sözleşmesi yok</div>
              </div>
            ) : kiraciKiralar.map(k => {
              const m = (mulkler || []).find(x => x.id === k.mulkId);
              return (
                <div key={k.id} style={{ background: 'var(--surface2)', padding: 14, borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, color: 'var(--gold)' }}>{m?.ad || '—'}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 2 }}>
                    {k.paraBirim} {((k.aylikKiraKurus || 0) / 100).toLocaleString('tr-TR')}/ay · {k.durum}
                  </div>
                  <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 2 }}>
                    Başlangıç: {k.baslangicTarihi?.toDate ? k.baslangicTarihi.toDate().toLocaleDateString('tr-TR') : (k.baslangicTarihi ? new Date(k.baslangicTarihi).toLocaleDateString('tr-TR') : '—')}
                    {k.bitisTarihi && ' · Bitiş: ' + (k.bitisTarihi?.toDate ? k.bitisTarihi.toDate().toLocaleDateString('tr-TR') : new Date(k.bitisTarihi).toLocaleDateString('tr-TR'))}
                  </div>
                </div>
              );
            })
          )}

          {tab === 'odeme' && (
            kiraciOdemeler.length === 0 ? (
              <div className="empty">
                <div className="empty-ico">💰</div>
                <div className="empty-title">Ödeme kaydı yok</div>
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: '.78rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: 8, textAlign: 'left' }}>Vade</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Tip</th>
                    <th style={{ padding: 8, textAlign: 'right' }}>Tutar</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {[...kiraciOdemeler].sort((a, b) => {
                    const va = a.vadeTarihi?.toDate ? a.vadeTarihi.toDate() : new Date(a.vadeTarihi || 0);
                    const vb = b.vadeTarihi?.toDate ? b.vadeTarihi.toDate() : new Date(b.vadeTarihi || 0);
                    return vb - va;
                  }).map(o => {
                    const v = o.vadeTarihi?.toDate ? o.vadeTarihi.toDate() : new Date(o.vadeTarihi || 0);
                    const renk = o.durum === 'odendi' ? 'var(--green)' : o.durum === 'gecikmis' ? 'var(--red)' : 'var(--amber)';
                    return (
                      <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                        <td style={{ padding: 8 }}>{isNaN(v) ? '—' : v.toLocaleDateString('tr-TR')}</td>
                        <td style={{ padding: 8 }}>{o.tip}</td>
                        <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>{fmtTL(odemeTlKurus(o))}</td>
                        <td style={{ padding: 8 }}>
                          <span style={{ color: renk, fontWeight: 600 }}>{o.durum}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>

    {hesapOzeti && <HesapOzeti kiraci={kiraci} onClose={() => setHesapOzeti(false)} />}
    {yeniOdeme && <OdemeFormu kiraciVarsayilan={kiraci.id} onClose={() => setYeniOdeme(false)} onSaved={onSaved} />}
    </>
  );
}
