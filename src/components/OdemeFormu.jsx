/**
 * @file components/OdemeFormu.jsx
 * @description Ödeme ekleme/düzenleme modalı
 */
import { useState, useMemo } from 'react';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';
import { odemeEkle, odemeGuncelle } from '../core/odemelerDb';
import { marketKurAl } from '../core/kiraHesap';

export default function OdemeFormu({ mevcut, kiraciVarsayilan, onClose, onSaved }) {
  const { user } = useAuthStore();
  const { mulkler, kiracilar, marketData, toast } = useStore();
  const ws = user?.workspaceId || 'ws_001';

  const [form, setForm] = useState(() => {
    if (mevcut) {
      return {
        ...mevcut,
        tutarTL: (mevcut.tutarKurus || 0) / 100,
        vadeTarihi: mevcut.vadeTarihi?.toDate
          ? mevcut.vadeTarihi.toDate().toISOString().slice(0, 10)
          : (mevcut.vadeTarihi ? new Date(mevcut.vadeTarihi).toISOString().slice(0, 10) : ''),
        odemeTarihi: mevcut.odemeTarihi?.toDate
          ? mevcut.odemeTarihi.toDate().toISOString().slice(0, 10)
          : '',
      };
    }
    return {
      tip: 'kira',
      kiraciId: kiraciVarsayilan || '',
      mulkId: '',
      kiraId: null,
      tutarTL: 0,
      paraBirim: 'TRY',
      vadeTarihi: new Date().toISOString().slice(0, 10),
      odemeTarihi: '',
      durum: 'bekliyor',
      odemeYontemi: 'havale',
      aciklama: '',
    };
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const kayitliKiracilar = (kiracilar || []).filter(k => !k.isDeleted);
  const aktifMulkler = (mulkler || []).filter(m => !m.isDeleted);

  const kaydet = async () => {
    try {
      const kurDegeri = form.paraBirim === 'TRY' ? 1 : marketKurAl(marketData, form.paraBirim) || 1;
      const payload = {
        mulkId: form.mulkId || null,
        kiraciId: form.kiraciId || null,
        kiraId: form.kiraId || null,
        tip: form.tip,
        tutarKurus: Math.round(form.tutarTL * 100),
        paraBirim: form.paraBirim,
        kurDegeri,
        vadeTarihi: form.vadeTarihi ? new Date(form.vadeTarihi) : null,
        odemeTarihi: form.odemeTarihi ? new Date(form.odemeTarihi) : null,
        durum: form.durum,
        odemeYontemi: form.odemeYontemi,
        aciklama: form.aciklama,
      };
      if (mevcut?.id) {
        await odemeGuncelle(ws, user, mevcut.id, payload);
        toast('success', 'Ödeme güncellendi');
      } else {
        await odemeEkle(ws, user, payload);
        toast('success', 'Ödeme eklendi');
      }
      onSaved?.();
      onClose?.();
    } catch (e) {
      toast('error', e.message);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 520 }}>
        <div className="modal-head">
          <div className="modal-title">{mevcut ? '✏️ Ödemeyi Düzenle' : '+ Yeni Ödeme'}</div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="fgrid2">
            <div className="fgroup">
              <label className="flbl">Tip</label>
              <select className="select" value={form.tip} onChange={e => set('tip', e.target.value)}>
                <option value="kira">Kira</option>
                <option value="depozito">Depozito</option>
                <option value="aidat">Aidat</option>
                <option value="gider">Gider</option>
                <option value="diger">Diğer</option>
              </select>
            </div>
            <div className="fgroup">
              <label className="flbl">Durum</label>
              <select className="select" value={form.durum} onChange={e => set('durum', e.target.value)}>
                <option value="bekliyor">Bekliyor</option>
                <option value="odendi">Ödendi</option>
                <option value="gecikmis">Gecikmiş</option>
                <option value="kismi">Kısmi</option>
              </select>
            </div>
          </div>
          <div className="fgrid2">
            <div className="fgroup">
              <label className="flbl">Kiracı</label>
              <select className="select" value={form.kiraciId} onChange={e => set('kiraciId', e.target.value)}>
                <option value="">— Seç —</option>
                {kayitliKiracilar.map(k => <option key={k.id} value={k.id}>{k.adSoyad}</option>)}
              </select>
            </div>
            <div className="fgroup">
              <label className="flbl">Mülk</label>
              <select className="select" value={form.mulkId} onChange={e => set('mulkId', e.target.value)}>
                <option value="">— Seç —</option>
                {aktifMulkler.map(m => <option key={m.id} value={m.id}>{m.ad}</option>)}
              </select>
            </div>
          </div>
          <div className="fgrid3">
            <div className="fgroup">
              <label className="flbl">Tutar</label>
              <input type="number" className="input" value={form.tutarTL} onChange={e => set('tutarTL', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="fgroup">
              <label className="flbl">Para</label>
              <select className="select" value={form.paraBirim} onChange={e => set('paraBirim', e.target.value)}>
                <option value="TRY">₺</option>
                <option value="USD">$</option>
                <option value="EUR">€</option>
              </select>
            </div>
            <div className="fgroup">
              <label className="flbl">Yöntem</label>
              <select className="select" value={form.odemeYontemi} onChange={e => set('odemeYontemi', e.target.value)}>
                <option value="havale">Havale</option>
                <option value="eft">EFT</option>
                <option value="nakit">Nakit</option>
                <option value="kart">Kart</option>
                <option value="cek">Çek</option>
                <option value="senet">Senet</option>
              </select>
            </div>
          </div>
          <div className="fgrid2">
            <div className="fgroup">
              <label className="flbl">Vade Tarihi</label>
              <input type="date" className="input" value={form.vadeTarihi} onChange={e => set('vadeTarihi', e.target.value)} />
            </div>
            <div className="fgroup">
              <label className="flbl">Ödeme Tarihi</label>
              <input type="date" className="input" value={form.odemeTarihi} onChange={e => set('odemeTarihi', e.target.value)} />
            </div>
          </div>
          <div className="fgroup">
            <label className="flbl">Açıklama</label>
            <input className="input" value={form.aciklama} onChange={e => set('aciklama', e.target.value)} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Vazgeç</button>
          <button className="btn btn-gold" onClick={kaydet}>Kaydet</button>
        </div>
      </div>
    </div>
  );
}
