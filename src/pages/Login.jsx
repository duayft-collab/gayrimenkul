import { useState } from 'react';
import { useAuthStore } from '../store/auth';

export default function Login() {
  const { login, error, loading, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    clearError();
    login(email, pass);
  };

  return (
    <div style={{
      minHeight:'100vh', background:'#0A0F1E', display:'flex',
      alignItems:'center', justifyContent:'center', padding:20,
      backgroundImage:'radial-gradient(ellipse 80% 50% at 20% -10%,rgba(27,79,138,.2) 0%,transparent 60%)',
      fontFamily:'DM Sans,system-ui,sans-serif', color:'#E8ECF4',
    }}>
      <div style={{width:'100%',maxWidth:400}}>
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:36}}>
          <div style={{fontSize:'2.5rem',marginBottom:10}}>🏠</div>
          <div style={{fontFamily:'Playfair Display,Georgia,serif',fontSize:'1.7rem',fontWeight:700,color:'#C9A84C'}}>
            AI Property OS
          </div>
          <div style={{fontSize:'.7rem',color:'#4A5A72',marginTop:4,textTransform:'uppercase',letterSpacing:'.1em'}}>
            Duay Global Trade
          </div>
        </div>

        {/* Form */}
        <div style={{background:'#141E35',border:'1px solid rgba(255,255,255,.08)',borderRadius:20,padding:'28px 24px'}}>
          <form onSubmit={submit}>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:'.72rem',color:'#7A8BA8',marginBottom:5,fontWeight:500}}>E-posta</div>
              <input
                type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="ornek@email.com" required
                style={{width:'100%',background:'#1A2540',border:'1px solid rgba(255,255,255,.08)',
                  borderRadius:10,padding:'11px 14px',color:'#E8ECF4',fontSize:'.875rem',outline:'none'}}
              />
            </div>
            <div style={{marginBottom:22}}>
              <div style={{fontSize:'.72rem',color:'#7A8BA8',marginBottom:5,fontWeight:500}}>Şifre</div>
              <div style={{position:'relative'}}>
                <input
                  type={show?'text':'password'} value={pass} onChange={e=>setPass(e.target.value)}
                  placeholder="••••••••" required
                  style={{width:'100%',background:'#1A2540',border:'1px solid rgba(255,255,255,.08)',
                    borderRadius:10,padding:'11px 40px 11px 14px',color:'#E8ECF4',fontSize:'.875rem',outline:'none'}}
                />
                <button type="button" onClick={()=>setShow(!show)}
                  style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',
                    background:'none',border:'none',cursor:'pointer',color:'#7A8BA8',fontSize:'1rem'}}>
                  {show?'🙈':'👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',
                borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:'.8rem',color:'#EF4444'}}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width:'100%',padding:12,borderRadius:10,border:'none',
              background:'linear-gradient(135deg,#1B4F8A,#2E6DB4)',color:'white',
              fontWeight:700,fontSize:'.9rem',cursor:loading?'not-allowed':'pointer',
              opacity:loading?.7:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,
            }}>
              {loading
                ? <span style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .6s linear infinite',display:'inline-block'}}/>
                : '→ Giriş Yap'}
            </button>
          </form>
        </div>

        {/* Build stamp */}
        <div style={{textAlign:'center',marginTop:20,fontSize:'.65rem',color:'#2A3A52'}}>
          <span style={{color:'#C9A84C',fontFamily:'monospace'}}>{typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev'}</span>
          {' · '}
          {typeof __BUILD_TIME__ !== 'undefined' ? new Date(__BUILD_TIME__).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'}) : ''}
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}
