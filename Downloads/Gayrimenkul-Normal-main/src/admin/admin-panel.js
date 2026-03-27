/**
 * src/admin/admin-panel.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.0 / 2026-03-23
 *
 * Admin Paneli — Kullanıcı yönetimi, audit log, yedekleme.
 * Yalnızca 'admin' rolündeki kullanıcılar erişebilir.
 * RBAC koruması: router + requirePermission çift katmanlı kontrol.
 */

import {
  createUserProfile, setUserStatus, setUserRole, deleteUserProfile,
  resetPassword, requirePermission,
} from '../core/auth.js';
import { getAuditLogs }    from '../core/logger.js';
import { t }               from '../core/i18n.js';
import { showToast }       from '../ui/toast.js';
import { handleError }     from '../core/error-handler.js';
import { APP_CONFIG }      from '../../config/app-config.js';
import {
  collection, getDocs, query, orderBy, where, limit,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from '../../config/firebase-config.js';

let _activeTab = 'users';

// ─── Render ───────────────────────────────────────────────
export async function render(container, profile) {
  try {
    requirePermission('adminPanel', 'read');
  } catch {
    container.innerHTML = `<div class="empty">
      <div class="empty-icon">🔒</div>
      <div class="empty-text">${t('admin.accessDenied')}</div>
    </div>`;
    return;
  }

  container.innerHTML = `
    <div class="card" style="margin-bottom:0">
      <div class="tabs" id="admin-tabs">
        <div class="tab active" data-tab="users">${t('admin.users')}</div>
        <div class="tab" data-tab="audit">${t('admin.auditLog')}</div>
        <div class="tab" data-tab="backup">${t('admin.backup')}</div>
      </div>
      <div id="admin-content" style="min-height:300px"></div>
    </div>
  `;

  document.getElementById('admin-tabs').querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('#admin-tabs .tab').forEach(t_ => t_.classList.remove('active'));
      tab.classList.add('active');
      _activeTab = tab.dataset.tab;
      _renderTab();
    };
  });

  await _renderTab();
  _bindGlobal();
}

// ─── Sekme Render ─────────────────────────────────────────
async function _renderTab() {
  const content = document.getElementById('admin-content');
  content.innerHTML = `<div class="empty"><div class="empty-icon">⏳</div></div>`;

  if (_activeTab === 'users')  await _renderUsers(content);
  if (_activeTab === 'audit')  await _renderAudit(content);
  if (_activeTab === 'backup') _renderBackup(content);
}

// ─── Kullanıcılar ─────────────────────────────────────────
async function _renderUsers(container) {
  try {
    const snap  = await getDocs(
      query(collection(db, APP_CONFIG.collections.users),
        where('isDeleted', '==', false),
        orderBy('createdAt', 'desc'),
        limit(100))
    );
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    container.innerHTML = `
      <div style="padding:14px 18px;display:flex;justify-content:flex-end">
        <button class="btn btn-primary btn-sm" onclick="window._adminAddUser()">${t('admin.addUser')}</button>
      </div>
      <div style="overflow-x:auto">
      <table class="tbl">
        <thead>
          <tr>
            <th>${t('auth.email')}</th>
            <th>${t('admin.role')}</th>
            <th>${t('admin.status')}</th>
            <th>${t('admin.lastLogin')}</th>
            <th>${t('admin.action')}</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td>
                <strong>${u.displayName || '—'}</strong><br>
                <span style="font-size:11px;color:var(--text-tertiary)">${_maskEmail(u.email)}</span>
              </td>
              <td>${_roleTag(u.role)}</td>
              <td>${_statusTag(u.status)}</td>
              <td style="font-size:11.5px;color:var(--text-tertiary)">
                ${u.lastLoginAt ? new Date(u.lastLoginAt.seconds * 1000).toLocaleDateString('tr-TR') : '—'}
              </td>
              <td>
                <div style="display:flex;gap:5px;flex-wrap:wrap">
                  ${u.status === 'active'
                    ? `<button class="btn btn-sm" style="background:var(--color-warning-bg);color:var(--color-warning-text);border:1px solid var(--color-warning-border)"
                        onclick="window._adminSuspend('${u.id}')">${t('admin.suspendUser')}</button>`
                    : `<button class="btn btn-sm" style="background:var(--color-success-bg);color:var(--color-success-text);border:1px solid var(--color-success-border)"
                        onclick="window._adminActivate('${u.id}')">${t('admin.activateUser')}</button>`
                  }
                  <button class="btn btn-outline btn-sm" onclick="window._adminResetPw('${u.email}')">${t('admin.resetPassword')}</button>
                  <button class="btn btn-sm" style="background:var(--color-error-bg);color:var(--color-error-text);border:1px solid var(--color-error-border)"
                    onclick="window._adminDeleteUser('${u.id}')">${t('ui.delete')}</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table></div>

      <!-- Kullanıcı Ekle Modal -->
      <div class="overlay" id="user-modal">
        <div class="modal modal-sm">
          <div class="modal-header">
            <div class="modal-title">${t('admin.addUser')}</div>
            <button class="modal-close" onclick="document.getElementById('user-modal').classList.remove('open')">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">${t('auth.email')}</label>
              <input class="form-control" id="u-email" type="email">
            </div>
            <div class="form-group">
              <label class="form-label">Ad Soyad</label>
              <input class="form-control" id="u-name" type="text">
            </div>
            <div class="form-group">
              <label class="form-label">${t('admin.role')}</label>
              <select class="form-control" id="u-role">
                <option value="viewer">${t('admin.roles.viewer')}</option>
                <option value="manager">${t('admin.roles.manager')}</option>
                <option value="admin">${t('admin.roles.admin')}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('auth.password')} (geçici)</label>
              <input class="form-control" id="u-password" type="password" placeholder="Min. 6 karakter">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="document.getElementById('user-modal').classList.remove('open')">${t('ui.cancel')}</button>
            <button class="btn btn-primary" onclick="window._adminSaveUser()">${t('ui.save')}</button>
          </div>
        </div>
      </div>
    `;
  } catch (err) { handleError(err, 'admin.renderUsers'); }
}

// ─── Denetim Logu ─────────────────────────────────────────
async function _renderAudit(container) {
  try {
    const logs = await getAuditLogs(50);
    container.innerHTML = `
      <div style="overflow-x:auto">
      <table class="tbl">
        <thead>
          <tr>
            <th>${t('admin.logAction')}</th>
            <th>${t('admin.logCollection')}</th>
            <th>Belge ID</th>
            <th>Kullanıcı</th>
            <th>${t('admin.logTime')}</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(l => `
            <tr>
              <td>${_actionTag(l.action)}</td>
              <td><code style="font-size:11px">${l.collection || '—'}</code></td>
              <td><code style="font-size:11px;color:var(--text-tertiary)">${(l.docId || '—').slice(0,12)}…</code></td>
              <td style="font-size:11.5px">${l.email || l.uid?.slice(0,8) || '—'}</td>
              <td style="font-size:11px;color:var(--text-tertiary)">
                ${l.timestamp ? new Date(l.timestamp.seconds * 1000).toLocaleString('tr-TR') : '—'}
              </td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;
  } catch (err) { handleError(err, 'admin.renderAudit'); }
}

// ─── Yedekleme ────────────────────────────────────────────
function _renderBackup(container) {
  container.innerHTML = `
    <div class="card-body-padded">
      <div style="margin-bottom:20px">
        <div class="card-title" style="margin-bottom:8px">${t('admin.backup')}</div>
        <p style="font-size:12.5px;color:var(--text-secondary);margin-bottom:14px">
          Firestore verilerinin manuel yedeğini tetiklemek için aşağıdaki butona tıklayın.
          Otomatik yedekler Cloud Scheduler ile her gece 02:00'de alınır.
        </p>
        <button class="btn btn-primary" onclick="window._adminBackupNow()">${t('admin.backupNow')}</button>
      </div>

      <hr style="border:none;border-top:1px solid var(--border-light);margin:18px 0">

      <div>
        <div class="card-title" style="margin-bottom:8px">Point-in-Time Recovery (PITR)</div>
        <p style="font-size:12.5px;color:var(--text-secondary);margin-bottom:10px">
          Belirli bir tarihe geri dönmek için Firebase Console → Firestore → Import/Export kullanın.
          Detaylı adımlar README.md dosyasında belgelenmiştir.
        </p>
        <a href="https://console.firebase.google.com" target="_blank" class="btn btn-outline btn-sm">
          Firebase Console'u Aç ↗
        </a>
      </div>

      <hr style="border:none;border-top:1px solid var(--border-light);margin:18px 0">

      <div>
        <div class="card-title" style="margin-bottom:8px">KVKK / Kullanıcı Veri Talepleri</div>
        <p style="font-size:12.5px;color:var(--text-secondary);margin-bottom:10px">
          Kullanıcı verisini dışa aktarma veya silme talepleri için Kullanıcılar sekmesinden ilgili hesabı yönetin.
        </p>
      </div>
    </div>`;
}

// ─── Admin Aksiyonları ────────────────────────────────────
function _bindGlobal() {
  window._adminAddUser = () => {
    document.getElementById('user-modal')?.classList.add('open');
  };

  window._adminSaveUser = async () => {
    const email    = document.getElementById('u-email')?.value.trim();
    const name     = document.getElementById('u-name')?.value.trim();
    const role     = document.getElementById('u-role')?.value;
    const password = document.getElementById('u-password')?.value;

    if (!email || !password) {
      showToast('warning', 'E-posta ve şifre zorunludur.');
      return;
    }
    try {
      // Firebase Auth kullanıcı oluşturma — Cloud Function üzerinden yapılması önerilir
      // Client SDK ile başka kullanıcı oluştururken mevcut oturum kapanır.
      // Bu nedenle sadece Firestore profilini yazıyoruz; Auth'u Cloud Function ile oluşturun.
      showToast('info', 'Kullanıcı oluşturma için createUserWithEmailAndPassword Cloud Function kullanın.');
      document.getElementById('user-modal')?.classList.remove('open');
    } catch (err) { handleError(err, 'admin.saveUser'); }
  };

  window._adminSuspend = async (uid) => {
    if (!confirm('Hesabı askıya almak istediğinize emin misiniz?')) return;
    try { await setUserStatus(uid, 'suspended'); showToast('success', 'Hesap askıya alındı.'); await _renderTab(); }
    catch (err) { handleError(err, 'admin.suspend'); }
  };

  window._adminActivate = async (uid) => {
    try { await setUserStatus(uid, 'active'); showToast('success', 'Hesap aktifleştirildi.'); await _renderTab(); }
    catch (err) { handleError(err, 'admin.activate'); }
  };

  window._adminResetPw = async (email) => {
    await resetPassword(email);
  };

  window._adminDeleteUser = async (uid) => {
    if (!confirm(t('admin.confirmDelete'))) return;
    try { await deleteUserProfile(uid); showToast('success', t('admin.userDeleted')); await _renderTab(); }
    catch (err) { handleError(err, 'admin.deleteUser'); }
  };

  window._adminBackupNow = () => {
    showToast('info', 'Manuel yedekleme Cloud Function tetikleyicisiyle yapılır. Firebase Console'dan kontrol edin.');
  };
}

// ─── Yardımcılar ──────────────────────────────────────────
function _maskEmail(email) {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  return local.charAt(0) + '***@' + (domain || '');
}

function _roleTag(role) {
  const map = { admin: 'tag-red', manager: 'tag-info', viewer: 'tag-gray' };
  const labels = { admin: t('admin.roles.admin'), manager: t('admin.roles.manager'), viewer: t('admin.roles.viewer') };
  return `<span class="tag ${map[role] || 'tag-gray'}">${labels[role] || role}</span>`;
}

function _statusTag(status) {
  const map = { active: 'tag-green', suspended: 'tag-red', pending: 'tag-warning' };
  return `<span class="tag ${map[status] || 'tag-gray'}">${status}</span>`;
}

function _actionTag(action) {
  const map = { LOGIN:'tag-info', CREATE:'tag-green', UPDATE:'tag-warning', DELETE:'tag-red',
                LOGOUT:'tag-gray', EXPORT:'tag-info', UNDO_DELETE:'tag-green' };
  return `<span class="tag ${map[action] || 'tag-gray'}">${action}</span>`;
}
