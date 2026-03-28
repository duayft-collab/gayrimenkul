/**
 * src/locales/tr.js
 * Duay Global Trade Company — Property OS
 * Anayasa: K13
 * v1.0 / 2026-03-28
 */

export const TR = {
  app: { name: 'Property OS', tagline: 'Gayrimenkul Zekası' },

  nav: {
    dashboard:  'Dashboard',
    mulkler:    'Mülklerim',
    performans: 'Performans',
    piyasa:     'Piyasa Kurları',
    hesap:      'Hesap Makinesi',
    kira:       'Kira Takibi',
    belgeler:   'Belgeler',
    raporlar:   'Raporlar',
    cikis:      'Çıkış Yap',
  },

  dashboard: {
    title:          'Dashboard',
    portfolioValue: 'Portföy değeri',
    altinBazli:     'Altın bazlı',
    usdBazli:       'USD bazlı',
    toplamMulk:     'Toplam mülk',
    aylikKira:      'Aylık kira',
    mulklerim:      'Mülklerim',
    tumunu:         'Tümünü Gör',
    karsilastirma:  'Alternatif karşılaştırma',
    portfoyDagilim: 'Portföy dağılımı',
    canliKurlar:    'Canlı kurlar',
  },

  mulkler: {
    title:   'Mülklerim',
    add:     '+ Mülk Ekle',
    name:    'Mülk adı',
    type:    'Tür',
    location:'Konum',
    area:    'Alan (m²)',
    buyPrice:'Alış fiyatı (₺)',
    buyDate: 'Alış tarihi',
    curValue:'Güncel değer (₺)',
    monthRent:'Aylık kira (₺)',
    status:  'Durum',
    notes:   'Notlar',
    saved:   'Mülk kaydedildi.',
    deleted: 'Mülk silindi.',
    types: { daire:'Daire', villa:'Villa', arsa:'Arsa', tarla:'Tarla', isyeri:'İşyeri', dukkan:'Dükkan', bina:'Bina' },
    statuses: { kirada:'Kirada', bos:'Boş', satilik:'Satılık', satildi:'Satıldı' },
  },

  performans: {
    title:      'Performans Analizi',
    tlGetiri:   'TL getirisi',
    altinGetiri:'Altın getirisi',
    usdGetiri:  'USD getirisi',
    btcGetiri:  'BTC getirisi',
    alissaydim: 'Aynı parayı başka yerde tutsaydım?',
    onunde:     'öndesiniz',
    geride:     'geride kaldınız',
    verdict:    'Analiz',
    aiSignal:   'Yapay zeka sinyali',
    tut:        'Tut',
    sat:        'Sat',
    al:         'Al',
  },

  piyasa: {
    title:    'Piyasa Kurları',
    live:     'Canlı',
    altinDeg: 'Portföyün altın değeri',
    tufe:     'TÜFE Reel Analiz',
    nominal:  'Nominal getiri',
    tufeYil:  'TÜFE (yıllık)',
    reel:     'Reel getiri',
  },

  hesap: {
    title:       'Hesap Makinesi',
    toplamFiyat: 'Toplam fiyat (₺)',
    pesinat:     'Peşinat (₺)',
    faizOran:    'Faiz oranı (%)',
    sure:        'Süre (ay)',
    kiraGetiri:  'Beklenen kira (₺/ay)',
    aylikOdeme:  'Aylık ödeme',
    toplamMaliyet:'Toplam maliyet',
    amortisman:  'Amortisman süresi',
    hesapla:     'Hesapla',
  },

  kira: {
    title:     'Kira Takibi',
    tenant:    'Kiracı',
    property:  'Mülk',
    amount:    'Kira tutarı',
    period:    'Dönem',
    status:    'Durum',
    odendi:    'Ödendi',
    gecikti:   'Gecikmiş',
    bekliyor:  'Bekliyor',
    tahsil:    'Tahsil Et',
    saved:     'Ödeme kaydedildi.',
  },

  belgeler: {
    title:  'Belgeler',
    upload: 'Dosya Yükle',
    type:   'Belge türü',
    mulk:   'İlgili mülk',
    types: { tapu:'Tapu Senedi', kira:'Kira Sözleşmesi', fotograf:'Fotoğraf', diger:'Diğer' },
  },

  ui: {
    save:    'Kaydet',
    cancel:  'İptal',
    delete:  'Sil',
    edit:    'Düzenle',
    close:   'Kapat',
    loading: 'Yükleniyor...',
    noData:  'Veri bulunamadı.',
    error:   'Beklenmeyen bir hata oluştu.',
    success: 'Başarılı',
    required:'zorunlu',
    optional:'opsiyonel',
  },

  auth: {
    login:    'Giriş Yap',
    email:    'E-posta',
    password: 'Şifre',
    welcome:  'Hoş Geldiniz',
    subtitle: 'Hesabınıza giriş yapın',
    forgot:   'Şifremi Unuttum',
    error:    'E-posta veya şifre hatalı.',
  },
};
