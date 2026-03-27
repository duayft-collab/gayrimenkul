/**
 * src/modules/sozlesmeler.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.1 / 2026-03-27
 *
 * Sözleşmeler modülü — Kira & satış sözleşmeleri listeleme,
 * ekleme, düzenleme, soft-delete, biten sözleşme uyarısı.
 */

import { getSozlesmeler, createSozlesme, updateSozlesme, deleteSozlesme, getMulkler } from '../core/database.js';
import { undoDelete }      from '../core/database.js';
import { requirePermission } from '../core/auth.js';
import { t }               from '../core/i18n.js';
import { showToast, showUndoToast } from '../ui/toast.js';
import { handleError }     from '../core/error-handler.js';
import { APP_CONFIG }      from '../../config/app-config.js';

let _all       = [];
let _mulkler   = [];
let _editId    = null;
let _filterTur = 'Tümü';

// ─── Render ───────────────────────────────────────────────
export async function render(container) {
  container.innerHTML = `<div class="empty"><div class="empty-icon">⏳</div><div class="empty-text">${t('ui.loading')}</div></div>`;
  try {
    [_all, _mulkler] = await Promise.all([getSozlesmeler(), getMulkler()]);
    container.innerHTML = _buildShell();
    _renderList();
    _bindEvents();
    _checkExpiring();
  } catch (err) { handleError(err, 'sozlesmeler.render'); }
}

// ─── Shell HTML ───────────────────────────────────────────
function _buildShell() {
  const kiraCount  = _all.filter(s => s.tur === 'Kira').length;
  const satisCount = _all.filter(s => s.tur === 'Satış').length;
  const aktifCount = _all.filter(s => s.durum === 'Aktif').length;

  return `
  <div class="metrics-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:18px">
    <div class="metric-card">
      <div class="metric-label">Toplam Sözleşme</div>
      <div class="metric-value">${_all.length}</div>
      <div class="metric-sub">${aktifCount} aktif</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Kira Sözleşmesi</div>
      <div class="metric-value">${kiraCount}</div>
      <div class="metric-sub">aktif sözleşme</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Satış Sözleşmesi</div>
      <div class="metric-value">${satisCount}</div>
      <div class="metric-sub">tamamlandı veya devam ediyor</div>
    </div>
  </div>

  <div id="expiring-banner" style="display:none;background:var(--color-warning-bg);border:1px solid var(--color-warning-border);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12.5px;color:var(--color-warning-text)"></div>

  <div class="filter-bar">
    ${['Tümü','Kira','Satış'].map(f =>
      `<button class="filter-chip${_filterTur===f?' active':''}" onclick="window._sozFilter('${f}')">${f}</button>`
    ).join('')}
    <span style="flex:1"></span>
    <button class="btn btn-primary btn-sm" onclick="window._sozOpenModal(null)">+ ${t('sozlesmeler.add')}</button>
  </div>

  <div class="card" style="margin-top:14px">
    <div class="card-body" id="soz-list"></div>
  </div>

  <!-- Modal -->
  <div class="overlay" id="soz-modal">
    <div class="modal" style="max-width:560px">
      <div class="modal-header">
        <div class="modal-title" id="soz-modal-title">${t('sozlesmeler.add')}</div>
        <button class="modal-close" onclick="window._sozCloseModal()">✕</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="soz-edit-id">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('sozlesmeler.type')}</label>
            <select class="form-control" id="soz-tur">
              <option value="Kira">Kira</option>
              <option value="Satış">Satış</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${t('sozlesmeler.property')}</label>
            <select class="form-control" id="soz-mulk">
              <option value="">— Mülk Seç —</option>
              ${_mulkler.map(m => `<option value="${m.id}">${m.ad} (${m.sehir})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${t('sozlesmeler.party')}</label>
          <input class="form-control" id="soz-taraf" type="text" placeholder="Kiracı / Alıcı adı">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('sozlesmeler.startDate')}</label>
            <input class="form-control" id="soz-baslangic" type="date">
          </div>
          <div class="form-group">
            <label class="form-label">${t('sozlesmeler.endDate')}</label>
            <input class="form-control" id="soz-bitis" type="date">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('sozlesmeler.amount')} (₺)</label>
            <input class="form-control" id="soz-tutar" type="number" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">${t('sozlesmeler.deposit')} (₺)</label>
            <input class="form-control" id="soz-depozito" type="number" min="0">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${t('sozlesmeler.status')}</label>
          <select class="form-control" id="soz-durum">
            <option value="Aktif">Aktif</option>
            <option value="Bitti">Bitti</option>
            <option value="Yenileme Bekliyor">Yenileme Bekliyor</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${t('sozlesmeler.notes')}</label>
          <textarea class="form-control" id="soz-not" rows="2"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="window._sozCloseModal()">${t('ui.cancel')}</button>
        <button class="btn btn-primary" onclick="window._sozSave()">${t('ui.save')}</button>
      </div>
    </div>
  </div>`;
}

// ─── Liste Render ─────────────────────────────────────────
function _renderList() {
  const filtered = _filterTur === 'Tümü' ? _all : _all.filter(s => s.tur === _filterTur);
  const list = document.getElementById('soz-list');
  if (!list) return;

  if (!filtered.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📄</div><div class="empty-text">Sözleşme bulunamadı.</div></div>`;
    return;
  }

  list.innerHTML = filtered.map(s => {
    const mulk   = _mulkler.find(m => m.id === s.mulkId);
    const kalan  = s.bitisTarihi ? _kalanGun(s.bitisTarihi) : null;
    return `
    <div class="list-row" style="cursor:default">
      <div class="list-icon">${s.tur === 'Kira' ? '📋' : '🤝'}</div>
      <div class="list-main" style="flex:1">
        <div class="list-name">${s.taraf}</div>
        <div class="list-sub">${mulk ? mulk.ad : '—'} · ${s.baslangicTarihi || '—'} → ${s.bitisTarihi || '—'}
          ${kalan !== null && kalan <= 30 ? `<span class="tag tag-warning" style="margin-left:6px">⚠ ${kalan} gün kaldı</span>` : ''}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
        <div style="text-align:right">
          <div style="font-size:13px;font-weight:600">₺${Number(s.tutar).toLocaleString('tr-TR')}<small style="font-weight:400;color:var(--text-tertiary)">${s.tur==='Kira'?'/ay':''}</small></div>
          <div style="margin-top:3px">${_durumTag(s.durum)} <span class="tag tag-info">${s.tur}</span></div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="window._sozOpenModal('${s.id}')">✏️</button>
        <button class="btn btn-sm" style="background:var(--color-error-bg);color:var(--color-error-text);border:1px solid var(--color-error-border)"
          onclick="window._sozDelete('${s.id}','${(s.taraf||'').replace(/'/g,"\\'")}')">🗑</button>
      </div>
    </div>`;
  }).join('');
}

// ─── Biten Sözleşme Uyarısı ───────────────────────────────
function _checkExpiring() {
  const soon = _all.filter(s => s.durum === 'Aktif' && s.bitisTarihi && _kalanGun(s.bitisTarihi) <= 30);
  const banner = document.getElementById('expiring-banner');
  if (!banner) return;
  if (soon.length) {
    banner.style.display = 'block';
    banner.innerHTML = `⚠️ <strong>${soon.length} sözleşme</strong> 30 gün içinde sona eriyor: ${soon.map(s => s.taraf).join(', ')}`;
  }
}

// ─── Modal Aç ─────────────────────────────────────────────
function _openModal(id) {
  try { requirePermission('sozlesmeler', id ? 'update' : 'create'); } catch { return; }
  _editId = id || null;
  document.getElementById('soz-modal-title').textContent = id ? 'Sözleşme Düzenle' : t('sozlesmeler.add');
  document.getElementById('soz-edit-id').value = id || '';

  if (id) {
    const s = _all.find(x => x.id === id);
    if (s) {
      document.getElementById('soz-tur').value       = s.tur;
      document.getElementById('soz-mulk').value      = s.mulkId || '';
      document.getElementById('soz-taraf').value     = s.taraf || '';
      document.getElementById('soz-baslangic').value = s.baslangicTarihi || '';
      document.getElementById('soz-bitis').value     = s.bitisTarihi || '';
      document.getElementById('soz-tutar').value     = s.tutar || '';
      document.getElementById('soz-depozito').value  = s.depozito || '';
      document.getElementById('soz-durum').value     = s.durum || 'Aktif';
      document.getElementById('soz-not').value       = s.not || '';
    }
  } else {
    ['soz-taraf','soz-baslangic','soz-bitis','soz-tutar','soz-depozito','soz-not']
      .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('soz-tur').value   = 'Kira';
    document.getElementById('soz-durum').value = 'Aktif';
    document.getElementById('soz-mulk').value  = '';
  }
  document.getElementById('soz-modal').classList.add('open');
}

function _closeModal() {
  document.getElementById('soz-modal').classList.remove('open');
  _editId = null;
}

// ─── Kaydet ───────────────────────────────────────────────
async function _save() {
  const data = {
    tur:             document.getElementById('soz-tur').value,
    mulkId:          document.getElementById('soz-mulk').value,
    taraf:           document.getElementById('soz-taraf').value.trim(),
    baslangicTarihi: document.getElementById('soz-baslangic').value,
    bitisTarihi:     document.getElementById('soz-bitis').value,
    tutar:           +document.getElementById('soz-tutar').value || 0,
    depozito:        +document.getElementById('soz-depozito').value || 0,
    durum:           document.getElementById('soz-durum').value,
    not:             document.getElementById('soz-not').value.trim(),
  };

  // Bağlı mülkün adını da kaydet
  const mulk = _mulkler.find(m => m.id === data.mulkId);
  data.mulkAd = mulk ? mulk.ad : '';

  if (!data.taraf) { showToast('warning', 'Taraf adı zorunludur.'); return; }
  if (!data.mulkId) { showToast('warning', 'Mülk seçiniz.'); return; }

  try {
    if (_editId) {
      await updateSozlesme(_editId, data);
      const idx = _all.findIndex(s => s.id === _editId);
      if (idx >= 0) _all[idx] = { ..._all[idx], ...data };
    } else {
      const newId = await createSozlesme(data);
      _all.unshift({ id: newId, ...data });
    }
    _closeModal();
    _renderList();
    _checkExpiring();
    showToast('success', t('sozlesmeler.saved'));
  } catch (err) { handleError(err, 'sozlesmeler.save'); }
}

// ─── Sil ──────────────────────────────────────────────────
async function _delete(id, name) {
  try { requirePermission('sozlesmeler', 'delete'); } catch { return; }
  if (!confirm('Bu sözleşmeyi silmek istediğinize emin misiniz?')) return;
  try {
    const prev = await deleteSozlesme(id);
    _all = _all.filter(s => s.id !== id);
    _renderList();
    showUndoToast(name, async () => {
      await undoDelete(APP_CONFIG.collections.sozlesmeler, id, prev);
      _all.unshift({ id, ...prev });
      _renderList();
      showToast('success', t('sozlesmeler.saved'));
    }, t('sozlesmeler.deleted'));
  } catch (err) { handleError(err, 'sozlesmeler.delete'); }
}

// ─── Olayları Bağla ───────────────────────────────────────
function _bindEvents() {
  window._sozFilter     = (f) => { _filterTur = f; document.querySelectorAll('.filter-chip').forEach(b => b.classList.toggle('active', b.textContent === f)); _renderList(); };
  window._sozOpenModal  = _openModal;
  window._sozCloseModal = _closeModal;
  window._sozSave       = _save;
  window._sozDelete     = _delete;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') _closeModal(); });
}

// ─── Yardımcılar ──────────────────────────────────────────
function _kalanGun(tarih) {
  const diff = new Date(tarih) - new Date();
  return Math.ceil(diff / 86400000);
}
function _durumTag(d) {
  const map = { Aktif:'tag-green', Bitti:'tag-gray', 'Yenileme Bekliyor':'tag-warning' };
  return `<span class="tag ${map[d]||'tag-gray'}">${d}</span>`;
}
