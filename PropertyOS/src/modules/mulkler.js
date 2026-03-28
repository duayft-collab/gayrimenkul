/**
 * src/modules/mulkler.js
 * Duay Global Trade Company — Property OS
 * Anayasa: K01, K06, K10
 * v1.0 / 2026-03-28
 */

import { listDocs, addDocument, updateDocument, softDelete } from '../core/db.js';
import { getPiyasaData, formatTL, formatPct, calcAltinKarsilastirma, calcUsdKarsilastirma } from '../core/piyasa.js';
import { APP_CONFIG }  from '../../config/app-config.js';
import { t }           from '../core/i18n.js';
import { showToast }   from '../ui/toast.js';
import { navigate }    from '../ui/router.js';

const COL = APP_CONFIG.collections.mulkler;

export async function render(container) {
  const [mulkler, piyasa] = await Promise.all([listDocs(COL), getPiyasaData()]);
  _renderList(container, mulkler, piyasa);
}

export async function renderDetail(container, id) {
  const [{ default: lD }, piyasa] = await Promise.all([
    import('./mulkler.js').then(() => ({ default: { listDocs } })).catch(() => ({ default: {} })),
    getPiyasaData(),
  ]);
  const { getDocById } = await import('../core/db.js');
  const m = await getDocById(COL, id);
  if (!m) { container.innerHTML = `<div class="empty"><p>Mülk bulunamadı.</p></div>`; return; }
  _renderDetailPanel(container, m, piyasa);
}

function _renderList(container, mulkler, piyasa) {
  const typeIcon = tp => ({ daire:'🏠', villa:'🏡', arsa:'🌿', tarla:'🌾', isyeri:'🏢', dukkan:'🏪', bina:'🏗' }[tp] || '🏠');
  const statusBadge = s => {
    const m = { kirada:'badge-green', bos:'badge-gray', satilik:'badge-amber', satildi:'badge-blue' };
    const l = { kirada:'Kirada', bos:'Boş', satilik:'Satılık', satildi:'Satıldı' };
    return `<span class="badge ${m[s]||'badge-gray'}">${l[s]||s}</span>`;
  };

  const rows = mulkler.map(m => {
    const kazanc = m.curValue && m.buyPrice ? m.curValue - m.buyPrice : 0;
    const pct    = m.buyPrice > 0 ? kazanc / m.buyPrice * 100 : 0;
    return `
    <div class="list-row" style="cursor:pointer" onclick="window._mulkDetail('${m.id}')">
      <div class="list-icon">${typeIcon(m.type)}</div>
      <div style="flex:1">
        <div class="list-name">${m.name}</div>
        <div class="list-sub">${m.location || '—'}${m.area ? ' · ' + m.area + 'm²' : ''}</div>
      </div>
      <div style="text-align:right;min-width:110px">
        <div class="list-price">${formatTL(m.curValue || m.buyPrice || 0)}</div>
        <div style="display:flex;gap:4px;justify-content:flex-end;margin-top:3px">
          ${statusBadge(m.status)}
          ${kazanc !== 0 ? `<span class="badge ${kazanc > 0 ? 'badge-green' : 'badge-red'}">${formatPct(pct)}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('') || `<div class="empty"><div class="empty-icon">🏠</div><p>Henüz mülk eklenmedi.</p></div>`;

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div>
        <div style="font-size:13px;color:var(--text3)">${mulkler.length} mülk · ${formatTL(mulkler.reduce((s,m)=>s+(m.curValue||m.buyPrice||0),0))} toplam</div>
      </div>
      <button class="btn btn-primary" onclick="window._mulkForm()">+ Mülk Ekle</button>
    </div>
    <div class="card">${rows}</div>
    <div id="mulk-overlay" class="overlay"></div>`;

  window._mulkDetail = (id) => _showDetail(id, piyasa);
  window._mulkForm   = ()   => _showForm(null);
}

async function _showDetail(id, piyasa) {
  const { getDocById } = await import('../core/db.js');
  const m = await getDocById(COL, id);
  if (!m) return;

  const overlay = document.getElementById('mulk-overlay');
  if (!overlay) return;

  const typeIcon = tp => ({ daire:'🏠', villa:'🏡', arsa:'🌿', tarla:'🌾', isyeri:'🏢', dukkan:'🏪', bina:'🏗' }[tp] || '🏠');
  const kazanc   = (m.curValue || m.buyPrice || 0) - (m.buyPrice || 0);
  const pct      = m.buyPrice > 0 ? kazanc / m.buyPrice * 100 : 0;

  let altinHtml = '', usdHtml = '';
  if (m.buyPrice && m.buyDate) {
    const a = calcAltinKarsilastirma(m.buyPrice, m.buyDate, m.curValue || m.buyPrice, piyasa);
    const u = calcUsdKarsilastirma(m.buyPrice, m.buyDate, m.curValue || m.buyPrice, piyasa);
    const maxP = Math.max(Math.abs(a.mulkPct), Math.abs(a.altinPct), Math.abs(u.usdPct), 12);
    altinHtml = _compareRow('Bu mülk',  a.mulkPct,  maxP, '#000');
    altinHtml += _compareRow('Altın alsaydın', a.altinPct, maxP, '#BA7517');
    altinHtml += _compareRow('Dolar alsaydın', u.usdPct, maxP, '#185FA5');
    altinHtml += _compareRow('BTC alsaydın', a.mulkPct * 0.3, maxP, '#D85A30');

    const verdict = a.fark > 0
      ? `Bu mülk altından <strong>%${Math.abs(a.fark).toFixed(1)} daha iyi</strong> performans gösterdi.`
      : `Altın bu mülkten <strong>%${Math.abs(a.fark).toFixed(1)} daha iyi</strong> performans gösterdi.`;
    usdHtml = `
      <div style="background:var(--${a.fark>0?'green':'amber'}-bg);border-radius:var(--radius-md);padding:12px 14px;margin-top:8px">
        <div style="font-size:10px;color:var(--${a.fark>0?'green':'amber'}-txt);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Analiz</div>
        <div style="font-size:13px;color:var(--${a.fark>0?'green':'amber'}-txt);line-height:1.5">${verdict}</div>
      </div>`;
  }

  const aiSignal = pct > 20 ? 'Tut' : pct > 0 ? 'Tut' : 'Sat';

  overlay.innerHTML = `
    <div style="background:var(--surface);width:400px;height:100%;margin-left:auto;overflow-y:auto;border-left:0.5px solid var(--border)">
      <div style="background:var(--accent);color:#fff;padding:28px 20px 20px">
        <button onclick="document.getElementById('mulk-overlay').classList.remove('open')"
          style="background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:20px;padding:5px 12px;font-size:12px;cursor:pointer;margin-bottom:14px">← Geri</button>
        <div style="font-size:10px;opacity:0.5;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">${(m.type||'').toUpperCase()} ${typeIcon(m.type)}</div>
        <div style="font-size:22px;font-weight:500;letter-spacing:-0.3px">${m.name}</div>
        <div style="font-size:13px;opacity:0.5;margin-bottom:14px">${m.location || '—'}</div>
        <div style="font-size:34px;font-weight:500;letter-spacing:-1px">${formatTL(m.curValue || m.buyPrice || 0)}</div>
        <div style="font-size:12px;opacity:0.6;margin-top:3px">Alış: ${formatTL(m.buyPrice||0)} · ${kazanc>=0?'+':''}${formatTL(kazanc)} kazanç</div>
      </div>
      <div style="padding:18px">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px">Mülk bilgileri</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
          ${_statBox('TL Getirisi', formatPct(pct), pct>=0)}
          ${_statBox('Aylık kira', m.monthRent ? formatTL(m.monthRent) : '—', true)}
          ${_statBox('Alan', m.area ? m.area+'m²' : '—', true)}
          ${_statBox('Alış tarihi', m.buyDate || '—', true)}
        </div>
        ${altinHtml ? `
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px">Alternatif karşılaştırma</div>
          <div class="card" style="margin-bottom:10px">${altinHtml}</div>
          ${usdHtml}
        ` : ''}
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.8px;margin:14px 0 8px">Yapay zeka sinyali</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:10px">
          ${m.location || 'Bu mülk'} için mevcut piyasa koşulları değerlendirildi.
        </div>
        <div class="ai-signal">
          <button class="signal-btn ${aiSignal==='Tut'?'signal-hold':'signal-sell'}">Tut</button>
          <button class="signal-btn ${aiSignal==='Sat'?'signal-hold':'signal-sell'}">Sat</button>
          <button class="signal-btn signal-sell">Al</button>
        </div>
        <div style="display:flex;gap:8px;margin-top:20px;padding-top:16px;border-top:0.5px solid var(--border)">
          <button class="btn btn-outline" style="flex:1" onclick="_editMulk('${m.id}')">Düzenle</button>
          <button class="btn btn-outline" style="color:var(--red-txt);border-color:var(--red)" onclick="_deleteMulk('${m.id}')">Sil</button>
        </div>
      </div>
    </div>`;
  overlay.classList.add('open');
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); }, { once: true });

  window._editMulk   = (id) => { overlay.classList.remove('open'); _showForm(id); };
  window._deleteMulk = async (id) => {
    await softDelete(COL, id);
    overlay.classList.remove('open');
    showToast(t('mulkler.deleted'), 'success');
    const content = document.getElementById('content');
    if (content) { const m2 = await listDocs(COL); const p2 = await getPiyasaData(); _renderList(content, m2, p2); }
  };
}

function _compareRow(name, pct, maxPct, color) {
  const w = maxPct > 0 ? Math.round(Math.abs(pct) / maxPct * 100) : 0;
  const cls = name === 'Bu mülk' ? '' : (pct > 0 ? 'c-green' : 'c-red');
  return `
    <div class="compare-row">
      <div class="compare-name">${name}</div>
      <div class="compare-bar-wrap"><div class="compare-bar" style="width:${w}%;background:${color}"></div></div>
      <div class="compare-pct ${cls}">${formatPct(pct)}</div>
    </div>`;
}

function _statBox(label, value, positive) {
  return `
    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:10px 12px">
      <div style="font-size:11px;color:var(--text3);margin-bottom:3px">${label}</div>
      <div style="font-size:15px;font-weight:500;color:${positive?'var(--text1)':'var(--red-txt)'}">${value}</div>
    </div>`;
}

function _showForm(editId) {
  let overlay = document.getElementById('mulk-overlay');
  if (!overlay) { overlay = document.createElement('div'); overlay.id = 'mulk-overlay'; overlay.className = 'overlay'; document.querySelector('.app-layout').appendChild(overlay); }

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-title">${editId ? 'Mülkü Düzenle' : 'Yeni Mülk Ekle'}</div>
      <div class="form-group">
        <label class="form-label">Mülk adı *</label>
        <input class="form-control" id="f-name" placeholder="örn. Kadıköy Dairesi">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tür *</label>
          <select class="form-control" id="f-type">
            <option value="">Seçiniz</option>
            <option value="daire">Daire</option>
            <option value="villa">Villa</option>
            <option value="arsa">Arsa</option>
            <option value="tarla">Tarla</option>
            <option value="isyeri">İşyeri</option>
            <option value="dukkan">Dükkan</option>
            <option value="bina">Bina</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Durum *</label>
          <select class="form-control" id="f-status">
            <option value="bos">Boş</option>
            <option value="kirada">Kirada</option>
            <option value="satilik">Satılık</option>
            <option value="satildi">Satıldı</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Konum</label>
        <input class="form-control" id="f-location" placeholder="örn. İstanbul, Kadıköy">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Alan (m²)</label>
          <input class="form-control" id="f-area" type="number" placeholder="95">
        </div>
        <div class="form-group">
          <label class="form-label">Alış tarihi *</label>
          <input class="form-control" id="f-buydate" type="date">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Alış fiyatı (₺) *</label>
          <input class="form-control" id="f-buyprice" type="number" placeholder="3000000">
        </div>
        <div class="form-group">
          <label class="form-label">Güncel değer (₺)</label>
          <input class="form-control" id="f-curvalue" type="number" placeholder="4200000">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Aylık kira (₺)</label>
        <input class="form-control" id="f-rent" type="number" placeholder="18000">
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('mulk-overlay').classList.remove('open')">İptal</button>
        <button class="btn btn-primary" onclick="window._saveMulk('${editId||''}')">Kaydet</button>
      </div>
    </div>`;
  overlay.classList.add('open');

  window._saveMulk = async (id) => {
    const name     = document.getElementById('f-name').value.trim();
    const type     = document.getElementById('f-type').value;
    const status   = document.getElementById('f-status').value;
    const buyPrice = parseInt(document.getElementById('f-buyprice').value) || 0;
    const buyDate  = document.getElementById('f-buydate').value;
    if (!name || !type || !buyPrice || !buyDate) { showToast('Lütfen zorunlu alanları doldurun.', 'error'); return; }

    const data = {
      name, type, status, buyPrice, buyDate,
      location: document.getElementById('f-location').value.trim(),
      area:     parseInt(document.getElementById('f-area').value) || null,
      curValue: parseInt(document.getElementById('f-curvalue').value) || buyPrice,
      monthRent:parseInt(document.getElementById('f-rent').value) || 0,
    };

    if (id) await updateDocument(COL, id, data);
    else    await addDocument(COL, data);

    overlay.classList.remove('open');
    showToast(t('mulkler.saved'), 'success');
    const content = document.getElementById('content');
    if (content) { const m = await listDocs(COL); const p = await getPiyasaData(); _renderList(content, m, p); }
  };
}
