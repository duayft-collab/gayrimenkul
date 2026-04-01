import { create } from 'zustand';

export const useStore = create((set, get) => ({
  page: 'dashboard',
  setPage: (p) => set({ page: p }),

  properties: [],
  rentals: [],
  alerts: [],

  setProperties: (properties) => set({ properties }),
  setRentals: (rentals) => set({ rentals }),
  setAlerts: (alerts) => set({ alerts }),

  addProperty: (p) => set(s => ({ properties: [p, ...s.properties] })),
  updateProperty: (id, data) => set(s => ({ properties: s.properties.map(p => p.id === id ? { ...p, ...data } : p) })),
  removeProperty: (id) => set(s => ({ properties: s.properties.filter(p => p.id !== id) })),

  toasts: [],
  toast: (type, msg) => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, type, msg }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4000);
  },

  modal: null,
  openModal: (m) => set({ modal: m }),
  closeModal: () => set({ modal: null }),

  marketData: {
    usdTry: 38.42, eurTry: 41.85, goldGram: 3850, btcTry: 342000, bist100: 9840, inflation: 48.5
  },
}));
