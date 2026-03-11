import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
    Shield, Map, Navigation, AlertTriangle, Users,
    FileText, Activity, LogOut, Menu, X, Bell
} from 'lucide-react';

const NAV = [
    { to: '/dashboard', label: 'Dashboard', icon: <Activity size={16} /> },
    { to: '/safe-route', label: 'Safe Route', icon: <Map size={16} /> },
    { to: '/tracking', label: 'Live Tracking', icon: <Navigation size={16} /> },
    { to: '/sos', label: 'SOS Alert', icon: <AlertTriangle size={16} />, sos: true },
    { to: '/contacts', label: 'Emergency Contacts', icon: <Users size={16} /> },
    { to: '/reports', label: 'Community Reports', icon: <FileText size={16} /> },
    { to: '/heatmap', label: 'Safety Heatmap', icon: <Shield size={16} /> },
];

const Spinner = () => (
    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
);

export { Spinner };

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [open, setOpen] = useState(false);
    const { user, logout } = useApp();
    const navigate = useNavigate();
    const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'PS';

    const close = () => setOpen(false);

    return (
        <div className="layout">
            {/* Mobile overlay */}
            {open && (
                <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.5)' }} />
            )}

            {/* Sidebar */}
            <aside className={`sidebar${open ? ' open' : ''}`}>
                <div className="sidebar-logo">
                    <div className="logo-icon"><Shield size={15} color="#fff" /></div>
                    <span className="logo-name">Safe<span>Route</span></span>
                    <button className="no-btn" onClick={close} style={{ marginLeft: 'auto', color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>
                        <X size={16} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section">Navigation</div>
                    {NAV.map(item => (
                        <NavLink key={item.to} to={item.to} onClick={close}
                            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                            {item.icon}
                            <span style={{ flex: 1 }}>{item.label}</span>
                            {item.sos && (
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-row">
                        <div className="avatar">{initials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="trunc" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{user?.name ?? 'Priya Sharma'}</div>
                            <div className="trunc" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{user?.email ?? 'priya@email.com'}</div>
                        </div>
                        <button className="no-btn" onClick={() => { logout(); navigate('/login'); }}
                            title="Logout"
                            style={{ color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: '4px' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                            <LogOut size={15} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Content */}
            <div className="content" style={{ marginLeft: 240 }}>
                <header className="topbar" style={{ justifyContent: 'space-between' }}>
                    <div className="flex items-center gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)} id="mobile-menu"
                            style={{ padding: '6px', display: 'flex', alignItems: 'center' }}>
                            <Menu size={18} />
                        </button>
                        <div className="topbar-lg flex items-center gap-2">
                            <span className="status-dot dot-green" />
                            <span className="text-xs c-text3 fw-500">All systems operational</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="btn btn-ghost btn-sm" style={{ padding: '6px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Bell size={16} />
                            <span style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: '50%', background: 'var(--indigo)' }} />
                        </button>
                        <div className="avatar avatar-lg">{initials}</div>
                    </div>
                </header>

                <main className="main">{children}</main>
            </div>

            <style>{`
        @media(min-width:1025px){ #mobile-menu { display:none !important; } .sidebar { transform: translateX(0) !important; } }
      `}</style>
        </div>
    );
};

export default MainLayout;
