/**
 * @file components/DovizKuru.jsx
 * @description Döviz kuru widget — dashboard marketData'dan çeker
 */
import { useStore } from '../store/app';

export default function DovizKuru({ compact = false }) {
  const { marketData } = useStore();
  const items = [
    { k: 'USD', v: marketData?.usdTry, c: '#22C55E' },
    { k: 'EUR', v: marketData?.eurTry, c: '#1B4F8A' },
    { k: 'ALTIN', v: marketData?.goldGram, c: '#C9A84C' },
  ];
  if (compact) {
    return (
      <div style={{ display: 'flex', gap: 8, fontSize: '.72rem' }}>
        {items.map(i => (
          <span key={i.k} style={{ color: i.c }}>
            {i.k}: <b>{i.v ? i.v.toLocaleString('tr-TR') : '—'}</b>
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 6 }}>💱 Döviz Kurları</div>
      <div style={{ display: 'flex', gap: 12 }}>
        {items.map(i => (
          <div key={i.k} style={{ flex: 1 }}>
            <div style={{ fontSize: '.65rem', color: 'var(--muted)' }}>{i.k}/TRY</div>
            <div style={{ fontSize: '.95rem', fontWeight: 700, color: i.c }}>
              {i.v ? i.v.toLocaleString('tr-TR') : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
