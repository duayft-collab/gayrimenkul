/**
 * @file pages/ModSecimi.jsx
 * @description İlk girişte sürüm seçim ekranı — Klasik vs EmlakPro Refined
 */
import { useMod } from '../core/modStore';

export default function ModSecimi() {
  const ayarla = useMod(s => s.ayarla);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      background: 'linear-gradient(135deg, #fbfaf7 0%, #f5ecd0 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ maxWidth: 920, width: '100%' }}>

        {/* Başlık */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            display: 'inline-block',
            padding: '6px 14px',
            background: 'rgba(184,146,74,0.12)',
            color: '#8a6d33',
            borderRadius: 100,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 16,
          }}>EMLAKPRO · SÜRÜM SEÇİMİ</div>
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 44px)',
            fontWeight: 500,
            letterSpacing: '-0.025em',
            marginBottom: 12,
            color: '#0c0c0d',
            lineHeight: 1.1,
            margin: 0,
          }}>Hangi sürümü kullanmak istersin?</h1>
          <p style={{
            color: '#4a4a52',
            fontSize: 16,
            marginTop: 14,
          }}>
            Bu seçimi istediğin zaman sol alt köşedeki butonla değiştirebilirsin.
          </p>
        </div>

        {/* 2 Kart */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
        }}>
          {/* KLASİK */}
          <button
            onClick={() => ayarla('klasik')}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#0c0c0d';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#ebe8e0';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            style={{
              background: 'white',
              border: '2px solid #ebe8e0',
              borderRadius: 24,
              padding: 36,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
              fontFamily: 'inherit',
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: '#f5f3ee',
              display: 'grid', placeItems: 'center',
              fontSize: 28, marginBottom: 20,
            }}>📋</div>
            <h2 style={{
              fontSize: 24,
              fontWeight: 600,
              marginBottom: 8,
              color: '#0c0c0d',
              margin: 0,
            }}>Klasik Sürüm</h2>
            <p style={{
              color: '#4a4a52',
              fontSize: 14,
              lineHeight: 1.6,
              margin: '8px 0 16px',
            }}>
              Sol menülü, tablo odaklı, bildiğin ve güvendiğin eski arayüz.
              Tüm işlevler yerinde, görsel değişmedi.
            </p>
            <ul style={{
              fontSize: 12,
              color: '#6a6a72',
              margin: '0 0 16px',
              padding: '0 0 0 18px',
              lineHeight: 1.8,
            }}>
              <li>Sol kenarda klasik sidebar menüsü</li>
              <li>Yoğun veri tabloları</li>
              <li>Sade altın/lacivert tema</li>
              <li>10+ ay test edilmiş, stabil</li>
            </ul>
            <div style={{
              display: 'inline-block',
              padding: '6px 12px',
              background: '#ebe8e0',
              borderRadius: 100,
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#4a4a52',
            }}>STABİL · KANITLANMIŞ</div>
          </button>

          {/* EMLAKPRO REFINED */}
          <button
            onClick={() => ayarla('yeni')}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 16px 40px rgba(184,146,74,0.3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(184,146,74,0.2)';
            }}
            style={{
              background: 'linear-gradient(135deg, #fff 0%, #f5ecd0 100%)',
              border: '2px solid #b8924a',
              borderRadius: 24,
              padding: 36,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: '0 8px 24px rgba(184,146,74,0.2)',
              fontFamily: 'inherit',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              background: 'radial-gradient(circle, rgba(184,146,74,0.15) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none',
            }} />
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #b8924a, #8a6d33)',
              display: 'grid', placeItems: 'center',
              fontSize: 28, marginBottom: 20,
              color: 'white',
              boxShadow: '0 6px 16px rgba(184,146,74,0.35)',
              position: 'relative',
            }}>✨</div>
            <h2 style={{
              fontSize: 24,
              fontWeight: 600,
              marginBottom: 8,
              fontFamily: 'Georgia, serif',
              color: '#0c0c0d',
              margin: 0,
              position: 'relative',
            }}>
              EmlakPro <em style={{ color: '#b8924a', fontStyle: 'italic' }}>Refined</em>
            </h2>
            <p style={{
              color: '#4a4a52',
              fontSize: 14,
              lineHeight: 1.6,
              margin: '8px 0 16px',
              position: 'relative',
            }}>
              Üst menülü, modern tipografi, otomatik dark/light tema,
              mesh gradient arka plan, glassmorphism nav.
            </p>
            <ul style={{
              fontSize: 12,
              color: '#6a6a72',
              margin: '0 0 16px',
              padding: '0 0 0 18px',
              lineHeight: 1.8,
              position: 'relative',
            }}>
              <li>Pill menüsü + Cmd+K komut paleti</li>
              <li>Fraunces serif başlık + Inter sans gövde</li>
              <li>Otomatik dark/light tema toggle</li>
              <li>2026 Refined tasarım dili</li>
            </ul>
            <div style={{
              display: 'inline-block',
              padding: '6px 12px',
              background: 'linear-gradient(135deg, #b8924a, #8a6d33)',
              color: 'white',
              borderRadius: 100,
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              position: 'relative',
            }}>YENİ · 2026</div>
          </button>
        </div>

        {/* Footer açıklama */}
        <div style={{
          marginTop: 32,
          textAlign: 'center',
          fontSize: 12,
          color: '#8a8a92',
          lineHeight: 1.6,
        }}>
          Tercihin <code style={{
            background: '#f5f3ee',
            padding: '2px 6px',
            borderRadius: 4,
            fontFamily: 'monospace',
          }}>localStorage.emlakpro_mod</code> içinde saklanır.<br />
          İki sürüm de aynı veriye erişir — istediğin zaman geçiş yapabilirsin.
        </div>

      </div>
    </div>
  );
}
