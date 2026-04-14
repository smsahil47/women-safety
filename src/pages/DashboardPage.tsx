import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Navigation, AlertTriangle, FileText, Shield, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SAFETY_TIPS } from '../services/mockData';
import { fetchUserStats } from '../services/api';
import type { ActivityType } from '../types';

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
    route: <Map size={14} />,
    tracking: <Navigation size={14} />,
    sos: <AlertTriangle size={14} />,
    report: <FileText size={14} />,
    contact: <Shield size={14} />,
};

const timeAgo = (iso: string) => {
    const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
    if (h < 1) return 'Just now'; if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};

interface Stats {
    reportsCount: number;
    trackingCount: number;
}

const DashboardPage: React.FC = () => {
    const { user, contacts } = useApp();
    const navigate = useNavigate();
    const name = user?.name?.split(' ')[0] ?? 'there';
    const [stats, setStats] = useState<Stats>({ reportsCount: 0, trackingCount: 0 });
    const [statsLoading, setStatsLoading] = useState(true);

    // Greeting based on time of day
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    useEffect(() => {
        if (!user?.id) { setStatsLoading(false); return; }
        fetchUserStats(user.id)
            .then(s => setStats(s))
            .catch(() => {})
            .finally(() => setStatsLoading(false));
    }, [user?.id]);

    const ACTIONS = [
        { id: 'ac-route', to: '/safe-route', icon: <Map size={18} />, title: 'Safe Route', desc: 'Find the safest path to your destination', color: 'var(--indigo)' },
        { id: 'ac-tracking', to: '/tracking', icon: <Navigation size={18} />, title: 'Live Tracking', desc: 'Share your location with emergency contacts', color: '#38bdf8' },
        { id: 'ac-sos', to: '/sos', icon: <AlertTriangle size={18} />, title: 'SOS Alert', desc: 'Trigger an emergency alert instantly', color: 'var(--red)' },
        { id: 'ac-report', to: '/reports', icon: <FileText size={18} />, title: 'Report Incident', desc: 'Flag an unsafe area for the community', color: 'var(--amber)' },
    ];

    const METRICS = [
        { label: 'Emergency Contacts', value: statsLoading ? '—' : contacts.length.toString(), sub: 'Saved' },
        { label: 'Tracking Sessions', value: statsLoading ? '—' : stats.trackingCount.toString(), sub: 'All time' },
        { label: 'Reports Submitted', value: statsLoading ? '—' : stats.reportsCount.toString(), sub: 'All time' },
        { label: 'Safety Score', value: '94', sub: 'Out of 100' },
    ];

    // Generate recent activities from stats
    const recentActivities = [
        contacts.length > 0 && {
            id: 'act-contacts',
            type: 'contact' as ActivityType,
            title: 'Emergency Contacts Ready',
            description: `${contacts.length} contact${contacts.length !== 1 ? 's' : ''} saved`,
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        stats.reportsCount > 0 && {
            id: 'act-reports',
            type: 'report' as ActivityType,
            title: 'Community Reports Submitted',
            description: `${stats.reportsCount} report${stats.reportsCount !== 1 ? 's' : ''} submitted`,
            timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        },
        stats.trackingCount > 0 && {
            id: 'act-tracking',
            type: 'tracking' as ActivityType,
            title: 'Tracking Sessions Completed',
            description: `${stats.trackingCount} session${stats.trackingCount !== 1 ? 's' : ''} recorded`,
            timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
        },
        {
            id: 'act-welcome',
            type: 'route' as ActivityType,
            title: 'Welcome to SafeRoute',
            description: 'Your safety companion is active',
            timestamp: user?.createdAt || new Date().toISOString(),
        },
    ].filter(Boolean) as { id: string; type: ActivityType; title: string; description: string; timestamp: string }[];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Page header */}
            <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, paddingBottom: 20, borderBottom: '1px solid var(--border-soft)' }}>
                <div>
                    <h1 className="page-title">{greeting}, {name} 👋</h1>
                    <p className="page-subtitle" style={{ marginTop: 4 }}>Here's an overview of your safety activity</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--green-dim)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6 }}>
                    <span className="status-dot dot-green" />
                    <span style={{ fontSize: 12.5, color: 'var(--green)', fontWeight: 500 }}>Safe Mode Active</span>
                </div>
            </div>

            {/* Metrics */}
            <div className="fade-up d1 grid-4">
                {METRICS.map((m, i) => (
                    <div key={m.label} className="metric-card" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="metric-num">{m.value}</div>
                        <div className="metric-label">{m.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{m.sub}</div>
                    </div>
                ))}
            </div>

            {/* Quick actions */}
            <div className="fade-up d2">
                <div className="section-title">Quick Actions</div>
                <div className="grid-auto">
                    {ACTIONS.map(a => (
                        <button key={a.id} id={a.id} onClick={() => navigate(a.to)} className="action-card card">
                            <div className="action-icon" style={{ background: `${a.color}18`, border: `1px solid ${a.color}30` }}>
                                <span style={{ color: a.color }}>{a.icon}</span>
                            </div>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{a.title}</div>
                                <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>{a.desc}</div>
                            </div>
                            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: 'var(--text-3)' }}>
                                <ArrowRight size={13} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Lower row */}
            <div className="fade-up d3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                {/* Recent activity */}
                <div className="card">
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7 }}>
                            <Clock size={14} style={{ color: 'var(--text-3)' }} />Recent Activity
                        </span>
                    </div>
                    {recentActivities.length === 0 ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5 }}>
                            No activity yet. Start using SafeRoute!
                        </div>
                    ) : (
                        recentActivities.slice(0, 5).map((a) => (
                            <div key={a.id} className="list-row">
                                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', flexShrink: 0 }}>
                                    {ACTIVITY_ICONS[a.type]}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="trunc" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{a.title}</div>
                                    <div className="trunc" style={{ fontSize: 12, color: 'var(--text-3)' }}>{a.description}</div>
                                </div>
                                <div style={{ fontSize: 11.5, color: 'var(--text-3)', flexShrink: 0 }}>{timeAgo(a.timestamp)}</div>
                            </div>
                        ))
                    )}
                </div>

                {/* Safety tips */}
                <div className="card">
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <TrendingUp size={14} style={{ color: 'var(--text-3)' }} />
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>Safety Tips</span>
                    </div>
                    {SAFETY_TIPS.slice(0, 5).map((t, i) => (
                        <div key={i} className="list-row" style={{ alignItems: 'flex-start', padding: '11px 16px' }}>
                            <span style={{ fontSize: 16, lineHeight: 1.3, flexShrink: 0 }}>{t.icon}</span>
                            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{t.tip}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
