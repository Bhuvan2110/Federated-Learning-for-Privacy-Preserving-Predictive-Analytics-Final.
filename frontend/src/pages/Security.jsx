import { useState, useEffect } from 'react'
import { apiFetch } from '../utils/apiFetch'
import { Shield, Lock, Key, FileText, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react'

export default function Security() {
  const [publicKey, setPublicKey] = useState(null)
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [pkRes, logs] = await Promise.all([
        apiFetch('/auth/security/public-key'),
        apiFetch('/auth/audit-logs').catch(() => []),
      ])
      setPublicKey(pkRes.public_key)
      setAuditLogs(Array.isArray(logs) ? logs : [])
    } catch (e) {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="page-wrapper">
      <h1 className="page-title">Security</h1>
      <p className="page-subtitle">Encryption status, audit trail, and access control</p>

      {/* Encryption status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { icon: Lock,   label: 'Transport Encryption', value: 'AES-256-GCM',    desc: 'Gradient payloads',      status: 'active', color: 'emerald' },
          { icon: Key,    label: 'Key Exchange',          value: 'RSA-2048-OAEP',  desc: 'Per-session AES key',    status: 'active', color: 'blue'    },
          { icon: Shield, label: 'Auth',                  value: 'Supabase JWT',   desc: '3-tier RBAC enforced',   status: 'active', color: 'purple'  },
        ].map(item => {
          const Icon = item.icon
          const c = {
            emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
            blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400'    },
            purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-400'  },
          }[item.color]
          return (
            <div key={item.label} className={`glass-card p-5 border ${c.border} ${c.bg}`}>
              <div className="flex items-center justify-between mb-3">
                <Icon size={18} className={c.text} />
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${c.text.replace('text-', 'bg-')} animate-pulse`} />
                  <span className={`text-xs ${c.text}`}>Active</span>
                </div>
              </div>
              <p className={`text-lg font-bold font-mono ${c.text}`}>{item.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{item.label}</p>
              <p className="text-xs text-slate-600 mt-1">{item.desc}</p>
            </div>
          )
        })}
      </div>

      {/* RSA Public Key */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Key size={14} className="text-brand-400" /> Server RSA-2048 Public Key
          </h2>
          <button onClick={load} className="btn-secondary text-xs">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        {publicKey ? (
          <pre className="text-xs font-mono text-emerald-400/80 bg-surface-900/50 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap break-all border border-white/5">
            {publicKey}
          </pre>
        ) : (
          <p className="text-slate-500 text-sm">{loading ? 'Loading…' : 'Could not load public key'}</p>
        )}
      </div>

      {/* Audit logs */}
      <div className="glass-card">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
          <FileText size={14} className="text-brand-400" />
          <span className="text-sm font-semibold text-slate-200">Audit Log</span>
          <span className="ml-auto text-xs text-slate-500 px-2 py-0.5 rounded-full bg-surface-700">{auditLogs.length} entries</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm animate-pulse">Loading audit logs…</div>
        ) : auditLogs.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 size={28} className="text-emerald-500/40 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No audit events yet (admin access required)</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Action</th><th>Resource</th><th>IP</th><th>User</th><th>Time</th></tr>
              </thead>
              <tbody>
                {auditLogs.slice(0, 50).map(log => (
                  <tr key={log.id}>
                    <td>
                      <span className={`text-xs font-mono font-medium ${log.action.includes('fail') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="text-slate-400 text-xs">{log.resource || '—'}</td>
                    <td className="font-mono text-xs text-slate-500">{log.ip || '—'}</td>
                    <td className="font-mono text-xs text-slate-500">{log.user_id?.slice(0, 8) || '—'}</td>
                    <td className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
