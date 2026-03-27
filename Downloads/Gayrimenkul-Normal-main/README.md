# Gayrimenkul Yönetim Sistemi
**Duay Global Trade Company** | v1.0 / 2026-03-23 | info@duaycor.com

---

## Kurulum

### 1. Firebase Projesi Oluştur
1. [Firebase Console](https://console.firebase.google.com) → "Proje Oluştur"
2. Authentication → E-posta/Şifre sağlayıcısını etkinleştir
3. Firestore Database → "Production mode" ile oluştur
4. Proje Ayarları → "Uygulama ekle" → Web uygulaması ekle
5. Gösterilen config değerlerini `.env` dosyasına yapıştır

### 2. Ortam Değişkenlerini Ayarla
```bash
cp .env.example .env
# .env dosyasını gerçek Firebase değerleriyle doldur
```

### 3. Firestore Güvenlik Kurallarını Yükle
```bash
firebase deploy --only firestore:rules
```

### 4. İlk Admin Kullanıcısını Oluştur
Firebase Console → Authentication → "Kullanıcı ekle" ile kullanıcı oluştur.
Ardından Firestore → `users` koleksiyonuna şu belgeyi ekle:
```json
{
  "uid": "<firebase-auth-uid>",
  "email": "admin@sirket.com",
  "displayName": "Admin",
  "role": "admin",
  "status": "active",
  "lang": "tr",
  "theme": "light",
  "createdAt": "<serverTimestamp>",
  "isDeleted": false
}
```

---

## Klasör Yapısı

```
gayrimenkul-app/
├── assets/css/          — Stil dosyaları (tema, layout, bileşenler)
├── config/              — Firebase config + uygulama sabitleri + RBAC
├── src/
│   ├── core/            — Auth, database, error-handler, logger, i18n
│   ├── modules/         — Modül iş mantığı (mülkler, kira vb.)
│   ├── admin/           — Admin panel, audit log, yedekleme
│   ├── ui/              — Toast, modal, router, tema, dil
│   └── locales/         — tr.js, en.js çeviri dosyaları
├── pages/               — HTML sayfaları
├── firestore/           — Güvenlik kuralları
└── tests/               — Birim testleri
```

---

## Yedekleme & PITR Prosedürü (Anayasa §08)

### Otomatik Yedekleme
- Cloud Scheduler her gece 02:00'de Firestore Export tetikler
- Yedekler `gs://YOUR_PROJECT_ID-backups/` bucket'a yazılır
- 30 gün saklanır, sonra otomatik silinir

### Point-in-Time Recovery (PITR)
Firebase Console → Firestore → "Point-in-time recovery" etkinleştir.

**Geri Yükleme Adımları:**
1. Firebase Console → Firestore → Import/Export
2. "Import data" → belirli zaman damgası seç
3. Hedef koleksiyonları belirle
4. Import başlat — canlı veritabanı etkilenmez

**CLI ile Geri Yükleme:**
```bash
# Belirli bir noktaya geri dön
gcloud firestore import \
  gs://YOUR_PROJECT_ID-backups/YYYY-MM-DD/ \
  --collection-ids=mulkler,sozlesmeler,odemeler
```

### Yedekleme Başarısızlık Uyarısı
Cloud Monitoring → Alert Policy oluştur:
- Kaynak: Cloud Scheduler
- Metrik: Job başarısız olursa
- Bildirim: E-posta (info@duaycor.com) + Slack webhook

---

## Güvenlik Notları

- Tüm API anahtarları `.env` dosyasında — asla commit etme
- Firestore Rules ile multi-tenant izolasyon sağlanmıştır
- Tüm kullanıcı hareketleri `audit_logs` koleksiyonuna kaydedilir
- Fiziksel silme yoktur — tüm silmeler `isDeleted: true` ile yapılır
- PII alanları (e-posta, TC No) loglarda maskelenir

---

## KVKK / GDPR Notları

- Kişisel veri işleme: Firestore'da `users` koleksiyonunda
- Saklama süresi: Kullanıcı silindiğinde `isDeleted: true` + 90 gün sonra gerçek silme (Cloud Function ile)
- Veri dışa aktarma talebi: Admin paneli → Kullanıcı → "Verileri İndir"
- Veri silme talebi: Admin paneli → Kullanıcı → "Hesabı Kapat"

---

## Geliştirme

```bash
# Firebase emülatörü başlat
firebase emulators:start --only firestore,auth

# Uygulamayı lokalde çalıştır
npx serve .
```

---

*Duay Global Trade Company | info@duaycor.com | v1.0 / 2026-03-23*
