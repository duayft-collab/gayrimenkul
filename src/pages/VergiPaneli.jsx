/**
 * @file pages/VergiPaneli.jsx
 * @description Vergi Komuta Merkezi 2026 — 8 sekmeli vergi paneli
 */
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';
import { Topbar } from '../components/Layout';
import { portfoyVergiOzeti, ISTISNA_YIL } from '../core/vergiHesap';
import { karsilastirma, giderListele, giderSil, KATEGORILER } from '../core/vergiGider';
import { beyannameTaslakOlustur, beyannamePdfUret, beyannameCsvUret, beyannameXmlUret } from '../core/vergiBeyanname';
import { vergiTakvimYili, yaklasanVadeler, gecikmisVadeler, vadeGecikmeFaizi, takvimSync } from '../core/vergiTakvim';
import { senaryoKiraArtis, senaryoMulkAl, senaryo5Yil } from '../core/vergiSenaryo';
import { paketOlustur, paketIndir, muhasebeciMaiGonder, muhasebeciEmailGetir } from '../core/vergiPaket';
import GiderModal from '../components/GiderModal';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend
} from 'recharts';

const fmtTL = (kurus) => {
  if (kurus == null) return '—';
  const tl = Math.round((kurus || 0) / 100);
  return '₺' + new Intl.NumberFormat('tr-TR').format(tl);
};
const fmtTLDetay = (kurus) => {
  if (kurus == null) return '—';
  return '₺' + new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format((kurus || 0) / 100);
};

const yilSecenekleri = () => {
  const bugun = new Date().getFullYear();
  return [bugun - 2, bugun - 1, bugun, bugun + 1].reverse();
};

export default function VergiPaneli() {
  const { user } = useAuthStore();
  const { mulkler, toast } = useStore();
  const ws = user?.workspaceId;

  const [yil, setYil] = useState(new Date().getFullYear());
  const [tab, setTab] = useState('ozet');
  const [ozet, setOzet] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [giderModal, setGiderModal] = useState(false);
  const [giderListesi, setGiderListesi] = useState([]);

  const yukle = async () => {
    if (!ws) return;
    setYukleniyor(true);
    try {
      const r = await portfoyVergiOzeti(ws, yil);
      setOzet(r);
      const g = await giderListele(ws, null, yil);
      setGiderListesi(g);
    } catch (e) {
      toast('error', e.message);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => { yukle(); }, [ws, yil]);

  /* Yıl başında takvim sync */
  useEffect(() => {
    if (ws) takvimSync(ws, yil).catch(() => {});
  }, [ws, yil]);

  return (
    <div>
      <Topbar title={`📊 Vergi Komuta Merkezi ${yil}`} />
      <div className="page" style={{ paddingBottom: 100 }}>
        {/* Üst bar */}
        <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--gold)' }}>
            📊 Vergi Yılı
          </div>
          <select className="select" value={yil} onChange={e => setYil(parseInt(e.target.value))} style={{ width: 110 }}>
            {yilSecenekleri().map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div style={{ marginLeft: 'auto', fontSize: '.7rem', color: 'var(--muted)' }}>
            İstisna {yil}: <b style={{ color: 'var(--gold)' }}>{fmtTL(ISTISNA_YIL[yil] || 4_700_000)}</b>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={yukle}>🔄 Yenile</button>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ overflowX: 'auto' }}>
          {[
            ['ozet',         '📊 Özet'],
            ['mulk',         '🏠 Mülk Bazlı'],
            ['giderler',     '💸 Giderler'],
            ['optimizasyon', '⚖️ Optimizasyon'],
            ['beyanname',    '📋 Beyanname'],
            ['takvim',       '📅 Takvim'],
            ['senaryo',      '🎯 Senaryo'],
            ['musavir',      '👤 Müşavir'],
          ].map(([id, lbl]) => (
            <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{lbl}</button>
          ))}
        </div>

        {yukleniyor && <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>Hesaplanıyor...</div>}

        {!yukleniyor && tab === 'ozet' && <TabOzet ozet={ozet} yil={yil} />}
        {!yukleniyor && tab === 'mulk' && <TabMulk ozet={ozet} mulkler={mulkler} />}
        {!yukleniyor && tab === 'giderler' && (
          <TabGiderler
            giderler={giderListesi}
            mulkler={mulkler}
            onYeni={() => setGiderModal(true)}
            onSil={async (g) => {
              try {
                await giderSil(ws, user, g.id);
                toast('success', 'Gider silindi');
                yukle();
              } catch (e) { toast('error', e.message); }
            }}
          />
        )}
        {!yukleniyor && tab === 'optimizasyon' && <TabOptimizasyon ozet={ozet} ws={ws} yil={yil} mulkler={mulkler} />}
        {!yukleniyor && tab === 'beyanname' && <TabBeyanname ws={ws} user={user} yil={yil} />}
        {!yukleniyor && tab === 'takvim' && <TabTakvim yil={yil} />}
        {!yukleniyor && tab === 'senaryo' && <TabSenaryo ws={ws} yil={yil} />}
        {!yukleniyor && tab === 'musavir' && <TabMusavir ws={ws} user={user} yil={yil} />}
      </div>

      {giderModal && <GiderModal onClose={() => setGiderModal(false)} onSaved={yukle} />}
    </div>
  );
}

/* ════════════ TAB: ÖZET ════════════ */
function TabOzet({ ozet, yil }) {
  if (!ozet) return <div className="empty"><div className="empty-ico">📊</div><div className="empty-title">Veri yok</div></div>;

  const pieData = [
    { name: 'GMSİ', value: Math.round(ozet.gmsiVergiKurus / 100), color: '#C9A84C' },
    { name: 'Stopaj', value: Math.round(ozet.stopajKurus / 100), color: '#1B4F8A' },
    { name: 'Emlak Vergisi', value: Math.round(ozet.emlakVergiKurus / 100), color: '#EF4444' },
  ].filter(d => d.value > 0);

  const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  const barData = ozet.aylikDagilim.map((v, i) => ({
    ay: aylar[i],
    kira: Math.round(v / 100),
  }));

  const farkRenk = ozet.gecenYilFark > 0 ? 'var(--red)' : 'var(--green)';
  const farkIco = ozet.gecenYilFark > 0 ? '↑' : '↓';

  return (
    <>
      <div className="g4" style={{ marginBottom: 14 }}>
        <div className="kpi" style={{ '--kc': 'var(--blue2)' }}>
          <div className="kpi-lbl">Yıllık Brüt Kira</div>
          <div className="kpi-val" style={{ color: 'var(--blue2)' }}>{fmtTL(ozet.yillikBrutKiraKurus)}</div>
          <div className="kpi-sub" style={{ color: 'var(--muted)' }}>{ozet.aktifKira} aktif sözleşme</div>
        </div>
        <div className="kpi" style={{ '--kc': 'var(--amber)' }}>
          <div className="kpi-lbl">Toplam Gider</div>
          <div className="kpi-val" style={{ color: 'var(--amber)' }}>{fmtTL(ozet.toplamGiderKurus)}</div>
          <div className="kpi-sub" style={{ color: 'var(--muted)' }}>götürü %15</div>
        </div>
        <div className="kpi" style={{ '--kc': 'var(--gold)' }}>
          <div className="kpi-lbl">Matrah</div>
          <div className="kpi-val" style={{ color: 'var(--gold)' }}>{fmtTL(ozet.matrahKurus)}</div>
          <div className="kpi-sub" style={{ color: 'var(--muted)' }}>İstisna sonrası: {fmtTL(ozet.istisnaDusuluKurus)}</div>
        </div>
        <div className="kpi" style={{ '--kc': 'var(--red)' }}>
          <div className="kpi-lbl">Toplam Vergi</div>
          <div className="kpi-val" style={{ color: 'var(--red)' }}>{fmtTL(ozet.toplamVergiKurus)}</div>
          <div className="kpi-sub" style={{ color: farkRenk }}>
            {farkIco} {fmtTL(Math.abs(ozet.gecenYilFark))} (geçen yıl)
          </div>
        </div>
      </div>

      <div className="g2">
        <div className="card">
          <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 10 }}>
            Vergi Dağılımı
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={(e) => e.name}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v) => '₺' + v.toLocaleString('tr-TR')} contentStyle={{ background: '#161616', border: '1px solid #333' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 10 }}>
            Aylık Kira Geliri
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid stroke="rgba(255,255,255,.05)" />
                <XAxis dataKey="ay" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => (v / 1000).toFixed(0) + 'K'} />
                <Tooltip formatter={(v) => '₺' + v.toLocaleString('tr-TR')} contentStyle={{ background: '#161616', border: '1px solid #333' }} />
                <Bar dataKey="kira" fill="#C9A84C" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

/* ════════════ TAB: MÜLK BAZLI ════════════ */
function TabMulk({ ozet }) {
  if (!ozet?.mulkBazli?.length) {
    return <div className="empty"><div className="empty-ico">🏠</div><div className="empty-title">Mülk verisi yok</div></div>;
  }
  return (
    <div className="card" style={{ padding: 0 }}>
      <table style={{ width: '100%', fontSize: '.82rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: 10 }}>Mülk</th>
            <th style={{ textAlign: 'right', padding: 10 }}>Brüt Kira</th>
            <th style={{ textAlign: 'right', padding: 10 }}>Gider</th>
            <th style={{ textAlign: 'right', padding: 10 }}>Matrah</th>
            <th style={{ textAlign: 'right', padding: 10 }}>GMSİ</th>
            <th style={{ textAlign: 'right', padding: 10 }}>Emlak</th>
            <th style={{ textAlign: 'right', padding: 10 }}>Toplam</th>
          </tr>
        </thead>
        <tbody>
          {ozet.mulkBazli.map(m => (
            <tr key={m.mulkId} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
              <td style={{ padding: 10, fontWeight: 500 }}>{m.ad}</td>
              <td style={{ padding: 10, textAlign: 'right' }}>{fmtTL(m.brutKurus)}</td>
              <td style={{ padding: 10, textAlign: 'right', color: 'var(--amber)' }}>{fmtTL(m.giderKurus)}</td>
              <td style={{ padding: 10, textAlign: 'right' }}>{fmtTL(m.matrahKurus)}</td>
              <td style={{ padding: 10, textAlign: 'right' }}>{fmtTL(m.gmsiVergiKurus)}</td>
              <td style={{ padding: 10, textAlign: 'right' }}>{fmtTL(m.emlakVergiKurus)}</td>
              <td style={{ padding: 10, textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>{fmtTL(m.toplamKurus)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ════════════ TAB: GİDERLER ════════════ */
function TabGiderler({ giderler, mulkler, onYeni, onSil }) {
  const mulkAdi = (id) => (mulkler || []).find(m => m.id === id)?.ad || '—';
  const katAdi = (k) => KATEGORILER.find(x => x.v === k)?.l || k;
  const toplam = giderler.reduce((a, g) => a + (g.tutarKurus || 0), 0);

  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <button className="btn btn-gold" onClick={onYeni}>+ Yeni Gider</button>
        <div style={{ marginLeft: 'auto', fontSize: '.85rem' }}>
          Toplam: <b style={{ color: 'var(--gold)' }}>{fmtTL(toplam)}</b>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {giderler.length === 0 ? (
          <div className="empty"><div className="empty-ico">💸</div><div className="empty-title">Gider yok</div></div>
        ) : (
          <table style={{ width: '100%', fontSize: '.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: 10 }}>Tarih</th>
                <th style={{ textAlign: 'left', padding: 10 }}>Mülk</th>
                <th style={{ textAlign: 'left', padding: 10 }}>Kategori</th>
                <th style={{ textAlign: 'right', padding: 10 }}>Tutar</th>
                <th style={{ textAlign: 'left', padding: 10 }}>Açıklama</th>
                <th style={{ padding: 10 }}>Dekont</th>
                <th style={{ padding: 10 }}></th>
              </tr>
            </thead>
            <tbody>
              {giderler.map(g => {
                const t = g.tarih?.toDate?.() || new Date(g.tarih || 0);
                return (
                  <tr key={g.id} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                    <td style={{ padding: 10, fontSize: '.72rem' }}>{t.toLocaleDateString('tr-TR')}</td>
                    <td style={{ padding: 10 }}>{mulkAdi(g.mulkId)}</td>
                    <td style={{ padding: 10, fontSize: '.72rem' }}>{katAdi(g.kategori)}</td>
                    <td style={{ padding: 10, textAlign: 'right', fontWeight: 700, color: 'var(--amber)' }}>{fmtTL(g.tutarKurus)}</td>
                    <td style={{ padding: 10, fontSize: '.72rem', color: 'var(--muted)' }}>{g.aciklama || '—'}</td>
                    <td style={{ padding: 10, textAlign: 'center' }}>
                      {g.dekontUrl && <a href={g.dekontUrl} target="_blank" rel="noreferrer">📎</a>}
                    </td>
                    <td style={{ padding: 10 }}>
                      <button className="btn btn-sm btn-danger" onClick={() => onSil(g)}>×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ════════════ TAB: OPTİMİZASYON ════════════ */
function TabOptimizasyon({ ozet, ws, yil, mulkler }) {
  const [karsi, setKarsi] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    if (!ozet?.mulkBazli || !ws) return;
    setYukleniyor(true);
    (async () => {
      const sonuc = [];
      for (const m of ozet.mulkBazli) {
        if (m.brutKurus === 0) continue;
        const mulk = (mulkler || []).find(x => x.id === m.mulkId);
        const k = await karsilastirma({
          workspaceId: ws,
          mulkId: m.mulkId,
          brutKiraKurus: m.brutKurus,
          yil,
          mulkDegerKurus: ((mulk?.fiyat || mulk?.currentPrice) || 0) * 100,
        });
        sonuc.push({ ad: m.ad, ...k });
      }
      setKarsi(sonuc);
      setYukleniyor(false);
    })();
  }, [ozet, ws, yil, mulkler]);

  if (yukleniyor) return <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>Karşılaştırılıyor...</div>;
  if (karsi.length === 0) return <div className="empty"><div className="empty-ico">⚖️</div><div className="empty-title">Veri yok</div></div>;

  const toplamTasarruf = karsi
    .filter(k => k.tavsiye === 'gercek')
    .reduce((a, k) => a + k.tasarrufKurus, 0);

  return (
    <>
      {toplamTasarruf > 0 && (
        <div style={{
          padding: 16, marginBottom: 14, borderRadius: 10,
          background: 'rgba(34,197,94,.08)', borderLeft: '4px solid var(--green)',
        }}>
          <div style={{ fontSize: '.85rem', color: 'var(--muted)' }}>💡 Optimizasyon Önerisi</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>
            Bu yıl gerçek giderle <b>{fmtTL(toplamTasarruf)}</b> daha az ödersiniz
          </div>
        </div>
      )}
      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%', fontSize: '.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: 10 }}>Mülk</th>
              <th style={{ textAlign: 'right', padding: 10 }}>Götürü Vergi</th>
              <th style={{ textAlign: 'right', padding: 10 }}>Gerçek Vergi</th>
              <th style={{ textAlign: 'right', padding: 10 }}>Fark</th>
              <th style={{ textAlign: 'center', padding: 10 }}>Tavsiye</th>
            </tr>
          </thead>
          <tbody>
            {karsi.map((k, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                <td style={{ padding: 10 }}>{k.ad}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>{fmtTL(k.vergiGoturuKurus)}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>{fmtTL(k.vergiGercekKurus)}</td>
                <td style={{ padding: 10, textAlign: 'right', fontWeight: 700, color: k.tavsiye === 'gercek' ? 'var(--green)' : 'var(--gold)' }}>
                  {fmtTL(k.tasarrufKurus)}
                </td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <span className={`badge ${k.tavsiye === 'gercek' ? 'b-green' : 'b-gold'}`}>
                    {k.tavsiye === 'gercek' ? '✓ Gerçek' : '✓ Götürü'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ════════════ TAB: BEYANNAME ════════════ */
function TabBeyanname({ ws, user, yil }) {
  const [taslak, setTaslak] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const { toast } = useStore();

  const olustur = async () => {
    setYukleniyor(true);
    try {
      const t = await beyannameTaslakOlustur({ workspaceId: ws, user, yil });
      setTaslak(t);
    } catch (e) {
      toast('error', e.message);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => { olustur(); }, [ws, yil]);

  if (yukleniyor || !taslak) return <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>Hazırlanıyor...</div>;

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button className="btn btn-gold" onClick={() => beyannamePdfUret(taslak, user)}>📄 PDF İndir</button>
        <button className="btn btn-primary" onClick={() => beyannameCsvUret(taslak)}>📊 CSV İndir</button>
        <button className="btn btn-ghost" onClick={() => beyannameXmlUret(taslak)}>📋 XML İndir</button>
      </div>
      <h3 style={{ color: 'var(--gold)', marginTop: 0 }}>GMSİ Beyanname {taslak.yil} — Önizleme</h3>
      <table style={{ width: '100%', fontSize: '.82rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ padding: 8, textAlign: 'left' }}>Mülk</th>
            <th style={{ padding: 8, textAlign: 'right' }}>Brüt Kira</th>
            <th style={{ padding: 8, textAlign: 'right' }}>Gider</th>
            <th style={{ padding: 8, textAlign: 'right' }}>Matrah</th>
          </tr>
        </thead>
        <tbody>
          {taslak.mulkler.map((m, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
              <td style={{ padding: 8 }}>{m.ad}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>{fmtTLDetay(m.brutKiraKurus)}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>{fmtTLDetay(m.giderKurus)}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>{fmtTLDetay(m.matrahKurus)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: 'var(--surface2)', fontWeight: 700 }}>
            <td style={{ padding: 8 }}>Toplam</td>
            <td style={{ padding: 8, textAlign: 'right' }}>{fmtTLDetay(taslak.toplamBrutKiraKurus)}</td>
            <td style={{ padding: 8, textAlign: 'right' }}>{fmtTLDetay(taslak.toplamGiderKurus)}</td>
            <td style={{ padding: 8, textAlign: 'right', color: 'var(--gold)' }}>{fmtTLDetay(taslak.matrahHamKurus)}</td>
          </tr>
        </tfoot>
      </table>
      <div style={{ marginTop: 14, padding: 14, background: 'rgba(201,168,76,.08)', borderLeft: '3px solid var(--gold)', borderRadius: 6 }}>
        <div style={{ fontSize: '.85rem' }}>
          İstisna: <b>{fmtTLDetay(taslak.istisnaKurus)}</b> · İstisna Sonrası Matrah: <b>{fmtTLDetay(taslak.istisnaDusuluKurus)}</b>
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gold)', marginTop: 6 }}>
          Ödenecek Vergi: {fmtTLDetay(taslak.odenecekVergiKurus)}
        </div>
      </div>
    </div>
  );
}

/* ════════════ TAB: TAKVİM ════════════ */
function TabTakvim({ yil }) {
  const tum = useMemo(() => vergiTakvimYili(yil).filter(v => !v.donemli), [yil]);
  const yaklasan = useMemo(() => yaklasanVadeler(60, yil), [yil]);
  const gecikmis = useMemo(() => gecikmisVadeler(yil), [yil]);

  return (
    <>
      {gecikmis.length > 0 && (
        <div className="card" style={{ marginBottom: 14, background: 'rgba(239,68,68,.05)', borderLeft: '3px solid var(--red)' }}>
          <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, color: 'var(--red)' }}>⚠️ {gecikmis.length} geçmiş vade</div>
          {gecikmis.map((v, i) => (
            <div key={i} style={{ fontSize: '.78rem', marginTop: 6 }}>
              {v.baslik} · {v.gecikmeGun} gün gecikti
            </div>
          ))}
        </div>
      )}
      <div className="g2">
        <div className="card">
          <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 10 }}>
            📅 Yıllık Vade Takvimi
          </div>
          {tum.map((v, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, padding: '8px 0',
              borderBottom: '1px solid rgba(255,255,255,.03)',
              alignItems: 'center',
            }}>
              <div style={{
                width: 6, height: 30,
                background: v.kritik ? 'var(--red)' : 'var(--gold)',
                borderRadius: 3,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{v.ad}</div>
                <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>{v.tarih.toLocaleDateString('tr-TR')}</div>
              </div>
              {v.kritik && <span className="badge b-red">KRİTİK</span>}
              <span className="badge b-muted">{v.tip}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 10 }}>
            ⏰ Yaklaşan Vadeler (60 gün)
          </div>
          {yaklasan.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: '.78rem' }}>Yakında vade yok</div>
          ) : yaklasan.map((v, i) => {
            const fark = Math.ceil((v.tarih - new Date()) / (1000 * 60 * 60 * 24));
            return (
              <div key={i} style={{
                padding: 10, marginBottom: 6,
                background: fark <= 7 ? 'rgba(239,68,68,.08)' : 'rgba(245,158,11,.08)',
                borderLeft: `3px solid ${fark <= 7 ? 'var(--red)' : 'var(--amber)'}`,
                borderRadius: 4,
              }}>
                <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{v.ad}</div>
                <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>
                  {v.tarih.toLocaleDateString('tr-TR')} · {fark} gün kaldı
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ════════════ TAB: SENARYO ════════════ */
function TabSenaryo({ ws, yil }) {
  const [tip, setTip] = useState('artis');
  const [artis, setArtis] = useState(48);
  const [alimFiyat, setAlimFiyat] = useState('');
  const [aylikKira, setAylikKira] = useState('');
  const [sonuc, setSonuc] = useState(null);
  const [bes, setBes] = useState(null);
  const { toast } = useStore();

  const calistir = async () => {
    try {
      if (tip === 'artis') {
        const r = await senaryoKiraArtis({ workspaceId: ws, artisYuzde: artis, yil });
        setSonuc(r);
      } else if (tip === 'al') {
        const r = await senaryoMulkAl({
          workspaceId: ws,
          alimFiyatKurus: Math.round(parseFloat(alimFiyat || 0) * 100),
          beklenenAylikKiraKurus: Math.round(parseFloat(aylikKira || 0) * 100),
          yil,
        });
        setSonuc(r);
      } else if (tip === '5yil') {
        const r = await senaryo5Yil({ workspaceId: ws, varsayilanArtis: artis });
        setBes(r);
        setSonuc(null);
      }
    } catch (e) {
      toast('error', e.message);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {[['artis','📈 Kira Artışı'],['al','🛒 Mülk Al'],['5yil','📊 5 Yıl Projeksiyon']].map(([id,lbl]) => (
          <button key={id} className={`btn btn-sm ${tip === id ? 'btn-gold' : 'btn-ghost'}`} onClick={() => { setTip(id); setSonuc(null); setBes(null); }}>{lbl}</button>
        ))}
      </div>

      {tip === 'artis' && (
        <div className="fgrid2">
          <div className="fgroup">
            <label className="flbl">Artış Oranı (%)</label>
            <input type="number" className="input" value={artis} onChange={e => setArtis(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="fgroup" style={{ alignSelf: 'flex-end' }}>
            <button className="btn btn-gold" onClick={calistir}>Hesapla</button>
          </div>
        </div>
      )}

      {tip === 'al' && (
        <>
          <div className="fgrid2">
            <div className="fgroup">
              <label className="flbl">Alım Fiyatı (₺)</label>
              <input type="number" className="input" value={alimFiyat} onChange={e => setAlimFiyat(e.target.value)} />
            </div>
            <div className="fgroup">
              <label className="flbl">Beklenen Aylık Kira (₺)</label>
              <input type="number" className="input" value={aylikKira} onChange={e => setAylikKira(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-gold" onClick={calistir}>Hesapla</button>
        </>
      )}

      {tip === '5yil' && (
        <div className="fgrid2">
          <div className="fgroup">
            <label className="flbl">Yıllık Artış Varsayımı (%)</label>
            <input type="number" className="input" value={artis} onChange={e => setArtis(parseFloat(e.target.value) || 25)} />
          </div>
          <div className="fgroup" style={{ alignSelf: 'flex-end' }}>
            <button className="btn btn-gold" onClick={calistir}>Hesapla</button>
          </div>
        </div>
      )}

      {sonuc && (
        <div style={{ marginTop: 14, padding: 14, background: 'var(--surface2)', borderRadius: 8 }}>
          <pre style={{ fontSize: '.78rem', color: 'var(--text)', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
{Object.entries(sonuc).map(([k, v]) => {
  if (typeof v === 'number' && k.endsWith('Kurus')) return `${k}: ${fmtTL(v)}`;
  return `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`;
}).join('\n')}
          </pre>
        </div>
      )}

      {bes && bes.length > 0 && (
        <div style={{ height: 280, marginTop: 14 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bes.map(s => ({ yil: s.yil, brut: Math.round(s.brutKurus / 100), vergi: Math.round(s.vergiKurus / 100), reel: Math.round(s.reelDegerKurus / 100) }))}>
              <CartesianGrid stroke="rgba(255,255,255,.05)" />
              <XAxis dataKey="yil" tick={{ fontSize: 10, fill: '#888' }} />
              <YAxis tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => (v / 1000).toFixed(0) + 'K'} />
              <Tooltip formatter={(v) => '₺' + v.toLocaleString('tr-TR')} contentStyle={{ background: '#161616', border: '1px solid #333' }} />
              <Legend />
              <Line dataKey="brut" stroke="#22C55E" name="Brüt Kira" />
              <Line dataKey="vergi" stroke="#EF4444" name="Vergi" />
              <Line dataKey="reel" stroke="#C9A84C" name="Reel Net" strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ════════════ TAB: MÜŞAVİR ════════════ */
function TabMusavir({ ws, user, yil }) {
  const { toast } = useStore();
  const [paket, setPaket] = useState(null);
  const [calisiyor, setCalisiyor] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (ws) muhasebeciEmailGetir(ws).then(setEmail);
  }, [ws]);

  const hazirla = async () => {
    setCalisiyor(true);
    try {
      const p = await paketOlustur({ workspaceId: ws, user, yil });
      setPaket(p);
      toast('success', 'Paket hazırlandı');
    } catch (e) {
      toast('error', e.message);
    } finally {
      setCalisiyor(false);
    }
  };

  const indir = () => {
    if (!paket) return;
    paketIndir(paket);
    toast('success', '7 dosya indirildi (CSV + JSON)');
  };

  const mailGonder = async () => {
    if (!email || !paket) { toast('error', 'Önce paketi hazırlayın ve email girin'); return; }
    try {
      await muhasebeciMaiGonder(paket, email);
      toast('success', 'Mail collection\'a yazıldı (Trigger Email extension aktifse gönderilir)');
    } catch (e) {
      toast('error', e.message);
    }
  };

  return (
    <div className="card">
      <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--gold)', marginBottom: 14 }}>
        👤 Mali Müşavir Paketi {yil}
      </div>
      <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 14 }}>
        Yıllık vergi belgelerini paketle ve müşavirine gönder. Paket içeriği:
        <ul style={{ margin: '6px 0 0 18px', fontSize: '.78rem' }}>
          <li>01_ozet.csv — Yıllık özet</li>
          <li>02_mulkler.csv — Mülk bazlı vergi</li>
          <li>03_kira_odemeleri.csv — Tüm kira ödemeleri</li>
          <li>04_giderler.csv — İndirim giderleri</li>
          <li>05_dosyalar.csv — Dekont URL listesi</li>
          <li>06_beyanname_taslak.json — GMSİ taslak</li>
          <li>07_full_meta.json — Tam yedek</li>
        </ul>
      </div>

      <button className="btn btn-gold" onClick={hazirla} disabled={calisiyor}>
        {calisiyor ? '⏳ Hazırlanıyor...' : '📦 Yıllık Paket Hazırla'}
      </button>

      {paket && (
        <div style={{ marginTop: 14, padding: 14, background: 'var(--surface2)', borderRadius: 8 }}>
          <div style={{ fontSize: '.85rem', marginBottom: 10 }}>
            ✅ <b>{paket.kiralar.length}</b> kira · <b>{paket.giderler.length}</b> gider · <b>{paket.dosyalar.length}</b> dekont
          </div>
          <button className="btn btn-primary" onClick={indir} style={{ marginRight: 8 }}>📥 7 Dosyayı İndir</button>
        </div>
      )}

      <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <div className="fgroup">
          <label className="flbl">Müşavir E-posta</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="muhasebe@firma.com" />
            <button className="btn btn-gold" onClick={mailGonder} disabled={!paket || !email}>📧 Gönder</button>
          </div>
          <div style={{ fontSize: '.65rem', color: 'var(--muted)', marginTop: 4 }}>
            ⚠️ Firebase Trigger Email extension aktif değilse mail collection'da bekler
          </div>
        </div>
      </div>
    </div>
  );
}
