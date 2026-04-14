import type { SafetyPoi, SafetyPoiType } from '../types';

const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
];
const CACHE_TTL_MS = 10 * 60 * 1000;       // 10 min — POIs don't change often
const KARNATAKA_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ROUTE_SAMPLE_POINTS = 10;
const AMENITY_PATTERN = 'hospital|clinic|doctors|police|pharmacy';
// Smaller pattern for the fast "emergency" query (faster Overpass response)
const EMERGENCY_PATTERN = 'hospital|clinic|police';
const KARNATAKA_EMERGENCY_AMENITIES = 'hospital|clinic|doctors|police';

// ── Dual-layer cache: in-memory + sessionStorage ──────────────────────────────
const cache = new Map<string, { ts: number; data: SafetyPoi[] }>();

const SS_PREFIX = 'poiCache:';

const ssGet = (key: string): SafetyPoi[] | null => {
    try {
        const raw = sessionStorage.getItem(SS_PREFIX + key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { ts: number; data: SafetyPoi[] };
        if (Date.now() - parsed.ts > CACHE_TTL_MS) { sessionStorage.removeItem(SS_PREFIX + key); return null; }
        cache.set(key, parsed); // warm the in-memory cache too
        return parsed.data;
    } catch { return null; }
};

const ssPut = (key: string, data: SafetyPoi[]) => {
    const entry = { ts: Date.now(), data };
    cache.set(key, entry);
    try { sessionStorage.setItem(SS_PREFIX + key, JSON.stringify(entry)); } catch {}
};

let overpassBlockedUntil = 0;

interface OverpassElement {
    id: number;
    type?: string;
    lat?: number;
    lon?: number;
    center?: { lat?: number; lon?: number };
    tags?: Record<string, string>;
}

const toRad = (value: number) => (value * Math.PI) / 180;

export const haversineKm = (a: [number, number], b: [number, number]) => {
    const R = 6371;
    const dLat = toRad(b[0] - a[0]);
    const dLng = toRad(b[1] - a[1]);
    const x =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

const normalizeName = (tags: Record<string, string> | undefined, fallback: string) => {
    const raw = tags?.name?.trim();
    return raw && raw.length > 0 ? raw : fallback;
};

const normalizeType = (tags: Record<string, string> | undefined): SafetyPoiType | null => {
    const amenity = tags?.amenity;
    if (!amenity) return null;
    if (amenity === 'hospital' || amenity === 'clinic' || amenity === 'doctors') return 'hospital';
    if (amenity === 'police') return 'police';
    if (amenity === 'pharmacy') return 'pharmacy';
    return null;
};


const sampleRouteCoords = (coords: [number, number][]) => {
    if (coords.length <= MAX_ROUTE_SAMPLE_POINTS) return coords;
    const stride = Math.ceil(coords.length / MAX_ROUTE_SAMPLE_POINTS);
    return coords.filter((_, idx) => idx % stride === 0);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const overpassFetch = async (query: string) => {
    if (Date.now() < overpassBlockedUntil) {
        throw new Error('Overpass is cooling down due to rate limit. Please retry shortly.');
    }

    let lastStatus = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
        for (const endpoint of OVERPASS_ENDPOINTS) {
            try {
                const resp = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                    body: query,
                });
                lastStatus = resp.status;
                if (!resp.ok) {
                    if (resp.status === 429) {
                        overpassBlockedUntil = Date.now() + 60_000;
                        continue;
                    }
                    if (resp.status >= 500) continue;
                    throw new Error(`Overpass error: ${resp.status}`);
                }
                overpassBlockedUntil = 0;
                return resp.json();
            } catch (err) {
                console.warn('[POI] Overpass endpoint failed', endpoint, err);
            }
        }
        await sleep(1200 * (attempt + 1));
    }
    throw new Error(`Overpass error: ${lastStatus || 'network'}`);
};

const buildAroundQuery = (lat: number, lng: number, radiusMeters: number, pattern = AMENITY_PATTERN) => `
[out:json][timeout:25];
(
node["amenity"~"${pattern}"](around:${radiusMeters},${lat},${lng});
way["amenity"~"${pattern}"](around:${radiusMeters},${lat},${lng});
relation["amenity"~"${pattern}"](around:${radiusMeters},${lat},${lng});
);
out center;
`;

const parseElements = (elements: OverpassElement[]): SafetyPoi[] => {
    const unique = new Map<string, SafetyPoi>();
    for (const el of elements || []) {
        const lat = typeof el.lat === 'number' ? el.lat : el.center?.lat;
        const lon = typeof el.lon === 'number' ? el.lon : el.center?.lon;
        if (typeof lat !== 'number' || typeof lon !== 'number') continue;
        const type = normalizeType(el.tags);
        if (!type) continue;
        const id = `${el.type || 'node'}-${el.id}`;
        if (unique.has(id)) continue;
        unique.set(id, {
            id,
            type,
            lat,
            lng: lon,
            name: normalizeName(el.tags, type === 'police' ? 'Police Station' : type === 'hospital' ? 'Hospital' : 'Pharmacy'),
        });
    }
    return Array.from(unique.values());
};

export const fetchPoisNearLocation = async (lat: number, lng: number, radiusMeters = 5000): Promise<SafetyPoi[]> => {
    const cacheKey = `near:${lat.toFixed(3)}:${lng.toFixed(3)}:${radiusMeters}`;

    // 1. Check in-memory cache
    const inMem = cache.get(cacheKey);
    if (inMem && Date.now() - inMem.ts < CACHE_TTL_MS) return inMem.data;

    // 2. Check sessionStorage cache (survives page navigation)
    const inSS = ssGet(cacheKey);
    if (inSS) return inSS;

    const firstRadius = Math.max(5000, radiusMeters);
    const secondRadius = Math.max(10000, firstRadius * 2);
    const query = buildAroundQuery(lat, lng, firstRadius);
    const data = await overpassFetch(query) as { elements?: OverpassElement[] };
    console.debug('[POI] Overpass near raw response', data);
    console.debug('[POI] Near elements count', data.elements?.length || 0);
    let parsed = parseElements(data.elements || []);
    if (!parsed.length) {
        const retryQuery = buildAroundQuery(lat, lng, secondRadius);
        const retryData = await overpassFetch(retryQuery) as { elements?: OverpassElement[] };
        console.debug('[POI] Overpass near retry raw response', retryData);
        console.debug('[POI] Near retry elements count', retryData.elements?.length || 0);
        parsed = parseElements(retryData.elements || []);
    }
    console.debug('[POI] Near parsed POI count', parsed.length);
    ssPut(cacheKey, parsed);
    return parsed;
};

export const fetchPoisAlongRoute = async (routeCoords: [number, number][], radiusMeters = 5000): Promise<SafetyPoi[]> => {
    if (!routeCoords.length) return [];
    const sampled = sampleRouteCoords(routeCoords);
    const cacheKey = `corridor:${radiusMeters}:${sampled.map(([a, b]) => `${a.toFixed(3)},${b.toFixed(3)}`).join('|')}`;

    const inMem = cache.get(cacheKey);
    if (inMem && Date.now() - inMem.ts < CACHE_TTL_MS) return inMem.data;
    const inSS = ssGet(cacheKey);
    if (inSS) return inSS;

    const firstRadius = Math.max(5000, radiusMeters);
    const secondRadius = Math.max(10000, firstRadius * 2);

    const buildRouteQuery = (radius: number) => {
        const aroundBlocks = sampled
            .map(([lat, lng]) => `node["amenity"~"${AMENITY_PATTERN}"](around:${radius},${lat},${lng}); way["amenity"~"${AMENITY_PATTERN}"](around:${radius},${lat},${lng}); relation["amenity"~"${AMENITY_PATTERN}"](around:${radius},${lat},${lng});`)
            .join('\n');
        return `
[out:json][timeout:30];
(
${aroundBlocks}
);
out center;
`;
    };

    const query = buildRouteQuery(firstRadius);
    const data = await overpassFetch(query) as { elements?: OverpassElement[] };
    console.debug('[POI] Overpass corridor raw response', data);
    console.debug('[POI] Corridor elements count', data.elements?.length || 0);
    let parsed = parseElements(data.elements || []);
    if (!parsed.length) {
        const retryQuery = buildRouteQuery(secondRadius);
        const retryData = await overpassFetch(retryQuery) as { elements?: OverpassElement[] };
        console.debug('[POI] Overpass corridor retry raw response', retryData);
        console.debug('[POI] Corridor retry elements count', retryData.elements?.length || 0);
        parsed = parseElements(retryData.elements || []);
    }
    console.debug('[POI] Corridor parsed POI count', parsed.length);
    ssPut(cacheKey, parsed);
    return parsed;
};

export const fetchKarnatakaEmergencyPois = async (): Promise<SafetyPoi[]> => {
    const cacheKey = 'karnataka:emergency';
    const inMem = cache.get(cacheKey);
    if (inMem && Date.now() - inMem.ts < KARNATAKA_CACHE_TTL_MS) return inMem.data;
    const inSS = ssGet(cacheKey);
    if (inSS) return inSS;

    const query = `
[out:json][timeout:120];
area["name"="Karnataka"]["boundary"="administrative"]->.searchArea;
(
  node["amenity"~"${KARNATAKA_EMERGENCY_AMENITIES}"](area.searchArea);
  way["amenity"~"${KARNATAKA_EMERGENCY_AMENITIES}"](area.searchArea);
  relation["amenity"~"${KARNATAKA_EMERGENCY_AMENITIES}"](area.searchArea);
);
out center;
`;
    const data = await overpassFetch(query) as { elements?: OverpassElement[] };
    console.debug('[POI] Karnataka dataset raw response', data);
    console.debug('[POI] Karnataka elements count', data.elements?.length || 0);
    const parsed = parseElements(data.elements || []);
    console.debug('[POI] Karnataka parsed POI count', parsed.length);
    ssPut(cacheKey, parsed);
    return parsed;
};

// ── Fast emergency-only fetch (hospital + police, 8 km radius) ─────────────────
// Resolves in two stages:
//   Stage 1 (~0 ms)  – returns instantly from session/memory cache if available
//   Stage 2 (~2-8 s) – fires Overpass in background, calls onUpdate when done
export const fetchEmergencyPoisFast = async (
    lat: number,
    lng: number,
    onUpdate: (pois: SafetyPoi[]) => void,
): Promise<SafetyPoi[]> => {
    const cacheKey = `emg:${lat.toFixed(2)}:${lng.toFixed(2)}`;

    // Stage 1: return cached data instantly
    const inMem = cache.get(cacheKey);
    if (inMem && Date.now() - inMem.ts < CACHE_TTL_MS) return inMem.data;
    const inSS = ssGet(cacheKey);
    if (inSS) { onUpdate(inSS); return inSS; }

    // Fire Overpass in the background — use a narrow emergency-only query for speed
    const query = buildAroundQuery(lat, lng, 8000, EMERGENCY_PATTERN);
    (async () => {
        try {
            const data = await overpassFetch(query) as { elements?: OverpassElement[] };
            let parsed = parseElements(data.elements || []);
            if (!parsed.length) {
                // Widen to 15 km on empty result
                const wider = buildAroundQuery(lat, lng, 15000, EMERGENCY_PATTERN);
                const d2 = await overpassFetch(wider) as { elements?: OverpassElement[] };
                parsed = parseElements(d2.elements || []);
            }
            if (parsed.length) {
                ssPut(cacheKey, parsed);
                onUpdate(parsed);
            }
        } catch (err) {
            console.warn('[POI] Emergency fast-fetch background error', err);
        }
    })();

    return []; // caller gets empty array; onUpdate fires when data arrives
};

export const pickNearestPois = (pois: SafetyPoi[], origin: [number, number], maxCount = 300): SafetyPoi[] => {
    return [...pois]
        .map((poi) => ({ ...poi, distanceKm: haversineKm(origin, [poi.lat, poi.lng]) }))
        .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))
        .slice(0, maxCount);
};

export const getNearestPoiByType = (
    pois: SafetyPoi[],
    origin: [number, number],
    type: Exclude<SafetyPoiType, 'pharmacy'>
): SafetyPoi | null => {
    let nearest: SafetyPoi | null = null;
    for (const poi of pois) {
        if (poi.type !== type) continue;
        const d = haversineKm(origin, [poi.lat, poi.lng]);
        if (!nearest || d < (nearest.distanceKm ?? Infinity)) {
            nearest = { ...poi, distanceKm: d };
        }
    }
    return nearest;
};
