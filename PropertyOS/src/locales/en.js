/**
 * src/locales/en.js
 * Duay Global Trade Company — Property OS
 * Anayasa: K13
 * v1.0 / 2026-03-28
 */

export const EN = {
  app: { name: 'Property OS', tagline: 'Real Estate Intelligence' },

  nav: {
    dashboard:  'Dashboard',
    mulkler:    'My Properties',
    performans: 'Performance',
    piyasa:     'Market Rates',
    hesap:      'Calculator',
    kira:       'Rent Tracker',
    belgeler:   'Documents',
    raporlar:   'Reports',
    cikis:      'Sign Out',
  },

  dashboard: {
    title:          'Dashboard',
    portfolioValue: 'Portfolio value',
    altinBazli:     'Gold based',
    usdBazli:       'USD based',
    toplamMulk:     'Total properties',
    aylikKira:      'Monthly rent',
    mulklerim:      'My Properties',
    tumunu:         'View All',
    karsilastirma:  'Alternative comparison',
    portfoyDagilim: 'Portfolio distribution',
    canliKurlar:    'Live rates',
  },

  mulkler: {
    title:   'My Properties',
    add:     '+ Add Property',
    name:    'Property name',
    type:    'Type',
    location:'Location',
    area:    'Area (m²)',
    buyPrice:'Purchase price (₺)',
    buyDate: 'Purchase date',
    curValue:'Current value (₺)',
    monthRent:'Monthly rent (₺)',
    status:  'Status',
    notes:   'Notes',
    saved:   'Property saved.',
    deleted: 'Property deleted.',
    types: { daire:'Apartment', villa:'Villa', arsa:'Land', tarla:'Field', isyeri:'Office', dukkan:'Shop', bina:'Building' },
    statuses: { kirada:'Rented', bos:'Vacant', satilik:'For Sale', satildi:'Sold' },
  },

  performans: {
    title:      'Performance Analysis',
    tlGetiri:   'TRY return',
    altinGetiri:'Gold return',
    usdGetiri:  'USD return',
    btcGetiri:  'BTC return',
    alissaydim: 'What if I invested elsewhere?',
    onunde:     'ahead',
    geride:     'behind',
    verdict:    'Analysis',
    aiSignal:   'AI signal',
    tut:        'Hold',
    sat:        'Sell',
    al:         'Buy',
  },

  piyasa: {
    title:    'Market Rates',
    live:     'Live',
    altinDeg: 'Portfolio in gold',
    tufe:     'CPI Real Analysis',
    nominal:  'Nominal return',
    tufeYil:  'CPI (annual)',
    reel:     'Real return',
  },

  hesap: {
    title:       'Calculator',
    toplamFiyat: 'Total price (₺)',
    pesinat:     'Down payment (₺)',
    faizOran:    'Interest rate (%)',
    sure:        'Duration (months)',
    kiraGetiri:  'Expected rent (₺/month)',
    aylikOdeme:  'Monthly payment',
    toplamMaliyet:'Total cost',
    amortisman:  'Payback period',
    hesapla:     'Calculate',
  },

  kira: {
    title:    'Rent Tracker',
    tenant:   'Tenant',
    property: 'Property',
    amount:   'Rent amount',
    period:   'Period',
    status:   'Status',
    odendi:   'Paid',
    gecikti:  'Overdue',
    bekliyor: 'Pending',
    tahsil:   'Mark Paid',
    saved:    'Payment saved.',
  },

  belgeler: {
    title:  'Documents',
    upload: 'Upload File',
    type:   'Document type',
    mulk:   'Related property',
    types: { tapu:'Title Deed', kira:'Lease Agreement', fotograf:'Photo', diger:'Other' },
  },

  ui: {
    save:    'Save',
    cancel:  'Cancel',
    delete:  'Delete',
    edit:    'Edit',
    close:   'Close',
    loading: 'Loading...',
    noData:  'No data found.',
    error:   'An unexpected error occurred.',
    success: 'Success',
    required:'required',
    optional:'optional',
  },

  auth: {
    login:    'Sign In',
    email:    'Email',
    password: 'Password',
    welcome:  'Welcome Back',
    subtitle: 'Sign in to your account',
    forgot:   'Forgot Password',
    error:    'Invalid email or password.',
  },
};
