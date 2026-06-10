import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Database, CheckCircle, Clock, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, authHeaders } from '../utils/apiFetch';

const StatCard = ({ title, value, icon, accent, onClick, loading }) => (
  <div className="card card-hover" onClick={onClick} style={{ display:'flex', alignItems:'center', gap:'var(--s4)', padding:'var(--s4)' }}>
    {loading ? (
      <>
        <div className="skeleton" style={{ width:'40px', height:'40px', borderRadius:'var(--r)', flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <div className="skeleton" style={{ width:'60%', height:'10px', marginBottom:'8px' }}/>
          <div className="skeleton" style={{ width:'40%', height:'22px' }}/>
        </div>
      </>
    ) : (
      <>
        <div style={{ width:'40px', height:'40px', borderRadius:'var(--r)', background:accent+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:accent }}>
          {icon}
        </div>
        <div>
          <p className="overline" style={{ marginBottom:'3px' }}>{title}</p>
          <p className="stat-number tabular">{value}</p>
        </div>
      </>
    )}
  </div>
);

const statusBadge = (s) => {
  if (s === 'completed') return <span className="badge badge-success">completed</span>;
  if (s === 'running')   return <span className="badge badge-running">running</span>;
  if (s === 'failed')    return <span className="badge badge-error">failed</span>;
  return <span className="badge badge-neutral">{s}</span>;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [recentExps, setRecentExps] = useState([]);
  const [role, setRole] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, dsRes, trainRes] = await Promise.all([
        apiFetch('/api/auth/me',          { headers: authHeaders() }),
        apiFetch('/api/datasets/list',    { headers: authHeaders() }),
        apiFetch('/api/training/compare', { headers: authHeaders() }),
      ]);
      if (meRes.ok) { const me = await meRes.json(); setUserEmail(me.email); localStorage.setItem('userEmail', me.email); }
      const ds   = dsRes.ok   ? (await dsRes.json()).datasets    || [] : [];
      const exps = trainRes.ok? (await trainRes.json()).experiments || [] : [];
      setStats({
        totalDatasets:        ds.length,
        totalExperiments:     exps.length,
        completedExperiments: exps.filter(e=>e.status==='completed').length,
        runningExperiments:   exps.filter(e=>e.status==='running').length,
      });
      setRecentExps(exps.slice(0,6));
      setRole(localStorage.getItem('role')||'user');
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const t = setInterval(()=>{ if(recentExps.some(e=>e.status==='running')) fetchDashboard(); }, 15000);
    return ()=>clearInterval(t);
  }, [fetchDashboard]);

  const cards = stats ? [
    { title:'Datasets Uploaded',  value:stats.totalDatasets,        icon:<Database size={18}/>,      accent:'var(--phase-security)', onClick:()=>navigate('/datasets') },
    { title:'Total Experiments',  value:stats.totalExperiments,     icon:<Activity size={18}/>,      accent:'var(--phase-training)', onClick:()=>navigate('/training') },
    { title:'Completed Runs',     value:stats.completedExperiments, icon:<CheckCircle size={18}/>,   accent:'var(--phase-predict)',  onClick:()=>navigate('/training') },
    { title:'Active / Running',   value:stats.runningExperiments,   icon:<Clock size={18}/>,         accent:'var(--phase-ui-ux)',    onClick:()=>navigate('/training') },
  ] : [{},{},{},{}];

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'var(--s3)' }}>
          <div>
            <h1 className="page-title">Platform Overview</h1>
            {userEmail && (
              <p className="page-sub">
                Signed in as <span style={{ color:'var(--primary)', fontWeight:600 }}>{userEmail}</span>
                {role && <span style={{ marginLeft:'8px' }}><span className="badge badge-neutral" style={{ verticalAlign:'middle' }}>{role}</span></span>}
              </p>
            )}
          </div>
          <button className="btn btn-secondary" onClick={fetchDashboard} style={{ gap:'5px', fontSize:'12px' }}>
            <Activity size={13}/> Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid-auto" style={{ marginBottom:'var(--s6)' }}>
        {cards.map((c,i) => <StatCard key={i} {...c} loading={loading}/>)}
      </div>

      {/* Recent experiments */}
      {!loading && recentExps.length > 0 && (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px var(--s4)', borderBottom:'0.5px solid var(--border-subtle)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'var(--s2)' }}>
              <TrendingUp size={14} color="var(--text-muted)"/>
              <span className="overline">Recent Training Runs</span>
            </div>
            <button onClick={()=>navigate('/training')} className="btn-icon" style={{ font:'var(--text-label-sm)', display:'flex', alignItems:'center', gap:'3px', color:'var(--primary)' }}>
              View all <ArrowRight size={12}/>
            </button>
          </div>
          <div className="table-scroll">
            <table className="data-table" style={{ minWidth:'520px' }}>
              <thead>
                <tr><th>ID</th><th>Name</th><th>Algorithm</th><th>Status</th><th>Created</th></tr>
              </thead>
              <tbody>
                {recentExps.map(exp => (
                  <tr key={exp.id}>
                    <td><code>#{exp.id}</code></td>
                    <td className="td-primary" style={{ maxWidth:'160px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{exp.name}</td>
                    <td>{exp.algorithm}</td>
                    <td>{statusBadge(exp.status)}</td>
                    <td style={{ whiteSpace:'nowrap' }}>{exp.created_at ? new Date(exp.created_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && recentExps.length === 0 && (
        <div className="card" style={{ padding:'40px', textAlign:'center' }}>
          <div style={{ width:'44px', height:'44px', borderRadius:'var(--r-md)', background:'var(--surface-high)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto var(--s4)' }}>
            <Activity size={22} color="var(--text-muted)"/>
          </div>
          <h3 style={{ font:'var(--text-headline-md)', color:'var(--text-primary)', marginBottom:'6px' }}>No experiments yet</h3>
          <p style={{ font:'var(--text-body-md)', color:'var(--text-secondary)', marginBottom:'var(--s4)', maxWidth:'320px', margin:'0 auto var(--s4)' }}>
            Upload a dataset and start a training run to see your statistics here.
          </p>
          <div style={{ display:'flex', gap:'var(--s3)', justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={()=>navigate('/datasets')} className="btn btn-secondary">Upload Dataset</button>
            <button onClick={()=>navigate('/training')} className="btn btn-primary">Start Training</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
