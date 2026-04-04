/**
 * @file pages/KatKarsiligi.jsx
 * @description Müteahhit — Kat Karşılığı Arsa Fizibilite Analizi
 * @company Duay Global Trade | info@duaycor.com
 * @anayasa K10 Finansal Formüller — integer aritmetik
 * @version 1.0.0 | 2026-04-04
 */

import { useState, useMemo } from 'react';

const FMT  = (n) => new Intl.NumberFormat('tr-TR').format(Math.round(n));
const FMT2 = (n) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
const M    = (n) => `₺${FMT(n)}`;

const VARSAYILAN = {
  arsaAlani: 1000, emsal: 2.5, katSayisi: 8, satilabilirOran: 72,
  ortalamaDaireM2: 100, muteahhitPay: 55, insaatMaliyeti: 22000,
  satisFiyati: 45000, ekMasrafOran: 12,
};

function hesapla(p) {
  const toplamInsaat    = Math.round(p.arsaAlani * p.emsal * 10) / 10;
  const netSatilabilir  = Math.round(toplamInsaat * p.satilabilirOran) / 100;
  const toplamDaire     = Math.floor(netSatilabilir / p.ortalamaDaireM2);
  const muteahhitDaire  = Math.floor(toplamDaire * p.muteahhitPay / 100);
  const arsaSahibiDaire = toplamDaire - muteahhitDaire;

  const insaatMaliyetiKurus = Math.round(toplamInsaat * p.insaatMaliyeti * 100);
  const ekMasrafKurus       = Math.round(insaatMaliyetiKurus * p.ekMasrafOran / 100);
  const toplamMaliyetKurus  = insaatMaliyetiKurus + ekMasrafKurus;
  const muteahhitGelirKurus = Math.round(muteahhitDaire * p.ortalamaDaireM2 * p.satisFiyati * 100);
  const arsaBedelKurus      = Math.round(arsaSahibiDaire * p.ortalamaDaireM2 * p.satisFiyati * 100);
  const netKarKurus         = muteahhitGelirKurus - toplamMaliyetKurus;

  const toplamMaliyet  = toplamMaliyetKurus / 100;
  const muteahhitGelir = muteahhitGelirKurus / 100;
  const arsaBedel      = arsaBedelKurus / 100;
  const netKar         = netKarKurus / 100;

  const karMarji       = muteahhitGelir > 0 ? (netKar / muteahhitGelir) * 100 : 0;
  const roi            = toplamMaliyet > 0 ? (netKar / toplamMaliyet) * 100 : 0;
  const breakEvenFiyat = muteahhitDaire > 0 && p.ortalamaDaireM2 > 0
    ? toplamMaliyet / (muteahhitDaire * p.ortalamaDaireM2) : 0;
  const arsaBedelOrani = muteahhitGelir > 0 ? (arsaBedel / muteahhitGelir) * 100 : 0;

  return {
    toplamInsaat, netSatilabilir, toplamDaire, muteahhitDaire, arsaSahibiDaire,
    insaatMaliyet: insaatMaliyetiKurus / 100, ekMasraf: ekMasrafKurus / 100,
    toplamMaliyet, muteahhitGelir, arsaBedel, netKar, karMarji, roi,
    breakEvenFiyat, arsaBedelOrani, satisFiyati: p.satisFiyati,
  };
}

function riskhesapla(s) {
  let skor = 0;
  if (s.karMarji < 15) skor += 30; else if (s.karMarji < 25) skor += 15;
  if (s.roi < 20) skor += 25; else if (s.roi < 40) skor += 12;
  if (s.arsaBedelOrani > 45) skor += 20; else if (s.arsaBedelOrani > 35) skor += 10;
  if (s.breakEvenFiyat / s.satisFiyati > 0.85) skor += 25;
  else if (s.breakEvenFiyat / s.satisFiyati > 0.75) skor += 12;
  return Math.min(skor, 100);
}

const SENARYOLAR = [
  { label: 'Kötümser',  color: '#EF4444', satisFiyatiCarpan: 0.85, maliyetCarpan: 1.15 },
  { label: 'Realist',   color: '#C9A84C', satisFiyatiCarpan: 1.00, maliyetCarpan: 1.00 },
  { label: 'İyimser',   color: '#22C55E', satisFiyatiCarpan: 1.15, maliyetCarpan: 0.92 },
];

function InputRow({ label, value, onChange, min = 0, step = 1, suffix = '', prefix = '' }) {
  return (
    <div className="fgroup">
      <label className="flbl">{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {prefix && <span style={{ fontSize: '.75rem', color: 'var(--muted)', flexShrink: 0 }}>{prefix}</span>}
        <input type="number" min={min} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="input" style={{ flex: 1 }} />
        {suffix && <span style={{ fontSize: '.75rem', color: 'var(--muted)', flexShrink: 0 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function KpiBox({ label, val, sub, color = 'var(--gold)', large = false }) {
  return (
    <div className="kpi" style={{ '--kc': color }}>
      <div className="kpi-lbl">{label}</div>
      <div className="kpi-val" style={{ color, fontSize: large ? '1.7rem' : '1.3rem' }}>{val}</div>
      {sub && <div className="kpi-sub" style={{ color }}>{sub}</div>}
    </div>
  );
}

export default function KatKarsiligi() {
  const [p, setP] = useState({ ...VARSAYILAN });
  const [aktifTab, setAktifTab] = useState('analiz');
  const set = (key) => (val) => setP(prev => ({ ...prev, [key]: val }));

  const s = useMemo(() => hesapla(p), [p]);
  const riskSkor = useMemo(() => riskhesapla(s), [s]);
  const senaryolar = useMemo(() =>
    SENARYOLAR.map(sn => ({
      ...sn,
      sonuc: hesapla({
        ...p,
        satisFiyati:    Math.round(p.satisFiyati    * sn.satisFiyatiCarpan),
        insaatMaliyeti: Math.round(p.insaatMaliyeti * sn.maliyetCarpan),
      }),
    })),
  [p]);

  const riskRenk   = riskSkor < 30 ? 'var(--green)' : riskSkor < 60 ? 'var(--amber)' : 'var(--red)';
  const riskEtiket = riskSkor < 30 ? 'DÜŞÜK RİSK' : riskSkor < 60 ? 'ORTA RİSK' : 'YÜKSEK RİSK';
  const karRenk    = s.netKar > 0 ? 'var(--green)' : 'var(--red)';

  return (
    <div>
      <header className="topbar">
        <div style={{fontFamily:'var(--serif)',fontSize:'1rem',fontWeight:600}}>Kat Karşılığı Arsa Analizi</div>
      </header>

      <div className="page" style={{ paddingBottom: 48 }}>

        {/* Başlık bilgi bantı */}
        <div style={{
          background:'linear-gradient(90deg,rgba(27,79,138,.18),rgba(201,168,76,.1))',
          border:'1px solid rgba(201,168,76,.25)', borderRadius:10,
          padding:'10px 16px', marginBottom:20,
          display:'flex', gap:12, alignItems:'center', flexWrap:'wrap',
        }}>
          <span style={{ fontSize:'1.1rem' }}>🏗️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--serif)', fontSize:'.85rem', color:'#E8C96A', fontStyle:'italic' }}>
              Müteahhit Fizibilite Motoru — Kat Karşılığı Senaryosu
            </div>
            <div style={{ fontSize:'.7rem', color:'var(--muted)', marginTop:2 }}>
              Arsa bilgilerini gir → gerçek zamanlı kâr/zarar + senaryo analizi
            </div>
          </div>
          <div style={{
            background: riskRenk === 'var(--green)' ? 'rgba(34,197,94,.12)' :
                        riskRenk === 'var(--amber)' ? 'rgba(245,158,11,.12)' : 'rgba(239,68,68,.12)',
            border:`1px solid ${riskRenk}`, borderRadius:99,
            padding:'4px 14px', fontSize:'.72rem', fontWeight:700, color:riskRenk,
          }}>
            {riskEtiket} {riskSkor}/100
          </div>
        </div>

        {/* Sol form + Sağ sonuçlar */}
        <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:14, alignItems:'start' }}>

          {/* SOL: Parametre formu */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div className="card">
              <div style={{ fontFamily:'var(--serif)', fontSize:'.88rem', fontWeight:600, marginBottom:12, color:'var(--gold)' }}>
                📍 Arsa Bilgileri
              </div>
              <InputRow label="Arsa Alanı" value={p.arsaAlani} onChange={set('arsaAlani')} min={50} step={10} suffix="m²" />
              <InputRow label="Emsal (KAKS)" value={p.emsal} onChange={set('emsal')} min={0.1} step={0.1} suffix="×" />
              <InputRow label="Kat Sayısı" value={p.katSayisi} onChange={set('katSayisi')} min={2} step={1} suffix="kat" />
              <InputRow label="Net Satılabilir Oran" value={p.satilabilirOran} onChange={set('satilabilirOran')} min={50} step={1} suffix="%" />
              <InputRow label="Ortalama Daire" value={p.ortalamaDaireM2} onChange={set('ortalamaDaireM2')} min={40} step={5} suffix="m²" />
            </div>

            <div className="card">
              <div style={{ fontFamily:'var(--serif)', fontSize:'.88rem', fontWeight:600, marginBottom:12, color:'var(--blue2)' }}>
                🤝 Paylaşım Oranları
              </div>
              <InputRow label="Müteahhit Payı" value={p.muteahhitPay} onChange={set('muteahhitPay')} min={40} max={80} step={1} suffix="%" />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.75rem', color:'var(--muted)', marginBottom:8 }}>
                <span>Arsa sahibi payı</span>
                <span style={{ color:'var(--text)', fontWeight:600 }}>{100 - p.muteahhitPay}%</span>
              </div>
              <div style={{ borderRadius:99, overflow:'hidden', height:8, background:'var(--surface2)', display:'flex' }}>
                <div style={{ width:`${p.muteahhitPay}%`, background:'var(--blue)', transition:'width .2s' }} />
                <div style={{ flex:1, background:'var(--gold)' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:'.68rem' }}>
                <span style={{ color:'var(--blue2)' }}>Müteahhit {p.muteahhitPay}%</span>
                <span style={{ color:'var(--gold)' }}>Arsa sahibi {100 - p.muteahhitPay}%</span>
              </div>
            </div>

            <div className="card">
              <div style={{ fontFamily:'var(--serif)', fontSize:'.88rem', fontWeight:600, marginBottom:12, color:'var(--red)' }}>
                🔨 Maliyet & Satış
              </div>
              <InputRow label="İnşaat Maliyeti" value={p.insaatMaliyeti} onChange={set('insaatMaliyeti')} min={5000} step={500} prefix="₺" suffix="/m²" />
              <InputRow label="Ek Masraf Oranı" value={p.ekMasrafOran} onChange={set('ekMasrafOran')} min={5} max={30} step={1} suffix="%" />
              <div style={{ fontSize:'.68rem', color:'var(--muted)', marginBottom:12, marginTop:-6 }}>Proje, ruhsat, KDV, tapu, pazarlama</div>
              <InputRow label="Satış Fiyatı" value={p.satisFiyati} onChange={set('satisFiyati')} min={10000} step={500} prefix="₺" suffix="/m²" />
            </div>

            <button className="btn btn-ghost btn-sm" style={{ width:'100%' }}
              onClick={() => setP({ ...VARSAYILAN })}>
              ↺ Varsayılanlara Sıfırla
            </button>
          </div>

          {/* SAĞ: Sonuçlar */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

            {/* KPI */}
            <div className="g4">
              <KpiBox label="Toplam İnşaat" val={`${FMT(s.toplamInsaat)} m²`} sub={`${FMT(s.netSatilabilir)} m² satılabilir`} color="var(--blue2)" />
              <KpiBox label="Daire Sayısı" val={s.toplamDaire} sub={`${s.muteahhitDaire} müt. + ${s.arsaSahibiDaire} arsa`} color="var(--gold)" />
              <KpiBox label="Net Kâr" val={M(s.netKar)} sub={`%${FMT2(s.karMarji)} marj`} color={karRenk} large />
              <KpiBox label="ROI" val={`%${FMT2(s.roi)}`} sub="Yatırım getirisi" color={s.roi > 40 ? 'var(--green)' : s.roi > 20 ? 'var(--amber)' : 'var(--red)'} />
            </div>

            {/* Tab navigasyon */}
            <div style={{ display:'flex', gap:2, background:'var(--surface)', borderRadius:'var(--r)', padding:3, border:'1px solid var(--border)' }}>
              {[['analiz','📊 Detaylı Analiz'],['senaryo','🔄 Senaryo'],['dagilim','🏠 Daire Dağılımı']].map(([id,lbl]) => (
                <button key={id} onClick={() => setAktifTab(id)} style={{
                  flex:1, padding:'7px 0', borderRadius:6, border:'none', cursor:'pointer',
                  background: aktifTab === id ? 'var(--surface2)' : 'transparent',
                  color: aktifTab === id ? 'var(--text)' : 'var(--muted)',
                  fontFamily:'var(--font)', fontSize:'.78rem', fontWeight: aktifTab === id ? 600 : 400,
                  transition:'all .15s',
                }}>{lbl}</button>
              ))}
            </div>

            {/* TAB: Detaylı Analiz */}
            {aktifTab === 'analiz' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div className="g2">
                  <div className="card">
                    <div style={{ fontFamily:'var(--serif)', fontSize:'.88rem', fontWeight:600, marginBottom:12, color:'var(--red)' }}>📉 Maliyet Kırılımı</div>
                    {[
                      ['İnşaat Maliyeti', M(s.insaatMaliyet), false],
                      ['Ek Masraflar', M(s.ekMasraf), false],
                      ['Toplam Maliyet', M(s.toplamMaliyet), true],
                    ].map(([lbl, val, bold]) => (
                      <div key={lbl} style={{
                        display:'flex', justifyContent:'space-between', alignItems:'center',
                        padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,.04)',
                        fontWeight: bold ? 700 : 400, color: bold ? 'var(--red)' : 'var(--text)',
                      }}>
                        <span style={{ fontSize:'.8rem', color: bold ? 'var(--red)' : 'var(--muted)' }}>{lbl}</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize: bold ? '.9rem' : '.8rem' }}>{val}</span>
                      </div>
                    ))}
                    <div style={{ marginTop:10 }}>
                      <div style={{ fontSize:'.68rem', color:'var(--muted)', marginBottom:4 }}>Maliyet/m² dağılımı</div>
                      <div style={{ height:6, borderRadius:99, background:'var(--surface2)', overflow:'hidden', display:'flex' }}>
                        <div style={{ width:`${100 / (1 + p.ekMasrafOran / 100)}%`, background:'var(--red)', opacity:.7 }} />
                        <div style={{ flex:1, background:'var(--amber)', opacity:.7 }} />
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.65rem', color:'var(--muted)', marginTop:3 }}>
                        <span>İnşaat</span><span>Ek masraf</span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div style={{ fontFamily:'var(--serif)', fontSize:'.88rem', fontWeight:600, marginBottom:12, color:'var(--green)' }}>📈 Gelir & Kâr Analizi</div>
                    {[
                      ['Müteahhit Geliri', M(s.muteahhitGelir), false, 'var(--green)'],
                      ['Toplam Maliyet', `−${M(s.toplamMaliyet)}`, false, 'var(--red)'],
                      ['Net Kâr', M(s.netKar), true, karRenk],
                    ].map(([lbl, val, bold, color]) => (
                      <div key={lbl} style={{
                        display:'flex', justifyContent:'space-between', alignItems:'center',
                        padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,.04)',
                      }}>
                        <span style={{ fontSize:'.8rem', color:'var(--muted)' }}>{lbl}</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize: bold ? '.9rem' : '.8rem', fontWeight: bold ? 700 : 400, color }}>{val}</span>
                      </div>
                    ))}
                    <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {[
                        ['Kâr Marjı', `%${FMT2(s.karMarji)}`],
                        ['ROI', `%${FMT2(s.roi)}`],
                        ['Arsa Bedeli (örtülü)', M(s.arsaBedel)],
                        ['Arsa/Gelir Oranı', `%${FMT2(s.arsaBedelOrani)}`],
                      ].map(([lbl, val]) => (
                        <div key={lbl} style={{ background:'var(--surface2)', borderRadius:8, padding:'8px 10px' }}>
                          <div style={{ fontSize:'.65rem', color:'var(--muted)', marginBottom:2 }}>{lbl}</div>
                          <div style={{ fontFamily:'var(--mono)', fontSize:'.82rem', fontWeight:600 }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Break-even */}
                <div className="card">
                  <div style={{ fontFamily:'var(--serif)', fontSize:'.88rem', fontWeight:600, marginBottom:12 }}>⚖️ Break-even & Güvenlik Marjı</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
                    {[
                      { lbl:'Break-even Fiyat', val: M(s.breakEvenFiyat), sub:'min. satış fiyatı/m²' },
                      { lbl:'Mevcut Satış Fiyatı', val: M(s.satisFiyati), sub:'hedef fiyat/m²' },
                      { lbl:'Güvenlik Tamponu', val:`%${FMT2(((s.satisFiyati - s.breakEvenFiyat) / s.satisFiyati) * 100)}`, sub:'fiyat düşme toleransı',
                        color: s.satisFiyati > s.breakEvenFiyat * 1.2 ? 'var(--green)' : 'var(--amber)' },
                    ].map(item => (
                      <div key={item.lbl} style={{ background:'var(--surface2)', borderRadius:8, padding:'10px 12px' }}>
                        <div style={{ fontSize:'.68rem', color:'var(--muted)', marginBottom:3 }}>{item.lbl}</div>
                        <div style={{ fontFamily:'var(--mono)', fontSize:'.9rem', fontWeight:700, color: item.color || 'var(--text)' }}>{item.val}</div>
                        <div style={{ fontSize:'.65rem', color:'var(--muted)', marginTop:2 }}>{item.sub}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ position:'relative', height:20, borderRadius:99, background:'var(--surface2)' }}>
                    <div style={{
                      position:'absolute', left:0, top:0, bottom:0, borderRadius:99,
                      width:`${Math.min((s.breakEvenFiyat / s.satisFiyati) * 100, 100)}%`,
                      background:'linear-gradient(90deg,rgba(239,68,68,.4),rgba(239,68,68,.7))',
                    }} />
                    <div style={{
                      position:'absolute', left:`${Math.min((s.breakEvenFiyat / s.satisFiyati) * 100, 99)}%`,
                      top:-2, bottom:-2, width:2, background:'var(--red)', borderRadius:1,
                    }} />
                    <div style={{ position:'absolute', right:0, top:0, bottom:0, width:8, borderRadius:'0 99px 99px 0', background:'var(--green)', opacity:.6 }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.65rem', color:'var(--muted)', marginTop:3 }}>
                    <span>₺0</span>
                    <span style={{ color:'var(--red)' }}>↑ BE {M(s.breakEvenFiyat)}</span>
                    <span style={{ color:'var(--green)' }}>Satış {M(s.satisFiyati)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Senaryo */}
            {aktifTab === 'senaryo' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div className="g3">
                  {senaryolar.map(sn => (
                    <div key={sn.label} className="card" style={{ borderTop:`3px solid ${sn.color}` }}>
                      <div style={{ fontFamily:'var(--serif)', fontSize:'.9rem', fontWeight:700, color:sn.color, marginBottom:10 }}>{sn.label}</div>
                      <div style={{ fontSize:'.68rem', color:'var(--muted)', marginBottom:10 }}>
                        Satış {sn.satisFiyatiCarpan > 1 ? '+' : ''}{Math.round((sn.satisFiyatiCarpan - 1) * 100)}% |
                        Maliyet {sn.maliyetCarpan > 1 ? '+' : ''}{Math.round((sn.maliyetCarpan - 1) * 100)}%
                      </div>
                      {[
                        ['Satış Fiyatı', M(Math.round(p.satisFiyati * sn.satisFiyatiCarpan)) + '/m²'],
                        ['Toplam Maliyet', M(sn.sonuc.toplamMaliyet)],
                        ['Müteahhit Geliri', M(sn.sonuc.muteahhitGelir)],
                        ['Net Kâr', M(sn.sonuc.netKar)],
                        ['Kâr Marjı', `%${FMT2(sn.sonuc.karMarji)}`],
                        ['ROI', `%${FMT2(sn.sonuc.roi)}`],
                      ].map(([lbl, val]) => (
                        <div key={lbl} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                          <span style={{ fontSize:'.72rem', color:'var(--muted)' }}>{lbl}</span>
                          <span style={{ fontFamily:'var(--mono)', fontSize:'.72rem', fontWeight:600 }}>{val}</span>
                        </div>
                      ))}
                      <div style={{
                        marginTop:10, textAlign:'center', padding:'6px 0', borderRadius:6, fontSize:'.72rem', fontWeight:700,
                        background: sn.sonuc.netKar > 0 ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
                        color: sn.sonuc.netKar > 0 ? 'var(--green)' : 'var(--red)',
                      }}>
                        {sn.sonuc.netKar > 0 ? '✅ KÂRLI' : '❌ ZARARLI'}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card">
                  <div style={{ fontFamily:'var(--serif)', fontSize:'.88rem', fontWeight:600, marginBottom:12 }}>Net Kâr Karşılaştırması</div>
                  {senaryolar.map(sn => {
                    const maxKar = Math.max(...senaryolar.map(x => Math.abs(x.sonuc.netKar)));
                    const pct = maxKar > 0 ? Math.abs(sn.sonuc.netKar) / maxKar * 100 : 0;
                    return (
                      <div key={sn.label} style={{ marginBottom:10 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:'.75rem' }}>
                          <span style={{ color:sn.color, fontWeight:600 }}>{sn.label}</span>
                          <span style={{ fontFamily:'var(--mono)', color: sn.sonuc.netKar > 0 ? 'var(--green)' : 'var(--red)' }}>{M(sn.sonuc.netKar)}</span>
                        </div>
                        <div style={{ height:8, borderRadius:99, background:'var(--surface2)' }}>
                          <div style={{
                            height:'100%', borderRadius:99, width:`${pct}%`,
                            background: sn.sonuc.netKar > 0 ? sn.color : 'var(--red)',
                            opacity:.8, transition:'width .3s',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: Daire Dağılımı */}
            {aktifTab === 'dagilim' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div className="g2">
                  <div className="card" style={{ borderTop:'3px solid var(--blue)' }}>
                    <div style={{ fontFamily:'var(--serif)', fontSize:'.9rem', fontWeight:700, color:'var(--blue2)', marginBottom:12 }}>🏗️ Müteahhit Payı</div>
                    <div style={{ fontSize:'2.5rem', fontWeight:700, color:'var(--blue2)', fontFamily:'var(--serif)', lineHeight:1 }}>{s.muteahhitDaire}</div>
                    <div style={{ fontSize:'.75rem', color:'var(--muted)', margin:'4px 0 12px' }}>daire — %{p.muteahhitPay} pay</div>
                    {[
                      ['Toplam Brüt Alan', `${FMT(s.muteahhitDaire * p.ortalamaDaireM2)} m²`],
                      ['Tahmini Satış Geliri', M(s.muteahhitGelir)],
                      ['Daire Başı Gelir', M(s.muteahhitDaire > 0 ? s.muteahhitGelir / s.muteahhitDaire : 0)],
                    ].map(([lbl, val]) => (
                      <div key={lbl} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                        <span style={{ fontSize:'.76rem', color:'var(--muted)' }}>{lbl}</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:'.76rem', fontWeight:600 }}>{val}</span>
                      </div>
                    ))}
                  </div>

                  <div className="card" style={{ borderTop:'3px solid var(--gold)' }}>
                    <div style={{ fontFamily:'var(--serif)', fontSize:'.9rem', fontWeight:700, color:'var(--gold)', marginBottom:12 }}>🏠 Arsa Sahibi Payı</div>
                    <div style={{ fontSize:'2.5rem', fontWeight:700, color:'var(--gold)', fontFamily:'var(--serif)', lineHeight:1 }}>{s.arsaSahibiDaire}</div>
                    <div style={{ fontSize:'.75rem', color:'var(--muted)', margin:'4px 0 12px' }}>daire — %{100 - p.muteahhitPay} pay</div>
                    {[
                      ['Toplam Brüt Alan', `${FMT(s.arsaSahibiDaire * p.ortalamaDaireM2)} m²`],
                      ['Arsa Bedeli (örtülü)', M(s.arsaBedel)],
                      ['Daire Başı Değer', M(s.arsaSahibiDaire > 0 ? s.arsaBedel / s.arsaSahibiDaire : 0)],
                    ].map(([lbl, val]) => (
                      <div key={lbl} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                        <span style={{ fontSize:'.76rem', color:'var(--muted)' }}>{lbl}</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:'.76rem', fontWeight:600 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div style={{ fontFamily:'var(--serif)', fontSize:'.88rem', fontWeight:600, marginBottom:12 }}>🏢 Toplam Proje Özeti</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                    {[
                      { lbl:'Toplam Daire', val:s.toplamDaire, ico:'🏠' },
                      { lbl:'Brüt İnşaat', val:`${FMT(s.toplamInsaat)} m²`, ico:'📐' },
                      { lbl:'Net Satılabilir', val:`${FMT(s.netSatilabilir)} m²`, ico:'📊' },
                      { lbl:'Toplam Proje Değeri', val: M(s.muteahhitGelir + s.arsaBedel), ico:'💰' },
                    ].map(item => (
                      <div key={item.lbl} style={{ background:'var(--surface2)', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
                        <div style={{ fontSize:'1.3rem', marginBottom:4 }}>{item.ico}</div>
                        <div style={{ fontFamily:'var(--mono)', fontSize:'.82rem', fontWeight:700 }}>{item.val}</div>
                        <div style={{ fontSize:'.65rem', color:'var(--muted)', marginTop:2 }}>{item.lbl}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop:14 }}>
                    <div style={{ fontSize:'.72rem', color:'var(--muted)', marginBottom:8 }}>Kat bazlı daire dağılımı (tahmini)</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      {Array.from({ length: Math.min(p.katSayisi, 8) }, (_, i) => {
                        const dairePerKat = Math.floor(s.toplamDaire / p.katSayisi);
                        const kalan = s.toplamDaire - dairePerKat * p.katSayisi;
                        const bu = i < kalan ? dairePerKat + 1 : dairePerKat;
                        return (
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:'.72rem' }}>
                            <span style={{ color:'var(--muted)', width:40, flexShrink:0 }}>{i + 1}. kat</span>
                            <div style={{ flex:1, height:14, borderRadius:4, background:'var(--surface2)', display:'flex', gap:2, padding:2 }}>
                              {Array.from({ length: bu }, (_, j) => (
                                <div key={j} style={{ flex:1, borderRadius:2, background: j < Math.floor(bu * p.muteahhitPay / 100) ? 'var(--blue)' : 'var(--gold)', opacity:.8 }} />
                              ))}
                            </div>
                            <span style={{ width:28, textAlign:'right', color:'var(--text)' }}>{bu}</span>
                          </div>
                        );
                      })}
                      {p.katSayisi > 8 && (
                        <div style={{ fontSize:'.68rem', color:'var(--muted)', textAlign:'center', padding:'4px 0' }}>
                          … ve {p.katSayisi - 8} kat daha
                        </div>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:12, marginTop:6, fontSize:'.68rem' }}>
                      <span><span style={{ display:'inline-block', width:8, height:8, background:'var(--blue)', borderRadius:2, marginRight:4 }} />Müteahhit</span>
                      <span><span style={{ display:'inline-block', width:8, height:8, background:'var(--gold)', borderRadius:2, marginRight:4 }} />Arsa sahibi</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
