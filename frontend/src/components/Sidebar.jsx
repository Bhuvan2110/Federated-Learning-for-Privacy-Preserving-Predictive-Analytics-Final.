import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Database, Activity, Target, LogOut, Menu, X, Shield, GitCompare } from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState('');
  const [role, setRole] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  useEffect(() => {
    setUserEmail(localStorage.getItem('userEmail') || '');
    setRole(localStorage.getItem('role') || 'user');
    const handler = () => {
      setUserEmail(localStorage.getItem('userEmail') || '');
      setRole(localStorage.getItem('role') || 'user');
    };
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
    { name: 'Dashboard', icon: <LayoutDashboard size={16} />, path: '/dashboard' },
    { name: 'Datasets',  icon: <Database size={16} />,        path: '/datasets'  },
    { name: 'Training',  icon: <Activity size={16} />,        path: '/training'  },
    { name: 'Prediction',icon: <Target size={16} />,          path: '/predict'   },
    { name: 'Compare',   icon: <GitCompare size={16} />,      path: '/compare'   },
  ];

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ font: 'var(--text-headline-lg)', color: 'var(--on-primary)', letterSpacing: '-0.01em' }}>
              FedLearn OS
            </h2>
            <p style={{ font: 'var(--text-data)', color: 'rgba(255,255,255,0.5)', marginTop: '3px', letterSpacing: '0' }}>
              Federated Learning Platform
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="close-sidebar-btn"
            style={{ display:'none', background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', padding:'4px' }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:'2px' }}>
        {navItems.map(item => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* User card */}
      {userEmail && (
        <div style={{
          marginTop: 'auto',
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 'var(--r)',
          border: '0.5px solid rgba(255,255,255,0.1)',
          marginBottom: '8px',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{
              width:'28px', height:'28px', borderRadius:'50%',
              background: 'var(--primary-fixed)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'12px', fontWeight:700, color:'var(--primary)', flexShrink:0,
            }}>
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth:0 }}>
              <p style={{ font:'var(--text-label-sm)', color:'rgba(255,255,255,0.85)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {userEmail}
              </p>
              <p style={{ font:'var(--text-data)', color:'rgba(255,255,255,0.45)', marginTop:'1px', display:'flex', alignItems:'center', gap:'3px' }}>
                <Shield size={9} />
                {role}
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleLogout}
        className="nav-link"
        style={{ color:'rgba(255,255,255,0.5)' }}
      >
        <LogOut size={16} />
        <span>Logout</span>
      </button>
    </>
  );

  return (
    <>
      <button className="hamburger" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu size={20} />
      </button>
      <div className={`sidebar-overlay${open ? ' open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <SidebarContent />
      </aside>
      <style>{`@media(max-width:640px){.close-sidebar-btn{display:flex!important}}`}</style>
    </>
  );
};

export default Sidebar;
