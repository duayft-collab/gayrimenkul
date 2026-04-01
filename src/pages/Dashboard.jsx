import { useStore } from '../store/app';
import { Topbar, TickerBar } from '../components/Layout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const FMT = (n) => new Intl.NumberFormat('tr-TR').format(Math.round(n));

const CHART_DATA = [
  {ay:'Oca',deger:850},{ay:'Şub',deger:890},{ay:'Mar',deger:940},
  {ay:'Nis',deger:980},{ay:'May',deger:1050},{ay:'Haz',deger:1120},
  {ay:'Tem',deger:1200},{ay:'Ağu',deger:1280},{ay:'Eyl',deger:1360},
  {ay:'Eki',deger:1440},{ay:'Kas',deger:1530},{ay:'Ara',deger:1620},
  {ay:'Şu26',deger:1680},{ay:'Mar26',deger:1750},
];

const PIE_DATA = [
  {name:'Daire',value:13400000,color:'#1B4F8A'},
  {name:'Ofis',value:9200000,color:'#C9A84C'},
  {name:'Arsa',value:4100000,color:'#22C55E'},
  {name:'Diğer',value:2800000,color:'#3B82F6'},
];

export default function Dashboard() {
  const { properties, rentals, alerts } = useStore();

  const totalVal   = properties.reduce((s,p)=>s+(p.currentPrice||0),0) || 16700000;
  const totalBuy   = properties.reduce((s,p)=>s+(p.buyPrice||0),0)     || 11600000;
  const monthlyRent= rentals.reduce((s,r)=>s+(r.monthlyRent||0),0)     || 83000;
  const unread     = alerts.filter(a=>!a.isRead).length || 3;
  const roi        = totalBuy > 0 ? ((totalVal-totalBuy)/totalBuy*100) : 44.2;

  return (
    <div>
      <Topbar title="Dashboard" />
      <TickerBar />
      <div className="page" style={{paddingBottom:40}}>

        {/* Quote */}
        <div style={{background:'linear-gradient(90deg,rgba(27,79,138,.15),rgba(201,168,76,.08))',
          border:'1px solid rgba(201,168,76,.25)',borderRadius:10,padding:'12px 16px',
          marginBottom:20,display:'flex',gap:10,alignItems:'center'}}>
          <span>💡</span>
          <div>
            <div style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:'.88rem',color:'#E8C96A'}}>
              "Araziyi satın al — artık üretmiyorlar."
            </div>
            <div style={{fontSize:'.7rem',color:'var(--muted)',marginTop:2}}>— Will Rogers, Yatırımcı</div>
          </div>
        </div>

        {/* KPI */}
        <div className="g4" style={{marginBottom:20}}>
          {[
            {lbl:'Toplam Portföy',val:`₺${FMT(totalVal/100)} TL`,sub:`${properties.length||4} mülk`,color:'var(--blue)',ico:'🏠'},
            {lbl:'Toplam Getiri',val:`%${roi.toFixed(1)}`,sub:`₺${FMT((totalVal-totalBuy)/100)} TL kar`,color:'var(--green)',ico:'📈'},
            {lbl:'Aylık Kira',val:`₺${FMT(monthlyRent)} TL`,sub:`${rentals.filter(r=>r.status==='active').length||2} aktif kiracı`,color:'var(--gold)',ico:'🔑'},
            {lbl:'Alarmlar',val:unread.toString(),sub:'Acil işlem gerekiyor',color:'var(--red)',ico:'🔔'},
          ].map((k,i)=>(
            <div key={i} className="kpi" style={{'--kc':k.color}}>
              <div className="kpi-lbl">{k.lbl}</div>
              <div className="kpi-val" style={{color:k.color}}>{k.val}</div>
              <div className="kpi-sub" style={{color:k.color}}>{k.sub}</div>
              <div className="kpi-ico">{k.ico}</div>
            </div>
          ))}
        </div>

        {/* Grafikler */}
        <div className="g2" style={{marginBottom:20}}>
          <div className="card">
            <div style={{fontFamily:'var(--serif)',fontSize:'.95rem',fontWeight:600,marginBottom:4}}>Portföy Değer Seyri</div>
            <div style={{fontSize:'.72rem',color:'var(--muted)',marginBottom:14}}>Son 14 ay (Milyon TL)</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={CHART_DATA} margin={{top:4,right:4,bottom:0,left:-20}}>
                <defs>
                  <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1B4F8A" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#1B4F8A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                <XAxis dataKey="ay" tick={{fill:'#4A5A72',fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#4A5A72',fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:'#1A2540',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,fontSize:11}}
                  formatter={v=>[v+'M TL','Değer']}/>
                <Area type="monotone" dataKey="deger" stroke="#1B4F8A" strokeWidth={2} fill="url(#ag)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div style={{fontFamily:'var(--serif)',fontSize:'.95rem',fontWeight:600,marginBottom:14}}>Portföy Dağılımı</div>
            <div style={{display:'flex',alignItems:'center',gap:16}}>
              <PieChart width={130} height={130}>
                <Pie data={PIE_DATA} cx={60} cy={60} innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="value">
                  {PIE_DATA.map((d,i)=><Cell key={i} fill={d.color}/>)}
                </Pie>
              </PieChart>
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:7}}>
                {PIE_DATA.map((d,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:7,fontSize:'.76rem'}}>
                    <div style={{width:8,height:8,borderRadius:2,background:d.color,flexShrink:0}}/>
                    <span style={{flex:1,color:'var(--muted)'}}>{d.name}</span>
                    <span style={{fontFamily:'var(--mono)',fontSize:'.72rem'}}>₺{FMT(d.value/10000)}M</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Alarmlar */}
        <div className="card">
          <div style={{fontFamily:'var(--serif)',fontSize:'.95rem',fontWeight:600,marginBottom:14}}>Aktif Alarmlar</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[
              {title:'DASK Yenileme',desc:'Kadıköy Ofis — Poliçe 45 gün içinde sona eriyor',days:12,sev:'danger'},
              {title:'Kira Artış Zamanı',desc:'Kalamış Daire — TÜFE artışı uygulanabilir',days:16,sev:'warning'},
              {title:'Emlak Vergisi 1. Taksit',desc:'Tüm mülkler — Mayıs 2026',days:62,sev:'info'},
            ].map((a,i)=>(
              <div key={i} style={{padding:'10px 14px',borderRadius:10,background:'var(--surface2)',
                borderLeft:`3px solid var(--${a.sev==='danger'?'red':a.sev==='warning'?'amber':'info'})`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontWeight:600,fontSize:'.85rem'}}>{a.title}</span>
                  <span className={`badge b-${a.sev==='danger'?'red':a.sev==='warning'?'amber':'blue'}`}>
                    {a.days} gün
                  </span>
                </div>
                <div style={{fontSize:'.76rem',color:'var(--muted)',marginTop:3}}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
