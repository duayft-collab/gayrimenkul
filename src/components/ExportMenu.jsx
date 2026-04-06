/**
 * @file components/ExportMenu.jsx
 * @description İndir dropdown — PDF / Excel / JSON
 */
import { useState, useEffect, useRef } from 'react';
import { mulklerPdfExport, mulklerCsvExport, mulklerJsonExport } from '../core/export';

export default function ExportMenu({ mulkler, ozet }) {
  const [acik, setAcik] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const f = (e) => { if (ref.current && !ref.current.contains(e.target)) setAcik(false); };
    document.addEventListener('click', f);
    return () => document.removeEventListener('click', f);
  }, []);

  const calistir = (fn) => {
    fn(mulkler, ozet);
    setAcik(false);
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="btn btn-ghost btn-sm" onClick={() => setAcik(!acik)}>
        📥 İndir ▾
      </button>
      {acik && (
        <div style={{
          position: 'absolute', right: 0, top: '110%', zIndex: 100,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.4)',
          minWidth: 200, padding: 6,
        }}>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => calistir(mulklerPdfExport)}>
            📄 PDF Portföy Raporu
          </button>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => calistir(mulklerCsvExport)}>
            📊 Excel (CSV) Ham Veri
          </button>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => calistir(mulklerJsonExport)}>
            💾 JSON Yedek
          </button>
        </div>
      )}
    </div>
  );
}
