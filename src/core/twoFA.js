/**
 * @file core/twoFA.js
 * @description App-layer 2FA (TOTP RFC 6238) — Firebase Auth MFA web SDK'si
 *              TOTP desteklemediği için uygulama katmanında implementasyon.
 * @anayasa K02 — TOTP secret kullanıcı profiline bağlı, HMAC Web Crypto ile
 */
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/* ═══ Base32 (RFC 4648) ═══ */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function rastgeleSecret(uzunluk = 20) {
  const bytes = new Uint8Array(uzunluk);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += B32[b % 32];
  return out;
}

function base32ToBytes(b32) {
  const temiz = b32.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  const out = [];
  let bits = 0, value = 0;
  for (const c of temiz) {
    const idx = B32.indexOf(c);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/* ═══ HMAC-SHA1 TOTP (RFC 6238) ═══ */
async function totpKod(secret, zaman = Date.now(), periyot = 30) {
  const counter = Math.floor(zaman / 1000 / periyot);
  const counterBytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = counter & 0xff;
    // Math shift safe: counter can exceed 2^32
  }
  // 8 byte big-endian counter manuel
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = c & 0xff;
    c = Math.floor(c / 256);
  }

  const key = await crypto.subtle.importKey(
    'raw', base32ToBytes(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false, ['sign']
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBytes));
  const offset = sig[sig.length - 1] & 0x0f;
  const code = ((sig[offset] & 0x7f) << 24) |
               ((sig[offset + 1] & 0xff) << 16) |
               ((sig[offset + 2] & 0xff) << 8) |
               (sig[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

export async function totpDogrula(secret, girilen, { pencere = 1 } = {}) {
  const simdi = Date.now();
  for (let i = -pencere; i <= pencere; i++) {
    const kod = await totpKod(secret, simdi + i * 30_000);
    if (kod === girilen) return true;
  }
  return false;
}

/* ═══ otpauth URI + QR URL ═══ */
export function otpauthUrl(secret, { issuer = 'DuayGlobalTrade', account = 'user' } = {}) {
  const enc = encodeURIComponent;
  return `otpauth://totp/${enc(issuer)}:${enc(account)}?secret=${secret}&issuer=${enc(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/** QR kodu render URL'si — qrserver.com public API
 *  DİKKAT K02: secret qrserver.com'a gönderiliyor. Kullanıcı bilgilendirilmeli.
 *  Alternatif: manuel secret girişi.
 */
export function qrUrl(uri) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(uri)}`;
}

/* ═══ Firestore entegrasyonu ═══ */
const USERS = 'users';

export async function kullaniciIkiFaProfili(uid) {
  try {
    const snap = await getDoc(doc(db, USERS, uid));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

export async function ikiFaKurulumBaslat(user) {
  if (!user?.uid) throw new Error('Kullanıcı yok');
  const secret = rastgeleSecret(20);
  const uri = otpauthUrl(secret, {
    issuer: 'Gayrimenkul Pro',
    account: user.email || user.uid,
  });
  return { secret, uri, qrUrl: qrUrl(uri) };
}

export async function ikiFaAktifEt(user, secret, girilenKod) {
  const ok = await totpDogrula(secret, girilenKod);
  if (!ok) throw new Error('Kod doğrulanamadı. Saat senkron mu?');
  const kurtarma = [];
  for (let i = 0; i < 10; i++) {
    kurtarma.push(rastgeleSecret(8).toLowerCase().replace(/(.{4})/, '$1-'));
  }
  await setDoc(doc(db, USERS, user.uid), {
    twoFA: {
      aktif: true,
      secret, // K02: ideally encrypted; MVP plain
      kurtarmaKodlari: kurtarma,
      kurulumTarihi: serverTimestamp(),
    },
  }, { merge: true });
  return kurtarma;
}

export async function ikiFaKapat(user) {
  if (!user?.uid) throw new Error('Kullanıcı yok');
  await updateDoc(doc(db, USERS, user.uid), {
    twoFA: { aktif: false, secret: null, kurtarmaKodlari: [], kapatildi: serverTimestamp() },
  });
}

export async function ikiFaGirisDogrula(user, girilen) {
  const profil = await kullaniciIkiFaProfili(user.uid);
  if (!profil?.twoFA?.aktif) return true;
  if (!girilen) return false;
  // Kurtarma kodu mu?
  if (profil.twoFA.kurtarmaKodlari?.includes(girilen)) {
    // Tek kullanımlık — listeden çıkar
    const yeni = profil.twoFA.kurtarmaKodlari.filter(k => k !== girilen);
    await updateDoc(doc(db, USERS, user.uid), { 'twoFA.kurtarmaKodlari': yeni });
    return true;
  }
  return await totpDogrula(profil.twoFA.secret, girilen);
}
