import type {
    EmergencyContact,
    SafeRoute,
    CommunityReport,
    Activity,
    CrimeZone,
    HeatZone,
    TrackingSession,
} from '../types';

// ─── Mock User ────────────────────────────────────────────────────────────────

export const MOCK_USER = {
    id: 'user-001',
    name: 'Priya Sharma',
    email: 'priya.sharma@email.com',
    phone: '+91 98765 43210',
    createdAt: '2024-01-15',
    isVerified: true,
};

// ─── Mock Emergency Contacts ──────────────────────────────────────────────────

export const MOCK_CONTACTS: EmergencyContact[] = [
    {
        id: 'contact-001',
        name: 'Ananya Sharma',
        phone: '+91 98765 11111',
        relationship: 'Mother',
        isNotified: true,
    },
    {
        id: 'contact-002',
        name: 'Rahul Sharma',
        phone: '+91 98765 22222',
        relationship: 'Brother',
        isNotified: true,
    },
    {
        id: 'contact-003',
        name: 'Deepa Nair',
        phone: '+91 98765 33333',
        relationship: 'Friend',
        isNotified: false,
    },
];

// ─── Mock Routes ──────────────────────────────────────────────────────────────

export const MOCK_ROUTES: SafeRoute[] = [
    {
        id: 'route-001',
        name: 'Route via MG Road',
        distance: '3.2 km',
        duration: '12 mins',
        safetyScore: 92,
        safetyLevel: 'safe',
        waypoints: [],
        highlights: ['Well-lit streets', 'CCTV coverage', 'Police patrol zone', 'High footfall'],
        isSafest: true,
    },
    {
        id: 'route-002',
        name: 'Route via Brigade Road',
        distance: '2.8 km',
        duration: '15 mins',
        safetyScore: 74,
        safetyLevel: 'moderate',
        waypoints: [],
        highlights: ['Main road', 'Some dark alleys', 'Moderate footfall'],
        isSafest: false,
    },
    {
        id: 'route-003',
        name: 'Route via Old Market',
        distance: '2.1 km',
        duration: '10 mins',
        safetyScore: 38,
        safetyLevel: 'danger',
        waypoints: [],
        highlights: ['Shortest path', 'Poor lighting', 'Low footfall at night', 'Past reported incidents'],
        isSafest: false,
    },
];

// ─── Mock Community Reports ───────────────────────────────────────────────────

export const MOCK_REPORTS: CommunityReport[] = [
    {
        id: 'report-001',
        userId: 'user-002',
        userName: 'Meera R.',
        location: 'Old Market Lane, Sector 4',
        incidentType: 'Poor Lighting',
        description: 'The street lights near the market are not working for the past week. It feels very unsafe to walk alone at night.',
        timestamp: '2025-02-25T21:30:00Z',
        upvotes: 24,
        isVerified: true,
        safetyLevel: 'danger',
    },
    {
        id: 'report-002',
        userId: 'user-003',
        userName: 'Kavya P.',
        location: 'Bus Stop No. 12, MG Road',
        incidentType: 'Harassment',
        description: 'Experienced verbal harassment while waiting for the bus around 8 PM. Reported to police.',
        timestamp: '2025-02-24T19:45:00Z',
        upvotes: 18,
        isVerified: true,
        safetyLevel: 'danger',
    },
    {
        id: 'report-003',
        userId: 'user-004',
        userName: 'Sneha M.',
        location: 'City Park, North Gate',
        incidentType: 'Suspicious Activity',
        description: 'Group of unknown individuals lurking near the park gate at night. Felt unsafe.',
        timestamp: '2025-02-23T22:15:00Z',
        upvotes: 11,
        isVerified: false,
        safetyLevel: 'moderate',
    },
    {
        id: 'report-004',
        userId: 'user-005',
        userName: 'Riya K.',
        location: 'Railway Station Exit B',
        incidentType: 'Theft',
        description: 'Bag snatching incident near exit B. Please be cautious and keep your belongings secure.',
        timestamp: '2025-02-22T18:00:00Z',
        upvotes: 31,
        isVerified: true,
        safetyLevel: 'danger',
    },
    {
        id: 'report-005',
        userId: 'user-006',
        userName: 'Pooja T.',
        location: 'Brigade Road, Shivajinagar',
        incidentType: 'Unsafe Area',
        description: 'Construction work has blocked footpaths, forcing pedestrians onto the road. Very risky at night.',
        timestamp: '2025-02-21T20:00:00Z',
        upvotes: 8,
        isVerified: false,
        safetyLevel: 'moderate',
    },
];

// ─── Mock Activities ──────────────────────────────────────────────────────────

export const MOCK_ACTIVITIES: Activity[] = [
    {
        id: 'act-001',
        type: 'route',
        title: 'Safe Route Used',
        description: 'Route via MG Road — Home to Cubbon Park',
        timestamp: '2025-02-26T09:15:00Z',
    },
    {
        id: 'act-002',
        type: 'tracking',
        title: 'Live Tracking Session',
        description: 'Tracking session lasted 45 minutes',
        timestamp: '2025-02-25T20:30:00Z',
    },
    {
        id: 'act-003',
        type: 'report',
        title: 'Community Report Submitted',
        description: 'Reported poor lighting near Old Market Lane',
        timestamp: '2025-02-24T21:00:00Z',
    },
    {
        id: 'act-004',
        type: 'contact',
        title: 'Emergency Contact Added',
        description: 'Deepa Nair added as emergency contact',
        timestamp: '2025-02-23T14:00:00Z',
    },
    {
        id: 'act-005',
        type: 'sos',
        title: 'SOS Test Alert',
        description: 'Test alert sent to all emergency contacts',
        timestamp: '2025-02-20T16:30:00Z',
    },
];

// ─── Mock Crime Zones ─────────────────────────────────────────────────────────

export const MOCK_CRIME_ZONES: CrimeZone[] = [
    {
        id: 'zone-001',
        name: 'Old Market Area',
        lat: 12.9716,
        lng: 77.5946,
        safetyLevel: 'danger',
        crimeCount: 28,
        description: 'Multiple theft and harassment incidents reported',
        lastUpdated: '2025-02-25',
    },
    {
        id: 'zone-002',
        name: 'MG Road Corridor',
        lat: 12.9752,
        lng: 77.6071,
        safetyLevel: 'safe',
        crimeCount: 3,
        description: 'Well-monitored area with CCTV coverage',
        lastUpdated: '2025-02-26',
    },
    {
        id: 'zone-003',
        name: 'North Park Area',
        lat: 12.9783,
        lng: 77.5980,
        safetyLevel: 'moderate',
        crimeCount: 12,
        description: 'Some incidents reported after dark',
        lastUpdated: '2025-02-24',
    },
];

// ─── Mock Heat Zones ──────────────────────────────────────────────────────────

export const MOCK_HEAT_ZONES: HeatZone[] = [
    { id: 'heat-001', x: 20, y: 25, radius: 80, intensity: 0.9, safetyLevel: 'danger', area: 'Old Market' },
    { id: 'heat-002', x: 65, y: 40, radius: 60, intensity: 0.7, safetyLevel: 'danger', area: 'Station Exit' },
    { id: 'heat-003', x: 80, y: 70, radius: 70, intensity: 0.6, safetyLevel: 'moderate', area: 'North Park' },
    { id: 'heat-004', x: 45, y: 55, radius: 90, intensity: 0.4, safetyLevel: 'moderate', area: 'Brigade Road' },
    { id: 'heat-005', x: 30, y: 70, radius: 100, intensity: 0.2, safetyLevel: 'safe', area: 'MG Road' },
    { id: 'heat-006', x: 70, y: 20, radius: 85, intensity: 0.15, safetyLevel: 'safe', area: 'Cubbon Park' },
];

// ─── Mock Tracking Session ────────────────────────────────────────────────────

export const MOCK_TRACKING_SESSION: TrackingSession = {
    id: 'session-001',
    userId: 'user-001',
    startTime: new Date().toISOString(),
    status: 'inactive',
    sharedWith: ['contact-001', 'contact-002'],
    batteryLevel: 87,
};

// ─── Safety Tips ──────────────────────────────────────────────────────────────

export const SAFETY_TIPS = [
    { icon: '📍', tip: 'Always share your live location with a trusted contact when traveling alone.' },
    { icon: '🔦', tip: 'Avoid poorly lit streets and shortcuts, especially at night.' },
    { icon: '📱', tip: 'Keep your phone charged and emergency contacts ready.' },
    { icon: '🚨', tip: 'Trust your instincts — if something feels wrong, leave immediately.' },
    { icon: '👥', tip: 'Walk in well-populated areas and stay on main roads.' },
    { icon: '🚌', tip: 'Prefer well-lit, official transport — share route details with someone you trust.' },
];
