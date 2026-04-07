/**
 * @file core/modStore.js
 * @description Çift-mod sistemi — Klasik (Sidebar) vs EmlakPro Refined (TopNav)
 * @anayasa K02 — sadece UI tercihi, hassas veri yok
 */
import { create } from 'zustand';

const KEY = 'emlakpro_mod';

function detect() {
  try {
    return localStorage.getItem(KEY); // null | 'klasik' | 'yeni'
  } catch {
    return null;
  }
}

export const useMod = create((set) => ({
  mod: detect(),

  ayarla: (m) => {
    try { localStorage.setItem(KEY, m); } catch {}
    set({ mod: m });
    // Cascade temiz başlasın diye sayfayı yenile
    setTimeout(() => window.location.reload(), 100);
  },

  sifirla: () => {
    try { localStorage.removeItem(KEY); } catch {}
    set({ mod: null });
    setTimeout(() => window.location.reload(), 100);
  },
}));
