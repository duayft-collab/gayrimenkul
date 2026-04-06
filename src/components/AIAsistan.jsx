/**
 * @file components/AIAsistan.jsx
 * @description Claude AI asistan — backend proxy üzerinden
 * @anayasa K02 — API KEY FRONTEND'DE YOK, sadece proxy URL
 */
import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/app';

const HIZLI_SORULAR = [
  'Portföyümü analiz et',
  'En karlı mülküm hangisi?',
  'Hangi bölgeye yatırım yapmalıyım?',
  'Kira artışı nasıl hesaplanır?',
  'Vergi hesaplama',
];

function gecmisiYukle() {
  try {
    return JSON.parse(sessionStorage.getItem('aiGecmis') || '[]');
  } catch { return []; }
}

function gecmisiKaydet(msgs) {
  try { sessionStorage.setItem('aiGecmis', JSON.stringify(msgs.slice(-20))); } catch {}
}

export default function AIAsistan() {
  const { mulkler } = useStore();
  const [acik, setAcik] = useState(false);
  const [mesajlar, setMesajlar] = useState(gecmisiYukle);
  const [giris, setGiris] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const bottomRef = useRef(null);
  const proxyUrl = import.meta.env.VITE_AI_PROXY_URL;

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollTop = bottomRef.current.scrollHeight;
  }, [mesajlar, acik]);

  const gonder = async (metin) => {
    const icerik = (metin || giris).trim();
    if (!icerik) return;
    const yeni = [...mesajlar, { rol: 'user', icerik }];
    setMesajlar(yeni);
    setGiris('');
    gecmisiKaydet(yeni);

    if (!proxyUrl) {
      const uyari = [...yeni, {
        rol: 'assistant',
        icerik: '⚠️ AI asistan yapılandırılmamış. Admin panelinden `VITE_AI_PROXY_URL` environment değişkenini ayarlamanız gerekir.\n\nBackend proxy olmadan API key frontend\'de tutulamaz (Anayasa K02).',
      }];
      setMesajlar(uyari);
      gecmisiKaydet(uyari);
      return;
    }

    setBekliyor(true);
    try {
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: yeni.map(m => ({ role: m.rol, content: m.icerik })),
          context: {
            mulkSayisi: (mulkler || []).length,
            toplamDeger: (mulkler || []).reduce((a, m) => a + (m.fiyat || 0), 0),
          },
        }),
      });
      const data = await res.json();
      const cevap = data.response || data.message || data.content || JSON.stringify(data);
      const sonraki = [...yeni, { rol: 'assistant', icerik: cevap }];
      setMesajlar(sonraki);
      gecmisiKaydet(sonraki);
    } catch (e) {
      const hata = [...yeni, { rol: 'assistant', icerik: '❌ Hata: ' + e.message }];
      setMesajlar(hata);
      gecmisiKaydet(hata);
    } finally {
      setBekliyor(false);
    }
  };

  const temizle = () => {
    setMesajlar([]);
    sessionStorage.removeItem('aiGecmis');
  };

  return (
    <>
      {/* Floating buton */}
      <button
        onClick={() => setAcik(!acik)}
        style={{
          position: 'fixed', bottom: 80, right: 20, zIndex: 1500,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#C9A84C,#1B4F8A)',
          color: '#fff', fontSize: '1.4rem',
          boxShadow: '0 6px 20px rgba(0,0,0,.5)',
        }}
        aria-label="AI Asistan"
      >💬</button>

      {/* Panel */}
      {acik && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 80, width: 450, maxWidth: '95vw',
          zIndex: 1400, background: 'var(--surface)', borderLeft: '1px solid var(--gold)',
          display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 40px rgba(0,0,0,.5)',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, color: 'var(--gold)' }}>🤖 AI Asistan</div>
              <div style={{ fontSize: '.65rem', color: 'var(--muted)' }}>Claude üzerinden</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-sm btn-ghost" onClick={temizle} title="Geçmişi temizle">🗑️</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setAcik(false)}>×</button>
            </div>
          </div>

          <div ref={bottomRef} style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            {mesajlar.length === 0 && (
              <div>
                <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: 10 }}>Hızlı sorular:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {HIZLI_SORULAR.map(s => (
                    <button key={s} className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => gonder(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mesajlar.map((m, i) => (
              <div key={i} style={{
                marginBottom: 10,
                display: 'flex', justifyContent: m.rol === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '85%',
                  background: m.rol === 'user' ? 'rgba(27,79,138,.2)' : 'rgba(201,168,76,.1)',
                  border: `1px solid ${m.rol === 'user' ? 'var(--blue)' : 'var(--gold)'}`,
                  borderRadius: 10, padding: '8px 12px', fontSize: '.82rem',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {m.icerik}
                </div>
              </div>
            ))}
            {bekliyor && (
              <div style={{ fontSize: '.72rem', color: 'var(--muted)', fontStyle: 'italic' }}>Düşünüyor...</div>
            )}
          </div>

          <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
            <input
              className="input" value={giris} onChange={e => setGiris(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !bekliyor && gonder()}
              placeholder="Sorunuzu yazın..."
              disabled={bekliyor}
            />
            <button className="btn btn-gold" onClick={() => gonder()} disabled={bekliyor || !giris.trim()}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}
