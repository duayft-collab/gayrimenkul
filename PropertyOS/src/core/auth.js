/**
 * src/core/auth.js
 * Duay Global Trade Company — Property OS
 * Anayasa: K02
 * v1.0 / 2026-03-28
 */

import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { auth, db }     from '../../config/firebase-config.js';
import { APP_CONFIG }   from '../../config/app-config.js';
import { showToast }    from '../ui/toast.js';

let _user    = null;
let _profile = null;

export const getCurrentUser    = () => _user;
export const getCurrentProfile = () => _profile;

export async function login(email, password) {
  const cred    = await signInWithEmailAndPassword(auth, email, password);
  _user         = cred.user;
  _profile      = await _loadProfile(cred.user.uid);
  return { user: _user, profile: _profile };
}

export async function logout() {
  await signOut(auth);
  _user = null; _profile = null;
  window.location.href = '/PropertyOS/pages/index.html';
}

export function onSessionChange(onLogin, onLogout) {
  onAuthStateChanged(auth, async (u) => {
    if (u) {
      _user    = u;
      _profile = await _loadProfile(u.uid);
      onLogin(u, _profile);
    } else {
      _user = null; _profile = null;
      onLogout();
    }
  });
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

async function _loadProfile(uid) {
  const snap = await getDoc(doc(db, APP_CONFIG.collections.users, uid));
  if (!snap.exists()) {
    const profile = { uid, role: APP_CONFIG.roles.USER, lang: 'tr', theme: 'light', createdAt: serverTimestamp() };
    await setDoc(doc(db, APP_CONFIG.collections.users, uid), profile);
    return profile;
  }
  return snap.data();
}
