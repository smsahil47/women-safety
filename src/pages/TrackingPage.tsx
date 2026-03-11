import React from 'react';
import { Navigation, Play, Square, Users, Battery, Clock, Wifi } from 'lucide-react';
import MapBox from '../components/ui/MapPlaceholder';
import { useApp } from '../context/AppContext';

const TrackingPage: React.FC = () => {
    const { trackingSession, startTracking, stopTracking, contacts } = useApp();
    const active = trackingSession.status === 'active';

    const elapsed = (() => {
        if (!active) return '00:00';
        const ms = Date.now() - new Date(trackingSession.startTime).getTime();
        const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    })();

    const initials = (n: string) => n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Header */}
            <div className="fade-up" style={{ paddingBottom: 20, borderBottom: '1px solid var(--border-soft)' }}>
                <h1 className="page-title">Live Tracking</h1>
                <p className="page-subtitle">Share your real-time location with emergency contacts</p>
            </div>

            {/* Status card */}
            <div className="fade-up d1 card card-pad" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? 'var(--green)' : 'var(--text-3)', flexShrink: 0 }}>
                    <Navigation size={22} />
                </div>

                <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                        <span className={`status-dot ${active ? 'dot-green' : 'dot-gray'}`} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: active ? 'var(--green)' : 'var(--text-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            {active ? 'Tracking Active' : 'Not Tracking'}
                        </span>
                    </div>
                    <p style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                        {active ? 'Location is being shared with contacts' : 'Start tracking to share your location'}
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
                        {active ? 'Your emergency contacts have been notified.' : 'Contacts will be notified when tracking begins.'}
                    </p>
                </div>

                {active && (
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', flexShrink: 0 }}>
                        {[
                            { icon: <Clock size={13} />, label: 'Elapsed', val: elapsed },
                            { icon: <Battery size={13} />, label: 'Battery', val: `${trackingSession.batteryLevel ?? 87}%` },
                            { icon: <Wifi size={13} />, label: 'Signal', val: 'Good' },
                        ].map(s => (
                            <div key={s.label} style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', color: 'var(--text-3)', marginBottom: 3 }}>{s.icon}<span style={{ fontSize: 11 }}>{s.label}</span></div>
                                <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{s.val}</div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ flexShrink: 0 }}>
                    {!active
                        ? <button id="start-tracking-btn" onClick={startTracking} className="btn btn-primary" style={{ gap: 7 }}>
                            <Play size={14} fill="currentColor" />Start Tracking
                        </button>
                        : <button id="stop-tracking-btn" onClick={stopTracking} className="btn btn-outline" style={{ gap: 7, borderColor: 'rgba(239,68,68,0.3)', color: 'var(--red)' }}>
                            <Square size={14} fill="currentColor" />Stop
                        </button>
                    }
                </div>
            </div>

            {/* Map */}
            <div className="fade-up d2">
                <MapBox height={340} label={active ? 'Live Location' : 'Map Preview'} />
            </div>

            {/* Contacts */}
            <div className="fade-up d3">
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={13} />Sharing with ({contacts.length})
                </div>

                {contacts.length === 0 ? (
                    <div className="card card-pad" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <Users size={28} style={{ color: 'var(--text-3)', margin: '0 auto 10px' }} />
                        <p style={{ fontSize: 13.5, color: 'var(--text-2)' }}>No emergency contacts added yet</p>
                    </div>
                ) : (
                    <div className="card" style={{ overflow: 'hidden' }}>
                        {contacts.map((c, i) => (
                            <div key={c.id} className="list-row">
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--indigo-dim)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--indigo)', flexShrink: 0 }}>
                                    {initials(c.name)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="trunc" style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{c.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.relationship} · {c.phone}</div>
                                </div>
                                <span className={`badge ${active ? 'badge-safe' : 'badge-neutral'}`} style={{ fontSize: 11 }}>
                                    {active ? 'Notified' : 'Standby'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrackingPage;
