/**
 * @file components/MulkGaleri.jsx
 * @description Mülk medya galerisi — drag-drop upload + önizleme
 */
import { useEffect, useState, useRef } from 'react';
import { mulkDosyaYukle, mulkDosyaListele, mulkDosyaSil, KATEGORILER, formatBoyut } from '../core/storage';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';

const KAT_ETIKET = {
  foto: '📸 Foto', tapu: '📜 Tapu', sozlesme: '📝 Sözleşme', fatura: '🧾 Fatura', diger: '📁 Diğer'
};

export default function MulkGaleri({ mulkId }) {
  const { user } = useAuthStore();
  const { toast } = useStore();
  const [dosyalar, setDosyalar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [kategori, setKategori] = useState('foto');
  const [filtre, setFiltre] = useState('tumu');
  const [onizleme, setOnizleme] = useState(null);
  const fileRef = useRef(null);
  const ws = user?.workspaceId || 'ws_001';

  const yukle = async () => {
    if (!mulkId) return;
    const list = await mulkDosyaListele(ws, mulkId);
    setDosyalar(list);
  };
  useEffect(() => { yukle(); }, [mulkId]);

  const dosyaSec = async (files) => {
    if (!files || !files.length) return;
    setYukleniyor(true);
    for (const f of files) {
      try {
        await mulkDosyaYukle(ws, mulkId, f, kategori);
        toast('success', `${f.name} yüklendi`);
      } catch (e) {
        toast('error', e.message);
      }
    }
    setYukleniyor(false);
    yukle();
  };

  const onDrop = (e) => {
    e.preventDefault();
    dosyaSec(Array.from(e.dataTransfer.files));
  };

  const sil = async (dosya) => {
    try {
      await mulkDosyaSil(mulkId, dosya.yol);
      toast('success', 'Dosya silindi');
      yukle();
    } catch (e) {
      toast('error', e.message);
    }
  };

  const gosterilen = filtre === 'tumu' ? dosyalar : dosyalar.filter(d => d.kategori === filtre);
  const toplamBoyut = dosyalar.reduce((a, d) => a + (d.boyut || 0), 0);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 700, color: 'var(--gold)' }}>
          📸 Galeri ({dosyalar.length} · {formatBoyut(toplamBoyut)})
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <select className="select" value={kategori} onChange={e => setKategori(e.target.value)} style={{ width: 120, padding: '5px 8px', fontSize: '.75rem' }}>
            {KATEGORILER.map(k => <option key={k} value={k}>{KAT_ETIKET[k]}</option>)}
          </select>
          <button className="btn btn-gold btn-sm" onClick={() => fileRef.current?.click()} disabled={yukleniyor}>
            {yukleniyor ? 'Yükleniyor...' : '+ Yükle'}
          </button>
          <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => dosyaSec(Array.from(e.target.files))} />
        </div>
      </div>

      <div
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        style={{
          border: '2px dashed rgba(201,168,76,.3)', borderRadius: 8,
          padding: 16, textAlign: 'center', fontSize: '.78rem',
          color: 'var(--muted)', marginBottom: 12,
        }}
      >
        Dosyaları buraya sürükleyin veya yukarıdaki "+ Yükle" butonuna tıklayın
        <div style={{ fontSize: '.68rem', marginTop: 4 }}>Maks 10 MB · jpg/png/webp/pdf/docx</div>
      </div>

      {/* Filtre chipleri */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {['tumu', ...KATEGORILER].map(k => (
          <button key={k} className={`btn btn-sm ${filtre === k ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setFiltre(k)}>
            {k === 'tumu' ? 'Tümü' : KAT_ETIKET[k]}
          </button>
        ))}
      </div>

      {gosterilen.length === 0 ? (
        <div className="empty">
          <div className="empty-ico">🗂️</div>
          <div className="empty-title">Dosya yok</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {gosterilen.map(d => (
            <div key={d.yol} style={{
              background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8,
              overflow: 'hidden', position: 'relative', cursor: 'pointer',
            }} onClick={() => setOnizleme(d)}>
              {d.tip?.startsWith('image/') ? (
                <img src={d.url} alt={d.ad} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                  {d.tip?.includes('pdf') ? '📄' : '📎'}
                </div>
              )}
              <div style={{ padding: 6, fontSize: '.68rem' }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.ad}</div>
                <div style={{ color: 'var(--muted)' }}>{KAT_ETIKET[d.kategori]} · {formatBoyut(d.boyut)}</div>
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={e => { e.stopPropagation(); sil(d); }}
                style={{ position: 'absolute', top: 4, right: 4, padding: '2px 6px' }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {onizleme && (
        <div className="modal-bg" onClick={() => setOnizleme(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '80%', maxWidth: 900, maxHeight: '90vh' }}>
            <div className="modal-head">
              <div className="modal-title">{onizleme.ad}</div>
              <button className="btn btn-sm btn-ghost" onClick={() => setOnizleme(null)}>×</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              {onizleme.tip?.startsWith('image/') ? (
                <img src={onizleme.url} alt={onizleme.ad} style={{ maxWidth: '100%', maxHeight: '70vh' }} />
              ) : onizleme.tip?.includes('pdf') ? (
                <iframe src={onizleme.url} style={{ width: '100%', height: '70vh', border: 0 }} title={onizleme.ad} />
              ) : (
                <a href={onizleme.url} target="_blank" rel="noreferrer" className="btn btn-gold">📥 İndir</a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
