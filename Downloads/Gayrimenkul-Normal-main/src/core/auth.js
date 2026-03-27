/**
 * src/core/auth.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.0 / 2026-03-23
 *
 * Firebase Authentication + RBAC entegrasyonu.
 * Giriş, çıkış, oturum izleme ve rol doğrulama burada yönetilir.
 */

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { auth, db }      from '../../config/firebase-config.js';
import { APP_CONFIG }    from '../../config/app-config.js';
import { canDo }         from '../../config/rbac-roles.js';
import { logAction }     from './logger.js';
import { showToast }     from '../ui/toast.js';
import { handleError }   from './error-handler.js';

const { collections, roles, userStatus } = APP_CONFIG;

// ─── Aktif kullanıcı önbelleği (RAM) ──────────────────────
let _currentUser   = null;   // Firebase Auth user nesnesi
let _currentProfile = null;  // Firestore profil belgesi

// ─── Genel Erişim ─────────────────────────────────────────
export const getCurrentUser    = () => _currentUser;
export const getCurrentProfile = () => _currentProfile;
export const getCurrentRole    = () => _currentProfile?.role || null;
export const isAdmin           = () => _currentProfile?.role === roles.ADMIN;

// ─── Giriş ────────────────────────────────────────────────
/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user, profile}>}
 */
export async function login(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile    = await _loadProfile(credential.user.uid);

    // Hesap askıya alınmış mı?
    if (profile.status === userStatus.SUSPENDED) {
      await signOut(auth);
      throw new Error('AUTH/SUSPENDED');
    }

    // Son giriş zamanını güncelle
    await updateDoc(doc(db, collections.users, credential.user.uid), {
      lastLoginAt: serverTimestamp(),
    });

    await logAction('LOGIN', 'users', credential.user.uid, null, null);

    return { user: credential.user, profile };
  } catch (err) {
    handleError(err, 'login');
    throw err;
  }
}

// ─── Çıkış ────────────────────────────────────────────────
export async function logout() {
  try {
    const uid = _currentUser?.uid;
    if (uid) await logAction('LOGOUT', 'users', uid, null, null);
    await signOut(auth);
    _currentUser    = null;
    _currentProfile = null;
    window.location.href = '/pages/index.html';
  } catch (err) {
    handleError(err, 'logout');
  }
}

// ─── Oturum Değişikliği Dinleyici ─────────────────────────
/**
 * Uygulama başlangıcında bir kez çağrılır.
 * Kullanıcı giriş/çıkış yaptığında callback tetiklenir.
 * @param {Function} onLogin  - (user, profile) => void
 * @param {Function} onLogout - () => void
 */
export function onSessionChange(onLogin, onLogout) {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        _currentUser    = firebaseUser;
        _currentProfile = await _loadProfile(firebaseUser.uid);
        onLogin(firebaseUser, _currentProfile);
      } catch (err) {
        handleError(err, 'onSessionChange');
        onLogout();
      }
    } else {
      _currentUser    = null;
      _currentProfile = null;
      onLogout();
    }
  });
}

// ─── Şifre Sıfırlama ──────────────────────────────────────
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    showToast('success', 'Şifre sıfırlama e-postası gönderildi.');
  } catch (err) {
    handleError(err, 'resetPassword');
  }
}

// ─── Şifre Değiştirme (kimlik doğrulama ile) ──────────────
export async function changePassword(currentPassword, newPassword) {
  try {
    const user       = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    await logAction('PASSWORD_CHANGE', 'users', user.uid, null, null);
    showToast('success', 'Şifreniz güncellendi.');
  } catch (err) {
    handleError(err, 'changePassword');
  }
}

// ─── Yetki Kontrolü (UI katmanı için) ─────────────────────
/**
 * Mevcut kullanıcının yetkisi yoksa hata fırlatır.
 * Modül fonksiyonlarının başında çağrılır.
 * @param {string} module
 * @param {string} action
 */
export function requirePermission(module, action) {
  const role = getCurrentRole();
  if (!role) throw new Error('AUTH/NOT_LOGGED_IN');
  if (!canDo(role, module, action)) {
    throw new Error(`AUTH/FORBIDDEN — ${module}:${action}`);
  }
}

// ─── Firestore Profil Yükle ───────────────────────────────
async function _loadProfile(uid) {
  const snap = await getDoc(doc(db, collections.users, uid));
  if (!snap.exists()) {
    throw new Error('AUTH/PROFILE_NOT_FOUND');
  }
  const profile = snap.data();
  _currentProfile = profile;
  return profile;
}

// ─── Admin: Yeni Kullanıcı Profili Oluştur ────────────────
/**
 * Firebase Auth ile kullanıcı oluşturulduktan sonra
 * Firestore profil belgesini yazar.
 * Yalnızca Admin tarafından çağrılır.
 * @param {string} uid
 * @param {object} data - { email, displayName, role }
 */
export async function createUserProfile(uid, data) {
  requirePermission('adminPanel', 'manageUsers');
  const profile = {
    uid,
    email:       data.email,
    displayName: data.displayName || '',
    role:        data.role || roles.VIEWER,
    status:      userStatus.ACTIVE,
    lang:        APP_CONFIG.defaultLang,
    theme:       APP_CONFIG.defaultTheme,
    createdAt:   serverTimestamp(),
    lastLoginAt: null,
    isDeleted:   false,
    deletedAt:   null,
    deletedBy:   null,
  };
  await setDoc(doc(db, collections.users, uid), profile);
  await logAction('CREATE_USER', 'users', uid, null, profile);
  return profile;
}

// ─── Admin: Kullanıcı Askıya Al / Aktifleştir ────────────
export async function setUserStatus(targetUid, newStatus) {
  requirePermission('adminPanel', 'manageUsers');
  const before = await getDoc(doc(db, collections.users, targetUid));
  await updateDoc(doc(db, collections.users, targetUid), {
    status: newStatus,
  });
  await logAction('UPDATE_USER_STATUS', 'users', targetUid,
    before.data(), { status: newStatus });
}

// ─── Admin: Kullanıcı Rolünü Güncelle ─────────────────────
export async function setUserRole(targetUid, newRole) {
  requirePermission('adminPanel', 'manageUsers');
  const before = await getDoc(doc(db, collections.users, targetUid));
  await updateDoc(doc(db, collections.users, targetUid), {
    role: newRole,
  });
  await logAction('UPDATE_USER_ROLE', 'users', targetUid,
    before.data(), { role: newRole });
}

// ─── Admin: Kullanıcı Soft-Delete ─────────────────────────
export async function deleteUserProfile(targetUid) {
  requirePermission('adminPanel', 'manageUsers');
  const before = await getDoc(doc(db, collections.users, targetUid));
  await updateDoc(doc(db, collections.users, targetUid), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: _currentUser.uid,
    status:    userStatus.SUSPENDED,
  });
  await logAction('DELETE_USER', 'users', targetUid, before.data(), null);
}
