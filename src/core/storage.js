/**
 * @file core/storage.js
 * @description Firebase Storage — mülk fotoğraf & belge yükleme
 * @anayasa K02 MIME kontrol · K06 soft delete · K11 workspace izolasyonu
 */
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll, getMetadata } from 'firebase/storage';
import { doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { storage, db } from './firebase';

const MAX_BOYUT = 10 * 1024 * 1024; // 10 MB
const IZINLI_TIP = {
  foto:      ['image/jpeg', 'image/png', 'image/webp'],
  tapu:      ['application/pdf', 'image/jpeg', 'image/png'],
  sozlesme:  ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  fatura:    ['application/pdf', 'image/jpeg', 'image/png'],
  diger:     ['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

export const KATEGORILER = ['foto', 'tapu', 'sozlesme', 'fatura', 'diger'];

function temizIsim(ad) {
  return ad.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}

export async function mulkDosyaYukle(workspaceId, mulkId, file, kategori = 'foto') {
  if (!file) throw new Error('Dosya seçilmedi');
  if (file.size > MAX_BOYUT) throw new Error(`Dosya ${(MAX_BOYUT/1024/1024).toFixed(0)} MB'ı aşıyor`);
  const izinli = IZINLI_TIP[kategori] || IZINLI_TIP.diger;
  if (!izinli.includes(file.type)) {
    throw new Error(`${kategori} için izinli tip değil: ${file.type}`);
  }
  const yol = `workspaces/${workspaceId}/mulkler/${mulkId}/${kategori}/${Date.now()}_${temizIsim(file.name)}`;
  const r = ref(storage, yol);
  const snap = await uploadBytes(r, file, {
    customMetadata: { kategori, orijinalAd: file.name },
  });
  const url = await getDownloadURL(snap.ref);
  try {
    await updateDoc(doc(db, 'mulkler', mulkId), {
      medyaSayisi: increment(1),
      sonMedya: serverTimestamp(),
    });
  } catch { /* mülk güncellenemezse de dosya yüklendi */ }
  return { yol, url, kategori, ad: file.name, boyut: file.size, tip: file.type };
}

export async function mulkDosyaListele(workspaceId, mulkId) {
  const sonuclar = [];
  for (const kategori of KATEGORILER) {
    try {
      const r = ref(storage, `workspaces/${workspaceId}/mulkler/${mulkId}/${kategori}`);
      const list = await listAll(r);
      for (const item of list.items) {
        const [url, meta] = await Promise.all([
          getDownloadURL(item).catch(() => null),
          getMetadata(item).catch(() => ({})),
        ]);
        if (url) sonuclar.push({
          yol: item.fullPath,
          ad: item.name,
          url,
          kategori,
          boyut: meta.size || 0,
          tip: meta.contentType || '',
          olusturulma: meta.timeCreated || null,
        });
      }
    } catch (e) {
      console.warn(`[storage] ${kategori} listesi:`, e.message);
    }
  }
  return sonuclar.sort((a, b) => (b.olusturulma || '').localeCompare(a.olusturulma || ''));
}

export async function mulkDosyaSil(mulkId, yol) {
  try {
    await deleteObject(ref(storage, yol));
    try {
      await updateDoc(doc(db, 'mulkler', mulkId), {
        medyaSayisi: increment(-1),
        sonMedya: serverTimestamp(),
      });
    } catch {}
    return true;
  } catch (e) {
    throw new Error('Dosya silinemedi: ' + e.message);
  }
}

export function formatBoyut(b) {
  if (!b) return '—';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
}
