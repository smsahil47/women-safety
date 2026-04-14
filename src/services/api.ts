// ─── SafeRoute Supabase API ───────────────────────────────────────────────────
// All database operations via Supabase JS client.
// Tables: profiles, emergency_contacts, community_reports, sos_alerts,
//         tracking_sessions, safe_routes

import { supabase } from './supabase';
import type {
    EmergencyContact,
    CommunityReport,
    IncidentType,
    Relationship,
} from '../types';

// ─── PROFILES ────────────────────────────────────────────────────────────────

export const upsertProfile = async (userId: string, data: {
    name: string;
    phone: string;
    email: string;
}) => {
    const { error } = await supabase.from('profiles').upsert({
        id: userId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (error) throw error;
};

export const getProfile = async (userId: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

// ─── EMERGENCY CONTACTS ───────────────────────────────────────────────────────

export const fetchContacts = async (userId: string): Promise<EmergencyContact[]> => {
    const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        relationship: r.relationship as Relationship,
        isNotified: r.is_notified,
    }));
};

export const addContactDb = async (
    userId: string,
    contact: { name: string; phone: string; relationship: string; isNotified: boolean }
): Promise<EmergencyContact> => {
    const { data, error } = await supabase
        .from('emergency_contacts')
        .insert({
            user_id: userId,
            name: contact.name,
            phone: contact.phone,
            relationship: contact.relationship,
            is_notified: false,
        })
        .select()
        .single();
    if (error) throw error;
    return {
        id: data.id,
        name: data.name,
        phone: data.phone,
        relationship: data.relationship as Relationship,
        isNotified: data.is_notified,
    };
};

export const removeContactDb = async (contactId: string, userId: string) => {
    const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', contactId)
        .eq('user_id', userId);
    if (error) throw error;
};

// ─── COMMUNITY REPORTS ────────────────────────────────────────────────────────

export const fetchReports = async (): Promise<CommunityReport[]> => {
    const { data, error } = await supabase
        .from('community_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
    if (error) throw error;
    return (data || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userName: 'Verified Reporter', // Fallback to avoid profile sync issues
        location: r.location,
        incidentType: r.incident_type as IncidentType,
        description: r.description,
        timestamp: r.created_at,
        upvotes: r.upvotes,
        isVerified: r.is_verified,
        safetyLevel: r.safety_level,
    }));
};

export const createReport = async (
    userId: string,
    report: { location: string; incidentType: string; description: string }
): Promise<CommunityReport> => {
    const { data, error } = await supabase
        .from('community_reports')
        .insert({
            user_id: userId,
            location: report.location,
            incident_type: report.incidentType,
            description: report.description,
            upvotes: 0,
            is_verified: false,
            safety_level: 'moderate',
        })
        .select('*')
        .single();
    if (error) throw error;
    return {
        id: data.id,
        userId: data.user_id,
        userName: 'You', // Hardcode assuming client created it
        location: data.location,
        incidentType: data.incident_type as IncidentType,
        description: data.description,
        timestamp: data.created_at,
        upvotes: data.upvotes,
        isVerified: data.is_verified,
        safetyLevel: data.safety_level,
    };
};

export const deleteReport = async (reportId: string, userId: string) => {
    const { error } = await supabase
        .from('community_reports')
        .delete()
        .eq('id', reportId)
        .eq('user_id', userId);
    if (error) throw error;
};

export const upvoteReport = async (reportId: string) => {
    const { error } = await supabase.rpc('increment_upvotes', { report_id: reportId });
    if (error) {
        // Fallback: manual increment
        const { data: current } = await supabase
            .from('community_reports')
            .select('upvotes')
            .eq('id', reportId)
            .single();
        await supabase
            .from('community_reports')
            .update({ upvotes: (current?.upvotes || 0) + 1 })
            .eq('id', reportId);
    }
};

// ─── SOS ALERTS ──────────────────────────────────────────────────────────────

export const createSOSAlert = async (
    userId: string,
    location: { lat?: number; lng?: number; address?: string }
) => {
    const { data, error } = await supabase
        .from('sos_alerts')
        .insert({
            user_id: userId,
            latitude: location.lat,
            longitude: location.lng,
            address: location.address || 'Unknown location',
            status: 'active',
        })
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const resolveSOSAlert = async (alertId: string) => {
    const { error } = await supabase
        .from('sos_alerts')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', alertId);
    if (error) throw error;
};

// ─── TRACKING SESSIONS ────────────────────────────────────────────────────────

export const startTrackingSession = async (userId: string) => {
    const { data, error } = await supabase
        .from('tracking_sessions')
        .insert({
            user_id: userId,
            status: 'active',
            started_at: new Date().toISOString(),
        })
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const stopTrackingSession = async (sessionId: string) => {
    const { error } = await supabase
        .from('tracking_sessions')
        .update({ status: 'inactive', ended_at: new Date().toISOString() })
        .eq('id', sessionId);
    if (error) throw error;
};

// ─── USER STATS (for dashboard) ───────────────────────────────────────────────

export const fetchUserStats = async (userId: string) => {
    const [reportsResult, trackingResult] = await Promise.all([
        supabase
            .from('community_reports')
            .select('id', { count: 'exact' })
            .eq('user_id', userId),
        supabase
            .from('tracking_sessions')
            .select('id', { count: 'exact' })
            .eq('user_id', userId),
    ]);

    return {
        reportsCount: reportsResult.count || 0,
        trackingCount: trackingResult.count || 0,
    };
};

// ─── RISK ZONES (derived from real community_reports) ────────────────────────
// Groups reports by location, counts incidents, picks worst safety level.

export interface RealRiskZone {
    id: string;
    name: string;          // the location text from the report
    safetyLevel: 'safe' | 'moderate' | 'danger';
    crimeCount: number;    // total reports for this location
    description: string;   // most-upvoted report description
    lastUpdated: string;   // ISO date of latest report
    incidentType: string;  // most common incident type
}

export const fetchRiskZones = async (): Promise<RealRiskZone[]> => {
    const { data, error } = await supabase
        .from('community_reports')
        .select('id, location, incident_type, description, upvotes, is_verified, safety_level, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Group by location (case-insensitive trim)
    const groups = new Map<string, typeof data>();
    for (const row of data) {
        const key = (row.location || '').trim().toLowerCase();
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
    }

    const levelPriority = (l: string) => l === 'danger' ? 2 : l === 'moderate' ? 1 : 0;

    const zones: RealRiskZone[] = [];
    groups.forEach((rows, _key) => {
        // Derive worst safety level across the group
        const worstLevel = rows.reduce((best, r) => {
            const l = (r.safety_level || 'moderate') as 'safe' | 'moderate' | 'danger';
            return levelPriority(l) > levelPriority(best) ? l : best;
        }, 'safe' as 'safe' | 'moderate' | 'danger');

        // Most upvoted description
        const topReport = [...rows].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))[0];

        // Most common incident type
        const typeCount = new Map<string, number>();
        for (const r of rows) {
            const t = r.incident_type || 'Other';
            typeCount.set(t, (typeCount.get(t) || 0) + 1);
        }
        const topType = [...typeCount.entries()].sort((a, b) => b[1] - a[1])[0][0];

        // Canonical location label (use original case from first/top row)
        const canonicalName = rows[0].location?.trim() || 'Unknown Location';

        zones.push({
            id: rows[0].id,
            name: canonicalName,
            safetyLevel: worstLevel,
            crimeCount: rows.length,
            description: topReport.description || 'No description available.',
            lastUpdated: (topReport.created_at || new Date().toISOString()).split('T')[0],
            incidentType: topType,
        });
    });

    // Sort: danger first, then by count desc
    return zones.sort((a, b) => {
        const pd = levelPriority(b.safetyLevel) - levelPriority(a.safetyLevel);
        return pd !== 0 ? pd : b.crimeCount - a.crimeCount;
    });
};

// ─── SAFE ROUTES (static scoring on mock data, can replace with real API) ─────

export const fetchSafeRoutes = async (_origin: string, _destination: string) => {
    // In a real app this would call Google Maps + overlay safety scores from DB
    // For now return scored mock routes
    await new Promise(r => setTimeout(r, 1200));
    return [
        {
            id: 'route-001',
            name: 'Route via MG Road',
            distance: '3.2 km',
            duration: '12 mins',
            safetyScore: 92,
            safetyLevel: 'safe' as const,
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
            safetyLevel: 'moderate' as const,
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
            safetyLevel: 'danger' as const,
            waypoints: [],
            highlights: ['Shortest path', 'Poor lighting', 'Low footfall at night', 'Past reported incidents'],
            isSafest: false,
        },
    ];
};
