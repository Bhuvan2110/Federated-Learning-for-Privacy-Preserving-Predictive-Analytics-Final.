import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, ChevronRight, AlertCircle } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

const Login = () => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);

  const saveAndNavigate = (data) => {
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('role', data.role);
    if (data.email) localStorage.setItem('userEmail', data.email);
    navigate('/dashboard');
  };

  useEffect(() => {
    const initGoogle = () => {
      if (!window.google || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') return;
      try {
        window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential, ux_mode: 'popup' });
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, { theme: 'outline', size: 'large', width: 340 });
        }
      } catch(e) { console.warn('GSI init failed', e); }
    };
    if (window.google) initGoogle();
    else { const t = setInterval(()=>{ if(window.google){initGoogle();clearInterval(t);} },300); return ()=>clearInterval(t); }
  }, [mode]);

  const handleGoogleCredential = async (response) => {
    setGoogleLoading(true); setError('');
    try {
      const parts = response.credential.split('.');
      const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/,'/')));
      const { email, sub: google_id, name } = payload;
      const res = await apiFetch('/api/auth/google-login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,google_id,name}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Google login failed');
      saveAndNavigate(data);
    } catch(err) { setError(err.message); }
    finally { setGoogleLoading(false); }
  };

  const reset = (m) => { setMode(m); setError(''); setSuccess(''); setEmail(''); setPassword(''); setConfirmPassword(''); };

  const withTimeout = (p, ms=15000) => Promise.race([p, new Promise((_,r)=>setTimeout(()=>r(new Error('Server timeout. Please try again.')),ms))]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (mode === 'register') {
        if (password !== confirmPassword) throw new Error('Passwords do not match');
        if (password.length < 8) throw new Error('Password must be at least 8 characters');
      }
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await withTimeout(apiFetch(endpoint, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, password }),
      }));
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Authentication failed');
      saveAndNavigate(data);
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const googleConfigured = GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
  const isLogin = mode === 'login';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--s4)',
    }}>
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hide-mobile" style={{
        width: '360px',
        padding: '48px 40px',
        marginRight: '40px',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'32px' }}>
          <div style={{ width:'40px', height:'40px', borderRadius:'var(--r-md)', background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Shield size={20} color="white" />
          </div>
          <span style={{ font:'var(--text-headline-lg)', color:'var(--primary)' }}>FedLearn OS</span>
        </div>
        <h1 style={{ font:'600 28px/36px var(--font-sans)', color:'var(--text-primary)', letterSpacing:'-0.02em', marginBottom:'16px' }}>
          Privacy-preserving<br/>machine learning
        </h1>
        <p style={{ font:'var(--text-body-md)', color:'var(--text-secondary)', lineHeight:'1.6', marginBottom:'32px' }}>
          Train federated models across distributed clients without centralising sensitive data. 
          Full differential privacy, end-to-end encryption, and role-based access control.
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {[
            { color:'#E6F1FB', text:'#0C447C', label:'FedAvg · FedProx · SCAFFOLD' },
            { color:'#EEEDFE', text:'#3C3489', label:'AES-256-GCM · RSA-2048 · SecAgg' },
            { color:'#E1F5EE', text:'#085041', label:'Differential Privacy (DP-SGD)' },
          ].map(p => (
            <div key={p.label} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'2px', background:p.color, border:`1px solid ${p.text}40`, flexShrink:0 }}></div>
              <span style={{ font:'var(--text-label-sm)', color:'var(--text-secondary)' }}>{p.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — auth form */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border-subtle)',
        borderRadius: 'var(--r-lg)',
        padding: '32px',
        boxShadow: 'var(--shadow-lifted)',
      }} className="animate-fade-in">

        {/* Mode tabs */}
        <div style={{
          display:'flex', background:'var(--surface-high)', borderRadius:'var(--r)',
          padding:'3px', marginBottom:'28px', gap:'3px',
        }}>
          {['login','register'].map(m => (
            <button key={m} onClick={()=>reset(m)} style={{
              flex:1, padding:'7px', borderRadius:'var(--r-sm)', border:'none', cursor:'pointer',
              font:'var(--text-label-sm)', transition:'all 0.15s',
              background: mode===m ? 'var(--bg-card)' : 'transparent',
              color: mode===m ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: mode===m ? 'var(--shadow-lifted)' : 'none',
              fontWeight: mode===m ? 600 : 400,
            }}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <div style={{ marginBottom:'24px' }}>
          <h2 style={{ font:'var(--text-headline-lg)', color:'var(--text-primary)', marginBottom:'4px' }}>
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ font:'var(--text-body-md)', color:'var(--text-secondary)' }}>
            {isLogin ? 'Sign in to the FL Platform' : 'Join the FL Platform'}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={14} style={{flexShrink:0,marginTop:'1px'}}/>
            <span>{error}</span>
            <button className="alert-dismiss" onClick={()=>setError('')}>✕</button>
          </div>
        )}
        {success && (
          <div className="alert alert-success">{success}</div>
        )}

        {/* Google button */}
        {googleConfigured ? (
          <div style={{ marginBottom:'20px' }}>
            <div ref={googleBtnRef} style={{ display:'flex', justifyContent:'center' }}/>
            {googleLoading && <p style={{textAlign:'center',font:'var(--text-label-sm)',color:'var(--text-muted)',marginTop:'8px'}}>Authenticating…</p>}
          </div>
        ) : (
          <button
            type="button"
            onClick={async () => {
              setGoogleLoading(true); setError('');
              try {
                const res = await apiFetch('/api/auth/google-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'sbhuvan847@gmail.com',google_id:'mock_google_id_123',name:'Super Admin'})});
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail||'Google login failed');
                saveAndNavigate(data);
              } catch(err){ setError(err.message); }
              finally{ setGoogleLoading(false); }
            }}
            className="btn btn-secondary"
            style={{ width:'100%', marginBottom:'var(--s4)', justifyContent:'center', padding:'9px' }}
          >
            <svg width="16" height="16" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.2H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.8 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.8z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.8 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.7 39.6 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.2H42V20H24v8h11.3c-.8 2.2-2.3 4-4.2 5.2l6.2 5.2C41.1 35.3 44 30 44 24c0-1.3-.1-2.6-.4-3.8z"/>
            </svg>
            Continue with Google (Demo)
          </button>
        )}

        {/* Divider */}
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'var(--s4)' }}>
          <div style={{ flex:1, height:'0.5px', background:'var(--border-subtle)' }}/>
          <span style={{ font:'var(--text-micro)', color:'var(--text-muted)', letterSpacing:'0.08em', textTransform:'uppercase' }}>or email</span>
          <div style={{ flex:1, height:'0.5px', background:'var(--border-subtle)' }}/>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="email">Email address</label>
          <div style={{ position:'relative', marginBottom:'var(--s4)' }}>
            <Mail size={14} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
            <input
              id="email" type="email" placeholder="you@example.com"
              style={{ paddingLeft:'32px', marginBottom:0 }}
              className="input-field"
              value={email} onChange={e=>{setEmail(e.target.value);setError('');}}
              required autoComplete="email"
            />
          </div>

          <label className="field-label" htmlFor="password">Password</label>
          <div style={{ position:'relative', marginBottom: isLogin ? 'var(--s4)' : 'var(--s4)' }}>
            <Lock size={14} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
            <input
              id="password" type="password" placeholder="••••••••"
              style={{ paddingLeft:'32px', marginBottom:0 }}
              className="input-field"
              value={password} onChange={e=>{setPassword(e.target.value);setError('');}}
              required autoComplete={isLogin?'current-password':'new-password'}
            />
          </div>

          {!isLogin && (
            <>
              <label className="field-label">Confirm password</label>
              <div style={{ position:'relative', marginBottom:'var(--s4)' }}>
                <Lock size={14} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
                <input
                  type="password" placeholder="••••••••"
                  style={{ paddingLeft:'32px', marginBottom:0 }}
                  className="input-field"
                  value={confirmPassword} onChange={e=>{setConfirmPassword(e.target.value);setError('');}}
                  required autoComplete="new-password"
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary" style={{ width:'100%', padding:'9px', justifyContent:'center', gap:'6px' }} disabled={loading}>
            {loading ? (isLogin?'Signing in…':'Creating account…') : (isLogin?'Sign in':'Create account')}
            {!loading && <ChevronRight size={14}/>}
          </button>
        </form>

        <div style={{ marginTop:'var(--s4)', textAlign:'center', display:'flex', flexDirection:'column', gap:'8px' }}>
          <span style={{ font:'var(--text-label-sm)', color:'var(--text-secondary)' }}>
            {isLogin?"Don't have an account? ":"Already have an account? "}
            <button onClick={()=>reset(isLogin?'register':'login')} style={{ background:'none', border:'none', color:'var(--primary)', cursor:'pointer', font:'var(--text-label-sm)', fontWeight:600, padding:0 }}>
              {isLogin?'Register':'Sign in'}
            </button>
          </span>
          {isLogin && (
            <button onClick={()=>{setEmail('sbhuvan847@gmail.com');setPassword('SuperAdmin123!');setError('');}} style={{ background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',font:'var(--text-data)',textDecoration:'underline' }}>
              Auto-fill Super Admin
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
