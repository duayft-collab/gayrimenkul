/**
 * @file components/LayoutKlasik.jsx
 * @description Klasik (eski) UI wrapper — mevcut Sidebar'ı yeniden kullanır
 *
 * Klasik modda tokens.css YÜKLENMEZ → eski index.css cascade temiz çalışır.
 * `.layout` `.sidebar` `.main` `.topbar` orijinal stillerinde render edilir.
 */
import { Sidebar } from './Layout';

export default function LayoutKlasik({ children }) {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main" style={{ paddingBottom: 80 }}>
        {children}
      </div>
    </div>
  );
}
