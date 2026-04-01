/**
 * @file pages/LeaseIntelligence.jsx
 * @description Kira Sözleşmesi Zekası + Tahsilat Taktikleri
 * @sources TBK md.299-378, GYODER, gerçek ev sahibi deneyimleri
 * @company Duay Global Trade | @version 1.0.0
 */

import { useState } from 'react';
import { Topbar, TickerBar } from '../components/Layout';

const TABS = [
  { id: 'contract', label: 'Sözleşme Analizi' },
  { id: 'traps', label: 'Kiracı Şeytanlıkları' },
  { id: 'protect', label: 'Sizi Koruyan Maddeler' },
  { id: 'collection', label: 'Tahsilat Taktikleri' },
  { id: 'increase', label: 'Kira Artışı' },
  { id: 'eviction', label: 'Tahliye & Çıkış' },
];

const RISKS = [
  {
    id: 1, level: 'critical',
    title: 'Belirsiz Tahliye Maddesi',
    desc: '"Ev sahibi istediği zaman çıkarabilir" ifadesi TBK\'ya göre hukuki geçersizdir. Kiracı bunu kabul etmese de madde uygulanamaz.',
    fix: 'Bu maddeyi sözleşmeden tamamen kaldırın. Tahliye yalnızca TBK md.347\'de sayılan koşullarla mümkündür.',
    law: 'TBK md.347 — Konut kiralarında tahliye koşulları',
    property: 'Kalamış Daire',
  },
  {
    id: 2, level: 'warning',
    title: 'Depozito 3 Aylık Kira Üzerinde Talep Edilmiş',
    desc: 'Sözleşmede 4 aylık depozito talep edilmiş. Yasal üst sınır 3 aylık kiradır. Fazlası için kiracı iade davası açabilir.',
    fix: '3 aylık kira bedeline indirin. Fazla alınan tutarı iade edin ya da kira olarak mahsup edin.',
    law: 'TBK md.342 — Depozito üst sınırı 3 aylık kira',
    property: 'Kalamış Daire',
  },
  {
    id: 3, level: 'info',
    title: 'Kira Artış Endeksi Belirsiz Bırakılmış',
    desc: '"TÜFE oranında artış" yazıyor ama hangi TÜFE esas alınacak belirtilmemiş. Bu belirsizlik ihtilaf kaynağıdır.',
    fix: '"12 aylık ortalama TÜFE, en fazla %25 artış" şeklinde netleştirin. Kesin formül yazın.',
    law: 'TBK md.344 — Kira artış sınırı (2027\'ye kadar %25 tavan)',
    property: 'Kalamış Daire',
  },
];

const TRAPS = [
  {
    icon: '🎭',
    title: 'Sahte Tahliye Sözü — Sözlü Protokol',
    scenario: 'Kiracı sözlü olarak "çıkacağım" der, tarih verir, sonra döner. Yasal yaptırımı yoktur.',
    reality: 'Mahkemede "söylemedim" der. Sözlü söz hukuki geçersiz.',
    solution: 'Her mutabakat noter onaylı veya ıslak imzalı yazılı protokol olmalı. E-posta bile yeterli değil, noter şart.',
    severity: 'danger',
  },
  {
    icon: '🔑',
    title: 'Anahtarı Bırak — Tutanaksız Teslim',
    scenario: 'Kiracı anahtarı kapıya bırakır ya da komşuya verir. Teslim tutanağı imzalamaz.',
    reality: 'Sonradan mülk hasarı için sizi sorumlu tutar, kirayı geri talep edebilir. Hukuki kriz.',
    solution: 'Teslim-iade mutlaka fotoğraflı, imzalı, tarihli tutanakla olmalı. İmzasız anahtar kabul etmeyin.',
    severity: 'danger',
  },
  {
    icon: '📱',
    title: 'Alt Kiralama — Airbnb, Devir',
    scenario: 'Kiracı mülkü Airbnb\'ye açar veya başkasına habersiz devreder.',
    reality: 'Yabancı kişiler mülkünüzde kalıyor, hasar görüyorsunuz. Vergi sorunu da çıkabilir.',
    solution: 'Sözleşmeye "Alt kiralama, devir ve Airbnb türü kısa süreli kiralama yasaktır. Aksi sözleşmeyi fesheder" maddesi ekleyin.',
    law: 'TBK md.322 — Alt kiralama izne bağlı',
    severity: 'danger',
  },
  {
    icon: '🔧',
    title: 'İzinsiz Tadilat — Yapısal Değişiklik',
    scenario: 'Kiracı duvar kaldırır, mutfak değiştirir, balkonu kapatır — izin almadan.',
    reality: 'İzin almadan yapılan değişiklikler için kiracı sorumludur ama eski hale getirmek çok maliyetli olabilir.',
    solution: '"Her türlü tadilat ve yapısal değişiklik için ev sahibinin yazılı onayı şarttır" maddesi ekleyin.',
    severity: 'warning',
  },
  {
    icon: '📄',
    title: 'Kira Makbuzunu Reddetme',
    scenario: 'Kiracı elden ödeme yapar, makbuz imzalamaz. Sonra "ödemedim" diyebilir.',
    reality: 'İspat yükü ev sahibinde. Makbuzsuz nakit ödemelerde ciddi hukuki risk var.',
    solution: 'Kira ödemelerini her zaman banka havalesi ile alın. EFT dekontu en güçlü ispat aracıdır.',
    severity: 'warning',
  },
  {
    icon: '🏃',
    title: 'Gece Yarısı Çıkış — Eşya Bırakma',
    scenario: 'Kiracı gece sessizce çıkar, bazı eşyaları bırakır. Kirayı ödemez.',
    reality: 'Bırakılan eşyalar nedeniyle mülkü hemen kiraya veremezsiniz. Hukuki süreç uzar.',
    solution: 'Teslim tutanağında "eşya kalmamıştır" onayı alın. Kalan eşyalar için noter tespiti yaptırın.',
    severity: 'warning',
  },
];

const PROTECT_CLAUSES = [
  {
    title: 'Fotoğraflı Teslim Tutanağı',
    desc: 'Giriş ve çıkışta fotoğraflı, imzalı durum tespiti. Mülkün her odasını belgeleyin.',
    importance: 'Hasar tazminatı davalarında en güçlü delil.',
    mustHave: true,
  },
  {
    title: 'İhtarname Hakkı Saklıdır',
    desc: 'Ödeme gecikmesinde noter ihtarnamesi gönderme hakkının saklı tutulduğu madde.',
    importance: 'İcra ve tahliye davası için zorunlu ön adım.',
    mustHave: true,
  },
  {
    title: 'Aidat / Vergi Sorumluluğu Netleştirmesi',
    desc: 'Site aidatı kiracıya, emlak vergisi ev sahibine ait olduğu açıkça yazılmalı.',
    importance: 'En sık ihtilaf kaynağı. Açık yazılmazsa tartışma çıkar.',
    mustHave: true,
  },
  {
    title: 'Bakım Sınırları',
    desc: 'Küçük bakım (ampul, musluk, boya) kiracıya; büyük tamir (kombi, çatı, kalorifer) ev sahibine.',
    importance: 'TBK zaten bunu söyler ama sözleşmede yazmak ihtilafı önler.',
    mustHave: false,
  },
  {
    title: 'Yasak Listesi',
    desc: 'Evcil hayvan, sigara, alt kiralama, Airbnb, yapısal tadilat yasağı — açık ve ayrı maddelerle.',
    importance: 'Her yasak ayrı madde olmalı. Toplu "yasaktır" ifadesi yeterli değil.',
    mustHave: true,
  },
  {
    title: 'Kira Ödeme Yöntemi',
    desc: 'Kira ödemelerinin yalnızca banka havalesi ile yapılacağı belirtilmeli.',
    importance: 'Nakit ödemeler ispatı zorlaştırır. EFT zorunluluğu sizi korur.',
    mustHave: true,
  },
  {
    title: 'Erken Çıkış Koşulları',
    desc: 'Kiracı erken çıkarsa kalan süre kirası veya yeni kiracı bulana kadar aidat/kira sorumluluğu.',
    importance: 'Sözleşmede yazmazsa mahkeme takdir eder — sonuç belirsiz.',
    mustHave: false,
  },
  {
    title: 'Tahliyeye Muvafakat Şerhi',
    desc: 'Kiracı imzalı tahliye taahhütnamesi. Belirli tarihte mülkü boşaltacağına dair noter beyanı.',
    importance: 'Ev sahibinin en güçlü hukuki silahı. İcraya direkt konulabilir.',
    mustHave: true,
    note: 'Dikkat: Sözleşme imzalanırken değil, sonradan ayrıca alınmalı. Eş zamanlı alınırsa mahkemede geçersiz sayılabilir.',
  },
];

const COLLECTION_STEPS = [
  {
    day: 'Gün 1-3', icon: '💬',
    title: 'WhatsApp Hatırlatma',
    desc: 'Resmi değil, dostane ton. "Ödeme geçti, gözden kaçmış olabilir" şeklinde. Çoğu gecikme burada çözülür.',
    tip: 'Kiracıyı küçük düşürme. Hatırlatma olsun, suçlama değil. Mesajı kayıt altında tut.',
    urgency: 'low',
  },
  {
    day: 'Gün 5', icon: '📧',
    title: 'Yazılı Bildirim (E-posta / SMS)',
    desc: 'Belge izi oluşturun. "X tarihine kadar ödeme yapılmaması halinde hukuki süreç başlatılacaktır" cümlesi mutlaka olmalı.',
    tip: 'E-postayı okundu bildirimi ile gönderin. SMS ise kayıt altında tutar. İkisini birden göndermek en iyisi.',
    urgency: 'medium',
  },
  {
    day: 'Gün 10', icon: '📜',
    title: 'Noter İhtarnamesi',
    desc: 'İcra başlatmanın ve tahliye davasının ön koşulu. Masrafı kiracıya yansıtılabilir. 30 gün süre verin.',
    tip: 'İhtarname 30 gün süre vermelidir (TBK md.315). Süre vermeden gönderilen ihtarname geçersiz sayılabilir.',
    law: 'TBK md.315 — Ödeme ihtarı 30 gün süre zorunlu',
    urgency: 'high',
  },
  {
    day: 'Gün 40+', icon: '⚖️',
    title: 'İcra Takibi Başlat',
    desc: 'İlamsız icra takibi. Kiracı 7 gün içinde itiraz edebilir. İtiraz halinde itirazın iptali davası açılır.',
    tip: 'Avukatsız icra takibi mümkün ama riskli. Kiracı itiraz ederse avukat olmadan devam etmek zor.',
    urgency: 'critical',
  },
  {
    day: 'Paralel', icon: '🏛️',
    title: 'Tahliye Davası',
    desc: '2 kira bedelini ödememesi halinde tahliye davası açılabilir. Sulh hukuk mahkemesinde. Ortalama 6-12 ay.',
    tip: 'İhtarname şartı yerine getirilmemişse dava düşer. Prosedürü hatasız takip edin.',
    law: 'TBK md.352 — 2 kira borcu tahliye sebebi',
    urgency: 'critical',
  },
];

const INCREASE_TIPS = [
  {
    title: '2 Ay Önceden Yazılı Bildirim',
    desc: 'Artışı sözleşme yenileme tarihinden 60 gün önce yazılı bildirin. Kiracı hazırlıklı olur, itiraz azalır.',
    pro: 'İlişkiyi korur. Ani sürpriz kiracıyı kaçırır.',
  },
  {
    title: 'Emsal Fiyatlarla Destekle',
    desc: 'Endeksa/Sahibinden verisini göster. "Piyasa ₺50.000, ben ₺45.000 istiyorum" mantığı kabul oranını artırır.',
    pro: 'Kiracı "haksızlık var" diyemez. Veriye dayalı istek.',
  },
  {
    title: '%25 Tavan — Stratejik Kullan',
    desc: 'Yasal üst sınır 2027\'ye kadar %25. Uzun vadeli iyi kiracıyı korumak için bu oranı pazarlık aracı olarak değerlendir.',
    pro: 'İyi kiracıyı elde tut. Boş mülk en kötü senaryo.',
    law: '%25 tavan 31 Aralık 2027\'ye kadar yürürlükte',
  },
  {
    title: 'Kira Tespit Davası Riskini Bil',
    desc: 'Piyasanın çok üzerinde artış talep ederseniz kiracı kira tespit davası açabilir. Hakim gerçek piyasa değerine göre karar verir.',
    pro: 'Makul talepler dava riskini ortadan kaldırır.',
    law: 'TBK md.344 — Kira belirleme davası',
  },
];

const EVICTION_SCENARIOS = [
  {
    title: 'Kiracı Kendi Çıkmak İsterse',
    steps: [
      'Kiracı sözleşme bitiminden en az 15 gün önce yazılı bildirim yapmak zorunda.',
      'Erken çıkışta yeni kiracı bulunana kadar kira ödemesi devam edebilir — sözleşmede belirtmek şart.',
      'Depozito: anahtarı aldıktan sonra 15 gün içinde, hasarsızsa tam iade et.',
      'Teslim tutanağını fotoğraflı, imzalı alın. İmzasız anahtar kabul etme.',
    ],
    law: 'TBK md.325 — Erken tahliye ve zarar azaltma yükümü',
  },
  {
    title: 'Ev Sahibi Tahliye İsterse',
    steps: [
      'Sadece 3 yasal senaryo: kira borcu, mülke ihtiyaç (kendisi/yakını), yapı yıkım/tadilat.',
      'Sebebsiz tahliye hukuksuz. Kiracı "gitmem" diyebilir ve hukuk onu korur.',
      'Kira borcu için: 2 kira bedeli borçluysa + noter ihtarnamesi + 30 gün süre = dava hakkı.',
      'Mülke ihtiyaç için: kendi oturacağınıza dair beyan + 1 yıl bekleme süresi.',
    ],
    law: 'TBK md.347-356 — Tahliye sebepleri sınırlı sayıda',
  },
  {
    title: 'Depozito Yönetimi',
    steps: [
      'Teslimde fotoğraflı tutanak al, kiracıya imzalat. Bu tutanak hasar tazminatının temelidir.',
      'Çıkışta aynı tutanak format ile karşılaştırmalı kontrol yap.',
      'Hasar yoksa 15 gün içinde tam iade et. Gecikirse kiracı faiz talep edebilir.',
      'Hasar varsa: tutanakla belgele, karşılıklı imzala, masrafı belgeli faturayla kes.',
      'Kiracı imzalamayı reddederse: noter tespit davası aç, masraf kiracıya yıkılır.',
    ],
    law: 'TBK md.342-343 — Depozito iade ve mahsup',
  },
];

export default function LeaseIntelligence() {
  const [tab, setTab] = useState('contract');
  const [openRisk, setOpenRisk] = useState(null);
  const [openTrap, setOpenTrap] = useState(null);

  const RISK_COLORS = {
    critical: { bg: '#FEE2E2', border: '#DC2626', color: '#9F1239', label: 'KRİTİK' },
    warning: { bg: '#FEF3C7', border: '#D97706', color: '#92400E', label: 'DÜZELTİN' },
    info: { bg: '#DBEAFE', border: '#2563EB', color: '#1E3A8A', label: 'İYİLEŞTİRİN' },
  };

  const URGENCY = {
    low: { color: '#6B7280', label: 'Düşük' },
    medium: { color: '#D97706', label: 'Orta' },
    high: { color: '#DC2626', label: 'Yüksek' },
    critical: { color: '#7C3AED', label: 'Kritik' },
  };

  return (
    <div>
      <Topbar title="Kira Sözleşmesi Zekası" />
      <TickerBar />
      <div style={{ padding: 24, paddingBottom: 60 }}>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>
            Kira Sözleşmesi Zekası
          </div>
          <div style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
            TBK md.299-378 · Sizi koruyan maddeler · Kiracı şeytanlıkları · Tahsilat taktikleri
          </div>
        </div>

        {/* Sekmeler */}
        <div style={{ display: 'flex', gap: 3, background: 'var(--surface-2)', padding: 4, borderRadius: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: '.8rem', cursor: 'pointer',
                fontWeight: tab === t.id ? 600 : 400,
                background: tab === t.id ? 'var(--surface)' : 'transparent',
                color: tab === t.id ? 'var(--color-text-primary)' : 'var(--muted)',
                border: 'none', transition: 'all .15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Sözleşme Analizi ── */}
        {tab === 'contract' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ background: 'var(--surface)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '.88rem', fontWeight: 600 }}>Aktif Sözleşme Riski Analizi</span>
                  <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: '.7rem', fontWeight: 700, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>3 Risk</span>
                </div>
                {RISKS.map(risk => {
                  const rc = RISK_COLORS[risk.level];
                  return (
                    <div key={risk.id}
                      onClick={() => setOpenRisk(openRisk === risk.id ? null : risk.id)}
                      style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', cursor: 'pointer' }}>
                      <div style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: rc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                          {risk.level === 'critical' ? '🚨' : risk.level === 'warning' ? '⚠️' : 'ℹ️'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: '.85rem', fontWeight: 500 }}>{risk.title}</span>
                            <span style={{ padding: '1px 7px', borderRadius: 99, fontSize: '.65rem', fontWeight: 700, background: rc.bg, color: rc.color }}>{rc.label}</span>
                          </div>
                          <div style={{ fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>{risk.desc}</div>
                          {openRisk === risk.id && (
                            <div style={{ marginTop: 10, padding: '10px 12px', background: rc.bg, borderRadius: 8 }}>
                              <div style={{ fontSize: '.72rem', fontWeight: 700, color: rc.color, marginBottom: 4 }}>ÇÖZÜM</div>
                              <div style={{ fontSize: '.8rem', color: 'var(--color-text-primary)', lineHeight: 1.6 }}>{risk.fix}</div>
                              <div style={{ fontSize: '.7rem', color: rc.color, marginTop: 6, fontWeight: 600 }}>{risk.law}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: '#163966', borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>AI Sözleşme Özeti</div>
                <div style={{ fontSize: '.85rem', color: '#fff', lineHeight: 1.7, marginBottom: 14 }}>
                  Kalamış Daire sözleşmesinde <strong>3 risk tespit edildi</strong>. En kritik: depozito yasal sınırı aşıyor ve tahliye maddesi hukuki geçersiz. Kira artış endeksi belirsiz — ihtilaf kaynağı olabilir.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Depozito fazlası', action: '1 kira bedeli iade et' },
                    { label: 'Tahliye maddesi', action: 'Kaldır, TBK\'ya bırak' },
                    { label: 'Artış maddesi', action: 'Netleştir: 12 ay TÜFE ort. maks %25' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,.08)', borderRadius: 8 }}>
                      <span style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.7)' }}>{item.label}</span>
                      <span style={{ fontSize: '.78rem', color: '#fff', fontWeight: 500 }}>{item.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Kiracı Şeytanlıkları ── */}
        {tab === 'traps' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {TRAPS.map((trap, i) => {
              const isOpen = openTrap === i;
              const borderColor = trap.severity === 'danger' ? '#DC2626' : '#D97706';
              return (
                <div key={i}
                  onClick={() => setOpenTrap(isOpen ? null : i)}
                  style={{ background: 'var(--surface)', border: '0.5px solid var(--color-border-tertiary)', borderLeft: `3px solid ${borderColor}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all .15s' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{trap.icon}</span>
                    <div style={{ fontSize: '.88rem', fontWeight: 600 }}>{trap.title}</div>
                  </div>
                  <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 6, lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--color-text-secondary)' }}>Senaryo:</strong> {trap.scenario}
                  </div>
                  {isOpen && (
                    <>
                      <div style={{ fontSize: '.8rem', color: '#DC2626', marginBottom: 8, lineHeight: 1.5 }}>
                        <strong>Gerçek Risk:</strong> {trap.reality}
                      </div>
                      <div style={{ padding: '10px 12px', background: '#F0FDF4', border: '1px solid #6EE7B7', borderRadius: 8 }}>
                        <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#064E3B', marginBottom: 4 }}>ÇÖZÜM</div>
                        <div style={{ fontSize: '.8rem', color: '#064E3B', lineHeight: 1.6 }}>{trap.solution}</div>
                        {trap.law && <div style={{ fontSize: '.7rem', color: '#16A34A', marginTop: 6, fontWeight: 600 }}>{trap.law}</div>}
                      </div>
                    </>
                  )}
                  <div style={{ fontSize: '.7rem', color: 'var(--color-text-tertiary)', marginTop: 8 }}>
                    {isOpen ? 'Daralt ▴' : 'Çözüm için tıkla ▾'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Sizi Koruyan Maddeler ── */}
        {tab === 'protect' && (
          <div>
            <div style={{ background: '#163966', borderRadius: 12, padding: '14px 18px', marginBottom: 16, fontSize: '.82rem', color: 'rgba(255,255,255,.85)', lineHeight: 1.7 }}>
              Bu maddeler standart sözleşmelerde yoktur. Ekleyin ve kiracıya imzalatın. Birinin eksikliği ileride büyük sorun yaratabilir.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {PROTECT_CLAUSES.map((clause, i) => (
                <div key={i} style={{ background: 'var(--surface)', border: `0.5px solid ${clause.mustHave ? '#163966' : 'var(--color-border-tertiary)'}`, borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ fontSize: '.88rem', fontWeight: 600 }}>{clause.title}</span>
                    {clause.mustHave && (
                      <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: '.65rem', fontWeight: 700, background: '#DBEAFE', color: '#1E3A8A', border: '1px solid #93C5FD', flexShrink: 0, marginLeft: 8 }}>ZORUNLU</span>
                    )}
                  </div>
                  <div style={{ fontSize: '.8rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: 8 }}>{clause.desc}</div>
                  <div style={{ fontSize: '.75rem', color: '#16A34A', fontWeight: 500 }}>✓ {clause.importance}</div>
                  {clause.note && (
                    <div style={{ marginTop: 8, padding: '8px 10px', background: '#FEF3C7', borderRadius: 6, fontSize: '.72rem', color: '#92400E' }}>
                      ⚠️ {clause.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tahsilat Taktikleri ── */}
        {tab === 'collection' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
              <div>
                {COLLECTION_STEPS.map((step, i) => {
                  const urg = URGENCY[step.urgency];
                  return (
                    <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#163966', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{step.icon}</div>
                        {i < COLLECTION_STEPS.length - 1 && <div style={{ width: 2, height: 40, background: 'var(--color-border-tertiary)', margin: '4px 0' }} />}
                      </div>
                      <div style={{ flex: 1, paddingTop: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div>
                            <span style={{ fontSize: '.72rem', fontWeight: 700, color: urg.color, marginRight: 8 }}>{step.day}</span>
                            <span style={{ fontSize: '.88rem', fontWeight: 600 }}>{step.title}</span>
                          </div>
                          <span style={{ fontSize: '.65rem', padding: '2px 8px', borderRadius: 99, background: 'var(--surface-2)', color: urg.color, fontWeight: 600, border: `1px solid ${urg.color}30` }}>{urg.label}</span>
                        </div>
                        <div style={{ fontSize: '.8rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: 6 }}>{step.desc}</div>
                        <div style={{ padding: '8px 10px', background: '#F0FDF4', borderRadius: 7, fontSize: '.75rem', color: '#166534', lineHeight: 1.5 }}>
                          💡 {step.tip}
                        </div>
                        {step.law && <div style={{ fontSize: '.7rem', color: '#163966', fontWeight: 600, marginTop: 6 }}>{step.law}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <div style={{ background: 'var(--surface)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
                  <div style={{ fontSize: '.85rem', fontWeight: 600, marginBottom: 12 }}>Gecikme Hesaplayıcı</div>
                  {[
                    { label: 'Kira bedeli', value: '₺35.000' },
                    { label: 'Gecikme süresi', value: '23 gün' },
                    { label: 'Yasal gecikme faizi', value: '₺1.820' },
                    { label: 'Olası noter masrafı', value: '₺450' },
                    { label: 'Tahsil edilecek toplam', value: '₺37.270' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: '.82rem' }}>
                      <span style={{ color: 'var(--muted)' }}>{item.label}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#92400E', marginBottom: 8 }}>PRATİK UYARI</div>
                  <div style={{ fontSize: '.8rem', color: '#78350F', lineHeight: 1.7 }}>
                    Kiracıyı mahkemeye vermeniz en son çaredir. Mahkeme süreci 6-18 ay sürer, mahkeme masrafları olur. İyi kiracıyı küçük gecikmeler için kaybetmek en kötü senaryo.
                    <br /><br />
                    İyi kiracı + geç ödeme {'>'} Kötü kiracı + zamanında ödeme
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Kira Artışı ── */}
        {tab === 'increase' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {INCREASE_TIPS.map((tip, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#163966', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.82rem', fontWeight: 700, marginBottom: 10 }}>{i + 1}</div>
                <div style={{ fontSize: '.88rem', fontWeight: 600, marginBottom: 6 }}>{tip.title}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: 10 }}>{tip.desc}</div>
                <div style={{ padding: '8px 12px', background: '#F0FDF4', borderRadius: 8, fontSize: '.75rem', color: '#166534' }}>✓ {tip.pro}</div>
                {tip.law && <div style={{ fontSize: '.7rem', color: '#163966', fontWeight: 600, marginTop: 8 }}>{tip.law}</div>}
              </div>
            ))}

            <div style={{ gridColumn: '1 / -1', background: '#163966', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Artış Hesaplayıcı</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { label: 'Mevcut Kira', value: '₺35.000' },
                  { label: '12 Ay Ort. TÜFE', value: '%52.4' },
                  { label: '%25 Tavan Artış', value: '₺43.750' },
                  { label: 'TÜFE Artış (sınırsız)', value: '₺53.340' },
                ].map(item => (
                  <div key={item.label} style={{ background: 'rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.55)', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tahliye & Çıkış ── */}
        {tab === 'eviction' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {EVICTION_SCENARIOS.map((scenario, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: '.9rem', fontWeight: 600 }}>
                  {scenario.title}
                </div>
                <div style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {scenario.steps.map((step, j) => (
                      <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#163966', color: '#fff', fontSize: '.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{j + 1}</div>
                        <div style={{ fontSize: '.82rem', color: 'var(--color-text-primary)', lineHeight: 1.6 }}>{step}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '8px 12px', background: '#EFF6FF', borderRadius: 8, fontSize: '.72rem', color: '#1E3A8A', fontWeight: 600 }}>
                    {scenario.law}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
