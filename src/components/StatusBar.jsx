/**
 * @file components/StatusBar.jsx
 * @description Refined kompakt footer — canlı saat, Firestore stats, git SHA,
 *              oturum bilgisi. min-height 36px (önceki ~80px'ten %55 azalma).
 * @anayasa K02 hassas veri yok · K05 işlem sayaçları görünür · K14 PII içermez
 * @version 2.0.0 | 2026-04-07
 */
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useStore } from '../store/app';
import { useClock } from '../hooks/useClock';
import { useSession } from '../hooks/useSession';

const formatHHMMSS = (ts) => {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleTimeString('tr-TR', { hour12: false }); }
  catch { return '—'; }
};

const formatBoyut = (kb) => {
  if (!kb || kb <= 0) return '0KB';
  if (kb < 1024) return kb + 'KB';
  return (kb / 1024).toFixed(1) + 'MB';
};

export default function StatusBar() {
  const user = useAuthStore(s => s.user);
  const firestoreStats = useStore(s => s.firestoreStats);
  const mulkler = useStore(s => s.mulkler);
  const kiralar = useStore(s => s.kiralar);
  const alarmlar = useStore(s => s.alarmlar);

  const { saat, tarih } = useClock();
  const { baslangic, oturumSayisi } = useSession();

  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!user) return null;

  const stats = firestoreStats || { okumaSayisi: 0, yazmaSayisi: 0, sonIslem: null, tahminiBoyut: 0 };
  const toplamBelge = (mulkler?.length || 0) + (kiralar?.length || 0) + (alarmlar?.length || 0);
  const boyutStr = formatBoyut(stats.tahminiBoyut || toplamBelge * 2);
  const gitSha = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GIT_SHA) || 'dev';
  const oturumBasStr = baslangic.toLocaleTimeString('tr-TR', { hour12: false });
  const noktaSinif = !online ? 'hata' : (stats.sonIslem ? '' : 'uyari');

  return (
    <footer className="footer-refined" role="contentinfo">
      <div className="fr-grup">
        <span><span className={`fr-nokta ${noktaSinif}`} />Firestore</span>
        <span className="fr-deger">{stats.okumaSayisi || 0}/{stats.yazmaSayisi || 0}</span>
        <span className="fr-ayrac">·</span>
        <span><span className="fr-nokta" />Storage</span>
        <span className="fr-deger">{toplamBelge} belge</span>
        <span className="fr-deger">{boyutStr}</span>
        <span className="fr-ayrac">·</span>
        <span className="fr-etiket">v{gitSha}</span>
      </div>

      <div className="fr-grup">
        <span className="fr-kilit">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Gizli &amp; Şirkete Özel
        </span>
        <span className="fr-ayrac">·</span>
        <span className="fr-etiket">Çalışma</span>
        <span className="fr-deger">{user.workspaceId || '—'}</span>
        <span className="fr-ayrac">·</span>
        <span className="fr-etiket">Oturum</span>
        <span className="fr-deger">{oturumBasStr}</span>
        <span className="fr-etiket">({oturumSayisi})</span>
        <span className="fr-ayrac">·</span>
        <span className="fr-etiket">Son</span>
        <span className="fr-deger">{formatHHMMSS(stats.sonIslem)}</span>
        <span className="fr-ayrac">·</span>
        <span className="fr-deger">{tarih} · {saat}</span>
      </div>
    </footer>
  );
}
