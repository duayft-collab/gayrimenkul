/**
 * @file components/RequireAdmin.jsx
 * @description Admin-only route guard. role !== 'admin'/'super_admin' → null render.
 *              DOM'a hiç koymaz (inspect ile bypass edilemez).
 */
import { useAuthStore } from '../store/auth';

export const ADMIN_ROLLERI = ['admin', 'super_admin'];

export function isAdmin(user) {
  return !!user && ADMIN_ROLLERI.includes(user.role);
}

export default function RequireAdmin({ children, fallback = null }) {
  const user = useAuthStore(s => s.user);
  if (!isAdmin(user)) return fallback;
  return children;
}
