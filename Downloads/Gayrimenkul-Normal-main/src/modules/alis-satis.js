/**
 * src/modules/alis-satis.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.1 / 2026-03-27
 *
 * Alım-Satım modülü — Mülk alım/satım işlemi kayıt,
 * kar/zarar hesaplama, işlem geçmişi.
 */

import { getIslemler, createIslem, updateIslem, deleteIslem, getMulkler } from '../core/database.js';
import { undoDelete }        from '../core/database.js';
import { requirePermission } from '../core/auth.js';
import { t }                 from '../core/i18n.js';
import { showToast, showUndoToast } from '../ui/toast.js';
import { handleError }       from '../core/error-handler.js';
import { APP_CONFIG }        from '../../config/app-config.js';

let _islemler  = [];
let _mulkler   = [];
let _editId    = null;
let _filterTur = 'Tümü';

// ─── Render ───────────────────────────────────────────────
export async function render(container) {
  container.innerHTML = `<div class="empty"><div class="empty-icon">⏳</div><div class="empty-text">${t('ui.loading')}</div></div>`;
  try {
    [_islemler, _mulkler] = await Promise.all([getIslemler([], 'createdAt', null), getMulkler()]);
    container.innerHTML = _buildShell();
    _renderList();
    _bindEvents();
  } catch (err) { handleError(err, 'alis-satis.render'); }
}

// ─── Shell ────────────────────────────────────────────────
function _buildShell() {
  const toplamAlim  = _islemler.filter(i => i.tur === 'Alım').reduce((s, i) => s + (i.alisFiyati||0), 0);
  const toplamSatis = _islemler.filter(i => i.tur === 'Satış').reduce((s, i) => s + (i.satisFiyati||0), 0);
  const netKar      = _islemler.filter(i => i.tur === 'Satış' && i.durum === 'Tamamlandı')
    .reduce((s, i) => s + ((i.satisFiyati||0) - (i.alisFiyati||0)), 0);

  return `
  <div class="metrics-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:18px">
    <div class="metric-card">
      <div class="metric-label">${t('alisatis.totalBuy')}</div>
      <div class="metric-value">₺${_fmtM(toplamAlim)}</div>
      <div class="metric-sub">${_islemler.filter(i=>i.tur==='Alım').length} ${t('alisatis.propertiesAcquired')}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">${t('alisatis.totalSell')}</div>
      <div class="metric-value">₺${_fmtM(toplamSatis)}</div>
      <div class="metric-sub">${_islemler.filter(i=>i.tur==='Satış').length} ${t('alisatis.propertiesSold')}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">${t('alisatis.netProfit')}</div>
      <div class="metric-value" style="color:${netKar>=0?'var(--color-success-text)':'var(--color-error-text)'}">₺${_fmtM(Math.abs(netKar))}</div>
      <div class="metric-sub">${t('alisatis.fromSales')}</div>
    </div>
  </div>

  <div class="filter-bar">
    ${['Tümü','Alım','Satış'].map(f =>
      `<button class="filter-chip${_filterTur===f?' active':''}" onclick="window._alisFilter('${f}')">${f==='Alım'?'📥 Alım':f==='Satış'?'📤 Satış':f}</button>`
    ).join('')}
    <span style="flex:1"></span>
    <button class="btn btn-primary btn-sm" onclick="window._alisOpenModal(null)">+ ${t('alisatis.add')}</button>
  </div>

  <div class="card" style="margin-top:14px">
    <div class="card-body" id="alis-list"></div>
  </div>

  <!-- Modal -->
  <div class="overlay" id="alis-modal">
    <div class="modal" style="max-width:560px">
      <div class="modal-header">
        <div class="modal-title" id="alis-modal-title">${t('alisatis.add')}</div>
        <button class="modal-close" onclick="window._alisCloseModal()">✕</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="alis-edit-id">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('alisatis.type')}</label>
            <select class="form-control" id="alis-tur">
              <option value="Alım">📥 Alım</option>
              <option value="Satış">📤 Satış</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${t('alisatis.property')}</label>
            <select class="form-control" id="alis-mulk">
              <option value="">— Mülk Seç —</option>
              ${_mulkler.map(m => `<option value="${m.id}">${m.ad} (${m.sehir})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('alisatis.party')}</label>
            <input class="form-control" id="alis-taraf" type="text" placeholder="Satıcı / Alıcı adı">
          </div>
          <div class="form-group">
            <label class="form-label">${t('alisatis.date')}</label>
            <input class="form-control" id="alis-tarih" type="date">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('alisatis.buyPrice')} (₺)</label>
            <input class="form-control" id="alis-alis" type="number" min="0" placeholder="Alış fiyatı">
          </div>
          <div class="form-group">
            <label class="form-label">${t('alisatis.sellPrice')} (₺) <small style="text-transform:none;font-weight:400">(opsiyonel)</small></label>
            <input class="form-control" id="alis-satis" type="number" min="0" placeholder="Satış fiyatı">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${t('alisatis.status')}</label>
          <select class="form-control" id="alis-durum">
            <option value="Tamamlandı">Tamamlandı</option>
            <option value="Müzakere">Müzakere</option>
            <option value="İptal">İptal</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${t('alisatis.notes')}</label>
          <textarea class="form-control" id="alis-not" rows="2"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="window._alisCloseModal()">${t('ui.cancel')}</button>
        <button class="btn btn-primary" onclick="window._alisSave()">${t('ui.save')}</button>
      </div>
    </div>
  </div>`;
}

// ─── Liste Render ─────────────────────────────────────────
function _renderList() {
  const filtered = _filterTur === 'Tümü' ? _islemler : _islemler.filter(i => i.tur === _filterTur);
  const list = document.getElementById('alis-list');
  if (!list) return;

  if (!filtered.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">🔄</div><div class="empty-text">İşlem bulunamadı.</div></div>`;
    return;
  }

  list.innerHTML = filtered.map(i => {
    const kar = i.tur === 'Satış' ? (i.satisFiyati||0) - (i.alisFiyati||0) : null;
    return `
    <div class="list-row">
      <div class="list-icon">${i.tur === 'Alım' ? '📥' : '📤'}</div>
      <div class="list-main" style="flex:1">
        <div class="list-name">${i.mulkAd || '—'}</div>
        <div class="list-sub">${i.taraf} · ${i.tarih || '—'}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
        <div style="text-align:right">
          <div style="font-size:13px;font-weight:600">
            ${i.tur==='Satış' ? '₺'+_fmtM(i.satisFiyati) : '₺'+_fmtM(i.alisFiyati)}
          </div>
          ${kar !== null ? `<div style="font-size:11px;color:${kar>=0?'var(--color-success-text)':'var(--color-error-text)'};font-weight:500">
            ${kar>=0?'▲':'▼'} ₺${_fmtM(Math.abs(kar))} kâr/zarar</div>` : ''}
          <div style="margin-top:2px">${_turTag(i.tur)} ${_durumTag(i.durum)}</div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="window._alisOpenModal('${i.id}')">✏️</button>
        <button class="btn btn-sm" style="background:var(--color-error-bg);color:var(--color-error-text);border:1px solid var(--color-error-border)"
          onclick="window._alisDelete('${i.id}','${(i.mulkAd||'').replace(/'/g,"\\'")}')">🗑</button>
      </div>
    </div>`;
  }).join('');
}

// ─── Modal Aç ─────────────────────────────────────────────
function _openModal(id) {
  try { requirePermission('islemler', id ? 'update' : 'create'); } catch { return; }
  _editId = id || null;
  document.getElementById('alis-modal-title').textContent = id ? 'İşlem Düzenle' : t('alisatis.add');
  document.getElementById('alis-edit-id').value = id || '';

  if (id) {
    const i = _islemler.find(x => x.id === id);
    if (i) {
      document.getElementById('alis-tur').value   = i.tur;
      document.getElementById('alis-mulk').value  = i.mulkId || '';
      document.getElementById('alis-taraf').value = i.taraf || '';
      document.getElementById('alis-tarih').value = i.tarih || '';
      document.getElementById('alis-alis').value  = i.alisFiyati || '';
      document.getElementById('alis-satis').value = i.satisFiyati || '';
      document.getElementById('alis-durum').value = i.durum || 'Tamamlandı';
      document.getElementById('alis-not').value   = i.not || '';
    }
  } else {
    ['alis-taraf','alis-tarih','alis-alis','alis-satis','alis-not'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('alis-tur').value   = 'Alım';
    document.getElementById('alis-mulk').value  = '';
    document.getElementById('alis-durum').value = 'Tamamlandı';
    document.getElementById('alis-tarih').value = new Date().toISOString().slice(0, 10);
  }
  document.getElementById('alis-modal').classList.add('open');
}

function _closeModal() {
  document.getElementById('alis-modal').classList.remove('open');
  _editId = null;
}

// ─── Kaydet ───────────────────────────────────────────────
async function _save() {
  const mulkId = document.getElementById('alis-mulk').value;
  const mulk   = _mulkler.find(m => m.id === mulkId);
  const data = {
    tur:         document.getElementById('alis-tur').value,
    mulkId,
    mulkAd:      mulk ? mulk.ad : '',
    taraf:       document.getElementById('alis-taraf').value.trim(),
    tarih:       document.getElementById('alis-tarih').value,
    alisFiyati:  +document.getElementById('alis-alis').value || 0,
    satisFiyati: +document.getElementById('alis-satis').value || 0,
    durum:       document.getElementById('alis-durum').value,
    not:         document.getElementById('alis-not').value.trim(),
  };
  if (!data.taraf)  { showToast('warning', 'Karşı taraf adı zorunludur.'); return; }
  if (!data.mulkId) { showToast('warning', 'Mülk seçiniz.'); return; }

  try {
    if (_editId) {
      await updateIslem(_editId, data);
      const idx = _islemler.findIndex(i => i.id === _editId);
      if (idx >= 0) _islemler[idx] = { ..._islemler[idx], ...data };
    } else {
      const newId = await createIslem(data);
      _islemler.unshift({ id: newId, ...data });
    }
    _closeModal();
    _renderList();
    showToast('success', t('alisatis.saved'));
  } catch (err) { handleError(err, 'alis-satis.save'); }
}

// ─── Sil ──────────────────────────────────────────────────
async function _delete(id, name) {
  try { requirePermission('islemler', 'delete'); } catch { return; }
  if (!confirm('Bu işlemi silmek istediğinize emin misiniz?')) return;
  try {
    const prev = await deleteIslem(id);
    _islemler = _islemler.filter(i => i.id !== id);
    _renderList();
    showUndoToast(name, async () => {
      await undoDelete(APP_CONFIG.collections.islemler, id, prev);
      _islemler.unshift({ id, ...prev });
      _renderList();
    }, t('alisatis.deleted'));
  } catch (err) { handleError(err, 'alis-satis.delete'); }
}

// ─── Olayları Bağla ───────────────────────────────────────
function _bindEvents() {
  window._alisFilter     = (f) => { _filterTur = f; document.querySelectorAll('.filter-chip').forEach(b => b.classList.toggle('active', b.textContent.includes(f==='Tümü'?'Tümü':f))); _renderList(); };
  window._alisOpenModal  = _openModal;
  window._alisCloseModal = _closeModal;
  window._alisSave       = _save;
  window._alisDelete     = _delete;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') _closeModal(); });
}

// ─── Yardımcılar ──────────────────────────────────────────
function _fmtM(n) {
  if (!n) return '0';
  const m = n / 1_000_000;
  return m >= 1 ? m.toFixed(2).replace(/\.?0+$/, '') + 'M' : Number(n).toLocaleString('tr-TR');
}
function _durumTag(d) {
  const map = { Tamamlandı:'tag-green', Müzakere:'tag-warning', İptal:'tag-red' };
  return `<span class="tag ${map[d]||'tag-gray'}">${d}</span>`;
}
function _turTag(d) {
  return `<span class="tag ${d==='Alım'?'tag-info':'tag-green'}">${d}</span>`;
}
