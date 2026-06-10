import React, { useState, useRef, useEffect } from 'react';
import { Database, Settings, FileText, CheckCircle, UploadCloud, Play, Sparkles, Activity, AlertCircle } from 'lucide-react';
import { apiFetch, authHeaders } from '../utils/apiFetch';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * SKIP_COLUMNS — column names (case-insensitive, punctuation-stripped) that are
 * row identifiers / serial numbers and should never be shown as feature inputs.
 */
const SKIP_PATTERN = /^(sl[._\s]?no|s[._\s]?no|serial[._\s]?no(\.|)?|row[._\s]?no|index|row|id|#|no\.)$/i;

/** Returns true if the column is a serial-number / index column to skip. */
function isSkipColumn(col) {
  return SKIP_PATTERN.test(col.trim());
}

/**
 * KNOWN_DOMAINS — hardcoded dropdown options for well-known dataset columns.
 * This covers the Heart Disease (Cleveland / Kaggle) dataset and common
 * medical/clinical datasets. Takes priority over metadata-based detection.
 *
 * type: 'select'  → render a <select> with the given options
 * type: 'number'  → render <input type="number"> with optional min/max/step
 */
const KNOWN_DOMAINS = {
  // ── Heart Disease dataset columns ──────────────────────────────────────────
  ChestPainType:   { type: 'select', options: ['ATA', 'NAP', 'ASY', 'TA'],
                     hint: 'ATA=Atypical Angina, NAP=Non-Anginal Pain, ASY=Asymptomatic, TA=Typical Angina' },
  RestingBP:       { type: 'number', min: 0, max: 250, step: 1,
                     hint: 'Resting blood pressure (mm Hg)' },
  Cholesterol:     { type: 'number', min: 0, max: 700, step: 1,
                     hint: 'Serum cholesterol (mg/dl)' },
  FastingBS:       { type: 'select', options: ['0', '1'],
                     hint: 'Fasting blood sugar > 120 mg/dl: 1 = Yes, 0 = No' },
  RestingECG:      { type: 'select', options: ['Normal', 'ST', 'LVH'],
                     hint: 'Normal, ST-T wave abnormality, Left ventricular hypertrophy' },
  MaxHR:           { type: 'number', min: 60, max: 220, step: 1,
                     hint: 'Maximum heart rate achieved' },
  ExerciseAngina:  { type: 'select', options: ['Y', 'N'],
                     hint: 'Exercise-induced angina: Y = Yes, N = No' },
  Oldpeak:         { type: 'number', min: -3, max: 7, step: 0.1,
                     hint: 'ST depression induced by exercise relative to rest' },
  ST_Slope:        { type: 'select', options: ['Up', 'Flat', 'Down'],
                     hint: 'Slope of the peak exercise ST segment' },

  // ── Sex / Gender (any case) ────────────────────────────────────────────────
  Sex:    { type: 'select', options: ['M', 'F'] },
  sex:    { type: 'select', options: ['Male', 'Female', 'Other'] },
  gender: { type: 'select', options: ['Male', 'Female', 'Other'] },
  Gender: { type: 'select', options: ['Male', 'Female', 'Other'] },

  // ── Age ───────────────────────────────────────────────────────────────────
  Age: { type: 'number', min: 0, max: 120, step: 1, hint: 'Age in years' },
  age: { type: 'number', min: 0, max: 120, step: 1, hint: 'Age in years' },

  // ── Common binary yes/no flags ─────────────────────────────────────────────
  HeartDisease: { type: 'select', options: ['0', '1'] },
};

/**
 * Given a column name + its stats from the dataset metadata,
 * return which input type to render and what options to offer.
 *
 * Priority order:
 *  1. KNOWN_DOMAINS hardcoded map  (exact column name match)
 *  2. Metadata unique_values from dataset upload  (categorical ≤20)
 *  3. Metadata is_numeric flag
 *  4. Fallback → text input
 */
function getInputConfig(col, stats = {}) {
  // 1. Hardcoded domain map — highest priority
  if (KNOWN_DOMAINS[col]) {
    return KNOWN_DOMAINS[col];
  }

  // 2. Categorical: non-numeric with ≤20 unique values stored → dropdown
  if (!stats.is_numeric && stats.unique_values && stats.unique_values.length > 0) {
    return { type: 'select', options: stats.unique_values };
  }

  // 3. Categorical numeric with ≤10 unique values (e.g. 0/1 flags) → dropdown
  if (stats.is_numeric && stats.unique_values && stats.unique_values.length > 0 && stats.unique_values.length <= 10) {
    return { type: 'select', options: stats.unique_values };
  }

  // 4. Numeric column → number input
  if (stats.is_numeric) {
    return { type: 'number' };
  }

  // 5. Fallback: text
  return { type: 'text' };
}

// ── Component ──────────────────────────────────────────────────────────────────

const Predict = () => {
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [loadingDatasets, setLoadingDatasets] = useState(true);

  const [columns, setColumns] = useState([]);
  const [colStats, setColStats] = useState({});
  const [targetColumn, setTargetColumn] = useState('');

  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [loadingModels, setLoadingModels] = useState(true);

  const [featureValues, setFeatureValues] = useState({});
  const [singleResult, setSingleResult] = useState(null);
  const [singleError, setSingleError] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);

  const [batchFile, setBatchFile] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [batchError, setBatchError] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const fileInputRef = useRef(null);

  // ── Load on mount ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingDatasets(true);
      setLoadingModels(true);
      try {
        const [dsRes, mRes] = await Promise.all([
          apiFetch('/api/datasets/list', { headers: authHeaders() }),
          apiFetch('/api/training/compare', { headers: authHeaders() }),
        ]);
        const dsData = await dsRes.json();
        const mData = await mRes.json();
        setDatasets(dsData.datasets || []);
        setModels(mData.experiments?.filter(e => e.status === 'completed') || []);
      } catch (err) {
        console.error('Failed to load prediction data', err);
      } finally {
        setLoadingDatasets(false);
        setLoadingModels(false);
      }
    })();
  }, []);

  // ── Dataset selection ────────────────────────────────────────────────────────
  const handleDatasetChange = (datasetId) => {
    setSelectedDatasetId(datasetId);
    setSelectedModelId('');
    setSingleResult(null);
    setBatchResults(null);
    setSingleError('');
    setBatchError('');

    const ds = datasets.find(d => d.id === parseInt(datasetId));
    if (ds?.metadata?.columns) {
      setColumns(ds.metadata.columns);
      setColStats(ds.metadata.stats || {});
      setTargetColumn(ds.metadata.columns[ds.metadata.columns.length - 1] || '');
    } else {
      setColumns([]);
      setColStats({});
      setTargetColumn('');
    }
  };

  // Exclude the target column AND any serial-number / index columns (Sl.No, ID, etc.)
  const featureCols = columns.filter(col => col !== targetColumn && !isSkipColumn(col));

  // Reset inputs when features change
  useEffect(() => {
    const init = {};
    featureCols.forEach(col => { init[col] = ''; });
    setFeatureValues(init);
    setSingleResult(null);
    setBatchResults(null);
  }, [targetColumn, selectedDatasetId]);

  const matchingModels = models.filter(m => m.config?.dataset_id === parseInt(selectedDatasetId));

  useEffect(() => {
    if (matchingModels.length > 0 && !selectedModelId) {
      setSelectedModelId(matchingModels[0].id.toString());
    }
  }, [matchingModels, selectedModelId]);

  // ── Single prediction ────────────────────────────────────────────────────────
  const handleSinglePredict = async (e) => {
    e.preventDefault();
    if (!selectedModelId) { setSingleError('Please select a trained model'); return; }
    setSingleError('');
    setSingleResult(null);
    setSingleLoading(true);
    try {
      const features = featureCols.map(col => {
        const val = featureValues[col];
        if (val === undefined || val === '') throw new Error(`Please fill in value for "${col}"`);
        const parsed = parseFloat(val);
        return isNaN(parsed) ? val : parsed;
      });
      const res = await apiFetch('/api/predict/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ model_id: parseInt(selectedModelId), features, platt_a: 1.0, platt_b: 0.0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Prediction failed');
      setSingleResult(data);
    } catch (err) {
      setSingleError(err.message);
    } finally {
      setSingleLoading(false);
    }
  };

  // ── Batch prediction ─────────────────────────────────────────────────────────
  const handleBatchPredict = async (e) => {
    e.preventDefault();
    if (!selectedModelId) { setBatchError('Please select a trained model'); return; }
    if (!batchFile) { setBatchError('Please select a CSV file'); return; }
    setBatchError('');
    setBatchResults(null);
    setBatchLoading(true);
    const formData = new FormData();
    formData.append('file', batchFile);
    try {
      const res = await apiFetch(
        `/api/predict/batch?model_id=${parseInt(selectedModelId)}&platt_a=1.0&platt_b=0.0`,
        { method: 'POST', headers: authHeaders(), body: formData }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Batch prediction failed');
      setBatchResults(data.results || []);
    } catch (err) {
      setBatchError(err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  // ── Render a single feature input ────────────────────────────────────────────
  const renderFeatureInput = (col) => {
    const stats = colStats[col] || {};
    const cfg = getInputConfig(col, stats);
    const value = featureValues[col] !== undefined ? featureValues[col] : '';
    const onChange = (e) => setFeatureValues(prev => ({ ...prev, [col]: e.target.value }));

    const baseStyle = {
      width: '100%',
      padding: '9px 12px',
      borderRadius: '8px',
      border: '1px solid var(--border-color)',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
      fontSize: '13px',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s',
    };

    if (cfg.type === 'select') {
      return (
        <select
          className="input-field"
          style={{ ...baseStyle, marginBottom: 0, cursor: 'pointer' }}
          value={value}
          onChange={onChange}
          required
          title={cfg.hint || ''}
        >
          <option value="">— select —</option>
          {cfg.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (cfg.type === 'number') {
      // Do not enforce min/max as hard HTML inputs to allow testing
      // the ML models with abnormal/adversarial values (like negative age).
      return (
        <input
          type="number"
          className="input-field"
          style={{ ...baseStyle, marginBottom: 0 }}
          placeholder={
            cfg.min !== undefined && cfg.max !== undefined
              ? `Typical: ${cfg.min} – ${cfg.max}`
              : 'Numeric value'
          }
          value={value}
          onChange={onChange}
          required
          step={cfg.step ?? 'any'}
          title={cfg.hint || ''}
        />
      );
    }

    return (
      <input
        type="text"
        className="input-field"
        style={{ ...baseStyle, marginBottom: 0 }}
        placeholder="Value"
        value={value}
        onChange={onChange}
        required
      />
    );
  };

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Sparkles size={28} color="var(--accent-primary)" />
        <h1 style={{ fontSize: 'clamp(18px, 4vw, 28px)', fontWeight: 'bold', margin: 0 }} className="text-gradient">
          Interactive Inference &amp; Prediction
        </h1>
      </div>

      {/* ── Step 1: Dataset + Model selection ─────────────────────────── */}
      <div className="glass" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} color="var(--accent-primary)" />
          1. Select Dataset &amp; Trained Model
        </h2>

        {loadingDatasets ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading datasets…</p>
        ) : datasets.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
            <AlertCircle color="var(--danger)" />
            <span style={{ color: 'var(--text-secondary)' }}>
              No datasets found. Upload a CSV on the <strong>Datasets</strong> page first.
            </span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {/* Dataset */}
            <div>
              <label style={labelStyle}>Dataset</label>
              <select className="input-field" style={selectStyle} value={selectedDatasetId} onChange={e => handleDatasetChange(e.target.value)}>
                <option value="">Select a dataset</option>
                {datasets.map(d => <option key={d.id} value={d.id}>{d.filename} (ID: {d.id})</option>)}
              </select>
            </div>

            {selectedDatasetId && columns.length > 0 && <>
              {/* Target column */}
              <div>
                <label style={labelStyle}>Target Column (to predict)</label>
                <select className="input-field" style={selectStyle} value={targetColumn} onChange={e => setTargetColumn(e.target.value)}>
                  {columns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>

              {/* Model */}
              <div>
                <label style={labelStyle}>Trained Model / Experiment</label>
                <select className="input-field" style={selectStyle} value={selectedModelId} onChange={e => setSelectedModelId(e.target.value)}>
                  <option value="">Choose completed model</option>
                  {matchingModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name} — {m.algorithm}</option>
                  ))}
                </select>
              </div>
            </>}
          </div>
        )}
      </div>

      {/* ── Step 2: Prediction forms ───────────────────────────────────── */}
      {selectedDatasetId && columns.length > 0 && (
        <div className="animate-fade-in">
          {matchingModels.length === 0 ? (
            <div className="glass" style={{ padding: '24px', textAlign: 'center' }}>
              <AlertCircle size={32} color="var(--danger)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No Trained Models Found</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Run a federated training job for <strong>{datasets.find(d => d.id === parseInt(selectedDatasetId))?.filename}</strong> first.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>

              {/* ── Single Prediction ──────────────────────────────────── */}
              <div className="glass" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Settings size={18} color="var(--accent-primary)" />
                  Option A: Single Prediction
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                  Fill in feature values below to predict <strong style={{ color: 'var(--accent-primary)' }}>{targetColumn}</strong>.
                  Dropdowns appear for categorical fields; numeric inputs for continuous values.
                </p>

                <form onSubmit={handleSinglePredict}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                    {featureCols.map(col => {
                      const stats = colStats[col] || {};
                      const cfg = getInputConfig(col, stats);
                      return (
                        <div key={col}>
                          <div style={{ marginBottom: '5px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600' }}>
                              {col}
                              {/* Badge showing input type */}
                              <span style={{
                                fontSize: '9px', padding: '1px 5px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                                background: cfg.type === 'select' ? 'rgba(99,102,241,0.15)' : cfg.type === 'number' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)',
                                color: cfg.type === 'select' ? '#818cf8' : cfg.type === 'number' ? '#34d399' : 'var(--text-secondary)',
                              }}>
                                {cfg.type === 'select' ? 'list' : cfg.type === 'number' ? 'num' : 'text'}
                              </span>
                            </label>
                            {cfg.hint && (
                              <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '2px 0 0 0', opacity: 0.7, lineHeight: 1.3 }}>
                                {cfg.hint}
                              </p>
                            )}
                          </div>
                          {renderFeatureInput(col)}
                        </div>
                      );
                    })}
                  </div>

                  {singleError && (
                    <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>
                      ⚠ {singleError}
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={singleLoading}>
                    <Activity size={16} />
                    {singleLoading ? 'Computing Prediction…' : 'Run Single Prediction'}
                  </button>
                </form>

                {singleResult && (
                  <div className="animate-fade-in" style={{ marginTop: '20px', padding: '20px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: 600, fontSize: '15px', marginBottom: '14px' }}>
                      <CheckCircle size={18} /> Prediction Ready
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Target Variable:</span>
                      <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>{targetColumn}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '14px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Predicted Output Class:</span>
                      <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{singleResult.class}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Confidence: {(singleResult.confidence * 100).toFixed(2)}%
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${singleResult.confidence * 100}%`, height: '100%', background: 'linear-gradient(to right, #10b981, #3b82f6)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Batch Prediction ───────────────────────────────────── */}
              <div className="glass" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="var(--accent-primary)" />
                  Option B: Batch Prediction (CSV)
                </h3>

                <div style={{ padding: '12px 14px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '8px', marginBottom: '16px', fontSize: '12px' }}>
                  <p style={{ fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '4px' }}>Expected CSV column order:</p>
                  <code style={{ display: 'block', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px', wordBreak: 'break-all', fontFamily: 'monospace', color: '#60a5fa' }}>
                    {featureCols.join(', ')}
                  </code>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '6px', marginBottom: 0 }}>
                    Omit the target column (<strong>{targetColumn}</strong>).
                  </p>
                </div>

                <form onSubmit={handleBatchPredict}>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{ padding: '30px 16px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.01)', marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'border-color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => setBatchFile(e.target.files[0] || null)} />
                    <UploadCloud size={32} color="var(--text-secondary)" />
                    <p style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500', margin: 0 }}>
                      {batchFile ? batchFile.name : 'Select Features CSV File'}
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>Click to browse</p>
                  </div>

                  {batchError && (
                    <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>
                      {batchError}
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={batchLoading}>
                    <Play size={16} />
                    {batchLoading ? 'Processing Batch Inference…' : 'Run Batch Prediction'}
                  </button>
                </form>

                {batchResults && (
                  <div className="animate-fade-in" style={{ marginTop: '20px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', maxHeight: '280px', overflowY: 'auto' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Batch Results ({batchResults.length} rows)</span>
                      <span style={{ color: 'var(--success)' }}>✔ Done</span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-secondary)' }}>Row</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-secondary)' }}>Class</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-secondary)' }}>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResults.map((r, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '8px' }}>#{r.row}</td>
                            <td style={{ padding: '8px', fontWeight: '600' }}>
                              {r.error ? <span style={{ color: 'var(--danger)' }}>Error</span> : r.class}
                            </td>
                            <td style={{ padding: '8px' }}>
                              {r.error
                                ? <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{r.error}</span>
                                : `${(r.confidence * 100).toFixed(1)}%`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Style constants ────────────────────────────────────────────────────────────
const labelStyle = {
  display: 'block', marginBottom: '6px',
  color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500',
};
const selectStyle = {
  background: 'var(--bg-secondary)', marginBottom: 0,
};

export default Predict;
