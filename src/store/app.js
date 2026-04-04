import { create } from 'zustand';
import { mulkleriDinle, kiralarDinle, alarmlarDinle, mulkEkle, mulkGuncelle, mulkSil } from '../core/db';

const TOAST_MS = 4000;
const UNDO_MS  = 30_000;

export const useStore = create((set, get) => ({
  page:    'dashboard',
  setPage: (p) => set({ page: p }),

  /* Realtime Firestore listenerlari — App.jsx'te init() cagrılınca baslar */
  _unsubFns: [],

  init: (workspaceId) => {
    const unsubs = [
      mulkleriDinle(workspaceId, (mulkler) => set({ mulkler })),
      kiralarDinle(workspaceId,  (kiralar)  => set({ kiralar })),
      alarmlarDinle(workspaceId, (alarmlar) => set({ alarmlar })),
    ];
    set({ _unsubFns: unsubs });
  },

  destroy: () => {
    get()._unsubFns.forEach(fn => fn());
    set({ _unsubFns: [] });
  },

  mulkler:  [],
  kiralar:  [],
  alarmlar: [],

  addProperty: async (veri) => {
    const { user } = get();
    return mulkEkle(user?.workspaceId || 'ws_001', veri);
  },

  updateProperty: async (id, veri) => mulkGuncelle(id, veri),

  /* K06: Soft delete + 30sn undo */
  removeProperty: async (id) => {
    const { mulkler, toast, undoSil, user } = get();
    const hedef = mulkler.find(p => p.id === id);
    if (!hedef) return;

    await mulkSil(id, user?.name || 'bilinmiyor');

    const timer = setTimeout(() => {}, UNDO_MS);
    toast('warning', `"${hedef.ad || 'Mülk'}" silindi.`, {
      undoLabel: 'Geri Al',
      onUndo: () => { clearTimeout(timer); undoSil(id); },
      sure: UNDO_MS,
    });
  },

  undoSil: async (id) => {
    await mulkGuncelle(id, { isDeleted: false, deletedAt: null, deletedBy: null });
    get().toast('success', 'Silme geri alındı.');
  },

  aktifMulkler: () => get().mulkler.filter(p => !p.isDeleted),

  /* Piyasa (statik, ileriki sprint'te API'den gelir) */
  marketData: { usdTry:38.42, eurTry:41.85, goldGram:3850, btcTry:342000, bist100:9840, inflation:48.5 },

  toasts: [],
  toast: (type, msg, opts = {}) => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, type, msg, ...opts }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), opts.sure || TOAST_MS);
  },
  dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  modal: null,
  openModal:  (m) => set({ modal: m }),
  closeModal: ()  => set({ modal: null }),
}));
