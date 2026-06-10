import React, { useState, useEffect } from 'react';
import { GitCompare, ChevronDown, TrendingUp, TrendingDown, Zap, AlertCircle, BarChart2, RefreshCw } from 'lucide-react';
import { apiFetch, authHeaders } from '../utils/apiFetch';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const pct = (v) => (v != null ? `${(v * 100).toFixed(1)}%` : '—');
const fmt = (v) => (v != null ? Number(v).toFixed(4) : '—');

const ALGO_COLORS = {
  FedAvg:       { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa' },
  FedProx:      { bg: 'rgba(139,92,246,0.15)',  text: '#a78bfa' },
  SCAFFOLD:     { bg: 'rgba(16,185,129,0.15)',  text: '#34d399' },
  Centralized:  { bg: 'rgba(245,158,11,0.15)',  text: '#fbbf24' },
};
const algoStyle = (a) => ALGO_COLORS[a] || { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' };

/* ─── Sparkline ───────────────────────────────────────────────────────────── */
const Sparkline = ({ data = [], color = '#60a5fa', label }) => {
  if (!data.length) return null;
  const W = 280, H = 60, pad = 4;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <svg width={W} height={H} style={{ display: 'block', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/* ─── ConfusionMatrix ─────────────────────────────────────────────────────── */
const ConfusionMatrix = ({ cm }) => {
  if (!cm) return null;
  const cells = [
    { label: 'True Positive',  val: cm.TP, bg: 'rgba(16,185,129,0.25)',  text: '#34d399' },
    { label: 'False Positive', val: cm.FP, bg: 'rgba(239,68,68,0.18)',   text: '#f87171' },
    { label: 'False Negative', val: cm.FN, bg: 'rgba(245,158,11,0.18)',  text: '#fbbf24' },
    { label: 'True Negative',  val: cm.TN, bg: 'rgba(59,130,246,0.18)',  text: '#60a5fa' },
  ];
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        Confusion Matrix <span style={{ fontWeight: 400, opacity: 0.6 }}>(n={cm.n_samples})</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
        {cells.map(({ label, val, bg, text }) => (
          <div key={label} style={{ background: bg, borderRadius: 8, padding: '10px 12px', border: `1px solid ${text}33` }}>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: text }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {[
          { k: 'Precision', v: fmt(cm.precision) },
          { k: 'Recall',    v: fmt(cm.recall) },
          { k: 'F1 Score',  v: fmt(cm.f1_score) },
        ].map(({ k, v }) => (
          <div key={k} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '8px 10px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{k}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── FeatureImportance ───────────────────────────────────────────────────── */
const FeatureImportance = ({ features = [], accentColor = '#60a5fa' }) => {
  if (!features.length) return <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No feature data.</p>;
  const top = features.slice(0, 10);
  const maxVal = top[0]?.importance || 1;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        Feature Importance (top {top.length})
      </div>
      {top.map(({ feature, importance }, i) => (
        <div key={feature} style={{ marginBottom: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
            <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
              {i === 0 && <span style={{ color: accentColor, marginRight: 4 }}>★</span>}{feature}
            </span>
            <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>{importance.toFixed(4)}</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(importance / maxVal) * 100}%`, background: accentColor, borderRadius: 3, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── ExperimentPanel ─────────────────────────────────────────────────────── */
const ExperimentPanel = ({ side, experiments, selectedId, onSelect, data, loading, accentColor }) => {
  const ac = algoStyle(data?.experiment?.algorithm);
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Selector */}
      <div className="glass" style={{ padding: '16px 20px' }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
          {side === 'A' ? '⓵' : '⓶'} Select Experiment
        </label>
        <div style={{ position: 'relative' }}>
          <select
            value={selectedId || ''}
            onChange={(e) => onSelect(e.target.value ? parseInt(e.target.value) : null)}
            className="input-field"
            style={{ background: 'var(--bg-secondary)', marginBottom: 0, paddingRight: 32, appearance: 'none', cursor: 'pointer' }}
          >
            <option value="">— choose a completed experiment —</option>
            {experiments.filter(e => e.status === 'completed').map(e => (
              <option key={e.id} value={e.id}>#{e.id} · {e.algorithm} · {e.name}</option>
            ))}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
        </div>
      </div>

      {loading && (
        <div className="glass" style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
          <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }} />
          Loading...
        </div>
      )}

      {!loading && data && (
        <>
          {/* Header card */}
          <div className="glass" style={{ padding: '16px 20px', borderTop: `3px solid ${accentColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{data.experiment.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {new Date(data.experiment.created_at).toLocaleString()}
                </div>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: ac.bg, color: ac.text }}>
                {data.experiment.algorithm}
              </span>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Final Accuracy</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#34d399' }}>{pct(data.final_metrics?.accuracy)}</div>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Final Loss</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f87171' }}>{fmt(data.final_metrics?.loss)}</div>
              </div>
            </div>

            {/* Config pills */}
            {data.experiment.config && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  ['Rounds', data.experiment.config.rounds],
                  ['Clients', data.experiment.config.clients],
                  ['Epochs', data.experiment.config.epochs],
                  ['LR', data.experiment.config.learning_rate],
                ].filter(([, v]) => v != null).map(([k, v]) => (
                  <span key={k} style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                    {k}: {v}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Training curves */}
          {data.curves?.loss?.length > 0 && (
            <div className="glass" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Training Curves</div>
              <Sparkline data={data.curves.accuracy} color={accentColor} label="Accuracy per round" />
              <Sparkline data={data.curves.loss} color="#f87171" label="Loss per round" />
            </div>
          )}

          {/* Confusion Matrix */}
          <div className="glass" style={{ padding: '16px 20px' }}>
            <ConfusionMatrix cm={data.confusion_matrix} />
          </div>

          {/* Feature Importance */}
          <div className="glass" style={{ padding: '16px 20px' }}>
            <FeatureImportance features={data.feature_importance} accentColor={accentColor} />
          </div>
        </>
      )}

      {!loading && !data && selectedId && (
        <div className="glass" style={{ padding: 24, textAlign: 'center', color: '#f87171', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <AlertCircle size={15} /> Could not load experiment data.
        </div>
      )}
    </div>
  );
};

/* ─── InsightRow ──────────────────────────────────────────────────────────── */
const InsightRow = ({ dataA, dataB }) => {
  if (!dataA && !dataB) return null;

  const insights = [];

  if (dataA && dataB) {
    const accA = dataA.final_metrics?.accuracy ?? 0;
    const accB = dataB.final_metrics?.accuracy ?? 0;
    const winner = accA >= accB ? dataA.experiment : dataB.experiment;
    const diff = Math.abs(accA - accB) * 100;
    insights.push(`🏆 Experiment #${winner.id} (${winner.algorithm}) wins by ${diff.toFixed(1)}% accuracy.`);
  }

  // Top feature recommendation from the best (or only available) model
  const best = (dataA?.final_metrics?.accuracy ?? 0) >= (dataB?.final_metrics?.accuracy ?? 0) ? dataA : dataB;
  if (best?.feature_importance?.length) {
    const top3 = best.feature_importance.slice(0, 3).map(f => `"${f.feature}"`).join(', ');
    insights.push(`📌 Top influential features: ${top3}. Prioritising these in data collection or engineering may improve accuracy.`);
  }

  if (dataA?.experiment?.algorithm !== dataB?.experiment?.algorithm && dataA && dataB) {
    insights.push(`💡 Try ${dataA.experiment.algorithm === 'FedAvg' ? 'FedProx' : 'FedAvg'} with more rounds to see if convergence improves.`);
  }

  if (!insights.length) return null;

  return (
    <div className="glass animate-fade-in" style={{ padding: '20px 24px', marginTop: 24, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Zap size={16} color="#818cf8" />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#818cf8' }}>AI Insights & Recommendations</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {insights.map((t, i) => (
          <li key={i} style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ─── Comparison page ─────────────────────────────────────────────────────── */
const Comparison = () => {
  const [experiments, setExperiments] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [selA, setSelA] = useState(null);
  const [selB, setSelB] = useState(null);
  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);
  const [loadA, setLoadA] = useState(false);
  const [loadB, setLoadB] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/training/compare', { headers: authHeaders() });
        const json = await res.json();
        setExperiments(json.experiments || []);
      } catch (_) {}
      setLoadingList(false);
    })();
  }, []);

  const fetchDetail = async (id, setData, setLoad) => {
    if (!id) { setData(null); return; }
    setLoad(true);
    setData(null);
    try {
      const res = await apiFetch(`/api/training/compare/detail/${id}`, { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail);
      setData(json);
    } catch (_) { setData(null); }
    setLoad(false);
  };

  const handleSelectA = (id) => { setSelA(id); fetchDetail(id, setDataA, setLoadA); };
  const handleSelectB = (id) => { setSelB(id); fetchDetail(id, setDataB, setLoadB); };

  const completedCount = experiments.filter(e => e.status === 'completed').length;

  return (
    <div className="animate-fade-in">
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <GitCompare size={22} color="var(--accent-primary)" />
        <h1 style={{ fontSize: 'clamp(20px,4vw,24px)', fontWeight: 'bold' }}>Model Comparison</h1>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 28 }}>
        Select two completed experiments to compare their training results, confusion matrices, and feature importance side-by-side.
      </p>

      {loadingList ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: 13, padding: 24 }}>Loading experiments…</div>
      ) : completedCount === 0 ? (
        <div className="glass" style={{ padding: 32, textAlign: 'center' }}>
          <BarChart2 size={32} color="var(--text-secondary)" style={{ marginBottom: 12 }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No completed experiments yet.</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 6 }}>Head to the <strong>Training</strong> page and start a training run first.</p>
        </div>
      ) : (
        <>
          {/* Side-by-side panels */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <ExperimentPanel side="A" experiments={experiments} selectedId={selA} onSelect={handleSelectA} data={dataA} loading={loadA} accentColor="#60a5fa" />
            {/* Divider */}
            <div style={{ width: 1, background: 'var(--border-color)', alignSelf: 'stretch', flexShrink: 0, display: 'none' }} className="compare-divider" />
            <ExperimentPanel side="B" experiments={experiments} selectedId={selB} onSelect={handleSelectB} data={dataB} loading={loadB} accentColor="#a78bfa" />
          </div>

          {/* Insights */}
          <InsightRow dataA={dataA} dataB={dataB} />
        </>
      )}
    </div>
  );
};

export default Comparison;
