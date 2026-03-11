import React, { useState } from 'react';
import { Shield, Info, MapPin, TrendingUp, TrendingDown } from 'lucide-react';
import SafetyBadge from '../components/ui/SafetyBadge';
import { MOCK_HEAT_ZONES, MOCK_CRIME_ZONES } from '../services/mockData';
import type { SafetyLevel } from '../types';

const HEAT_FG: Record<SafetyLevel, string> = {
    safe: 'rgba(34,197,94,',
    moderate: 'rgba(245,158,11,',
    danger: 'rgba(239,68,68,',
};

const FILTERS: { value: SafetyLevel | 'all'; label: string }[] = [
    { value: 'all', label: 'All Zones' },
    { value: 'safe', label: 'Safe' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'danger', label: 'High Risk' },
];

const HeatmapPage: React.FC = () => {
    const [heatOn, setHeatOn] = useState(false);
    const [filter, setFilter] = useState<SafetyLevel | 'all'>('all');

    const zones = MOCK_CRIME_ZONES.filter(z => filter === 'all' || z.safetyLevel === filter);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Header */}
            <div className="fade-up" style={{ paddingBottom: 20, borderBottom: '1px solid var(--border-soft)' }}>
                <h1 className="page-title">Safety Heatmap</h1>
                <p className="page-subtitle">Visualise crime hotspots and safe zones in your area</p>
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
            <div className="fade-up d2 map-box" style={{ height: 380 }}>
                <div className="map-grid" />

                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }} viewBox="0 0 800 380" preserveAspectRatio="none">
                    <line x1="0" y1="190" x2="800" y2="190" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="10 6" />
                    <line x1="400" y1="0" x2="400" y2="380" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="10 6" />
                    <line x1="0" y1="90" x2="800" y2="300" stroke="#6366f1" strokeWidth="1" strokeDasharray="6 8" opacity="0.7" />
                    <line x1="0" y1="310" x2="800" y2="100" stroke="#6366f1" strokeWidth="1" strokeDasharray="6 8" opacity="0.7" />
                </svg>

                {/* Heatmap zones */}
                {heatOn && MOCK_HEAT_ZONES.map(z => (
                    <div key={z.id} style={{
                        position: 'absolute',
                        left: `${z.x}%`, top: `${z.y}%`,
                        width: z.radius * 2, height: z.radius * 2,
                        transform: 'translate(-50%,-50%)', borderRadius: '50%',
                        background: `radial-gradient(circle, ${HEAT_FG[z.safetyLevel]}${z.intensity}) 0%, ${HEAT_FG[z.safetyLevel]}0) 70%)`,
                        pointerEvents: 'none', transition: 'opacity 0.4s',
                    }} />
                ))}

                {/* Zone labels on heat */}
                {heatOn && MOCK_HEAT_ZONES.map(z => (
                    <div key={`lbl-${z.id}`} style={{ position: 'absolute', left: `${z.x}%`, top: `${z.y}%`, transform: 'translate(-50%, -50%)', zIndex: 10, pointerEvents: 'none' }}>
                        <div style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap', background: 'rgba(15,23,42,0.85)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                            {z.area}
                        </div>
                    </div>
                ))}

                {/* Empty hint */}
                {!heatOn && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Shield size={20} style={{ color: 'var(--text-3)' }} />
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Enable the heat layer to view safety zones</p>
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
                </div>

                {/* Zone list */}
                <div>
                    <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={13} />Risk Zones ({zones.length})
                    </div>
                    <div className="card" style={{ overflow: 'hidden' }}>
                        {zones.length === 0 ? (
                            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                                No zones match current filter
                            </div>
                        ) : zones.map(z => (
                            <div key={z.id} className="list-row">
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                        <span className="trunc" style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{z.name}</span>
                                        <SafetyBadge level={z.safetyLevel} size="sm" />
                                    </div>
                                    <div className="trunc" style={{ fontSize: 12, color: 'var(--text-3)' }}>{z.description}</div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', fontSize: 12, color: z.safetyLevel === 'safe' ? 'var(--green)' : 'var(--red)', marginBottom: 2 }}>
                                        {z.safetyLevel === 'safe' ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                                        <span>{z.crimeCount} incidents</span>
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
