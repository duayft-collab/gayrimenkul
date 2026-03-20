# TradeOS — GitHub + Firebase Kurulum Kılavuzu

## Proje Yapısı

```
tradeos/
├── index.html                    ← Giriş noktası (login'e yönlendirir)
├── pages/
│   ├── login.html                ← Giriş sayfası
│   ├── dashboard.html            ← Ana panel
│   ├── crm.html                  ← Müşteri/Tedarikçi
│   ├── orders.html               ← Siparişler
│   ├── documents.html            ← Dokümanlar
│   ├── finance.html              ← Finans & Metaller
│   ├── samples.html              ← Numune Arşivi
│   ├── freight.html              ← Navlun & Kargo
│   ├── announcements.html        ← Duyurular
│   ├── calendar.html             ← Takvim
│   ├── tasks.html                ← Yapılacaklar
│   ├── archive.html              ← Döküman Arşivi
│   ├── reference.html            ← Referans Dökümanlar
│   ├── vision.html               ← Vizyon Kütüphanesi
│   ├── hr.html                   ← İK Hub
│   ├── bonus.html                ← Prim Yönetimi
│   ├── timesheet.html            ← Puantaj
│   ├── orgchart.html             ← Hiyerarşi Şeması
│   └── users.html                ← Kullanıcılar
├── js/
│   ├── firebase-config.js        ← ← ← BURAYA KENDİ BİLGİLERİNİZİ GİRİN
│   └── nav.js                    ← Ortak navigasyon
├── css/
│   └── tradeos.css               ← Ortak stiller
├── firestore.rules               ← Firestore güvenlik kuralları
├── storage.rules                 ← Storage güvenlik kuralları
└── .github/workflows/deploy.yml  ← Otomatik GitHub Pages deploy
```

---

## ADIM 1 — Firebase Projesi Oluştur

1. [console.firebase.google.com](https://console.firebase.google.com) adresine gidin
2. **Proje Ekle** → proje adı girin (örn: `tradeos-firma`)
3. Google Analytics → isteğe bağlı, geçin

### Firebase Servislerini Aktif Edin:

**Authentication:**
- Sol menü → Authentication → Başlayın
- Sign-in method → E-posta/Şifre → Etkinleştir
- Sign-in method → Google → Etkinleştir (opsiyonel)

**Firestore Database:**
- Sol menü → Firestore Database → Veritabanı Oluştur
- **Production mode** seçin
- Bölge: `europe-west3` (Frankfurt — Türkiye'ye en yakın)

**Storage:**
- Sol menü → Storage → Başlayın
- Production mode → bölge seçin

---

## ADIM 2 — Firebase Bilgilerini Dosyaya Girin

1. Firebase Console → Proje Ayarları (⚙️ dişli)
2. Genel → Uygulamalarınız → Web uygulaması ekle
3. Uygulama adı: `TradeOS Web`
4. Çıkan SDK bilgilerini kopyalayın

`js/firebase-config.js` dosyasını açın ve şu kısmı doldurun:

```javascript
const firebaseConfig = {
  apiKey:            "AIzaSy...",        // ← Kopyalayın
  authDomain:        "tradeos.firebaseapp.com",
  projectId:         "tradeos-firma",
  storageBucket:     "tradeos-firma.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};
```

---

## ADIM 3 — Firestore Güvenlik Kurallarını Yükleyin

Firebase Console → Firestore → Kurallar → Düzenle:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /to_{collection}/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Yayınla** butonuna basın.

Storage → Kurallar için de aynısı:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## ADIM 4 — İlk Kullanıcıyı Oluşturun

Firebase Console → Authentication → Kullanıcılar → Kullanıcı Ekle:
- E-posta: `admin@firmaniz.com`
- Şifre: Güçlü bir şifre belirleyin

---

## ADIM 5 — GitHub'a Yükleyin

### Yeni repo oluşturun:

```bash
# Bilgisayarınızda terminal açın
cd tradeos-klasoru

git init
git add .
git commit -m "TradeOS ilk yükleme"

# GitHub'da yeni repo oluşturun: github.com/new
git remote add origin https://github.com/KULLANICI_ADINIZ/tradeos.git
git branch -M main
git push -u origin main
```

---

## ADIM 6 — GitHub Pages'i Aktive Edin

1. GitHub → Repo sayfanız → **Settings**
2. Sol menü → **Pages**
3. Source → **GitHub Actions** seçin
4. `.github/workflows/deploy.yml` dosyası otomatik devreye girer

Birkaç dakika içinde siteniz şu adreste yayında olur:
```
https://KULLANICI_ADINIZ.github.io/tradeos/
```

---

## ADIM 7 — Özel Domain (Opsiyonel)

Örn: `app.firmaniz.com` kullanmak istiyorsanız:

1. GitHub Pages → Settings → Custom domain → `app.firmaniz.com` girin
2. Domain sağlayıcınızda CNAME kaydı ekleyin:
   - Host: `app`
   - Value: `KULLANICI_ADINIZ.github.io`
3. Firebase Console → Authentication → Authorized domains → domain'i ekleyin

---

## Güncelleme Nasıl Yapılır?

Herhangi bir dosyayı düzenlediğinizde:

```bash
git add .
git commit -m "Güncelleme açıklaması"
git push
```

GitHub Actions otomatik olarak sitenizi güncelleyecektir. (~2 dakika sürer)

---

## Firebase Koleksiyonları

| Koleksiyon | Modül |
|---|---|
| `to_users` | Kullanıcılar |
| `to_firms` | CRM |
| `to_orders` | Siparişler |
| `to_documents` | Dokümanlar |
| `to_invoices` | Faturalar |
| `to_metals` | Metal İşlemleri |
| `to_activities` | Aktivite Logu |
| `to_announcements` | Duyurular |
| `to_tasks` | Yapılacaklar |
| `to_archive` | Döküman Arşivi |
| `to_samples` | Numune Arşivi |
| `to_freight` | Navlun & Kargo |
| `to_leaves` | İzin Talepleri |
| `to_bonuses` | Prim Kayıtları |
| `to_timesheet` | Puantaj |
| `to_reference` | Referans Dökümanlar |
| `to_meetings` | Görüşmeler |
| `to_candidates` | İşe Alım Adayları |

---

## Sorun Giderme

**Giriş çalışmıyor:**
- `firebase-config.js` içindeki bilgileri kontrol edin
- Firebase Console → Authentication → aktif mi?

**Veriler kaydedilmiyor:**
- Firestore kurallarını kontrol edin
- Browser console'da hata var mı? (F12)

**GitHub Pages açılmıyor:**
- Actions sekmesinden deploy durumunu kontrol edin
- Pages ayarlarında GitHub Actions seçili mi?

---

Yardım için: Her sayfanın başında `console.log` çıktıları mevcuttur.
Firebase hatalarını tarayıcı konsolunda görebilirsiniz (F12 → Console).
