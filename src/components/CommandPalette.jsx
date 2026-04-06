/**
 * @file components/CommandPalette.jsx
 * @description Global arama (Cmd/Ctrl+K) — Linear/Notion tarzı
 */
import { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/app';

const SAYFALAR = [
  { id: 'dashboard',    ad: 'Dashboard',         icon: '🏠', alt: 'Ana sayfa' },
  { id: 'portfolio',    ad: 'Mülkler',           icon: '📋', alt: 'Mülk listesi' },
  { id: 'harita',       ad: 'Harita',            icon: '🗺️', alt: 'Harita görünümü' },
  { id: 'takvim',       ad: 'Takvim',            icon: '📅', alt: 'Olaylar ve vadeler' },
  { id: 'katkarsiligi', ad: 'Kat Karşılığı',     icon: '🏗️', alt: 'Müteahhit fizibilite' },
  { id: 'karsilastir',  ad: 'Karşılaştır',        icon: '⚖️', alt: 'Mülk karşılaştırma' },
  { id: 'radar',        ad: 'Radar',              icon: '📡', alt: 'Gayrimenkul radarı' },
  { id: 'location',     ad: 'Lokasyon İzleme',   icon: '📍', alt: 'Bölge takibi' },
  { id: 'lease',        ad: 'Sözleşme Zekası',   icon: '📄', alt: 'AI sözleşme analizi' },
  { id: 'anayasa',      ad: 'Anayasa',            icon: '⚖️', alt: 'Geliştirme kuralları' },
  { id: 'settings',     ad: 'Genel Ayarlar',      icon: '⚙️', alt: 'Ayarlar' },
];

export default function CommandPalette() {
  const { setPage, mulkler, kiralar, alarmlar } = useStore();
  const [acik, setAcik] = useState(false);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setAcik(s => !s);
        setQ('');
      } else if (e.key === 'Escape') {
        setAcik(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sonuclar = useMemo(() => {
    const arama = q.trim().toLowerCase();
    const tum = [
      ...SAYFALAR.map(s => ({ ...s, tip: 'sayfa' })),
      ...(mulkler || []).map(m => ({
        id: m.id, tip: 'mulk', icon: '🏠',
        ad: m.ad || 'İsimsiz mülk',
        alt: `${m.il || ''} ${m.ilce || ''} · ${m.fiyat ? '₺' + new Intl.NumberFormat('tr-TR').format(m.fiyat) : ''}`.trim(),
      })),
      ...(kiralar || []).map(k => ({
        id: k.id, tip: 'kira', icon: '🔑',
        ad: k.kiraci || 'Kiracı',
        alt: `Kira · ${k.aylikKira ? '₺' + k.aylikKira : ''}`,
      })),
      ...(alarmlar || []).map(a => ({
        id: a.id, tip: 'alarm', icon: '🔔',
        ad: a.baslik || 'Alarm',
        alt: a.aciklama || '',
      })),
    ];
    if (!arama) return tum.slice(0, 20);
    return tum.filter(x =>
      (x.ad || '').toLowerCase().includes(arama) ||
      (x.alt || '').toLowerCase().includes(arama)
    ).slice(0, 20);
  }, [q, mulkler, kiralar, alarmlar]);

  useEffect(() => { setIdx(0); }, [q]);

  const sec = (s) => {
    if (s.tip === 'sayfa') setPage(s.id);
    else if (s.tip === 'mulk') setPage('portfolio');
    else if (s.tip === 'kira') setPage('rental');
    else if (s.tip === 'alarm') setPage('dashboard');
    setAcik(false);
  };

  const keyNav = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, sonuclar.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && sonuclar[idx]) { sec(sonuclar[idx]); }
  };

  if (!acik) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onClick={() => setAcik(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 580, maxWidth: '90%', background: 'var(--surface)',
          border: '1px solid var(--gold)', borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,.6)', overflow: 'hidden',
        }}
      >
        <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
          <input
            autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={keyNav}
            placeholder="🔍 Ara: mülk, kiracı, sayfa... (Esc kapat)"
            className="input"
            style={{ fontSize: '.95rem', padding: '10px 14px', border: 'none', background: 'transparent' }}
          />
        </div>
        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          {sonuclar.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: '.82rem' }}>
              Sonuç bulunamadı
            </div>
          ) : (
            sonuclar.map((s, i) => (
              <div
                key={s.tip + s.id}
                onClick={() => sec(s)}
                onMouseEnter={() => setIdx(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', cursor: 'pointer',
                  background: idx === i ? 'rgba(201,168,76,.1)' : 'transparent',
                  borderLeft: idx === i ? '3px solid var(--gold)' : '3px solid transparent',
                }}
              >
                <div style={{ fontSize: '1.1rem' }}>{s.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{s.ad}</div>
                  <div style={{ fontSize: '.68rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.alt}</div>
                </div>
                <div style={{ fontSize: '.65rem', color: 'var(--muted)', textTransform: 'uppercase' }}>{s.tip}</div>
              </div>
            ))
          )}
        </div>
        <div style={{ padding: '8px 14px', fontSize: '.68rem', color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
          ↑↓ gezin · Enter seç · Esc kapat
        </div>
      </div>
    </div>
  );
}
