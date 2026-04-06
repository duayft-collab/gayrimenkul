/**
 * @file core/vergiPaket.js
 * @description Mali müşavir export paketi — multi-CSV + müşavire mail
 * @anayasa K02 — Firebase Trigger Email extension üzerinden mail
 *
 * NOT: SheetJS/JSZip bağımlılıkları yok → multi-CSV + meta JSON dosyaları
 *      ayrı ayrı indirilir; ZIP yerine kullanıcı klasöre toplar.
 */
import { collection, doc, getDocs, getDoc, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { portfoyVergiOzeti } from './vergiHesap';
import { beyannameTaslakOlustur } from './vergiBeyanname';
import { giderListele } from './vergiGider';
import { emailGonder } from './emailGonder';
import { logKaydet } from './auditLog';

function csvSatir(rows) {
  return rows.map(r => r.map(c => {
    const s = String(c ?? '');
    return s.includes(';') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(';')).join('\n');
}

function csvIndir(ad, rows) {
  const blob = new Blob(['\uFEFF' + csvSatir(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ad;
  a.click();
  URL.revokeObjectURL(url);
}

function jsonIndir(ad, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ad;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Paket meta — kullanıcı önizleme + indirme için
 */
export async function paketOlustur({ workspaceId, user, yil }) {
  const ozet = await portfoyVergiOzeti(workspaceId, yil);
  const taslak = await beyannameTaslakOlustur({ workspaceId, user, yil });

  // Kira ödemeleri
  let kiralar = [];
  try {
    const q = query(
      collection(db, 'odemeler'),
      where('workspaceId', '==', workspaceId),
      where('isDeleted', '==', false),
    );
    const snap = await getDocs(q);
    kiralar = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(o => o.tip === 'kira')
      .filter(o => {
        const t = o.odemeTarihi?.toDate?.() || (o.odemeTarihi ? new Date(o.odemeTarihi) : null);
        return t && t.getFullYear() === yil;
      });
  } catch {}

  // Giderler
  const giderler = await giderListele(workspaceId, null, yil);

  // Dosya listesi (dekontlar)
  const dosyalar = [];
  for (const o of kiralar) if (o.dekontUrl) dosyalar.push({ tip: 'kira_dekont', url: o.dekontUrl, ref: o.referans || o.id });
  for (const g of giderler) if (g.dekontUrl) dosyalar.push({ tip: 'gider_dekont', url: g.dekontUrl, ref: g.kategori });

  return {
    yil,
    workspaceId,
    olusturulma: new Date().toISOString(),
    olusturan: user?.name || 'bilinmiyor',
    ozet,
    taslak,
    kiralar,
    giderler,
    dosyalar,
  };
}

/**
 * Multi-CSV + JSON indir (ZIP yerine browser klasör)
 */
export function paketIndir(paket) {
  const yil = paket.yil;

  // 1) Özet CSV
  csvIndir(`vergi_${yil}_01_ozet.csv`, [
    ['Metrik', 'Değer (TL)'],
    ['Yıllık Brüt Kira', (paket.ozet.yillikBrutKiraKurus / 100).toFixed(2)],
    ['Toplam Gider', (paket.ozet.toplamGiderKurus / 100).toFixed(2)],
    ['Matrah', (paket.ozet.matrahKurus / 100).toFixed(2)],
    ['İstisna Sonrası', (paket.ozet.istisnaDusuluKurus / 100).toFixed(2)],
    ['GMSİ Vergisi', (paket.ozet.gmsiVergiKurus / 100).toFixed(2)],
    ['Emlak Vergisi', (paket.ozet.emlakVergiKurus / 100).toFixed(2)],
    ['Toplam Vergi', (paket.ozet.toplamVergiKurus / 100).toFixed(2)],
  ]);

  // 2) Mülk bazlı CSV
  csvIndir(`vergi_${yil}_02_mulkler.csv`, [
    ['Mülk', 'Brüt Kira', 'Gider', 'Matrah', 'GMSİ', 'Emlak', 'Toplam'],
    ...paket.ozet.mulkBazli.map(m => [
      m.ad,
      (m.brutKurus / 100).toFixed(2),
      (m.giderKurus / 100).toFixed(2),
      (m.matrahKurus / 100).toFixed(2),
      (m.gmsiVergiKurus / 100).toFixed(2),
      (m.emlakVergiKurus / 100).toFixed(2),
      (m.toplamKurus / 100).toFixed(2),
    ]),
  ]);

  // 3) Kira ödemeleri CSV
  csvIndir(`vergi_${yil}_03_kira_odemeleri.csv`, [
    ['Tarih', 'Mülk ID', 'Tutar (TL)', 'Yöntem', 'Durum', 'Referans'],
    ...paket.kiralar.map(k => {
      const t = k.odemeTarihi?.toDate?.() || new Date(k.odemeTarihi || 0);
      return [
        t.toLocaleDateString('tr-TR'),
        k.mulkId || '—',
        ((k.tutarKurus || 0) / 100).toFixed(2),
        k.odemeYontemi || '—',
        k.durum || '—',
        k.referans || k.id,
      ];
    }),
  ]);

  // 4) Giderler CSV
  csvIndir(`vergi_${yil}_04_giderler.csv`, [
    ['Tarih', 'Mülk', 'Kategori', 'Tutar (TL)', 'Açıklama'],
    ...paket.giderler.map(g => {
      const t = g.tarih?.toDate?.() || new Date(g.tarih || 0);
      return [
        t.toLocaleDateString('tr-TR'),
        g.mulkId || '—',
        g.kategori,
        ((g.tutarKurus || 0) / 100).toFixed(2),
        g.aciklama || '',
      ];
    }),
  ]);

  // 5) Dosya listesi (dekont URL'leri)
  csvIndir(`vergi_${yil}_05_dosyalar.csv`, [
    ['Tip', 'Referans', 'URL'],
    ...paket.dosyalar.map(d => [d.tip, d.ref, d.url]),
  ]);

  // 6) Beyanname taslak JSON
  jsonIndir(`vergi_${yil}_06_beyanname_taslak.json`, paket.taslak);

  // 7) Tam meta JSON (yedek)
  jsonIndir(`vergi_${yil}_07_full_meta.json`, paket);

  // Audit log
  if (paket.workspaceId) {
    logKaydet({
      workspaceId: paket.workspaceId, user: { name: paket.olusturan },
      tip: 'export', entityTip: 'vergi_paket',
      entityAd: `Mali Müşavir Paket ${yil}`,
      notlar: `${paket.kiralar.length} kira + ${paket.giderler.length} gider + ${paket.dosyalar.length} dosya`,
    });
  }
}

/**
 * Müşavire mail at — paket özeti + dekont URL'leri
 * (ZIP yok → mail içinde özet + URL listesi)
 */
export async function muhasebeciMaiGonder(paket, email) {
  if (!email) throw new Error('Mail adresi gerekli');

  const ozetTbl = paket.ozet.mulkBazli.map(m => `
    <tr>
      <td>${m.ad}</td>
      <td style="text-align:right">₺${(m.brutKurus / 100).toFixed(2)}</td>
      <td style="text-align:right">₺${(m.giderKurus / 100).toFixed(2)}</td>
      <td style="text-align:right">₺${(m.toplamKurus / 100).toFixed(2)}</td>
    </tr>
  `).join('');

  const dosyaTbl = paket.dosyalar.slice(0, 50).map(d => `
    <li>${d.tip}: <a href="${d.url}">${d.ref}</a></li>
  `).join('');

  const html = `
<div style="font-family:system-ui;max-width:680px;margin:0 auto;background:#0B0B0F;color:#fff;padding:30px;border-radius:12px">
  <h2 style="color:#C9A84C;border-bottom:2px solid #C9A84C;padding-bottom:10px">📊 Vergi Paketi ${paket.yil}</h2>
  <p>Sayın Mali Müşavir,</p>
  <p>${paket.olusturan} adına ${paket.yil} yılı vergi belgeleri aşağıdadır:</p>

  <h3 style="color:#C9A84C">Özet</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead>
      <tr style="background:#1a1a20;color:#C9A84C">
        <th style="padding:8px;text-align:left">Mülk</th>
        <th style="padding:8px;text-align:right">Brüt Kira</th>
        <th style="padding:8px;text-align:right">Gider</th>
        <th style="padding:8px;text-align:right">Toplam Vergi</th>
      </tr>
    </thead>
    <tbody>${ozetTbl}</tbody>
  </table>

  <div style="background:#1a1a20;padding:14px;border-left:3px solid #C9A84C;margin:14px 0">
    <b style="color:#C9A84C">Toplam Brüt:</b> ₺${(paket.ozet.yillikBrutKiraKurus / 100).toFixed(2)}<br>
    <b style="color:#C9A84C">Toplam Vergi:</b> ₺${(paket.ozet.toplamVergiKurus / 100).toFixed(2)}<br>
    <b style="color:#C9A84C">${paket.kiralar.length}</b> kira ödemesi, <b style="color:#C9A84C">${paket.giderler.length}</b> gider, <b style="color:#C9A84C">${paket.dosyalar.length}</b> dekont
  </div>

  ${paket.dosyalar.length > 0 ? `
  <h3 style="color:#C9A84C">Dekont Linkleri (ilk 50)</h3>
  <ul style="font-size:11px">${dosyaTbl}</ul>
  ` : ''}

  <p style="font-size:11px;color:#888;margin-top:20px">
    CSV/JSON dosyalarını mükellef indirip ayrıca size iletecektir.<br>
    Gönderim tarihi: ${new Date().toLocaleString('tr-TR')}
  </p>
</div>
  `;

  const mailId = await emailGonder({
    to: email,
    subject: `Vergi Paketi ${paket.yil} · ${paket.olusturan}`,
    html,
  });

  // Workspace'e müşavir email kaydet
  try {
    await updateDoc(doc(db, 'workspaces', paket.workspaceId), {
      muhasebeciEmail: email,
      sonMuhasebeciGonderim: serverTimestamp(),
    });
  } catch {}

  if (paket.workspaceId) {
    logKaydet({
      workspaceId: paket.workspaceId,
      user: { name: paket.olusturan },
      tip: 'export', entityTip: 'vergi_paket',
      entityAd: `Müşavire mail: ${email}`,
    });
  }

  return { mailId, alici: email };
}

/** Workspace'de kayıtlı müşavir email'i çek */
export async function muhasebeciEmailGetir(workspaceId) {
  try {
    const snap = await getDoc(doc(db, 'workspaces', workspaceId));
    return snap.exists() ? (snap.data()?.muhasebeciEmail || '') : '';
  } catch {
    return '';
  }
}
