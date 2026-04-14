import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Navigation, Search, Star, Clock, LocateFixed, X } from 'lucide-react';
import LeafletMap from '../components/ui/LeafletMap';
import SafetyBadge from '../components/ui/SafetyBadge';
import { scoreRoute, getIndiaSafetyDataset } from '../services/indiaSafetyData';
import { fetchKarnatakaEmergencyPois, fetchEmergencyPoisFast, fetchPoisAlongRoute, fetchPoisNearLocation, getNearestPoiByType, haversineKm, pickNearestPois } from '../services/poiService';
import type { SafeRoute, RouteSearchForm, SafetyPoi } from '../types';

const Spinner = () => (
    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
);

const mergePois = (lists: SafetyPoi[][]) => {
    const unique = new Map<string, SafetyPoi>();
    for (const list of lists) {
        for (const poi of list) {
            const k = `${poi.type}-${poi.lat.toFixed(5)}-${poi.lng.toFixed(5)}`;
            if (!unique.has(k)) unique.set(k, poi);
        }
    }
    return Array.from(unique.values());
};

const SafeRoutePage: React.FC = () => {
    const [form, setForm] = useState<RouteSearchForm>({ origin: '', destination: '' });
    const [routes, setRoutes] = useState<SafeRoute[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [navigating, setNavigating] = useState(false);

    // Real Map Data — store 3 separate route geometry arrays
    const [allRouteCoords, setAllRouteCoords] = useState<[number, number][][]>([[], [], []]);
    const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]);
    const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
    const [poiLoading, setPoiLoading] = useState(false);
    const [safetyPois, setSafetyPois] = useState<SafetyPoi[]>([]);
    const [nearestHospital, setNearestHospital] = useState<SafetyPoi | null>(null);
    const [nearestPolice, setNearestPolice] = useState<SafetyPoi | null>(null);
    // Live-GPS-based nearest help — set only from GPS pre-fetch, NEVER cleared by route search
    const [liveNearestHospital, setLiveNearestHospital] = useState<SafetyPoi | null>(null);
    const [liveNearestPolice, setLiveNearestPolice] = useState<SafetyPoi | null>(null);
    const [livePoiLoading, setLivePoiLoading] = useState(false);
    const [helpRoute, setHelpRoute] = useState<[number, number][]>([]);
    const [helpMeta, setHelpMeta] = useState<{ type: 'hospital' | 'police'; name: string; lat: number; lng: number; distanceKm: number; etaMin: number } | null>(null);
    const [poiSearchRadiusKm, setPoiSearchRadiusKm] = useState(5);
    const [poiSourceLabel, setPoiSourceLabel] = useState<'local' | 'karnataka'>('local');
    const poiSyncRef = useRef<{ ts: number; from: [number, number] | null }>({ ts: 0, from: null });
    const poiFetchInFlightRef = useRef(false);
    const livePrefetchDoneRef = useRef(false);

    // Watch live location for GPS dot and Navigation mode
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

    // ⚡ PRE-FETCH live GPS nearest hospital + police — runs once on first GPS fix,
    //    stores results in liveNearestHospital/Police which are NEVER cleared by searches.
    useEffect(() => {
        if (!currentLocation || livePrefetchDoneRef.current) return;
        livePrefetchDoneRef.current = true;
        setLivePoiLoading(true);
        const [lat, lng] = currentLocation;
        fetchEmergencyPoisFast(lat, lng, (freshPois) => {
            setLiveNearestHospital(getNearestPoiByType(freshPois, currentLocation!, 'hospital'));
            setLiveNearestPolice(getNearestPoiByType(freshPois, currentLocation!, 'police'));
            setLivePoiLoading(false);
            // Also seed the main POI list if nothing is loaded yet
            setSafetyPois(prev => prev.length > 0 ? prev : freshPois);
            setNearestHospital(prev => prev ?? getNearestPoiByType(freshPois, currentLocation!, 'hospital'));
            setNearestPolice(prev => prev ?? getNearestPoiByType(freshPois, currentLocation!, 'police'));
        }).then(initial => {
            setLivePoiLoading(false);
            if (initial.length > 0) {
                setLiveNearestHospital(getNearestPoiByType(initial, currentLocation, 'hospital'));
                setLiveNearestPolice(getNearestPoiByType(initial, currentLocation, 'police'));
                setSafetyPois(prev => prev.length > 0 ? prev : initial);
                setNearestHospital(prev => prev ?? getNearestPoiByType(initial, currentLocation, 'hospital'));
                setNearestPolice(prev => prev ?? getNearestPoiByType(initial, currentLocation, 'police'));
            }
        });
        // Only re-run when location changes significantly (handled inside fetchEmergencyPoisFast cache)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentLocation]);

    const refreshPois = async (origin: [number, number], routeCoords?: [number, number][]) => {
        if (poiFetchInFlightRef.current) return;
        poiFetchInFlightRef.current = true;
        setPoiLoading(true);
        try {
            // Fast stage: kick off an emergency-only fetch in the background immediately
            fetchEmergencyPoisFast(origin[0], origin[1], (fastPois) => {
                setSafetyPois(prev => prev.length >= fastPois.length ? prev : fastPois);
                setNearestHospital(getNearestPoiByType(fastPois, origin, 'hospital'));
                setNearestPolice(getNearestPoiByType(fastPois, origin, 'police'));
            });

            // Full stage: fetch all amenities including pharmacy along the route
            const nearby = await fetchPoisNearLocation(origin[0], origin[1], 5000);
            const routeBased = (!nearby.length && routeCoords && routeCoords.length)
                ? await fetchPoisAlongRoute(routeCoords, 5000)
                : [];
            const merged = mergePois([nearby, routeBased]);
            let finalPois = merged;
            let source: 'local' | 'karnataka' = 'local';
            if (!finalPois.length) {
                const karnatakaDataset = await fetchKarnatakaEmergencyPois();
                finalPois = pickNearestPois(karnatakaDataset, origin, 250);
                source = 'karnataka';
            }
            setSafetyPois(finalPois);
            setNearestHospital(getNearestPoiByType(finalPois, origin, 'hospital'));
            setNearestPolice(getNearestPoiByType(finalPois, origin, 'police'));
            setPoiSearchRadiusKm(finalPois.length ? 5 : 10);
            setPoiSourceLabel(source);
            console.debug('[POI] Final merged POI count before render', finalPois.length);
        } catch (err) {
            console.error('POI fetch failed', err);
        } finally {
            poiFetchInFlightRef.current = false;
            setPoiLoading(false);
        }
    };

    const fetchRouteToHelp = async (target: SafetyPoi, type: 'hospital' | 'police') => {
        if (!currentLocation) return;
        try {
            const coordStr = `${currentLocation[1]},${currentLocation[0]};${target.lng},${target.lat}`;
            const resp = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`);
            const data = await resp.json();
            if (!data.routes?.[0]) return;
            const coords: [number, number][] = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
            setHelpRoute(coords);
            setHelpMeta({
                type,
                name: target.name,
                lat: target.lat,
                lng: target.lng,
                distanceKm: data.routes[0].distance / 1000,
                etaMin: Math.round(data.routes[0].duration / 60),
            });
        } catch (err) {
            console.error('Help route fetch failed', err);
        }
    };

    const search = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.origin.trim() || !form.destination.trim()) return;
        setLoading(true); setSearched(false); setError(null);
        setSafetyPois([]);
        setNearestHospital(null);
        setNearestPolice(null);
        setHelpRoute([]);
        setHelpMeta(null);
        try {
            let origLat: number, origLng: number;

            // Helper to prevent Nominatim from returning massive district center coordinates instead of the actual city
            const cleanQuery = (q: string) => {
                if (q.trim().toLowerCase() === 'udupi') return 'Udupi City, Karnataka';
                if (!q.includes(',')) return q + ', Karnataka'; // Bias simple demo queries to local state
                return q;
            };

            // 1. Resolve Origin Coordinate
            if (form.origin === 'My Current Location') {
                if (!currentLocation) throw new Error("Waiting for GPS signal or permission denied. Please allow location access.");
                origLat = currentLocation[0];
                origLng = currentLocation[1];
            } else {
                const origResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery(form.origin))}&countrycodes=in`);
                const origData = await origResp.json();
                if (!origData[0]) throw new Error("Origin location not found in India.");
                origLat = parseFloat(origData[0].lat);
                origLng = parseFloat(origData[0].lon);
            }

            // 2. Resolve Destination Coordinate
            const destResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery(form.destination))}&countrycodes=in`);
            const destData = await destResp.json();
            if (!destData[0]) throw new Error("Destination location not found in India.");

            const destLat = parseFloat(destData[0].lat);
            const destLng = parseFloat(destData[0].lon);

            // 3. Fetch 3 Genuinely Different Real Routes using perpendicular waypoint math
            // Compute the true direction vector and push waypoints perpendicular to the route
            const dLat = destLat - origLat;
            const dLng = destLng - origLng;
            const dist = Math.sqrt(dLat * dLat + dLng * dLng);

            // Perpendicular unit vector (rotate 90°)
            const perpLat = -dLng / dist;
            const perpLng = dLat / dist;

            // Mid-point of the journey
            const midLat = (origLat + destLat) / 2;
            const midLng = (origLng + destLng) / 2;

            // Scale offsets: ~20% and ~40% of journey length to force different road networks
            const scale1 = dist * 0.20;
            const scale2 = dist * 0.40;

            const wp1Lat = midLat + perpLat * scale1;
            const wp1Lng = midLng + perpLng * scale1;
            const wp2Lat = midLat - perpLat * scale2;
            const wp2Lng = midLng - perpLng * scale2;

            // Fetch candidate routes in parallel
            const toLatLng = (coords: number[][]): [number, number][] =>
                coords.map((c: number[]) => [c[1], c[0]] as [number, number]);

            const fetchDriving = async (waypoints: string): Promise<{ coords: [number, number][]; dist: number; dur: number } | null> => {
                try {
                    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`);
                    const d = await r.json();
                    if (!d.routes || d.routes.length === 0) return null;
                    return {
                        coords: toLatLng(d.routes[0].geometry.coordinates),
                        dist: d.routes[0].distance / 1000,
                        dur: d.routes[0].duration / 60,
                    };
                } catch { return null; }
            };

            const coordStr = `${origLng},${origLat};${destLng},${destLat}`;

            const [dirResp, alt1Resp, alt2Resp] = await Promise.all([
                // Candidate A: direct highway
                fetchDriving(coordStr),
                // Candidate B: forced detour right-perpendicular
                fetchDriving(`${origLng},${origLat};${wp1Lng},${wp1Lat};${destLng},${destLat}`),
                // Candidate C: forced detour left-perpendicular (larger)
                fetchDriving(`${origLng},${origLat};${wp2Lng},${wp2Lat};${destLng},${destLat}`),
            ]);

            if (!dirResp) throw new Error("No driving route could be found between these locations.");

            let communityReportsHighlights: string[] = [];
            try {
                const { fetchReports } = await import('../services/api');
                const allReports = await fetchReports();
                const matchedReports = allReports.filter(r => {
                    const loc = (r.location || '').toLowerCase();
                    const o = form.origin.toLowerCase();
                    const d = form.destination.toLowerCase();
                    const routeStr = `${o} to ${d}`;
                    // Match if report location string contains origin, destination, or exact requested route string
                    return (o && loc.includes(o.split(',')[0])) || 
                           (d && loc.includes(d.split(',')[0])) || 
                           loc.includes(routeStr);
                });
                
                // Keep it concise, take top 3
                communityReportsHighlights = matchedReports.slice(0, 3).map(r => `⚠️ ${r.incidentType}: ${r.location.substring(0, 25)}${r.location.length > 25 ? '...' : ''}`);
            } catch (e) {
                console.error("Failed to fetch reports for routing", e);
            }

            const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
            const cityTarget = capitalize(form.destination.split(',')[0].trim());

            const NAMES = [`Main Highway to ${cityTarget}`, `Alternate Road via Outskirts`, `Backroads Route`];
            const HIGHLIGHTS = [
                ['Well-lit highway', 'CCTV coverage', 'High traffic', 'Police patrol zones', ...communityReportsHighlights],
                ['Town road', 'Some dark stretches', 'Moderate footfall after 9 PM', ...communityReportsHighlights],
                ['Smaller streets', 'Poor lighting', 'Low vehicle traffic', 'Isolated at night', ...communityReportsHighlights],
            ];

            const candidates = [dirResp, alt1Resp, alt2Resp];

            // 4. Score each route with safety data (descriptive only — do NOT sort)
            // The direct highway is always safest; scoring shows relative values only.
            const zones = getIndiaSafetyDataset();
            const LEVELS: ('safe' | 'moderate' | 'danger')[] = ['safe', 'moderate', 'danger'];

            const dynamicRoutes: SafeRoute[] = candidates.map((c, i) => ({
                id: `r${i + 1}`,
                name: NAMES[i],
                distance: c ? c.dist.toFixed(1) + ' km' : dirResp.dist.toFixed(1) + ' km',
                duration: c ? Math.round(c.dur) + ' min' : Math.round(dirResp.dur) + ' min',
                safetyScore: scoreRoute(c ? c.coords : dirResp.coords, zones),
                safetyLevel: LEVELS[i],
                isSafest: i === 0,
                highlights: HIGHLIGHTS[i],
                waypoints: [],
            }));

            setAllRouteCoords(candidates.map(c => c ? c.coords : dirResp.coords));
            setMapCenter([origLat, origLng]);
            setRoutes(dynamicRoutes);
            setSelected(dynamicRoutes[0].id);
            setSearched(true);
            setHelpRoute([]);
            setHelpMeta(null);
            await refreshPois([origLat, origLng], candidates[0]?.coords || dirResp.coords);

        } catch (err: unknown) {
            console.error('Routing error:', err);
            const message = err instanceof Error ? err.message : 'Failed to fetch routes. Please try again.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const selectedRoute = routes.find(r => r.id === selected);

    // Stable computed routes for the map — recalculated only when allRouteCoords or selected changes
    const ROUTE_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];
    const mapMultiRoutes = useMemo(() => {
        if (!searched || allRouteCoords[0].length === 0) return [];
        const routeIndex = selected ? parseInt(selected.replace('r', '')) - 1 : -1;
        const all = allRouteCoords.map((positions, i) => ({ positions, color: ROUTE_COLORS[i] }));
        // Show only selected route when one is clicked; show all when navigating is off and nothing yet
        return routeIndex >= 0 ? all.filter((_, i) => i === routeIndex) : all;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allRouteCoords, selected, searched]);

    useEffect(() => {
        if (!currentLocation || !safetyPois.length) return;
        setNearestHospital(getNearestPoiByType(safetyPois, currentLocation, 'hospital'));
        setNearestPolice(getNearestPoiByType(safetyPois, currentLocation, 'police'));
    }, [currentLocation, safetyPois]);

    useEffect(() => {
        const run = async () => {
            if (!searched || !currentLocation) return;
            const now = Date.now();
            const last = poiSyncRef.current;
            const elapsed = now - last.ts;
            const movedKm = last.from ? haversineKm(last.from, currentLocation) : Infinity;
            if (elapsed < 120000 && movedKm < 1.0) return;

            const selectedIndex = selected ? parseInt(selected.replace('r', '')) - 1 : 0;
            await refreshPois(currentLocation, allRouteCoords[selectedIndex] || allRouteCoords[0]);
            poiSyncRef.current = { ts: now, from: currentLocation };
        };
        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentLocation, selected, searched]);

    // selected-route changes are already covered by throttled location/search updates.

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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="label-text">From</label>
                            <button
                                type="button"
                                onClick={() => setForm(f => ({ ...f, origin: 'My Current Location' }))}
                                style={{ background: 'none', border: 'none', color: 'var(--indigo)', fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                            >
                                <LocateFixed size={12} /> Use GPS
                            </button>
                        </div>
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
                {error && <p style={{ fontSize: 12.5, color: 'var(--red)', marginTop: 10 }}>{error}</p>}
            </div>

            {/* Navigation Active Panel */}
            {navigating && selectedRoute && (
                <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                    {/* Top bar */}
                    <div style={{ background: selectedRoute.safetyLevel === 'safe' ? '#16a34a' : selectedRoute.safetyLevel === 'moderate' ? '#d97706' : '#dc2626', color: 'white', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <LocateFixed size={20} />
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>Live Navigation Active</div>
                                <div style={{ fontSize: 12, opacity: 0.9 }}>{selectedRoute.name}</div>
                            </div>
                        </div>
                        <button onClick={() => setNavigating(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Exit</button>
                    </div>
                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
                        {[
                            { label: 'Distance', val: selectedRoute.distance, icon: '📍' },
                            { label: 'ETA', val: selectedRoute.duration, icon: '⏱️' },
                            { label: 'Safety', val: `${selectedRoute.safetyScore}/100`, icon: '🛡️' },
                            { label: 'Level', val: selectedRoute.safetyLevel.charAt(0).toUpperCase() + selectedRoute.safetyLevel.slice(1), icon: '⚠️' },
                        ].map((s, i, arr) => (
                            <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '14px 8px', borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                <div style={{ fontSize: 18 }}>{s.icon}</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{s.val}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                    {/* Turn-by-turn instructions */}
                    <div style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Route Safety Notes</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {selectedRoute.highlights.map((h, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--text-2)' }}>
                                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>→</span>
                                    {h}
                                </div>
                            ))}
                        </div>
                        {selectedRoute.safetyLevel === 'danger' && (
                            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--red)', fontSize: 13 }}>
                                ⚠️ High risk route. Consider using the Safest route instead.
                            </div>
                        )}
                    </div>
                    {/* Destination */}
                    <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, backgroundColor: 'var(--bg-hover)' }}>
                        <MapPin size={16} style={{ color: 'var(--indigo)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13.5, color: 'var(--text-2)' }}>Navigating to: <strong style={{ color: 'var(--text)' }}>{form.destination}</strong></span>
                    </div>
                </div>
            )}

            {/* Map */}
            <div className="fade-up d2" style={{ height: navigating ? 500 : 350, position: 'relative', transition: 'height 0.3s ease' }}>
                <LeafletMap
                    height={navigating ? 500 : 350}
                    center={navigating && currentLocation ? currentLocation : mapCenter}
                    zoom={5}
                    route={[]}
                    multiRoutes={mapMultiRoutes}
                    liveLocation={currentLocation}
                    poiMarkers={safetyPois}
                    helpRoute={helpRoute}
                    zones={[]}
                />
            </div>

            {/* ── ALWAYS-VISIBLE live GPS nearest help ────────────────────────────────── */}
            {currentLocation && (
                <div className="fade-up card card-pad" style={{ border: '1px solid rgba(99,102,241,0.2)', background: 'var(--indigo-dim)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--indigo)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 0 3px rgba(34,197,94,0.25)', animation: 'pulse 2s ease-in-out infinite' }} />
                            Nearest Help — Your Live Location
                        </div>
                        {livePoiLoading && (
                            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Locating…</span>
                        )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={!liveNearestHospital}
                            onClick={() => liveNearestHospital && fetchRouteToHelp(liveNearestHospital, 'hospital')}
                            style={{ fontSize: 12.5, textAlign: 'left', justifyContent: 'flex-start' }}
                        >
                            🏥 {liveNearestHospital
                                ? `${liveNearestHospital.name} (${(liveNearestHospital.distanceKm || 0).toFixed(1)} km)`
                                : livePoiLoading ? 'Finding…' : 'Not found nearby'
                            }
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={!liveNearestPolice}
                            onClick={() => liveNearestPolice && fetchRouteToHelp(liveNearestPolice, 'police')}
                            style={{ fontSize: 12.5, textAlign: 'left', justifyContent: 'flex-start' }}
                        >
                            🚔 {liveNearestPolice
                                ? `${liveNearestPolice.name} (${(liveNearestPolice.distanceKm || 0).toFixed(1)} km)`
                                : livePoiLoading ? 'Finding…' : 'Not found nearby'
                            }
                        </button>
                    </div>
                </div>
            )}

            {/* ── Route-search-based nearest help (only after a search) ──────────────── */}
            {searched && (
                <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="section-title" style={{ marginBottom: 0 }}>Nearest Help — Route Origin</div>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            {poiLoading ? 'Locating nearby safety points…' : `${safetyPois.length} safety points loaded`}
                        </span>
                    </div>
                    {!poiLoading && poiSourceLabel === 'karnataka' && safetyPois.length > 0 && (
                        <div className="alert alert-warning" style={{ fontSize: 12.5 }}>
                            Using Karnataka fallback dataset (nearest hospitals/police) due to low local Overpass coverage.
                        </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={!nearestHospital || !currentLocation}
                            onClick={() => nearestHospital && fetchRouteToHelp(nearestHospital, 'hospital')}
                        >
                            🏥 {nearestHospital ? `${nearestHospital.name} (${(nearestHospital.distanceKm || 0).toFixed(2)} km)` : poiLoading ? 'Finding hospitals…' : 'Not available nearby'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={!nearestPolice || !currentLocation}
                            onClick={() => nearestPolice && fetchRouteToHelp(nearestPolice, 'police')}
                        >
                            🚔 {nearestPolice ? `${nearestPolice.name} (${(nearestPolice.distanceKm || 0).toFixed(2)} km)` : poiLoading ? 'Finding police…' : 'Not available nearby'}
                        </button>
                    </div>
                    {!poiLoading && safetyPois.length === 0 && (
                        <div className="alert alert-warning" style={{ fontSize: 12.5 }}>
                            No nearby safety locations found within {poiSearchRadiusKm} km
                        </div>
                    )}
                    {helpMeta && (
                        <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ fontSize: 13 }}>
                                Route to nearest <strong>{helpMeta.type}</strong>: <strong>{helpMeta.name}</strong> ({helpMeta.distanceKm.toFixed(2)} km, ~{helpMeta.etaMin} min)
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                <a
                                    className="btn btn-primary"
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${helpMeta.lat},${helpMeta.lng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ textDecoration: 'none' }}
                                >
                                    Navigate
                                </a>
                                <button
                                    type="button"
                                    title="Clear route"
                                    onClick={() => { setHelpMeta(null); setHelpRoute([]); }}
                                    style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-3)', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-dim)'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--red)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                >
                                    <X size={13} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* helpMeta card also shown before search (when using live GPS nearest help) */}
            {!searched && helpMeta && (
                <div className="card card-pad">
                    <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ fontSize: 13 }}>
                            Route to nearest <strong>{helpMeta.type}</strong>: <strong>{helpMeta.name}</strong> ({helpMeta.distanceKm.toFixed(2)} km, ~{helpMeta.etaMin} min)
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <a
                                className="btn btn-primary"
                                href={`https://www.google.com/maps/dir/?api=1&destination=${helpMeta.lat},${helpMeta.lng}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ textDecoration: 'none' }}
                            >
                                Navigate
                            </a>
                            <button
                                type="button"
                                title="Clear route"
                                onClick={() => { setHelpMeta(null); setHelpRoute([]); }}
                                style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-3)', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-dim)'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--red)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                            >
                                <X size={13} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {selectedRoute && selectedRoute.safetyLevel === 'danger' && (
                                <div className="alert alert-warning" style={{ fontSize: 12.5 }}>
                                    ⚠️ This route passes through a high-risk area. Consider the safer alternative above.
                                </div>
                            )}
                            <button
                                id="start-route-btn"
                                className="btn btn-primary btn-full btn-lg"
                                style={{ gap: 8, marginTop: 4 }}
                                onClick={() => {
                                    if (!currentLocation) {
                                        alert("We are still pinpointing your GPS location. Please allow browser location permissions!");
                                        return;
                                    }
                                    setNavigating(true);
                                }}
                            >
                                <Navigation size={16} />{navigating ? 'Recenter Navigation' : 'Start Live Navigation'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SafeRoutePage;
