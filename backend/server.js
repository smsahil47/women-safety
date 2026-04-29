import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from './smsService.js';

const app = express();
const PORT = process.env.PORT || 5000;

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', supabase: supabaseUrl ? 'configured' : 'missing', timestamp: new Date().toISOString() });
});

// ─── SMS TEST (Diagnostic) ─────────────────────────────────────────────────────

app.post('/api/sms/test', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'phone is required' });
    const result = await sendSMS(phone, `📱 SafeRoute test message. Twilio is working correctly!`);
    if (result.sent) {
        res.json({ success: true, message: `SMS delivered to ${phone}` });
    } else {
        res.status(500).json({ success: false, message: 'SMS failed', error: result.error, code: result.code });
    }
});

// Debug: list all contacts + send test SMS to each (DEV ONLY)
app.get('/api/debug/contacts', async (_req, res) => {
    try {
        const { data: contacts, error } = await supabase
            .from('emergency_contacts')
            .select('id, name, phone, user_id')
            .limit(20);
        if (error) throw error;

        // Test SMS to each stored number
        const results = await Promise.all((contacts || []).map(async (c) => {
            const r = await sendSMS(c.phone, `📱 SafeRoute debug: testing SMS to ${c.name}`);
            return { name: c.name, phone: c.phone, userId: c.user_id, sent: r.sent, error: r.error, code: r.code };
        }));

        res.json({ totalContacts: contacts?.length || 0, results });
    } catch (err) {
        res.status(500).json({ message: 'Debug failed', error: err.message });
    }
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────

app.get('/api/reports', async (_req, res) => {
    try {
        const { data, error } = await supabase
            .from('community_reports')
            .select('*, profiles(name)')
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) throw error;
        res.json((data || []).map(r => ({
            id: r.id,
            userId: r.user_id,
            userName: r.profiles?.name || 'Anonymous',
            location: r.location,
            incidentType: r.incident_type,
            description: r.description,
            timestamp: r.created_at,
            upvotes: r.upvotes,
            isVerified: r.is_verified,
            safetyLevel: r.safety_level,
        })));
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch reports', error: err.message });
    }
});

app.post('/api/reports', async (req, res) => {
    const { userId, location, incidentType, description } = req.body;
    if (!userId || !location || !incidentType || !description) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    try {
        const { data, error } = await supabase
            .from('community_reports')
            .insert({ user_id: userId, location, incident_type: incidentType, description, upvotes: 0, is_verified: false, safety_level: 'moderate' })
            .select().single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create report', error: err.message });
    }
});

// ─── CONTACTS ─────────────────────────────────────────────────────────────────

app.get('/api/contacts/:userId', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('emergency_contacts')
            .select('*')
            .eq('user_id', req.params.userId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch contacts', error: err.message });
    }
});

app.post('/api/contacts', async (req, res) => {
    const { userId, name, phone, relationship } = req.body;
    if (!userId || !name || !phone) return res.status(400).json({ message: 'userId, name, phone required' });
    try {
        const { data, error } = await supabase
            .from('emergency_contacts')
            .insert({ user_id: userId, name, phone, relationship: relationship || 'Other', is_notified: false })
            .select().single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ message: 'Failed to add contact', error: err.message });
    }
});

app.delete('/api/contacts/:contactId', async (req, res) => {
    const { userId } = req.body;
    try {
        const { error } = await supabase
            .from('emergency_contacts')
            .delete()
            .eq('id', req.params.contactId)
            .eq('user_id', userId);
        if (error) throw error;
        res.json({ message: 'Contact removed' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to remove contact', error: err.message });
    }
});

// ─── LIVE TRACKING ───────────────────────────────────────────────────────────

app.post('/api/tracking/start', async (req, res) => {
    const { userId, location } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    try {
        // 1. Fetch user name
        const { data: user } = await supabase.from('profiles').select('name').eq('id', userId).single();
        const userName = user?.name || 'A user';

        // 2. Fetch ALL emergency contacts
        const { data: contacts } = await supabase
            .from('emergency_contacts')
            .select('phone, name')
            .eq('user_id', userId);

        // 3. Save tracking session to DB
        const { data: session, error } = await supabase
            .from('tracking_sessions')
            .insert({ user_id: userId, status: 'active', started_at: new Date().toISOString() })
            .select().single();
        if (error) throw error;

        console.log(`📍 Live tracking started for ${userName}, notifying ${contacts?.length || 0} contacts`);

        // 4. Send SMS with live tracking page link
        const liveTrackUrl = `${FRONTEND_URL}/track/${session.id}`;
        const message = `📍 ${userName} has started Live Tracking and is sharing their real-time location with you.\nWatch live here: ${liveTrackUrl}`;

        let smsDelivered = 0;
        const smsErrors = [];
        if (contacts && contacts.length > 0) {
            const results = await Promise.all(contacts.map(contact => sendSMS(contact.phone, message)));
            results.forEach((r, i) => {
                if (r.sent) {
                    smsDelivered++;
                } else {
                    smsErrors.push({ name: contacts[i].name, phone: contacts[i].phone, error: r.error, code: r.code });
                }
            });
        }

        if (smsErrors.length > 0) {
            console.warn(`⚠️  ${smsErrors.length} SMS(es) failed to deliver:`, smsErrors);
        }

        res.json({
            message: 'Tracking started',
            sessionId: session.id,
            notifiedCount: contacts?.length || 0,
            smsDelivered,
            smsFailed: smsErrors.length,
            smsErrors: smsErrors.length > 0 ? smsErrors : undefined,
        });

    } catch (err) {
        res.status(500).json({ message: 'Failed to start tracking', error: err.message });
    }
});

// ─── SOS ─────────────────────────────────────────────────────────────────────

app.post('/api/sos/trigger', async (req, res) => {
    const { userId, location, contactIds } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    try {
        // 1. Fetch user name
        const { data: user } = await supabase.from('profiles').select('name').eq('id', userId).single();
        const userName = user?.name || 'A user';

        // 2. Fetch ALL emergency contacts for this user — always notify everyone
        const { data: contacts } = await supabase
            .from('emergency_contacts')
            .select('phone, name')
            .eq('user_id', userId);

        // 3. Save SOS Alert to DB
        const { data, error } = await supabase
            .from('sos_alerts')
            .insert({ user_id: userId, latitude: location?.lat, longitude: location?.lng, address: location?.address || 'Unknown', status: 'active' })
            .select().single();
        if (error) throw error;
        
        console.log(`🚨 SOS triggered for user ${userId} (${userName}), notifying ${contacts?.length || 0} contacts`);

        // 4. Send SMS to all contacts
        const mapLink = location?.lat && location?.lng 
            ? `https://maps.google.com/?q=${location.lat},${location.lng}` 
            : 'Location not provided';
            
        const message = `🚨 URGENT SOS from ${userName}!\nThey need help immediately.\nLocation: ${mapLink}`;

        let smsDelivered = 0;
        const smsErrors = [];
        if (contacts && contacts.length > 0) {
            const results = await Promise.all(contacts.map(contact => sendSMS(contact.phone, message)));
            results.forEach((r, i) => {
                if (r.sent) {
                    smsDelivered++;
                } else {
                    smsErrors.push({ name: contacts[i].name, phone: contacts[i].phone, error: r.error, code: r.code });
                }
            });
        }

        if (smsErrors.length > 0) {
            console.warn(`⚠️  ${smsErrors.length} SOS SMS(es) failed:`, smsErrors);
        }

        res.json({
            message: 'SOS triggered',
            alertId: data.id,
            notifiedCount: contacts?.length || 0,
            smsDelivered,
            smsFailed: smsErrors.length,
            smsErrors: smsErrors.length > 0 ? smsErrors : undefined,
        });

    } catch (err) {
        res.status(500).json({ message: 'Failed to trigger SOS', error: err.message });
    }
});

// ─── HEATMAP ─────────────────────────────────────────────────────────────────

app.get('/api/heatmap', async (_req, res) => {
    try {
        const { data, error } = await supabase
            .from('community_reports')
            .select('location, safety_level, incident_type')
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) throw error;
        const zones = {};
        for (const r of (data || [])) {
            if (!zones[r.location]) zones[r.location] = { location: r.location, count: 0, safetyLevel: r.safety_level };
            zones[r.location].count++;
            if (r.safety_level === 'danger') zones[r.location].safetyLevel = 'danger';
            else if (r.safety_level === 'moderate' && zones[r.location].safetyLevel !== 'danger') zones[r.location].safetyLevel = 'moderate';
        }
        res.json(Object.values(zones));
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch heatmap', error: err.message });
    }
});

// ─── START ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`✅ SafeRoute Backend running on http://localhost:${PORT}`);
    console.log(`   Supabase: ${supabaseUrl || '⚠️  Not configured'}`);
});
