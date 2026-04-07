import { create } from 'zustand';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../core/firebase';

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  error: null,

  init: () => {
    onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) { set({ user: null, loading: false }); return; }
      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        const profile = snap.exists() ? snap.data() : {};
        set({
          user: {
            uid: fbUser.uid,
            email: fbUser.email,
            name: profile.name || fbUser.email.split('@')[0],
            // Güvenlik: default 'user' (eski 'super_admin' kaldırıldı)
            role: profile.role || 'user',
            // K11 izolasyon: workspaceId = uid (her kullanıcı kendi sandbox'ı)
            // profile.workspaceId override edilebilir (admin paylaşımlı ws atayabilir)
            workspaceId: profile.workspaceId || fbUser.uid,
            avatar: (profile.name || fbUser.email)[0].toUpperCase(),
          },
          loading: false,
          error: null,
        });
      } catch (e) {
        // Firestore hatası olsa bile giriş yap — fail-safe
        set({
          user: {
            uid: fbUser.uid,
            email: fbUser.email,
            name: fbUser.email.split('@')[0],
            role: 'user',
            workspaceId: fbUser.uid,
            avatar: fbUser.email[0].toUpperCase(),
          },
          loading: false,
          error: null,
        });
      }
    });
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      const msgs = {
        'auth/invalid-credential': 'E-posta veya şifre hatalı.',
        'auth/user-not-found': 'Kullanıcı bulunamadı.',
        'auth/wrong-password': 'Şifre hatalı.',
        'auth/too-many-requests': 'Çok fazla deneme. Lütfen bekleyin.',
      };
      set({ error: msgs[e.code] || e.message, loading: false });
    }
  },

  logout: async () => {
    await signOut(auth);
    set({ user: null });
    // Bellekteki tüm kullanıcı verisini temizle (güvenlik — kullanıcı değişiminde
    // önceki verinin sızmaması için). Lazy import: cycle önler.
    try {
      const { useStore } = await import('./app');
      useStore.getState().destroy?.();
      useStore.setState({
        mulkler: [], kiralar: [], alarmlar: [],
        kiracilar: [], odemeler: [], bildirimler: [],
        page: 'dashboard',
      });
    } catch (e) {
      console.warn('[logout] store reset:', e.message);
    }
  },

  clearError: () => set({ error: null }),
}));
