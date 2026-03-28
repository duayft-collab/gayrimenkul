/**
 * config/firebase-config.js
 * Duay Global Trade Company — Property OS
 * Anayasa: K02 — sıfır hardcode, .env ile doldur
 * v1.0 / 2026-03-28
 */

import { initializeApp }  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth }        from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore }   from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            'AIzaSyB5eValPPkRuPtJIgDnB7jRWOt2zythuRI',
  authDomain:        'companyplatform-9e1a8.firebaseapp.com',
  projectId:         'companyplatform-9e1a8',
  storageBucket:     'companyplatform-9e1a8.firebasestorage.app',
  messagingSenderId: '526343866340',
  appId:             '1:526343866340:web:31f9c04b85e284eac7e9f1',
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

export { app, auth, db };
