/**
 * @file components/GiderModal.jsx
 * @description Mülk gider ekleme modalı + dekont upload
 */
import { useState, useRef } from 'react';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';
import { giderEkle, KATEGORILER } from '../core/vergiGider';
import { mulkDosyaYukle } from '../core/storage';

export default function GiderModal({ onClose, onSaved, mulkId: defaultMulkId }) {
  const { user } = useAuthStore();
  const { mulkler, toast } = useStore();
  const ws = user?.workspaceId;
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    mulkId: defaultMulkId || '',
    kategori: 'tamir',
    tutarTL: '',
    tarih: new Date().toISOString().slice(0, 10),
    aciklama: '',
  });
  const [dekont, setDekont] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const dosyaSec = async (f) => {
    if (!f) return;
    setYukleniyor(true);
    try {
      const r = await mulkDosyaYukle(ws, form.mulkId || 'genel', f, 'fatura');
      setDekont(r);
      toast('success', 'Dekont yüklendi');
    } catch (e) {
      toast('error', e.message);
    } finally {
      setYukleniyor(false);
    }
  };

  const kaydet = async () => {
    if (!form.mulkId) { toast('error', 'Mülk seç'); return; }
    if (!form.tutarTL || parseFloat(form.tutarTL) <= 0) { toast('error', 'Tutar girin'); return; }
    try {
      await giderEkle(ws, user, {
        mulkId: form.mulkId,
        kategori: form.kategori,
        tutarKurus: Math.round(parseFloat(form.tutarTL) * 100),
        tarih: new Date(form.tarih),
        aciklama: form.aciklama,
        dekontUrl: dekont?.url || null,
      });
      toast('success', 'Gider eklendi');
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
          <div className="modal-title">+ Yeni Gider</div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="fgrid2">
            <div className="fgroup">
              <label className="flbl">Mülk *</label>
              <select className="select" value={form.mulkId} onChange={e => setForm({ ...form, mulkId: e.target.value })}>
                <option value="">— Seçiniz —</option>
                {(mulkler || []).filter(m => !m.isDeleted).map(m => (
                  <option key={m.id} value={m.id}>{m.ad || m.id.slice(0, 8)}</option>
                ))}
              </select>
            </div>
            <div className="fgroup">
              <label className="flbl">Kategori</label>
              <select className="select" value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })}>
                {KATEGORILER.map(k => <option key={k.v} value={k.v}>{k.l}</option>)}
              </select>
            </div>
          </div>
          <div className="fgrid2">
            <div className="fgroup">
              <label className="flbl">Tutar (₺) *</label>
              <input type="number" step="0.01" className="input" value={form.tutarTL} onChange={e => setForm({ ...form, tutarTL: e.target.value })} />
            </div>
            <div className="fgroup">
              <label className="flbl">Tarih</label>
              <input type="date" className="input" value={form.tarih} onChange={e => setForm({ ...form, tarih: e.target.value })} />
            </div>
          </div>
          <div className="fgroup">
            <label className="flbl">Açıklama</label>
            <input className="input" value={form.aciklama} onChange={e => setForm({ ...form, aciklama: e.target.value })} placeholder="Örn: Klima bakımı..." />
          </div>
          <div className="fgroup">
            <label className="flbl">Dekont (opsiyonel)</label>
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={yukleniyor || !form.mulkId}>
              {yukleniyor ? '⏳ Yükleniyor...' : dekont ? '✓ ' + dekont.ad : '📎 Dekont Yükle'}
            </button>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => dosyaSec(e.target.files?.[0])} />
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
