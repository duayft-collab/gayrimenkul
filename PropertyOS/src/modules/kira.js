/**
 * src/modules/kira.js
 * Duay Global Trade Company — Property OS
 * v1.0 / 2026-03-28
 */

import { listDocs, addDocument, updateDocument } from '../core/db.js';
import { APP_CONFIG } from '../../config/app-config.js';
import { formatTL }   from '../core/piyasa.js';
import { showToast }  from '../ui/toast.js';

const COL_K = APP_CONFIG.collections.kiralar;
const COL_M = APP_CONFIG.collections.mulkler;

export async function render(container) {
  const [kiralar, mulkler] = await Promise.all([listDocs(COL_K), listDocs(COL_M)]);

  const mulkMap = {};
  mulkler.forEach(m => { mulkMap[m.id] = m.name; });

  const bekleyen  = kiralar.filter(k => k.status === 'bekliyor');
  const gecikmiş  = kiralar.filter(k => k.status === 'gecikti');
  const odendi    = kiralar.filter(k => k.status === 'odendi');

  const statusBadge = s => {
    const m = { odendi:'badge-green', gecikti:'badge-red', bekliyor:'badge-amber' };
    const l = { odendi:'Ödendi', gecikti:'Gecikmiş', bekliyor:'Bekliyor' };
    return `<span class="badge ${m[s]||'badge-gray'}">${l[s]||s}</span>`;
  };

  const renderRows = (list) => list.map(k => `
    <div class="list-row">
      <div style="flex:1">
        <div class="list-name">${k.tenant || 'Kiracı'}</div>
        <div class="list-sub">${mulkMap[k.mulkId] || '—'} · ${k.period || '—'}</div>
      </div>
      <div style="text-align:right;display:flex;align-items:center;gap:8px">
        <div>${formatTL(k.amount || 0)}</div>
        ${statusBadge(k.status)}
        ${k.status !== 'odendi' ? `<button class="btn btn-outline btn-sm" onclick="window._tahsil('${k.id}')">Tahsil Et</button>` : ''}
      </div>
    </div>`).join('') || `<div style="padding:12px 16px;font-size:13px;color:var(--text3)">Kayıt yok</div>`;

  const mulkOptions = mulkler.map(m => `<option value="${m.id}">${m.name}</option>`).join('');

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div style="display:flex;gap:16px">
        <span class="badge badge-red">${gecikmiş.length} Gecikmiş</span>
        <span class="badge badge-amber">${bekleyen.length} Bekliyor</span>
        <span class="badge badge-green">${odendi.length} Ödendi</span>
      </div>
      <button class="btn btn-primary" onclick="window._kiraForm()">+ Ödeme Ekle</button>
    </div>

    ${gecikmiş.length ? `
    <div class="card" style="border-color:var(--red);margin-bottom:12px">
      <div class="card-header" style="background:var(--red-bg)">
        <span class="card-title" style="color:var(--red-txt)">Gecikmiş Ödemeler</span>
      </div>
      ${renderRows(gecikmiş)}
    </div>` : ''}

    <div class="card" style="margin-bottom:12px">
      <div class="card-header"><span class="card-title">Bekleyen Ödemeler</span></div>
      ${renderRows(bekleyen)}
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Ödendi</span></div>
      ${renderRows(odendi.slice(0,5))}
    </div>

    <div id="kira-overlay" class="overlay">
      <div class="modal">
        <div class="modal-title">Ödeme Ekle</div>
        <div class="form-group">
          <label class="form-label">Kiracı adı</label>
          <input class="form-control" id="k-tenant" placeholder="Ad Soyad">
        </div>
        <div class="form-group">
          <label class="form-label">Mülk</label>
          <select class="form-control" id="k-mulk"><option value="">Seçiniz</option>${mulkOptions}</select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tutar (₺)</label>
            <input class="form-control" id="k-amount" type="number" placeholder="18000">
          </div>
          <div class="form-group">
            <label class="form-label">Dönem</label>
            <input class="form-control" id="k-period" placeholder="Nisan 2026">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Durum</label>
          <select class="form-control" id="k-status">
            <option value="bekliyor">Bekliyor</option>
            <option value="odendi">Ödendi</option>
            <option value="gecikti">Gecikmiş</option>
          </select>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('kira-overlay').classList.remove('open')">İptal</button>
          <button class="btn btn-primary" onclick="window._saveKira()">Kaydet</button>
        </div>
      </div>
    </div>`;

  window._kiraForm = () => document.getElementById('kira-overlay').classList.add('open');

  window._tahsil = async (id) => {
    await updateDocument(COL_K, id, { status: 'odendi' });
    showToast('Ödeme tahsil edildi.', 'success');
    render(container);
  };

  window._saveKira = async () => {
    const data = {
      tenant:  document.getElementById('k-tenant').value.trim(),
      mulkId:  document.getElementById('k-mulk').value,
      amount:  parseInt(document.getElementById('k-amount').value) || 0,
      period:  document.getElementById('k-period').value.trim(),
      status:  document.getElementById('k-status').value,
    };
    if (!data.amount) { showToast('Tutar giriniz.', 'error'); return; }
    await addDocument(COL_K, data);
    document.getElementById('kira-overlay').classList.remove('open');
    showToast('Ödeme kaydedildi.', 'success');
    render(container);
  };
}
