// ─── India Safety Dataset Generator ──────────────────────────────────────────
// Generates realistic-looking safety clustered data across major Indian cities
// using standard coordinates to dynamically populate the Heat map and Route map.

export interface SafetyZone {
    id: string;
    lat: number;
    lng: number;
    radius: number; // in meters
    safetyScore: number; // 0-100
    level: 'safe' | 'moderate' | 'danger';
    reports: number;
}

const MAJOR_CITIES = [
    // ── Other states: top metros only ─────────────────────────────────────────
    { name: 'Delhi',       lat: 28.6139, lng: 77.2090 },
    { name: 'Mumbai',      lat: 19.0760, lng: 72.8777 },
    { name: 'Kolkata',     lat: 22.5726, lng: 88.3639 },
    { name: 'Chennai',     lat: 13.0827, lng: 80.2707 },
    { name: 'Hyderabad',   lat: 17.3850, lng: 78.4867 },
    { name: 'Pune',        lat: 18.5204, lng: 73.8567 },
    { name: 'Ahmedabad',   lat: 23.0225, lng: 72.5714 },
    { name: 'Jaipur',      lat: 26.9124, lng: 75.7873 },
    { name: 'Lucknow',     lat: 26.8467, lng: 80.9462 },
    { name: 'Surat',       lat: 21.1702, lng: 72.8311 },
    { name: 'Bhopal',      lat: 23.2599, lng: 77.4126 },
    { name: 'Nagpur',      lat: 21.1458, lng: 79.0882 },
    { name: 'Patna',       lat: 25.5941, lng: 85.1376 },
    { name: 'Indore',      lat: 22.7196, lng: 75.8577 },
    { name: 'Kochi',       lat: 9.9312,  lng: 76.2673 },
    { name: 'Coimbatore',  lat: 11.0168, lng: 76.9558 },
    { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185 },

    // ── Karnataka: Complete coverage ───────────────────────────────────────────
    // Bengaluru urban cluster
    { name: 'Bengaluru City',     lat: 12.9716, lng: 77.5946 },
    { name: 'Bengaluru East',     lat: 12.9800, lng: 77.6500 },
    { name: 'Bengaluru North',    lat: 13.0827, lng: 77.5877 },
    { name: 'Bengaluru South',    lat: 12.8700, lng: 77.6000 },
    { name: 'Electronic City',    lat: 12.8399, lng: 77.6770 },
    { name: 'Whitefield',         lat: 12.9698, lng: 77.7500 },
    { name: 'Yelahanka',          lat: 13.1007, lng: 77.5963 },
    { name: 'Jayanagar',          lat: 12.9250, lng: 77.5938 },
    // Mysuru district
    { name: 'Mysuru',             lat: 12.2958, lng: 76.6394 },
    { name: 'Hunsur',             lat: 12.3033, lng: 76.2894 },
    { name: 'Nanjangud',          lat: 12.1128, lng: 76.6860 },
    { name: 'T Narasipura',       lat: 12.2138, lng: 76.9082 },
    // Mangaluru / Dakshina Kannada
    { name: 'Mangaluru',          lat: 12.9141, lng: 74.8560 },
    { name: 'Puttur',             lat: 12.7605, lng: 75.2014 },
    { name: 'Sullia',             lat: 12.5580, lng: 75.3857 },
    { name: 'Bantwal',            lat: 12.8912, lng: 75.0337 },
    { name: 'Belthangady',        lat: 12.9757, lng: 75.3040 },
    { name: 'Moodbidri',          lat: 13.0681, lng: 74.9918 },
    { name: 'Kavoor',             lat: 12.9299, lng: 74.8699 },
    // Udupi district
    { name: 'Udupi City',         lat: 13.3409, lng: 74.7421 },
    { name: 'Manipal',            lat: 13.3520, lng: 74.7862 },
    { name: 'Kundapura',          lat: 13.6281, lng: 74.6904 },
    { name: 'Karkala',            lat: 13.2046, lng: 74.9999 },
    { name: 'Brahmavar',          lat: 13.4274, lng: 74.7682 },
    { name: 'Kaup',               lat: 13.2083, lng: 74.7417 },
    { name: 'Byndoor',            lat: 13.8673, lng: 74.6433 },
    { name: 'Hebri',              lat: 13.4739, lng: 75.0407 },
    // Hassan district
    { name: 'Hassan',             lat: 13.0072, lng: 76.0962 },
    { name: 'Belur',              lat: 13.1620, lng: 75.8636 },
    { name: 'Alur',               lat: 13.0333, lng: 75.9667 },
    { name: 'Arsikere',           lat: 13.3147, lng: 76.2580 },
    // Shivamogga district
    { name: 'Shivamogga',         lat: 13.9299, lng: 75.5681 },
    { name: 'Sagar',              lat: 14.1660, lng: 75.0277 },
    { name: 'Bhadravati',         lat: 13.8477, lng: 75.7002 },
    { name: 'Thirthahalli',       lat: 13.6884, lng: 75.2395 },
    // Chikkamagaluru district
    { name: 'Chikkamagaluru',     lat: 13.3161, lng: 75.7720 },
    { name: 'Kadur',              lat: 13.5563, lng: 76.0106 },
    { name: 'Tarikere',           lat: 13.7138, lng: 75.8122 },
    // Uttara Kannada district
    { name: 'Karwar',             lat: 14.8136, lng: 74.1334 },
    { name: 'Sirsi',              lat: 14.6207, lng: 74.8321 },
    { name: 'Ankola',             lat: 14.6598, lng: 74.3011 },
    { name: 'Kumta',              lat: 14.4277, lng: 74.4177 },
    { name: 'Honnavar',           lat: 14.2791, lng: 74.4460 },
    { name: 'Dandeli',            lat: 15.2614, lng: 74.6211 },
    { name: 'Yellapur',           lat: 14.9667, lng: 74.7167 },
    // Dharwad / Hubli
    { name: 'Dharwad',            lat: 15.4589, lng: 75.0078 },
    { name: 'Hubli',              lat: 15.3647, lng: 75.1240 },
    // Belagavi district
    { name: 'Belagavi',           lat: 15.8497, lng: 74.4977 },
    { name: 'Gokak',              lat: 16.1700, lng: 74.8260 },
    { name: 'Bailhongal',         lat: 15.8117, lng: 74.9730 },
    // Vijayapura district
    { name: 'Vijayapura',         lat: 16.8302, lng: 75.7100 },
    { name: 'Muddebihal',         lat: 16.3357, lng: 76.1322 },
    // Kalaburagi / Bidar
    { name: 'Kalaburagi',         lat: 17.3297, lng: 76.8343 },
    { name: 'Bidar',              lat: 17.9104, lng: 77.5199 },
    { name: 'Basavakalyan',       lat: 17.8726, lng: 76.9524 },
    // Raichur / Koppal / Ballari
    { name: 'Raichur',            lat: 16.2120, lng: 77.3439 },
    { name: 'Koppal',             lat: 15.3559, lng: 76.1547 },
    { name: 'Ballari',            lat: 15.1394, lng: 76.9214 },
    { name: 'Hospet',             lat: 15.2689, lng: 76.3909 },
    // Tumkur / Davanagere
    { name: 'Tumkur',             lat: 13.3379, lng: 77.1173 },
    { name: 'Davanagere',         lat: 14.4644, lng: 75.9218 },
    { name: 'Harihar',            lat: 14.5117, lng: 75.7223 },
    // Mandya / Chamarajanagar
    { name: 'Mandya',             lat: 12.5218, lng: 76.8951 },
    { name: 'Chamarajanagar',     lat: 11.9249, lng: 76.9430 },
    { name: 'Kollegal',           lat: 12.1565, lng: 77.1079 },
    // Kodagu
    { name: 'Madikeri',           lat: 12.4208, lng: 75.7397 },
    { name: 'Virajpet',           lat: 12.1974, lng: 75.8054 },
    // Chitradurga / Bagalkot / Gadag / Haveri / Yadgir
    { name: 'Chitradurga',        lat: 14.2251, lng: 76.3980 },
    { name: 'Bagalkot',           lat: 16.1691, lng: 75.6965 },
    { name: 'Gadag',              lat: 15.4317, lng: 75.6355 },
    { name: 'Haveri',             lat: 14.7955, lng: 75.3985 },
    { name: 'Yadgir',             lat: 16.7714, lng: 77.1367 },
    { name: 'Ramanagara',         lat: 12.7189, lng: 77.2798 },
    { name: 'Bengaluru Rural',    lat: 13.2000, lng: 77.4800 },
];

function generateZonesForCity(cityLat: number, cityLng: number, count: number): SafetyZone[] {
    const zones: SafetyZone[] = [];
    for (let i = 0; i < count; i++) {
        // Random drift up to ~15km from city center
        const latDrift = (Math.random() - 0.5) * 0.3;
        const lngDrift = (Math.random() - 0.5) * 0.3;
        
        const score = Math.floor(Math.random() * 100);
        let level: 'safe' | 'moderate' | 'danger' = 'moderate';
        if (score >= 70) level = 'safe';
        else if (score <= 40) level = 'danger';

        zones.push({
            id: `zone-${Math.random().toString(36).substr(2, 9)}`,
            lat: cityLat + latDrift,
            lng: cityLng + lngDrift,
            radius: Math.floor(Math.random() * 800) + 200, // 200m to 1000m
            safetyScore: score,
            level,
            reports: Math.floor(Math.random() * 50) + (level === 'danger' ? 20 : 0)
        });
    }
    return zones;
}

// ─── Route Safety Scorer ─────────────────────────────────────────────────────
// Given a route as [lat, lng][] from OSRM, samples N points along the path
// and checks the safety dataset to compute an aggregate score (0-100).

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export const scoreRoute = (routeCoords: [number, number][], zones: SafetyZone[]): number => {
    if (routeCoords.length === 0 || zones.length === 0) return 50;
    
    // Sample up to 20 evenly-spaced points along the route
    const samples = 20;
    const step = Math.max(1, Math.floor(routeCoords.length / samples));
    const sampledPoints = routeCoords.filter((_, i) => i % step === 0).slice(0, samples);
    
    let totalScore = 0;
    let scoredPoints = 0;

    for (const [lat, lng] of sampledPoints) {
        // Find zones within 2km of this point
        const nearby = zones.filter(z => haversineKm(lat, lng, z.lat, z.lng) <= 2);
        if (nearby.length > 0) {
            const avg = nearby.reduce((sum, z) => sum + z.safetyScore, 0) / nearby.length;
            totalScore += avg;
            scoredPoints++;
        } else {
            // No data = assume moderate safety (50)
            totalScore += 50;
            scoredPoints++;
        }
    }

    return Math.round(totalScore / scoredPoints);
};

// Generate the master dataset (cached after first call)
let cachedDataset: SafetyZone[] | null = null;

export const getIndiaSafetyDataset = (): SafetyZone[] => {
    if (cachedDataset) return cachedDataset;
    let allZones: SafetyZone[] = [];
    for (const city of MAJOR_CITIES) {
        allZones = allZones.concat(generateZonesForCity(city.lat, city.lng, 100));
    }
    cachedDataset = allZones;
    return allZones;
};
