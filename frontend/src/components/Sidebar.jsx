import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Database, Activity, Target, LogOut, User, Menu, X } from 'lucide-react';

const Sidebar = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [userEmail, setUserEmail] = useState('');
  const [open, setOpen] = useState(false); // mobile drawer

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const email = localStorage.getItem('userEmail') || '';
    setUserEmail(email);
    const handler = () => setUserEmail(localStorage.getItem('userEmail') || '');
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
    { name: 'Datasets',  icon: <Database size={20} />,        path: '/datasets'  },
    { name: 'Training',  icon: <Activity size={20} />,        path: '/training'  },
    { name: 'Prediction',icon: <Target size={20} />,          path: '/predict'   },
  ];

  const initials = userEmail ? userEmail.charAt(0).toUpperCase() : '?';

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div style={{ marginBottom: '32px', paddingLeft: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '18px', fontWeight: 'bold' }}>FL Platform</h2>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Federated Learning</p>
        </div>
        {/* Close button — visible only on mobile */}
        <button
          onClick={() => setOpen(false)}
          style={{
            display: 'none',
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', padding: '4px',
          }}
          className="close-sidebar-btn"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px', borderRadius: '8px',
              textDecoration: 'none',
              color: isActive ? 'white' : 'var(--text-secondary)',
              background: isActive ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
              borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
              transition: 'all 0.2s', fontSize: '14px',
            })}
          >
            {item.icon}
            <span style={{ fontWeight: 500 }}>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      {userEmail && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', marginBottom: '8px',
          background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
          border: '1px solid var(--border-color)',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary), #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userEmail}
            </p>
            <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '1px' }}>
              {localStorage.getItem('role') || 'User'}
            </p>
          </div>
        </div>
      )}

      <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', gap: '8px', fontSize: '13px' }}>
        <LogOut size={16} /> Logout
      </button>
    </>
  );

  return (
    <>
      {/* ── Hamburger (mobile only) ── */}
      <button className="hamburger" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu size={22} />
      </button>

      {/* ── Overlay (mobile only) ── */}
      <div
        className={`sidebar-overlay${open ? ' open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar panel ── */}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <SidebarContent />
      </aside>

      {/* Inline style to show close btn on mobile */}
      <style>{`
        @media (max-width: 640px) {
          .close-sidebar-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
};

export default Sidebar;
