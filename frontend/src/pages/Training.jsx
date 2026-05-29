import React, { useState, useEffect } from 'react';
import { Play, Cpu, Globe, Settings, BarChart2, CheckCircle, AlertCircle, Eye, TrendingUp, Trash2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const Training = () => {
  const [mode, setMode] = useState('federated');
  const [datasetId, setDatasetId] = useState('');
  const [algorithm, setAlgorithm] = useState('FedAvg');
  const [epochs, setEpochs] = useState(5);
  const [learningRate, setLearningRate] = useState(0.01);
  const [rounds, setRounds] = useState(10);
  const [clients, setClients] = useState(3);
  const [mu, setMu] = useState(0.0);
  const [dpEpsilon, setDpEpsilon] = useState(0.0);

  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Selected experiment metrics state
  const [selectedExpId, setSelectedExpId] = useState(null);
  const [metricsData, setMetricsData] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [historyTrigger, setHistoryTrigger] = useState(0);

  const headers = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const simulateProgress = (phases) => {
    return new Promise((resolve) => {
      let phaseIdx = 0;
      let p = 0;
      const perPhase = 100 / phases.length;
      setPhase(phases[0]);
      const interval = setInterval(() => {
        p += 2;
        setProgress(Math.min(p, 100));
        if (p >= (phaseIdx + 1) * perPhase && phaseIdx < phases.length - 1) {
          phaseIdx++;
          setPhase(phases[phaseIdx]);
        }
        if (p >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  };

  const startFederatedTraining = async () => {
    if (!datasetId) { setError('Please enter a Dataset ID'); return; }
    setError('');
    setIsTraining(true);
    setResult(null);
    setProgress(0);

    const phases = [
      'Initializing global model...',
      'Distributing to clients...',
      `Round 1/${rounds}: Local training...`,
      'Aggregating weights (FedAvg)...',
      `Round ${Math.ceil(rounds / 2)}/${rounds}: Local training...`,
      'Applying differential privacy...',
      `Round ${rounds}/${rounds}: Final aggregation...`,
      'Saving model weights...',
    ];

    try {
      const [apiRes] = await Promise.all([
        fetch(`${API_BASE}/api/training/federated`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers(),
          },
          body: JSON.stringify({
            dataset_id: parseInt(datasetId),
            algorithm,
            rounds: parseInt(rounds),
            clients: parseInt(clients),
            epochs: parseInt(epochs),
            learning_rate: parseFloat(learningRate),
            mu: parseFloat(mu),
            dp_epsilon: parseFloat(dpEpsilon),
          }),
        }),
        simulateProgress(phases),
      ]);
      const data = await apiRes.json();
      if (!apiRes.ok) throw new Error(data.detail || 'Training failed');
      setResult({ experimentId: data.experiment_id, message: data.message });
      // Trigger a refresh of the history table
      setHistoryTrigger(prev => prev + 1);
      // Auto-load the metrics for this run
      viewMetrics(data.experiment_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTraining(false);
      setPhase('');
    }
  };

  const startCentralizedTraining = async () => {
    if (!datasetId) { setError('Please enter a Dataset ID'); return; }
    setError('');
    setIsTraining(true);
    setResult(null);
    setProgress(0);

    const phases = [
      'Loading dataset...',
      'Initializing model...',
      `Epoch 1/${epochs}: Forward pass...`,
      `Epoch ${Math.ceil(epochs / 2)}/${epochs}: Backpropagation...`,
      `Epoch ${epochs}/${epochs}: Computing loss...`,
      'Evaluating on validation set...',
      'Saving centralized model...',
    ];

    try {
      const [apiRes] = await Promise.all([
        fetch(`${API_BASE}/api/training/federated`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers(),
          },
          body: JSON.stringify({
            dataset_id: parseInt(datasetId),
            algorithm: 'Centralized',
            rounds: 1,
            clients: 1,
            epochs: parseInt(epochs),
            learning_rate: parseFloat(learningRate),
            mu: 0.0,
            dp_epsilon: 0.0,
          }),
        }),
        simulateProgress(phases),
      ]);
      const data = await apiRes.json();
      if (!apiRes.ok) throw new Error(data.detail || 'Training failed');
      setResult({ experimentId: data.experiment_id, message: 'Centralized training job started!' });
      setHistoryTrigger(prev => prev + 1);
      viewMetrics(data.experiment_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTraining(false);
      setPhase('');
    }
  };

  const viewMetrics = async (id) => {
    setSelectedExpId(id);
    setLoadingMetrics(true);
    setMetricsData(null);
    try {
      const res = await fetch(`${API_BASE}/api/metrics/${id}`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to fetch metrics');
      setMetricsData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const isFederated = mode === 'federated';

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Training</h1>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
        {[
          { key: 'federated', icon: Globe, label: 'Federated Training', desc: 'Multi-client distributed learning' },
          { key: 'centralized', icon: Cpu, label: 'Centralized Training', desc: 'Single-node classic training' },
        ].map(({ key, icon: Icon, label, desc }) => (
          <button
            key={key}
            onClick={() => { setMode(key); setError(''); setResult(null); }}
            style={{
              flex: 1,
              padding: '16px 20px',
              borderRadius: '12px',
              border: mode === key ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)',
              background: mode === key ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <div style={{
              width: '42px', height: '42px', borderRadius: '10px',
              background: mode === key ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon size={20} color={mode === key ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: mode === key ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Config Card */}
      <div className="glass" style={{ padding: '28px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Settings size={16} color="var(--text-secondary)" />
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isFederated ? 'Federated' : 'Centralized'} Configuration
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Dataset ID <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="number"
              min="1"
              placeholder="Enter dataset ID (from Datasets page)"
              className="input-field"
              style={{ marginBottom: 0 }}
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
            />
          </div>

          {isFederated && (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Algorithm</label>
              <select
                className="input-field"
                style={{ background: 'var(--bg-secondary)', marginBottom: 0 }}
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
              >
                <option>FedAvg</option>
                <option>FedProx</option>
                <option>SCAFFOLD</option>
              </select>
            </div>
          )}

          {isFederated && (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Global Rounds</label>
              <input type="number" min="1" className="input-field" style={{ marginBottom: 0 }} value={rounds} onChange={(e) => setRounds(e.target.value)} />
            </div>
          )}

          {isFederated && (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Number of Clients</label>
              <input type="number" min="1" className="input-field" style={{ marginBottom: 0 }} value={clients} onChange={(e) => setClients(e.target.value)} />
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Local Epochs</label>
            <input type="number" min="1" className="input-field" style={{ marginBottom: 0 }} value={epochs} onChange={(e) => setEpochs(e.target.value)} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Learning Rate</label>
            <input type="number" step="0.001" min="0" className="input-field" style={{ marginBottom: 0 }} value={learningRate} onChange={(e) => setLearningRate(e.target.value)} />
          </div>

          {isFederated && algorithm === 'FedProx' && (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>Proximal Term μ</label>
              <input type="number" step="0.01" min="0" className="input-field" style={{ marginBottom: 0 }} value={mu} onChange={(e) => setMu(e.target.value)} />
            </div>
          )}

          {isFederated && (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Privacy Budget ε &nbsp;<span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>(0 = disabled)</span>
              </label>
              <input type="number" step="0.1" min="0" className="input-field" style={{ marginBottom: 0 }} value={dpEpsilon} onChange={(e) => setDpEpsilon(e.target.value)} />
            </div>
          )}
        </div>

        {error && (
          <div style={{
            marginTop: '16px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px', padding: '10px 14px', color: '#f87171', fontSize: '13px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <button
          onClick={isFederated ? startFederatedTraining : startCentralizedTraining}
          className="btn btn-primary"
          disabled={isTraining}
          style={{ marginTop: '24px', padding: '12px 28px', fontSize: '15px', gap: '8px' }}
        >
          <Play size={18} />
          {isTraining
            ? (isFederated ? 'Federated Training Running...' : 'Centralized Training Running...')
            : (isFederated ? 'Start Federated Training' : 'Start Centralized Training')}
        </button>
      </div>

      {/* Progress Bar */}
      {isTraining && (
        <div className="glass animate-fade-in" style={{ padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            {isFederated ? <Globe size={18} color="var(--accent-primary)" /> : <Cpu size={18} color="var(--accent-primary)" />}
            <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
              {isFederated ? 'Federated Aggregation' : 'Centralized Training'}
            </span>
            <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '15px' }}>{progress}%</span>
          </div>
          <div style={{ height: '10px', background: 'var(--bg-secondary)', borderRadius: '5px', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--accent-primary), #a78bfa)',
              transition: 'width 0.15s ease', borderRadius: '5px',
            }} />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {phase}
          </p>
          {isFederated && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
              {Array.from({ length: parseInt(clients) || 3 }).map((_, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', background: 'rgba(255,255,255,0.05)',
                  borderRadius: '20px', fontSize: '12px', color: 'var(--text-secondary)',
                }}>
                  <div style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: progress > (i + 1) * (100 / (parseInt(clients) || 3))
                      ? 'var(--success)' : 'var(--accent-primary)',
                    animation: 'pulse 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }} />
                  Client {i + 1}
                </div>
              ))}
            </div>
          )}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </div>
      )}

      {/* Result Metrics panel */}
      {selectedExpId && (
        <div className="glass animate-fade-in" style={{ padding: '24px', marginBottom: '24px', border: '1px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '16px', fontWeight: 'bold' }}>Training Results — Experiment #{selectedExpId}</h2>
            </div>
            <button onClick={() => setSelectedExpId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>

          {loadingMetrics ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>Loading metrics...</div>
          ) : metricsData ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Final Loss</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f87171', marginTop: '4px' }}>
                    {metricsData.final_metrics?.loss ?? 'N/A'}
                  </div>
                </div>
                <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Final Accuracy</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)', marginTop: '4px' }}>
                    {metricsData.final_metrics?.accuracy ? `${(metricsData.final_metrics.accuracy * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Progress Curves */}
              {metricsData.curves && metricsData.curves.loss && metricsData.curves.loss.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px' }}>Round-by-Round Training Progression</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>Round / Epoch</th>
                          <th style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>Loss</th>
                          <th style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>Accuracy</th>
                          <th style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>Progress Bar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metricsData.curves.loss.map((lossVal, idx) => {
                          const accVal = metricsData.curves.accuracy[idx] || 0;
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                              <td style={{ padding: '6px 12px', fontWeight: '600' }}>#{idx + 1}</td>
                              <td style={{ padding: '6px 12px', color: '#f87171' }}>{lossVal.toFixed(4)}</td>
                              <td style={{ padding: '6px 12px', color: 'var(--success)' }}>{(accVal * 100).toFixed(1)}%</td>
                              <td style={{ padding: '6px 12px', width: '40%' }}>
                                <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${accVal * 100}%`, background: 'var(--success)' }} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--text-secondary)' }}>No metrics found. Try starting a training run.</div>
          )}
        </div>
      )}

      {/* History table */}
      <ExperimentsTable refreshTrigger={historyTrigger} onViewMetrics={viewMetrics} />
    </div>
  );
};

const ExperimentsTable = ({ refreshTrigger, onViewMetrics }) => {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const headers = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchExperiments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/training/compare`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setExperiments(data.experiments || []);
    } catch (_) {}
    setLoading(false);
  };

  const deleteExperiment = async (id) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    setDeleteError('');
    try {
      const res = await fetch(`${API_BASE}/api/training/${id}`, {
        method: 'DELETE',
        headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Delete failed');
      setExperiments(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, [refreshTrigger]);

  if (!experiments.length && !loading) return null;

  return (
    <div className="glass" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <BarChart2 size={16} color="var(--text-secondary)" />
        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          My Experiment History
        </span>
        <button onClick={fetchExperiments} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '12px' }}>
          ↻ Refresh
        </button>
      </div>

      {deleteError && (
        <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#f87171', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {deleteError}
          <button onClick={() => setDeleteError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {['ID', 'Name', 'Algorithm', 'Status', 'Created', 'Actions'].map((h) => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {experiments.map((exp) => (
            <tr key={exp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>#{exp.id}</td>
              <td style={{ padding: '8px 12px' }}>{exp.name}</td>
              <td style={{ padding: '8px 12px' }}>{exp.algorithm}</td>
              <td style={{ padding: '8px 12px' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                  background: exp.status === 'completed' ? 'rgba(16,185,129,0.15)' : exp.status === 'running' ? 'rgba(59,130,246,0.15)' : 'rgba(148,163,184,0.15)',
                  color: exp.status === 'completed' ? 'var(--success)' : exp.status === 'running' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                }}>
                  {exp.status}
                </span>
              </td>
              <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                {exp.created_at ? new Date(exp.created_at).toLocaleString() : '—'}
              </td>
              <td style={{ padding: '8px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {exp.status === 'completed' && (
                    <button
                      onClick={() => onViewMetrics(exp.id)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={12} /> View Results
                    </button>
                  )}

                  {/* Delete button — disabled while running */}
                  {confirmDeleteId === exp.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#f87171' }}>Delete?</span>
                      <button
                        onClick={() => deleteExperiment(exp.id)}
                        disabled={deletingId === exp.id}
                        style={{
                          padding: '3px 8px', fontSize: '11px', borderRadius: '5px',
                          background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)',
                          color: '#f87171', cursor: 'pointer', fontWeight: 600,
                        }}
                      >
                        {deletingId === exp.id ? '...' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        style={{
                          padding: '3px 8px', fontSize: '11px', borderRadius: '5px',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)', cursor: 'pointer',
                        }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(exp.id)}
                      disabled={exp.status === 'running' || deletingId === exp.id}
                      title={exp.status === 'running' ? 'Cannot delete a running experiment' : 'Delete experiment'}
                      style={{
                        padding: '4px 6px', borderRadius: '5px',
                        border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.08)',
                        color: exp.status === 'running' ? 'var(--text-secondary)' : '#f87171',
                        cursor: exp.status === 'running' ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center',
                        opacity: exp.status === 'running' ? 0.4 : 1,
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => { if (exp.status !== 'running') e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Training;
