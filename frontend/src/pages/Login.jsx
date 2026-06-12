import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { setAuthToken } from '../utils/apiFetch'
import { Brain, Lock, Mail, KeyRound, Loader2, AlertCircle, Zap } from 'lucide-react'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('login') // login | signup

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let result
      if (mode === 'login') {
        result = await supabase.auth.signInWithPassword({ email, password })
      } else {
        result = await supabase.auth.signUp({ email, password })
      }

      if (result.error) throw result.error

      if (mode === 'signup') {
        setError(null)
        setMode('login')
        alert('Check your email to confirm your account, then log in.')
        return
      }

      const session = result.data?.session
      if (session) {
        setAuthToken(session.access_token)
        const user = result.data.user
        onLogin({
          id: user.id,
          email: user.email,
          role: user.app_metadata?.role || 'user',
          token: session.access_token,
        })
      }
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      })
      if (error) throw error
    } catch (err) {
      setError(err.message || 'Google login failed')
      setLoading(false)
    }
  }

  const handleAutoLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await supabase.auth.signInWithPassword({
        email: 'demo@example.com',
        password: 'password123',
      })
      if (result.error) throw result.error
      const session = result.data?.session
      if (session) {
        setAuthToken(session.access_token)
        const user = result.data.user
        onLogin({
          id: user.id,
          email: user.email,
          role: user.app_metadata?.role || 'user',
          token: session.access_token,
        })
      }
    } catch (err) {
      setError(err.message || 'Auto-login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-brand-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 animate-slide-up">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 mb-4 shadow-2xl shadow-brand-900/50">
            <Brain size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">FL Platform</h1>
          <p className="text-slate-400 mt-1 text-sm">Federated Learning · Privacy-Preserving Analytics</p>
        </div>

        {/* Card */}
        <div className="glass-card gradient-border p-8">
          <div className="flex gap-2 mb-6 p-1 rounded-xl bg-surface-900/60">
            {['login', 'signup'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null) }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 capitalize
                  ${mode === m ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <KeyRound size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-field pl-10"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <AlertCircle size={14} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-brand-600 to-brand-500
                         hover:from-brand-500 hover:to-brand-400 text-white transition-all duration-200
                         active:scale-98 shadow-lg shadow-brand-900/40 disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              {loading ? 'Authenticating…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {mode === 'login' && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#0b1329] px-2 text-slate-500 font-medium">Or continue with</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-xs bg-surface-900/60 hover:bg-surface-800/80
                             border border-white/10 hover:border-white/20 text-slate-200 transition-all duration-200
                             active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Google
                </button>

                <button
                  type="button"
                  onClick={handleAutoLogin}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-xs bg-gradient-to-r from-emerald-600/20 to-teal-600/20
                             hover:from-emerald-600/30 hover:to-teal-600/30 border border-emerald-500/20 hover:border-emerald-500/40
                             text-emerald-400 transition-all duration-200 active:scale-98 flex items-center justify-center gap-2
                             disabled:opacity-50"
                >
                  <Zap size={14} className="fill-emerald-400/20" />
                  Auto Login
                </button>
              </div>
            </>
          )}

          {/* Security info */}
          <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Lock size={10} className="text-emerald-500" /> AES-256-GCM</span>
            <span className="flex items-center gap-1"><Lock size={10} className="text-blue-500" /> RSA-2048-OAEP</span>
            <span className="flex items-center gap-1"><Lock size={10} className="text-purple-500" /> Supabase Auth</span>
          </div>
        </div>
      </div>
    </div>
  )
}
