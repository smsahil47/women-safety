// ─── User Types ───────────────────────────────────────────────────────────────

export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar?: string;
    createdAt: string;
    isVerified: boolean;
}

export interface AuthFormData {
    email: string;
    password: string;
    name?: string;
    phone?: string;
    confirmPassword?: string;
}

export interface FormErrors {
    email?: string;
    password?: string;
    name?: string;
    phone?: string;
    confirmPassword?: string;
}

// ─── Emergency Contact Types ──────────────────────────────────────────────────

export interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    relationship: string;
    isNotified: boolean;
    avatar?: string;
}

export type Relationship = 'Mother' | 'Father' | 'Sister' | 'Brother' | 'Friend' | 'Partner' | 'Other';

export interface ContactFormData {
    name: string;
    phone: string;
    relationship: Relationship;
}

// ─── Crime Zone / Safety Types ────────────────────────────────────────────────

export type SafetyLevel = 'safe' | 'moderate' | 'danger';

export interface CrimeZone {
    id: string;
    name: string;
    lat: number;
    lng: number;
    safetyLevel: SafetyLevel;
    crimeCount: number;
    description: string;
    lastUpdated: string;
}

// ─── Route Types ──────────────────────────────────────────────────────────────

export interface RoutePoint {
    lat: number;
    lng: number;
    address: string;
}

export interface SafeRoute {
    id: string;
    name: string;
    distance: string;
    duration: string;
    safetyScore: number;
    safetyLevel: SafetyLevel;
    waypoints: RoutePoint[];
    highlights: string[];
    isSafest: boolean;
}

export interface RouteSearchForm {
    origin: string;
    destination: string;
}

export type SafetyPoiType = 'hospital' | 'police' | 'pharmacy';

export interface SafetyPoi {
    id: string;
    name: string;
    type: SafetyPoiType;
    lat: number;
    lng: number;
    distanceKm?: number;
}

// ─── Tracking Types ───────────────────────────────────────────────────────────

export type TrackingStatus = 'active' | 'inactive' | 'paused';

export interface TrackingSession {
    id: string;
    userId: string;
    startTime: string;
    endTime?: string;
    status: TrackingStatus;
    currentLocation?: RoutePoint;
    destination?: RoutePoint;
    sharedWith: string[];
    batteryLevel?: number;
}

// ─── SOS Types ────────────────────────────────────────────────────────────────

export type SOSStatus = 'idle' | 'confirming' | 'sending' | 'sent';

export interface SOSAlert {
    id: string;
    userId: string;
    timestamp: string;
    location: RoutePoint;
    contactsNotified: string[];
    status: 'active' | 'resolved';
}

// ─── Community Report Types ───────────────────────────────────────────────────

export type IncidentType =
    | 'Harassment'
    | 'Theft'
    | 'Assault'
    | 'Suspicious Activity'
    | 'Poor Lighting'
    | 'Unsafe Area'
    | 'Other';

export interface CommunityReport {
    id: string;
    userId: string;
    userName: string;
    location: string;
    incidentType: IncidentType;
    description: string;
    timestamp: string;
    upvotes: number;
    isVerified: boolean;
    safetyLevel: SafetyLevel;
}

export interface ReportFormData {
    location: string;
    incidentType: IncidentType | '';
    description: string;
}

// ─── Activity Types ───────────────────────────────────────────────────────────

export type ActivityType = 'route' | 'sos' | 'report' | 'tracking' | 'contact';

export interface Activity {
    id: string;
    type: ActivityType;
    title: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, string>;
}

// ─── Toast Types ─────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

// ─── Heatmap Types ────────────────────────────────────────────────────────────

export interface HeatZone {
    id: string;
    x: number;
    y: number;
    radius: number;
    intensity: number;
    safetyLevel: SafetyLevel;
    area: string;
}
