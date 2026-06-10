import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadCloud, FileText, Eye, RefreshCw, Database, Trash2, XCircle } from 'lucide-react';
import { apiFetch, authHeaders } from '../utils/apiFetch';

const Datasets = () => {
  const [isDragging, setIsDragging]       = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [datasets, setDatasets]           = useState([]);
  const [loadingList, setLoadingList]     = useState(true);
  const [error, setError]                 = useState('');
  const [preview, setPreview]             = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(null);
  const [deletingId, setDeletingId]       = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const fileInputRef = useRef(null);

  const fetchDatasets = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await apiFetch('/api/datasets/list', { headers: authHeaders() });
      const data = await res.json();
      setDatasets(data.datasets || []);
    } catch { setError('Failed to load datasets'); }
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => { fetchDatasets(); }, [fetchDatasets]);

  const uploadFile = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) { setError('Only CSV files are allowed.'); return; }
    setError(''); setUploading(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await apiFetch('/api/datasets/upload', { method:'POST', headers:authHeaders(), body:fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      await fetchDatasets();
    } catch(err) { setError(err.message); }
    finally { setUploading(false); }
  };

  const fetchPreview = async (id, name) => {
    if (preview?.id === id) { setPreview(null); return; }
    setLoadingPreview(id);
    try {
      const res = await apiFetch(`/api/datasets/preview/${id}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Preview failed');
      setPreview({ id, name, ...data });
    } catch(err) { setError(err.message); }
    finally { setLoadingPreview(null); }
  };

  const deleteDataset = async (id) => {
    setDeletingId(id); setConfirmDeleteId(null);
    try {
      const res = await apiFetch(`/api/datasets/${id}`, { method:'DELETE', headers:authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Delete failed');
      setDatasets(prev => prev.filter(d => d.id !== id));
      if (preview?.id === id) setPreview(null);
    } catch(err) { setError(err.message); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'var(--s3)' }}>
          <div>
            <h1 className="page-title">Datasets</h1>
            <p className="page-sub">Upload CSV files to use as training data</p>
          </div>
          <button className="btn btn-secondary" onClick={fetchDatasets} style={{ gap:'5px' }}>
            <RefreshCw size={13}/> Refresh
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`drop-zone${isDragging?' dragging':''}`}
        style={{ marginBottom:'var(--s5)', opacity: uploading ? 0.7 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={e=>{ e.preventDefault(); setIsDragging(true); }}
        onDragLeave={()=>setIsDragging(false)}
        onDrop={e=>{ e.preventDefault(); setIsDragging(false); uploadFile(e.dataTransfer.files[0]); }}
      >
        <input ref={fileInputRef} type="file" accept=".csv" style={{ display:'none' }}
          onChange={e=>{ uploadFile(e.target.files[0]); e.target.value=''; }}/>
        {uploading ? (
          <>
            <div style={{ width:'32px', height:'32px', border:'2px solid var(--primary)', borderTopColor:'transparent', borderRadius:'50%', margin:'0 auto var(--s3)' }} className="spin"/>
            <p style={{ font:'var(--text-body-md)', color:'var(--text-secondary)' }}>Uploading…</p>
          </>
        ) : (
          <>
            <UploadCloud size={32} color={isDragging?'var(--primary)':'var(--text-muted)'} style={{ margin:'0 auto var(--s3)' }}/>
            <h3 style={{ font:'var(--text-headline-md)', color:'var(--text-primary)', marginBottom:'4px' }}>
              {isDragging ? 'Drop it here!' : 'Drag & drop your CSV'}
            </h3>
            <p style={{ font:'var(--text-body-md)', color:'var(--text-secondary)', marginBottom:'var(--s4)' }}>or click to browse</p>
            <button className="btn btn-primary" onClick={e=>{ e.stopPropagation(); fileInputRef.current?.click(); }}>Select CSV file</button>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error">
          <XCircle size={14} style={{ flexShrink:0 }}/> {error}
          <button className="alert-dismiss" onClick={()=>setError('')}>✕</button>
        </div>
      )}

      {/* Dataset list */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'var(--s2)', padding:'12px var(--s4)', borderBottom:'0.5px solid var(--border-subtle)' }}>
          <Database size={14} color="var(--text-muted)"/>
          <span className="overline">My Datasets ({datasets.length})</span>
        </div>

        {loadingList ? (
          <div style={{ padding:'var(--s8)', display:'flex', flexDirection:'column', gap:'var(--s3)' }}>
            {[1,2,3].map(i=><div key={i} className="skeleton" style={{ height:'52px', borderRadius:'var(--r)' }}/>)}
          </div>
        ) : datasets.length === 0 ? (
          <div style={{ padding:'40px', textAlign:'center', color:'var(--text-secondary)', font:'var(--text-body-md)' }}>
            No datasets yet — upload your first CSV above.
          </div>
        ) : (
          <div>
            {datasets.map((ds, idx) => (
              <div key={ds.id} style={{ borderBottom: idx < datasets.length-1 ? '0.5px solid var(--border-subtle)' : 'none' }}>
                <div style={{
                  display:'flex', alignItems:'center', flexWrap:'wrap', gap:'var(--s3)',
                  padding:'11px var(--s4)',
                  background: preview?.id===ds.id ? 'var(--primary-fixed)' : 'transparent',
                  transition:'background 0.15s',
                }}>
                  <div style={{ width:'32px', height:'32px', borderRadius:'var(--r)', background:'var(--surface-low)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <FileText size={15} color="var(--phase-training)"/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ font:'var(--text-headline-md)', color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:'2px' }}>{ds.filename}</p>
                    <p style={{ font:'var(--text-data)', color:'var(--text-muted)' }}>
                      <code>#{ds.id}</code>
                      &nbsp;·&nbsp; {ds.metadata?.total_rows?.toLocaleString()??'?'} rows
                      &nbsp;·&nbsp; {ds.metadata?.columns?.length??'?'} cols
                      {ds.created_at && <>&nbsp;·&nbsp; {new Date(ds.created_at).toLocaleDateString()}</>}
                    </p>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'var(--s2)', flexShrink:0 }}>
                    <button className="btn btn-secondary" style={{ padding:'5px 10px', gap:'4px' }}
                      onClick={()=>fetchPreview(ds.id, ds.filename)} disabled={loadingPreview===ds.id}>
                      <Eye size={12}/>{loadingPreview===ds.id?'Loading…':preview?.id===ds.id?'Close':'Preview'}
                    </button>
                    {confirmDeleteId===ds.id ? (
                      <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                        <span style={{ font:'var(--text-label-sm)', color:'var(--error)' }}>Delete?</span>
                        <button onClick={()=>deleteDataset(ds.id)} disabled={deletingId===ds.id} className="btn btn-danger" style={{ padding:'4px 10px' }}>
                          {deletingId===ds.id?'…':'Yes'}
                        </button>
                        <button onClick={()=>setConfirmDeleteId(null)} className="btn btn-secondary" style={{ padding:'4px 8px' }}>No</button>
                      </div>
                    ) : (
                      <button onClick={e=>{e.stopPropagation();setConfirmDeleteId(ds.id);}} disabled={deletingId===ds.id}
                        className="btn btn-danger" style={{ padding:'5px 8px' }} title="Delete">
                        <Trash2 size={13}/>
                      </button>
                    )}
                  </div>
                </div>

                {/* Preview table */}
                {preview?.id===ds.id && (
                  <div style={{ padding:'var(--s3) var(--s4) var(--s4)', background:'var(--surface-low)', borderTop:'0.5px solid var(--border-subtle)' }}>
                    <p style={{ font:'var(--text-micro)', color:'var(--text-muted)', marginBottom:'var(--s3)', letterSpacing:'0.07em', textTransform:'uppercase' }}>
                      Preview — first 20 rows
                    </p>
                    <div className="table-scroll" style={{ border:'0.5px solid var(--border-subtle)', borderRadius:'var(--r)', background:'var(--bg-card)', overflow:'hidden' }}>
                      <table className="data-table" style={{ fontSize:'11px' }}>
                        <thead>
                          <tr>{preview.preview?.[0] && Object.keys(preview.preview[0]).map(col=>(
                            <th key={col} style={{ whiteSpace:'nowrap' }}>{col}</th>
                          ))}</tr>
                        </thead>
                        <tbody>
                          {preview.preview?.map((row,i)=>(
                            <tr key={i}>
                              {Object.values(row).map((val,j)=>(
                                <td key={j} style={{ whiteSpace:'nowrap', maxWidth:'140px', overflow:'hidden', textOverflow:'ellipsis' }}>{String(val)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
