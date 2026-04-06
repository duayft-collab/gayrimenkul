/**
 * @file core/rbac.js
 * @description Rol bazlı erişim kontrolü — K12
 */

export const ROLLER = ['viewer', 'user', 'manager', 'admin', 'super_admin'];

const YETKI_SEVIYE = {
  viewer:      1,
  user:        2,
  manager:     3,
  admin:       4,
  super_admin: 5,
};

export function rolSeviye(rol) {
  return YETKI_SEVIYE[rol] || 0;
}

export function yazabilir(user) {
  return rolSeviye(user?.role) >= 2;
}
export function silebilir(user) {
  return rolSeviye(user?.role) >= 3;
}
export function yonetebilir(user) {
  return rolSeviye(user?.role) >= 4;
}

/** CRUD öncesi throw eden yardımcı */
export function yetkiZorunlu(user, seviye = 'user') {
  const gerekli = YETKI_SEVIYE[seviye] || 2;
  if (rolSeviye(user?.role) < gerekli) {
    throw new Error(`Yetkisiz işlem — en az ${seviye} rolü gerekli`);
  }
}
