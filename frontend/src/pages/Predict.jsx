import React, { useState, useRef, useEffect } from 'react';
import { Database, Settings, FileText, CheckCircle, UploadCloud, Play, ArrowRight, Sparkles, Activity, AlertCircle, BarChart2 } from 'lucide-react';

import { apiFetch, API_BASE, authHeaders } from '../utils/apiFetch';

const Predict = () => {
  // Datasets list
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [loadingDatasets, setLoadingDatasets] = useState(true);

  // Columns & Target state
  const [columns, setColumns] = useState([]);
  const [targetColumn, setTargetColumn] = useState('');

  // All completed experiments (trained models)
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [loadingModels, setLoadingModels] = useState(true);

  // Interactive Single Prediction inputs
  const [featureValues, setFeatureValues] = useState({});
  const [singleResult, setSingleResult] = useState(null);
  const [singleError, setSingleError] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);

  // Batch prediction state
  const [batchFile, setBatchFile] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [batchError, setBatchError] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch datasets and completed models on mount
  const loadInitialData = async () => {
    setLoadingDatasets(true);
    setLoadingModels(true);
    try {
      const dsRes = await apiFetch(`/api/datasets/list`, { headers: authHeaders() });
      const dsData = await dsRes.json();
      setDatasets(dsData.datasets || []);

      const mRes = await apiFetch(`/api/training/compare`, { headers: authHeaders() });
      const mData = await mRes.json();
      setModels(mData.experiments?.filter(e => e.status === 'completed') || []);
    } catch (err) {
      console.error('Failed to load initial prediction data', err);
    } finally {
      setLoadingDatasets(false);
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // When selected dataset changes
  const handleDatasetChange = (datasetId) => {
    setSelectedDatasetId(datasetId);
    setSelectedModelId('');
    setSingleResult(null);
    setBatchResults(null);
    setSingleError('');
    setBatchError('');

    const ds = datasets.find(d => d.id === parseInt(datasetId));
    if (ds && ds.metadata && ds.metadata.columns) {
      const cols = ds.metadata.columns;
      setColumns(cols);
      // Default to the last column as the target
      const defaultTarget = cols[cols.length - 1] || '';
      setTargetColumn(defaultTarget);
    } else {
      setColumns([]);
      setTargetColumn('');
    }
  };

  // Compute feature columns (all columns except the target column)
  const featureCols = columns.filter(col => col !== targetColumn);

  // Reset/Initialize input fields when features list changes
  useEffect(() => {
    const initialVals = {};
    featureCols.forEach(col => {
      initialVals[col] = '';
    });
    setFeatureValues(initialVals);
    setSingleResult(null);
    setBatchResults(null);
  }, [targetColumn, selectedDatasetId]);

  // Filter completed models that match the selected dataset ID
  const matchingModels = models.filter(m => m.config?.dataset_id === parseInt(selectedDatasetId));

  // Automatically select the first matching model
  useEffect(() => {
    if (matchingModels.length > 0 && !selectedModelId) {
      setSelectedModelId(matchingModels[0].id.toString());
    }
  }, [matchingModels, selectedModelId]);

  // Submit Single Prediction
  const handleSinglePredict = async (e) => {
    e.preventDefault();
    if (!selectedModelId) { setSingleError('Please select a trained model'); return; }
    if (featureCols.length === 0) { setSingleError('No features available'); return; }

    setSingleError('');
    setSingleResult(null);
    setSingleLoading(true);

    try {
      // Collect and validate feature values in order of the featureCols list
      const features = featureCols.map(col => {
        const valStr = featureValues[col];
        if (valStr === undefined || valStr === '') {
          throw new Error(`Please fill in value for ${col}`);
        }
        const parsed = parseFloat(valStr);
        return isNaN(parsed) ? valStr : parsed;
      });

      const res = await apiFetch(`/api/predict/single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          model_id: parseInt(selectedModelId),
          features: features,
          platt_a: 1.0,
          platt_b: 0.0
        })
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

  // Submit Batch Prediction
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
        {
          method: 'POST',
          headers: authHeaders(),
          body: formData,
        }
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

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Sparkles size={28} color="var(--accent-primary)" />
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }} className="text-gradient">
          Interactive Inference & Prediction
        </h1>
      </div>

      {/* Dataset & Targeting Configuration Row */}
      <div className="glass" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} color="var(--accent-primary)" />
          1. Select Trained Dataset & Target Variable
        </h2>

        {loadingDatasets ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading uploaded datasets...</p>
        ) : datasets.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
            <AlertCircle color="var(--danger)" />
            <span style={{ color: 'var(--text-secondary)' }}>
              No datasets found. Please go to the <strong>Datasets</strong> page to upload a CSV and train a model first.
            </span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500' }}>
                Select Dataset
              </label>
              <select
                className="input-field"
                style={{ background: 'var(--bg-secondary)', marginBottom: 0 }}
                value={selectedDatasetId}
                onChange={(e) => handleDatasetChange(e.target.value)}
              >
                <option value="">Select a dataset</option>
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.filename} (ID: {d.id})
                  </option>
                ))}
              </select>
            </div>

            {selectedDatasetId && columns.length > 0 && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500' }}>
                    Target Column (To Predict)
                  </label>
                  <select
                    className="input-field"
                    style={{ background: 'var(--bg-secondary)', marginBottom: 0 }}
                    value={targetColumn}
                    onChange={(e) => setTargetColumn(e.target.value)}
                  >
                    {columns.map(col => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500' }}>
                    Trained Model / Experiment
                  </label>
                  <select
                    className="input-field"
                    style={{ background: 'var(--bg-secondary)', marginBottom: 0 }}
                    value={selectedModelId}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                  >
                    <option value="">Choose completed model</option>
                    {matchingModels.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} (ID: {m.id} - {m.algorithm})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Prediction Forms */}
      {selectedDatasetId && columns.length > 0 && (
        <div className="animate-fade-in">
          {matchingModels.length === 0 ? (
            <div className="glass" style={{ padding: '24px', textAlign: 'center' }}>
              <AlertCircle size={32} color="var(--danger)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No Trained Models Found</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '500px', margin: '0 auto' }}>
                There are no completed models for the dataset <strong>{datasets.find(d => d.id === parseInt(selectedDatasetId))?.filename}</strong>. Please go to the Training tab to run federated simulation first.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', alignItems: 'start' }}>
              
              {/* Single Prediction Form */}
              <div className="glass" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Settings size={18} color="var(--accent-primary)" />
                  Option A: Single Prediction
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                  Enter feature values (numerical or text/categorical like 'male', 'female', names) to predict the target variable <strong>{targetColumn}</strong>.
                </p>

                <form onSubmit={handleSinglePredict}>
                  {/* Dynamic inputs for feature columns */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                    {featureCols.map(col => (
                      <div key={col}>
                        <label style={{ display: 'block', marginBottom: '4px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={col}>
                          {col}
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          style={{ marginBottom: 0 }}
                          placeholder="Value (e.g. 5.1, male, Yes)"
                          value={featureValues[col] !== undefined ? featureValues[col] : ''}
                          onChange={(e) => setFeatureValues({ ...featureValues, [col]: e.target.value })}
                          required
                        />
                      </div>
                    ))}
                  </div>

                  {singleError && (
                    <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>
                      {singleError}
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={singleLoading}>
                    <Activity size={16} />
                    {singleLoading ? 'Computing Prediction...' : 'Run Single Prediction'}
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
                      <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{singleResult.class}</span>
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Confidence Score: {(singleResult.confidence * 100).toFixed(2)}%
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${singleResult.confidence * 100}%`, height: '100%', background: 'linear-gradient(to right, #10b981, #3b82f6)', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Batch Prediction Form */}
              <div className="glass" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="var(--accent-primary)" />
                  Option B: Batch Prediction (CSV)
                </h3>
                
                <div style={{ padding: '12px 14px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '8px', marginBottom: '16px', fontSize: '12px' }}>
                  <p style={{ fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} /> Expected CSV Layout:
                  </p>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    The CSV should contain headers and rows with feature values (numeric, text, or categorical values are supported) in the exact order:
                  </p>
                  <code style={{ display: 'block', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px', wordBreak: 'break-all', fontFamily: 'monospace', color: '#60a5fa', marginBottom: '6px' }}>
                    {featureCols.join(', ')}
                  </code>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: 0 }}>
                    * The target column (<strong>{targetColumn}</strong>) and ID columns should be omitted.
                  </p>
                </div>

                <form onSubmit={handleBatchPredict}>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '30px 16px', textAlign: 'center',
                      border: '1px dashed var(--border-color)', borderRadius: '12px',
                      cursor: 'pointer', background: 'rgba(255,255,255,0.01)',
                      marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      style={{ display: 'none' }}
                      onChange={(e) => setBatchFile(e.target.files[0] || null)}
                    />
                    <UploadCloud size={32} color="var(--text-secondary)" />
                    <p style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500', margin: 0 }}>
                      {batchFile ? batchFile.name : 'Select Features CSV File'}
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>
                      Drag & drop or browse your local files
                    </p>
                  </div>

                  {batchError && (
                    <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>
                      {batchError}
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={batchLoading}>
                    <Play size={16} />
                    {batchLoading ? 'Processing Batch Inference...' : 'Run Batch Prediction'}
                  </button>
                </form>

                {batchResults && (
                  <div className="animate-fade-in" style={{ marginTop: '20px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', maxHeight: '280px', overflowY: 'auto' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Batch Results ({batchResults.length} Rows)</span>
                      <span style={{ color: 'var(--success)' }}>Success</span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-secondary)' }}>Row</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-secondary)' }}>Output Class</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-secondary)' }}>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResults.map((r, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', hover: { background: 'rgba(255,255,255,0.01)' } }}>
                            <td style={{ padding: '8px' }}>Row #{r.row}</td>
                            <td style={{ padding: '8px', fontWeight: '600' }}>
                              {r.error ? (
                                <span style={{ color: 'var(--danger)' }}>Error</span>
                              ) : (
                                r.class
                              )}
                            </td>
                            <td style={{ padding: '8px' }}>
                              {r.error ? (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{r.error}</span>
                              ) : (
                                <span style={{ fontWeight: '500' }}>{(r.confidence * 100).toFixed(1)}%</span>
                              )}
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

export default Predict;
