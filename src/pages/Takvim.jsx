/**
 * @file pages/Takvim.jsx
 * @description Aylık takvim — kira vadesi, sözleşme, bakım, ödeme, notlar
 */
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';
import { Topbar } from '../components/Layout';
import {
  olayEkle, olayGuncelle, olaySil, olayListele, olaylariGrupla, olayDurum,
  OLAY_TIPI, bildirimIzniIste, yakinOlaylariBildir
} from '../core/takvim';

const AY_ADLARI = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const GUN_ADLARI = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

export default function Takvim() {
  const { user } = useAuthStore();
  const { toast } = useStore();
  const [olaylar, setOlaylar] = useState([]);
  const [yil, setYil] = useState(new Date().getFullYear());
  const [ay, setAy] = useState(new Date().getMonth());
  const [modal, setModal] = useState(null);
  const ws = user?.workspaceId || 'ws_001';

  const yukle = async () => {
    const list = await olayListele(ws);
    setOlaylar(list);
  };
  useEffect(() => { yukle(); }, [ws]);
  useEffect(() => {
    bildirimIzniIste().then((ok) => {
      if (ok) yakinOlaylariBildir(olaylar);
    });
  }, [olaylar]);

  const grupli = useMemo(() => olaylariGrupla(olaylar, yil, ay), [olaylar, yil, ay]);

  const ilkGun = new Date(yil, ay, 1);
  const gunSayisi = new Date(yil, ay + 1, 0).getDate();
  const baslangicHafta = (ilkGun.getDay() + 6) % 7; // Pzt = 0

  const hucreler = [];
  for (let i = 0; i < baslangicHafta; i++) hucreler.push(null);
  for (let g = 1; g <= gunSayisi; g++) hucreler.push(g);
  while (hucreler.length % 7 !== 0) hucreler.push(null);

  const onceki = () => {
    if (ay === 0) { setAy(11); setYil(yil - 1); }
    else setAy(ay - 1);
  };
  const sonraki = () => {
    if (ay === 11) { setAy(0); setYil(yil + 1); }
    else setAy(ay + 1);
  };

  const yeniOlay = (g) => {
    const tarih = new Date(yil, ay, g);
    setModal({ tarih: tarih.toISOString().slice(0, 10), tip: 'not', baslik: '', not: '', tekrar: 'once' });
  };

  const kaydet = async () => {
    if (!modal.baslik) { toast('error', 'Başlık gerekli'); return; }
    try {
      const payload = {
        tip: modal.tip,
        baslik: modal.baslik,
        not: modal.not || '',
        tarih: new Date(modal.tarih),
        tekrar: modal.tekrar,
        mulkId: modal.mulkId || null,
      };
      if (modal.id) await olayGuncelle(modal.id, payload);
      else await olayEkle(ws, payload);
      toast('success', 'Kaydedildi');
      setModal(null);
      yukle();
    } catch (e) {
      toast('error', e.message);
    }
  };

  const sil = async () => {
    if (!modal.id) { setModal(null); return; }
    try {
      await olaySil(modal.id, user?.name);
      toast('success', 'Silindi');
      setModal(null);
      yukle();
    } catch (e) {
      toast('error', e.message);
    }
  };

  const tamamla = async (o) => {
    try {
      await olayGuncelle(o.id, { tamamlandi: !o.tamamlandi });
      yukle();
    } catch (e) {
      toast('error', e.message);
    }
  };

  const durumRenk = {
    tamamlandi: 'rgba(136,136,136,.2)',
    gecmis:     'rgba(180,40,40,.3)',
    bugun:      'rgba(239,68,68,.25)',
    yakin:      'rgba(245,158,11,.2)',
    ileride:    'transparent',
  };

  return (
    <div>
      <Topbar title="📅 Takvim" />
      <div className="page" style={{ paddingBottom: 90 }}>
        <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-sm btn-ghost" onClick={onceki}>◀</button>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--gold)', minWidth: 180, textAlign: 'center' }}>
            {AY_ADLARI[ay]} {yil}
          </div>
          <button className="btn btn-sm btn-ghost" onClick={sonraki}>▶</button>
          <button className="btn btn-sm btn-ghost" onClick={() => { setAy(new Date().getMonth()); setYil(new Date().getFullYear()); }}>Bugün</button>
          <div style={{ marginLeft: 'auto', fontSize: '.75rem', color: 'var(--muted)' }}>
            {olaylar.length} toplam olay
          </div>
          <button className="btn btn-sm btn-gold" onClick={() => yeniOlay(new Date().getDate())}>+ Olay</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {GUN_ADLARI.map(g => (
            <div key={g} style={{ textAlign: 'center', fontSize: '.72rem', fontWeight: 600, color: 'var(--muted)', padding: 6 }}>{g}</div>
          ))}
          {hucreler.map((g, i) => {
            if (g === null) return <div key={i} />;
            const anahtar = `${yil}-${ay}-${g}`;
            const olaylariBu = grupli[anahtar] || [];
            const bugun = new Date();
            const bugunMu = bugun.getFullYear() === yil && bugun.getMonth() === ay && bugun.getDate() === g;
            return (
              <div key={i} style={{
                background: 'var(--surface)', border: `1px solid ${bugunMu ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: 8, padding: 8, minHeight: 90, cursor: 'pointer',
                position: 'relative', overflow: 'hidden',
              }} onClick={() => yeniOlay(g)}>
                <div style={{ fontSize: '.78rem', fontWeight: bugunMu ? 700 : 500, color: bugunMu ? 'var(--gold)' : 'var(--text)' }}>{g}</div>
                <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {olaylariBu.slice(0, 3).map(o => {
                    const durum = olayDurum(o);
                    const tip = OLAY_TIPI[o.tip] || OLAY_TIPI.not;
                    return (
                      <div key={o.id}
                        onClick={(e) => { e.stopPropagation(); setModal({ ...o, tarih: (o.tarih?.toDate ? o.tarih.toDate() : new Date(o.tarih)).toISOString().slice(0, 10) }); }}
                        style={{
                          fontSize: '.66rem', padding: '2px 4px', borderRadius: 3,
                          background: durumRenk[durum] || 'transparent',
                          borderLeft: `2px solid ${tip.renk}`,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          textDecoration: o.tamamlandi ? 'line-through' : 'none',
                        }}>
                        {tip.emoji} {o.baslik}
                      </div>
                    );
                  })}
                  {olaylariBu.length > 3 && (
                    <div style={{ fontSize: '.6rem', color: 'var(--muted)' }}>+{olaylariBu.length - 3} daha</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modal && (
        <div className="modal-bg" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
            <div className="modal-head">
              <div className="modal-title">{modal.id ? '✏️ Olayı Düzenle' : '+ Yeni Olay'}</div>
              <button className="btn btn-sm btn-ghost" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="fgrid2">
                <div className="fgroup">
                  <label className="flbl">Tarih</label>
                  <input type="date" className="input" value={modal.tarih} onChange={e => setModal({ ...modal, tarih: e.target.value })} />
                </div>
                <div className="fgroup">
                  <label className="flbl">Tip</label>
                  <select className="select" value={modal.tip} onChange={e => setModal({ ...modal, tip: e.target.value })}>
                    {Object.entries(OLAY_TIPI).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {v.ad}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="fgroup">
                <label className="flbl">Başlık</label>
                <input className="input" value={modal.baslik} onChange={e => setModal({ ...modal, baslik: e.target.value })} />
              </div>
              <div className="fgroup">
                <label className="flbl">Not</label>
                <textarea className="textarea" rows={3} value={modal.not || ''} onChange={e => setModal({ ...modal, not: e.target.value })} />
              </div>
              <div className="fgroup">
                <label className="flbl">Tekrar</label>
                <select className="select" value={modal.tekrar} onChange={e => setModal({ ...modal, tekrar: e.target.value })}>
                  <option value="once">Bir kez</option>
                  <option value="monthly">Her ay</option>
                  <option value="yearly">Her yıl</option>
                </select>
              </div>
              {modal.id && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.82rem' }}>
                  <input type="checkbox" checked={!!modal.tamamlandi} onChange={e => setModal({ ...modal, tamamlandi: e.target.checked })} />
                  Tamamlandı
                </label>
              )}
            </div>
            <div className="modal-foot">
              {modal.id && <button className="btn btn-danger" onClick={sil}>Sil</button>}
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Vazgeç</button>
              <button className="btn btn-gold" onClick={kaydet}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
