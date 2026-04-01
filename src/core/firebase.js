import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDNWvZjgjpzM3eUcA_xDsapWZZaOs0qwWE",
  authDomain: "operasyon-platform.firebaseapp.com",
  projectId: "operasyon-platform",
  storageBucket: "operasyon-platform.firebasestorage.app",
  messagingSenderId: "810645052589",
  appId: "1:810645052589:web:3ac500eefa029904727a24",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
