import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Users, Database, TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { apiFetch, API_BASE, authHeaders } from '../utils/apiFetch';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [recentExperiments, setRecentExperiments] = useState([]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, datasetsRes, trainRes] = await Promise.all([
        apiFetch(`/api/auth/me`, { headers: authHeaders() }),
        apiFetch(`/api/datasets/list`, { headers: authHeaders() }),
        apiFetch(`/api/training/compare`, { headers: authHeaders() }),
      ]);

      if (meRes.ok) {
        const me = await meRes.json();
        setUserEmail(me.email);
        localStorage.setItem('userEmail', me.email);
      }

      const datasetsData = datasetsRes.ok ? await datasetsRes.json() : { datasets: [] };
      const trainingData = trainRes.ok ? await trainRes.json() : { experiments: [] };

      const experiments = trainingData.experiments || [];
      const datasets = datasetsData.datasets || [];

      const completed = experiments.filter(e => e.status === 'completed').length;
      const running = experiments.filter(e => e.status === 'running').length;
      const failed = experiments.filter(e => e.status === 'failed').length;

      setStats({
        totalDatasets: datasets.length,
        totalExperiments: experiments.length,
        completedExperiments: completed,
        runningExperiments: running,
        failedExperiments: failed,
      });

      setRecentExperiments(experiments.slice(0, 5));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 15s if something is running
    const interval = setInterval(() => {
      if (recentExperiments.some(e => e.status === 'running')) {
        fetchDashboard();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const statCards = stats ? [
    {
      title: 'Datasets Uploaded',
      value: stats.totalDatasets,
      icon: <Database size={22} color="#a78bfa" />,
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.1)',
      onClick: () => navigate('/datasets'),
    },
    {
      title: 'Total Experiments',
      value: stats.totalExperiments,
      icon: <Activity size={22} color="var(--accent-primary)" />,
      color: 'var(--accent-primary)',
      bg: 'rgba(59,130,246,0.1)',
      onClick: () => navigate('/training'),
    },
    {
      title: 'Completed Runs',
      value: stats.completedExperiments,
      icon: <CheckCircle size={22} color="var(--success)" />,
      color: 'var(--success)',
      bg: 'rgba(16,185,129,0.1)',
      onClick: () => navigate('/training'),
    },
    {
      title: 'Active / Running',
      value: stats.runningExperiments,
      icon: <Clock size={22} color="#f59e0b" />,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
      onClick: () => navigate('/training'),
    },
  ] : [];

  const statusColor = (status) => {
    if (status === 'completed') return 'var(--success)';
    if (status === 'running') return 'var(--accent-primary)';
    if (status === 'failed') return '#f87171';
    return 'var(--text-secondary)';
  };

  const statusBg = (status) => {
    if (status === 'completed') return 'rgba(16,185,129,0.12)';
    if (status === 'running') return 'rgba(59,130,246,0.12)';
    if (status === 'failed') return 'rgba(239,68,68,0.12)';
    return 'rgba(148,163,184,0.12)';
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '4px' }}>
          Platform Overview
        </h1>
        {userEmail && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Signed in as <strong style={{ color: 'var(--accent-primary)' }}>{userEmail}</strong>
          </p>
        )}
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass" style={{ padding: '24px', height: '90px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
              <div style={{ width: '60%', height: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', marginBottom: '10px' }} />
              <div style={{ width: '40%', height: '22px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px' }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {statCards.map((card) => (
            <div
              key={card.title}
              className="glass"
              onClick={card.onClick}
              style={{
                padding: '22px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                borderRadius: '12px',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${card.bg}`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ padding: '12px', background: card.bg, borderRadius: '12px', flexShrink: 0 }}>
                {card.icon}
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>{card.title}</p>
                <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: card.color, lineHeight: 1 }}>{card.value}</h2>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Experiments Table */}
      {!loading && recentExperiments.length > 0 && (
        <div className="glass" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <TrendingUp size={16} color="var(--text-secondary)" />
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recent Training Runs
            </span>
            <button
              onClick={() => navigate('/training')}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
            >
              View All →
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {['ID', 'Name', 'Algorithm', 'Status', 'Created'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentExperiments.map(exp => (
                <tr key={exp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>#{exp.id}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>{exp.name}</td>
                  <td style={{ padding: '8px 12px' }}>{exp.algorithm}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                      background: statusBg(exp.status),
                      color: statusColor(exp.status),
                    }}>{exp.status}</span>
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {exp.created_at ? new Date(exp.created_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && recentExperiments.length === 0 && (
        <div className="glass" style={{ padding: '40px', textAlign: 'center' }}>
          <Activity size={40} color="var(--text-secondary)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ marginBottom: '8px', fontWeight: 600 }}>No experiments yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
            Upload a dataset and start a training run to see your stats here.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => navigate('/datasets')} className="btn btn-secondary" style={{ padding: '8px 20px' }}>
              Upload Dataset
            </button>
            <button onClick={() => navigate('/training')} className="btn btn-primary" style={{ padding: '8px 20px' }}>
              Start Training
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
