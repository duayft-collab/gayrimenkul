/**
 * @file pages/LocationWatch.jsx
 * @description Lokasyon İzleme Sistemi — mülk bazlı her değişiklik rapor + yorum
 * @company Duay Global Trade | @version 1.0.0
 */

import { useState } from 'react';
import { Topbar, TickerBar } from '../components/Layout';

const PROPERTIES = [
  {
    id: 1,
    name: 'Kalamış Deniz Manzaralı Daire',
    location: 'Kadıköy, İstanbul',
    parcel: 'Ada: 1234 / Parsel: 56',
    status: 'ok',
    eventCount: 3,
    urgentCount: 0,
    lastUpdate: '4 dk önce',
    events: [
      {
        id: 1, type: 'value_up', severity: 'success',
        title: 'Çevrede Yeni Metro İstasyonu — Fizibilite Onayı',
        desc: 'Kadıköy-Kartal metro hattı genişletme fizibilite raporu onaylandı. Taşınmaza 800m mesafede istasyon planlanıyor. Tarihsel veri: metro yakınlığı %15-30 değer artışı sağlıyor.',
        comment: 'Mülk değeriniz önümüzdeki 24 ayda %12-18 ek artış potansiyeli kazandı. Metro kararı netleştiğinde satış veya yeniden değerleme yapılmasını öneririz.',
        source: 'İBB Meclisi', time: '3 saat önce', badge: 'DEĞER ARTIŞI', badgeColor: 'success',
      },
      {
        id: 2, type: 'price_move', severity: 'warning',
        title: 'Mahalle Satış Fiyatı: Aylık +%8 Artış',
        desc: 'Kalamış\'ta benzer dairelerde aylık %8 fiyat artışı tespit edildi. Mülkünüzün güncel değeri piyasanın %6 altında kalıyor.',
        comment: 'Portföy değerlemenizi güncelleyin. Mevcut sigorta bedeli ve banka değerlemesi de revize edilmeli. Kira artış talebiniz için emsal oluşturdu.',
        source: 'Endeksa', time: '2 gün önce', badge: 'İZLE', badgeColor: 'warning',
      },
      {
        id: 3, type: 'municipal', severity: 'info',
        title: 'Belediye Meclis Kararı: Park Alanı Genişletme',
        desc: 'Mülkünüze komşu 3 parselde yeşil alan düzenlemesi kararı alındı.',
        comment: 'Doğrudan etki yok. Bölge yaşam kalitesi ve prestiji artacak — uzun vadede pozitif. Kira ilanınıza "yeşil alan yakınında" ekleyebilirsiniz.',
        source: 'Kadıköy Belediyesi', time: '1 hafta önce', badge: 'BİLGİ', badgeColor: 'info',
      },
    ],
  },
  {
    id: 2,
    name: 'Bodrum Yalıkavak Arsa',
    location: 'Bodrum, Muğla',
    parcel: 'Ada: 456 / Parsel: 78',
    status: 'urgent',
    eventCount: 2,
    urgentCount: 1,
    lastUpdate: '18 dk önce',
    events: [
      {
        id: 1, type: 'legal_risk', severity: 'danger',
        title: 'Yalıkavak — Özel Çevre Koruma Bölgesi Genişletme Teklifi',
        desc: 'Bodrum Özel Çevre Koruma Bölgesi sınırları genişletme teklifi komisyonda. Parselin içinde kalması halinde inşaat izni iptal edilebilir.',
        comment: 'ACİL EYLEM GEREKLİ. 30 gün içinde karar çıkacak. Hukuki danışman ile komisyon gündemini takip edin. Parselin yeni sınırlar içinde kalıp kalmadığı kadastro uzmanı ile belirlenmeli. Satış stratejisi karar öncesi değerlendirilebilir.',
        source: 'Bakanlık Mekânsal Planlama', time: '18 dk önce', badge: 'ACİL — EYLEM GEREKLİ', badgeColor: 'danger',
      },
      {
        id: 2, type: 'demand', severity: 'success',
        title: 'Yabancı Alımı: Turgutreis\'de %41 Artış',
        desc: 'TÜİK Q1 2026 verisi. Alman ve İngiliz vatandaşları öne çıkıyor. Yalıkavak bu trendin merkezinde. Fiyat primlenmesi henüz gerçekleşmedi.',
        comment: 'Çevre koruma kararına bağlı olarak erken satış fırsatı değerlendirilebilir. Yabancı alıcılara yönelik İngilizce ilan hazırlayın. Fiyatınızı bölge emsallerinden %5-8 üstünde başlatın.',
        source: 'TÜİK', time: '1 saat önce', badge: 'FIRSAT', badgeColor: 'success',
      },
    ],
  },
  {
    id: 3,
    name: 'Etiler Ofis',
    location: 'Beşiktaş, İstanbul',
    parcel: 'Ada: 789 / Parsel: 12',
    status: 'ok',
    eventCount: 1,
    urgentCount: 0,
    lastUpdate: '1 gün önce',
    events: [
      {
        id: 1, type: 'info', severity: 'info',
        title: 'Beşiktaş Ofis Piyasası — Doluluk %94\'e Ulaştı',
        desc: 'Beşiktaş-Levent ofis koridorunda doluluk oranı 3 yılın zirvesinde. Kira talepleri yıllık %32 arttı.',
        comment: 'Mevcut kiracınızın sözleşme bitiş tarihi yaklaşıyorsa yenileme görüşmesini başlatın. Piyasa kira değeriniz mevcut kiranın üzerinde — artış talep etme zamanı.',
        source: 'GYODER Ofis Raporu', time: '1 gün önce', badge: 'BİLGİ', badgeColor: 'info',
      },
    ],
  },
];

const SEV_COLORS = {
  danger:  { border: '#DC2626', bg: '#FFF1F2', dot: '#DC2626' },
  warning: { border: '#D97706', bg: '#FFFBEB', dot: '#D97706' },
  success: { border: '#16A34A', bg: '#F0FDF4', dot: '#16A34A' },
  info:    { border: '#2563EB', bg: '#EFF6FF', dot: '#2563EB' },
};

const BADGE_S = {
  danger:  { bg: '#FEE2E2', color: '#9F1239', border: '#FECACA' },
  warning: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  success: { bg: '#D1FAE5', color: '#064E3B', border: '#6EE7B7' },
  info:    { bg: '#DBEAFE', color: '#1E3A8A', border: '#93C5FD' },
};

const STATUS_DOT = { ok: '#16A34A', urgent: '#DC2626', warn: '#D97706' };

export default function LocationWatch() {
  const [selected, setSelected] = useState(null);
  const [expandedEvent, setExpandedEvent] = useState(null);

  const urgent = PROPERTIES.filter(p => p.urgentCount > 0).length;

  return (
    <div>
      <Topbar title="Lokasyon İzleme" />
      <TickerBar />
      <div style={{ padding: 24, paddingBottom: 60 }}>

        {/* Başlık */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>
              Lokasyon İzleme Sistemi
            </div>
            <div style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
              Mülkünüzün bulunduğu yerde her değişiklik — anlık rapor ve yorum
            </div>
          </div>
          {urgent > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10 }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span style={{ fontSize: '.82rem', fontWeight: 600, color: '#9F1239' }}>{urgent} mülkte acil durum</span>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>

          {/* Sol: Mülk Listesi */}
          <div>
            <div style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
              İzlenen Mülkler ({PROPERTIES.length})
            </div>
            {PROPERTIES.map(prop => (
              <div key={prop.id}
                onClick={() => setSelected(prop.id === selected ? null : prop.id)}
                style={{
                  background: 'var(--surface)', border: `1px solid ${selected === prop.id ? '#163966' : 'var(--color-border-tertiary)'}`,
                  borderRadius: 12, padding: '14px 16px', marginBottom: 8, cursor: 'pointer',
                  transition: 'all .15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_DOT[prop.status], marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '.88rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>{prop.name}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: 6 }}>{prop.location}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>{prop.parcel}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {prop.urgentCount > 0 && (
                        <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: '.65rem', fontWeight: 700, background: '#FEE2E2', color: '#9F1239', border: '1px solid #FECACA' }}>
                          {prop.urgentCount} Acil
                        </span>
                      )}
                      <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: '.65rem', fontWeight: 600, background: '#F3F4F6', color: '#6B7280' }}>
                        {prop.eventCount} Olay
                      </span>
                      <span style={{ fontSize: '.68rem', color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>{prop.lastUpdate}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Takip ekle */}
            <button style={{
              width: '100%', padding: '12px 16px', border: '1px dashed var(--color-border-secondary)',
              borderRadius: 12, background: 'transparent', color: 'var(--muted)',
              fontSize: '.82rem', cursor: 'pointer', marginTop: 4,
            }}>
              + Yeni Mülk Takibe Al
            </button>
          </div>

          {/* Sağ: Olay Detayları */}
          <div>
            {PROPERTIES.filter(p => !selected || p.id === selected).map(prop => (
              <div key={prop.id} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>{prop.name}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: 14 }}>{prop.location} · {prop.parcel}</div>

                {prop.events.map(ev => {
                  const sc = SEV_COLORS[ev.severity];
                  const bc = BADGE_S[ev.badgeColor] || BADGE_S.info;
                  const isOpen = expandedEvent === `${prop.id}-${ev.id}`;
                  return (
                    <div key={ev.id}
                      style={{
                        background: 'var(--color-background-primary)',
                        border: '0.5px solid var(--color-border-tertiary)',
                        borderLeft: `3px solid ${sc.border}`,
                        borderRadius: 10, marginBottom: 10, overflow: 'hidden',
                      }}>
                      <div style={{ padding: '12px 16px', cursor: 'pointer' }}
                        onClick={() => setExpandedEvent(isOpen ? null : `${prop.id}-${ev.id}`)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ fontSize: '.88rem', fontWeight: 500, color: 'var(--color-text-primary)', flex: 1 }}>{ev.title}</div>
                          <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: '.65rem', fontWeight: 700, background: bc.bg, color: bc.color, border: `1px solid ${bc.border}`, flexShrink: 0 }}>
                            {ev.badge}
                          </span>
                        </div>
                        <div style={{ fontSize: '.8rem', color: 'var(--muted)', lineHeight: 1.6, margin: '6px 0' }}>{ev.desc}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--color-text-tertiary)' }}>{ev.source} · {ev.time}</div>
                      </div>

                      {/* Yorum satırı — her zaman görünür ama tıklanınca genişler */}
                      <div style={{ background: sc.bg, borderTop: `1px solid ${sc.border}20`, padding: isOpen ? '14px 16px' : '10px 16px', transition: 'padding .2s' }}>
                        <div style={{ fontSize: '.72rem', fontWeight: 600, color: sc.border, marginBottom: isOpen ? 6 : 0, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                          AI Yorumu {!isOpen && '— tıkla detaylar için ▾'}
                        </div>
                        {isOpen && (
                          <div style={{ fontSize: '.82rem', color: 'var(--color-text-primary)', lineHeight: 1.7 }}>{ev.comment}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
