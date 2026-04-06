/**
 * @file components/VersiyonPanel.jsx
 * @description Entity versiyon listesi + diff + geri döndür
 */
import { useEffect, useState } from 'react';
import { versiyonlariListele, versiyonaDondur } from '../core/versiyonlama';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';

export default function VersiyonPanel({ entityTip, entityId, collectionAdi, onClose }) {
  const { user } = useAuthStore();
  const { toast } = useStore();
  const ws = user?.workspaceId;
  const [liste, setListe] = useState([]);
  const [sec, setSec] = useState(null);
  const [onay, setOnay] = useState(null);

  const yukle = async () => {
    const l = await versiyonlariListele(ws, entityTip, entityId);
    setListe(l);
  };
  useEffect(() => { yukle(); }, [entityTip, entityId]);

  const dondur = async (v) => {
    try {
      await versiyonaDondur({ workspaceId: ws, user, entityTip, entityId, versiyonId: v.id, collectionAdi });
      toast('success', `v${v.versiyon} geri yüklendi`);
      setOnay(null);
      onClose?.();
    } catch (e) {
      toast('error', e.message);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 720, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-head">
          <div className="modal-title">🕐 Versiyon Geçmişi</div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14 }}>
          {/* Sol — versiyon listesi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {liste.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: '.78rem' }}>Henüz versiyon yok</div>
            ) : liste.map(v => {
              const d = v.zaman?.toDate ? v.zaman.toDate() : new Date(v.zaman);
              const secili = sec?.id === v.id;
              return (
                <button key={v.id}
                  onClick={() => setSec(v)}
                  className={`btn btn-sm ${secili ? 'btn-gold' : 'btn-ghost'}`}
                  style={{ justifyContent: 'flex-start', flexDirection: 'column', alignItems: 'flex-start', padding: 10 }}
                >
                  <div>v{v.versiyon}</div>
                  <div style={{ fontSize: '.65rem', opacity: 0.8 }}>{v.degistiren}</div>
                  <div style={{ fontSize: '.6rem', opacity: 0.6 }}>{isNaN(d) ? '—' : d.toLocaleString('tr-TR')}</div>
                </button>
              );
            })}
          </div>
          {/* Sağ — seçili versiyon önizleme */}
          <div>
            {!sec ? (
              <div className="empty">
                <div className="empty-ico">👈</div>
                <div className="empty-title">Bir versiyon seçin</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: '.95rem', fontWeight: 700 }}>v{sec.versiyon}</div>
                  <button className="btn btn-sm btn-gold" onClick={() => setOnay(sec)}>↶ Bu Versiyona Dön</button>
                </div>
                <pre style={{
                  background: 'var(--surface2)', padding: 12, borderRadius: 6,
                  fontSize: '.7rem', overflowX: 'auto', maxHeight: '60vh',
                  fontFamily: 'var(--mono)', color: 'var(--muted)',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>{JSON.stringify(sec.veri, null, 2)}</pre>
              </>
            )}
          </div>
        </div>
      </div>

      {onay && (
        <div className="modal-bg" onClick={() => setOnay(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
            <div className="modal-head">
              <div className="modal-title">⚠️ Geri Dönüş Onayı</div>
            </div>
            <div className="modal-body">
              <p>v{onay.versiyon} versiyonuna dönmek istediğine emin misin?</p>
              <p style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
                Mevcut veriler v{liste[0]?.versiyon || '?'} olarak saklanıyor. Sonra geri alabilirsin.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setOnay(null)}>Vazgeç</button>
              <button className="btn btn-gold" onClick={() => dondur(onay)}>Evet, Geri Dön</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
