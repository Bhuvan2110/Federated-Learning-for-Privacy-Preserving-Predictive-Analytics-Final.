import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { setAuthToken } from '../utils/apiFetch'
import { Brain, Lock, Mail, KeyRound, Loader2, AlertCircle } from 'lucide-react'

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
