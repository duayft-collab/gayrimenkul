/**
 * firebase-config.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.0 / 2026-03-23
 *
 * GÜVENLIK: Bu dosyaya gerçek anahtar YAZMA.
 * Gerçek değerleri .env dosyasından veya
 * Firebase Hosting ortam değişkenlerinden oku.
 *
 * .env.example dosyasındaki anahtarları doldur,
 * ardından bu placeholder'ları değiştir.
 */

import { initializeApp }       from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth }             from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  enableIndexedDbPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAnalytics }        from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js';

// ─── PLACEHOLDER — .env'den doldur ────────────────────────
const firebaseConfig = {
  apiKey:            'YOUR_FIREBASE_API_KEY',
  authDomain:        'YOUR_PROJECT_ID.firebaseapp.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId:             'YOUR_APP_ID',
  measurementId:     'YOUR_MEASUREMENT_ID',
};
// ──────────────────────────────────────────────────────────

const app       = initializeApp(firebaseConfig);
const auth      = getAuth(app);
const db        = getFirestore(app);
const analytics = getAnalytics(app);

// Offline-First: IndexedDB cache aktif
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Birden fazla sekme açık — sadece bir sekmede aktif olur
    console.warn('[Firebase] Persistence: birden fazla sekme açık.');
  } else if (err.code === 'unimplemented') {
    console.warn('[Firebase] Persistence: bu tarayıcıda desteklenmiyor.');
  }
});

export { app, auth, db, analytics };
