/**
 * @file components/ModDegistirButon.jsx
 * @description Sürüm değiştirme butonu — sol alt köşe floating
 */
import { useMod } from '../core/modStore';
import { useAuthStore } from '../store/auth';
import { isAdmin } from './RequireAdmin';

export default function ModDegistirButon() {
  const sifirla = useMod(s => s.sifirla);
  const mod = useMod(s => s.mod);
  const user = useAuthStore(s => s.user);

  // ADMİN-ONLY: Mod değiştirme yetkisi yalnızca admin/super_admin'de.
  // DOM'a hiç koymuyoruz — inspect ile bypass edilemez.
  if (!isAdmin(user)) return null;

  const tikla = () => {
    const onay = window.confirm(
      `Sürümü değiştirmek istediğine emin misin?\n\nMevcut: ${mod === 'yeni' ? 'EmlakPro Refined' : 'Klasik'}\nSayfa yenilenecek.`
    );
    if (onay) sifirla();
  };

  return (
    <button
      onClick={tikla}
      title="Sürüm değiştir"
      style={{
        position: 'fixed',
        bottom: 28,
        left: 28,
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 100,
        fontSize: 12,
        fontWeight: 600,
        color: '#4a4a52',
        cursor: 'pointer',
        zIndex: 1500,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      ⇄ {mod === 'yeni' ? 'Klasik' : 'EmlakPro'}'a Geç
    </button>
  );
}
