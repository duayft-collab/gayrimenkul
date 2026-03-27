/**
 * src/modules/kiracılar.js  →  dosya adı: kiracilar.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.1 / 2026-03-27
 *
 * Kiracı Profili modülü — Kiracı kayıt, iletişim bilgileri,
 * ödeme geçmişi özeti, bağlı sözleşmeler.
 * Firestore koleksiyonu: "kiracilar"
 */

import { createDoc, updateDocById, softDelete, listDocs } from '../core/database.js';
import { undoDelete }        from '../core/database.js';
import { requirePermission } from '../core/auth.js';
import { t }                 from '../core/i18n.js';
import { showToast, showUndoToast } from '../ui/toast.js';
import { handleError }       from '../core/error-handler.js';

const COL = 'kiracilar';

let _all     = [];
let _editId  = null;
let _searchQ = '';

// ─── Render ───────────────────────────────────────────────
export async function render(container) {
  container.innerHTML = `<div class="empty"><div class="empty-icon">⏳</div><div class="empty-text">${t('ui.loading')}</div></div>`;
  try {
    _all = await listDocs(COL);
    container.innerHTML = _buildShell();
    _renderGrid();
    _bindEvents();
  } catch (err) { handleError(err, 'kiracilar.render'); }
}

// ─── Shell ────────────────────────────────────────────────
function _buildShell() {
  const aktif   = _all.filter(k => k.durum === 'Aktif').length;
  const pasif   = _all.filter(k => k.durum === 'Geçmiş').length;

  return `
  <div class="metrics-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:18px">
    <div class="metric-card">
      <div class="metric-label">Toplam Kiracı</div>
      <div class="metric-value">${_all.length}</div>
      <div class="metric-sub">kayıtlı</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Aktif Kiracı</div>
      <div class="metric-value" style="color:var(--color-success-text)">${aktif}</div>
      <div class="metric-sub">aktif sözleşme</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Geçmiş Kiracı</div>
      <div class="metric-value">${pasif}</div>
      <div class="metric-sub">geçmiş kayıt</div>
    </div>
  </div>

  <div class="filter-bar">
    <input class="search-box" id="kiracı-search" type="text"
      placeholder="Kiracı ara..." oninput="window._kiracıSearch(this.value)">
    <span style="flex:1"></span>
    <button class="btn btn-primary btn-sm" onclick="window._kiracıOpenModal(null)">+ Kiracı Ekle</button>
  </div>

  <div class="mulk-grid" id="kiracı-grid" style="margin-top:14px"></div>

  <!-- Modal -->
  <div class="overlay" id="kiracı-modal">
    <div class="modal" style="max-width:520px">
      <div class="modal-header">
        <div class="modal-title" id="kiracı-modal-title">Kiracı Ekle</div>
        <button class="modal-close" onclick="window._kiracıCloseModal()">✕</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="kiracı-edit-id">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Ad Soyad</label>
            <input class="form-control" id="kir-ad" type="text" placeholder="Ahmet Yılmaz">
          </div>
          <div class="form-group">
            <label class="form-label">Telefon</label>
            <input class="form-control" id="kir-tel" type="tel" placeholder="0555 000 00 00">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">E-posta</label>
            <input class="form-control" id="kir-email" type="email" placeholder="ornek@mail.com">
          </div>
          <div class="form-group">
            <label class="form-label">TC Kimlik No <small style="font-weight:400;text-transform:none">(opsiyonel)</small></label>
            <input class="form-control" id="kir-tc" type="text" maxlength="11" placeholder="———">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Durum</label>
            <select class="form-control" id="kir-durum">
              <option value="Aktif">✅ Aktif</option>
              <option value="Geçmiş">📁 Geçmiş</option>
              <option value="Aday">🔍 Aday</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Meslek</label>
            <input class="form-control" id="kir-meslek" type="text" placeholder="Serbest Meslek">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Acil İletişim</label>
          <input class="form-control" id="kir-acil" type="text" placeholder="İsim — Telefon">
        </div>
        <div class="form-group">
          <label class="form-label">Notlar</label>
          <textarea class="form-control" id="kir-not" rows="2" placeholder="Kiracı hakkında notlar..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="window._kiracıCloseModal()">${t('ui.cancel')}</button>
        <button class="btn btn-primary" onclick="window._kiracıSave()">${t('ui.save')}</button>
      </div>
    </div>
  </div>

  <!-- Detay Panel -->
  <div class="detail-overlay" id="kiracı-detail-overlay"
    onclick="if(event.target===this)this.classList.remove('open')">
    <div class="detail-panel" id="kiracı-detail-panel"></div>
  </div>`;
}

// ─── Grid Render ──────────────────────────────────────────
function _renderGrid() {
  const filtered = _all.filter(k => {
    const q = _searchQ.toLowerCase();
    return !q || [k.ad, k.tel, k.email, k.meslek].join(' ').toLowerCase().includes(q);
  });

  const grid = document.getElementById('kiracı-grid');
  if (!grid) return;

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">👤</div><div class="empty-text">Kiracı bulunamadı.</div></div>`;
    return;
  }

  grid.innerHTML = filtered.map(k => `
    <div class="mulk-card" onclick="window._kiracıDetail('${k.id}')">
      <div class="mulk-thumb" style="background:${_avatarColor(k.ad)}">
        <span style="color:#fff;font-size:20px;font-weight:700">${_initials(k.ad)}</span>
      </div>
      <div class="mulk-card-body">
        <div class="mulk-card-title">${k.ad}</div>
        <div class="mulk-card-loc">📞 ${k.tel || '—'}</div>
        <div class="mulk-card-footer">
          <div style="font-size:11px;color:var(--text-tertiary)">${k.meslek || '—'}</div>
          ${_durumTag(k.durum)}
        </div>
      </div>
    </div>`).join('');
}

// ─── Detay Panel ──────────────────────────────────────────
function _showDetail(id) {
  const k = _all.find(x => x.id === id);
  if (!k) return;
  document.getElementById('kiracı-detail-panel').innerHTML = `
    <div class="detail-header">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:44px;height:44px;border-radius:50%;background:${_avatarColor(k.ad)};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;flex-shrink:0">${_initials(k.ad)}</div>
        <div>
          <div class="detail-title">${k.ad}</div>
          <div style="font-size:11px;color:var(--text-tertiary);margin-top:2px">${k.meslek || '—'} · ${_durumTag(k.durum)}</div>
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-outline btn-sm" onclick="window._kiracıOpenModal('${k.id}')">✏️ Düzenle</button>
        <button class="modal-close" onclick="document.getElementById('kiracı-detail-overlay').classList.remove('open')">✕</button>
      </div>
    </div>
    <div class="detail-body">
      <div class="detail-section">İletişim Bilgileri</div>
      ${_dRow('Telefon',      k.tel   || '—')}
      ${_dRow('E-posta',      k.email || '—')}
      ${_dRow('TC Kimlik',    k.tc    ? '••••••' + k.tc.slice(-4) : '—')}
      ${_dRow('Acil İletişim',k.acil  || '—')}

      ${k.not ? `<div class="detail-section">Notlar</div>
        <div style="font-size:12px;color:var(--text-secondary);padding:8px 0">${k.not}</div>` : ''}

      <div style="margin-top:16px;display:flex;gap:8px">
        <button class="btn btn-outline btn-sm" onclick="window._kiracıOpenModal('${k.id}')">✏️ Düzenle</button>
        <button class="btn btn-sm" style="background:var(--color-error-bg);color:var(--color-error-text);border:1px solid var(--color-error-border)"
          onclick="window._kiracıDelete('${k.id}','${k.ad.replace(/'/g,"\\'")}')">🗑 Sil</button>
      </div>
    </div>`;
  document.getElementById('kiracı-detail-overlay').classList.add('open');
}

// ─── Modal Aç ─────────────────────────────────────────────
function _openModal(id) {
  try { requirePermission('sozlesmeler', id ? 'update' : 'create'); } catch { return; }
  _editId = id || null;
  document.getElementById('kiracı-modal-title').textContent = id ? 'Kiracı Düzenle' : 'Kiracı Ekle';
  document.getElementById('kiracı-edit-id').value = id || '';

  if (id) {
    const k = _all.find(x => x.id === id);
    if (k) {
      document.getElementById('kir-ad').value     = k.ad || '';
      document.getElementById('kir-tel').value    = k.tel || '';
      document.getElementById('kir-email').value  = k.email || '';
      document.getElementById('kir-tc').value     = k.tc || '';
      document.getElementById('kir-durum').value  = k.durum || 'Aktif';
      document.getElementById('kir-meslek').value = k.meslek || '';
      document.getElementById('kir-acil').value   = k.acil || '';
      document.getElementById('kir-not').value    = k.not || '';
    }
  } else {
    ['kir-ad','kir-tel','kir-email','kir-tc','kir-meslek','kir-acil','kir-not']
      .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('kir-durum').value = 'Aktif';
  }
  document.getElementById('kiracı-modal').classList.add('open');
}

function _closeModal() {
  document.getElementById('kiracı-modal').classList.remove('open');
  _editId = null;
}

// ─── Kaydet ───────────────────────────────────────────────
async function _save() {
  const data = {
    ad:     document.getElementById('kir-ad').value.trim(),
    tel:    document.getElementById('kir-tel').value.trim(),
    email:  document.getElementById('kir-email').value.trim(),
    tc:     document.getElementById('kir-tc').value.trim(),
    durum:  document.getElementById('kir-durum').value,
    meslek: document.getElementById('kir-meslek').value.trim(),
    acil:   document.getElementById('kir-acil').value.trim(),
    not:    document.getElementById('kir-not').value.trim(),
  };
  if (!data.ad) { showToast('warning', 'Ad soyad zorunludur.'); return; }

  try {
    if (_editId) {
      await updateDocById(COL, _editId, data);
      const idx = _all.findIndex(k => k.id === _editId);
      if (idx >= 0) _all[idx] = { ..._all[idx], ...data };
    } else {
      const newId = await createDoc(COL, data);
      _all.unshift({ id: newId, ...data });
    }
    _closeModal();
    _renderGrid();
    showToast('success', 'Kiracı kaydedildi.');
  } catch (err) { handleError(err, 'kiracilar.save'); }
}

// ─── Sil ──────────────────────────────────────────────────
async function _delete(id, name) {
  try { requirePermission('sozlesmeler', 'delete'); } catch { return; }
  if (!confirm('Bu kiracıyı silmek istediğinize emin misiniz?')) return;
  try {
    const prev = await softDelete(COL, id);
    _all = _all.filter(k => k.id !== id);
    document.getElementById('kiracı-detail-overlay')?.classList.remove('open');
    _renderGrid();
    showUndoToast(name, async () => {
      await undoDelete(COL, id, prev);
      _all.unshift({ id, ...prev });
      _renderGrid();
    }, 'Kiracı silindi.');
  } catch (err) { handleError(err, 'kiracilar.delete'); }
}

// ─── Olayları Bağla ───────────────────────────────────────
function _bindEvents() {
  window._kiracıSearch     = (q) => { _searchQ = q; _renderGrid(); };
  window._kiracıOpenModal  = _openModal;
  window._kiracıCloseModal = _closeModal;
  window._kiracıSave       = _save;
  window._kiracıDelete     = _delete;
  window._kiracıDetail     = _showDetail;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') _closeModal(); });
}

// ─── Yardımcılar ──────────────────────────────────────────
function _initials(ad) {
  if (!ad) return '?';
  const parts = ad.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : ad.slice(0, 2).toUpperCase();
}
function _avatarColor(ad) {
  const colors = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2'];
  let hash = 0;
  for (const c of (ad || '')) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}
function _durumTag(d) {
  const map = { Aktif:'tag-green', Geçmiş:'tag-gray', Aday:'tag-warning' };
  return `<span class="tag ${map[d]||'tag-gray'}">${d}</span>`;
}
function _dRow(k, v) {
  return `<div class="detail-row"><span class="detail-key">${k}</span><span class="detail-val">${v}</span></div>`;
}
