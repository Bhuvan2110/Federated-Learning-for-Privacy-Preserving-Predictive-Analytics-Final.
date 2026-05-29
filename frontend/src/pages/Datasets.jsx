import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadCloud, CheckCircle, XCircle, FileText, Eye, RefreshCw, Database, Trash2 } from 'lucide-react';

import { apiFetch, API_BASE, authHeaders } from '../utils/apiFetch';

const Datasets = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [datasets, setDatasets] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const fileInputRef = useRef(null);

  const fetchDatasets = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await apiFetch(`/api/datasets/list`, { headers: authHeaders() });
      const data = await res.json();
      setDatasets(data.datasets || []);
    } catch (_) {
      setError('Failed to load datasets');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const uploadFile = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setError('Only CSV files are allowed.');
      return;
    }
    setError('');
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch(`/api/datasets/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      await fetchDatasets();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const fetchPreview = async (id, name) => {
    if (preview?.id === id) {
      setPreview(null);
      return;
    }
    setLoadingPreview(id);
    try {
      const res = await apiFetch(`/api/datasets/preview/${id}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Preview failed');
      setPreview({ id, name, ...data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPreview(null);
    }
  };

  const deleteDataset = async (id) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      const res = await apiFetch(`/api/datasets/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Delete failed');
      // Remove from local state immediately
      setDatasets(prev => prev.filter(d => d.id !== id));
      if (preview?.id === id) setPreview(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Datasets</h1>
        <button
          onClick={fetchDatasets}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '13px' }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div
        className="glass"
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); uploadFile(e.dataTransfer.files[0]); }}
        style={{
          padding: '48px 20px', textAlign: 'center',
          border: isDragging ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-color)',
          transition: 'all 0.2s', cursor: uploading ? 'not-allowed' : 'pointer',
          marginBottom: '24px', opacity: uploading ? 0.7 : 1,
        }}
      >
        <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }}
          onChange={(e) => { uploadFile(e.target.files[0]); e.target.value = ''; }} />
        {uploading ? (
          <>
            <div style={{ width: '40px', height: '40px', border: '3px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Uploading...</p>
          </>
        ) : (
          <>
            <UploadCloud size={40} color={isDragging ? 'var(--accent-primary)' : 'var(--text-secondary)'} style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', marginBottom: '6px' }}>{isDragging ? 'Drop it here!' : 'Drag & drop your CSV file'}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>or click to browse</p>
            <button className="btn btn-primary" style={{ padding: '8px 20px' }} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Select CSV</button>
          </>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 16px', marginBottom: '20px', color: '#f87171', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <XCircle size={15} /> {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div className="glass" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Database size={16} color="var(--text-secondary)" />
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            My Datasets ({datasets.length})
          </span>
        </div>

        {loadingList ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading...</div>
        ) : datasets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No datasets yet. Upload your first CSV above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {datasets.map((ds) => (
              <div key={ds.id}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
                  border: preview?.id === ds.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  transition: 'border 0.2s',
                }}>
                  <FileText size={18} color="var(--accent-primary)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ds.filename}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                      ID: <strong style={{ color: 'var(--text-primary)' }}>#{ds.id}</strong>
                      &nbsp;·&nbsp; {ds.metadata?.total_rows?.toLocaleString() ?? '?'} rows
                      &nbsp;·&nbsp; {ds.metadata?.columns?.length ?? '?'} cols
                      {ds.created_at && <>&nbsp;·&nbsp; {new Date(ds.created_at).toLocaleString()}</>}
                    </div>
                  </div>

                  {/* Preview button */}
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px', gap: '4px', flexShrink: 0 }}
                    onClick={() => fetchPreview(ds.id, ds.filename)}
                    disabled={loadingPreview === ds.id}
                  >
                    <Eye size={13} />
                    {loadingPreview === ds.id ? 'Loading...' : preview?.id === ds.id ? 'Close' : 'Preview'}
                  </button>

                  {/* Delete button */}
                  {confirmDeleteId === ds.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', color: '#f87171' }}>Delete?</span>
                      <button
                        onClick={() => deleteDataset(ds.id)}
                        disabled={deletingId === ds.id}
                        style={{
                          padding: '5px 10px', fontSize: '12px', borderRadius: '6px',
                          background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)',
                          color: '#f87171', cursor: 'pointer', fontWeight: 600,
                        }}
                      >
                        {deletingId === ds.id ? '...' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        style={{
                          padding: '5px 10px', fontSize: '12px', borderRadius: '6px',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)', cursor: 'pointer',
                        }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(ds.id); }}
                      disabled={deletingId === ds.id}
                      title="Delete dataset"
                      style={{
                        padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', flexShrink: 0,
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {preview?.id === ds.id && (
                  <div style={{ margin: '4px 0 8px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '0 0 8px 8px', border: '1px solid var(--border-color)', borderTop: 'none', overflowX: 'auto' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>First 20 rows</p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr>
                          {preview.preview?.[0] && Object.keys(preview.preview[0]).map((col) => (
                            <th key={col} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.preview?.map((row, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                            {Object.values(row).map((val, j) => (
                              <td key={j} style={{ padding: '5px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Datasets;
