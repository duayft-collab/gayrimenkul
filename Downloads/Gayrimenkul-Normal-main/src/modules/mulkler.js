/**
 * src/modules/mulkler.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.0 / 2026-03-23
 *
 * Mülkler modülü — Listeleme, ekleme, düzenleme, soft-delete, detay panel.
 */

import {
  getMulkler, createMulk, updateMulk, deleteMulk, undoDelete,
} from '../core/database.js';
import { requirePermission }  from '../core/auth.js';
import { t }                  from '../core/i18n.js';
import { showToast, showUndoToast } from '../ui/toast.js';
import { handleError }        from '../core/error-handler.js';
import { APP_CONFIG }         from '../../config/app-config.js';

let _allMulkler  = [];
let _editId      = null;
let _activeFilter= 'Tümü';
let _searchQ     = '';

// ─── Render (app.html tarafından çağrılır) ────────────────
export async function render(container) {
  try {
    _allMulkler = await getMulkler();
    container.innerHTML = _buildShell();
    _renderGrid();
    _bindShellEvents(container);
  } catch (err) { handleError(err, 'mulkler.render'); }
}

// ─── Shell HTML ───────────────────────────────────────────
function _buildShell() {
  return `
  <div class="filter-bar">
    <input class="search-box" id="mulk-search" type="text"
      placeholder="${t('mulkler.search')}" oninput="window._mulkSearch(this.value)">
    ${['Tümü','Konut','Ticari','Arsa','Bina'].map(f =>
      `<button class="filter-chip${_activeFilter===f?' active':''}" onclick="window._mulkFilter('${f}')">${f === 'Tümü' ? t('mulkler.filterAll') : _emoji(f)+' '+f}</button>`
    ).join('')}
    <span style="flex:1"></span>
    <button class="btn btn-primary btn-sm" id="add-btn-mulkler" onclick="window._mulkOpenModal(null)">
      + ${t('mulkler.add')}
    </button>
  </div>
  <div class="mulk-grid" id="mulk-grid"></div>

  <!-- Modal -->
  <div class="overlay" id="mulk-modal">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title" id="mulk-modal-title">${t('mulkler.add')}</div>
        <button class="modal-close" onclick="window._mulkCloseModal()">✕</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="mulk-edit-id">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('mulkler.name')}</label>
            <input class="form-control" id="m-ad" type="text" placeholder="${t('mulkler.name')}">
          </div>
          <div class="form-group">
            <label class="form-label">${t('mulkler.type')}</label>
            <select class="form-control" id="m-tur">
              <option value="Konut">${t('mulkler.types.konut')}</option>
              <option value="Ticari">${t('mulkler.types.ticari')}</option>
              <option value="Arsa">${t('mulkler.types.arsa')}</option>
              <option value="Bina">${t('mulkler.types.bina')}</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('mulkler.city')}</label>
            <input class="form-control" id="m-sehir" type="text">
          </div>
          <div class="form-group">
            <label class="form-label">${t('mulkler.district')}</label>
            <input class="form-control" id="m-ilce" type="text">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('mulkler.area')}</label>
            <input class="form-control" id="m-alan" type="number" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">${t('mulkler.purchasePrice')}</label>
            <input class="form-control" id="m-alis" type="number" min="0">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('mulkler.currentValue')}</label>
            <input class="form-control" id="m-deger" type="number" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">${t('mulkler.monthlyRent')} <small style="text-transform:none;font-weight:400">(${t('ui.optional')})</small></label>
            <input class="form-control" id="m-kira" type="number" min="0">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('mulkler.purpose')}</label>
            <select class="form-control" id="m-amac">
              <option value="Kiraya Verme">${t('mulkler.purposes.kira')}</option>
              <option value="Satış">${t('mulkler.purposes.satis')}</option>
              <option value="Yatırım">${t('mulkler.purposes.yatirim')}</option>
              <option value="Kişisel">${t('mulkler.purposes.kisisel')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${t('mulkler.status')}</label>
            <select class="form-control" id="m-durum">
              <option value="Boş">${t('mulkler.statuses.bos')}</option>
              <option value="Kirada">${t('mulkler.statuses.kirada')}</option>
              <option value="Satılık">${t('mulkler.statuses.satilik')}</option>
              <option value="Satıldı">${t('mulkler.statuses.satildi')}</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${t('mulkler.deed')}</label>
          <input class="form-control" id="m-tapu" type="text" placeholder="Ada:123 Parsel:45">
        </div>
        <div class="form-group">
          <label class="form-label">${t('mulkler.notes')}</label>
          <textarea class="form-control" id="m-not"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="window._mulkCloseModal()">${t('ui.cancel')}</button>
        <button class="btn btn-primary" onclick="window._mulkSave()">${t('ui.save')}</button>
      </div>
    </div>
  </div>

  <!-- Detay Panel -->
  <div class="detail-overlay" id="mulk-detail-overlay"
    onclick="if(event.target===this)this.classList.remove('open')">
    <div class="detail-panel" id="mulk-detail-panel"></div>
  </div>
  `;
}

// ─── Grid Render ──────────────────────────────────────────
function _renderGrid() {
  const filtered = _allMulkler.filter(m => {
    const matchType = _activeFilter === 'Tümü' || m.tur === _activeFilter;
    const q         = _searchQ.toLowerCase();
    const matchQ    = !q || [m.ad, m.sehir, m.ilce, m.tur]
      .join(' ').toLowerCase().includes(q);
    return matchType && matchQ;
  });

  const grid = document.getElementById('mulk-grid');
  if (!grid) return;

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <div class="empty-icon">🔍</div>
      <div class="empty-text">${t('mulkler.noResults')}</div>
    </div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  filtered.forEach(m => {
    const card = document.createElement('div');
    card.className = 'mulk-card';
    card.innerHTML = `
      <div class="mulk-thumb">${_emoji(m.tur)}</div>
      <div class="mulk-card-body">
        <div class="mulk-card-title">${m.ad}</div>
        <div class="mulk-card-loc">📍 ${m.sehir}, ${m.ilce} · ${Number(m.alan).toLocaleString('tr-TR')} m²</div>
        <div class="mulk-card-footer">
          <div class="mulk-card-price">${m.aylikKira ? _fmt(m.aylikKira)+'/ay' : _fmtM(m.guncelDeger)}</div>
          ${_durumTag(m.durum)}
        </div>
      </div>`;
    card.onclick = () => _showDetail(m);
    frag.appendChild(card);
  });
  grid.innerHTML = '';
  grid.appendChild(frag);
}

// ─── Detay Panel ──────────────────────────────────────────
function _showDetail(m) {
  const kar = (m.guncelDeger || 0) - (m.alisFiyati || 0);
  const roi = m.alisFiyati > 0 ? Math.round(kar / m.alisFiyati * 100) : 0;

  document.getElementById('mulk-detail-panel').innerHTML = `
    <div class="detail-header">
      <div>
        <div class="detail-title">${_emoji(m.tur)} ${m.ad}</div>
        <div style="font-size:11px;color:var(--text-tertiary);margin-top:2px">${m.tur} · ${m.sehir}, ${m.ilce}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <button class="btn btn-outline btn-sm" onclick="window._mulkOpenModal('${m.id}')">${t('ui.edit')}</button>
        <button class="modal-close" onclick="document.getElementById('mulk-detail-overlay').classList.remove('open')">✕</button>
      </div>
    </div>
    <div class="detail-body">
      <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
        ${_durumTag(m.durum)} ${_durumTag(m.tur)}
      </div>

      <div class="detail-section">${t('mulkler.title')}</div>
      ${_dRow(t('mulkler.area'),         Number(m.alan).toLocaleString('tr-TR') + ' m²')}
      ${_dRow(t('mulkler.deed'),         m.tapu || '—')}
      ${_dRow(t('mulkler.purpose'),      m.amac || '—')}

      <div class="detail-section">${t('yatirim.totalInvestment')}</div>
      ${_dRow(t('mulkler.purchasePrice'), _fmt(m.alisFiyati))}
      ${_dRow(t('mulkler.currentValue'),  _fmt(m.guncelDeger))}
      ${_dRow(t('yatirim.valueIncrease'), `<span style="color:var(--color-success-text)">${_fmt(kar)}</span>`)}
      ${_dRow('ROI',                      `<span class="roi">${roi}%</span>`)}
      ${_dRow(t('mulkler.monthlyRent'),   m.aylikKira ? _fmt(m.aylikKira)+'/ay' : '—')}

      ${m.not ? `<div class="detail-section">${t('mulkler.notes')}</div>
        <div style="font-size:12px;color:var(--text-secondary);padding:8px 0">${m.not}</div>` : ''}

      <div style="margin-top:18px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="window._mulkOpenModal('${m.id}')">✏️ ${t('ui.edit')}</button>
        <button class="btn btn-sm" style="background:var(--color-error-bg);color:var(--color-error-text);border:1px solid var(--color-error-border)"
          onclick="window._mulkDelete('${m.id}','${m.ad.replace(/'/g,"\\'")}')">${t('ui.delete')}</button>
      </div>
    </div>`;

  document.getElementById('mulk-detail-overlay').classList.add('open');
}

// ─── Modal Aç ─────────────────────────────────────────────
function _openModal(id) {
  try { requirePermission('mulkler', id ? 'update' : 'create'); } catch { return; }
  _editId = id || null;
  document.getElementById('mulk-modal-title').textContent = id ? t('mulkler.edit') : t('mulkler.add');
  document.getElementById('mulk-edit-id').value = id || '';

  if (id) {
    const m = _allMulkler.find(x => x.id === id);
    if (m) {
      document.getElementById('m-ad').value    = m.ad;
      document.getElementById('m-tur').value   = m.tur;
      document.getElementById('m-sehir').value = m.sehir;
      document.getElementById('m-ilce').value  = m.ilce;
      document.getElementById('m-alan').value  = m.alan;
      document.getElementById('m-alis').value  = m.alisFiyati;
      document.getElementById('m-deger').value = m.guncelDeger;
      document.getElementById('m-kira').value  = m.aylikKira;
      document.getElementById('m-amac').value  = m.amac;
      document.getElementById('m-durum').value = m.durum;
      document.getElementById('m-tapu').value  = m.tapu || '';
      document.getElementById('m-not').value   = m.not  || '';
    }
  } else {
    ['m-ad','m-sehir','m-ilce','m-alan','m-alis','m-deger','m-kira','m-tapu','m-not']
      .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('m-tur').value   = 'Konut';
    document.getElementById('m-amac').value  = 'Kiraya Verme';
    document.getElementById('m-durum').value = 'Boş';
  }
  document.getElementById('mulk-modal').classList.add('open');
}

function _closeModal() {
  document.getElementById('mulk-modal').classList.remove('open');
  _editId = null;
}

// ─── Kaydet ───────────────────────────────────────────────
async function _save() {
  const data = {
    ad:          document.getElementById('m-ad').value.trim(),
    tur:         document.getElementById('m-tur').value,
    sehir:       document.getElementById('m-sehir').value.trim(),
    ilce:        document.getElementById('m-ilce').value.trim(),
    alan:        +document.getElementById('m-alan').value  || 0,
    alisFiyati:  +document.getElementById('m-alis').value  || 0,
    guncelDeger: +document.getElementById('m-deger').value || 0,
    aylikKira:   +document.getElementById('m-kira').value  || 0,
    amac:        document.getElementById('m-amac').value,
    durum:       document.getElementById('m-durum').value,
    tapu:        document.getElementById('m-tapu').value.trim(),
    not:         document.getElementById('m-not').value.trim(),
  };
  if (!data.ad) { showToast('warning', t('mulkler.name') + ' ' + t('ui.required')); return; }

  try {
    if (_editId) {
      await updateMulk(_editId, data);
      const idx = _allMulkler.findIndex(m => m.id === _editId);
      if (idx >= 0) _allMulkler[idx] = { ..._allMulkler[idx], ...data };
    } else {
      const newId = await createMulk(data);
      _allMulkler.unshift({ id: newId, ...data });
    }
    _closeModal();
    _renderGrid();
    showToast('success', t('mulkler.saved'));
  } catch (err) { handleError(err, 'mulkler.save'); }
}

// ─── Sil ──────────────────────────────────────────────────
async function _delete(id, name) {
  try { requirePermission('mulkler', 'delete'); } catch { return; }
  if (!confirm(t('mulkler.deleteConfirm'))) return;
  try {
    const prev = await deleteMulk(id);
    _allMulkler = _allMulkler.filter(m => m.id !== id);
    document.getElementById('mulk-detail-overlay')?.classList.remove('open');
    _renderGrid();
    showUndoToast(name, async () => {
      await undoDelete(APP_CONFIG.collections.mulkler, id, prev);
      _allMulkler.unshift({ id, ...prev });
      _renderGrid();
      showToast('success', t('mulkler.saved'));
    }, t('mulkler.undoDelete'));
  } catch (err) { handleError(err, 'mulkler.delete'); }
}

// ─── Olayları Bağla ───────────────────────────────────────
function _bindShellEvents() {
  window._mulkSearch  = (q) => { _searchQ = q; _renderGrid(); };
  window._mulkFilter  = (f) => {
    _activeFilter = f;
    document.querySelectorAll('.filter-chip').forEach(b =>
      b.classList.toggle('active', b.textContent.includes(f === 'Tümü' ? t('mulkler.filterAll') : f))
    );
    _renderGrid();
  };
  window._mulkOpenModal = _openModal;
  window._mulkCloseModal= _closeModal;
  window._mulkSave      = _save;
  window._mulkDelete    = _delete;

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') _closeModal();
  });
  document.getElementById('mulk-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('mulk-modal')) _closeModal();
  });
}

// ─── Yardımcılar ──────────────────────────────────────────
function _fmt(n)  { return n ? '₺' + Number(n).toLocaleString('tr-TR') : '—'; }
function _fmtM(n) {
  if (!n) return '—';
  const m = n / 1_000_000;
  return m >= 1 ? '₺' + m.toFixed(2).replace(/\.?0+$/, '') + 'M' : _fmt(n);
}
function _emoji(tur) { return { Konut:'🏠', Ticari:'🏢', Arsa:'🌾', Bina:'🏗️' }[tur] || '🏠'; }
function _durumTag(d) {
  const map = { Kirada:'tag-green', Boş:'tag-red', Satılık:'tag-warning', Satıldı:'tag-gray' };
  return `<span class="tag ${map[d] || 'tag-gray'}">${d}</span>`;
}
function _dRow(k, v) {
  return `<div class="detail-row"><span class="detail-key">${k}</span><span class="detail-val">${v}</span></div>`;
}
