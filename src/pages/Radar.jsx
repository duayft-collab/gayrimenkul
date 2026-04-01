/**
 * @file pages/Radar.jsx
 * @description Gayrimenkul Radar — canlı sinyal akışı + kaynak bankası
 * @sources TKGM, Bakanlık, TÜİK, BDDK, Endeksa, GYODER, Resmi Gazete
 * @company Duay Global Trade | @version 1.0.0
 */

import { useState } from 'react';
import { Topbar, TickerBar } from '../components/Layout';

const SIGNALS = [
  {
    id: 1, urgent: true,
    title: 'Arnavutköy İmar Planı — Komisyon Gündemine Girdi',
    desc: 'Çevre Bakanlığı 1/5000 Nazım İmar Planı revizyonu. Konut imarlı dönüşüm teklifi. Karar çıkmadan fiyat hareketlenmesi bekleniyor.',
    source: 'Bakanlık.gov.tr', time: '12 dk önce',
    type: 'imar', badge: 'ACİL', badgeColor: 'danger',
    action: 'Karar Motoruna Ekle',
    city: 'İstanbul',
  },
  {
    id: 2,
    title: 'Bodrum Turgutreis — Yabancı Alımda %41 Artış',
    desc: 'TÜİK Q1 2026. Alman ve İngiliz vatandaşları artıyor. Fiyatlar henüz prim yapmadı — erken giriş penceresi açık.',
    source: 'TÜİK', time: '1 saat önce',
    type: 'yabanci', badge: 'FIRSAT', badgeColor: 'warning',
    city: 'Muğla',
  },
  {
    id: 3,
    title: 'BDDK — Konut Kredisi 6 Ayın Zirvesinde',
    desc: 'Mart 2026: +23.4% aylık artış. Faiz düşüş beklentisi etkisi. Talep toparlanmasının öncü göstergesi. Blackstone "erken toparlanma" tezi doğrulanıyor.',
    source: 'BDDK', time: '3 saat önce',
    type: 'kredi', badge: 'SİNYAL', badgeColor: 'info',
    city: 'Türkiye geneli',
  },
  {
    id: 4,
    title: 'İzmir Torbalı OSB — 3. Etap Onayı — Resmi Gazete',
    desc: 'Organize Sanayi Bölgesi genişlemesi onaylandı. Çevre arsa talebi artacak. Lojistik + konut senaryosu güçlü. Fiyatlar henüz yansımadı.',
    source: 'Resmi Gazete', time: 'Dün 09:15',
    type: 'imar', badge: 'ERKEN POZ', badgeColor: 'success',
    action: 'Arsa Radarına Ekle',
    city: 'İzmir',
  },
  {
    id: 5,
    title: 'GYODER Zirvesi — Veri Merkezi ve Yaşlı Bakım Öne Çıktı',
    desc: 'Yeni niş segmentler belirginleşiyor. Geleneksel konut+ofis+AVM üçlüsü yeterli değil. 2026\'da öne çıkan temalar: lojistik, senior living, data center.',
    source: 'GYODER', time: '2 gün önce',
    type: 'rapor', badge: 'RAPOR', badgeColor: 'muted',
    city: 'Türkiye geneli',
  },
  {
    id: 6,
    title: 'Antalya Kepez — Kentsel Dönüşüm Bölgesi İlanı',
    desc: 'Kepez ilçesinde 3 mahalle kentsel dönüşüm kapsamına alındı. Riskli yapı tespiti tamamlandı. Fiyatlar dönüşüm öncesi düşük — fırsat penceresi dar.',
    source: 'Çevre Bakanlığı', time: '3 gün önce',
    type: 'donusum', badge: 'FIRSAT', badgeColor: 'warning',
    city: 'Antalya',
  },
  {
    id: 7,
    title: 'İstanbul Konut Fiyat Endeksi — Mart 2026 +%6.2',
    desc: 'Aylık bazda en yüksek artış son 8 ayda. Kadıköy ve Beşiktaş öncü ilçeler. Yıllık bazda reel artış enflasyonun üzerinde.',
    source: 'Endeksa', time: '4 gün önce',
    type: 'fiyat', badge: 'VERİ', badgeColor: 'info',
    city: 'İstanbul',
  },
];

const SOURCES = [
  { name: 'TKGM Parsel Sorgu', desc: 'Tapu + imar durumu', status: 'live', category: 'resmi' },
  { name: 'Bakanlık Mekânsal Plan', desc: '1/100.000 çevre düzeni', status: 'live', category: 'resmi' },
  { name: 'Resmi Gazete', desc: 'İmar kararları, kamulaştırma', status: 'live', category: 'resmi' },
  { name: 'TÜİK Konut', desc: 'Satış istatistikleri', status: 'periodic', category: 'resmi' },
  { name: 'BDDK Kredi', desc: 'Konut kredisi hacmi', status: 'periodic', category: 'resmi' },
  { name: 'Endeksa', desc: 'Mahalle değer trendi', status: 'live', category: 'piyasa' },
  { name: 'Emlakjet Fiyat', desc: 'İlan fiyat anomalisi', status: 'live', category: 'piyasa' },
  { name: 'Fintables GYO', desc: 'NAV iskonto analizi', status: 'live', category: 'piyasa' },
  { name: 'GYODER', desc: 'Sektör raporları', status: 'periodic', category: 'piyasa' },
  { name: 'Arveya / Arsahane', desc: 'Arsa değer trendleri', status: 'periodic', category: 'piyasa' },
];

const FILTERS = [
  { id: 'all', label: 'Tümü', count: 47 },
  { id: 'imar', label: 'İmar Hareketleri', count: 8 },
  { id: 'yabanci', label: 'Yabancı Alım', count: 5 },
  { id: 'donusum', label: 'Kentsel Dönüşüm', count: 11 },
  { id: 'fiyat', label: 'Fiyat Anomalisi', count: 9 },
  { id: 'kredi', label: 'Kredi Verileri', count: 4 },
  { id: 'rapor', label: 'Sektör Raporu', count: 10 },
];

const BADGE_STYLES = {
  danger:  { bg: '#FEE2E2', color: '#9F1239', border: '#FECACA' },
  warning: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  success: { bg: '#D1FAE5', color: '#064E3B', border: '#6EE7B7' },
  info:    { bg: '#DBEAFE', color: '#1E3A8A', border: '#93C5FD' },
  muted:   { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
};

export default function Radar() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? SIGNALS : SIGNALS.filter(s => s.type === filter);

  return (
    <div>
      <Topbar title="Gayrimenkul Radar" />
      <TickerBar />
      <div style={{ padding: 24, paddingBottom: 60 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>
              Türkiye Gayrimenkul Radar
            </div>
            <div style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
              Karar öncesi erken uyarı sistemi · 47 aktif sinyal · Güncelleme: 2 dk önce
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: '.78rem', color: 'var(--green)', fontWeight: 600 }}>Canlı</span>
          </div>
        </div>

        {/* Filtreler */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{
                padding: '6px 14px', borderRadius: 99, fontSize: '.78rem', fontWeight: 500,
                border: `1px solid ${filter === f.id ? '#163966' : 'var(--color-border-tertiary)'}`,
                background: filter === f.id ? '#163966' : 'var(--color-background-primary)',
                color: filter === f.id ? '#fff' : 'var(--color-text-secondary)',
                cursor: 'pointer', transition: 'all .15s',
              }}>
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

          {/* Sol: Sinyal Akışı */}
          <div>
            <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Aktif Sinyaller
            </div>
            {filtered.map(sig => {
              const bs = BADGE_STYLES[sig.badgeColor] || BADGE_STYLES.muted;
              const dotColors = { danger: '#DC2626', warning: '#D97706', success: '#16A34A', info: '#2563EB', muted: '#9CA3AF' };
              return (
                <div key={sig.id} style={{
                  display: 'flex', gap: 14, padding: '14px 16px',
                  background: 'var(--color-background-primary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 12, marginBottom: 8, cursor: 'pointer',
                  transition: 'border-color .15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#163966'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border-tertiary)'}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColors[sig.badgeColor], marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: '.88rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>{sig.title}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: '.68rem', fontWeight: 700, background: bs.bg, color: bs.color, border: `1px solid ${bs.border}`, flexShrink: 0 }}>
                        {sig.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: '.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 6 }}>{sig.desc}</div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: '.72rem' }}>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>{sig.source}</span>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>·</span>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>{sig.time}</span>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>·</span>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>{sig.city}</span>
                      {sig.action && (
                        <>
                          <span style={{ color: 'var(--color-text-tertiary)' }}>·</span>
                          <span style={{ color: '#1E3A8A', fontWeight: 600, cursor: 'pointer' }}>{sig.action} →</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)', fontSize: '.85rem' }}>
                Bu kategoride sinyal bulunamadı.
              </div>
            )}
          </div>

          {/* Sağ: Kaynak Bankası + AI Özet */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Kaynak Bankası */}
            <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: '.82rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Kaynak Bankası
              </div>

              <div style={{ padding: '10px 14px' }}>
                <div style={{ fontSize: '.68rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Resmi Kaynaklar</div>
                {SOURCES.filter(s => s.category === 'resmi').map(src => (
                  <div key={src.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                    <div>
                      <div style={{ fontSize: '.8rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>{src.name}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--color-text-tertiary)' }}>{src.desc}</div>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: '.65rem', fontWeight: 600, background: src.status === 'live' ? '#D1FAE5' : '#FEF3C7', color: src.status === 'live' ? '#064E3B' : '#92400E', border: src.status === 'live' ? '1px solid #6EE7B7' : '1px solid #FDE68A' }}>
                      {src.status === 'live' ? 'Canlı' : 'Periyodik'}
                    </span>
                  </div>
                ))}

                <div style={{ fontSize: '.68rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.07em', margin: '12px 0 6px' }}>Piyasa Kaynakları</div>
                {SOURCES.filter(s => s.category === 'piyasa').map((src, i, arr) => (
                  <div key={src.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < arr.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: '.8rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>{src.name}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--color-text-tertiary)' }}>{src.desc}</div>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: '.65rem', fontWeight: 600, background: src.status === 'live' ? '#D1FAE5' : '#FEF3C7', color: src.status === 'live' ? '#064E3B' : '#92400E', border: src.status === 'live' ? '1px solid #6EE7B7' : '1px solid #FDE68A' }}>
                      {src.status === 'live' ? 'Canlı' : 'Periyodik'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Özet */}
            <div style={{ background: '#163966', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontSize: '.68rem', fontWeight: 600, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
                AI Haftalık Özet — 1 Nisan 2026
              </div>
              <div style={{ fontSize: '.82rem', color: '#fff', lineHeight: 1.7, marginBottom: 12 }}>
                Bu hafta <strong>3 kritik erken sinyal</strong> tespit edildi. Arnavutköy imar hareketi karar öncesi fırsat penceresi. Bodrum yabancı talebi prim yapmadan önce. Kredi artışı toparlanma öncüsü.
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Arnavutköy → İzle', 'Bodrum → Fırsat', 'Torbalı → Erken Pozisyon', 'Kredi ↑ → Talep Toparlanıyor'].map(tag => (
                  <span key={tag} style={{ padding: '4px 10px', background: 'rgba(255,255,255,.12)', borderRadius: 99, fontSize: '.7rem', color: 'rgba(255,255,255,.85)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}
