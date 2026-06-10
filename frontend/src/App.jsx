import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Datasets from './pages/Datasets';
import Training from './pages/Training';
import Predict from './pages/Predict';
import Comparison from './pages/Comparison';
import Sidebar from './components/Sidebar';

/* ── Topbar ──────────────────────────────────────────────────────────────────── */
const ROUTE_LABELS = {
  '/dashboard': 'Research Dashboard',
  '/datasets':  'Dataset Management',
  '/training':  'Training Monitor',
  '/predict':   'Prediction Engine',
  '/compare':   'Model Comparison',
};

const Topbar = () => {
  const location = useLocation();
  const label = ROUTE_LABELS[location.pathname] || 'FedLearn OS';
  return (
    <header style={{
      height: '52px',
      background: 'var(--surface-lowest)',
      borderBottom: '0.5px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--s6)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <span style={{ font: 'var(--text-headline-md)', color: 'var(--primary)' }}>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:'var(--s2)' }}>
        <div style={{
          height:'24px', padding:'0 var(--s2)',
          background:'var(--surface-high)',
          border:'0.5px solid var(--border-subtle)',
          borderRadius:'var(--r-sm)',
          display:'flex', alignItems:'center', gap:'5px',
          font:'var(--text-data)', color:'var(--text-muted)',
        }}>
          <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#085041', animation:'pulse-dot 2s ease-in-out infinite' }}></span>
          Kinetic Privacy v2
        </div>
      </div>
    </header>
  );
};

const Layout = ({ children }) => (
  <div className="app-container">
    <Sidebar />
    <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, minHeight:'100vh' }}>
      <Topbar />
      <main className="main-content">{children}</main>
    </div>
  </div>
);

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/"          element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/datasets"  element={<Datasets />} />
                <Route path="/training"  element={<Training />} />
                <Route path="/predict"   element={<Predict />} />
                <Route path="/compare"   element={<Comparison />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }/>
      </Routes>
    </Router>
  );
}

export default App;
