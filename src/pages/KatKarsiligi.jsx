/**
 * @file pages/KatKarsiligi.jsx
 * @description Müteahhit — Kat Karşılığı Arsa Fizibilite Motoru (Sprint 15)
 * @company Duay Global Trade | info@duaycor.com
 * @anayasa K01 try/catch, K02 secret yok, K06 soft delete, K10 kuruş integer,
 *          K11 workspace izolasyonu, K12 RBAC, K14 loglama
 * @version 2.0.0 | 2026-04-06
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';
import {
  hesapKaydet, hesapGuncelle, hesapListele, hesapSil, hesapGeriAl
} from '../core/katKarsiligiDb';
import {
  formatKisa, npv, irr, payback,
  vergiHesapla, krediHesapla, nakitAkisiUret, VARSAYILAN_FAZLAR,
  reelGetiri, riskSkoru,
} from '../core/finansal';
import bolgeM2 from '../data/bolge-m2-fiyatlari.json';

import ParselFormu from '../components/katkarsiligi/ParselFormu';
import ImarSecici from '../components/katkarsiligi/ImarSecici';
import MaliyetKalemleri, { SABLON_STANDART, maliyetHesapla } from '../components/katkarsiligi/MaliyetKalemleri';
import VergiHarcPaneli from '../components/katkarsiligi/VergiHarcPaneli';
import KrediFinansman from '../components/katkarsiligi/KrediFinansman';
import NakitAkisi from '../components/katkarsiligi/NakitAkisi';
import MonteCarloUI from '../components/katkarsiligi/MonteCarlo';
import KarsilastirmaTablosu from '../components/katkarsiligi/KarsilastirmaTablosu';
import KayitListesi from '../components/katkarsiligi/KayitListesi';
import PdfRapor from '../components/katkarsiligi/PdfRapor';
import MuteahhitGozu, { muteahhitHesapla } from '../components/katkarsiligi/MuteahhitGozu';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const UNDO_MS = 30_000;

const VARSAYILAN_HESAP = () => ({
  id: null,
  ad: '',
  notlar: '',
  parseller: [{ il: 'İstanbul', ilce: 'Ataşehir', mahalle: '', ada: '', parsel: '', alan: 1000, tapuNo: '', cins: 'Arsa' }],
  tevhit: true,
  imar: { emsal: 2.07, taks: 0.40, maksKatSayisi: 8, cepheCekme: 5, yanCekme: 3, arkaCekme: 3, yapiNizami: 'ayrık' },
  girdiler: {
    satilabilirOran: 72,
    ortalamaDaireM2: 120,
    muteahhitPay: 55,
    satisFiyatiM2: 72000,
    satisHiziAy: 12,
    tufeYillik: 48,
    usdBas: 38, usdBit: 45, altinBas: 3500, altinBit: 4200,
  },
  maliyetKalemleri: JSON.parse(JSON.stringify(SABLON_STANDART)),
  vergiParam: { ortDaireM2: 120, lux: false },
  kredi: { ozkaynakOran: 30, aylikFaiz: 3.5, sure: 24, kkdf: 15, bsmv: 5 },
  fazlar: JSON.parse(JSON.stringify(VARSAYILAN_FAZLAR)),
  iskontoAylik: 5,
  muteahhitAyarlari: {},
});

export default function KatKarsiligi() {
  const { user } = useAuthStore();
  const { toast } = useStore();

  const [h, setH] = useState(VARSAYILAN_HESAP());
  const [aktifTab, setAktifTab] = useState('parseller');
  const [kayitlar, setKayitlar] = useState([]);
  const [karsiSecim, setKarsiSecim] = useState([]);
  const [monteCarloSonuc, setMonteCarloSonuc] = useState(null);
  const [kaydetModal, setKaydetModal] = useState(false);
  const [adInput, setAdInput] = useState('');
  const [notlarInput, setNotlarInput] = useState('');
  const autosaveTimer = useRef(null);
  const ilkYukleme = useRef(true);

  const ws = user?.workspaceId || 'ws_001';
  const canWrite = user?.role !== 'viewer';

  /* ════ Listeyi yükle ════ */
  useEffect(() => {
    (async () => {
      try {
        const list = await hesapListele(ws);
        setKayitlar(list);
      } catch (e) {
        toast('error', e.message || 'Kayıtlar yüklenemedi');
      }
    })();
  }, [ws]);

  /* ════ HESAPLAMA (kuruş) ════ */
  const sonuclar = useMemo(() => {
    const toplamAlan = h.parseller.reduce((a, p) => a + (p.alan || 0), 0);
    const emsal = h.imar.emsal || 0;
    const toplamInsaatM2 = toplamAlan * emsal;

    // Müteahhit gözü satılabilir düşüşü
    const mg = muteahhitHesapla(h.muteahhitAyarlari, {
      satisGeliriKurus: 0, toplamMaliyetKurus: 0, daireSayisi: 0,
    });
    const satilabilirOran = Math.max(0, (h.girdiler.satilabilirOran || 0) - (mg.satilabilirDusus || 0));
    const netSatilabilir = toplamInsaatM2 * satilabilirOran / 100;
    const daireSayisi = Math.floor(netSatilabilir / (h.girdiler.ortalamaDaireM2 || 120));
    const muteahhitDaire = Math.floor(daireSayisi * (h.girdiler.muteahhitPay || 55) / 100);
    const arsaSahibiDaire = daireSayisi - muteahhitDaire;

    const muteahhitM2 = muteahhitDaire * (h.girdiler.ortalamaDaireM2 || 120);
    const arsaSahibiM2 = arsaSahibiDaire * (h.girdiler.ortalamaDaireM2 || 120);

    // Maliyet
    const { toplamKurus: maliyetBaz } = maliyetHesapla(h.maliyetKalemleri, toplamInsaatM2);

    // Satış geliri (müteahhit)
    const satisGeliriKurus = Math.round(muteahhitM2 * (h.girdiler.satisFiyatiM2 || 0) * 100);
    const arsaPayiKurus = Math.round(arsaSahibiM2 * (h.girdiler.satisFiyatiM2 || 0) * 100);

    // Müteahhit gözü gerçek hesaplamayla tekrar
    const mgGercek = muteahhitHesapla(h.muteahhitAyarlari, {
      satisGeliriKurus,
      toplamMaliyetKurus: maliyetBaz,
      daireSayisi: muteahhitDaire,
    });
    const toplamMaliyetKurus = maliyetBaz + mgGercek.ekMaliyetKurus;
    const netSatisKurus = satisGeliriKurus - mgGercek.satisKesintiKurus;

    // Vergi (muteahhit karı için ön hesap)
    const ilkKar = netSatisKurus - toplamMaliyetKurus;
    const vergi = vergiHesapla({
      satisGeliriKurus: netSatisKurus,
      arsaPayiKurus,
      muteahhitKarKurus: Math.max(0, ilkKar),
      daireList: Array(Math.max(1, muteahhitDaire)).fill({ netM2: h.girdiler.ortalamaDaireM2 }),
      lux: h.vergiParam.lux,
    });

    // Kredi
    const krediSonuc = krediHesapla({
      toplamMaliyetKurus,
      ...h.kredi,
    });

    // Nihai kar
    const netKarKurus = netSatisKurus - toplamMaliyetKurus - vergi.toplamKurus - krediSonuc.toplamFaizKurus;

    // Nakit akışı
    const akis = nakitAkisiUret({
      toplamMaliyetKurus: toplamMaliyetKurus + vergi.toplamKurus + krediSonuc.toplamFaizKurus,
      satisGeliriKurus: netSatisKurus,
      fazlar: h.fazlar,
      satisHiziAy: h.girdiler.satisHiziAy,
    });

    const npvKurus = npv((h.iskontoAylik || 5) / 100, akis);
    const irrAylik = irr(akis);
    const irrYillik = irrAylik != null ? (Math.pow(1 + irrAylik, 12) - 1) * 100 : null;
    const pbp = payback(akis);

    // ROI
    const roi = toplamMaliyetKurus > 0 ? (netKarKurus / toplamMaliyetKurus) * 100 : 0;
    const ozkaynakRoi = krediSonuc.ozkaynakKurus > 0 ? (netKarKurus / krediSonuc.ozkaynakKurus) * 100 : 0;
    const kaldiracliRoi = roi;
    const karMarji = netSatisKurus > 0 ? (netKarKurus / netSatisKurus) * 100 : 0;
    const breakEvenM2 = muteahhitM2 > 0 ? (toplamMaliyetKurus / 100) / muteahhitM2 : 0;
    const breakEvenGuvenlik = h.girdiler.satisFiyatiM2 > 0
      ? ((h.girdiler.satisFiyatiM2 - breakEvenM2) / h.girdiler.satisFiyatiM2) * 100 : 0;
    const arsaBedelOrani = satisGeliriKurus > 0 ? (arsaPayiKurus / satisGeliriKurus) * 100 : 0;

    // DSCR
    const aylikFaizOdeme = krediSonuc.sure > 0 ? krediSonuc.toplamGeriOdemeKurus / krediSonuc.sure : 1;
    const aylikNakit = akis.length > 0 ? (satisGeliriKurus / akis.length) : 0;
    const dscr = aylikFaizOdeme > 0 ? aylikNakit / aylikFaizOdeme : 0;

    // Reel getiri
    const reel = reelGetiri({
      nominalKarKurus: netKarKurus,
      tufeYillik: h.girdiler.tufeYillik,
      usdBas: h.girdiler.usdBas, usdBit: h.girdiler.usdBit,
      altinBas: h.girdiler.altinBas, altinBit: h.girdiler.altinBit,
    });

    // Risk skoru
    const risk = riskSkoru({
      karMarji, irrAylik, dscr, breakEvenGuvenlik, arsaBedelOrani,
      satisHizi: 100 - (h.girdiler.satisHiziAy * 5),
      bolgeLikidite: 60, imarBelirsizlik: 30, dovizKur: 40, enflasyon: h.girdiler.tufeYillik,
    });

    return {
      toplamAlan, toplamInsaatM2, netSatilabilir,
      daireSayisi, muteahhitDaire, arsaSahibiDaire, muteahhitM2, arsaSahibiM2,
      maliyetBazKurus: maliyetBaz,
      muteahhitEkKurus: mgGercek.ekMaliyetKurus,
      satisKesintiKurus: mgGercek.satisKesintiKurus,
      toplamMaliyetKurus, satisGeliriKurus, netSatisKurus, arsaPayiKurus,
      vergi, krediSonuc, netKarKurus, npvKurus, irrAylik, irrYillik, payback: pbp,
      roi, ozkaynakRoi, kaldiracliRoi, karMarji, breakEvenM2, breakEvenGuvenlik, arsaBedelOrani,
      dscr, reel, risk, akis,
    };
  }, [h]);

  /* ════ Autosave (debounce 2s) — sadece kayıtlı hesaplarda ════ */
  useEffect(() => {
    if (ilkYukleme.current) { ilkYukleme.current = false; return; }
    if (!h.id || !canWrite) return;
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      try {
        const payload = {
          ad: h.ad, notlar: h.notlar, parseller: h.parseller, tevhit: h.tevhit,
          imar: h.imar, girdiler: h.girdiler, maliyetKalemleri: h.maliyetKalemleri,
          vergiParam: h.vergiParam, kredi: h.kredi, fazlar: h.fazlar,
          iskontoAylik: h.iskontoAylik, muteahhitAyarlari: h.muteahhitAyarlari,
          sonuclar: serializeSonuclar(sonuclar),
          vergi: sonuclar.vergi,
          risk: sonuclar.risk,
          monteCarlo: monteCarloSonuc,
        };
        await hesapGuncelle(ws, user?.name, h.id, payload);
      } catch (e) {
        console.warn('autosave fail', e);
      }
    }, 2000);
    return () => clearTimeout(autosaveTimer.current);
  }, [h, sonuclar, monteCarloSonuc]);

  /* ════ İşlemler ════ */
  const yeniHesap = () => {
    setH(VARSAYILAN_HESAP());
    setMonteCarloSonuc(null);
  };

  const kaydetModalAc = () => {
    setAdInput(h.ad || `Hesap ${new Date().toLocaleDateString('tr-TR')}`);
    setNotlarInput(h.notlar || '');
    setKaydetModal(true);
  };

  const kaydetOnayla = async () => {
    if (!canWrite) { toast('error', 'Yetkiniz yok'); return; }
    try {
      const payload = {
        ad: adInput, notlar: notlarInput,
        parseller: h.parseller, tevhit: h.tevhit, imar: h.imar,
        girdiler: h.girdiler, maliyetKalemleri: h.maliyetKalemleri,
        vergiParam: h.vergiParam, kredi: h.kredi, fazlar: h.fazlar,
        iskontoAylik: h.iskontoAylik, muteahhitAyarlari: h.muteahhitAyarlari,
        sonuclar: serializeSonuclar(sonuclar),
        vergi: sonuclar.vergi,
        risk: sonuclar.risk,
        monteCarlo: monteCarloSonuc,
      };
      if (h.id) {
        await hesapGuncelle(ws, user?.name, h.id, payload);
        toast('success', 'Hesap güncellendi');
      } else {
        const id = await hesapKaydet(ws, user?.name, payload);
        setH({ ...h, id, ad: adInput, notlar: notlarInput });
        toast('success', 'Hesap kaydedildi');
      }
      const list = await hesapListele(ws);
      setKayitlar(list);
      setKaydetModal(false);
    } catch (e) {
      toast('error', e.message || 'Kayıt hatası');
    }
  };

  const hesapYukle = (kayit) => {
    setH({
      id: kayit.id,
      ad: kayit.ad || '',
      notlar: kayit.notlar || '',
      parseller: kayit.parseller || VARSAYILAN_HESAP().parseller,
      tevhit: kayit.tevhit ?? true,
      imar: kayit.imar || VARSAYILAN_HESAP().imar,
      girdiler: kayit.girdiler || VARSAYILAN_HESAP().girdiler,
      maliyetKalemleri: kayit.maliyetKalemleri || JSON.parse(JSON.stringify(SABLON_STANDART)),
      vergiParam: kayit.vergiParam || { ortDaireM2: 120, lux: false },
      kredi: kayit.kredi || VARSAYILAN_HESAP().kredi,
      fazlar: kayit.fazlar || VARSAYILAN_FAZLAR,
      iskontoAylik: kayit.iskontoAylik ?? 5,
      muteahhitAyarlari: kayit.muteahhitAyarlari || {},
    });
    setMonteCarloSonuc(kayit.monteCarlo || null);
    toast('success', `"${kayit.ad}" yüklendi`);
  };

  const hesapSilSoft = async (kayit) => {
    if (!canWrite) { toast('error', 'Yetkiniz yok'); return; }
    try {
      await hesapSil(ws, user?.name, kayit.id);
      const list = await hesapListele(ws);
      setKayitlar(list);
      if (h.id === kayit.id) setH(VARSAYILAN_HESAP());
      toast('warning', `"${kayit.ad}" silindi`, {
        undoLabel: 'Geri Al',
        onUndo: async () => {
          await hesapGeriAl(ws, user?.name, kayit.id);
          const l2 = await hesapListele(ws);
          setKayitlar(l2);
        },
        sure: UNDO_MS,
      });
    } catch (e) {
      toast('error', e.message || 'Silme hatası');
    }
  };

  /* ════ Monte Carlo için hesaplama kapanı ════ */
  const mcHesapla = (p) => {
    const inM2 = (p.alan || sonuclar.toplamAlan) * (p.emsal || h.imar.emsal);
    const netSat = inM2 * h.girdiler.satilabilirOran / 100;
    const daire = Math.floor(netSat / h.girdiler.ortalamaDaireM2);
    const mutDaire = Math.floor(daire * h.girdiler.muteahhitPay / 100);
    const mutM2 = mutDaire * h.girdiler.ortalamaDaireM2;
    const { toplamKurus: maliyet } = maliyetHesapla(h.maliyetKalemleri, inM2);
    const maliyetUpd = maliyet * (p.maliyet != null ? (p.maliyet / sonuclar.toplamMaliyetKurus) : 1);
    const satis = Math.round(mutM2 * (p.satisFiyati || h.girdiler.satisFiyatiM2) * 100);
    const netKar = satis - maliyetUpd;
    return { netKarKurus: netKar };
  };

  const mcBaz = {
    satisFiyati: h.girdiler.satisFiyatiM2,
    maliyet: sonuclar.toplamMaliyetKurus || 1,
    satisHizi: h.girdiler.satisHiziAy,
    krediFaiz: h.kredi.aylikFaiz,
    iskonto: h.iskontoAylik,
  };

  /* ════ Risk radar chart data ════ */
  const riskRadarData = Object.entries(sonuclar.risk.puanlar || {}).map(([k, v]) => ({
    faktor: k, puan: Math.round(v || 0),
  }));

  const riskRenk = sonuclar.risk.skor < 30 ? '#22C55E' : sonuclar.risk.skor < 60 ? '#F59E0B' : '#EF4444';
  const riskEtiket = sonuclar.risk.skor < 30 ? 'DÜŞÜK' : sonuclar.risk.skor < 60 ? 'ORTA' : 'YÜKSEK';

  /* ════ Parsel bölge bilgisi ════ */
  const ilkParsel = h.parseller[0];
  const bolgeFiyati = ilkParsel ? (bolgeM2[ilkParsel.il]?.[ilkParsel.ilce] || bolgeM2[ilkParsel.il]?._default) : null;
  const parselOzet = ilkParsel && ilkParsel.il ? `${ilkParsel.ilce || ''} ${ilkParsel.ada || ''}/${ilkParsel.parsel || ''}` : '—';

  /* ════ Karşılaştırma hesapları ════ */
  const karsiHesaplar = kayitlar.filter(k => karsiSecim.includes(k.id));

  /* ════ RENDER ════ */
  const TAB = (id, lbl) => (
    <button
      key={id}
      onClick={() => setAktifTab(id)}
      className={`tab ${aktifTab === id ? 'active' : ''}`}
    >
      {lbl}
    </button>
  );

  return (
    <div>
      <header className="topbar">
        <div style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 600 }}>
          🏗️ Kat Karşılığı Fizibilite Motoru
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn btn-sm btn-ghost" onClick={yeniHesap}>+ Yeni</button>
          <button className="btn btn-sm btn-gold" onClick={kaydetModalAc} disabled={!canWrite}>💾 Kaydet</button>
          <PdfRapor hesap={{ ...h, sonuclar: serializeSonuclar(sonuclar), vergi: sonuclar.vergi, risk: sonuclar.risk, monteCarlo: monteCarloSonuc }} />
        </div>
      </header>

      {/* Persistent Status Bar */}
      <div style={{
        background: 'linear-gradient(90deg,rgba(201,168,76,.08),rgba(27,79,138,.08))',
        borderBottom: '1px solid var(--border)',
        padding: '8px 24px', display: 'flex', gap: 16, alignItems: 'center',
        flexWrap: 'wrap', fontSize: '.72rem',
      }}>
        <span style={{ color: 'var(--muted)' }}>📍</span>
        <span><b style={{ color: 'var(--gold)' }}>{parselOzet}</b></span>
        <span>Alan: <b>{sonuclar.toplamAlan.toLocaleString('tr-TR')} m²</b></span>
        <span>Emsal: <b>{h.imar.emsal}</b></span>
        <span>İnşaat: <b>{Math.round(sonuclar.toplamInsaatM2).toLocaleString('tr-TR')} m²</b></span>
        <span>Daire: <b>{sonuclar.daireSayisi}</b> ({sonuclar.muteahhitDaire}M/{sonuclar.arsaSahibiDaire}A)</span>
        <span>Net Kâr: <b style={{ color: sonuclar.netKarKurus >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatKisa(sonuclar.netKarKurus)}</b></span>
        <span>ROI: <b style={{ color: 'var(--gold)' }}>%{sonuclar.roi.toFixed(1)}</b></span>
        <span style={{
          marginLeft: 'auto', padding: '3px 10px', borderRadius: 99,
          background: `${riskRenk}22`, border: `1px solid ${riskRenk}`, color: riskRenk, fontWeight: 700,
        }}>
          Risk {riskEtiket} {sonuclar.risk.skor}/100
        </span>
        {h.id && <span className="b-muted badge">Autosave açık</span>}
        {!h.id && <span className="b-amber badge">Taslak</span>}
      </div>

      <div className="page" style={{ paddingBottom: 48 }}>
        {/* KPI sıra */}
        <div className="g4" style={{ marginBottom: 14 }}>
          <div className="kpi" style={{ '--kc': 'var(--blue2)' }}>
            <div className="kpi-lbl">Toplam Maliyet</div>
            <div className="kpi-val" style={{ color: 'var(--red)' }}>{formatKisa(sonuclar.toplamMaliyetKurus)}</div>
          </div>
          <div className="kpi" style={{ '--kc': 'var(--gold)' }}>
            <div className="kpi-lbl">Net Satış (Müteahhit)</div>
            <div className="kpi-val" style={{ color: 'var(--gold)' }}>{formatKisa(sonuclar.netSatisKurus)}</div>
          </div>
          <div className="kpi" style={{ '--kc': 'var(--green)' }}>
            <div className="kpi-lbl">Net Kâr</div>
            <div className="kpi-val" style={{ color: sonuclar.netKarKurus >= 0 ? 'var(--green)' : 'var(--red)', fontSize: '1.5rem' }}>
              {formatKisa(sonuclar.netKarKurus)}
            </div>
            <div className="kpi-sub" style={{ color: 'var(--muted)' }}>Marj %{sonuclar.karMarji.toFixed(1)}</div>
          </div>
          <div className="kpi" style={{ '--kc': 'var(--amber)' }}>
            <div className="kpi-lbl">IRR (Yıllık)</div>
            <div className="kpi-val" style={{ color: 'var(--amber)' }}>
              {sonuclar.irrYillik != null ? '%' + sonuclar.irrYillik.toFixed(1) : '—'}
            </div>
            <div className="kpi-sub" style={{ color: 'var(--muted)' }}>
              NPV: {formatKisa(sonuclar.npvKurus)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TAB('parseller', '📋 Parseller')}
          {TAB('imar',      '🏛️ İmar')}
          {TAB('maliyet',   '💰 Maliyet')}
          {TAB('finansal',  '📊 Finansal')}
          {TAB('mc',        '🎲 Monte Carlo')}
          {TAB('karsi',     '📈 Karşılaştırma')}
          {TAB('kayitlar',  '💾 Kayıtlar')}
        </div>

        {/* TAB: Parseller */}
        {aktifTab === 'parseller' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <ParselFormu
              parseller={h.parseller}
              setParseller={(v) => setH({ ...h, parseller: v })}
              tevhit={h.tevhit}
              setTevhit={(v) => setH({ ...h, tevhit: v })}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Harita — iframe OpenStreetMap */}
              <div className="card">
                <div style={{ fontFamily: 'var(--serif)', fontSize: '.88rem', fontWeight: 600, color: 'var(--gold)', marginBottom: 10 }}>
                  🗺️ Lokasyon
                </div>
                {ilkParsel && ilkParsel.il && ilkParsel.ilce ? (
                  <>
                    <iframe
                      title="harita"
                      width="100%"
                      height="220"
                      style={{ border: 0, borderRadius: 8 }}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=&layer=mapnik&marker=0,0&q=${encodeURIComponent(`${ilkParsel.mahalle || ''} ${ilkParsel.ilce} ${ilkParsel.il} Turkey`)}`}
                    />
                    {bolgeFiyati && (
                      <div style={{ marginTop: 10, padding: 8, background: 'rgba(201,168,76,.1)', borderRadius: 6, fontSize: '.75rem' }}>
                        📊 <b>{ilkParsel.ilce}</b> bölge ortalaması:
                        <b style={{ color: 'var(--gold)', marginLeft: 6 }}>₺{bolgeFiyati.toLocaleString('tr-TR')}/m²</b>
                        {h.girdiler.satisFiyatiM2 && (
                          <span style={{ marginLeft: 10, color: h.girdiler.satisFiyatiM2 > bolgeFiyati ? 'var(--red)' : 'var(--green)' }}>
                            (Girdiğiniz: ₺{h.girdiler.satisFiyatiM2.toLocaleString('tr-TR')})
                          </span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty">
                    <div className="empty-ico">🗺️</div>
                    <div className="empty-title">İl/ilçe seçin</div>
                  </div>
                )}
              </div>

              {/* Hızlı girdiler */}
              <div className="card">
                <div style={{ fontFamily: 'var(--serif)', fontSize: '.88rem', fontWeight: 600, color: 'var(--gold)', marginBottom: 10 }}>
                  ⚙️ Hızlı Girdiler
                </div>
                {[
                  ['Satılabilir Oran', 'satilabilirOran', '%'],
                  ['Ortalama Daire', 'ortalamaDaireM2', 'm²'],
                  ['Müteahhit Payı', 'muteahhitPay', '%'],
                  ['Satış Fiyatı', 'satisFiyatiM2', '₺/m²'],
                  ['Satış Hızı', 'satisHiziAy', 'ay'],
                ].map(([lbl, key, suf]) => (
                  <div className="fgroup" key={key}>
                    <label className="flbl">{lbl}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number"
                        className="input"
                        value={h.girdiler[key]}
                        onChange={e => setH({ ...h, girdiler: { ...h.girdiler, [key]: parseFloat(e.target.value) || 0 } })}
                      />
                      <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>{suf}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: İmar */}
        {aktifTab === 'imar' && (
          <ImarSecici
            parseller={h.parseller}
            imar={h.imar}
            setImar={(v) => setH({ ...h, imar: v })}
          />
        )}

        {/* TAB: Maliyet */}
        {aktifTab === 'maliyet' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <MaliyetKalemleri
              kalemler={h.maliyetKalemleri}
              setKalemler={(v) => setH({ ...h, maliyetKalemleri: v })}
              toplamInsaatM2={sonuclar.toplamInsaatM2}
            />
            <MuteahhitGozu
              ayarlar={h.muteahhitAyarlari}
              setAyarlar={(v) => setH({ ...h, muteahhitAyarlari: v })}
              baz={{
                satisGeliriKurus: sonuclar.satisGeliriKurus,
                toplamMaliyetKurus: sonuclar.maliyetBazKurus,
                daireSayisi: sonuclar.muteahhitDaire,
              }}
            />
          </div>
        )}

        {/* TAB: Finansal */}
        {aktifTab === 'finansal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="g2">
              <VergiHarcPaneli
                vergi={sonuclar.vergi}
                vergiParam={h.vergiParam}
                setVergiParam={(v) => setH({ ...h, vergiParam: v })}
              />
              <KrediFinansman
                kredi={h.kredi}
                setKredi={(v) => setH({ ...h, kredi: v })}
                krediSonuc={sonuclar.krediSonuc}
                dscr={sonuclar.dscr}
                ozkaynakRoi={sonuclar.ozkaynakRoi}
                kaldiracliRoi={sonuclar.kaldiracliRoi}
              />
            </div>
            <NakitAkisi
              fazlar={h.fazlar}
              setFazlar={(v) => setH({ ...h, fazlar: v })}
              akis={sonuclar.akis}
              iskontoAylik={h.iskontoAylik}
              setIskontoAylik={(v) => setH({ ...h, iskontoAylik: v })}
            />
            {/* Reel Getiri + Risk Radar */}
            <div className="g2">
              <div className="card">
                <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 600, color: 'var(--gold)', marginBottom: 14 }}>
                  💱 Reel Getiri
                </div>
                <div className="fgrid2">
                  <div className="fgroup">
                    <label className="flbl">TÜFE Yıllık (%)</label>
                    <input type="number" className="input" value={h.girdiler.tufeYillik} onChange={e => setH({ ...h, girdiler: { ...h.girdiler, tufeYillik: parseFloat(e.target.value) || 0 } })} />
                  </div>
                  <div className="fgroup">
                    <label className="flbl">USD Bitiş</label>
                    <input type="number" className="input" value={h.girdiler.usdBit} onChange={e => setH({ ...h, girdiler: { ...h.girdiler, usdBit: parseFloat(e.target.value) || 0 } })} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 10 }}>
                  <div style={{ background: 'var(--surface2)', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>Reel Kâr TL</div>
                    <div style={{ fontSize: '.95rem', fontWeight: 700, color: 'var(--gold)' }}>{formatKisa(sonuclar.reel.reelTLKurus)}</div>
                  </div>
                  <div style={{ background: 'var(--surface2)', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>Kâr USD</div>
                    <div style={{ fontSize: '.95rem', fontWeight: 700, color: 'var(--green)' }}>${sonuclar.reel.karUSD.toLocaleString('tr-TR')}</div>
                  </div>
                  <div style={{ background: 'var(--surface2)', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>Kâr Altın (gr)</div>
                    <div style={{ fontSize: '.95rem', fontWeight: 700, color: 'var(--amber)' }}>{sonuclar.reel.karAltinGram.toLocaleString('tr-TR')}</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 600, color: 'var(--gold)', marginBottom: 10 }}>
                  ⚠️ Risk Faktörleri ({sonuclar.risk.skor}/100)
                </div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={riskRadarData}>
                      <PolarGrid stroke="rgba(255,255,255,.1)" />
                      <PolarAngleAxis dataKey="faktor" tick={{ fontSize: 9, fill: '#888' }} />
                      <PolarRadiusAxis tick={{ fontSize: 8, fill: '#555' }} angle={90} domain={[0, 100]} />
                      <Radar name="İyilik" dataKey="puan" stroke={riskRenk} fill={riskRenk} fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Monte Carlo */}
        {aktifTab === 'mc' && (
          <MonteCarloUI
            baz={mcBaz}
            hesapla={mcHesapla}
          />
        )}

        {/* TAB: Karşılaştırma */}
        {aktifTab === 'karsi' && (
          <KarsilastirmaTablosu hesaplar={karsiHesaplar} />
        )}

        {/* TAB: Kayıtlar */}
        {aktifTab === 'kayitlar' && (
          <KayitListesi
            hesaplar={kayitlar}
            yukleyen={hesapYukle}
            silinen={hesapSilSoft}
            karsiSecim={karsiSecim}
            setKarsiSecim={setKarsiSecim}
            aktifId={h.id}
          />
        )}
      </div>

      {/* Kaydet Modal */}
      {kaydetModal && (
        <div className="modal-bg" onClick={() => setKaydetModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
            <div className="modal-head">
              <div className="modal-title">💾 Hesabı Kaydet</div>
              <button className="btn btn-sm btn-ghost" onClick={() => setKaydetModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="fgroup">
                <label className="flbl">Hesap Adı</label>
                <input className="input" value={adInput} onChange={e => setAdInput(e.target.value)} autoFocus />
              </div>
              <div className="fgroup">
                <label className="flbl">Notlar</label>
                <textarea className="textarea" rows={4} value={notlarInput} onChange={e => setNotlarInput(e.target.value)} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setKaydetModal(false)}>Vazgeç</button>
              <button className="btn btn-gold" onClick={kaydetOnayla}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════ Firestore'a yazılabilir (undefined-free) sonuçlar ════ */
function serializeSonuclar(s) {
  return {
    toplamAlan: s.toplamAlan,
    toplamInsaatM2: s.toplamInsaatM2,
    daireSayisi: s.daireSayisi,
    muteahhitDaire: s.muteahhitDaire,
    arsaSahibiDaire: s.arsaSahibiDaire,
    toplamMaliyetKurus: s.toplamMaliyetKurus,
    satisGeliriKurus: s.satisGeliriKurus,
    netSatisKurus: s.netSatisKurus,
    netKarKurus: s.netKarKurus,
    npvKurus: s.npvKurus,
    irrAylik: s.irrAylik ?? null,
    irrYillik: s.irrYillik ?? null,
    payback: s.payback ?? null,
    roi: s.roi,
    karMarji: s.karMarji,
    dscr: s.dscr,
    breakEvenM2: s.breakEvenM2,
    breakEvenGuvenlik: s.breakEvenGuvenlik,
    arsaBedelOrani: s.arsaBedelOrani,
  };
}
