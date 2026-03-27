/**
 * src/modules/belgeler.js
 * Duay Global Trade Company — Gayrimenkul Yönetim Sistemi
 * Anayasa: K01, K03, K06, K14
 * v1.2 / 2026-03-27
 *
 * Belge & Tapu Yönetimi — Mülke ait tapu, sözleşme, fotoğraf
 * ve diğer belgeleri Firebase Storage'a yükle / listele / sil.
 *
 * NOT: Firebase Storage yoksa dosyalar base64 olarak Firestore'a
 * kaydedilir (küçük dosyalar için). Büyük dosyalar için
 * Firebase Storage kurulumu gereklidir.
 */

import { createDoc, updateDocById, softDelete, listDocs } from '../core/database.js';
import { undoDelete }        from '../core/database.js';
import { requirePermission } from '../core/auth.js';
import { t }                 from '../core/i18n.js';
import { showToast, showUndoToast } from '../ui/toast.js';
import { handleError }       from '../core/error-handler.js';
import { getMulkler }        from '../core/database.js';

const COL = 'belgeler';

// Desteklenen dosya türleri
const ALLOWED_TYPES = {
  'application/pdf':          { icon: '📄', label: 'PDF' },
  'image/jpeg':               { icon: '🖼️', label: 'Fotoğraf' },
  'image/png':                { icon: '🖼️', label: 'Fotoğraf' },
  'image/webp':               { icon: '🖼️', label: 'Fotoğraf' },
  'application/msword':       { icon: '📝', label: 'Word' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: '📝', label: 'Word' },
};

const BELGE_TURLERI = [
  'Tapu Senedi',
  'Kira Sözleşmesi',
  'Satış Sözleşmesi',
  'İmar Durumu',
  'Yapı Ruhsatı',
  'İskan Belgesi',
  'Sigorta Poliçesi',
  'Vekaletname',
  'Fotoğraf',
  'Diğer',
];

const MAX_SIZE_MB = 5;
let _belgeler = [];
let _mulkler  = [];
let _filterMulk = '';

// ─── Render ───────────────────────────────────────────────
export async function render(container) {
  container.innerHTML = `<div class="empty"><div class="empty-icon">⏳</div><div class="empty-text">${t('ui.loading')}</div></div>`;
  try {
    [_belgeler, _mulkler] = await Promise.all([listDocs(COL), getMulkler()]);
    container.innerHTML = _buildShell();
    _renderList();
    _bindEvents();
  } catch (err) { handleError(err, 'belgeler.render'); }
}

// ─── Shell ────────────────────────────────────────────────
function _buildShell() {
  const tapuCount  = _belgeler.filter(b => b.tur === 'Tapu Senedi').length;
  const sozCount   = _belgeler.filter(b => b.tur === 'Kira Sözleşmesi' || b.tur === 'Satış Sözleşmesi').length;
  const fotCount   = _belgeler.filter(b => b.tur === 'Fotoğraf').length;

  return `
  <div class="metrics-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:18px">
    <div class="metric-card">
      <div class="metric-label">Toplam Belge</div>
      <div class="metric-value">${_belgeler.length}</div>
      <div class="metric-sub">yüklü dosya</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">🏛️ Tapu</div>
      <div class="metric-value">${tapuCount}</div>
      <div class="metric-sub">tapu senedi</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">📋 Sözleşme</div>
      <div class="metric-value">${sozCount}</div>
      <div class="metric-sub">sözleşme</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">🖼️ Fotoğraf</div>
      <div class="metric-value">${fotCount}</div>
      <div class="metric-sub">görsel</div>
    </div>
  </div>

  <!-- Upload Alanı -->
  <div class="card" style="margin-bottom:16px">
    <div class="card-header">
      <span class="card-title">📎 Belge Yükle</span>
    </div>
    <div class="card-body-padded">
      <div id="drop-zone" style="
        border:2px dashed var(--border);border-radius:10px;padding:28px;
        text-align:center;cursor:pointer;transition:all 0.2s;
        background:var(--bg-secondary)
      " onclick="document.getElementById('belge-file-input').click()"
         ondragover="event.preventDefault();this.style.borderColor='var(--btn-primary-bg)'"
         ondragleave="this.style.borderColor='var(--border)'"
         ondrop="window._belgeDrop(event)">
        <div style="font-size:32px;margin-bottom:8px">📁</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:4px">
          Dosyayı sürükle bırak veya tıkla
        </div>
        <div style="font-size:11.5px;color:var(--text-tertiary)">
          PDF, JPG, PNG, DOCX — Maks. ${MAX_SIZE_MB}MB
        </div>
      </div>
      <input type="file" id="belge-file-input" style="display:none" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        onchange="window._belgeFileSelected(this.files[0])">

      <!-- Dosya seçildikten sonra çıkan form -->
      <div id="belge-upload-form" style="display:none;margin-top:16px">
        <div id="belge-preview" style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-secondary);border-radius:8px;margin-bottom:12px">
          <span id="belge-preview-icon" style="font-size:28px">📄</span>
          <div>
            <div id="belge-preview-name" style="font-size:12.5px;font-weight:600"></div>
            <div id="belge-preview-size" style="font-size:11px;color:var(--text-tertiary)"></div>
          </div>
          <button onclick="window._belgeFormKapat()" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:18px;color:var(--text-tertiary)">✕</button>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Belge Türü</label>
            <select class="form-control" id="belge-tur">
              ${BELGE_TURLERI.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">İlgili Mülk <small style="font-weight:400;text-transform:none">(opsiyonel)</small></label>
            <select class="form-control" id="belge-mulk">
              <option value="">— Mülk Seç —</option>
              ${_mulkler.map(m => `<option value="${m.id}">${m.ad} (${m.sehir})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Açıklama <small style="font-weight:400;text-transform:none">(opsiyonel)</small></label>
          <input class="form-control" id="belge-aciklama" type="text" placeholder="Tapu tarihi, parsel no vb.">
        </div>
        <div style="text-align:right;display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-outline btn-sm" onclick="window._belgeFormKapat()">İptal</button>
          <button class="btn btn-primary btn-sm" onclick="window._belgeYukle()">📤 Yükle</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Filtre + Liste -->
  <div class="filter-bar" style="margin-bottom:14px">
    <select class="form-control" id="belge-filter-mulk" style="width:auto;min-width:180px;font-size:12px"
      onchange="window._belgeFilterMulk(this.value)">
      <option value="">Tüm Mülkler</option>
      ${_mulkler.map(m => `<option value="${m.id}">${m.ad}</option>`).join('')}
    </select>
    <span style="flex:1"></span>
    <span style="font-size:12px;color:var(--text-tertiary)" id="belge-count">${_belgeler.length} belge</span>
  </div>

  <div id="belge-liste" class="card">
    <div class="card-body" id="belge-liste-body"></div>
  </div>`;
}

// ─── Liste Render ─────────────────────────────────────────
function _renderList() {
  const filtered = _filterMulk ? _belgeler.filter(b => b.mulkId === _filterMulk) : _belgeler;
  const body = document.getElementById('belge-liste-body');
  if (!body) return;

  const countEl = document.getElementById('belge-count');
  if (countEl) countEl.textContent = `${filtered.length} belge`;

  if (!filtered.length) {
    body.innerHTML = `<div class="empty"><div class="empty-icon">📂</div><div class="empty-text">Belge bulunamadı. Yukarıdan yükleyin.</div></div>`;
    return;
  }

  body.innerHTML = filtered.map(b => {
    const mulk  = _mulkler.find(m => m.id === b.mulkId);
    const tInfo = ALLOWED_TYPES[b.mimeType] || { icon: '📎', label: 'Dosya' };
    const tarih = b.createdAt?.toDate ? b.createdAt.toDate().toLocaleDateString('tr-TR') : '—';
    return `
    <div class="list-row">
      <div class="list-icon" style="font-size:24px">${tInfo.icon}</div>
      <div class="list-main" style="flex:1">
        <div class="list-name">${b.ad}</div>
        <div class="list-sub">
          <span class="tag tag-info" style="margin-right:4px">${b.tur}</span>
          ${mulk ? `📍 ${mulk.ad} ·` : ''} ${tarih}
          ${b.aciklama ? ` · ${b.aciklama}` : ''}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        ${b.url ? `<a href="${b.url}" target="_blank" class="btn btn-outline btn-sm">👁 Görüntüle</a>` : ''}
        ${b.dataUrl ? `<a href="${b.dataUrl}" download="${b.ad}" class="btn btn-outline btn-sm">⬇ İndir</a>` : ''}
        <span style="font-size:11px;color:var(--text-tertiary)">${b.boyutMB ? b.boyutMB + 'MB' : ''}</span>
        <button class="btn btn-sm" style="background:var(--color-error-bg);color:var(--color-error-text);border:1px solid var(--color-error-border)"
          onclick="window._belgeSil('${b.id}','${(b.ad||'').replace(/'/g,"\\'")}')">🗑</button>
      </div>
    </div>`;
  }).join('');
}

// ─── Dosya Seçimi ─────────────────────────────────────────
let _secilenDosya = null;

function _fileSelected(file) {
  if (!file) return;

  // Boyut kontrolü
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    showToast('warning', `Dosya ${MAX_SIZE_MB}MB'dan büyük olamaz.`);
    return;
  }

  // Tür kontrolü
  if (!ALLOWED_TYPES[file.type]) {
    showToast('warning', 'Desteklenmeyen dosya türü. Lütfen PDF, JPG, PNG veya DOCX yükleyin.');
    return;
  }

  _secilenDosya = file;
  const tInfo   = ALLOWED_TYPES[file.type];
  const sizeMB  = (file.size / (1024 * 1024)).toFixed(2);

  document.getElementById('belge-preview-icon').textContent = tInfo.icon;
  document.getElementById('belge-preview-name').textContent = file.name;
  document.getElementById('belge-preview-size').textContent = `${tInfo.label} · ${sizeMB} MB`;

  // Türü otomatik belirle
  const tur = _guessTur(file.name, file.type);
  document.getElementById('belge-tur').value = tur;

  document.getElementById('belge-upload-form').style.display = 'block';
  document.getElementById('drop-zone').style.borderColor = 'var(--btn-primary-bg)';
}

function _guessTur(name, mime) {
  const lower = name.toLowerCase();
  if (lower.includes('tapu')) return 'Tapu Senedi';
  if (lower.includes('kira') || lower.includes('sozlesme')) return 'Kira Sözleşmesi';
  if (lower.includes('satis')) return 'Satış Sözleşmesi';
  if (lower.includes('imar')) return 'İmar Durumu';
  if (lower.includes('ruhsat')) return 'Yapı Ruhsatı';
  if (lower.includes('iskan')) return 'İskan Belgesi';
  if (lower.includes('sigorta')) return 'Sigorta Poliçesi';
  if (mime.startsWith('image/')) return 'Fotoğraf';
  return 'Diğer';
}

function _formKapat() {
  _secilenDosya = null;
  document.getElementById('belge-upload-form').style.display = 'none';
  document.getElementById('drop-zone').style.borderColor = 'var(--border)';
  document.getElementById('belge-file-input').value = '';
}

// ─── Yükle ────────────────────────────────────────────────
async function _yukle() {
  if (!_secilenDosya) return;
  try { requirePermission('sozlesmeler', 'create'); } catch { return; }

  const mulkId = document.getElementById('belge-mulk').value;
  const mulk   = _mulkler.find(m => m.id === mulkId);
  const tur    = document.getElementById('belge-tur').value;
  const aciklama = document.getElementById('belge-aciklama').value.trim();

  // Dosyayı base64'e çevir (Firestore'a küçük dosyalar için)
  showToast('info', 'Dosya yükleniyor...');

  const dataUrl = await _toBase64(_secilenDosya);
  const data = {
    ad:       _secilenDosya.name,
    tur,
    mulkId:   mulkId || '',
    mulkAd:   mulk ? mulk.ad : '',
    mimeType: _secilenDosya.type,
    boyutMB:  (_secilenDosya.size / (1024 * 1024)).toFixed(2),
    aciklama,
    dataUrl,   // Base64 — Firebase Storage'a geçilince url ile değiştirilir
    url:      '',
  };

  const newId = await createDoc(COL, data);
  _belgeler.unshift({ id: newId, ...data });
  _formKapat();
  _renderList();
  showToast('success', `"${data.ad}" başarıyla yüklendi.`);
}

function _toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Sil ──────────────────────────────────────────────────
async function _sil(id, name) {
  try { requirePermission('sozlesmeler', 'delete'); } catch { return; }
  if (!confirm(`"${name}" belgesini silmek istediğinize emin misiniz?`)) return;
  try {
    const prev = await softDelete(COL, id);
    _belgeler = _belgeler.filter(b => b.id !== id);
    _renderList();
    showUndoToast(name, async () => {
      await undoDelete(COL, id, prev);
      _belgeler.unshift({ id, ...prev });
      _renderList();
    }, `"${name}" silindi.`);
  } catch (err) { handleError(err, 'belgeler.sil'); }
}

// ─── Olayları Bağla ───────────────────────────────────────
function _bindEvents() {
  window._belgeFileSelected = _fileSelected;
  window._belgeFormKapat    = _formKapat;
  window._belgeYukle        = _yukle;
  window._belgeSil          = _sil;
  window._belgeFilterMulk   = (mulkId) => { _filterMulk = mulkId; _renderList(); };
  window._belgeDrop         = (e) => {
    e.preventDefault();
    document.getElementById('drop-zone').style.borderColor = 'var(--border)';
    const file = e.dataTransfer?.files?.[0];
    if (file) _fileSelected(file);
  };
}
