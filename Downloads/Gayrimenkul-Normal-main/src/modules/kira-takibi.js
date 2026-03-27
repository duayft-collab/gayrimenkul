/**
 * src/modules/kira-takibi.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * v1.1 / 2026-03-27
 *
 * Kira Takibi modülü — Aylık dönem bazlı ödeme takibi,
 * tahsilat kaydı, gecikmiş ödeme uyarıları.
 */

import {
  getOdemeler, createOdeme, updateOdeme, deleteOdeme,
  getSozlesmeler, getMulkler,
} from '../core/database.js';
import { undoDelete }        from '../core/database.js';
import { requirePermission } from '../core/auth.js';
import { t }                 from '../core/i18n.js';
import { showToast, showUndoToast } from '../ui/toast.js';
import { handleError }       from '../core/error-handler.js';
import { APP_CONFIG }        from '../../config/app-config.js';

let _odemeler   = [];
let _sozlesmeler = [];
let _mulkler    = [];
let _editId     = null;
let _filterDurum = 'Tümü';
let _aktifDonem  = new Date().toISOString().slice(0, 7); // YYYY-MM

// ─── Render ───────────────────────────────────────────────
export async function render(container) {
  container.innerHTML = `<div class="empty"><div class="empty-icon">⏳</div><div class="empty-text">${t('ui.loading')}</div></div>`;
  try {
    [_sozlesmeler, _mulkler] = await Promise.all([getSozlesmeler(), getMulkler()]);
    await _loadDonem();
    container.innerHTML = _buildShell();
    _renderList();
    _bindEvents();
  } catch (err) { handleError(err, 'kira-takibi.render'); }
}

async function _loadDonem() {
  _odemeler = await getOdemeler([{ field: 'donem', op: '==', value: _aktifDonem }]);
  // Sözleşme ve mülk adlarını zenginleştir
  _odemeler = _odemeler.map(o => ({
    ...o,
    _sozAd:  (_sozlesmeler.find(s => s.id === o.sozlesmeId)?.taraf) || o.taraf || '—',
    _mulkAd: (_mulkler.find(m => m.id === o.mulkId)?.ad) || o.mulkAd || '—',
  }));
}

// ─── Shell ────────────────────────────────────────────────
function _buildShell() {
  const odendi  = _odemeler.filter(o => o.durum === 'Ödendi').reduce((s, o) => s + (o.tutar||0), 0);
  const beklenen = _odemeler.reduce((s, o) => s + (o.tutar||0), 0);
  const gecikti = _odemeler.filter(o => o.durum === 'Gecikmiş').reduce((s, o) => s + (o.tutar||0), 0);
  const pct = beklenen > 0 ? Math.round(odendi / beklenen * 100) : 0;

  return `
  <div class="metrics-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:18px">
    <div class="metric-card">
      <div class="metric-label">${t('kira.expected')}</div>
      <div class="metric-value">₺${Number(beklenen).toLocaleString('tr-TR')}</div>
      <div class="metric-sub">${_odemeler.length} kayıt</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">${t('kira.collected')}</div>
      <div class="metric-value" style="color:var(--color-success-text)">₺${Number(odendi).toLocaleString('tr-TR')}</div>
      <div class="metric-sub"><span style="font-weight:600">%${pct}</span> tahsilat oranı</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">${t('kira.overdue')}</div>
      <div class="metric-value" style="color:var(--color-error-text)">₺${Number(gecikti).toLocaleString('tr-TR')}</div>
      <div class="metric-sub">${_odemeler.filter(o=>o.durum==='Gecikmiş').length} gecikmiş kiracı</div>
    </div>
  </div>

  <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:6px">
      <button class="btn btn-outline btn-sm" onclick="window._kiraDonemChange(-1)">‹</button>
      <span style="font-size:13px;font-weight:600;min-width:90px;text-align:center" id="kira-donem-label">${_donemLabel()}</span>
      <button class="btn btn-outline btn-sm" onclick="window._kiraDonemChange(1)">›</button>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${['Tümü','Ödendi','Gecikmiş','Bekliyor'].map(f =>
        `<button class="filter-chip${_filterDurum===f?' active':''}" onclick="window._kiraFilter('${f}')">${f}</button>`
      ).join('')}
    </div>
    <span style="flex:1"></span>
    <button class="btn btn-primary btn-sm" onclick="window._kiraOpenModal(null)">+ ${t('kira.addPayment')}</button>
  </div>

  <div style="background:var(--bg-primary);border-radius:8px;border:1px solid var(--border);margin-bottom:6px;padding:6px 14px 4px">
    <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-tertiary);margin-bottom:4px">
      <span>₺${Number(odendi).toLocaleString('tr-TR')} / ₺${Number(beklenen).toLocaleString('tr-TR')}</span>
      <span style="font-weight:600">%${pct}</span>
    </div>
    <div class="progress" style="height:6px;margin-bottom:8px"><div class="progress-fill" style="width:${pct}%"></div></div>
  </div>

  <div class="card">
    <div class="card-body" id="kira-list"></div>
  </div>

  <!-- Modal -->
  <div class="overlay" id="kira-modal">
    <div class="modal" style="max-width:500px">
      <div class="modal-header">
        <div class="modal-title" id="kira-modal-title">${t('kira.addPayment')}</div>
        <button class="modal-close" onclick="window._kiraCloseModal()">✕</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="kira-edit-id">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('kira.property')}</label>
            <select class="form-control" id="kira-mulk">
              <option value="">— Mülk Seç —</option>
              ${_mulkler.map(m => `<option value="${m.id}">${m.ad}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${t('kira.tenant')}</label>
            <input class="form-control" id="kira-taraf" type="text" placeholder="Kiracı adı">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('kira.amount')} (₺)</label>
            <input class="form-control" id="kira-tutar" type="number" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">${t('kira.period')} (YYYY-AA)</label>
            <input class="form-control" id="kira-donem" type="month" value="${_aktifDonem}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('kira.status')}</label>
            <select class="form-control" id="kira-durum">
              <option value="Bekliyor">Bekliyor</option>
              <option value="Ödendi">Ödendi</option>
              <option value="Gecikmiş">Gecikmiş</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${t('kira.paymentDate')}</label>
            <input class="form-control" id="kira-tarih" type="date">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${t('kira.note')}</label>
          <input class="form-control" id="kira-not" type="text" placeholder="Açıklama (opsiyonel)">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="window._kiraCloseModal()">${t('ui.cancel')}</button>
        <button class="btn btn-primary" onclick="window._kiraSave()">${t('ui.save')}</button>
      </div>
    </div>
  </div>`;
}

// ─── Liste Render ─────────────────────────────────────────
function _renderList() {
  const filtered = _filterDurum === 'Tümü' ? _odemeler : _odemeler.filter(o => o.durum === _filterDurum);
  const list = document.getElementById('kira-list');
  if (!list) return;

  if (!filtered.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">💳</div><div class="empty-text">Bu dönemde kayıt yok.</div></div>`;
    return;
  }

  list.innerHTML = filtered.map(o => `
    <div class="list-row">
      <div class="list-icon">${o.durum === 'Ödendi' ? '✅' : o.durum === 'Gecikmiş' ? '❌' : '⏳'}</div>
      <div class="list-main" style="flex:1">
        <div class="list-name">${o._sozAd}</div>
        <div class="list-sub">${o._mulkAd} · ${o.donem || '—'}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
        <div style="text-align:right">
          <div style="font-size:13px;font-weight:600">₺${Number(o.tutar).toLocaleString('tr-TR')}</div>
          <div style="margin-top:3px">${_durumTag(o.durum)}</div>
        </div>
        ${o.durum !== 'Ödendi' ? `
          <button class="btn btn-sm" style="background:var(--color-success-bg);color:var(--color-success-text);border:1px solid var(--color-success-border)"
            onclick="window._kiraTahsil('${o.id}')">${t('kira.collect')}</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="window._kiraOpenModal('${o.id}')">✏️</button>
        <button class="btn btn-sm" style="background:var(--color-error-bg);color:var(--color-error-text);border:1px solid var(--color-error-border)"
          onclick="window._kiraDelete('${o.id}','${(o._sozAd||'').replace(/'/g,"\\'")}')">🗑</button>
      </div>
    </div>`).join('');
}

// ─── Dönem Değiştir ───────────────────────────────────────
async function _donemChange(delta) {
  const d = new Date(_aktifDonem + '-01');
  d.setMonth(d.getMonth() + delta);
  _aktifDonem = d.toISOString().slice(0, 7);
  const label = document.getElementById('kira-donem-label');
  if (label) label.textContent = _donemLabel();
  await _loadDonem();
  _renderList();
}

function _donemLabel() {
  return new Date(_aktifDonem + '-01').toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
}

// ─── Tahsil Et ────────────────────────────────────────────
async function _tahsil(id) {
  try {
    requirePermission('odemeler', 'update');
    const today = new Date().toISOString().slice(0, 10);
    await updateOdeme(id, { durum: 'Ödendi', odemeTarihi: today });
    const idx = _odemeler.findIndex(o => o.id === id);
    if (idx >= 0) _odemeler[idx] = { ..._odemeler[idx], durum: 'Ödendi', odemeTarihi: today };
    _renderList();
    showToast('success', t('kira.markedPaid'));
  } catch (err) { handleError(err, 'kira.tahsil'); }
}

// ─── Modal Aç ─────────────────────────────────────────────
function _openModal(id) {
  try { requirePermission('odemeler', id ? 'update' : 'create'); } catch { return; }
  _editId = id || null;
  document.getElementById('kira-modal-title').textContent = id ? 'Ödeme Düzenle' : t('kira.addPayment');
  document.getElementById('kira-edit-id').value = id || '';

  if (id) {
    const o = _odemeler.find(x => x.id === id);
    if (o) {
      document.getElementById('kira-mulk').value  = o.mulkId || '';
      document.getElementById('kira-taraf').value = o.taraf || o._sozAd || '';
      document.getElementById('kira-tutar').value = o.tutar || '';
      document.getElementById('kira-donem').value = o.donem || _aktifDonem;
      document.getElementById('kira-durum').value = o.durum || 'Bekliyor';
      document.getElementById('kira-tarih').value = o.odemeTarihi || '';
      document.getElementById('kira-not').value   = o.not || '';
    }
  } else {
    ['kira-taraf','kira-tutar','kira-tarih','kira-not'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('kira-mulk').value  = '';
    document.getElementById('kira-donem').value = _aktifDonem;
    document.getElementById('kira-durum').value = 'Bekliyor';
  }
  document.getElementById('kira-modal').classList.add('open');
}

function _closeModal() {
  document.getElementById('kira-modal').classList.remove('open');
  _editId = null;
}

// ─── Kaydet ───────────────────────────────────────────────
async function _save() {
  const mulkId = document.getElementById('kira-mulk').value;
  const mulk   = _mulkler.find(m => m.id === mulkId);
  const data = {
    mulkId,
    mulkAd:      mulk ? mulk.ad : '',
    taraf:       document.getElementById('kira-taraf').value.trim(),
    tutar:       +document.getElementById('kira-tutar').value || 0,
    donem:       document.getElementById('kira-donem').value,
    durum:       document.getElementById('kira-durum').value,
    odemeTarihi: document.getElementById('kira-tarih').value,
    not:         document.getElementById('kira-not').value.trim(),
  };
  if (!data.taraf) { showToast('warning', 'Kiracı adı zorunludur.'); return; }
  if (!data.mulkId) { showToast('warning', 'Mülk seçiniz.'); return; }

  try {
    if (_editId) {
      await updateOdeme(_editId, data);
      const idx = _odemeler.findIndex(o => o.id === _editId);
      if (idx >= 0) _odemeler[idx] = { ..._odemeler[idx], ...data, _sozAd: data.taraf, _mulkAd: data.mulkAd };
    } else {
      const newId = await createOdeme(data);
      _odemeler.unshift({ id: newId, ...data, _sozAd: data.taraf, _mulkAd: data.mulkAd });
    }
    _closeModal();
    _renderList();
    showToast('success', t('kira.saved'));
  } catch (err) { handleError(err, 'kira.save'); }
}

// ─── Sil ──────────────────────────────────────────────────
async function _delete(id, name) {
  try { requirePermission('odemeler', 'delete'); } catch { return; }
  if (!confirm('Bu ödeme kaydını silmek istediğinize emin misiniz?')) return;
  try {
    const prev = await deleteOdeme(id);
    _odemeler = _odemeler.filter(o => o.id !== id);
    _renderList();
    showUndoToast(name, async () => {
      await undoDelete(APP_CONFIG.collections.odemeler, id, prev);
      _odemeler.unshift({ id, ...prev });
      _renderList();
    }, 'Ödeme silindi.');
  } catch (err) { handleError(err, 'kira.delete'); }
}

// ─── Olayları Bağla ───────────────────────────────────────
function _bindEvents() {
  window._kiraFilter      = (f) => { _filterDurum = f; document.querySelectorAll('.filter-chip').forEach(b => b.classList.toggle('active', b.textContent === f)); _renderList(); };
  window._kiraDonemChange = _donemChange;
  window._kiraTahsil      = _tahsil;
  window._kiraOpenModal   = _openModal;
  window._kiraCloseModal  = _closeModal;
  window._kiraSave        = _save;
  window._kiraDelete      = _delete;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') _closeModal(); });
}

// ─── Yardımcılar ──────────────────────────────────────────
function _durumTag(d) {
  const map = { 'Ödendi':'tag-green', 'Gecikmiş':'tag-red', 'Bekliyor':'tag-warning' };
  return `<span class="tag ${map[d]||'tag-gray'}">${d}</span>`;
}
