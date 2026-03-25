import React, { useState } from 'react';
import { MapPin, Navigation, Search, Star, Clock } from 'lucide-react';
import MapBox from '../components/ui/MapPlaceholder';
import SafetyBadge from '../components/ui/SafetyBadge';
import { MOCK_ROUTES } from '../services/mockData';
import type { SafeRoute, RouteSearchForm } from '../types';

const Spinner = () => (
    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
);

const SafeRoutePage: React.FC = () => {
    const [form, setForm] = useState<RouteSearchForm>({ origin: '', destination: '' });
    const [routes, setRoutes] = useState<SafeRoute[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    const search = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.origin.trim() || !form.destination.trim()) return;
        setLoading(true); setSearched(false);
        await new Promise(r => setTimeout(r, 1400));
        setRoutes(MOCK_ROUTES); setSelected(MOCK_ROUTES[0].id);
        setSearched(true); setLoading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Header */}
            <div className="fade-up" style={{ paddingBottom: 20, borderBottom: '1px solid var(--border-soft)' }}>
                <h1 className="page-title">Safe Route</h1>
                <p className="page-subtitle">Find the safest walking or driving route using community safety data</p>
            </div>

            {/* Search */}
            <div className="fade-up d1 card card-pad">
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Search size={13} />Plan Your Journey
                </div>
                <form onSubmit={search} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="field">
                        <label className="label-text">From</label>
                        <div className="input-wrap">
                            <MapPin size={14} className="ic" style={{ color: 'var(--green)' }} />
                            <input id="route-origin" type="text" value={form.origin}
                                onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}
                                placeholder="Your current location" className="input has-icon" />
                        </div>
                    </div>
                    <div className="field">
                        <label className="label-text">To</label>
                        <div className="input-wrap">
                            <MapPin size={14} className="ic" style={{ color: 'var(--indigo)' }} />
                            <input id="route-destination" type="text" value={form.destination}
                                onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                                placeholder="Destination" className="input has-icon" />
                        </div>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                        <button type="submit" id="route-search"
                            disabled={loading || !form.origin.trim() || !form.destination.trim()}
                            className="btn btn-primary" style={{ gap: 8 }}>
                            {loading ? <Spinner /> : <Navigation size={14} />}
                            {loading ? 'Analysing routes…' : 'Find Safe Routes'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Map */}
            <div className="fade-up d2">
                <MapBox height={300} label="Route Map" />
            </div>

            {/* Results */}
            {searched && (
                <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="section-title" style={{ marginBottom: 0 }}>{routes.length} Routes Found</div>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{form.origin} → {form.destination}</span>
                    </div>

                    {routes.map(r => {
                        const sel = selected === r.id;
                        return (
                            <button key={r.id} id={`route-${r.id}`} onClick={() => setSelected(r.id)}
                                className="card card-hover"
                                style={{
                                    width: '100%', textAlign: 'left', padding: '16px',
                                    border: `1px solid ${sel ? 'var(--indigo)' : 'var(--border)'}`,
                                    background: sel ? 'rgba(99,102,241,0.06)' : 'var(--bg-card)'
                                }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                            {r.isSafest && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--green)', background: 'var(--green-dim)', border: '1px solid rgba(34,197,94,0.25)', padding: '2px 8px', borderRadius: 99 }}>
                                                    <Star size={10} fill="currentColor" />SAFEST
                                                </span>
                                            )}
                                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{r.name}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text-2)' }}>
                                                <Navigation size={12} />{r.distance}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text-2)' }}>
                                                <Clock size={12} />{r.duration}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                            {r.highlights.map(h => (
                                                <span key={h} className="badge badge-neutral" style={{ fontSize: 11 }}>{h}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                                        <SafetyBadge level={r.safetyLevel} size="sm" />
                                        <span style={{ fontSize: 20, fontWeight: 700, color: r.safetyScore >= 80 ? 'var(--green)' : r.safetyScore >= 60 ? 'var(--amber)' : 'var(--red)' }}>
                                            {r.safetyScore}
                                        </span>
                                        <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>score</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}

                    {selected && (
                        <button id="start-route-btn" className="btn btn-primary btn-full btn-lg" style={{ gap: 8, marginTop: 4 }}>
                            <Navigation size={16} />Start Navigation
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default SafeRoutePage;
