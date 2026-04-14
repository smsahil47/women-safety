import React, { useState, useMemo, useEffect } from 'react';
import { Shield, Info, MapPin, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import SafetyBadge from '../components/ui/SafetyBadge';
import type { SafetyLevel } from '../types';
import LeafletMap from '../components/ui/LeafletMap';
import { getIndiaSafetyDataset } from '../services/indiaSafetyData';
import { fetchRiskZones, type RealRiskZone } from '../services/api';

const FILTERS: { value: SafetyLevel | 'all'; label: string }[] = [
    { value: 'all', label: 'All Zones' },
    { value: 'safe', label: 'Safe' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'danger', label: 'High Risk' },
];

const SkeletonRow = () => (
    <div className="list-row" style={{ gap: 12 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 14, width: '60%', borderRadius: 6, background: 'var(--bg-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
            <div style={{ height: 11, width: '85%', borderRadius: 6, background: 'var(--bg-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            <div style={{ height: 11, width: 60, borderRadius: 6, background: 'var(--bg-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
            <div style={{ height: 10, width: 80, borderRadius: 6, background: 'var(--bg-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        </div>
    </div>
);

const HeatmapPage: React.FC = () => {
    const [heatOn, setHeatOn] = useState(false);
    const [filter, setFilter] = useState<SafetyLevel | 'all'>('all');
    const [zones, setZones] = useState<RealRiskZone[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetchRiskZones()
            .then(data => { if (!cancelled) setZones(data); })
            .catch(err => { if (!cancelled) setError(err.message || 'Failed to load risk zones.'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const filteredZones = zones.filter(z => filter === 'all' || z.safetyLevel === filter);

    // The real detailed map dataset for Leaflet
    const allIndiaZones = useMemo(() => getIndiaSafetyDataset(), []);
    const filteredIndiaZones = useMemo(() =>
        allIndiaZones.filter(z => filter === 'all' || z.level === filter),
    [allIndiaZones, filter]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Header */}
            <div className="fade-up" style={{ paddingBottom: 20, borderBottom: '1px solid var(--border-soft)' }}>
                <h1 className="page-title">Safety Heatmap</h1>
                <p className="page-subtitle">Visualise crime hotspots and safe zones based on community-reported incidents</p>
            </div>

            {/* Controls */}
            <div className="fade-up d1 card card-pad-sm" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
                {/* Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <button id="heatmap-toggle" className={`toggle${heatOn ? ' on' : ''}`}
                        onClick={() => setHeatOn(!heatOn)}
                        role="switch" aria-checked={heatOn} />
                    <div>
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>
                            {heatOn ? 'Heat layer enabled' : 'Heat layer disabled'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            {heatOn ? 'Risk zones visible on map' : 'Toggle to reveal safety zones'}
                        </div>
                    </div>
                </div>

                {/* Filter pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {FILTERS.map(f => (
                        <button key={f.value} id={`filter-${f.value}`} onClick={() => setFilter(f.value)}
                            className={`btn btn-sm ${filter === f.value ? 'btn-primary' : 'btn-outline'}`}
                            style={{ fontSize: 12 }}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Map */}
            <div className="fade-up d2" style={{ height: 450, position: 'relative' }}>
                <LeafletMap
                    height={450}
                    center={[20.5937, 78.9629]}
                    zoom={5}
                    zones={heatOn ? filteredIndiaZones : []}
                />

                {/* Empty hint over map */}
                {!heatOn && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 1000, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(2px)' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Shield size={20} style={{ color: 'var(--text-3)' }} />
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>Enable the heat layer to view safety zones</p>
                    </div>
                )}
            </div>

            {/* Legend + zones */}
            <div className="fade-up d3" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24 }}>
                {/* Legend */}
                <div className="card card-pad-sm" style={{ minWidth: 200 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Info size={12} />Legend
                    </div>
                    {[
                        { level: 'safe' as SafetyLevel, label: 'Safe Zone', dot: 'dot-green' },
                        { level: 'moderate' as SafetyLevel, label: 'Moderate', dot: 'dot-amber' },
                        { level: 'danger' as SafetyLevel, label: 'High Risk', dot: 'dot-red' },
                    ].map(l => (
                        <div key={l.level} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-soft)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
                                <span className={`status-dot ${l.dot}`} style={{ width: 10, height: 10 }} />
                            </div>
                            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{l.label}</span>
                        </div>
                    ))}

                    <div style={{ marginTop: 16, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-hover)', fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Data source</strong>
                        Risk zones are derived from real community-reported incidents submitted by users in the app.
                    </div>
                </div>

                {/* Zone list */}
                <div>
                    <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={13} />
                        {loading ? 'Risk Zones' : `Risk Zones (${filteredZones.length})`}
                    </div>
                    <div className="card" style={{ overflow: 'hidden' }}>
                        {/* Loading state */}
                        {loading && (
                            <div>
                                {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
                            </div>
                        )}

                        {/* Error state */}
                        {!loading && error && (
                            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--red)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <AlertTriangle size={20} />
                                <div>{error}</div>
                                <button className="btn btn-sm btn-outline" onClick={() => {
                                    setLoading(true); setError(null);
                                    fetchRiskZones().then(setZones).catch(e => setError(e.message)).finally(() => setLoading(false));
                                }}>Retry</button>
                            </div>
                        )}

                        {/* Empty state */}
                        {!loading && !error && filteredZones.length === 0 && (
                            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                <Shield size={28} style={{ opacity: 0.3 }} />
                                <div style={{ fontWeight: 500 }}>
                                    {zones.length === 0
                                        ? 'No community reports yet'
                                        : 'No zones match the current filter'}
                                </div>
                                <div style={{ fontSize: 12, maxWidth: 280 }}>
                                    {zones.length === 0
                                        ? 'Risk zones appear here once users submit incident reports from the community page.'
                                        : 'Try selecting "All Zones" to see all reported areas.'}
                                </div>
                            </div>
                        )}

                        {/* Real data */}
                        {!loading && !error && filteredZones.map(z => (
                            <div key={z.id} className="list-row">
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                                        <span className="trunc" style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{z.name}</span>
                                        <SafetyBadge level={z.safetyLevel} size="sm" />
                                        <span style={{ fontSize: 10.5, color: 'var(--text-3)', background: 'var(--bg-hover)', border: '1px solid var(--border-soft)', borderRadius: 99, padding: '1px 7px' }}>
                                            {z.incidentType}
                                        </span>
                                    </div>
                                    <div className="trunc" style={{ fontSize: 12, color: 'var(--text-3)' }}>{z.description}</div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', fontSize: 12, color: z.safetyLevel === 'safe' ? 'var(--green)' : 'var(--red)', marginBottom: 2 }}>
                                        {z.safetyLevel === 'safe' ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                                        <span>{z.crimeCount} {z.crimeCount === 1 ? 'incident' : 'incidents'}</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Updated {z.lastUpdated}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeatmapPage;
