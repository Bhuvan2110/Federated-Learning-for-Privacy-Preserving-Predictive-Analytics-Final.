import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Replace with your actual Google OAuth Client ID
// You can get one from https://console.cloud.google.com/
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
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

  // Initialize Google Sign-In
  useEffect(() => {
    const initGoogle = () => {
      if (!window.google || !GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') return;
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
          ux_mode: 'popup',
          auto_select: false,
        });
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            width: 340,
            logo_alignment: 'left',
            text: 'continue_with',
          });
        }
      } catch (e) {
        console.warn('Google Sign-In init failed:', e);
      }
    };

    // Wait for the GSI script to load
    if (window.google) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google) { initGoogle(); clearInterval(interval); }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [mode]);

  const handleGoogleCredential = async (response) => {
    setGoogleLoading(true);
    setError('');
    try {
      // Decode the JWT credential to get user info (safe for frontend use)
      const parts = response.credential.split('.');
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const { email, sub: google_id, name } = payload;

      const res = await fetch(`${API_BASE}/api/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, google_id, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Google login failed');
      saveAndNavigate(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const reset = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      saveAndNavigate(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed');
      saveAndNavigate(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const seedAdmin = () => {
    setEmail('sbhuvan847@gmail.com');
    setPassword('SuperAdmin123!');
    setError('');
  };

  const isLogin = mode === 'login';
  const googleConfigured = GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 70%)',
    }}>
      <div className="glass animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '40px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Mode toggle tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '32px',
          gap: '4px',
        }}>
          <button
            onClick={() => reset('login')}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '14px', transition: 'all 0.25s ease',
              background: isLogin ? 'var(--accent-primary)' : 'transparent',
              color: isLogin ? 'white' : 'var(--text-secondary)',
              boxShadow: isLogin ? '0 2px 8px rgba(59,130,246,0.4)' : 'none',
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => reset('register')}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '14px', transition: 'all 0.25s ease',
              background: !isLogin ? 'var(--accent-primary)' : 'transparent',
              color: !isLogin ? 'white' : 'var(--text-secondary)',
              boxShadow: !isLogin ? '0 2px 8px rgba(59,130,246,0.4)' : 'none',
            }}
          >
            Register
          </button>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 className="text-gradient" style={{ fontSize: '26px', marginBottom: '6px' }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {isLogin ? 'Sign in to the Federated Learning Platform' : 'Join the Federated Learning Platform'}
          </p>
        </div>

        {/* Error / success banners */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: '8px', padding: '10px 14px', marginBottom: '16px',
            color: '#f87171', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span>⚠</span> {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>✕</button>
          </div>
        )}
        {success && (
          <div style={{
            background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
            borderRadius: '8px', padding: '10px 14px', marginBottom: '16px',
            color: '#34d399', fontSize: '13px',
          }}>
            ✔ {success}
          </div>
        )}

        {/* Google Sign-In Button */}
        {googleConfigured ? (
          <div style={{ marginBottom: '20px' }}>
            <div
              ref={googleBtnRef}
              style={{ display: 'flex', justifyContent: 'center' }}
            />
            {googleLoading && (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>
                Authenticating with Google...
              </p>
            )}
          </div>
        ) : (
          // Mock Google login for development/testing when Client ID is not configured
          <button
            type="button"
            onClick={async () => {
              setGoogleLoading(true);
              setError('');
              try {
                const mockRes = await fetch(`${API_BASE}/api/auth/google-login`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: 'sbhuvan847@gmail.com', // Log in as admin or default user
                    google_id: 'mock_google_id_123',
                    name: 'Super Admin (Google)'
                  }),
                });
                const mockData = await mockRes.json();
                if (!mockRes.ok) throw new Error(mockData.detail || 'Google login failed');
                saveAndNavigate(mockData);
              } catch (err) {
                setError(err.message);
              } finally {
                setGoogleLoading(false);
              }
            }}
            style={{
              width: '100%', padding: '11px', borderRadius: '8px', marginBottom: '20px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            {/* Google "G" logo SVG */}
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.2H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.8 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.8z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.8 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.7 39.6 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.2H42V20H24v8h11.3c-.8 2.2-2.3 4-4.2 5.2l6.2 5.2C41.1 35.3 44 30 44 24c0-1.3-.1-2.6-.4-3.8z"/>
            </svg>
            Continue with Google (Demo)
          </button>
        )}

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>or continue with email</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={isLogin ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column' }}>
          <input
            type="email"
            placeholder="Email Address"
            className="input-field"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            className="input-field"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            required
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
          {!isLogin && (
            <input
              type="password"
              placeholder="Confirm Password"
              className="input-field"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
              required
              autoComplete="new-password"
            />
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px', padding: '12px', fontSize: '15px', letterSpacing: '0.02em' }}
            disabled={loading}
          >
            {loading
              ? (isLogin ? 'Signing In...' : 'Creating Account...')
              : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {/* Footer links */}
        <div style={{ marginTop: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => reset(isLogin ? 'register' : 'login')}
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: 0 }}
            >
              {isLogin ? 'Register' : 'Sign In'}
            </button>
          </span>

          {isLogin && (
            <button
              onClick={seedAdmin}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
            >
              Auto-fill Super Admin
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
