/**
 * @file components/KiraFormu.jsx
 * @description Multi-step kira sözleşmesi formu
 * @anayasa K10 — form TL girer, Firestore kuruş saklanır
 */
import { useState } from 'react';
import { useStore } from '../store/app';
import { useAuthStore } from '../store/auth';
import { kiraEkle } from '../core/kiralarDb';
import { kiraciEkle } from '../core/kiracilarDb';
import { odemeEkle } from '../core/odemelerDb';
import { marketKurAl } from '../core/kiraHesap';

const fmtTL = (v) => '₺' + new Intl.NumberFormat('tr-TR').format(v || 0);

export default function KiraFormu({ onClose, onSaved }) {
  const { user } = useAuthStore();
  const { mulkler, kiracilar, marketData, toast } = useStore();
  const ws = user?.workspaceId || 'ws_001';
  const aktifMulkler = (mulkler || []).filter(m => !m.isDeleted);
  const aktifKiracilar = (kiracilar || []).filter(k => !k.isDeleted);

  const [adim, setAdim] = useState(1);
  const [yeniKiraci, setYeniKiraci] = useState(false);
  const [form, setForm] = useState({
    mulkId: '',
    kiraciId: '',
    yeniKiraciVeri: { adSoyad: '', telefon: '', email: '' },
    baslangicTarihi: new Date().toISOString().slice(0, 10),
    bitisTarihi: '',
    aylikKiraTL: 0,
    paraBirim: 'TRY',
    odemeSikligi: 'aylik',
    depozitoTL: 0,
    artisKosulu: 'TUFE',
    artisOrani: 0,
    sozlesmeNo: '',
    notlar: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const ileri = () => {
    if (adim === 1 && !form.mulkId) { toast('error', 'Mülk seçin'); return; }
    if (adim === 2) {
      if (!yeniKiraci && !form.kiraciId) { toast('error', 'Kiracı seçin veya yeni ekleyin'); return; }
      if (yeniKiraci && !form.yeniKiraciVeri.adSoyad) { toast('error', 'Kiracı ad-soyad zorunlu'); return; }
    }
    if (adim === 3 && (!form.aylikKiraTL || !form.baslangicTarihi)) {
      toast('error', 'Tarih ve tutar zorunlu'); return;
    }
    setAdim(adim + 1);
  };

  const kaydet = async () => {
    try {
      // 1) Kiracı oluştur (gerekirse)
      let kiraciId = form.kiraciId;
      if (yeniKiraci) {
        kiraciId = await kiraciEkle(ws, user, form.yeniKiraciVeri);
      }

      // 2) Kira sözleşmesi
      const kurDegeri = form.paraBirim === 'TRY' ? 1 : marketKurAl(marketData, form.paraBirim) || 1;
      const aylikKuruş = Math.round(form.aylikKiraTL * 100);
      const depKuruş = Math.round(form.depozitoTL * 100);

      // Sonraki artış tarihi: başlangıç + 1 yıl (eğer artış koşulu varsa)
      const basTarihi = new Date(form.baslangicTarihi);
      let sonrakiArtis = null;
      if (form.artisKosulu && form.artisKosulu !== 'yok') {
        sonrakiArtis = new Date(basTarihi);
        sonrakiArtis.setFullYear(sonrakiArtis.getFullYear() + 1);
      }

      const kiraId = await kiraEkle(ws, user, {
        mulkId: form.mulkId,
        kiraciId,
        durum: 'dolu',
        baslangicTarihi: basTarihi,
        bitisTarihi: form.bitisTarihi ? new Date(form.bitisTarihi) : null,
        aylikKiraKurus: aylikKuruş,
        paraBirim: form.paraBirim,
        odemeSikligi: form.odemeSikligi,
        depozitoKurus: depKuruş,
        artisKosulu: form.artisKosulu,
        artisOrani: form.artisOrani,
        sonArtisTarihi: null,
        sonrakiArtisTarihi: sonrakiArtis,
        sozlesmeNo: form.sozlesmeNo,
        notlar: form.notlar,
      });

      // 3) İlk ay ödemesi
      await odemeEkle(ws, user, {
        mulkId: form.mulkId,
        kiraciId,
        kiraId,
        tip: 'kira',
        tutarKurus: aylikKuruş,
        paraBirim: form.paraBirim,
        kurDegeri,
        vadeTarihi: new Date(form.baslangicTarihi),
        durum: 'bekliyor',
        aciklama: 'İlk ay kira',
      });

      // 4) Depozito ödemesi (varsa)
      if (depKuruş > 0) {
        await odemeEkle(ws, user, {
          mulkId: form.mulkId,
          kiraciId,
          kiraId,
          tip: 'depozito',
          tutarKurus: depKuruş,
          paraBirim: form.paraBirim,
          kurDegeri,
          vadeTarihi: new Date(form.baslangicTarihi),
          durum: 'bekliyor',
          aciklama: 'Depozito',
        });
      }

      toast('success', 'Kira sözleşmesi oluşturuldu');
      onSaved?.();
      onClose?.();
    } catch (e) {
      toast('error', e.message);
    }
  };

  const mulk = aktifMulkler.find(m => m.id === form.mulkId);
  const kiraci = yeniKiraci ? form.yeniKiraciVeri : aktifKiracilar.find(k => k.id === form.kiraciId);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 600, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-head">
          <div className="modal-title">+ Yeni Kira Sözleşmesi · Adım {adim}/5</div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* Progress */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= adim ? 'var(--gold)' : 'var(--border)',
              }} />
            ))}
          </div>

          {adim === 1 && (
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 600, marginBottom: 10 }}>🏠 Mülk Seç</div>
              {aktifMulkler.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: '.82rem' }}>Önce Mülkler sayfasından mülk eklemelisiniz.</div>
              ) : (
                <div className="fgroup">
                  <select className="select" value={form.mulkId} onChange={e => set('mulkId', e.target.value)}>
                    <option value="">— Seçiniz —</option>
                    {aktifMulkler.map(m => (
                      <option key={m.id} value={m.id}>{m.ad} · {m.il || '—'}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {adim === 2 && (
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 600, marginBottom: 10 }}>👤 Kiracı</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <button className={`btn btn-sm ${!yeniKiraci ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setYeniKiraci(false)}>Mevcut Kiracı</button>
                <button className={`btn btn-sm ${yeniKiraci ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setYeniKiraci(true)}>+ Yeni Kiracı</button>
              </div>
              {!yeniKiraci ? (
                <div className="fgroup">
                  <select className="select" value={form.kiraciId} onChange={e => set('kiraciId', e.target.value)}>
                    <option value="">— Seçiniz —</option>
                    {aktifKiracilar.map(k => (
                      <option key={k.id} value={k.id}>{k.adSoyad} {k.telefon ? '· ' + k.telefon : ''}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className="fgroup">
                    <label className="flbl">Ad Soyad</label>
                    <input className="input" value={form.yeniKiraciVeri.adSoyad} onChange={e => set('yeniKiraciVeri', { ...form.yeniKiraciVeri, adSoyad: e.target.value })} />
                  </div>
                  <div className="fgrid2">
                    <div className="fgroup">
                      <label className="flbl">Telefon</label>
                      <input className="input" value={form.yeniKiraciVeri.telefon} onChange={e => set('yeniKiraciVeri', { ...form.yeniKiraciVeri, telefon: e.target.value })} />
                    </div>
                    <div className="fgroup">
                      <label className="flbl">E-posta</label>
                      <input className="input" type="email" value={form.yeniKiraciVeri.email} onChange={e => set('yeniKiraciVeri', { ...form.yeniKiraciVeri, email: e.target.value })} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {adim === 3 && (
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 600, marginBottom: 10 }}>📅 Tarih & Tutar</div>
              <div className="fgrid2">
                <div className="fgroup">
                  <label className="flbl">Başlangıç</label>
                  <input type="date" className="input" value={form.baslangicTarihi} onChange={e => set('baslangicTarihi', e.target.value)} />
                </div>
                <div className="fgroup">
                  <label className="flbl">Bitiş (ops.)</label>
                  <input type="date" className="input" value={form.bitisTarihi} onChange={e => set('bitisTarihi', e.target.value)} />
                </div>
              </div>
              <div className="fgrid3">
                <div className="fgroup">
                  <label className="flbl">Aylık Kira</label>
                  <input type="number" className="input" value={form.aylikKiraTL} onChange={e => set('aylikKiraTL', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="fgroup">
                  <label className="flbl">Para Birimi</label>
                  <select className="select" value={form.paraBirim} onChange={e => set('paraBirim', e.target.value)}>
                    <option value="TRY">₺ TRY</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                  </select>
                </div>
                <div className="fgroup">
                  <label className="flbl">Ödeme Sıklığı</label>
                  <select className="select" value={form.odemeSikligi} onChange={e => set('odemeSikligi', e.target.value)}>
                    <option value="aylik">Aylık</option>
                    <option value="yillik">Yıllık</option>
                    <option value="ozel">Özel</option>
                  </select>
                </div>
              </div>
              <div className="fgroup">
                <label className="flbl">Depozito ({form.paraBirim})</label>
                <input type="number" className="input" value={form.depozitoTL} onChange={e => set('depozitoTL', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          )}

          {adim === 4 && (
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 600, marginBottom: 10 }}>📈 Artış & Sözleşme</div>
              <div className="fgrid2">
                <div className="fgroup">
                  <label className="flbl">Artış Koşulu</label>
                  <select className="select" value={form.artisKosulu} onChange={e => set('artisKosulu', e.target.value)}>
                    <option value="TUFE">TÜFE</option>
                    <option value="YIYU">YİYÜ</option>
                    <option value="sabit">Sabit Oran</option>
                    <option value="yok">Yok</option>
                  </select>
                </div>
                <div className="fgroup">
                  <label className="flbl">Oran (%)</label>
                  <input type="number" className="input" value={form.artisOrani} onChange={e => set('artisOrani', parseFloat(e.target.value) || 0)} disabled={form.artisKosulu === 'yok'} />
                </div>
              </div>
              <div className="fgroup">
                <label className="flbl">Sözleşme No</label>
                <input className="input" value={form.sozlesmeNo} onChange={e => set('sozlesmeNo', e.target.value)} />
              </div>
              <div className="fgroup">
                <label className="flbl">Notlar</label>
                <textarea className="textarea" rows={3} value={form.notlar} onChange={e => set('notlar', e.target.value)} />
              </div>
              <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>
                💡 Sözleşme PDF yüklemek için: kaydettikten sonra mülk galerisinden "sozlesme" kategorisine yükleyin.
              </div>
            </div>
          )}

          {adim === 5 && (
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 600, marginBottom: 10 }}>✅ Özet</div>
              <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 14, fontSize: '.82rem' }}>
                <div style={{ marginBottom: 6 }}><b>Mülk:</b> {mulk?.ad || '—'}</div>
                <div style={{ marginBottom: 6 }}><b>Kiracı:</b> {kiraci?.adSoyad || '—'}</div>
                <div style={{ marginBottom: 6 }}><b>Başlangıç:</b> {form.baslangicTarihi}</div>
                <div style={{ marginBottom: 6 }}><b>Bitiş:</b> {form.bitisTarihi || 'Belirsiz'}</div>
                <div style={{ marginBottom: 6 }}><b>Aylık Kira:</b> {form.paraBirim} {form.aylikKiraTL.toLocaleString('tr-TR')}</div>
                <div style={{ marginBottom: 6 }}><b>Depozito:</b> {form.paraBirim} {form.depozitoTL.toLocaleString('tr-TR')}</div>
                <div style={{ marginBottom: 6 }}><b>Artış:</b> {form.artisKosulu} {form.artisOrani ? '%' + form.artisOrani : ''}</div>
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          {adim > 1 && <button className="btn btn-ghost" onClick={() => setAdim(adim - 1)}>← Geri</button>}
          <button className="btn btn-ghost" onClick={onClose}>Vazgeç</button>
          {adim < 5 ? (
            <button className="btn btn-gold" onClick={ileri}>İleri →</button>
          ) : (
            <button className="btn btn-gold" onClick={kaydet}>✓ Kaydet</button>
          )}
        </div>
      </div>
    </div>
  );
}
