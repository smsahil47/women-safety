import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 5000;

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Fast2SMS API Key (Twilio Alternative) - Get 50rs free without card
const fast2smsKey = process.env.FAST2SMS_API_KEY || '';

// Helper to send real SMS
async function sendSMS(phone, text) {
    // 1. Try Fast2SMS First (If user created a free account)
    if (fast2smsKey) {
        try {
            const cleanPhone = phone.replace(/\D/g, '').slice(-10);
            const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
                method: 'POST',
                headers: { 'authorization': fast2smsKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ route: 'q', message: text, language: 'english', flash: 0, numbers: cleanPhone })
            });
            const data = await response.json();
            
            // Fast2SMS returns true/false in 'return' key
            if (data.return === true) {
                console.log(`[Fast2SMS] Sent to ${phone}:`, data.message);
                return true;
            } else {
                console.warn(`[Fast2SMS Rejected Message]`, data.message);
                // Deliberately fall through to try Textbelt since Fast2SMS refused it
            }
        } catch (err) {
            console.error(`[Fast2SMS] Network Failed for ${phone}:`, err.message);
        }
    }

    // 2. Try TextBelt - 100% Free Public API (1 free SMS per day without an account)
    try {
        console.log(`[Textbelt Free API] Attempting to send to ${phone}...`);
        const response = await fetch('https://textbelt.com/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: phone,      // Ensure it has country code if possible, e.g. +91
                message: text,
                key: 'textbelt'    // Special keyword for free tier
            })
        });
        const data = await response.json();
        
        if (data.success) {
            console.log(`[Textbelt] Successfully sent free SMS to ${phone}!`);
            return true;
        } else {
            console.log(`[Textbelt Queue] Rate limited or failed. Showing mock SMS instead:`);
            console.log(`\n======================================\n[MOCK SMS] To: ${phone}\n[MESSAGE]: ${text}\n======================================\n`);
            return false;
        }
    } catch (err) {
        console.error(`[Fallback] Error sending SMS:`, err.message);
        return false;
    }
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', supabase: supabaseUrl ? 'configured' : 'missing', timestamp: new Date().toISOString() });
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

// ─── SOS ─────────────────────────────────────────────────────────────────────

app.post('/api/sos/trigger', async (req, res) => {
    const { userId, location, contactIds } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    try {
        // 1. Fetch user name
        const { data: user } = await supabase.from('profiles').select('name').eq('id', userId).single();
        const userName = user?.name || 'A user';

        // 2. Fetch emergency contacts — honour the selected contactIds list if given
        let query = supabase.from('emergency_contacts').select('phone, name').eq('user_id', userId);
        if (contactIds && contactIds.length > 0) {
            query = query.in('id', contactIds);
        }
        const { data: contacts } = await query;

        // 3. Save SOS Alert to DB
        const { data, error } = await supabase
            .from('sos_alerts')
            .insert({ user_id: userId, latitude: location?.lat, longitude: location?.lng, address: location?.address || 'Unknown', status: 'active' })
            .select().single();
        if (error) throw error;
        
        console.log(`🚨 SOS triggered for user ${userId} (${userName}), notifying ${contacts?.length || 0} contacts`);

        // 4. Send SMS to selected contacts
        const mapLink = location?.lat && location?.lng 
            ? `https://maps.google.com/?q=${location.lat},${location.lng}` 
            : 'Location not provided';
            
        const message = `🚨 URGENT SOS from ${userName}! They need help immediately. Location: ${mapLink}`;

        if (contacts && contacts.length > 0) {
            for (const contact of contacts) {
                await sendSMS(contact.phone, message);
            }
        }

        res.json({ message: 'SOS triggered and SMS sent', alertId: data.id, notifiedCount: contacts?.length || 0 });
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
