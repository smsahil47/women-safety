import React, { useState, useEffect, useRef } from 'react';
import { Navigation, Play, Square, Users, Battery, Clock, Wifi, X } from 'lucide-react';
import LeafletMap from '../components/ui/LeafletMap';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabase';

const TrackingPage: React.FC = () => {
    const { trackingSession, startTracking, stopTracking, contacts, activeTrackingId } = useApp();
    const active = trackingSession.status === 'active';
    const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
    const [modal, setModal] = useState(false);
    const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
    const locationPushRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        setSelectedContacts(new Set(contacts.map(c => c.id)));
    }, [contacts]);

    useEffect(() => {
        let watchId: number;
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((p) => setCurrentLocation([p.coords.latitude, p.coords.longitude]));
            watchId = navigator.geolocation.watchPosition(
                (position) => setCurrentLocation([position.coords.latitude, position.coords.longitude]),
                (error) => console.error("Error watching GPS", error),
                { enableHighAccuracy: true, maximumAge: 0 }
            );
        }
        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, []);

    // Push live location to Supabase every 5s while tracking is active
    useEffect(() => {
        if (active && activeTrackingId && currentLocation) {
            const push = async () => {
                await supabase
                    .from('tracking_sessions')
                    .update({ current_lat: currentLocation[0], current_lng: currentLocation[1] })
                    .eq('id', activeTrackingId);
            };
            push(); // immediate push
            locationPushRef.current = setInterval(push, 5000);
        } else {
            if (locationPushRef.current) clearInterval(locationPushRef.current);
        }
        return () => {
            if (locationPushRef.current) clearInterval(locationPushRef.current);
        };
    }, [active, activeTrackingId, currentLocation]);

    const [elapsed, setElapsed] = useState('00:00');

    useEffect(() => {
        if (!active) { setElapsed('00:00'); return; }
        const tick = () => {
            const ms = Date.now() - new Date(trackingSession.startTime).getTime();
            const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
            setElapsed(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [active, trackingSession.startTime]);

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
                    {contacts.length === 0 ? (
                        <>
                            <p style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                                Cannot Start Tracking
                            </p>
                            <p style={{ fontSize: 13, color: 'var(--red)', fontWeight: 500 }}>
                                Please add emergency contacts before using the Live Tracking feature.
                            </p>
                        </>
                    ) : (
                        <>
                            <p style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                                {active ? 'Location is being shared with contacts' : 'Start tracking to share your location'}
                            </p>
                            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
                                {active ? 'Your emergency contacts have been notified.' : 'Contacts will be notified when tracking begins.'}
                            </p>
                        </>
                    )}
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
                        ? <button id="start-tracking-btn" disabled={contacts.length === 0} onClick={() => setModal(true)} className="btn btn-primary" style={{ gap: 7 }}>
                            <Play size={14} fill="currentColor" />Start Tracking
                        </button>
                        : <button id="stop-tracking-btn" onClick={stopTracking} className="btn btn-outline" style={{ gap: 7, borderColor: 'rgba(239,68,68,0.3)', color: 'var(--red)' }}>
                            <Square size={14} fill="currentColor" />Stop
                        </button>
                    }
                </div>
            </div>

            {/* Map */}
            <div className="fade-up d2" style={{ height: 350, position: 'relative' }}>
                <LeafletMap 
                    height={350} 
                    center={currentLocation || [20.5937, 78.9629]} 
                    zoom={currentLocation ? 16 : 5} 
                    liveLocation={currentLocation}
                    zones={[]} 
                />
            </div>

            {/* Contacts */}
            <div className="fade-up d3">
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={13} />
                    {active
                        ? `Sharing with (${trackingSession.sharedWith?.length || contacts.length})`
                        : `Emergency Contacts (${contacts.length})`}
                </div>

                {contacts.length === 0 ? (
                    <div className="card card-pad" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <Users size={28} style={{ color: 'var(--text-3)', margin: '0 auto 10px' }} />
                        <p style={{ fontSize: 13.5, color: 'var(--text-2)' }}>No emergency contacts added yet</p>
                    </div>
                ) : (
                    <div className="card" style={{ overflow: 'hidden' }}>
                        {contacts.map((c) => {
                            const isSharing = !active || !trackingSession.sharedWith?.length || trackingSession.sharedWith.includes(c.id);
                            return (
                                <div key={c.id} className="list-row" style={{ opacity: active && !isSharing ? 0.4 : 1 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--indigo-dim)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--indigo)', flexShrink: 0 }}>
                                        {initials(c.name)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="trunc" style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{c.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.relationship} · {c.phone}</div>
                                    </div>
                                    <span className={`badge ${isSharing && active ? 'badge-safe' : 'badge-neutral'}`} style={{ fontSize: 11 }}>
                                        {isSharing && active ? 'Notified' : active ? 'Not included' : 'Standby'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {modal && (
                <div className="modal-mask">
                    <div className="modal-box fade-up">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--indigo-dim)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Navigation size={17} style={{ color: 'var(--indigo)' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Start Live Tracking</div>
                                <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 2 }}>Continuously share your live GPS position</div>
                            </div>
                        </div>

                        <div className="divider" style={{ marginBottom: 16 }} />

                        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 14 }}>
                            Select the emergency contacts you want to share your location with:
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, maxHeight: 150, overflowY: 'auto' }}>
                            {contacts.map(c => (
                                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 0' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedContacts.has(c.id)}
                                        onChange={(e) => {
                                            const newSet = new Set(selectedContacts);
                                            if (e.target.checked) newSet.add(c.id);
                                            else newSet.delete(c.id);
                                            setSelectedContacts(newSet);
                                        }}
                                        style={{ width: 16, height: 16, accentColor: 'var(--indigo)' }}
                                    />
                                    <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{c.name}</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>({c.relationship})</span>
                                </label>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button id="tracking-cancel-modal" onClick={() => setModal(false)}
                                className="btn btn-outline" style={{ flex: 1, gap: 6 }}>
                                <X size={14} />Cancel
                            </button>
                            <button id="tracking-confirm" onClick={() => { setModal(false); startTracking(Array.from(selectedContacts)); }}
                                disabled={selectedContacts.size === 0}
                                className="btn btn-primary" style={{ flex: 1, gap: 6 }}>
                                <Play size={14} fill="currentColor" />Start
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrackingPage;
