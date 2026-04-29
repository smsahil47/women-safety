import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Navigation, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import LeafletMap from '../components/ui/LeafletMap';

interface TrackingInfo {
    userName: string;
    lat: number | null;
    lng: number | null;
    startedAt: string;
    status: string;
}

const LiveTrackPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [info, setInfo] = useState<TrackingInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchLocation = async () => {
        if (!sessionId) return;
        try {
            const { data, error: dbErr } = await supabase
                .from('tracking_sessions')
                .select('current_lat, current_lng, started_at, status, user_id')
                .eq('id', sessionId)
                .single();

            if (dbErr || !data) {
                setError('Tracking session not found or has ended.');
                setLoading(false);
                return;
            }

            // Fetch user name
            const { data: profile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', data.user_id)
                .single();

            setInfo({
                userName: profile?.name || 'Unknown User',
                lat: data.current_lat,
                lng: data.current_lng,
                startedAt: data.started_at,
                status: data.status,
            });
            setLastUpdated(new Date());
        } catch {
            setError('Failed to load tracking data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocation();
        // Poll every 5 seconds for live location updates
        intervalRef.current = setInterval(fetchLocation, 5000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [sessionId]);

    const elapsed = () => {
        if (!info?.startedAt) return '';
        const ms = Date.now() - new Date(info.startedAt).getTime();
        const m = Math.floor(ms / 60000);
        const h = Math.floor(m / 60);
        if (h > 0) return `${h}h ${m % 60}m`;
        return `${m}m`;
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f11', color: '#fff', flexDirection: 'column', gap: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#a78bfa', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Loading live location…</p>
        </div>
    );

    if (error || (info?.status === 'inactive')) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f11', color: '#fff', flexDirection: 'column', gap: 16, padding: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={28} style={{ color: '#ef4444' }} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600 }}>{error || 'Tracking session has ended'}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>The person has stopped sharing their location.</p>
        </div>
    );

    const hasLocation = info?.lat != null && info?.lng != null;
    const center: [number, number] = hasLocation ? [info!.lat!, info!.lng!] : [20.5937, 78.9629];

    return (
        <div style={{ minHeight: '100vh', background: '#0f0f11', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Navigation size={18} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Live Tracking</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>SafeRoute · Women Safety</div>
                    </div>
                </div>
                <div style={{ display: 'flex', align: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 20, padding: '4px 12px' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s ease-in-out infinite', display: 'inline-block' }} />
                        <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>LIVE</span>
                    </div>
                    {lastUpdated && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                            <Clock size={11} />
                            Updated {lastUpdated.toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>

            {/* Info bar */}
            <div style={{ padding: '12px 20px', background: 'rgba(167,139,250,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>
                        {info?.userName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{info?.userName}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Tracking for {elapsed()}</div>
                    </div>
                </div>
                {hasLocation && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>
                        <MapPin size={12} />
                        <span>{info!.lat!.toFixed(5)}, {info!.lng!.toFixed(5)}</span>
                    </div>
                )}
            </div>

            {/* Map */}
            <div style={{ flex: 1, position: 'relative', minHeight: 500 }}>
                {hasLocation ? (
                    <LeafletMap
                        height={window.innerHeight - 160}
                        center={center}
                        zoom={17}
                        liveLocation={[info!.lat!, info!.lng!]}
                        zones={[]}
                    />
                ) : (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'rgba(255,255,255,0.4)' }}>
                        <MapPin size={40} style={{ opacity: 0.3 }} />
                        <p style={{ fontSize: 14 }}>Waiting for GPS location…</p>
                        <p style={{ fontSize: 12, opacity: 0.6 }}>The page will update automatically.</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                    🔒 This link was shared by {info?.userName} via SafeRoute Women Safety App · Updates every 5 seconds
                </p>
            </div>
        </div>
    );
};

export default LiveTrackPage;
